// src/actions/transfer.ts
import { elizaLogger } from "@elizaos/core";
import {
  ModelClass
} from "@elizaos/core";
import { composeContext } from "@elizaos/core";
import { generateObjectDeprecated } from "@elizaos/core";
import {
  Account as Account2,
  Aptos as Aptos2,
  AptosConfig as AptosConfig2,
  Ed25519PrivateKey as Ed25519PrivateKey2,
  Network as Network2,
  PrivateKey as PrivateKey2,
  PrivateKeyVariants as PrivateKeyVariants2
} from "@aptos-labs/ts-sdk";

// src/providers/wallet.ts
import {
  Account,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Network,
  PrivateKey,
  PrivateKeyVariants
} from "@aptos-labs/ts-sdk";
import BigNumber from "bignumber.js";
import NodeCache from "node-cache";
import * as path from "node:path";

// src/constants.ts
var MOVE_DECIMALS = 8;
var MOVEMENT_NETWORK_CONFIG = {
  mainnet: {
    fullnode: "https://mainnet.movementnetwork.xyz/v1",
    chainId: "126",
    name: "Movement Mainnet",
    explorerNetwork: "mainnet"
  },
  bardock: {
    fullnode: "https://aptos.testnet.bardock.movementlabs.xyz/v1",
    chainId: "250",
    name: "Movement Bardock Testnet",
    explorerNetwork: "bardock+testnet"
  }
};
var MOVEMENT_EXPLORER_URL = "https://explorer.movementnetwork.xyz/txn";

