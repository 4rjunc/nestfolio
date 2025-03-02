// src/actions/swap.ts
import {
  composeContext,
  elizaLogger,
  generateObjectDeprecated,
  ModelClass
} from "@elizaos/core";
import { executeRoute, getRoutes } from "@lifi/sdk";
import { parseEther } from "viem";

// src/providers/wallet.ts
import { EVM, createConfig, getToken } from "@lifi/sdk";
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http,
  erc20Abi
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as viemChains from "viem/chains";
import { createWeb3Name } from "@web3-name-sdk/core";
var WalletProvider = class _WalletProvider {
  currentChain = "bsc";
  chains = { bsc: viemChains.bsc };
  account;
  constructor(privateKey, chains) {
    this.setAccount(privateKey);
    this.setChains(chains);
    if (chains && Object.keys(chains).length > 0) {
      this.setCurrentChain(Object.keys(chains)[0]);
    }
  }
  getAccount() {
    return this.account;
  }
  getAddress() {
    return this.account.address;
  }
  getCurrentChain() {
    return this.chains[this.currentChain];
  }
  getPublicClient(chainName) {
    const transport = this.createHttpTransport(chainName);
    const publicClient = createPublicClient({
      chain: this.chains[chainName],
      transport
    });
    return publicClient;
  }
  getWalletClient(chainName) {
    const transport = this.createHttpTransport(chainName);
    const walletClient = createWalletClient({
      chain: this.chains[chainName],
      transport,
      account: this.account
    });
    return walletClient;
  }
  getChainConfigs(chainName) {
    const chain = viemChains[chainName];
    if (!chain?.id) {
      throw new Error("Invalid chain name");
    }
    return chain;
  }
  configureLiFiSdk(chainName) {
    const chains = Object.values(this.chains);
    const walletClient = this.getWalletClient(chainName);
    createConfig({
      integrator: "eliza",
      providers: [
        EVM({
          getWalletClient: async () => walletClient,
          switchChain: async (chainId) => createWalletClient({
            account: this.account,
            chain: chains.find(
              (chain) => chain.id === chainId
            ),
            transport: http()
          })
        })
      ]
    });
  }
  async formatAddress(address) {
    if (!address || address.length === 0) {
      throw new Error("Empty address");
    }
    if (address.startsWith("0x") && address.length === 42) {
      return address;
    }
    const resolvedAddress = await this.resolveWeb3Name(address);
    if (resolvedAddress) {
      return resolvedAddress;
    }
    throw new Error("Invalid address");
  }
  async resolveWeb3Name(name) {
    const nameService = createWeb3Name();
    return await nameService.getAddress(name);
  }
  async checkERC20Allowance(chain, token, owner, spender) {
    const publicClient = this.getPublicClient(chain);
    return await publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: "allowance",
      args: [owner, spender]
    });
  }
  async approveERC20(chain, token, spender, amount) {
    const publicClient = this.getPublicClient(chain);
    const walletClient = this.getWalletClient(chain);
    const { request } = await publicClient.simulateContract({
      account: this.account,
      address: token,
      abi: erc20Abi,
      functionName: "approve",
      args: [spender, amount]
    });
    return await walletClient.writeContract(request);
  }
  async transfer(chain, toAddress, amount, options) {
    const walletClient = this.getWalletClient(chain);
    return await walletClient.sendTransaction({
      account: this.account,
      to: toAddress,
      value: amount,
      chain: this.getChainConfigs(chain),
      ...options
    });
  }
  async transferERC20(chain, tokenAddress, toAddress, amount, options) {
    const publicClient = this.getPublicClient(chain);
    const walletClient = this.getWalletClient(chain);
    const { request } = await publicClient.simulateContract({
      account: this.account,
      address: tokenAddress,
      abi: erc20Abi,
      functionName: "transfer",
      args: [toAddress, amount],
      ...options
    });
    return await walletClient.writeContract(request);
  }
  async getBalance() {
    const client = this.getPublicClient(this.currentChain);
    const balance = await client.getBalance({
      address: this.account.address
    });
    return formatUnits(balance, 18);
  }
  async getTokenAddress(chainName, tokenSymbol) {
    const token = await getToken(
      this.getChainConfigs(chainName).id,
      tokenSymbol
    );
    return token.address;
  }
  addChain(chain) {
    this.setChains(chain);
  }
  switchChain(chainName, customRpcUrl) {
    if (!this.chains[chainName]) {
      const chain = _WalletProvider.genChainFromName(
        chainName,
        customRpcUrl
      );
      this.addChain({ [chainName]: chain });
    }
    this.setCurrentChain(chainName);
  }
  setAccount = (pk) => {
    this.account = privateKeyToAccount(pk);
  };
  setChains = (chains) => {
    if (!chains) {
      return;
    }
    for (const chain of Object.keys(chains)) {
      this.chains[chain] = chains[chain];
    }
  };
  setCurrentChain = (chain) => {
    this.currentChain = chain;
  };
  createHttpTransport = (chainName) => {
    const chain = this.chains[chainName];
    if (chain.rpcUrls.custom) {
      return http(chain.rpcUrls.custom.http[0]);
    }
    return http(chain.rpcUrls.default.http[0]);
  };
  static genChainFromName(chainName, customRpcUrl) {
    const baseChain = viemChains[chainName];
    if (!baseChain?.id) {
      throw new Error("Invalid chain name");
    }
    const viemChain = customRpcUrl ? {
      ...baseChain,
      rpcUrls: {
        ...baseChain.rpcUrls,
        custom: {
          http: [customRpcUrl]
        }
      }
    } : baseChain;
    return viemChain;
  }
};
var genChainsFromRuntime = (runtime) => {
  const chainNames = ["bsc", "bscTestnet", "opBNB", "opBNBTestnet"];
  const chains = {};
  for (const chainName of chainNames) {
    const chain = WalletProvider.genChainFromName(chainName);
    chains[chainName] = chain;
  }
  const mainnet_rpcurl = runtime.getSetting("BSC_PROVIDER_URL");
  if (mainnet_rpcurl) {
    const chain = WalletProvider.genChainFromName("bsc", mainnet_rpcurl);
    chains["bsc"] = chain;
  }
  const opbnb_rpcurl = runtime.getSetting("OPBNB_PROVIDER_URL");
  if (opbnb_rpcurl) {
    const chain = WalletProvider.genChainFromName("opBNB", opbnb_rpcurl);
    chains["opBNB"] = chain;
  }
  return chains;
};
var initWalletProvider = (runtime) => {
  const privateKey = runtime.getSetting("BNB_PRIVATE_KEY");
  if (!privateKey) {
    throw new Error("BNB_PRIVATE_KEY is missing");
  }
  const chains = genChainsFromRuntime(runtime);
  return new WalletProvider(privateKey, chains);
};
var bnbWalletProvider = {
  async get(runtime, _message, _state) {
    try {
      const walletProvider = initWalletProvider(runtime);
      const address = walletProvider.getAddress();
      const balance = await walletProvider.getBalance();
      const chain = walletProvider.getCurrentChain();
      return `BNB chain Wallet Address: ${address}
Balance: ${balance} ${chain.nativeCurrency.symbol}
Chain ID: ${chain.id}, Name: ${chain.name}`;
    } catch (error) {
      console.error("Error in BNB chain wallet provider:", error);
      return null;
    }
  }
};

// src/templates/index.ts
var getBalanceTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested check balance:
- Chain to execute on. Must be one of ["bsc", "bscTestnet", "opBNB", "opBNBTestnet"]. Default is "bsc".
- Address to check balance for. Optional, must be a valid Ethereum address starting with "0x" or a web3 domain name. If not provided, use the BNB chain Wallet Address.
- Token symbol or address. Could be a token symbol or address. If the address is provided, it must be a valid Ethereum address starting with "0x". Default is "BNB".
If any field is not provided, use the default value. If no default value is specified, use null.

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined:

\`\`\`json
{
    "chain": SUPPORTED_CHAINS,
    "address": string | null,
    "token": string
}
\`\`\`
`;
var transferTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested transfer:
- Chain to execute on. Must be one of ["bsc", "bscTestnet", "opBNB", "opBNBTestnet"]. Default is "bsc".
- Token symbol or address(string starting with "0x"). Optional.
- Amount to transfer. Optional. Must be a string representing the amount in ether (only number without coin symbol, e.g., "0.1").
- Recipient address. Must be a valid Ethereum address starting with "0x" or a web3 domain name.
- Data. Optional, data to be included in the transaction.
If any field is not provided, use the default value. If no default value is specified, use null.

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined:

\`\`\`json
{
    "chain": SUPPORTED_CHAINS,
    "token": string | null,
    "amount": string | null,
    "toAddress": string,
    "data": string | null
}
\`\`\`
`;
var swapTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested token swap:
- Chain to execute on. Must be one of ["bsc", "bscTestnet", "opBNB", "opBNBTestnet"]. Default is "bsc".
- Input token symbol or address(string starting with "0x").
- Output token symbol or address(string starting with "0x").
- Amount to swap. Must be a string representing the amount in ether (only number without coin symbol, e.g., "0.1").
- Slippage. Optional, expressed as decimal proportion, 0.03 represents 3%.
If any field is not provided, use the default value. If no default value is specified, use null.

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined:

\`\`\`json
{
    "chain": SUPPORTED_CHAINS,
    "inputToken": string | null,
    "outputToken": string | null,
    "amount": string | null,
    "slippage": number | null
}
\`\`\`
`;
var bridgeTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested token bridge:
- From chain. Must be one of ["bsc", "opBNB"].
- To chain. Must be one of ["bsc", "opBNB"].
- From token address. Optional, must be a valid Ethereum address starting with "0x".
- To token address. Optional, must be a valid Ethereum address starting with "0x".
- Amount to bridge. Must be a string representing the amount in ether (only number without coin symbol, e.g., "0.1").
- To address. Optional, must be a valid Ethereum address starting with "0x" or a web3 domain name.

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined:

