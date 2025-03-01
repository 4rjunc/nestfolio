// src/actions/transfer/index.ts
import {
  composeContext,
  generateObjectDeprecated,
  ModelClass
} from "@elizaos/core";

// src/shared/entities/cosmos-wallet-chains-data.ts
import { getChainByChainName } from "@chain-registry/utils";
import { SigningCosmWasmClient } from "@cosmjs/cosmwasm-stargate";
import { chains } from "chain-registry";

// src/shared/entities/cosmos-wallet.ts
import { DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { cosmos } from "interchain";
var CosmosWallet = class _CosmosWallet {
  rpcQueryClient;
  directSecp256k1HdWallet;
  constructor(directSecp256k1HdWallet, rpcQueryClient) {
    this.directSecp256k1HdWallet = directSecp256k1HdWallet;
    this.rpcQueryClient = rpcQueryClient;
  }
  static async create(mnemonic, chainPrefix, rpcEndpoint) {
    const directSecp256k1HdWallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
      prefix: chainPrefix
    });
    const rpcQueryClient = await cosmos.ClientFactory.createRPCQueryClient({
      rpcEndpoint
    });
    return new _CosmosWallet(directSecp256k1HdWallet, rpcQueryClient);
  }
  async getWalletAddress() {
    const [account] = await this.directSecp256k1HdWallet.getAccounts();
    return account.address;
  }
  async getWalletBalances() {
    const walletAddress = await this.getWalletAddress();
    const allBalances = await this.rpcQueryClient.cosmos.bank.v1beta1.allBalances({
      address: walletAddress
    });
    return allBalances.balances;
  }
};

// src/shared/helpers/cosmos-chains.ts
var getAvailableChains = (chains4, customChains) => [
  ...chains4?.filter(
    (chain) => !(customChains ?? [])?.map((customChain) => customChain.chain_name)?.includes(chain.chain_name)
  ) ?? [],
  ...customChains ?? []
];

// src/shared/entities/cosmos-wallet-chains-data.ts
import { SkipClient } from "@skip-go/client";
var CosmosWalletChains = class _CosmosWalletChains {
  walletChainsData = {};
  constructor(walletChainsData) {
    this.walletChainsData = walletChainsData;
  }
  static async create(mnemonic, availableChainNames, customChainsData) {
    const walletChainsData = {};
    const availableChains = getAvailableChains(chains, customChainsData);
    for (const chainName of availableChainNames) {
      const chain = getChainByChainName(availableChains, chainName);
      if (!chain) {
        throw new Error(`Chain ${chainName} not found`);
      }
      const wallet = await CosmosWallet.create(
        mnemonic,
        chain.bech32_prefix,
        chain.apis.rpc[0].address
      );
      const chainRpcAddress = chain.apis?.rpc?.[0].address;
      if (!chainRpcAddress) {
        throw new Error(`RPC address not found for chain ${chainName}`);
      }
      const signingCosmWasmClient = await SigningCosmWasmClient.connectWithSigner(
        chain.apis.rpc[0].address,
        wallet.directSecp256k1HdWallet
      );
      const skipClient = new SkipClient({
        getCosmosSigner: async () => wallet.directSecp256k1HdWallet
      });
      walletChainsData[chainName] = {
        wallet,
        signingCosmWasmClient,
        skipClient
      };
    }
    return new _CosmosWalletChains(walletChainsData);
  }
  async getWalletAddress(chainName) {
    const chainWalletsForGivenChain = this.walletChainsData[chainName];
    if (!chainWalletsForGivenChain) {
      throw new Error(`Invalid chain name. If ${chainName} is required, it should be added to env file.`);
    }
    return await chainWalletsForGivenChain.wallet.getWalletAddress();
  }
  getSigningCosmWasmClient(chainName) {
    return this.walletChainsData[chainName].signingCosmWasmClient;
  }
  getSkipClient(chainName) {
    const chainWalletsForGivenChain = this.walletChainsData[chainName];
    if (!chainWalletsForGivenChain) {
      throw new Error("Invalid chain name");
    }
    return chainWalletsForGivenChain.skipClient;
  }
  async getUserAddress(chainName) {
    return this.walletChainsData[chainName].wallet.getWalletAddress();
  }
};

// src/providers/wallet/utils.ts
var initWalletChainsData = async (runtime) => {
  const mnemonic = runtime.getSetting("COSMOS_RECOVERY_PHRASE");
  const availableChains = runtime.getSetting("COSMOS_AVAILABLE_CHAINS");
  if (!mnemonic) {
    throw new Error("COSMOS_RECOVERY_PHRASE is missing");
  }
  if (!availableChains) {
    throw new Error("COSMOS_AVAILABLE_CHAINS is missing");
  }
  const availableChainsArray = availableChains.split(",");
  if (!availableChainsArray.length) {
    throw new Error("COSMOS_AVAILABLE_CHAINS is empty");
  }
  return await CosmosWalletChains.create(mnemonic, availableChainsArray);
};