// src/providers/wallet.ts
var PROVIDER_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 2e3
};
var WalletProvider = class {
  constructor(aptosClient, address, cacheManager) {
    this.aptosClient = aptosClient;
    this.address = address;
    this.cacheManager = cacheManager;
    this.cache = new NodeCache({ stdTTL: 300 });
  }
  cache;
  cacheKey = "movement/wallet";
  async readFromCache(key) {
    const cached = await this.cacheManager.get(
      path.join(this.cacheKey, key)
    );
    return cached;
  }
  async writeToCache(key, data) {
    await this.cacheManager.set(path.join(this.cacheKey, key), data, {
      expires: Date.now() + 5 * 60 * 1e3
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
  async fetchPricesWithRetry() {
    let lastError;
    for (let i = 0; i < PROVIDER_CONFIG.MAX_RETRIES; i++) {
      try {
        const MoveUsdcPoolAddr = "0xA04d13F092f68F603A193832222898B0d9f52c71";
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/pairs/ethereum/${MoveUsdcPoolAddr}`
        );
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `HTTP error! status: ${response.status}, message: ${errorText}`
          );
        }
        const data = await response.json();
        return data;
      } catch (error) {
        console.error(`Attempt ${i + 1} failed:`, error);
        lastError = error;
        if (i < PROVIDER_CONFIG.MAX_RETRIES - 1) {
          const delay = PROVIDER_CONFIG.RETRY_DELAY * 2 ** i;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    console.error(
      "All attempts failed. Throwing the last error:",
      lastError
    );
    throw lastError;
  }
  async fetchPortfolioValue() {
    try {
      const cacheKey = `portfolio-${this.address}`;
      const cachedValue = await this.getCachedData(cacheKey);
      if (cachedValue) {
        console.log("Cache hit for fetchPortfolioValue", cachedValue);
        return cachedValue;
      }
      console.log("Cache miss for fetchPortfolioValue");
      const prices = await this.fetchPrices().catch((error) => {
        console.error("Error fetching Move price:", error);
        throw error;
      });
      const moveAmountOnChain = await this.aptosClient.getAccountAPTAmount({
        accountAddress: this.address
      }).catch((error) => {
        console.error("Error fetching Move amount:", error);
        throw error;
      });
      const moveAmount = new BigNumber(moveAmountOnChain).div(
        new BigNumber(10).pow(MOVE_DECIMALS)
      );
      const totalUsd = new BigNumber(moveAmount).times(prices.move.usd);
      const portfolio = {
        totalUsd: totalUsd.toString(),
        totalMove: moveAmount.toString()
      };
      this.setCachedData(cacheKey, portfolio);
      console.log("Fetched portfolio:", portfolio);
      return portfolio;
    } catch (error) {
      console.error("Error fetching portfolio:", error);
      throw error;
    }
  }
  async fetchPrices() {
    try {
      const cacheKey = "prices";
      const cachedValue = await this.getCachedData(cacheKey);
      if (cachedValue) {
        console.log("Cache hit for fetchPrices");
        return cachedValue;
      }
      console.log("Cache miss for fetchPrices");
      const movePriceData = await this.fetchPricesWithRetry().catch(
        (error) => {
          console.error("Error fetching Move price:", error);
          throw error;
        }
      );
      const prices = {
        move: { usd: movePriceData.pair.priceUsd }
      };
      this.setCachedData(cacheKey, prices);
      return prices;
    } catch (error) {
      console.error("Error fetching prices:", error);
      throw error;
    }
  }
  formatPortfolio(runtime, portfolio) {
    let output = `${runtime.character.name}
`;
    output += `Wallet Address: ${this.address}
`;
    const totalUsdFormatted = new BigNumber(portfolio.totalUsd).toFixed(2);
    const totalMoveFormatted = new BigNumber(portfolio.totalMove).toFixed(4);
    output += `Total Value: $${totalUsdFormatted} (${totalMoveFormatted} Move)
`;
    return output;
  }
  async getFormattedPortfolio(runtime) {
    try {
      const portfolio = await this.fetchPortfolioValue();
      return this.formatPortfolio(runtime, portfolio);
    } catch (error) {
      console.error("Error generating portfolio report:", error);
      return "Unable to fetch wallet information. Please try again later.";
    }
  }
};
var walletProvider = {
  get: async (runtime, _message, _state) => {
    const privateKey = runtime.getSetting("MOVEMENT_PRIVATE_KEY");
    const movementAccount = Account.fromPrivateKey({
      privateKey: new Ed25519PrivateKey(
        PrivateKey.formatPrivateKey(
          privateKey,
          PrivateKeyVariants.Ed25519
        )
      )
    });
    const network = runtime.getSetting("MOVEMENT_NETWORK");
    try {
      const aptosClient = new Aptos(
        new AptosConfig({
          network: Network.CUSTOM,
          fullnode: MOVEMENT_NETWORK_CONFIG[network].fullnode
        })
      );
      const provider = new WalletProvider(
        aptosClient,
        movementAccount.accountAddress.toStringLong(),
        runtime.cacheManager
      );
      return await provider.getFormattedPortfolio(runtime);
    } catch (error) {
      console.error("Error in wallet provider:", error);
      return null;
    }
  }
};

// src/actions/transfer.ts
function isTransferContent(content) {
  elizaLogger.debug("Validating transfer content:", content);
  return typeof content.recipient === "string" && (typeof content.amount === "string" || typeof content.amount === "number");
}
var transferTemplate = `You are processing a token transfer request. Extract the recipient address and amount from the message.

Example request: "can you send 1 move to 0x123..."
Example response:
\`\`\`json
{
    "recipient": "0x123...",
    "amount": "1"
}
\`\`\`

Rules:
1. The recipient address always starts with "0x"
2. The amount is typically a number less than 100
3. Return exact values found in the message

Recent messages:
{{recentMessages}}

Extract and return ONLY the following in a JSON block:
- recipient: The wallet address starting with 0x
- amount: The number of tokens to send

Return ONLY the JSON block with these two fields.`;
var transfer_default = {
  name: "TRANSFER_MOVE",
  similes: [
    "SEND_TOKEN",
    "TRANSFER_TOKEN",
    "TRANSFER_TOKENS",
    "SEND_TOKENS",
    "SEND_MOVE",
    "PAY"
  ],
  triggers: [
    "send move",
    "send 1 move",
    "transfer move",
    "send token",
    "transfer token",
    "can you send",
    "please send",
    "send"
  ],
  shouldHandle: (message) => {
    const text = message.content?.text?.toLowerCase() || "";
    return text.includes("send") && text.includes("move") && text.includes("0x");
  },
  validate: async (_runtime, message) => {
    elizaLogger.debug(
      "Starting transfer validation for user:",
      message.userId
    );
    elizaLogger.debug("Message text:", message.content?.text);
    return true;
  },
  priority: 1e3,
  // High priority for transfer actions
  description: "Transfer Move tokens from the agent's wallet to another address",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger.debug("Starting TRANSFER_MOVE handler...");
    elizaLogger.debug("Message:", {
      text: message.content?.text,
      userId: message.userId,
      action: message.content?.action
    });
    try {
      const privateKey = runtime.getSetting("MOVEMENT_PRIVATE_KEY");
      elizaLogger.debug(
        "Got private key:",
        privateKey ? "Present" : "Missing"
      );
      const network = runtime.getSetting("MOVEMENT_NETWORK");
      elizaLogger.debug("Network config:", network);
      elizaLogger.debug(
        "Available networks:",
        Object.keys(MOVEMENT_NETWORK_CONFIG)
      );
      const movementAccount = Account2.fromPrivateKey({
        privateKey: new Ed25519PrivateKey2(
          PrivateKey2.formatPrivateKey(
            privateKey,
            PrivateKeyVariants2.Ed25519
          )
        )
      });
      elizaLogger.debug(
        "Created Movement account:",
        movementAccount.accountAddress.toStringLong()
      );
      const aptosClient = new Aptos2(
        new AptosConfig2({
          network: Network2.CUSTOM,
          fullnode: MOVEMENT_NETWORK_CONFIG[network].fullnode
        })
      );
      elizaLogger.debug(
        "Created Aptos client with network:",
        MOVEMENT_NETWORK_CONFIG[network].fullnode
      );
      const walletInfo = await walletProvider.get(
        runtime,
        message,
        state
      );
      state.walletInfo = walletInfo;
      let currentState;
      if (!state) {
        currentState = await runtime.composeState(message);
      } else {
        currentState = await runtime.updateRecentMessageState(state);
      }
      const transferContext = composeContext({
        state: currentState,
        template: transferTemplate
      });
      const content = await generateObjectDeprecated({
        runtime,
        context: transferContext,
        modelClass: ModelClass.SMALL
      });
      if (!isTransferContent(content)) {
        console.error("Invalid content for TRANSFER_TOKEN action.");
        if (callback) {
          callback({
            text: "Unable to process transfer request. Invalid content provided.",
            content: { error: "Invalid transfer content" }
          });
        }
        return false;
      }
      const adjustedAmount = BigInt(
        Number(content.amount) * 10 ** MOVE_DECIMALS
      );
      console.log(
        `Transferring: ${content.amount} tokens (${adjustedAmount} base units)`
      );
      const tx = await aptosClient.transaction.build.simple({
        sender: movementAccount.accountAddress.toStringLong(),
        data: {
          function: "0x1::aptos_account::transfer",
          typeArguments: [],
          functionArguments: [content.recipient, adjustedAmount]
        }
      });
      const committedTransaction = await aptosClient.signAndSubmitTransaction({
        signer: movementAccount,
        transaction: tx
      });
      const executedTransaction = await aptosClient.waitForTransaction({
        transactionHash: committedTransaction.hash
      });
      const explorerUrl = `${MOVEMENT_EXPLORER_URL}/${executedTransaction.hash}?network=${MOVEMENT_NETWORK_CONFIG[network].explorerNetwork}`;
      elizaLogger.debug("Transfer successful:", {
        hash: executedTransaction.hash,
        amount: content.amount,
        recipient: content.recipient,
        explorerUrl
      });
      if (callback) {
        callback({
          text: `Successfully transferred ${content.amount} MOVE to ${content.recipient}
Transaction: ${executedTransaction.hash}
View on Explorer: ${explorerUrl}`,
          content: {
            success: true,
            hash: executedTransaction.hash,
            amount: content.amount,
            recipient: content.recipient,
            explorerUrl
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
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "can you send 1 move to 0xa07ab7d3739dc793f9d538f7d7163705176ba59f7a8c994a07357a3a7d97d843"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'll help you transfer 1 Move token...",
          action: "TRANSFER_MOVE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "send 1 move to 0xa07ab7d3739dc793f9d538f7d7163705176ba59f7a8c994a07357a3a7d97d843"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Processing Move token transfer...",
          action: "TRANSFER_MOVE"
        }
      }
    ]
  ]
};

// src/index.ts
var movementPlugin = {
  name: "movement",
  description: "Movement Network Plugin for Eliza",
  actions: [transfer_default],
  evaluators: [],
  providers: [walletProvider]
};
var index_default = movementPlugin;
export {
  transfer_default as TransferMovementToken,
  WalletProvider,
  index_default as default,
  movementPlugin
};
//# sourceMappingURL=index.js.map