\`\`\`json
{
    "fromChain": "bsc" | "opBNB",
    "toChain": "bsc" | "opBNB",
    "fromToken": string | null,
    "toToken": string | null,
    "amount": string,
    "toAddress": string | null
}
\`\`\`
`;
var stakeTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested stake action:
- Chain to execute on. Must be one of ["bsc", "bscTestnet", "opBNB", "opBNBTestnet"]. Default is "bsc".
- Action to execute. Must be one of ["deposit", "withdraw", "claim"].
- Amount to execute. Optional, must be a string representing the amount in ether (only number without coin symbol, e.g., "0.1"). If the action is "deposit" or "withdraw", amount is required.
If any field is not provided, use the default value. If no default value is specified, use null.

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined:

\`\`\`json
{
    "chain": SUPPORTED_CHAINS,
    "action": "deposit" | "withdraw" | "claim",
    "amount": string | null,
}
\`\`\`
`;
var faucetTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested faucet request:
- Token. Token to request. Could be one of ["BNB", "BTC", "BUSD", "DAI", "ETH", "USDC"]. Optional.
- Recipient address. Optional, must be a valid Ethereum address starting with "0x" or a web3 domain name. If not provided, use the BNB chain Wallet Address.
If any field is not provided, use the default value. If no default value is specified, use null.

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined:

\`\`\`json
{
    "token": string | null,
    "toAddress": string | null
}
\`\`\`
`;
var ercContractTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

When user wants to deploy any type of token contract (ERC20/721/1155), this will trigger the DEPLOY_TOKEN action.

Extract the following details for deploying a token contract:
- Chain to execute on. Must be one of ["bsc", "bscTestnet", "opBNB", "opBNBTestnet"]. Default is "bsc".
- contractType: The type of token contract to deploy
  - For ERC20: Extract name, symbol, decimals, totalSupply
  - For ERC721: Extract name, symbol, baseURI
  - For ERC1155: Extract name, baseURI
- name: The name of the token.
- symbol: The token symbol (only for ERC20/721).
- decimals: Token decimals (only for ERC20). Default is 18.
- totalSupply: Total supply with decimals (only for ERC20). Default is "1000000000000000000".
- baseURI: Base URI for token metadata (only for ERC721/1155).
If any field is not provided, use the default value. If no default value is provided, use empty string.

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined:

\`\`\`json
{
    "chain": SUPPORTED_CHAINS,
    "contractType": "ERC20" | "ERC721" | "ERC1155",
    "name": string,
    "symbol": string | null,
    "decimals": number | null,
    "totalSupply": string | null,
    "baseURI": string | null
}
\`\`\`
`;

// src/actions/swap.ts
var SwapAction = class {
  constructor(walletProvider) {
    this.walletProvider = walletProvider;
  }
  async swap(params) {
    elizaLogger.debug("Swap params:", params);
    this.validateAndNormalizeParams(params);
    elizaLogger.debug("Normalized swap params:", params);
    const fromAddress = this.walletProvider.getAddress();
    const chainId = this.walletProvider.getChainConfigs(params.chain).id;
    this.walletProvider.configureLiFiSdk(params.chain);
    const resp = {
      chain: params.chain,
      txHash: "0x",
      fromToken: params.fromToken,
      toToken: params.toToken,
      amount: params.amount
    };
    const routes = await getRoutes({
      fromChainId: chainId,
      toChainId: chainId,
      fromTokenAddress: params.fromToken,
      toTokenAddress: params.toToken,
      fromAmount: parseEther(params.amount).toString(),
      fromAddress,
      options: {
        slippage: params.slippage,
        order: "RECOMMENDED"
      }
    });
    if (!routes.routes.length) throw new Error("No routes found");
    const execution = await executeRoute(routes.routes[0]);
    const process = execution.steps[0]?.execution?.process[execution.steps[0]?.execution?.process.length - 1];
    if (!process?.status || process.status === "FAILED") {
      throw new Error("Transaction failed");
    }
    resp.txHash = process.txHash;
    return resp;
  }
  validateAndNormalizeParams(params) {
    if (params.chain !== "bsc") {
      throw new Error("Only BSC mainnet is supported");
    }
  }
};
var swapAction = {
  name: "swap",
  description: "Swap tokens on the same chain",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger.log("Starting swap action...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    state.walletInfo = await bnbWalletProvider.get(
      runtime,
      message,
      currentState
    );
    const swapContext = composeContext({
      state: currentState,
      template: swapTemplate
    });
    const content = await generateObjectDeprecated({
      runtime,
      context: swapContext,
      modelClass: ModelClass.LARGE
    });
    const walletProvider = initWalletProvider(runtime);
    const action = new SwapAction(walletProvider);
    const swapOptions = {
      chain: content.chain,
      fromToken: content.inputToken,
      toToken: content.outputToken,
      amount: content.amount,
      slippage: content.slippage
    };
    try {
      const swapResp = await action.swap(swapOptions);
      callback?.({
        text: `Successfully swap ${swapResp.amount} ${swapResp.fromToken} tokens to ${swapResp.toToken}
Transaction Hash: ${swapResp.txHash}`,
        content: { ...swapResp }
      });
      return true;
    } catch (error) {
      elizaLogger.error("Error during swap:", error.message);
      callback?.({
        text: `Swap failed: ${error.message}`,
        content: { error: error.message }
      });
      return false;
    }
  },
  template: swapTemplate,
  validate: async (runtime) => {
    const privateKey = runtime.getSetting("BNB_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Swap 1 BNB for USDC on BSC"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you swap 1 BNB for USDC on BSC",
          action: "SWAP",
          content: {
            chain: "bsc",
            inputToken: "BNB",
            outputToken: "USDC",
            amount: "1",
            slippage: void 0
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Buy some token of 0x1234 using 1 USDC on BSC. The slippage should be no more than 5%"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you swap 1 USDC for token 0x1234 on BSC",
          action: "SWAP",
          content: {
            chain: "bsc",
            inputToken: "USDC",
            outputToken: "0x1234",
            amount: "1",
            slippage: 0.05
          }
        }
      }
    ]
  ],
  similes: ["SWAP", "TOKEN_SWAP", "EXCHANGE_TOKENS", "TRADE_TOKENS"]
};

// src/actions/transfer.ts
import {
  composeContext as composeContext2,
  elizaLogger as elizaLogger2,
  generateObjectDeprecated as generateObjectDeprecated2,
  ModelClass as ModelClass2
} from "@elizaos/core";
import {
  formatEther,
  formatUnits as formatUnits2,
  parseEther as parseEther2,
  parseUnits,
  erc20Abi as erc20Abi2
} from "viem";
var TransferAction = class {
  // 3 Gwei
  constructor(walletProvider) {
    this.walletProvider = walletProvider;
  }
  TRANSFER_GAS = 21000n;
  DEFAULT_GAS_PRICE = 3000000000n;
  async transfer(params) {
    elizaLogger2.debug("Transfer params:", params);
    this.validateAndNormalizeParams(params);
    elizaLogger2.debug("Normalized transfer params:", params);
    const fromAddress = this.walletProvider.getAddress();
    this.walletProvider.switchChain(params.chain);
    const nativeToken = this.walletProvider.chains[params.chain].nativeCurrency.symbol;
    const resp = {
      chain: params.chain,
      txHash: "0x",
      recipient: params.toAddress,
      amount: "",
      token: params.token ?? nativeToken
    };
    if (!params.token || params.token === nativeToken) {
      const options = {
        data: params.data
      };
      let value;
      if (!params.amount) {
        const publicClient2 = this.walletProvider.getPublicClient(
          params.chain
        );
        const balance = await publicClient2.getBalance({
          address: fromAddress
        });
        value = balance - this.DEFAULT_GAS_PRICE * 21000n;
        options.gas = this.TRANSFER_GAS;
        options.gasPrice = this.DEFAULT_GAS_PRICE;
      } else {
        value = parseEther2(params.amount);
      }
      resp.amount = formatEther(value);
      resp.txHash = await this.walletProvider.transfer(
        params.chain,
        params.toAddress,
        value,
        options
      );
    } else {
      let tokenAddress = params.token;
      if (!params.token.startsWith("0x")) {
        tokenAddress = await this.walletProvider.getTokenAddress(
          params.chain,
          params.token
        );
      }
      const publicClient2 = this.walletProvider.getPublicClient(
        params.chain
      );
      const decimals = await publicClient2.readContract({
        address: tokenAddress,
        abi: erc20Abi2,
        functionName: "decimals"
      });
      let value;
      if (!params.amount) {
        value = await publicClient2.readContract({
          address: tokenAddress,
          abi: erc20Abi2,
          functionName: "balanceOf",
          args: [fromAddress]
        });
      } else {
        value = parseUnits(params.amount, decimals);
      }
      resp.amount = formatUnits2(value, decimals);
      resp.txHash = await this.walletProvider.transferERC20(
        params.chain,
        tokenAddress,
        params.toAddress,
        value
      );
    }
    if (!resp.txHash || resp.txHash === "0x") {
      throw new Error("Get transaction hash failed");
    }
    const publicClient = this.walletProvider.getPublicClient(params.chain);
    await publicClient.waitForTransactionReceipt({
      hash: resp.txHash
    });
    return resp;
  }
  async validateAndNormalizeParams(params) {
    if (!params.toAddress) {
      throw new Error("To address is required");
    }
    params.toAddress = await this.walletProvider.formatAddress(
      params.toAddress
    );
  }
};
var transferAction = {
  name: "transfer",
  description: "Transfer tokens between addresses on the same chain",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger2.log("Starting transfer action...");
    if (!(message.content.source === "direct")) {
      callback?.({
        text: "I can't do that for you.",
        content: { error: "Transfer not allowed" }
      });
      return false;
    }
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    state.walletInfo = await bnbWalletProvider.get(
      runtime,
      message,
      currentState
    );
    const transferContext = composeContext2({
      state: currentState,
      template: transferTemplate
    });
    const content = await generateObjectDeprecated2({
      runtime,
      context: transferContext,
      modelClass: ModelClass2.LARGE
    });
    const walletProvider = initWalletProvider(runtime);
    const action = new TransferAction(walletProvider);
    const paramOptions = {
      chain: content.chain,
      token: content.token,
      amount: content.amount,
      toAddress: content.toAddress,
      data: content.data
    };
    try {
      const transferResp = await action.transfer(paramOptions);
      callback?.({
        text: `Successfully transferred ${transferResp.amount} ${transferResp.token} to ${transferResp.recipient}
Transaction Hash: ${transferResp.txHash}`,
        content: { ...transferResp }
      });
      return true;
    } catch (error) {
      elizaLogger2.error("Error during transfer:", error.message);
      callback?.({
        text: `Transfer failed: ${error.message}`,
        content: { error: error.message }
      });
      return false;
    }
  },
  template: transferTemplate,
  validate: async (runtime) => {
    const privateKey = runtime.getSetting("BNB_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Transfer 1 BNB to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you transfer 1 BNB to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on BSC",
          action: "TRANSFER",
          content: {
            chain: "bsc",
            token: "BNB",
            amount: "1",
            toAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Transfer 1 token of 0x1234 to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you transfer 1 token of 0x1234 to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on BSC",
          action: "TRANSFER",
          content: {
            chain: "bsc",
            token: "0x1234",
            amount: "1",
            toAddress: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
          }
        }
      }
    ]
  ],
  similes: ["TRANSFER", "SEND_TOKENS", "TOKEN_TRANSFER", "MOVE_TOKENS"]
};

