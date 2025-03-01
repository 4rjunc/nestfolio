// src/actions/transfer.ts
import {
  composeContext,
  elizaLogger,
  generateObjectDeprecated,
  ModelClass
} from "@elizaos/core";

// src/providers/wallet.ts
var DEFAULT_INITIA_TESTNET_CONFIGS = {
  chainId: "initiation-2",
  nodeUrl: "https://rest.testnet.initia.xyz"
};
var WalletProvider = class {
  wallet = null;
  restClient = null;
  runtime;
  async initialize(runtime, options = DEFAULT_INITIA_TESTNET_CONFIGS) {
    const privateKey = runtime.getSetting("INITIA_PRIVATE_KEY");
    if (!privateKey) throw new Error("INITIA_PRIVATE_KEY is not configured");
    const initia = await import("@initia/initia.js");
    const { Wallet, RESTClient, RawKey } = initia;
    this.runtime = runtime;
    this.restClient = new RESTClient(
      options.nodeUrl,
      {
        chainId: options.chainId,
        gasPrices: "0.15uinit",
        gasAdjustment: "1.75"
      }
    );
    this.wallet = new Wallet(this.restClient, RawKey.fromHex(privateKey));
  }
  constructor(runtime, options = DEFAULT_INITIA_TESTNET_CONFIGS) {
    this.runtime = runtime;
    this.initialize(runtime, options);
  }
  getWallet() {
    if (this.wallet == null) {
      throw new Error("Initia wallet is not configured.");
    }
    return this.wallet;
  }
  getAddress() {
    if (this.wallet == null) {
      throw new Error("Initia wallet is not configured.");
    }
    return this.wallet.key.accAddress;
  }
  async getBalance() {
    if (this.wallet == null) {
      throw new Error("Initia wallet is not configured.");
    }
    return this.wallet.rest.bank.balance(this.getAddress());
  }
  async sendTransaction(signedTx) {
    return await this.restClient.tx.broadcast(signedTx);
  }
};
var initiaWalletProvider = {
  async get(runtime, _message, _state) {
    if (!runtime.getSetting("INITIA_PRIVATE_KEY")) {
      return null;
    }
    try {
      const nodeUrl = runtime.getSetting("INITIA_NODE_URL");
      const chainId = runtime.getSetting("INITIA_CHAIN_ID");
      let walletProvider;
      if (nodeUrl === null || chainId === null) {
        walletProvider = new WalletProvider(runtime);
      } else {
        walletProvider = new WalletProvider(runtime, { nodeUrl, chainId });
      }
      const address = walletProvider.getAddress();
      const balance = await walletProvider.getBalance();
      return `Initia Wallet Address: ${address}
Balance: ${balance} INIT`;
    } catch (e) {
      console.error("Error during configuring initia wallet provider", e);
      return null;
    }
  }
};

// src/actions/transfer.ts
function isTransferContent(_runtime, content) {
  return typeof content.sender === "string" && typeof content.recipient === "string" && typeof content.amount === "string";
}
var transferTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannt be determined.

Example response:
\`\`\`json
{
    "sender": "init18sj3x80fdjc6gzfvwl7lf8sxcvuvqjpvcmp6np",
    "recipient": "init1kdwzpz3wzvpdj90gtga4fw5zm9tk4cyrgnjauu",
    "amount": "1000uinit",
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token transfer:
- Sender wallet address
- Recipient wallet address
- Amount to transfer

Respond with a JSON markdown block containing only the extracted values.`;
var transfer_default = {
  name: "SEND_TOKEN",
  similes: [
    "TRANSFER_TOKEN_ON_INITIA",
    "TRANSFER_TOKENS_ON_INITIA",
    "SEND_TOKEN_ON_INITIA",
    "SEND_TOKENS_ON_INITIA",
    "PAY_ON_INITIA"
  ],
  description: "",
  validate: async (runtime, _message) => {
    const privateKey = runtime.getSetting("INITIA_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  handler: async (runtime, message, state, _options, callback) => {
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
      modelClass: ModelClass.LARGE
    });
    if (!isTransferContent(runtime, content)) {
      if (callback) {
        callback({
          text: "Unable to process transfer request. Invalid content provided.",
          content: { error: "Invalid transfer content" }
        });
      }
      return false;
    }
    try {
      const initia = await import("@initia/initia.js");
      const { MsgSend } = initia;
      const walletProvider = new WalletProvider(runtime);
      const msgSend = new MsgSend(
        content.sender,
        content.recipient,
        content.amount
      );
      const signedTx = await walletProvider.getWallet().createAndSignTx({
        msgs: [msgSend],
        memo: "This transaction is made in ElizaOS"
      });
      const txResult = await walletProvider.sendTransaction(signedTx);
      if (callback) {
        callback({
          text: `Successfully transferred INITIA.
Transaction Hash: ${txResult.txhash}
Sender: ${content.sender}
Recipient: ${content.recipient}
Amount: ${content.amount}`
        });
      }
      return true;
    } catch (e) {
      elizaLogger.error("Failed to transfer INITIA:", e.message);
      if (callback) {
        callback({
          text: `Failed to transfer INITIA: ${e.message}`
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
          text: "Hey send 1 INIT to init18sj3x80fdjc6gzfvwl7lf8sxcvuvqjpvcmp6np."
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Sure! I am going to send 1 INIT to init18sj3x80fdjc6gzfvwl7lf8sxcvuvqjpvcmp6np."
        }
      }
    ]
  ]
};

// src/index.ts
var initiaPlugin = {
  name: "initiaPlugin",
  description: "Initia Plugin for Eliza",
  actions: [
    transfer_default
  ],
  evaluators: [],
  providers: [initiaWalletProvider]
};
export {
  initiaPlugin
};
//# sourceMappingURL=index.js.map