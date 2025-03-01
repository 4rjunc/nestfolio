// src/actions/trikon.ts
import { elizaLogger } from "@elizaos/core";
import {
  ModelClass
} from "@elizaos/core";
import { composeContext } from "@elizaos/core";
import { generateObjectDeprecated } from "@elizaos/core";
var TransferValidationError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "TransferValidationError";
  }
};
var InsufficientBalanceError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "InsufficientBalanceError";
  }
};
function isTransferContent(content) {
  return typeof content.recipient === "string" && /^0x[a-fA-F0-9]{64}$/.test(content.recipient) && (typeof content.amount === "string" || typeof content.amount === "number") && Number(content.amount) > 0;
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
var trikon_default = {
  name: "SEND_TOKEN",
  similes: [
    "TRANSFER_TOKEN",
    "TRANSFER_TOKENS",
    "SEND_TOKENS",
    "SEND_TRK",
    "PAY"
  ],
  validate: async (runtime, message) => {
    elizaLogger.log("Validating trikon transfer from user:", message.userId);
    try {
      return true;
    } catch (error) {
      elizaLogger.error("Validation error:", error);
      return false;
    }
  },
  description: "Transfer tokens from the agent's wallet to another address",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger.log("Starting SEND_TOKEN handler...");
    try {
      if (!state) {
        state = await runtime.composeState(message);
      } else {
        state = await runtime.updateRecentMessageState(state);
      }
      const transferContext = composeContext({
        state,
        template: transferTemplate
      });
      const content = await generateObjectDeprecated({
        runtime,
        context: transferContext,
        modelClass: ModelClass.SMALL
      });
      if (!isTransferContent(content)) {
        throw new TransferValidationError("Invalid transfer content provided");
      }
      elizaLogger.log(
        `Would transfer ${content.amount} tokens to ${content.recipient}`
      );
      if (callback) {
        callback({
          text: `Transfer simulation successful for ${content.amount} TRK to ${content.recipient}`,
          content: {
            success: true,
            amount: content.amount,
            recipient: content.recipient
          }
        });
      }
      return true;
    } catch (error) {
      if (error instanceof TransferValidationError) {
        elizaLogger.error("Transfer validation error:", error);
        if (callback) {
          callback({
            text: `Invalid transfer request: ${error.message}`,
            content: { error: error.message }
          });
        }
      } else if (error instanceof InsufficientBalanceError) {
        elizaLogger.error("Insufficient balance:", error);
        if (callback) {
          callback({
            text: `Insufficient balance: ${error.message}`,
            content: { error: error.message }
          });
        }
      } else {
        elizaLogger.error("Unexpected error during token transfer:", error);
        if (callback) {
          callback({
            text: `Error transferring tokens: ${error.message}`,
            content: { error: error.message }
          });
        }
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Send 100 TRK tokens to 0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'll send 100 TRK tokens now...",
          action: "SEND_TOKEN"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Successfully sent 100 TRK tokens to 0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0"
        }
      }
    ],
    // Added example for failed transfer
    [
      {
        user: "{{user1}}",
        content: {
          text: "Send 1000000 TRK tokens to 0x4f2e63be8e7fe287836e29cde6f3d5cbc96eefd0c0e3f3747668faa2ae7324b0"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Unable to send tokens - insufficient balance",
          action: "SEND_TOKEN"
        }
      }
    ]
  ]
};

// src/providers/wallet.ts
import { elizaLogger as elizaLogger2 } from "@elizaos/core";
function validateAddress(address) {
  if (!address) {
    throw new Error("TRIKON_WALLET_ADDRESS environment variable is required");
  }
  if (!/^0x[a-fA-F0-9]{64}$/.test(address)) {
    throw new Error("Invalid wallet address format");
  }
  return address;
}
function validateBalance(balance) {
  if (!balance) return "0";
  if (!/^\d+$/.test(balance)) {
    throw new Error("Invalid balance format");
  }
  return balance;
}
var walletProvider = {
  get: async () => {
    elizaLogger2.log("Getting Trikon wallet provider...");
    return {
      address: validateAddress(process.env.TRIKON_WALLET_ADDRESS),
      balance: validateBalance(process.env.TRIKON_INITIAL_BALANCE),
      getBalance: async () => validateBalance(process.env.TRIKON_INITIAL_BALANCE),
      getAddress: async () => validateAddress(process.env.TRIKON_WALLET_ADDRESS)
    };
  }
};

// src/index.ts
var trikonPlugin = {
  name: "trikon",
  description: "Trikon Plugin for Eliza - POC for token transfer functionality",
  actions: [trikon_default],
  evaluators: [],
  // No evaluators needed for POC
  providers: [walletProvider],
  services: [],
  // No services needed for POC
  clients: []
  // No clients needed for POC
};
var index_default = trikonPlugin;
export {
  trikon_default as TransferTrikonToken,
  index_default as default,
  trikonPlugin,
  walletProvider
};
//# sourceMappingURL=index.js.map