// src/types/index.ts
var L1StandardBridgeAbi = [
  {
    type: "constructor",
    inputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "receive",
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "MESSENGER",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract CrossDomainMessenger"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "OTHER_BRIDGE",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract StandardBridge"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "bridgeERC20",
    inputs: [
      {
        name: "_localToken",
        type: "address",
        internalType: "address"
      },
      {
        name: "_remoteToken",
        type: "address",
        internalType: "address"
      },
      {
        name: "_amount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "_minGasLimit",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "_extraData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "bridgeERC20To",
    inputs: [
      {
        name: "_localToken",
        type: "address",
        internalType: "address"
      },
      {
        name: "_remoteToken",
        type: "address",
        internalType: "address"
      },
      {
        name: "_to",
        type: "address",
        internalType: "address"
      },
      {
        name: "_amount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "_minGasLimit",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "_extraData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "bridgeETH",
    inputs: [
      {
        name: "_minGasLimit",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "_extraData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "bridgeETHTo",
    inputs: [
      {
        name: "_to",
        type: "address",
        internalType: "address"
      },
      {
        name: "_minGasLimit",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "_extraData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "depositERC20",
    inputs: [
      {
        name: "_l1Token",
        type: "address",
        internalType: "address"
      },
      {
        name: "_l2Token",
        type: "address",
        internalType: "address"
      },
      {
        name: "_amount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "_minGasLimit",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "_extraData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "depositERC20To",
    inputs: [
      {
        name: "_l1Token",
        type: "address",
        internalType: "address"
      },
      {
        name: "_l2Token",
        type: "address",
        internalType: "address"
      },
      {
        name: "_to",
        type: "address",
        internalType: "address"
      },
      {
        name: "_amount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "_minGasLimit",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "_extraData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "depositETH",
    inputs: [
      {
        name: "_minGasLimit",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "_extraData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "depositETHTo",
    inputs: [
      {
        name: "_to",
        type: "address",
        internalType: "address"
      },
      {
        name: "_minGasLimit",
        type: "uint32",
        internalType: "uint32"
      },
      {
        name: "_extraData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "deposits",
    inputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      },
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    outputs: [
      {
        name: "",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "finalizeBridgeERC20",
    inputs: [
      {
        name: "_localToken",
        type: "address",
        internalType: "address"
      },
      {
        name: "_remoteToken",
        type: "address",
        internalType: "address"
      },
      {
        name: "_from",
        type: "address",
        internalType: "address"
      },
      {
        name: "_to",
        type: "address",
        internalType: "address"
      },
      {
        name: "_amount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "_extraData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "finalizeBridgeETH",
    inputs: [
      {
        name: "_from",
        type: "address",
        internalType: "address"
      },
      {
        name: "_to",
        type: "address",
        internalType: "address"
      },
      {
        name: "_amount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "_extraData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "finalizeERC20Withdrawal",
    inputs: [
      {
        name: "_l1Token",
        type: "address",
        internalType: "address"
      },
      {
        name: "_l2Token",
        type: "address",
        internalType: "address"
      },
      {
        name: "_from",
        type: "address",
        internalType: "address"
      },
      {
        name: "_to",
        type: "address",
        internalType: "address"
      },
      {
        name: "_amount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "_extraData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "finalizeETHWithdrawal",
    inputs: [
      {
        name: "_from",
        type: "address",
        internalType: "address"
      },
      {
        name: "_to",
        type: "address",
        internalType: "address"
      },
      {
        name: "_amount",
        type: "uint256",
        internalType: "uint256"
      },
      {
        name: "_extraData",
        type: "bytes",
        internalType: "bytes"
      }
    ],
    outputs: [],
    stateMutability: "payable"
  },
  {
    type: "function",
    name: "initialize",
    inputs: [
      {
        name: "_messenger",
        type: "address",
        internalType: "contract CrossDomainMessenger"
      },
      {
        name: "_superchainConfig",
        type: "address",
        internalType: "contract SuperchainConfig"
      },
      {
        name: "_systemConfig",
        type: "address",
        internalType: "contract SystemConfig"
      }
    ],
    outputs: [],
    stateMutability: "nonpayable"
  },
  {
    type: "function",
    name: "l2TokenBridge",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "address"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "messenger",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract CrossDomainMessenger"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "otherBridge",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract StandardBridge"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "paused",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "bool",
        internalType: "bool"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "superchainConfig",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract SuperchainConfig"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "systemConfig",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        internalType: "contract SystemConfig"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "function",
    name: "version",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "string",
        internalType: "string"
      }
    ],
    stateMutability: "view"
  },
  {
    type: "event",
    name: "ERC20BridgeFinalized",
    inputs: [
      {
        name: "localToken",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "remoteToken",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "from",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "to",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "extraData",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ERC20BridgeInitiated",
    inputs: [
      {
        name: "localToken",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "remoteToken",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "from",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "to",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "extraData",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ERC20DepositInitiated",
    inputs: [
      {
        name: "l1Token",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "l2Token",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "from",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "to",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "extraData",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ERC20WithdrawalFinalized",
    inputs: [
      {
        name: "l1Token",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "l2Token",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "from",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "to",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "extraData",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ETHBridgeFinalized",
    inputs: [
      {
        name: "from",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "to",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "extraData",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ETHBridgeInitiated",
    inputs: [
      {
        name: "from",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "to",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "extraData",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ETHDepositInitiated",
    inputs: [
      {
        name: "from",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "to",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "extraData",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "ETHWithdrawalFinalized",
    inputs: [
      {
        name: "from",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "to",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "extraData",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "Initialized",
    inputs: [
      {
        name: "version",
        type: "uint8",
        indexed: false,
        internalType: "uint8"
      }
    ],
    anonymous: false
  }
];
var L2StandardBridgeAbi = [
  {
    type: "constructor",
    inputs: [
      {
        name: "_owner",
        type: "address",
        internalType: "address payable"
      },
      {
        name: "_delegationFee",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    stateMutability: "nonpayable"
  },
  {
    name: "AddressEmptyCode",
    type: "error",
    inputs: [{ name: "target", type: "address", internalType: "address" }]
  },
  {
    name: "AddressInsufficientBalance",
    type: "error",
    inputs: [{ name: "account", type: "address", internalType: "address" }]
  },
  { name: "FailedInnerCall", type: "error", inputs: [] },
  {
    name: "OwnableInvalidOwner",
    type: "error",
    inputs: [{ name: "owner", type: "address", internalType: "address" }]
  },
  {
    name: "OwnableUnauthorizedAccount",
    type: "error",
    inputs: [{ name: "account", type: "address", internalType: "address" }]
  },
  {
    name: "SafeERC20FailedOperation",
    type: "error",
    inputs: [{ name: "token", type: "address", internalType: "address" }]
  },
  {
    name: "OwnershipTransferred",
    type: "event",
    inputs: [
      {
        name: "previousOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "newOwner",
        type: "address",
        indexed: true,
        internalType: "address"
      }
    ],
    anonymous: false,
    signature: "0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0"
  },
  {
    name: "SetDelegationFee",
    type: "event",
    inputs: [
      {
        name: "_delegationFee",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      }
    ],
    anonymous: false,
    signature: "0x0322f3257c2afe5fe8da7ab561f0d3384148487412fe2751678f2188731c0815"
  },
  {
    name: "WithdrawTo",
    type: "event",
    inputs: [
      {
        name: "from",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "l2Token",
        type: "address",
        indexed: true,
        internalType: "address"
      },
      {
        name: "to",
        type: "address",
        indexed: false,
        internalType: "address"
      },
      {
        name: "amount",
        type: "uint256",
        indexed: false,
        internalType: "uint256"
      },
      {
        name: "minGasLimit",
        type: "uint32",
        indexed: false,
        internalType: "uint32"
      },
      {
        name: "extraData",
        type: "bytes",
        indexed: false,
        internalType: "bytes"
      }
    ],
    anonymous: false,
    signature: "0x56f66275d9ebc94b7d6895aa0d96a3783550d0183ba106408d387d19f2e877f1"
  },
  {
    name: "L2_STANDARD_BRIDGE",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        value: "0x4200000000000000000000000000000000000010",
        internalType: "contract IL2StandardBridge"
      }
    ],
    constant: true,
    signature: "0x21d12763",
    stateMutability: "view"
  },
  {
    name: "L2_STANDARD_BRIDGE_ADDRESS",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        value: "0x4200000000000000000000000000000000000010",
        internalType: "address"
      }
    ],
    constant: true,
    signature: "0x2cb7cb06",
    stateMutability: "view"
  },
  {
    name: "delegationFee",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "uint256",
        value: "2000000000000000",
        internalType: "uint256"
      }
    ],
    constant: true,
    signature: "0xc5f0a58f",
    stateMutability: "view"
  },
  {
    name: "owner",
    type: "function",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "address",
        value: "0xCe4750fDc02A07Eb0d99cA798CD5c170D8F8410A",
        internalType: "address"
      }
    ],
    constant: true,
    signature: "0x8da5cb5b",
    stateMutability: "view"
  },
  {
    name: "renounceOwnership",
    type: "function",
    inputs: [],
    outputs: [],
    signature: "0x715018a6",
    stateMutability: "nonpayable"
  },
  {
    name: "setDelegationFee",
    type: "function",
    inputs: [
      {
        name: "_delegationFee",
        type: "uint256",
        internalType: "uint256"
      }
    ],
    outputs: [],
    signature: "0x55bfc81c",
    stateMutability: "nonpayable"
  },
  {
    name: "transferOwnership",
    type: "function",
    inputs: [
      { name: "newOwner", type: "address", internalType: "address" }
    ],
    outputs: [],
    signature: "0xf2fde38b",
    stateMutability: "nonpayable"
  },
  {
    name: "withdraw",
    type: "function",
    inputs: [
      { name: "_l2Token", type: "address", internalType: "address" },
      { name: "_amount", type: "uint256", internalType: "uint256" },
      { name: "_minGasLimit", type: "uint32", internalType: "uint32" },
      { name: "_extraData", type: "bytes", internalType: "bytes" }
    ],
    outputs: [],
    payable: true,
    signature: "0x32b7006d",
    stateMutability: "payable"
  },
  {
    name: "withdrawFee",
    type: "function",
    inputs: [
      { name: "_recipient", type: "address", internalType: "address" }
    ],
    outputs: [],
    signature: "0x1ac3ddeb",
    stateMutability: "nonpayable"
  },
  {
    name: "withdrawFeeToL1",
    type: "function",
    inputs: [
      { name: "_recipient", type: "address", internalType: "address" },
      { name: "_minGasLimit", type: "uint32", internalType: "uint32" },
      { name: "_extraData", type: "bytes", internalType: "bytes" }
    ],
    outputs: [],
    signature: "0x244cafe0",
    stateMutability: "nonpayable"
  },
  {
    name: "withdrawTo",
    type: "function",
    inputs: [
      { name: "_l2Token", type: "address", internalType: "address" },
      { name: "_to", type: "address", internalType: "address" },
      { name: "_amount", type: "uint256", internalType: "uint256" },
      { name: "_minGasLimit", type: "uint32", internalType: "uint32" },
      { name: "_extraData", type: "bytes", internalType: "bytes" }
    ],
    outputs: [],
    payable: true,
    signature: "0xa3a79548",
    stateMutability: "payable"
  }
];
var ListaDaoAbi = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_account",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      }
    ],
    name: "ClaimAllWithdrawals",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_uuid",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      }
    ],
    name: "ClaimUndelegated",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_validator",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_uuid",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      }
    ],
    name: "ClaimUndelegatedFrom",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_account",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_idx",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      }
    ],
    name: "ClaimWithdrawal",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      }
    ],
    name: "Delegate",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "_validator",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "bool",
        name: "_delegateVotePower",
        type: "bool"
      }
    ],
    name: "DelegateTo",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "_delegateTo",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_votesChange",
        type: "uint256"
      }
    ],
    name: "DelegateVoteTo",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "_src",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      }
    ],
    name: "Deposit",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_address",
        type: "address"
      }
    ],
    name: "DisableValidator",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint8",
        name: "version",
        type: "uint8"
      }
    ],
    name: "Initialized",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address"
      }
    ],
    name: "Paused",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_address",
        type: "address"
      }
    ],
    name: "ProposeManager",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "_src",
        type: "address"
      },
      {
        indexed: false,
        internalType: "address",
        name: "_dest",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      }
    ],
    name: "ReDelegate",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_rewardsId",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      }
    ],
    name: "Redelegate",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_address",
        type: "address"
      }
    ],
    name: "RemoveValidator",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_account",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_amountInSlisBnb",
        type: "uint256"
      }
    ],
    name: "RequestWithdraw",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      }
    ],
    name: "RewardsCompounded",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32"
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "previousAdminRole",
        type: "bytes32"
      },
      {
        indexed: true,
        internalType: "bytes32",
        name: "newAdminRole",
        type: "bytes32"
      }
    ],
    name: "RoleAdminChanged",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32"
      },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address"
      }
    ],
    name: "RoleGranted",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bytes32",
        name: "role",
        type: "bytes32"
      },
      {
        indexed: true,
        internalType: "address",
        name: "account",
        type: "address"
      },
      {
        indexed: true,
        internalType: "address",
        name: "sender",
        type: "address"
      }
    ],
    name: "RoleRevoked",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_annualRate",
        type: "uint256"
      }
    ],
    name: "SetAnnualRate",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_address",
        type: "address"
      }
    ],
    name: "SetBSCValidator",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_address",
        type: "address"
      }
    ],
    name: "SetManager",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_minBnb",
        type: "uint256"
      }
    ],
    name: "SetMinBnb",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_address",
        type: "address"
      }
    ],
    name: "SetRedirectAddress",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      }
    ],
    name: "SetReserveAmount",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_address",
        type: "address"
      }
    ],
    name: "SetRevenuePool",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_synFee",
        type: "uint256"
      }
    ],
    name: "SetSynFee",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_validator",
        type: "address"
      },
      {
        indexed: false,
        internalType: "address",
        name: "_credit",
        type: "address"
      },
      {
        indexed: false,
        internalType: "bool",
        name: "toRemove",
        type: "bool"
      }
    ],
    name: "SyncCreditContract",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_nextUndelegatedRequestIndex",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_bnbAmount",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_shares",
        type: "uint256"
      }
    ],
    name: "Undelegate",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_operator",
        type: "address"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_bnbAmount",
        type: "uint256"
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "_shares",
        type: "uint256"
      }
    ],
    name: "UndelegateFrom",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "uint256",
        name: "_amount",
        type: "uint256"
      }
    ],
    name: "UndelegateReserve",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: "address",
        name: "account",
        type: "address"
      }
    ],
    name: "Unpaused",
    type: "event"
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "_address",
        type: "address"
      }
    ],
    name: "WhitelistValidator",
    type: "event"
  },
  {
    inputs: [],
    name: "BOT",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "DEFAULT_ADMIN_ROLE",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "GUARDIAN",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "TEN_DECIMALS",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "acceptNewManager",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "amountToDelegate",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "annualRate",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "_bnbAmount", type: "uint256" }
    ],
    name: "binarySearchCoveredMaxIndex",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_validator", type: "address" }
    ],
    name: "claimUndelegated",
    outputs: [
      { internalType: "uint256", name: "_uuid", type: "uint256" },
      { internalType: "uint256", name: "_amount", type: "uint256" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "_idx", type: "uint256" }],
    name: "claimWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_user", type: "address" },
      { internalType: "uint256", name: "_idx", type: "uint256" }
    ],
    name: "claimWithdrawFor",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "compoundRewards",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_operator", type: "address" },
      { internalType: "uint256", name: "_bnbAmount", type: "uint256" }
    ],
    name: "convertBnbToShares",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "_amount", type: "uint256" }],
    name: "convertBnbToSnBnb",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_operator", type: "address" },
      { internalType: "uint256", name: "_shares", type: "uint256" }
    ],
    name: "convertSharesToBnb",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amountInSlisBnb",
        type: "uint256"
      }
    ],
    name: "convertSnBnbToBnb",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "creditContracts",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "creditStates",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_validator", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" }
    ],
    name: "delegateTo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "delegateVotePower",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_delegateTo", type: "address" }
    ],
    name: "delegateVoteTo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [],
    name: "depositReserve",
    outputs: [],
    stateMutability: "payable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_address", type: "address" }
    ],
    name: "disableValidator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "getAmountToUndelegate",
    outputs: [
      {
        internalType: "uint256",
        name: "_amountToUndelegate",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "_uuid", type: "uint256" }],
    name: "getBotUndelegateRequest",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "startTime",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "endTime",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "amount",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "amountInSnBnb",
            type: "uint256"
          }
        ],
        internalType: "struct IStakeManager.BotUndelegateRequest",
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_validator", type: "address" }
    ],
    name: "getClaimableAmount",
    outputs: [
      { internalType: "uint256", name: "_amount", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getContracts",
    outputs: [
      { internalType: "address", name: "_manager", type: "address" },
      { internalType: "address", name: "_slisBnb", type: "address" },
      { internalType: "address", name: "_bscValidator", type: "address" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_validator", type: "address" }
    ],
    name: "getDelegated",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "_amount", type: "uint256" }],
    name: "getRedelegateFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "bytes32", name: "role", type: "bytes32" }],
    name: "getRoleAdmin",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getSlisBnbWithdrawLimit",
    outputs: [
      {
        internalType: "uint256",
        name: "_slisBnbWithdrawLimit",
        type: "uint256"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getTotalBnbInValidators",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "getTotalPooledBnb",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_user", type: "address" },
      { internalType: "uint256", name: "_idx", type: "uint256" }
    ],
    name: "getUserRequestStatus",
    outputs: [
      { internalType: "bool", name: "_isClaimable", type: "bool" },
      { internalType: "uint256", name: "_amount", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_address", type: "address" }
    ],
    name: "getUserWithdrawalRequests",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "uuid", type: "uint256" },
          {
            internalType: "uint256",
            name: "amountInSnBnb",
            type: "uint256"
          },
          {
            internalType: "uint256",
            name: "startTime",
            type: "uint256"
          }
        ],
        internalType: "struct IStakeManager.WithdrawalRequest[]",
        name: "",
        type: "tuple[]"
      }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bytes32", name: "role", type: "bytes32" },
      { internalType: "address", name: "account", type: "address" }
    ],
    name: "grantRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bytes32", name: "role", type: "bytes32" },
      { internalType: "address", name: "account", type: "address" }
    ],
    name: "hasRole",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_slisBnb", type: "address" },
      { internalType: "address", name: "_admin", type: "address" },
      { internalType: "address", name: "_manager", type: "address" },
      { internalType: "address", name: "_bot", type: "address" },
      { internalType: "uint256", name: "_synFee", type: "uint256" },
      { internalType: "address", name: "_revenuePool", type: "address" },
      { internalType: "address", name: "_validator", type: "address" }
    ],
    name: "initialize",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "minBnb",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "nextConfirmedRequestUUID",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "placeholder",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_address", type: "address" }
    ],
    name: "proposeNewManager",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "srcValidator", type: "address" },
      { internalType: "address", name: "dstValidator", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" }
    ],
    name: "redelegate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "redirectAddress",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_address", type: "address" }
    ],
    name: "removeValidator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bytes32", name: "role", type: "bytes32" },
      { internalType: "address", name: "account", type: "address" }
    ],
    name: "renounceRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    name: "requestIndexMap",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "requestUUID",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_amountInSlisBnb",
        type: "uint256"
      }
    ],
    name: "requestWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "reserveAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "revenuePool",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_address", type: "address" }
    ],
    name: "revokeBotRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bytes32", name: "role", type: "bytes32" },
      { internalType: "address", name: "account", type: "address" }
    ],
    name: "revokeRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "uint256", name: "_annualRate", type: "uint256" }
    ],
    name: "setAnnualRate",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_address", type: "address" }
    ],
    name: "setBSCValidator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_address", type: "address" }
    ],
    name: "setBotRole",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "_amount", type: "uint256" }],
    name: "setMinBnb",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_address", type: "address" }
    ],
    name: "setRedirectAddress",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "setReserveAmount",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_address", type: "address" }
    ],
    name: "setRevenuePool",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "_synFee", type: "uint256" }],
    name: "setSynFee",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bytes4", name: "interfaceId", type: "bytes4" }
    ],
    name: "supportsInterface",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "synFee",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "togglePause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "toggleVote",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "totalDelegated",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "totalReserveAmount",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "unbondingBnb",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "undelegate",
    outputs: [
      { internalType: "uint256", name: "_uuid", type: "uint256" },
      { internalType: "uint256", name: "_amount", type: "uint256" }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_operator", type: "address" },
      { internalType: "uint256", name: "_amount", type: "uint256" }
    ],
    name: "undelegateFrom",
    outputs: [
      {
        internalType: "uint256",
        name: "_actualBnbAmount",
        type: "uint256"
      }
    ],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [],
    name: "undelegatedQuota",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "validators",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "_address", type: "address" }
    ],
    name: "whitelistValidator",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "uint256", name: "amount", type: "uint256" }],
    name: "withdrawReserve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  { stateMutability: "payable", type: "receive" }
];