// src/templates/index.ts
var cosmosTransferTemplate = `Given the recent messages and cosmos wallet information below:
{{recentMessages}}
{{walletInfo}}
Extract the following information about the requested transfer:
1. **Amount**:
   - Extract only the numeric value from the instruction.
   - The value must be a string representing the amount in the display denomination (e.g., "0.0001" for OM, chimba, etc.). Do not include the symbol.

2. **Recipient Address**:
   - Must be a valid Bech32 address that matches the chain's address prefix.
   - Example for "mantra": "mantra1pcnw46km8m5amvf7jlk2ks5std75k73aralhcf".

3. **Token Symbol**:
   - The symbol must be a string representing the token's display denomination (e.g., "OM", "chimba", etc.).

4. **Chain name**:
   - Identify the chain mentioned in the instruction where the transfer will take place (e.g., carbon, axelar, mantrachaintestnet2).
   - Provide this as a string.

Respond with a JSON markdown block containing only the extracted values. All fields except 'token' are required:
\`\`\`json
{
    "symbol": string, // The symbol of token.
    "amount": string, // The amount to transfer as a string.
    "toAddress": string, // The recipient's address.
    "chainName": string // The chain name.
\`\`\`

Example response for the input: "Make transfer 0.0001 OM to mantra1pcnw46km8m5amvf7jlk2ks5std75k73aralhcf on mantrachaintestnet2", the response should be:
\`\`\`json
{
    "symbol": "OM",
    "amount": "0.0001",
    "toAddress": "mantra1pcnw46km8m5amvf7jlk2ks5std75k73aralhcf",
    "chainName": "mantrachaintestnet2"
\`\`\`
Now respond with a JSON markdown block containing only the extracted values.
`;
var cosmosIBCTransferTemplate = `Given the recent messages and cosmos wallet information below:
{{recentMessages}}
{{walletInfo}}
Extract the following information about the requested IBC transfer:
1. **Amount**:
   - Extract only the numeric value from the instruction.
   - The value must be a string representing the amount in the display denomination (e.g., "0.0001" for ATOM, OSMO, etc.). Do not include the symbol.

2. **Recipient Address**:
   - Must be a valid Bech32 address that matches the target chain's address prefix.
   - Example for "cosmoshub": "cosmos1pcnw46km8m5amvf7jlk2ks5std75k73aralhcf".

3. **Token Symbol**:
   - The symbol must be a string representing the token's display denomination (e.g., "ATOM", "OSMO", etc.).

4. **Source Chain Name**:
   - Identify the source chain mentioned in the instruction (e.g., cosmoshub, osmosis, axelar).
   - Provide this as a string.

5. **Target Chain Name**:
   - Identify the target chain mentioned in the instruction (e.g., cosmoshub, osmosis, axelar).
   - Provide this as a string.

Respond with a JSON markdown block containing only the extracted values. All fields are required:
\`\`\`json
{
    "symbol": string, // The symbol of the token.
    "amount": string, // The amount to transfer as a string.
    "toAddress": string, // The recipient's address.
    "chainName": string, // The source chain name.
    "targetChainName": string // The target chain name.
}
\`\`\`

Example response for the input: "Make an IBC transfer of 0.0001 ATOM to osmo1pcnw46km8m5amvf7jlk2ks5std75k73aralhcf from cosmoshub to osmosis", the response should be:
\`\`\`json
{
    "symbol": "ATOM",
    "amount": "0.0001",
    "toAddress": "osmo1pcnw46km8m5amvf7jlk2ks5std75k73aralhcf",
    "chainName": "cosmoshub",
    "targetChainName": "osmosis"
}
\`\`\`

Now respond with a JSON markdown block containing only the extracted values.
`;
var cosmosIBCSwapTemplate = `Given the recent messages and cosmos wallet information below:
{{recentMessages}}
{{walletInfo}}
Make sure that you extracted latest info about requested swap from recent messages. Espessialy if there was another one placed before.
Also the extracted info MUST match the confirmed by user data in latest prompt in which you asked for confirmation!
Extract the following information about the requested IBC swap:

1. **fromChainName**:
   - Identify the source chain mentioned in the instruction (e.g., cosmoshub, osmosis, axelar).
   - Provide this as a string.

2. **fromTokenSymbol**:
   - The symbol must be a string representing the token's display denomination (e.g., "ATOM", "OSMO", etc.).

3. **fromTokenAmount**:
   - Extract only the numeric value from the instruction.
   - The value must be a string representing the amount in the display denomination (e.g., "0.0001" for ATOM, OSMO, etc.). Do not include the symbol.

4. **toChainName**:
   - Identify the target chain mentioned in the instruction (e.g., cosmoshub, osmosis, axelar).
   - Provide this as a string.

5. **toTokenSymbol**:
   - The symbol must be a string representing the result token's display denomination (e.g., "OM", "ATOM", etc.).

6. **toTokenDenom**:
    - optional parameter, if present must be a string. (uom, uatom, usomo, ibc/53046FFF6CAD109D8F9B2C7C9913853AD241928CD05CDDE419343D176025DA74 or other ibc/ values)

7. **fromTokenDenom**:
    - optional parameter, if present must be a string. (uom, uatom, usomo, ibc/53046FFF6CAD109D8F9B2C7C9913853AD241928CD05CDDE419343D176025DA74 or other ibc/ values)

Keep in mind that toTokenDenom and fromTokenDenom are optional parameters.

Respond with a JSON markdown block containing only the extracted values. All fields are required:
\`\`\`json
{
    "fromChainName": string, // Source chain from which tokens will be taken to swap (String).
    "fromTokenSymbol": string, // Symbol of token to be swapped (String).
    "fromTokenAmount": string, // Amount of tokens to be swapped (String).
    "toChainName": string, // Name of chain on which result token is hosted (String).
    "toTokenSymbol": string, // Symbol of result token (String).
    "fromTokenDenom": string, // denom of token to be swapped (String). Optional, might not be present.
    "toTokenDenom": string // denom of result token (String). Optional, might not be present.
}
\`\`\`

Example response for the input: "Swap {{1}} {{ATOM}} from {{cosmoshub}} to {{OM}} on {{mantrachain}}", the response should be:
\`\`\`json
{
    "fromChainName": "cosmoshub",
    "fromTokenSymbol": "ATOM",
    "fromTokenAmount": "1",
    "fromTokenDenom": null,
    "toChainName": "mantrachain",
    "toTokenSymbol": "OM",
    "toTokenDenom": null
}
\`\`\`


Example response for the input: "Swap {{1}} {{ATOM}} with denom {{uatom}} from {{cosmoshub}} to {{OM}} on {{mantrachain}}", the response should be:
\`\`\`json
{
    "fromChainName": "cosmoshub",
    "fromTokenSymbol": "ATOM",
    "fromTokenAmount": "1",
    "fromTokenDenom": "uatom",
    "toChainName": "mantrachain",
    "toTokenSymbol": "OM",
    "fromTokenDenom": null
}
\`\`\`

Example response for the input: "Swap {{1}} {{ATOM}} with denom {{uatom}} from {{cosmoshub}} to {{OM}} (denom: {{ibc/53046FFF6CAD109D8F9B2C7C9913853AD241928CD05CDDE419343D176025DA74}} ) on {{mantrachain}}", the response should be:
\`\`\`json
{
    "fromChainName": "cosmoshub",
    "fromTokenSymbol": "ATOM",
    "fromTokenAmount": "1",
    "fromTokenDenom": "uatom",
    "toChainName": "mantrachain",
    "toTokenSymbol": "OM",
    "toTokenDenom": "ibc/53046FFF6CAD109D8F9B2C7C9913853AD241928CD05CDDE419343D176025DA74"
}
\`\`\`

Example response for the input: "Swap {{100}} {{USDC}} with denom {{uusdc}} from {{axelar}} to {{ATOM}} on {{cosmoshub}}", the response should be:
\`\`\`json
{
    "fromChainName": "axelar",
    "fromTokenSymbol": "USDC",
    "fromTokenAmount": "100",
    "fromTokenDenom": "uusdc",
    "toChainName": "cosmoshub",
    "toTokenSymbol": "ATOM",
}
\`\`\`

Now respond with a JSON markdown block containing only the extracted values.
`;

