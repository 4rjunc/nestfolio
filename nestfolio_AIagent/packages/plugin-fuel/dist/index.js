// src/actions/transfer.ts
import {
  composeContext,
  generateObjectDeprecated,
  ModelClass
} from "@elizaos/core";

// src/providers/wallet.ts
import { Provider as FuelProvider, Wallet } from "fuels";
var WalletProvider = class {
  wallet;
  constructor(privateKey, provider) {
    this.wallet = Wallet.fromPrivateKey(privateKey, provider);
  }
  getAddress() {
    return this.wallet.address.toB256();
  }
  async getBalance() {
    const balance = await this.wallet.getBalance();
    return balance.format();
  }
};
var initWalletProvider = async (runtime) => {
  const privateKey = runtime.getSetting("FUEL_PRIVATE_KEY");
  if (!privateKey) {
    throw new Error("FUEL_PRIVATE_KEY is missing");
  }
  const fuelProviderUrl = runtime.getSetting("FUEL_PROVIDER_URL") || "https://mainnet.fuel.network/v1/graphql";
  const provider = await FuelProvider.create(fuelProviderUrl);
  return new WalletProvider(privateKey, provider);
};
var fuelWalletProvider = {
  async get(runtime, _message, _state) {
    const walletProvider = await initWalletProvider(runtime);
    const balance = await walletProvider.getBalance();
    return `Fuel Wallet Address: ${walletProvider.getAddress()}
Balance: ${balance} ETH`;
  }
};

// src/actions/transfer.ts
import { bn } from "fuels";

// src/templates/index.ts
var transferTemplate = `Given the recent messages and wallet information below:

{{recentMessages}}

{{walletInfo}}

Extract the following information about the requested transfer:
- Amount to transfer: Must be a string representing the amount in ETH (only number without coin symbol, e.g., "0.1")
- Recipient address: Must be a valid Fuel wallet address starting with "0x"

Respond with a JSON markdown block containing only the extracted values. All fields except 'token' are required:

\`\`\`json
{
    "amount": string,
    "toAddress": string,
}
\`\`\`
`;

// src/actions/transfer.ts
var TransferAction = class {
  constructor(walletProvider) {
    this.walletProvider = walletProvider;
  }
  async transfer(params) {
    try {
      const { toAddress, amount } = params;
      const res = await this.walletProvider.wallet.transfer(
        toAddress,
        bn.parseUnits(amount)
      );
      const tx = await res.waitForResult();
      return tx;
    } catch (error) {
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }
};
var buildTransferDetails = async (state, runtime) => {
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
  description: "Transfer Fuel ETH between addresses on Fuel Ignition",
  handler: async (runtime, _message, state, _options, callback) => {
    const walletProvider = await initWalletProvider(runtime);
    const action = new TransferAction(walletProvider);
    const paramOptions = await buildTransferDetails(state, runtime);
    try {
      const transferResp = await action.transfer(paramOptions);
      if (callback) {
        callback({
          text: `Successfully transferred ${paramOptions.amount} ETH to ${paramOptions.toAddress}
Transaction Hash: ${transferResp.id}`,
          content: {
            success: true,
            hash: transferResp.id,
            amount: paramOptions.amount,
            recipient: paramOptions.toAddress
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
  // template: transferTemplate,
  validate: async (runtime) => {
    const privateKey = runtime.getSetting("FUEL_PRIVATE_KEY");
    return typeof privateKey === "string" && privateKey.startsWith("0x");
  },
  examples: [
    [
      {
        user: "assistant",
        content: {
          text: "I'll help you transfer 1 ETH to 0x8F8afB12402C9a4bD9678Bec363E51360142f8443FB171655eEd55dB298828D1",
          action: "SEND_TOKENS"
        }
      },
      {
        user: "user",
        content: {
          text: "Transfer 1 ETH to 0x8F8afB12402C9a4bD9678Bec363E51360142f8443FB171655eEd55dB298828D1",
          action: "SEND_TOKENS"
        }
      }
    ]
  ],
  similes: ["TRANSFER_FUEL_ETH"]
};

// src/index.ts
var fuelPlugin = {
  name: "fuel",
  description: "Fuel blockchain integration plugin",
  providers: [fuelWalletProvider],
  evaluators: [],
  services: [],
  actions: [transferAction]
};
var index_default = fuelPlugin;
export {
  index_default as default,
  fuelPlugin
};
//# sourceMappingURL=index.js.map