// src/actions/getBalance.ts
import {
  composeContext as composeContext3,
  elizaLogger as elizaLogger3,
  generateObjectDeprecated as generateObjectDeprecated3,
  ModelClass as ModelClass3
} from "@elizaos/core";
import { getToken as getToken2 } from "@lifi/sdk";
import { erc20Abi as erc20Abi3, formatEther as formatEther2, formatUnits as formatUnits3 } from "viem";
var GetBalanceAction = class {
  constructor(walletProvider) {
    this.walletProvider = walletProvider;
  }
  async getBalance(params) {
    elizaLogger3.debug("Get balance params:", params);
    await this.validateAndNormalizeParams(params);
    elizaLogger3.debug("Normalized get balance params:", params);
    const { chain, address, token } = params;
    if (!address) {
      throw new Error("Address is required for getting balance");
    }
    this.walletProvider.switchChain(chain);
    const nativeSymbol = this.walletProvider.getChainConfigs(chain).nativeCurrency.symbol;
    const chainId = this.walletProvider.getChainConfigs(chain).id;
    let queryNativeToken = false;
    if (!token || token === "" || token.toLowerCase() === "bnb" || token.toLowerCase() === "tbnb") {
      queryNativeToken = true;
    }
    const resp = {
      chain,
      address
    };
    if (!queryNativeToken) {
      let amount;
      if (token.startsWith("0x")) {
        amount = await this.getERC20TokenBalance(
          chain,
          address,
          token
        );
      } else {
        if (chainId !== 56) {
          throw new Error(
            "Only BSC mainnet is supported for querying balance by token symbol"
          );
        }
        this.walletProvider.configureLiFiSdk(chain);
        const tokenInfo = await getToken2(chainId, token);
        amount = await this.getERC20TokenBalance(
          chain,
          address,
          tokenInfo.address
        );
      }
      resp.balance = { token, amount };
    } else {
      const nativeBalanceWei = await this.walletProvider.getPublicClient(chain).getBalance({ address });
      resp.balance = {
        token: nativeSymbol,
        amount: formatEther2(nativeBalanceWei)
      };
    }
    return resp;
  }
  async getERC20TokenBalance(chain, address, tokenAddress) {
    const publicClient = this.walletProvider.getPublicClient(chain);
    const balance = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi3,
      functionName: "balanceOf",
      args: [address]
    });
    const decimals = await publicClient.readContract({
      address: tokenAddress,
      abi: erc20Abi3,
      functionName: "decimals"
    });
    return formatUnits3(balance, decimals);
  }
  async validateAndNormalizeParams(params) {
    if (!params.address) {
      params.address = this.walletProvider.getAddress();
    } else {
      params.address = await this.walletProvider.formatAddress(
        params.address
      );
    }
  }
};
var getBalanceAction = {
  name: "getBalance",
  description: "Get balance of a token or all tokens for the given address",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger3.log("Starting getBalance action...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    state.walletInfo = await bnbWalletProvider.get(
      runtime,
      message,
      currentState
    );
    const getBalanceContext = composeContext3({
      state: currentState,
      template: getBalanceTemplate
    });
    const content = await generateObjectDeprecated3({
      runtime,
      context: getBalanceContext,
      modelClass: ModelClass3.LARGE
    });
    const walletProvider = initWalletProvider(runtime);
    const action = new GetBalanceAction(walletProvider);
    const getBalanceOptions = {
      chain: content.chain,
      address: content.address,
      token: content.token
    };
    try {
      const getBalanceResp = await action.getBalance(getBalanceOptions);
      if (callback) {
        let text = `No balance found for ${getBalanceOptions.address} on ${getBalanceOptions.chain}`;
        if (getBalanceResp.balance) {
          text = `Balance of ${getBalanceResp.address} on ${getBalanceResp.chain}:
${getBalanceResp.balance.token}: ${getBalanceResp.balance.amount}`;
        }
        callback({
          text,
          content: { ...getBalanceResp }
        });
      }
      return true;
    } catch (error) {
      elizaLogger3.error("Error during get balance:", error.message);
      callback?.({
        text: `Get balance failed: ${error.message}`,
        content: { error: error.message }
      });
      return false;
    }
  },
  template: getBalanceTemplate,
  validate: async (_runtime) => {
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check my balance of USDC"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you check your balance of USDC",
          action: "GET_BALANCE",
          content: {
            chain: "bsc",
            address: "{{walletAddress}}",
            token: "USDC"
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check my balance of token 0x1234"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you check your balance of token 0x1234",
          action: "GET_BALANCE",
          content: {
            chain: "bsc",
            address: "{{walletAddress}}",
            token: "0x1234"
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Get USDC balance of 0x1234"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you check USDC balance of 0x1234",
          action: "GET_BALANCE",
          content: {
            chain: "bsc",
            address: "0x1234",
            token: "USDC"
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Check my wallet balance on BSC"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you check your wallet balance on BSC",
          action: "GET_BALANCE",
          content: {
            chain: "bsc",
            address: "{{walletAddress}}",
            token: void 0
          }
        }
      }
    ]
  ],
  similes: ["GET_BALANCE", "CHECK_BALANCE"]
};