// src/actions/transfer/services/cosmos-transfer-action-service.ts
import {
  convertDisplayUnitToBaseUnit,
  getAssetBySymbol
} from "@chain-registry/utils";
import { assets } from "chain-registry";

// src/shared/helpers/cosmos-transaction-receipt.ts
var DEFUALT_EVENTS = [
  { eventName: "fee_pay", attributeType: "fee" },
  { eventName: "tip_refund", attributeType: "tip" }
];
var getPaidFeeFromReceipt = (receipt, eventsToPickGasFor = DEFUALT_EVENTS) => {
  const selectedEvents = receipt.events.filter(
    ({ type }) => eventsToPickGasFor.map(({ eventName }) => eventName).includes(type)
  );
  return selectedEvents.reduce((acc, { attributes }) => {
    return acc + attributes.reduce((_acc, { key, value }) => {
      if (eventsToPickGasFor.some(
        ({ attributeType }) => attributeType === key
      )) {
        const testValue = value.match(/\d+/)?.[0];
        const testValueAsNumber = Number(testValue);
        if (Number.isNaN(testValueAsNumber)) {
          return _acc;
        }
        _acc = _acc + testValueAsNumber;
        return _acc;
      }
      return _acc;
    }, 0);
  }, 0);
};

// src/shared/services/cosmos-transaction-fee-estimator.ts
var CosmosTransactionFeeEstimator = class {
  static async estimateGasForTransaction(signingCosmWasmClient, senderAddress, message, memo = "") {
    const estimatedGas = await signingCosmWasmClient.simulate(
      senderAddress,
      message,
      memo
    );
    const safeEstimatedGas = Math.ceil(estimatedGas * 1.2);
    return safeEstimatedGas;
  }
  static estimateGasForCoinTransfer(signingCosmWasmClient, senderAddress, recipientAddress, amount, memo = "") {
    return this.estimateGasForTransaction(
      signingCosmWasmClient,
      senderAddress,
      [
        {
          typeUrl: "/cosmos.bank.v1beta1.MsgSend",
          value: {
            fromAddress: senderAddress,
            toAddress: recipientAddress,
            amount: [...amount]
          }
        }
      ],
      memo
    );
  }
};

// src/shared/helpers/cosmos-assets.ts
var getAvailableAssets = (assets6, customAssets) => {
  const result = [];
  const safeAssets = assets6 || [];
  const safeCustomAssets = customAssets || [];
  const customChainNames = new Set(
    safeCustomAssets.map((asset) => asset.chain_name)
  );
  for (const asset of safeAssets) {
    if (!customChainNames.has(asset.chain_name)) {
      result.push(asset);
    }
  }
  result.push(...safeCustomAssets);
  return result;
};

// src/actions/transfer/services/cosmos-transfer-action-service.ts
var CosmosTransferActionService = class {
  constructor(cosmosWalletChains) {
    this.cosmosWalletChains = cosmosWalletChains;
    this.cosmosWalletChains = cosmosWalletChains;
  }
  async execute(params, customChainAssets) {
    const signingCosmWasmClient = this.cosmosWalletChains.getSigningCosmWasmClient(params.chainName);
    const senderAddress = await this.cosmosWalletChains.getWalletAddress(
      params.chainName
    );
    if (!senderAddress) {
      throw new Error(
        `Cannot get wallet address for chain ${params.chainName}`
      );
    }
    if (!params.toAddress) {
      throw new Error("No receiver address");
    }
    if (!params.symbol) {
      throw new Error("No symbol");
    }
    const availableAssets = getAvailableAssets(assets, customChainAssets);
    const coin = {
      denom: getAssetBySymbol(
        availableAssets,
        params.symbol,
        params.chainName
      ).base,
      amount: convertDisplayUnitToBaseUnit(
        availableAssets,
        params.symbol,
        params.amount,
        params.chainName
      )
    };
    const gasFee = await CosmosTransactionFeeEstimator.estimateGasForCoinTransfer(
      signingCosmWasmClient,
      senderAddress,
      params.toAddress,
      [coin]
    );
    const txDeliveryResponse = await signingCosmWasmClient.sendTokens(
      senderAddress,
      params.toAddress,
      [coin],
      { gas: gasFee.toString(), amount: [{ ...coin, amount: gasFee.toString() }] }
    );
    const gasPaid = getPaidFeeFromReceipt(txDeliveryResponse);
    return {
      from: senderAddress,
      to: params.toAddress,
      gasPaid,
      txHash: txDeliveryResponse.transactionHash
    };
  }
};

