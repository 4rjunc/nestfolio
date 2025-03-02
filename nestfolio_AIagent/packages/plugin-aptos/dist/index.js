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
  PrivateKey as PrivateKey2,
  PrivateKeyVariants as PrivateKeyVariants2
} from "@aptos-labs/ts-sdk";

// src/providers/wallet.ts
import {
  Account,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  PrivateKey,
  PrivateKeyVariants
} from "@aptos-labs/ts-sdk";
import BigNumber from "bignumber.js";
import NodeCache from "node-cache";
import * as path from "node:path";

// src/constants.ts
var APT_DECIMALS = 8;

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
  cacheKey = "aptos/wallet";
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
        const cellanaAptUsdcPoolAddr = "0x234f0be57d6acfb2f0f19c17053617311a8d03c9ce358bdf9cd5c460e4a02b7c";
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/pairs/aptos/${cellanaAptUsdcPoolAddr}`
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
        console.error("Error fetching APT price:", error);
        throw error;
      });
      const aptAmountOnChain = await this.aptosClient.getAccountAPTAmount({
        accountAddress: this.address
      }).catch((error) => {
        console.error("Error fetching APT amount:", error);
        throw error;
      });
      const aptAmount = new BigNumber(aptAmountOnChain).div(
        new BigNumber(10).pow(APT_DECIMALS)
      );
      const totalUsd = new BigNumber(aptAmount).times(prices.apt.usd);
      const portfolio = {
        totalUsd: totalUsd.toString(),
        totalApt: aptAmount.toString()
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
      const aptPriceData = await this.fetchPricesWithRetry().catch(
        (error) => {
          console.error("Error fetching APT price:", error);
          throw error;
        }
      );
      const prices = {
        apt: { usd: aptPriceData.pair.priceUsd }
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
    const totalAptFormatted = new BigNumber(portfolio.totalApt).toFixed(4);
    output += `Total Value: $${totalUsdFormatted} (${totalAptFormatted} APT)
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
    const privateKey = runtime.getSetting("APTOS_PRIVATE_KEY");
    const aptosAccount = Account.fromPrivateKey({
      privateKey: new Ed25519PrivateKey(
        PrivateKey.formatPrivateKey(
          privateKey,
          PrivateKeyVariants.Ed25519
        )
      )
    });
    const network = runtime.getSetting("APTOS_NETWORK");
    try {
      const aptosClient = new Aptos(
        new AptosConfig({
          network
        })
      );
      const provider = new WalletProvider(
        aptosClient,
        aptosAccount.accountAddress.toStringLong(),
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
  elizaLogger.log("Content for transfer", content);
  if (typeof content !== "object" || content === null) {
    return false;
  }
  const c = content;
  return typeof c.recipient === "string" && (typeof c.amount === "string" || typeof c.amount === "number");
}
var transferTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "recipient": "0x2badda48c062e861ef17a96a806c451fd296a49f45b272dee17f85b0e32663fd",
    "amount": "1000"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token transfer:
- Recipient wallet address
- Amount to transfer

Respond with a JSON markdown block containing only the extracted values.`;
var transfer_default = {
  name: "SEND_TOKEN",
  similes: [
    "TRANSFER_TOKEN",
    "TRANSFER_TOKENS",
    "SEND_TOKENS",
    "SEND_APT",
    "PAY"
  ],
  validate: async (_runtime, message) => {
    elizaLogger.log("Validating apt transfer from user:", message.userId);
    return false;
  },
  description: "Transfer tokens from the agent's wallet to another address",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger.log("Starting SEND_TOKEN handler...");
    const walletInfo = await walletProvider.get(runtime, message, state);
    state.walletInfo = walletInfo;
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
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
      elizaLogger.error("Invalid content for TRANSFER_TOKEN action.");
      if (callback) {
        callback({
          text: "Unable to process transfer request. Invalid content provided.",
          content: { error: "Invalid transfer content" }
        });
      }
      return false;
    }
    try {
      const privateKey = runtime.getSetting("APTOS_PRIVATE_KEY");
      const aptosAccount = Account2.fromPrivateKey({
        privateKey: new Ed25519PrivateKey2(
          PrivateKey2.formatPrivateKey(
            privateKey,
            PrivateKeyVariants2.Ed25519
          )
        )
      });
      const network = runtime.getSetting("APTOS_NETWORK");
      const aptosClient = new Aptos2(
        new AptosConfig2({
          network
        })
      );
      const APT_DECIMALS2 = 8;
      const adjustedAmount = BigInt(
        Number(content.amount) * 10 ** APT_DECIMALS2
      );
      elizaLogger.log(
        `Transferring: ${content.amount} tokens (${adjustedAmount} base units)`
      );
      const tx = await aptosClient.transaction.build.simple({
        sender: aptosAccount.accountAddress.toStringLong(),
        data: {
          function: "0x1::aptos_account::transfer",
          typeArguments: [],
          functionArguments: [content.recipient, adjustedAmount]
        }
      });
      const committedTransaction = await aptosClient.signAndSubmitTransaction({
        signer: aptosAccount,
        transaction: tx
      });
      const executedTransaction = await aptosClient.waitForTransaction({
        transactionHash: committedTransaction.hash
      });
      elizaLogger.log("Transfer successful:", executedTransaction.hash);
      if (callback) {
        callback({
          text: `Successfully transferred ${content.amount} APT to ${content.recipient}, Transaction: ${executedTransaction.hash}`,
          content: {
            success: true,
            hash: executedTransaction.hash,
            amount: content.amount,
            recipient: content.recipient
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger.error("Error during token transfer:", error);
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
          text: "Send 69 APT tokens to 0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'll send 69 APT tokens now...",
          action: "SEND_TOKEN"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Successfully sent 69 APT tokens to 0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0, Transaction: 0x39a8c432d9bdad993a33cc1faf2e9b58fb7dd940c0425f1d6db3997e4b4b05c0"
        }
      }
    ]
  ]
};

// src/index.ts
var aptosPlugin = {
  name: "aptos",
  description: "Aptos Plugin for Eliza",
  actions: [transfer_default],
  evaluators: [],
  providers: [walletProvider]
};
var index_default = aptosPlugin;
export {
  transfer_default as TransferAptosToken,
  WalletProvider,
  aptosPlugin,
  index_default as default
};
//# sourceMappingURL=index.js.map