// src/actions/bridge.ts
import {
  composeContext as composeContext4,
  elizaLogger as elizaLogger4,
  generateObjectDeprecated as generateObjectDeprecated4,
  ModelClass as ModelClass4
} from "@elizaos/core";
import { parseEther as parseEther3, getContract, parseUnits as parseUnits2, erc20Abi as erc20Abi4 } from "viem";
var BridgeAction = class {
  constructor(walletProvider) {
    this.walletProvider = walletProvider;
  }
  L1_BRIDGE_ADDRESS = "0xF05F0e4362859c3331Cb9395CBC201E3Fa6757Ea";
  L2_BRIDGE_ADDRESS = "0x4000698e3De52120DE28181BaACda82B21568416";
  LEGACY_ERC20_ETH = "0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000";
  async bridge(params) {
    elizaLogger4.debug("Bridge params:", params);
    await this.validateAndNormalizeParams(params);
    elizaLogger4.debug("Normalized bridge params:", params);
    const fromAddress = this.walletProvider.getAddress();
    this.walletProvider.switchChain(params.fromChain);
    const walletClient = this.walletProvider.getWalletClient(
      params.fromChain
    );
    const publicClient = this.walletProvider.getPublicClient(
      params.fromChain
    );
    const nativeToken = this.walletProvider.chains[params.fromChain].nativeCurrency.symbol;
    const resp = {
      fromChain: params.fromChain,
      toChain: params.toChain,
      txHash: "0x",
      recipient: params.toAddress ?? fromAddress,
      amount: params.amount,
      fromToken: params.fromToken ?? nativeToken,
      toToken: params.toToken ?? nativeToken
    };
    const account = this.walletProvider.getAccount();
    const chain = this.walletProvider.getChainConfigs(params.fromChain);
    const selfBridge = !params.toAddress || params.toAddress === fromAddress;
    const nativeTokenBridge = !params.fromToken || params.fromToken === nativeToken;
    let amount;
    if (nativeTokenBridge) {
      amount = parseEther3(params.amount);
    } else {
      const decimals = await publicClient.readContract({
        address: params.fromToken,
        abi: erc20Abi4,
        functionName: "decimals"
      });
      amount = parseUnits2(params.amount, decimals);
    }
    if (params.fromChain === "bsc" && params.toChain === "opBNB") {
      const l1BridgeContract = getContract({
        address: this.L1_BRIDGE_ADDRESS,
        abi: L1StandardBridgeAbi,
        client: {
          public: publicClient,
          wallet: walletClient
        }
      });
      if (!nativeTokenBridge) {
        const allowance = await this.walletProvider.checkERC20Allowance(
          params.fromChain,
          params.fromToken,
          fromAddress,
          this.L1_BRIDGE_ADDRESS
        );
        if (allowance < amount) {
          elizaLogger4.log(
            `Increasing ERC20 allowance for L1 bridge. ${amount - allowance} more needed`
          );
          const txHash = await this.walletProvider.approveERC20(
            params.fromChain,
            params.fromToken,
            this.L1_BRIDGE_ADDRESS,
            amount
          );
          await publicClient.waitForTransactionReceipt({
            hash: txHash
          });
        }
      }
      if (selfBridge && nativeTokenBridge) {
        const args = [1, "0x"];
        await l1BridgeContract.simulate.depositETH(args, {
          value: amount
        });
        resp.txHash = await l1BridgeContract.write.depositETH(args, {
          account,
          chain,
          value: amount
        });
      } else if (selfBridge && !nativeTokenBridge) {
        const args = [
          params.fromToken,
          params.toToken,
          amount,
          1,
          "0x"
        ];
        await l1BridgeContract.simulate.depositERC20(args, {
          account
        });
        resp.txHash = await l1BridgeContract.write.depositERC20(args, {
          account,
          chain
        });
      } else if (!selfBridge && nativeTokenBridge) {
        const args = [params.toAddress, 1, "0x"];
        await l1BridgeContract.simulate.depositETHTo(args, {
          value: amount
        });
        resp.txHash = await l1BridgeContract.write.depositETHTo(args, {
          account,
          chain,
          value: amount
        });
      } else {
        const args = [
          params.fromToken,
          params.toToken,
          params.toAddress,
          amount,
          1,
          "0x"
        ];
        await l1BridgeContract.simulate.depositERC20To(args, {
          account
        });
        resp.txHash = await l1BridgeContract.write.depositERC20To(
          args,
          {
            account,
            chain
          }
        );
      }
    } else if (params.fromChain === "opBNB" && params.toChain === "bsc") {
      const l2BridgeContract = getContract({
        address: this.L2_BRIDGE_ADDRESS,
        abi: L2StandardBridgeAbi,
        client: {
          public: publicClient,
          wallet: walletClient
        }
      });
      const delegationFee = await publicClient.readContract({
        address: this.L2_BRIDGE_ADDRESS,
        abi: L2StandardBridgeAbi,
        functionName: "delegationFee"
      });
      if (!nativeTokenBridge) {
        const allowance = await this.walletProvider.checkERC20Allowance(
          params.fromChain,
          params.fromToken,
          fromAddress,
          this.L2_BRIDGE_ADDRESS
        );
        if (allowance < amount) {
          elizaLogger4.log(
            `Increasing ERC20 allowance for L2 bridge. ${amount - allowance} more needed`
          );
          const txHash = await this.walletProvider.approveERC20(
            params.fromChain,
            params.fromToken,
            this.L2_BRIDGE_ADDRESS,
            amount
          );
          await publicClient.waitForTransactionReceipt({
            hash: txHash
          });
        }
      }
      if (selfBridge && nativeTokenBridge) {
        const args = [this.LEGACY_ERC20_ETH, amount, 1, "0x"];
        const value = amount + delegationFee;
        await l2BridgeContract.simulate.withdraw(args, { value });
        resp.txHash = await l2BridgeContract.write.withdraw(args, {
          account,
          chain,
          value
        });
      } else if (selfBridge && !nativeTokenBridge) {
        const args = [params.fromToken, amount, 1, "0x"];
        const value = delegationFee;
        await l2BridgeContract.simulate.withdraw(args, {
          account,
          value
        });
        resp.txHash = await l2BridgeContract.write.withdraw(args, {
          account,
          chain,
          value
        });
      } else if (!selfBridge && nativeTokenBridge) {
        const args = [
          this.LEGACY_ERC20_ETH,
          params.toAddress,
          amount,
          1,
          "0x"
        ];
        const value = amount + delegationFee;
        await l2BridgeContract.simulate.withdrawTo(args, { value });
        resp.txHash = await l2BridgeContract.write.withdrawTo(args, {
          account,
          chain,
          value
        });
      } else {
        const args = [
          params.fromToken,
          params.toAddress,
          amount,
          1,
          "0x"
        ];
        const value = delegationFee;
        await l2BridgeContract.simulate.withdrawTo(args, {
          account,
          value
        });
        resp.txHash = await l2BridgeContract.write.withdrawTo(args, {
          account,
          chain,
          value
        });
      }
    } else {
      throw new Error("Unsupported bridge direction");
    }
    if (!resp.txHash || resp.txHash === "0x") {
      throw new Error("Get transaction hash failed");
    }
    await publicClient.waitForTransactionReceipt({
      hash: resp.txHash
    });
    return resp;
  }
  async validateAndNormalizeParams(params) {
    if (!params.toAddress) {
      params.toAddress = this.walletProvider.getAddress();
    } else {
      params.toAddress = await this.walletProvider.formatAddress(
        params.toAddress
      );
    }
    if (params.fromChain === "bsc" && params.toChain === "opBNB") {
      if (params.fromToken && !params.toToken) {
        throw new Error(
          "token address on opBNB is required when bridging ERC20 from BSC to opBNB"
        );
      }
    }
  }
};
var bridgeAction = {
  name: "bridge",
  description: "Bridge tokens between BSC and opBNB",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger4.log("Starting bridge action...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    state.walletInfo = await bnbWalletProvider.get(runtime, message, currentState);
    const bridgeContext = composeContext4({
      state: currentState,
      template: bridgeTemplate
    });
    const content = await generateObjectDeprecated4({
      runtime,
      context: bridgeContext,
      modelClass: ModelClass4.LARGE
    });
    const walletProvider = initWalletProvider(runtime);
    const action = new BridgeAction(walletProvider);
    const paramOptions = {
      fromChain: content.fromChain,
      toChain: content.toChain,
      fromToken: content.fromToken,
      toToken: content.toToken,
      amount: content.amount,
      toAddress: content.toAddress
    };
    try {
      const bridgeResp = await action.bridge(paramOptions);
      callback?.({
        text: `Successfully bridged ${bridgeResp.amount} ${bridgeResp.fromToken} from ${bridgeResp.fromChain} to ${bridgeResp.toChain}
Transaction Hash: ${bridgeResp.txHash}`,
        content: { ...bridgeResp }
      });
      return true;
    } catch (error) {
      elizaLogger4.error("Error during token bridge:", error.message);
      callback?.({
        text: `Bridge failed: ${error.message}`,
        content: { error: error.message }
      });
      return false;
    }
  },
  template: bridgeTemplate,
  validate: async (runtime) => {
    const privateKey = runtime.getSetting("BNB_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Deposit 1 BNB from BSC to opBNB"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you bridge 1 BNB from BSC to opBNB",
          action: "BRIDGE",
          content: {
            fromChain: "bsc",
            toChain: "opBNB",
            fromToken: void 0,
            toToken: void 0,
            amount: 1
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Transfer 1 BNB from BSC to address 0x1234 on opBNB"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you bridge 1 BNB from BSC to address 0x1234 on opBNB",
          action: "BRIDGE",
          content: {
            fromChain: "bsc",
            toChain: "opBNB",
            fromToken: void 0,
            toToken: void 0,
            amount: 1,
            toAddress: "0x1234"
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Deposit 1 0x123 token from BSC to address 0x456 on opBNB. The corresponding token address on opBNB is 0x789"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you bridge 1 0x123 token from BSC to address 0x456 on opBNB",
          action: "BRIDGE",
          content: {
            fromChain: "bsc",
            toChain: "opBNB",
            fromToken: "0x123",
            toToken: "0x789",
            amount: 1,
            toAddress: "0x456"
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Withdraw 1 BNB from opBNB to BSC"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you bridge 1 BNB from opBNB to BSC",
          action: "BRIDGE",
          content: {
            fromChain: "opBNB",
            toChain: "bsc",
            fromToken: void 0,
            toToken: void 0,
            amount: 1
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Withdraw 1 0x1234 token from opBNB to address 0x5678 on BSC"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you bridge 1 0x1234 token from opBNB to address 0x5678 on BSC",
          action: "BRIDGE",
          content: {
            fromChain: "opBNB",
            toChain: "bsc",
            fromToken: "0x1234",
            toToken: void 0,
            amount: 1,
            toAddress: "0x5678"
          }
        }
      }
    ]
  ],
  similes: ["BRIDGE", "TOKEN_BRIDGE", "DEPOSIT", "WITHDRAW"]
};

// src/actions/stake.ts
import {
  composeContext as composeContext5,
  elizaLogger as elizaLogger5,
  generateObjectDeprecated as generateObjectDeprecated5,
  ModelClass as ModelClass5
} from "@elizaos/core";
import { formatEther as formatEther3, parseEther as parseEther4, erc20Abi as erc20Abi5 } from "viem";
var StakeAction = class {
  constructor(walletProvider) {
    this.walletProvider = walletProvider;
  }
  LISTA_DAO = "0x1adB950d8bB3dA4bE104211D5AB038628e477fE6";
  SLIS_BNB = "0xB0b84D294e0C75A6abe60171b70edEb2EFd14A1B";
  async stake(params) {
    elizaLogger5.debug("Stake params:", params);
    this.validateStakeParams(params);
    elizaLogger5.debug("Normalized stake params:", params);
    this.walletProvider.switchChain("bsc");
    const actions = {
      deposit: async () => {
        if (!params.amount) {
          throw new Error("Amount is required for deposit");
        }
        return await this.doDeposit(params.amount);
      },
      withdraw: async () => await this.doWithdraw(params.amount),
      claim: async () => await this.doClaim()
    };
    const resp = await actions[params.action]();
    return { response: resp };
  }
  validateStakeParams(params) {
    if (params.chain !== "bsc") {
      throw new Error("Only BSC mainnet is supported");
    }
    if (params.action === "deposit" && !params.amount) {
      throw new Error("Amount is required for deposit");
    }
    if (params.action === "withdraw" && !params.amount) {
      throw new Error("Amount is required for withdraw");
    }
  }
  async doDeposit(amount) {
    const publicClient = this.walletProvider.getPublicClient("bsc");
    const walletClient = this.walletProvider.getWalletClient("bsc");
    const account = walletClient.account;
    if (!account) {
      throw new Error("Wallet account not found");
    }
    const { request } = await publicClient.simulateContract({
      account: this.walletProvider.getAccount(),
      address: this.LISTA_DAO,
      abi: ListaDaoAbi,
      functionName: "deposit",
      value: parseEther4(amount)
    });
    const txHash = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({
      hash: txHash
    });
    const slisBNBBalance = await publicClient.readContract({
      address: this.SLIS_BNB,
      abi: erc20Abi5,
      functionName: "balanceOf",
      args: [account.address]
    });
    return `Successfully do deposit. ${formatEther3(slisBNBBalance)} slisBNB held. 
Transaction Hash: ${txHash}`;
  }
  async doWithdraw(amount) {
    const publicClient = this.walletProvider.getPublicClient("bsc");
    const walletClient = this.walletProvider.getWalletClient("bsc");
    const account = walletClient.account;
    if (!account) {
      throw new Error("Wallet account not found");
    }
    let amountToWithdraw;
    if (!amount) {
      amountToWithdraw = await publicClient.readContract({
        address: this.SLIS_BNB,
        abi: erc20Abi5,
        functionName: "balanceOf",
        args: [account.address]
      });
    } else {
      amountToWithdraw = parseEther4(amount);
    }
    const allowance = await this.walletProvider.checkERC20Allowance(
      "bsc",
      this.SLIS_BNB,
      account.address,
      this.LISTA_DAO
    );
    if (allowance < amountToWithdraw) {
      elizaLogger5.log(
        `Increasing slisBNB allowance for Lista DAO. ${amountToWithdraw - allowance} more needed`
      );
      const txHash2 = await this.walletProvider.approveERC20(
        "bsc",
        this.SLIS_BNB,
        this.LISTA_DAO,
        amountToWithdraw
      );
      await publicClient.waitForTransactionReceipt({
        hash: txHash2
      });
    }
    const { request } = await publicClient.simulateContract({
      account: this.walletProvider.getAccount(),
      address: this.LISTA_DAO,
      abi: ListaDaoAbi,
      functionName: "requestWithdraw",
      args: [amountToWithdraw]
    });
    const txHash = await walletClient.writeContract(request);
    await publicClient.waitForTransactionReceipt({
      hash: txHash
    });
    const slisBNBBalance = await publicClient.readContract({
      address: this.SLIS_BNB,
      abi: erc20Abi5,
      functionName: "balanceOf",
      args: [account.address]
    });
    return `Successfully do withdraw. ${formatEther3(slisBNBBalance)} slisBNB left. 
Transaction Hash: ${txHash}`;
  }
  async doClaim() {
    const publicClient = this.walletProvider.getPublicClient("bsc");
    const walletClient = this.walletProvider.getWalletClient("bsc");
    const account = walletClient.account;
    if (!account) {
      throw new Error("Wallet account not found");
    }
    const requests = await publicClient.readContract({
      address: this.LISTA_DAO,
      abi: ListaDaoAbi,
      functionName: "getUserWithdrawalRequests",
      args: [account.address]
    });
    let totalClaimed = 0n;
    for (let idx = 0; idx < requests.length; idx++) {
      const [isClaimable, amount] = await publicClient.readContract({
        address: this.LISTA_DAO,
        abi: ListaDaoAbi,
        functionName: "getUserRequestStatus",
        args: [account.address, BigInt(idx)]
      });
      if (isClaimable) {
        const { request } = await publicClient.simulateContract({
          account: this.walletProvider.getAccount(),
          address: this.LISTA_DAO,
          abi: ListaDaoAbi,
          functionName: "claimWithdraw",
          args: [BigInt(idx)]
        });
        const txHash = await walletClient.writeContract(request);
        await publicClient.waitForTransactionReceipt({
          hash: txHash
        });
        totalClaimed += amount;
      } else {
        break;
      }
    }
    return `Successfully do claim. ${formatEther3(totalClaimed)} BNB claimed.`;
  }
};
var stakeAction = {
  name: "stake",
  description: "Stake related actions through Lista DAO",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger5.log("Starting stake action...");
    if (!(message.content.source === "direct")) {
      callback?.({
        text: "I can't do that for you.",
        content: { error: "Stake not allowed" }
      });
      return false;
    }
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    state.walletInfo = await bnbWalletProvider.get(
      runtime,
      message,
      currentState
    );
    const stakeContext = composeContext5({
      state: currentState,
      template: stakeTemplate
    });
    const content = await generateObjectDeprecated5({
      runtime,
      context: stakeContext,
      modelClass: ModelClass5.LARGE
    });
    const walletProvider = initWalletProvider(runtime);
    const action = new StakeAction(walletProvider);
    const paramOptions = {
      chain: content.chain,
      action: content.action,
      amount: content.amount
    };
    try {
      const stakeResp = await action.stake(paramOptions);
      callback?.({
        text: stakeResp.response,
        content: { ...stakeResp }
      });
      return true;
    } catch (error) {
      elizaLogger5.error("Error during stake:", error.message);
      callback?.({
        text: `Stake failed: ${error.message}`,
        content: { error: error.message }
      });
      return false;
    }
  },
  template: stakeTemplate,
  validate: async (runtime) => {
    const privateKey = runtime.getSetting("BNB_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Stake 1 BNB on BSC"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you stake 1 BNB to Lista DAO on BSC",
          action: "STAKE",
          content: {
            action: "deposit",
            amount: "1"
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Deposit 1 BNB to Lista DAO"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you deposit 1 BNB to Lista DAO on BSC",
          action: "STAKE",
          content: {
            action: "deposit",
            amount: "1"
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Undelegate 1 slisBNB on BSC"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you undelegate 1 slisBNB from Lista DAO on BSC",
          action: "STAKE",
          content: {
            action: "withdraw",
            amount: "1"
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Withdraw 1 slisBNB from Lista DAO"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you withdraw 1 slisBNB from Lista DAO on BSC",
          action: "STAKE",
          content: {
            action: "withdraw",
            amount: "1"
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Claim unlocked BNB from Lista DAO"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll help you claim unlocked BNB from Lista DAO on BSC",
          action: "STAKE",
          content: {
            action: "claim"
          }
        }
      }
    ]
  ],
  similes: [
    "DELEGATE",
    "STAKE",
    "DEPOSIT",
    "UNDELEGATE",
    "UNSTAKE",
    "WITHDRAW",
    "CLAIM"
  ]
};

// src/actions/faucet.ts
import {
  composeContext as composeContext6,
  elizaLogger as elizaLogger6,
  generateObjectDeprecated as generateObjectDeprecated6,
  ModelClass as ModelClass6
} from "@elizaos/core";
import WebSocket from "ws";
var FaucetAction = class {
  constructor(walletProvider) {
    this.walletProvider = walletProvider;
  }
  SUPPORTED_TOKENS = [
    "BNB",
    "BTC",
    "BUSD",
    "DAI",
    "ETH",
    "USDC"
  ];
  FAUCET_URL = "wss://testnet.bnbchain.org/faucet-smart/api";
  async faucet(params) {
    elizaLogger6.debug("Faucet params:", params);
    await this.validateAndNormalizeParams(params);
    elizaLogger6.debug("Normalized faucet params:", params);
    if (!params.token || !params.toAddress) {
      throw new Error("Token and address are required for faucet");
    }
    const resp = {
      token: params.token,
      recipient: params.toAddress,
      txHash: "0x"
    };
    const options = {
      headers: {
        Connection: "Upgrade",
        Upgrade: "websocket"
      }
    };
    const ws = new WebSocket(this.FAUCET_URL, options);
    try {
      await new Promise((resolve, reject) => {
        ws.once("open", () => resolve());
        ws.once("error", reject);
      });
      const message = {
        tier: 0,
        url: params.toAddress,
        symbol: params.token,
        captcha: "noCaptchaToken"
      };
      ws.send(JSON.stringify(message));
      const txHash = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error("Faucet request timeout"));
        }, 15e3);
        ws.on("message", (data) => {
          const response = JSON.parse(data.toString());
          if (response.success) {
            return;
          }
          if (response.requests?.length > 0) {
            const txHash2 = response.requests[0].tx.hash;
            if (txHash2) {
              clearTimeout(timeout);
              resolve(txHash2);
            }
          }
          if (response.error) {
            clearTimeout(timeout);
            reject(new Error(response.error));
          }
        });
        ws.on("error", (error) => {
          clearTimeout(timeout);
          reject(
            new Error(`WebSocket error occurred: ${error.message}`)
          );
        });
      });
      resp.txHash = txHash;
      return resp;
    } finally {
      ws.close();
    }
  }
  async validateAndNormalizeParams(params) {
    if (!params.toAddress) {
      params.toAddress = this.walletProvider.getAddress();
    } else {
      params.toAddress = await this.walletProvider.formatAddress(
        params.toAddress
      );
    }
    if (!params.token) {
      params.token = "BNB";
    }
    if (!this.SUPPORTED_TOKENS.includes(params.token)) {
      throw new Error("Unsupported token");
    }
  }
};
var faucetAction = {
  name: "faucet",
  description: "Get test tokens from the faucet",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger6.log("Starting faucet action...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    state.walletInfo = await bnbWalletProvider.get(
      runtime,
      message,
      currentState
    );
    const faucetContext = composeContext6({
      state: currentState,
      template: faucetTemplate
    });
    const content = await generateObjectDeprecated6({
      runtime,
      context: faucetContext,
      modelClass: ModelClass6.LARGE
    });
    const walletProvider = initWalletProvider(runtime);
    const action = new FaucetAction(walletProvider);
    const paramOptions = {
      token: content.token,
      toAddress: content.toAddress
    };
    try {
      const faucetResp = await action.faucet(paramOptions);
      callback?.({
        text: `Successfully transferred ${faucetResp.token} to ${faucetResp.recipient}
Transaction Hash: ${faucetResp.txHash}`,
        content: {
          hash: faucetResp.txHash,
          recipient: faucetResp.recipient,
          chain: content.chain
        }
      });
      return true;
    } catch (error) {
      elizaLogger6.error("Error during faucet:", error.message);
      callback?.({
        text: `Get test tokens failed: ${error.message}`,
        content: { error: error.message }
      });
      return false;
    }
  },
  template: faucetTemplate,
  validate: async (_runtime) => {
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Get some USDC from the faucet"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Sure, I'll request some USDC from the faucet on BSC Testnet now.",
          action: "FAUCET",
          content: {
            token: "USDC",
            toAddress: "{{walletAddress}}"
          }
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Get some test tokens from the faucet on BSC Testnet"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Of course, getting tBNB from the faucet on BSC Testnet now.",
          action: "FAUCET",
          content: {
            token: "BNB",
            toAddress: "{{walletAddress}}"
          }
        }
      }
    ]
  ],
  similes: ["FAUCET", "GET_TEST_TOKENS"]
};