// src/actions/transfer/index.ts
var createTransferAction = (pluginOptions) => ({
  name: "COSMOS_TRANSFER",
  description: "Transfer tokens between addresses on the same chain",
  handler: async (_runtime, _message, state, _options, _callback) => {
    const cosmosTransferContext = composeContext({
      state,
      template: cosmosTransferTemplate,
      templatingEngine: "handlebars"
    });
    const cosmosTransferContent = await generateObjectDeprecated({
      runtime: _runtime,
      context: cosmosTransferContext,
      modelClass: ModelClass.SMALL
    });
    const paramOptions = {
      chainName: cosmosTransferContent.chainName,
      symbol: cosmosTransferContent.symbol,
      amount: cosmosTransferContent.amount,
      toAddress: cosmosTransferContent.toAddress
    };
    try {
      const walletProvider = await initWalletChainsData(_runtime);
      const action = new CosmosTransferActionService(walletProvider);
      const customAssets = (pluginOptions?.customChainData ?? []).map(
        (chainData) => chainData.assets
      );
      const transferResp = await action.execute(
        paramOptions,
        customAssets
      );
      if (_callback) {
        await _callback({
          text: `Successfully transferred ${paramOptions.amount} tokens to ${paramOptions.toAddress}
Gas paid: ${transferResp.gasPaid}
Transaction Hash: ${transferResp.txHash}`,
          content: {
            success: true,
            hash: transferResp.txHash,
            amount: paramOptions.amount,
            recipient: transferResp.to,
            chain: cosmosTransferContent.fromChain
          }
        });
        const newMemory = {
          userId: _message.agentId,
          agentId: _message.agentId,
          roomId: _message.roomId,
          content: {
            text: `Transaction ${paramOptions.amount} ${paramOptions.symbol} to address ${paramOptions.toAddress} on chain ${paramOptions.toAddress} was successfully transfered.
 Gas paid: ${transferResp.gasPaid}. Tx hash: ${transferResp.txHash}`
          }
        };
        await _runtime.messageManager.createMemory(newMemory);
      }
      return true;
    } catch (error) {
      console.error("Error during token transfer:", error);
      if (_callback) {
        await _callback({
          text: `Error transferring tokens: ${error.message}`,
          content: { error: error.message }
        });
      }
      const newMemory = {
        userId: _message.agentId,
        agentId: _message.agentId,
        roomId: _message.roomId,
        content: {
          text: `Transaction ${paramOptions.amount} ${paramOptions.symbol} to address ${paramOptions.toAddress} on chain ${paramOptions.toAddress} was unsuccessful.`
        }
      };
      await _runtime.messageManager.createMemory(newMemory);
      return false;
    }
  },
  template: cosmosTransferTemplate,
  validate: async (runtime) => {
    const mnemonic = runtime.getSetting("COSMOS_RECOVERY_PHRASE");
    const availableChains = runtime.getSetting("COSMOS_AVAILABLE_CHAINS");
    const availableChainsArray = availableChains?.split(",");
    return !(mnemonic && availableChains && availableChainsArray.length);
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Make transfer {{0.0001 OM}} to {{mantra1pcnw46km8m5amvf7jlk2ks5std75k73aralhcf}} on {{mantrachaintestnet2}}",
          action: "COSMOS_TRANSFER"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Do you confirm the transfer action?",
          action: "COSMOS_TRANSFER"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "Yes",
          action: "COSMOS_TRANSFER"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "",
          action: "COSMOS_TRANSFER"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Send {{10 OSMO}} to {{osmo13248w8dtnn07sxc3gq4l3ts4rvfyat6f4qkdd6}} on {{osmosistestnet}}",
          action: "COSMOS_TRANSFER"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Do you confirm the transfer action?",
          action: "COSMOS_TRANSFER"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "Yes",
          action: "COSMOS_TRANSFER"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "",
          action: "COSMOS_TRANSFER"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Send {{0.0001 OM}} on {{mantrachaintestnet2}} to {{mantra1pcnw46km8m5amvf7jlk2ks5std75k73aralhcf}}.",
          action: "COSMOS_TRANSFER"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Do you confirm the transfer action?",
          action: "COSMOS_TRANSFER"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "Yes",
          action: "COSMOS_TRANSFER"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "",
          action: "COSMOS_TRANSFER"
        }
      }
    ]
  ],
  similes: [
    "COSMOS_SEND_TOKENS",
    "COSMOS_TOKEN_TRANSFER",
    "COSMOS_MOVE_TOKENS"
  ]
});

// src/providers/wallet/index.ts
import {
  convertBaseUnitToDisplayUnit,
  getSymbolByDenom
} from "@chain-registry/utils";
import { assets as assets2 } from "chain-registry";
var createCosmosWalletProvider = (pluginOptions) => ({
  get: async (runtime) => {
    let providerContextMessage = "";
    const customAssets = (pluginOptions?.customChainData ?? []).map(
      (chainData) => chainData.assets
    );
    const availableAssets = getAvailableAssets(assets2, customAssets);
    try {
      const provider = await initWalletChainsData(runtime);
      for (const [chainName, { wallet }] of Object.entries(
        provider.walletChainsData
      )) {
        const address = await wallet.getWalletAddress();
        const balances = await wallet.getWalletBalances();
        const convertedCoinsToDisplayDenom = balances.map((balance) => {
          const symbol = getSymbolByDenom(
            availableAssets,
            balance.denom,
            chainName
          );
          return {
            amount: symbol ? convertBaseUnitToDisplayUnit(
              availableAssets,
              symbol,
              balance.amount,
              chainName
            ) : balance.amount,
            symbol: symbol ?? balance.denom
          };
        });
        const balancesToString = convertedCoinsToDisplayDenom.map((balance) => `- ${balance.amount} ${balance.symbol}`).join("\n");
        providerContextMessage += `Chain: ${chainName}
Address: ${address}
Balances:
${balancesToString}
________________
`;
      }
      return providerContextMessage;
    } catch (error) {
      console.error(
        "Error Initializing in Cosmos wallet provider:",
        error
      );
      return null;
    }
  }
});

