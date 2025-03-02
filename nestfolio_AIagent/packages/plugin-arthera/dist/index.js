// src/actions/transfer.ts
import { formatEther, parseEther } from "viem";
import {
  composeContext,
  generateObjectDeprecated,
  ModelClass
} from "@elizaos/core";

// src/providers/wallet.ts
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as viemChains from "viem/chains";
var WalletProvider = class {
  currentChain = "arthera";
  chains = { arthera: viemChains.arthera };
  account;
  constructor(privateKey, chains) {
    this.setAccount(privateKey);
    this.setChains(chains);
    if (chains && Object.keys(chains).length > 0) {
      this.setCurrentChain(Object.keys(chains)[0]);
    }
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
  async getWalletBalance() {
    try {
      const client = this.getPublicClient(this.currentChain);
      const balance = await client.getBalance({
        address: this.account.address
      });
      return formatUnits(balance, 18);
    } catch (error) {
      console.error("Error getting wallet balance:", error);
      return null;
    }
  }
  async getWalletBalanceForChain(chainName) {
    try {
      const client = this.getPublicClient(chainName);
      const balance = await client.getBalance({
        address: this.account.address
      });
      return formatUnits(balance, 18);
    } catch (error) {
      console.error("Error getting wallet balance:", error);
      return null;
    }
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
  const chainNames = ["arthera"];
  const chains = {};
  for (const chainName of chainNames) {
    const rpcUrl = runtime.getSetting(
      `ETHEREUM_PROVIDER_${chainName.toUpperCase()}`
    );
    const chain = WalletProvider.genChainFromName(chainName, rpcUrl);
    chains[chainName] = chain;
  }
  return chains;
};
var initWalletProvider = (runtime) => {
  const privateKey = runtime.getSetting("ARTHERA_PRIVATE_KEY");
  if (!privateKey) {
    throw new Error("ARTHERA_PRIVATE_KEY is missing");
  }
  const chains = genChainsFromRuntime(runtime);
  return new WalletProvider(privateKey, chains);
};
var artheraWalletProvider = {
  async get(runtime, _message, _state) {
    try {
      const walletProvider = initWalletProvider(runtime);
      const address = walletProvider.getAddress();
      const balance = await walletProvider.getWalletBalance();
      const chain = walletProvider.getCurrentChain();
      return `Arthera Wallet Address: ${address}
Balance: ${balance} ${chain.nativeCurrency.symbol}
Chain ID: ${chain.id}, Name: ${chain.name}`;
    } catch (error) {
      console.error("Error in Arthera wallet provider:", error);
      return null;
    }
  }
};

// src/templates/index.ts
var transferTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested transfer:
- Chain to execute on: Must be one of ["arthera", "base", ...] (like in viem/chains)
- Amount to transfer: Must be a string representing the amount in AA (only number without coin symbol, e.g., "0.1")
- Recipient address: Must be a valid Arthera address starting with "0x"
- Token symbol or address (if not native token): Optional, leave as null for AA transfers

Respond with a JSON markdown block containing only the extracted values. All fields except 'token' are required:

\`\`\`json
{
    "fromChain": SUPPORTED_CHAINS,
    "amount": string,
    "toAddress": string,
    "token": string | null
}
\`\`\`
`;

// src/actions/transfer.ts
var TransferAction = class {
  constructor(walletProvider) {
    this.walletProvider = walletProvider;
  }
  async transfer(params) {
    const walletClient = this.walletProvider.getWalletClient(
      params.fromChain
    );
    console.log(
      `Transferring: ${params.amount} tokens from (${walletClient.account.address} to (${params.toAddress} on ${params.fromChain})`
    );
    if (!params.data) {
      params.data = "0x";
    }
    try {
      const hash = await walletClient.sendTransaction({
        account: walletClient.account,
        to: params.toAddress,
        value: parseEther(params.amount),
        data: params.data,
        kzg: {
          blobToKzgCommitment: (_) => {
            throw new Error("Function not implemented.");
          },
          computeBlobKzgProof: (_blob, _commitment) => {
            throw new Error("Function not implemented.");
          }
        },
        chain: void 0
      });
      return {
        hash,
        from: walletClient.account.address,
        to: params.toAddress,
        value: parseEther(params.amount),
        data: params.data
      };
    } catch (error) {
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }
};
var buildTransferDetails = async (state, runtime, wp) => {
  const context = composeContext({
    state,
    template: transferTemplate
  });
  const chains = Object.keys(wp.chains);
  const contextWithChains = context.replace(
    "SUPPORTED_CHAINS",
    chains.map((item) => `"${item}"`).join("|")
  );
  const transferDetails = await generateObjectDeprecated({
    runtime,
    context: contextWithChains,
    modelClass: ModelClass.SMALL
  });
  const existingChain = wp.chains[transferDetails.fromChain];
  if (!existingChain) {
    throw new Error(
      `The chain ${transferDetails.fromChain} not configured yet. Add the chain or choose one from configured: ${chains.toString()}`
    );
  }
  return transferDetails;
};
var transferAction = {
  name: "transfer",
  description: "Transfer tokens between addresses on the same chain",
  handler: async (runtime, _message, state, _options, callback) => {
    console.log("Transfer action handler called");
    const walletProvider = initWalletProvider(runtime);
    const action = new TransferAction(walletProvider);
    const paramOptions = await buildTransferDetails(
      state,
      runtime,
      walletProvider
    );
    try {
      const transferResp = await action.transfer(paramOptions);
      if (callback) {
        callback({
          text: `Successfully transferred ${paramOptions.amount} tokens to ${paramOptions.toAddress}
Transaction Hash: ${transferResp.hash}`,
          content: {
            success: true,
            hash: transferResp.hash,
            amount: formatEther(transferResp.value),
            recipient: transferResp.to,
            chain: paramOptions.fromChain
          }
        });
      }
      return true;
    } catch (error) {
      console.error("Error during token transfer:", error);
      if (callback) {
        callback({
          text: `Error transferring tokens: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  template: transferTemplate,
  validate: async (runtime) => {
    const privateKey = runtime.getSetting("ARTHERA_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "assistant",
        content: {
          text: "I'll help you transfer 1 AA to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          action: "SEND_TOKENS"
        }
      },
      {
        user: "user",
        content: {
          text: "Transfer 1 AA to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          action: "SEND_TOKENS"
        }
      }
    ]
  ],
  similes: ["SEND_TOKENS", "TOKEN_TRANSFER", "MOVE_TOKENS"]
};

// src/types/index.ts
import * as viemChains2 from "viem/chains";
var _SupportedChainList = Object.keys(viemChains2);

// src/index.ts
var artheraPlugin = {
  name: "arthera",
  description: "Arthera blockchain integration plugin",
  providers: [artheraWalletProvider],
  evaluators: [],
  services: [],
  actions: [transferAction]
};
var index_default = artheraPlugin;
export {
  TransferAction,
  WalletProvider,
  artheraPlugin,
  artheraWalletProvider,
  index_default as default,
  initWalletProvider,
  transferAction,
  transferTemplate
};
//# sourceMappingURL=index.js.map