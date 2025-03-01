// src/providers/wallet.ts
import {
  createPublicClient,
  createWalletClient,
  formatUnits,
  http
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  elizaLogger
} from "@elizaos/core";
import * as viemChains from "viem/chains";
import NodeCache from "node-cache";
import * as path from "node:path";
var seiChains = {
  "mainnet": viemChains.sei,
  "testnet": viemChains.seiTestnet,
  "devnet": viemChains.seiDevnet
};
var WalletProvider = class {
  constructor(accountOrPrivateKey, cacheManager, chain) {
    this.cacheManager = cacheManager;
    this.setAccount(accountOrPrivateKey);
    this.setCurrentChain(chain);
    this.cache = new NodeCache({ stdTTL: this.CACHE_EXPIRY_SEC });
  }
  cache;
  // private cacheKey: string = "evm/wallet";
  cacheKey = "evm/wallet";
  // Remove explicit type annotation
  currentChain;
  CACHE_EXPIRY_SEC = 5;
  account;
  getAddress() {
    return this.account.address;
  }
  getCurrentChain() {
    return this.currentChain;
  }
  getPublicClient() {
    const transport = this.createHttpTransport();
    const publicClient = createPublicClient({
      chain: this.currentChain.chain,
      transport
    });
    return publicClient;
  }
  getEvmWalletClient() {
    const transport = this.createHttpTransport();
    const walletClient = createWalletClient({
      chain: this.currentChain.chain,
      transport,
      account: this.account
    });
    return walletClient;
  }
  getEvmPublicClient() {
    const transport = this.createHttpTransport();
    const publicClient = createPublicClient({
      chain: this.currentChain.chain,
      transport
    });
    return publicClient;
  }
  async getWalletBalance() {
    const cacheKey = `seiWalletBalance_${this.currentChain.name}`;
    const cachedData = await this.getCachedData(cacheKey);
    if (cachedData) {
      elizaLogger.log(
        `Returning cached wallet balance for sei chain: ${this.currentChain.name}`
        // Fix: Use template literal
      );
      return cachedData;
    }
    try {
      const client = this.getPublicClient();
      const balance = await client.getBalance({
        address: this.account.address
      });
      const balanceFormatted = formatUnits(balance, 18);
      this.setCachedData(cacheKey, balanceFormatted);
      elizaLogger.log(
        "Wallet balance cached for chain: ",
        this.currentChain.name
      );
      return balanceFormatted;
    } catch (error) {
      console.error("Error getting wallet balance:", error);
      return null;
    }
  }
  async readFromCache(key) {
    const cached = await this.cacheManager.get(
      path.join(this.cacheKey, key)
    );
    return cached ?? null;
  }
  // private async readFromCache<T>(key: string): Promise<T | null> {
  //     const cached = await this.cacheManager.get<T>(
  //         path.join(this.cacheKey, key)
  //     );
  //     return cached;
  // }
  async writeToCache(key, data) {
    await this.cacheManager.set(path.join(this.cacheKey, key), data, {
      expires: Date.now() + this.CACHE_EXPIRY_SEC * 1e3
    });
  }
  async getCachedData(key) {
    const cachedData = this.cache.get(key);
    if (cachedData) {
      return cachedData;
    }
    const fileCachedData = await this.readFromCache(key);
    if (fileCachedData) {
      this.cache.set(key, fileCachedData);
      return fileCachedData;
    }
    return null;
  }
  async setCachedData(cacheKey, data) {
    this.cache.set(cacheKey, data);
    await this.writeToCache(cacheKey, data);
  }
  setAccount = (accountOrPrivateKey) => {
    if (typeof accountOrPrivateKey === "string") {
      this.account = privateKeyToAccount(accountOrPrivateKey);
    } else {
      this.account = accountOrPrivateKey;
    }
  };
  setCurrentChain = (chain) => {
    this.currentChain = chain;
  };
  createHttpTransport = () => {
    const chain = this.currentChain.chain;
    if (chain.rpcUrls.custom) {
      return http(chain.rpcUrls.custom.http[0]);
    }
    return http(chain.rpcUrls.default.http[0]);
  };
  static genSeiChainFromName(chainName, customRpcUrl) {
    const baseChain = seiChains[chainName];
    if (!baseChain?.id) {
      throw new Error("Invalid chain name");
    }
    const seiChain = customRpcUrl ? {
      ...baseChain,
      rpcUrls: {
        ...baseChain.rpcUrls,
        custom: {
          http: [customRpcUrl]
        }
      }
    } : baseChain;
    return seiChain;
  }
};
var genChainFromRuntime = (runtime) => {
  const sei_network = runtime.getSetting("SEI_NETWORK");
  if (typeof sei_network !== "string") {
    throw new Error("SEI_NETWORK must be a string");
  }
  const validChains = Object.keys(seiChains);
  if (!validChains.includes(sei_network)) {
    throw new Error(`Invalid SEI_NETWORK ${sei_network}. Must be one of ${validChains.join(", ")}`);
  }
  let chain = seiChains[sei_network];
  const rpcurl = runtime.getSetting("SEI_RPC_URL");
  if (typeof rpcurl === "string") {
    chain = WalletProvider.genSeiChainFromName(sei_network, rpcurl);
  }
  return { name: sei_network, chain };
};
var initWalletProvider = async (runtime) => {
  const chainData = genChainFromRuntime(runtime);
  const privateKey = runtime.getSetting(
    "SEI_PRIVATE_KEY"
  );
  if (!privateKey) {
    throw new Error("SEI_PRIVATE_KEY is missing");
  }
  return new WalletProvider(privateKey, runtime.cacheManager, chainData);
};
var evmWalletProvider = {
  async get(runtime, _message, state) {
    try {
      const walletProvider = await initWalletProvider(runtime);
      const address = walletProvider.getAddress();
      const balance = await walletProvider.getWalletBalance();
      const chain = walletProvider.getCurrentChain().chain;
      const agentName = state?.agentName || "The agent";
      return `${agentName}'s Sei Wallet Address: ${address}
Balance: ${balance} ${chain.nativeCurrency.symbol}
Chain ID: ${chain.id}, Name: ${chain.name}`;
    } catch (error) {
      console.error("Error in Sei wallet provider:", error);
      return null;
    }
  }
};