// src/actions/ibc-swap/index.ts
import {
  composeContext as composeContext2,
  generateObjectDeprecated as generateObjectDeprecated2,
  ModelClass as ModelClass2
} from "@elizaos/core";

// src/actions/ibc-swap/services/ibc-swap-action-service.ts
import { assets as assets3, chains as chains2 } from "chain-registry";
import {
  convertDisplayUnitToBaseUnit as convertDisplayUnitToBaseUnit2,
  getChainByChainName as getChainByChainName2,
  getChainNameByChainId,
  getDenomBySymbol,
  getExponentByDenom
} from "@chain-registry/utils";
var IBCSwapAction = class {
  constructor(cosmosWalletChains) {
    this.cosmosWalletChains = cosmosWalletChains;
    this.cosmosWalletChains = cosmosWalletChains;
  }
  async execute(params, customChainAssets, _callback) {
    const fromChain = getChainByChainName2(chains2, params.fromChainName);
    if (!fromChain) {
      throw new Error(`Cannot find source chain: ${params.fromChainName}`);
    }
    const toChain = getChainByChainName2(chains2, params.toChainName);
    if (!toChain) {
      throw new Error(`Cannot find destination chain: ${params.toChainName}`);
    }
    const availableAssets = getAvailableAssets(assets3, customChainAssets);
    const denomFrom = params.fromTokenDenom || getDenomBySymbol(
      availableAssets,
      params.fromTokenSymbol,
      params.fromChainName
    );
    if (!denomFrom) {
      throw new Error(`Cannot find source token denom for symbol: ${params.fromTokenSymbol}`);
    }
    const exponentFrom = getExponentByDenom(
      availableAssets,
      denomFrom,
      params.fromChainName
    );
    const denomTo = params.toTokenDenom || getDenomBySymbol(
      availableAssets,
      params.toTokenSymbol,
      params.toChainName
    );
    if (!denomTo) {
      throw new Error(`Cannot find destination token denom for symbol: ${params.toTokenSymbol}`);
    }
    console.log(
      `Swap data: Swapping token ${denomFrom} with exponent ${exponentFrom} to token ${denomTo}`
    );
    const skipClient = this.cosmosWalletChains.getSkipClient(
      params.fromChainName
    );
    const route = await skipClient.route({
      smartSwapOptions: {},
      amountOut: convertDisplayUnitToBaseUnit2(
        availableAssets,
        params.fromTokenSymbol,
        params.fromTokenAmount,
        params.fromChainName
      ),
      sourceAssetDenom: denomFrom,
      sourceAssetChainID: fromChain.chain_id,
      destAssetDenom: denomTo,
      destAssetChainID: toChain.chain_id
    });
    const userAddresses = await Promise.all(
      route.requiredChainAddresses.map(async (chainID) => {
        const chainName = getChainNameByChainId(chains2, chainID);
        return {
          chainID,
          address: await this.cosmosWalletChains.getWalletAddress(
            chainName
          )
        };
      })
    );
    if (_callback) {
      await _callback({
        text: `Expected swap result: ${route.estimatedAmountOut} ${params.toTokenSymbol}, 
Estimated Fee: ${route.estimatedFees}. 
Estimated time: ${route.estimatedRouteDurationSeconds}`
      });
    }
    let result;
    await skipClient.executeRoute({
      route,
      userAddresses,
      onTransactionCompleted: async (_chainID, txHash, status) => {
        console.log(
          `Route completed with tx hash: ${txHash} & status: ${status.state}`
        );
        result = {
          status: status.state,
          fromChainName: params.fromChainName,
          fromTokenAmount: params.fromTokenAmount,
          fromTokenSymbol: params.fromTokenSymbol,
          toChainName: params.toChainName,
          toTokenSymbol: params.toTokenSymbol,
          txHash
        };
      }
    });
    return result;
  }
};

// src/actions/ibc-swap/services/ibc-swap-utils.ts
import { assets as assets4 } from "chain-registry";
var prepareAmbiguityErrorMessage = (coinSymbol, chainName) => {
  const chainAssets = assets4.find((chain) => chain.chain_name === chainName);
  if (!chainAssets) {
    throw new Error(`Chain ${chainName} not found in registry`);
  }
  const ambiguousAssets = chainAssets.assets.filter(
    (asset) => asset.symbol === coinSymbol
  );
  console.log(
    `Ambiguous Assets found: ${JSON.stringify(ambiguousAssets, null, 2)}`
  );
  const assetsText = `${ambiguousAssets.map((a) => `Symbol: ${a.symbol} Desc: ${a.description} Denom: ${a.base}`).join(",\n")}`;
  return `Error occured. Swap was not performed. Please provide denom for coin: ${coinSymbol}, on Chain Name: ${chainName}. It is necessary as the symbol ${coinSymbol} is not unique among coins on chain ${chainName}. 
 Select one from found assets:
${assetsText}`;
};