// src/actions/deploy.ts
import {
  composeContext as composeContext7,
  elizaLogger as elizaLogger8,
  generateObjectDeprecated as generateObjectDeprecated7,
  ModelClass as ModelClass7
} from "@elizaos/core";
import solc2 from "solc";
import { parseUnits as parseUnits3 } from "viem";

// src/utils/contracts.ts
import { elizaLogger as elizaLogger7 } from "@elizaos/core";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import solc from "solc";
var require2 = createRequire(import.meta.url);
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var baseDir = path.resolve(__dirname, "../../plugin-bnb/src/contracts");
function getContractSource(contractPath) {
  return fs.readFileSync(contractPath, "utf8");
}
function findImports(importPath) {
  try {
    if (importPath.startsWith("@openzeppelin/")) {
      const modPath = require2.resolve(importPath);
      return { contents: fs.readFileSync(modPath, "utf8") };
    }
    const localPath = path.resolve("./contracts", importPath);
    if (fs.existsSync(localPath)) {
      return { contents: fs.readFileSync(localPath, "utf8") };
    }
    return { error: "File not found" };
  } catch {
    return { error: `File not found: ${importPath}` };
  }
}
async function compileSolidity(contractFileName) {
  const contractPath = path.join(baseDir, `${contractFileName}.sol`);
  const source = getContractSource(contractPath);
  const input = {
    language: "Solidity",
    sources: {
      [contractFileName]: {
        content: source
      }
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      outputSelection: {
        "*": {
          "*": ["*"]
        }
      }
    }
  };
  elizaLogger7.debug("Compiling contract...");
  try {
    const output = JSON.parse(
      solc.compile(JSON.stringify(input), { import: findImports })
    );
    if (output.errors) {
      const hasError = output.errors.some(
        (error) => error.type === "Error"
      );
      if (hasError) {
        throw new Error(
          `Compilation errors: ${JSON.stringify(output.errors, null, 2)}`
        );
      }
      elizaLogger7.warn("Compilation warnings:", output.errors);
    }
    const contractName = path.basename(contractFileName, ".sol");
    const contract = output.contracts[contractFileName][contractName];
    if (!contract) {
      throw new Error("Contract compilation result is empty");
    }
    elizaLogger7.debug("Contract compiled successfully");
    return {
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object
    };
  } catch (error) {
    elizaLogger7.error("Compilation failed:", error.message);
    throw error;
  }
}