// src/actions/transfer.ts
import { formatEther, parseEther } from "viem";
import {
  elizaLogger as elizaLogger2,
  composeContext,
  generateObjectDeprecated,
  ModelClass
} from "@elizaos/core";

// src/types/index.ts
import * as viemChains2 from "viem/chains";

// src/types/precompiles.ts
var ADDRESS_PRECOMPILE_ABI = [
  {
    inputs: [{ internalType: "string", name: "addr", type: "string" }],
    name: "getEvmAddr",
    outputs: [{ internalType: "address", name: "response", type: "address" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "address", name: "addr", type: "address" }],
    name: "getSeiAddr",
    outputs: [{ internalType: "string", name: "response", type: "string" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ internalType: "string", name: "v", type: "string" }, { internalType: "string", name: "r", type: "string" }, { internalType: "string", name: "s", type: "string" }, { internalType: "string", name: "customMessage", type: "string" }],
    name: "associate",
    outputs: [{ internalType: "string", name: "seiAddr", type: "string" }, { internalType: "address", name: "evmAddr", type: "address" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [{ internalType: "string", name: "pubKeyHex", type: "string" }],
    name: "associatePubKey",
    outputs: [{ internalType: "string", name: "seiAddr", type: "string" }, { internalType: "address", name: "evmAddr", type: "address" }],
    stateMutability: "nonpayable",
    type: "function"
  }
];
var ADDRESS_PRECOMPILE_ADDRESS = "0x0000000000000000000000000000000000001004";

// src/types/index.ts
var _SupportedChainList = Object.keys([viemChains2.seiDevnet, viemChains2.seiTestnet, viemChains2.sei]);

// src/actions/transfer.ts
var transferTemplate = `You are an AI assistant specialized in processing cryptocurrency transfer requests. Your task is to extract specific information from user messages and format it into a structured JSON response.

First, review the recent messages from the conversation:

<recent_messages>
{{recentMessages}}
</recent_messages>

Your goal is to extract the following information about the requested transfer:
1. Amount to transfer in SEI
2. Recipient address

Before providing the final JSON output, show your reasoning process inside <analysis> tags. Follow these steps:

1. Identify the relevant information from the user's message:
   - Quote the part mentioning the amount.
   - Quote the part mentioning the recipient address.

2. Validate each piece of information:
   - Amount: Attempt to convert the amount to a number to verify it's valid.
   - Address: Check that it either starts with "0x" or "sei1", and ensure that the address contains 42 characters,
   - Chain: Check that the chain is either mainnet, testnet, devnet or

3. If any information is missing or invalid, prepare an appropriate error message.

4. If all information is valid, summarize your findings.

5. Prepare the JSON structure based on your analysis.

After your analysis, provide the final output in a JSON markdown block. All fields except 'token' are required. The JSON should have this structure:
\`\`\`json
{
    "amount": string,
    "toAddress": string,
}
\`\`\`

Remember:
- The amount should be a string representing the SEI amount without any currency symbol.
- The recipient address must be a valid Ethereum address starting with "0x" or a vald SEI address startng with "sei1".

Now, process the user's request and provide your response.
`;
var TransferAction = class {
  constructor(walletProvider) {
    this.walletProvider = walletProvider;
  }
  async transfer(params) {
    const chain = this.walletProvider.getCurrentChain();
    elizaLogger2.log(
      `Transferring: ${params.amount} tokens to (${params.toAddress} on ${chain.name})`
    );
    let recipientAddress;
    if (params.toAddress.startsWith("sei")) {
      const publicClient = this.walletProvider.getEvmPublicClient();
      const evmAddress = await publicClient.readContract({
        address: ADDRESS_PRECOMPILE_ADDRESS,
        abi: ADDRESS_PRECOMPILE_ABI,
        functionName: "getEvmAddr",
        args: [params.toAddress]
      });
      if (!evmAddress || !evmAddress.startsWith("0x")) {
        throw new Error(`ERROR: Recipient does not have valid EVM address. Got: ${evmAddress}`);
      }
      elizaLogger2.log(`Translated address ${params.toAddress} to EVM address ${evmAddress}`);
      recipientAddress = evmAddress;
    } else {
      if (!params.toAddress.startsWith("0x")) {
        throw new Error(`ERROR: Recipient address must start with '0x'. Got: ${params.toAddress}`);
      }
      recipientAddress = params.toAddress;
    }
    const walletClient = this.walletProvider.getEvmWalletClient();
    if (!walletClient.account) {
      throw new Error("Wallet client account is undefined");
    }
    try {
      const hash = await walletClient.sendTransaction({
        account: walletClient.account,
        to: recipientAddress,
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
        maxFeePerBlobGas: BigInt(0),
        // Add required property
        blobs: [],
        // Add required property
        chain: void 0
      });
      return {
        hash,
        from: walletClient.account.address,
        // Now guaranteed to be defined
        to: params.toAddress,
        value: parseEther(params.amount),
        data: params.data
      };
    } catch (error) {
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }
};
var buildTransferDetails = async (state, runtime, _wp) => {
  const context = composeContext({
    state,
    template: transferTemplate
  });
  const transferDetails = await generateObjectDeprecated({
    runtime,
    context,
    modelClass: ModelClass.SMALL
  });
  return transferDetails;
};
var transferAction = {
  name: "transfer",
  description: "Transfer tokens between addresses on the same chain",
  handler: async (runtime, message, state, _options, callback) => {
    let updatedState = state;
    if (!updatedState) {
      updatedState = await runtime.composeState(message);
    } else {
      updatedState = await runtime.updateRecentMessageState(updatedState);
    }
    elizaLogger2.debug("Transfer action handler called");
    const walletProvider = await initWalletProvider(runtime);
    const action = new TransferAction(walletProvider);
    const paramOptions = await buildTransferDetails(
      updatedState,
      // Use the new variable
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
            chain: walletProvider.getCurrentChain().name
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger2.error("Error during token transfer:", error);
      if (callback) {
        callback({
          text: `Error transferring tokens: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  validate: async (runtime) => {
    const privateKey = runtime.getSetting("SEI_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "assistant",
        content: {
          text: "I'll help you transfer 1 SEI to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          action: "SEND_TOKENS"
        }
      },
      {
        user: "user",
        content: {
          text: "Transfer 1 SEI to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
          action: "SEND_TOKENS"
        }
      }
    ]
  ],
  similes: ["SEND_TOKENS", "TOKEN_TRANSFER", "MOVE_TOKENS", "SEND_SEI"]
};

// src/index.ts
console.log("SEI IS BEING INITIALIZED");
var seiPlugin = {
  name: "sei",
  description: "Sei Plugin for Eliza",
  actions: [transferAction],
  evaluators: [],
  providers: [evmWalletProvider]
};
var index_default = seiPlugin;
export {
  index_default as default,
  seiPlugin
};
//# sourceMappingURL=index.js.map