// src/actions/ibc-swap/index.ts
var createIBCSwapAction = (pluginOptions) => ({
  name: "COSMOS_IBC_SWAP",
  description: "Swaps tokens on cosmos chains",
  handler: async (_runtime, _message, state, _options, _callback) => {
    const cosmosIBCSwapContext = composeContext2({
      state,
      template: cosmosIBCSwapTemplate,
      templatingEngine: "handlebars"
    });
    const cosmosIBCSwapContent = await generateObjectDeprecated2({
      runtime: _runtime,
      context: cosmosIBCSwapContext,
      modelClass: ModelClass2.SMALL
    });
    const paramOptions = {
      fromChainName: cosmosIBCSwapContent.fromChainName,
      fromTokenSymbol: cosmosIBCSwapContent.fromTokenSymbol,
      fromTokenAmount: cosmosIBCSwapContent.fromTokenAmount,
      toTokenSymbol: cosmosIBCSwapContent.toTokenSymbol,
      toChainName: cosmosIBCSwapContent.toChainName,
      toTokenDenom: cosmosIBCSwapContent?.toTokenDenom || void 0,
      fromTokenDenom: cosmosIBCSwapContent?.fromTokenDenom || void 0
    };
    console.log(
      "Parameters extracted from user prompt: ",
      JSON.stringify(paramOptions, null, 2)
    );
    try {
      const walletProvider = await initWalletChainsData(_runtime);
      const action = new IBCSwapAction(walletProvider);
      const customAssets = (pluginOptions?.customChainData ?? []).map(
        (chainData) => chainData.assets
      );
      if (_callback) {
        const swapResp = await action.execute(
          paramOptions,
          customAssets,
          _callback
        );
        const text = swapResp.status === "STATE_COMPLETED_SUCCESS" ? `Successfully swapped ${swapResp.fromTokenAmount} ${swapResp.fromTokenSymbol} tokens to ${swapResp.toTokenSymbol} on chain ${swapResp.toChainName}.
Transaction Hash: ${swapResp.txHash}` : `Error occured swapping ${swapResp.fromTokenAmount} ${swapResp.fromTokenSymbol} tokens to ${swapResp.toTokenSymbol} on chain ${swapResp.toChainName}.
Transaction Hash: ${swapResp.txHash}, try again`;
        await _callback({
          text,
          content: {
            success: swapResp.status === "STATE_COMPLETED_SUCCESS",
            hash: swapResp.txHash,
            fromTokenAmount: paramOptions.fromTokenAmount,
            fromToken: paramOptions.fromTokenSymbol,
            toToken: paramOptions.toTokenSymbol,
            fromChain: paramOptions.fromChainName,
            toChain: paramOptions.toChainName
          }
        });
      }
      return true;
    } catch (error) {
      console.error("Error during ibc token swap:", error);
      const regex = /Ambiguity Error.*value:([^\s.]+)\s+chainName:([^\s.]+)/;
      const match = error.message.match(regex);
      if (match) {
        const value = match[1];
        const chainName = match[2];
        if (_callback) {
          await _callback({
            text: prepareAmbiguityErrorMessage(value, chainName),
            content: { error: error.message }
          });
        }
      } else {
        console.error("Unhandled error:", error);
        if (_callback) {
          await _callback({
            text: `Error ibc swapping tokens: ${error.message}`,
            content: { error: error.message }
          });
        }
      }
      return false;
    }
  },
  template: cosmosIBCSwapTemplate,
  validate: async (runtime) => {
    const mnemonic = runtime.getSetting("COSMOS_RECOVERY_PHRASE");
    const availableChains = runtime.getSetting("COSMOS_AVAILABLE_CHAINS");
    const availableChainsArray = availableChains?.split(",");
    return !(mnemonic && availableChains && availableChainsArray.length);
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Swap {{0.0001 ATOM}} from {{cosmoshub}} to {{OM}} on {{mantrachain1}}",
          action: "COSMOS_IBC_SWAP"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Do you confirm the swap?",
          action: "COSMOS_IBC_SWAP"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "Yes",
          action: "COSMOS_IBC_SWAP"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Starting swap transaction. Keep in mind that it might take couple of minutes",
          action: "COSMOS_IBC_SWAP"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Swap {{0.0001 OM}} from {{mantrachain}} to {{OSMO}} on {{osmosis}}",
          action: "COSMOS_IBC_SWAP"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Do you confirm the swap?",
          action: "COSMOS_IBC_SWAP"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "Yes",
          action: "COSMOS_IBC_SWAP"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Starting swap transaction. Keep in mind that it might take couple of minutes",
          action: "COSMOS_IBC_SWAP"
        }
      }
    ]
  ],
  similes: ["COSMOS_SWAP", "COSMOS_SWAP_IBC"]
});

// src/actions/ibc-transfer/index.ts
import {
  composeContext as composeContext3,
  generateObjectDeprecated as generateObjectDeprecated3,
  ModelClass as ModelClass3
} from "@elizaos/core";