// src/actions/deploy.ts
var DeployAction = class {
  constructor(walletProvider) {
    this.walletProvider = walletProvider;
  }
  async compileSolidity(contractName, source) {
    const solName = `${contractName}.sol`;
    const input = {
      language: "Solidity",
      sources: {
        [solName]: {
          content: source
        }
      },
      settings: {
        outputSelection: {
          "*": {
            "*": ["*"]
          }
        }
      }
    };
    elizaLogger8.debug("Compiling contract...");
    const output = JSON.parse(solc2.compile(JSON.stringify(input)));
    if (output.errors) {
      const hasError = output.errors.some(
        (error) => error.type === "Error"
      );
      if (hasError) {
        elizaLogger8.error(
          `Compilation errors: ${JSON.stringify(output.errors, null, 2)}`
        );
      }
    }
    const contract = output.contracts[solName][contractName];
    if (!contract) {
      elizaLogger8.error("Compilation result is empty");
    }
    elizaLogger8.debug("Contract compiled successfully");
    return {
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object
    };
  }
  async deployERC20(deployTokenParams) {
    elizaLogger8.debug("deployTokenParams", deployTokenParams);
    const { name, symbol, decimals, totalSupply, chain } = deployTokenParams;
    if (!name || name === "") {
      throw new Error("Token name is required");
    }
    if (!symbol || symbol === "") {
      throw new Error("Token symbol is required");
    }
    if (!decimals || decimals === 0) {
      throw new Error("Token decimals is required");
    }
    if (!totalSupply || totalSupply === "") {
      throw new Error("Token total supply is required");
    }
    try {
      const totalSupplyWithDecimals = parseUnits3(totalSupply, decimals);
      const args = [name, symbol, decimals, totalSupplyWithDecimals];
      const contractAddress = await this.deployContract(
        chain,
        "ERC20Contract",
        args
      );
      return {
        address: contractAddress
      };
    } catch (error) {
      elizaLogger8.error("Depoly ERC20 failed:", error.message);
      throw error;
    }
  }
  async deployERC721(deployNftParams) {
    elizaLogger8.debug("deployNftParams", deployNftParams);
    const { baseURI, name, symbol, chain } = deployNftParams;
    if (!name || name === "") {
      throw new Error("Token name is required");
    }
    if (!symbol || symbol === "") {
      throw new Error("Token symbol is required");
    }
    if (!baseURI || baseURI === "") {
      throw new Error("Token baseURI is required");
    }
    try {
      const args = [name, symbol, baseURI];
      const contractAddress = await this.deployContract(
        chain,
        "ERC721Contract",
        args
      );
      return {
        address: contractAddress
      };
    } catch (error) {
      elizaLogger8.error("Depoly ERC721 failed:", error.message);
      throw error;
    }
  }
  async deployERC1155(deploy1155Params) {
    elizaLogger8.debug("deploy1155Params", deploy1155Params);
    const { baseURI, name, chain } = deploy1155Params;
    if (!name || name === "") {
      throw new Error("Token name is required");
    }
    if (!baseURI || baseURI === "") {
      throw new Error("Token baseURI is required");
    }
    try {
      const args = [name, baseURI];
      const contractAddress = await this.deployContract(
        chain,
        "ERC1155Contract",
        args
      );
      return {
        address: contractAddress
      };
    } catch (error) {
      elizaLogger8.error("Depoly ERC1155 failed:", error.message);
      throw error;
    }
  }
  async deployContract(chain, contractName, args) {
    const { abi, bytecode } = await compileSolidity(contractName);
    if (!bytecode) {
      throw new Error("Bytecode is empty after compilation");
    }
    this.walletProvider.switchChain(chain);
    const chainConfig = this.walletProvider.getChainConfigs(chain);
    const walletClient = this.walletProvider.getWalletClient(chain);
    const hash = await walletClient.deployContract({
      account: this.walletProvider.getAccount(),
      abi,
      bytecode,
      args,
      chain: chainConfig
    });
    elizaLogger8.debug("Waiting for deployment transaction...", hash);
    const publicClient = this.walletProvider.getPublicClient(chain);
    const receipt = await publicClient.waitForTransactionReceipt({
      hash
    });
    elizaLogger8.debug("Contract deployed successfully!");
    return receipt.contractAddress;
  }
};
var deployAction = {
  name: "DEPLOY_TOKEN",
  description: "Deploy token contracts (ERC20/721/1155) based on user specifications",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger8.log("Starting deploy action...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    state.walletInfo = await bnbWalletProvider.get(runtime, message, currentState);
    const context = composeContext7({
      state: currentState,
      template: ercContractTemplate
    });
    const content = await generateObjectDeprecated7({
      runtime,
      context,
      modelClass: ModelClass7.LARGE
    });
    const walletProvider = initWalletProvider(runtime);
    const action = new DeployAction(walletProvider);
    try {
      const contractType = content.contractType;
      let result;
      switch (contractType.toLocaleLowerCase()) {
        case "erc20":
          result = await action.deployERC20({
            chain: content.chain,
            decimals: content.decimals,
            symbol: content.symbol,
            name: content.name,
            totalSupply: content.totalSupply
          });
          break;
        case "erc721":
          result = await action.deployERC721({
            chain: content.chain,
            name: content.name,
            symbol: content.symbol,
            baseURI: content.baseURI
          });
          break;
        case "erc1155":
          result = await action.deployERC1155({
            chain: content.chain,
            name: content.name,
            baseURI: content.baseURI
          });
          break;
      }
      if (result) {
        callback?.({
          text: `Successfully create contract - ${result?.address}`,
          content: { ...result }
        });
      } else {
        callback?.({
          text: "Unsuccessfully create contract",
          content: { ...result }
        });
      }
      return true;
    } catch (error) {
      elizaLogger8.error("Error during deploy:", error.message);
      callback?.({
        text: `Deploy failed: ${error.message}`,
        content: { error: error.message }
      });
      return false;
    }
  },
  template: ercContractTemplate,
  validate: async (_runtime) => {
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "deploy an ERC20 token with name 'MyToken', symbol 'MTK', decimals 18, total supply 10000",
          action: "DEPLOY_TOKEN"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Deploy an ERC721 NFT contract with name 'MyNFT', symbol 'MNFT', baseURI 'https://my-nft-base-uri.com'",
          action: "DEPLOY_TOKEN"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Deploy an ERC1155 contract with name 'My1155', baseURI 'https://my-1155-base-uri.com'",
          action: "DEPLOY_TOKEN"
        }
      }
    ]
  ],
  similes: [
    "DEPLOY_ERC20",
    "DEPLOY_ERC721",
    "DEPLOY_ERC1155",
    "CREATE_TOKEN",
    "CREATE_NFT",
    "CREATE_1155"
  ]
};

// src/index.ts
var bnbPlugin = {
  name: "bnb",
  description: "BNB Smart Chain (BSC) and opBNB integration plugin supporting transfers, swaps, staking, bridging, and token deployments",
  providers: [bnbWalletProvider],
  evaluators: [],
  services: [],
  actions: [
    getBalanceAction,
    transferAction,
    swapAction,
    bridgeAction,
    stakeAction,
    faucetAction,
    deployAction
  ]
};
var index_default = bnbPlugin;
export {
  L1StandardBridgeAbi,
  L2StandardBridgeAbi,
  ListaDaoAbi,
  SwapAction,
  TransferAction,
  WalletProvider,
  bnbPlugin,
  bnbWalletProvider,
  index_default as default,
  initWalletProvider,
  swapAction,
  swapTemplate,
  transferAction,
  transferTemplate
};
//# sourceMappingURL=index.js.map