// src/actions/ibc-transfer/services/ibc-transfer-action-service.ts
import {
  convertDisplayUnitToBaseUnit as convertDisplayUnitToBaseUnit3,
  getAssetBySymbol as getAssetBySymbol2,
  getChainByChainName as getChainByChainName3
} from "@chain-registry/utils";
import { assets as assets5, chains as chains3 } from "chain-registry";
var IBCTransferAction = class {
  constructor(cosmosWalletChains) {
    this.cosmosWalletChains = cosmosWalletChains;
    this.cosmosWalletChains = cosmosWalletChains;
  }
  async execute(params, bridgeDenomProvider2, customChainAssets) {
    const senderAddress = await this.cosmosWalletChains.getWalletAddress(
      params.chainName
    );
    const skipClient = this.cosmosWalletChains.getSkipClient(
      params.chainName
    );
    if (!senderAddress) {
      throw new Error(
        `Cannot get wallet address for chain ${params.chainName}`
      );
    }
    if (!params.toAddress) {
      throw new Error("No receiver address");
    }
    if (!params.targetChainName) {
      throw new Error("No target chain name");
    }
    if (!params.chainName) {
      throw new Error("No chain name");
    }
    if (!params.symbol) {
      throw new Error("No symbol");
    }
    const availableAssets = getAvailableAssets(assets5, customChainAssets);
    const denom = getAssetBySymbol2(
      availableAssets,
      params.symbol,
      params.chainName
    );
    const sourceChain = getChainByChainName3(chains3, params.chainName);
    const destChain = getChainByChainName3(chains3, params.targetChainName);
    if (!denom.base) {
      throw new Error("Cannot find asset");
    }
    if (!sourceChain) {
      throw new Error("Cannot find source chain");
    }
    if (!destChain) {
      throw new Error("Cannot find destination chain");
    }
    const bridgeDenomResult = await bridgeDenomProvider2(
      denom.base,
      sourceChain.chain_id,
      destChain.chain_id
    );
    if (!bridgeDenomResult || !bridgeDenomResult.denom) {
      throw new Error("Failed to get destination asset denomination");
    }
    const destAssetDenom = bridgeDenomResult.denom;
    const route = await skipClient.route({
      destAssetChainID: destChain.chain_id,
      destAssetDenom,
      sourceAssetChainID: sourceChain.chain_id,
      sourceAssetDenom: denom.base,
      amountIn: convertDisplayUnitToBaseUnit3(
        availableAssets,
        params.symbol,
        params.amount,
        params.chainName
      ),
      cumulativeAffiliateFeeBPS: "0"
    });
    const fromAddress = {
      chainID: sourceChain.chain_id,
      address: await this.cosmosWalletChains.getWalletAddress(params.chainName)
    };
    const toAddress = {
      chainID: destChain.chain_id,
      address: params.toAddress
    };
    const userAddresses = [fromAddress, toAddress];
    let txHash;
    try {
      await skipClient.executeRoute({
        route,
        userAddresses,
        onTransactionCompleted: async (_, executeRouteTxHash) => {
          txHash = executeRouteTxHash;
        }
      });
    } catch (error) {
      throw new Error(`Failed to execute route: ${error?.message}`);
    }
    if (!txHash) {
      throw new Error("Transaction hash is undefined after executing route");
    }
    return {
      from: senderAddress,
      to: params.toAddress,
      txHash
    };
  }
};

// src/shared/services/skip-api/assets-from-source-fetcher/skip-api-assets-from-source-fetcher.ts
import axios from "axios";

// src/shared/services/skip-api/assets-from-source-fetcher/schema.ts
import { z } from "zod";
var skipApiAssetsFromSourceParamsSchema = z.object({
  source_asset_denom: z.string(),
  source_asset_chain_id: z.string(),
  allow_multi_tx: z.boolean()
});
var skipApiAssetsFromSourceResponseAssetSchema = z.object({
  denom: z.string(),
  chain_id: z.string(),
  origin_denom: z.string(),
  origin_chain_id: z.string(),
  trace: z.string(),
  symbol: z.string().optional(),
  name: z.string().optional(),
  logo_uri: z.string().optional(),
  decimals: z.number().optional(),
  recommended_symbol: z.string().optional()
});
var skipApiAssetsFromSourceResponseSchema = z.object({
  dest_assets: z.record(
    z.string(),
    z.object({
      assets: z.array(skipApiAssetsFromSourceResponseAssetSchema)
    })
  )
});

// src/shared/services/skip-api/config.ts
var skipApiBaseUrl = "https://api.skip.build/v2/";

// src/shared/services/skip-api/assets-from-source-fetcher/skip-api-assets-from-source-fetcher.ts
var endpointPath = "fungible/assets_from_source";
var SkipApiAssetsFromSourceFetcher = class _SkipApiAssetsFromSourceFetcher {
  static instance;
  cache;
  apiUrl;
  constructor() {
    this.cache = /* @__PURE__ */ new Map();
    this.apiUrl = `${skipApiBaseUrl}${endpointPath}`;
  }
  static getInstance() {
    if (!_SkipApiAssetsFromSourceFetcher.instance) {
      _SkipApiAssetsFromSourceFetcher.instance = new _SkipApiAssetsFromSourceFetcher();
    }
    return _SkipApiAssetsFromSourceFetcher.instance;
  }
  generateCacheKey(sourceAssetDenom, sourceAssetChainId) {
    return `${sourceAssetDenom}_${sourceAssetChainId}`;
  }
  async fetch(sourceAssetDenom, sourceAssetChainId) {
    const cacheKey = this.generateCacheKey(
      sourceAssetDenom,
      sourceAssetChainId
    );
    if (this.cache.has(cacheKey)) {
      const cachedData = this.cache.get(cacheKey);
      if (!cachedData) {
        throw new Error("Cache inconsistency: data not found after check");
      }
      return cachedData;
    }
    const requestData = {
      source_asset_denom: sourceAssetDenom,
      source_asset_chain_id: sourceAssetChainId,
      allow_multi_tx: false
    };
    try {
      const response = await axios.post(this.apiUrl, requestData, {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 5e3
      });
      const validResponse = skipApiAssetsFromSourceResponseSchema.parse(
        response.data
      );
      this.cache.set(cacheKey, validResponse);
      return response.data;
    } catch (error) {
      console.error("Error fetching assets:", error);
      throw error;
    }
  }
};

// src/actions/ibc-transfer/services/bridge-denom-provider.ts
var bridgeDenomProvider = async (sourceAssetDenom, sourceAssetChainId, destChainId) => {
  const skipApiAssetsFromSourceFetcher = SkipApiAssetsFromSourceFetcher.getInstance();
  const bridgeData = await skipApiAssetsFromSourceFetcher.fetch(
    sourceAssetDenom,
    sourceAssetChainId
  );
  const destAssets = bridgeData.dest_assets[destChainId];
  if (!destAssets?.assets) {
    throw new Error(`No assets found for chain ${destChainId}`);
  }
  const ibcAssetData = destAssets.assets?.find(
    ({ origin_denom }) => origin_denom === sourceAssetDenom
  );
  if (!ibcAssetData) {
    throw new Error(`No matching asset found for denom ${sourceAssetDenom}`);
  }
  if (!ibcAssetData.denom) {
    throw new Error("No IBC asset data");
  }
  return {
    denom: ibcAssetData.denom
  };
};

// src/actions/ibc-transfer/index.ts
var createIBCTransferAction = (pluginOptions) => ({
  name: "COSMOS_IBC_TRANSFER",
  description: "Transfer tokens between addresses on cosmos chains",
  handler: async (_runtime, _message, state, _options, _callback) => {
    const cosmosIBCTransferContext = composeContext3({
      state,
      template: cosmosIBCTransferTemplate,
      templatingEngine: "handlebars"
    });
    const cosmosIBCTransferContent = await generateObjectDeprecated3({
      runtime: _runtime,
      context: cosmosIBCTransferContext,
      modelClass: ModelClass3.SMALL
    });
    const paramOptions = {
      chainName: cosmosIBCTransferContent.chainName,
      symbol: cosmosIBCTransferContent.symbol,
      amount: cosmosIBCTransferContent.amount,
      toAddress: cosmosIBCTransferContent.toAddress,
      targetChainName: cosmosIBCTransferContent.targetChainName
    };
    try {
      const walletProvider = await initWalletChainsData(_runtime);
      const action = new IBCTransferAction(walletProvider);
      const customAssets = (pluginOptions?.customChainData ?? []).map(
        (chainData) => chainData.assets
      );
      const transferResp = await action.execute(
        paramOptions,
        bridgeDenomProvider,
        customAssets
      );
      if (_callback) {
        await _callback({
          text: `Successfully transferred ${paramOptions.amount} tokens from ${paramOptions.chainName} to ${paramOptions.toAddress} on ${paramOptions.targetChainName}
Transaction Hash: ${transferResp.txHash}`,
          content: {
            success: true,
            hash: transferResp.txHash,
            amount: paramOptions.amount,
            recipient: transferResp.to,
            fromChain: paramOptions.chainName,
            toChain: paramOptions.targetChainName
          }
        });
        const newMemory = {
          userId: _message.agentId,
          agentId: _message.agentId,
          roomId: _message.roomId,
          content: {
            text: `Transaction ${paramOptions.amount} ${paramOptions.symbol} to address ${paramOptions.toAddress} from chain ${paramOptions.chainName} to ${paramOptions.targetChainName} was successfully transferred. Tx hash: ${transferResp.txHash}`
          }
        };
        await _runtime.messageManager.createMemory(newMemory);
      }
      return true;
    } catch (error) {
      console.error("Error during ibc token transfer:", error);
      if (_callback) {
        await _callback({
          text: `Error ibc transferring tokens: ${error.message}`,
          content: { error: error.message }
        });
      }
      const newMemory = {
        userId: _message.agentId,
        agentId: _message.agentId,
        roomId: _message.roomId,
        content: {
          text: `Transaction ${paramOptions.amount} ${paramOptions.symbol} to address ${paramOptions.toAddress} on chain ${paramOptions.chainName} to ${paramOptions.targetChainName} was unsuccessful.`
        }
      };
      await _runtime.messageManager.createMemory(newMemory);
      return false;
    }
  },
  template: cosmosTransferTemplate,
  validate: async (runtime) => {
    const mnemonic = runtime.getSetting("COSMOS_RECOVERY_PHRASE");
    const availableChains = runtime.getSetting("COSMOS_AVAILABLE_CHAINS");
    const availableChainsArray = availableChains?.split(",");
    return !!(mnemonic && availableChains && availableChainsArray.length);
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Make an IBC transfer {{0.0001 ATOM}} to {{osmosis1pcnw46km8m5amvf7jlk2ks5std75k73aralhcf}} from {{cosmoshub}} to {{osmosis}}",
          action: "COSMOS_IBC_TRANSFER"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Do you confirm the IBC transfer action?",
          action: "COSMOS_IBC_TRANSFER"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "Yes",
          action: "COSMOS_IBC_TRANSFER"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "",
          action: "COSMOS_IBC_TRANSFER"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Send {{50 OSMO}} to {{juno13248w8dtnn07sxc3gq4l3ts4rvfyat6f4qkdd6}} from {{osmosis}} to {{juno}}",
          action: "COSMOS_IBC_TRANSFER"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Do you confirm the IBC transfer action?",
          action: "COSMOS_IBC_TRANSFER"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "Yes",
          action: "COSMOS_IBC_TRANSFER"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "",
          action: "COSMOS_IBC_TRANSFER"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Transfer {{0.005 JUNO}} from {{juno}} to {{cosmos1n0xv7z2pkl4eppnm7g2rqhe2q8q6v69h7w93fc}} on {{cosmoshub}}",
          action: "COSMOS_IBC_TRANSFER"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Do you confirm the IBC transfer action?",
          action: "COSMOS_IBC_TRANSFER"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "Yes",
          action: "COSMOS_IBC_TRANSFER"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "",
          action: "COSMOS_IBC_TRANSFER"
        }
      }
    ]
  ],
  similes: [
    "COSMOS_BRIDGE_TOKEN",
    "COSMOS_IBC_SEND_TOKEN",
    "COSMOS_TOKEN_IBC_TRANSFER",
    "COSMOS_MOVE_IBC_TOKENS"
  ]
});

// src/index.ts
var createCosmosPlugin = (pluginOptions) => ({
  name: "cosmos",
  description: "Cosmos blockchain integration plugin",
  providers: [createCosmosWalletProvider(pluginOptions)],
  evaluators: [],
  services: [],
  actions: [createTransferAction(pluginOptions), createIBCSwapAction(pluginOptions), createIBCTransferAction(pluginOptions)]
});
var index_default = createCosmosPlugin;
export {
  createCosmosPlugin,
  index_default as default
};
//# sourceMappingURL=index.js.map