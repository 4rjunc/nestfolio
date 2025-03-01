// src/providers/wallet.ts
import { elizaLogger } from "@elizaos/core";
import {
  DirectSecp256k1HdWallet,
  DirectSecp256k1Wallet
} from "@cosmjs/proto-signing";
import { SigningStargateClient, GasPrice } from "@cosmjs/stargate";
import { fromHex } from "@cosmjs/encoding";
var WalletProvider = class {
  wallet;
  client;
  constructor(wallet, client) {
    this.wallet = wallet;
    this.client = client;
  }
  async getBalance(address) {
    const balance = await this.client.getBalance(address, "uflix");
    return [balance];
  }
  async getClient() {
    return this.client;
  }
  async getWallet() {
    return this.wallet;
  }
  async getAddress() {
    const address = await this.wallet.getAccounts();
    return address[0].address;
  }
  async getMnemonic() {
    if (this.wallet instanceof DirectSecp256k1HdWallet) {
      return this.wallet.mnemonic;
    }
    return void 0;
  }
};
var walletProvider = {
  get: async (runtime) => {
    try {
      const privateKey = runtime.getSetting("privateKey") || process.env.OMNIFLIX_PRIVATE_KEY;
      const mnemonic = runtime.getSetting("mnemonic") || process.env.OMNIFLIX_MNEMONIC;
      const rpcEndpoint = runtime.getSetting("rpcEndpoint") || process.env.OMNIFLIX_RPC_ENDPOINT;
      if (!rpcEndpoint) {
        elizaLogger.error("RPC endpoint not found");
        return null;
      }
      if (!privateKey && !mnemonic) {
        elizaLogger.error("Neither private key nor mnemonic provided");
        return null;
      }
      let wallet;
      if (privateKey) {
        const privateKeyBytes = fromHex(
          privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey
        );
        wallet = await DirectSecp256k1Wallet.fromKey(
          privateKeyBytes,
          "omniflix"
        );
        elizaLogger.info("Wallet initialized with private key");
      } else if (mnemonic) {
        wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
          prefix: "omniflix"
        });
        elizaLogger.info("Wallet initialized with mnemonic");
      } else {
        throw new Error("Neither private key nor mnemonic available");
      }
      const client = await SigningStargateClient.connectWithSigner(
        rpcEndpoint,
        wallet,
        {
          gasPrice: GasPrice.fromString("0.025uflix")
        }
      );
      return new WalletProvider(wallet, client);
    } catch (error) {
      elizaLogger.error(`Error initializing wallet: ${error.message}`);
      return null;
    }
  }
};
var wallet_default = walletProvider;

// src/providers/index.ts
var providers = [
  wallet_default
];
var providers_default = providers;

// src/actions/bank/balance.ts
import {
  elizaLogger as elizaLogger2
} from "@elizaos/core";

// src/action_examples/bank/balance.ts
var balance_default = [
  [
    {
      user: "{{user1}}",
      content: { text: "What is my balance of my wallet?" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Sure thing, I'll check that for you.",
        action: "GET_BALANCE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Can you tell me how many FLIX I have in my wallet?" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll look up your wallet balance now.",
        action: "GET_BALANCE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "What's my total FLIX holdings including staked amount?" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll check both your regular and staked balances.",
        action: "GET_BALANCE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "I want to check my balance" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Let me check that for you.",
        action: "GET_BALANCE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "How much FLIX do I have?" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Let me check that for you.",
        action: "GET_BALANCE"
      }
    }
  ]
];

// src/actions/bank/balance.ts
var GetBalanceAction = class {
  async getBalance(runtime, message, _state) {
    try {
      let rpcEndpoint = runtime.getSetting("rpcEndpoint") || process.env.OMNIFLIX_RPC_ENDPOINT;
      if (!rpcEndpoint) {
        rpcEndpoint = "https://rpc.omniflix.network:443";
      }
      const wallet = await walletProvider.get(
        runtime,
        message,
        _state
      );
      const client = await wallet.getClient();
      const addressMatch = message.content?.text?.match(
        /omniflix[a-zA-Z0-9]{39}/
      );
      let address;
      if (addressMatch) {
        address = addressMatch[0];
      } else {
        address = await wallet.getAddress();
        if (!address) {
          throw new Error("No wallet address available");
        }
      }
      elizaLogger2.info(`Checking balance for address: ${address}`);
      const balance = await client.getBalance(address, "uflix");
      if (!balance) {
        return {
          balance: 0,
          address
        };
      }
      const balanceInFLIX = Number(balance.amount) / 10 ** 6;
      elizaLogger2.info(`Balance of ${address} is ${balanceInFLIX} FLIX`);
      return {
        balance: balanceInFLIX,
        address
      };
    } catch (error) {
      throw new Error(`Balance check failed: ${error.message}`);
    }
  }
};
var balance_default2 = {
  name: "GET_BALANCE",
  description: "Retrieve the balance of a specified blockchain address in FLIX tokens.",
  similes: ["check balance", "balance inquiry", "account balance"],
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger2.log("Starting GET_BALANCE handler...");
    try {
      const action = new GetBalanceAction();
      const { balance, address } = await action.getBalance(
        runtime,
        message,
        state
      );
      if (callback) {
        callback({
          text: `Successfully retrieved balance of ${address}
Balance: ${balance} FLIX`,
          content: {
            success: true,
            amount: balance,
            address
          }
        });
      }
      return true;
    } catch (error) {
      if (callback) {
        callback({
          text: `Error checking balance: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  validate: async (_runtime) => {
    return true;
  },
  examples: balance_default
};

// src/actions/bank/send_tokens.ts
import {
  elizaLogger as elizaLogger4,
  composeContext,
  ModelClass,
  generateObjectDeprecated
} from "@elizaos/core";

// src/providers/bank.ts
import { elizaLogger as elizaLogger3 } from "@elizaos/core";
var BankProvider = class {
  wallet;
  constructor(wallet) {
    this.wallet = wallet;
  }
  async sendTokens(recipient, amount) {
    try {
      const address = await this.wallet.getAddress();
      const client = await this.wallet.getClient();
      if (!address) {
        throw new Error("Could not get address");
      }
      const tx = await client.sendTokens(
        address,
        recipient,
        [amount],
        "auto",
        "Sent tokens using Eliza"
      );
      return tx;
    } catch (e) {
      elizaLogger3.error(`Error in sendTokens: ${e}`);
      throw e;
    }
  }
};

// src/actions/bank/send_tokens.ts
import { bech32 } from "bech32";

// src/action_examples/bank/send_tokens.ts
var send_tokens_default = [
  [
    {
      user: "{{user1}}",
      content: { text: "Send 100 FLIX to omniflix1abc123..., please let me know when it's done." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll send 100 FLIX to that address immediately.",
        action: "SEND_TOKENS"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Send 50 FLIX to omniflix1abc123def456..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll send 50 FLIX to that address right away.",
        action: "SEND_TOKENS"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Send tokens" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Please provide the amount of tokens you want to send and the recipient address.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "100 FLIX" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Please provide the recipient address for the transfer.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "omniflix1xyz789..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll send 100 FLIX to omniflix1xyz789... right away.",
        action: "SEND_TOKENS"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Send to omniflix1def456..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Please specify how many tokens you would like to send.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "75 FLIX" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll process the transfer of 75 FLIX to omniflix1def456...",
        action: "SEND_TOKENS"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Send 1000 FLIX" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Please provide the recipient address for the transfer.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "omniflix1invalid" }
    },
    {
      user: "{{FlixAgent}}",
      content: { text: "Please provide a valid Omniflix address for the transfer request. The address should start with 'omniflix' and contain the correct number of characters." }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Send 500 FLIX to omniflix1ghi789..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll check your balance and process the transfer.",
        action: "SEND_TOKENS"
      }
    },
    {
      user: "{{FlixAgent}}",
      content: { text: "Error transferring tokens: Insufficient funds in the sender account" }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Can you send some FLIX for me?" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you send FLIX. Please specify how many tokens you want to send and the recipient address.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "I want to send 250 FLIX to omniflix1pqr456..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll process the transfer of 250 FLIX to omniflix1pqr456...",
        action: "SEND_TOKENS"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Can you send some tokens?" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'm sorry, but I can't perform that action. Please provide a valid address and amount to send tokens.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "Omniflix1abc123..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "You have provided recipient address. Please provide the amount of tokens to send.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "100 FLIX" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll process the transfer of 100 FLIX to omniflix1abc123 using authz account.",
        action: "SEND_TOKENS"
      }
    }
  ]
];

// src/actions/bank/send_tokens.ts
function isSendTokensContent(content) {
  let msg = "";
  if (!content.recipient) {
    msg += "Please provide a recipient address for the transfer request.";
  } else {
    try {
      const { prefix } = bech32.decode(content.recipient);
      if (prefix !== "omniflix") {
        msg += "Please provide a valid Omniflix address for the transfer request.";
      }
    } catch {
      msg += "Please provide a valid Omniflix address for the transfer request.";
    }
  }
  if (!content.amount) {
    msg += "Please provide an amount for the transfer request.";
  }
  if (!content.denom) {
    msg += "Please provide a denom for the transfer request.";
  }
  if (msg !== "") {
    return {
      success: false,
      message: msg
    };
  }
  return {
    success: true,
    message: "Transfer request is valid."
  };
}
var sendTokensTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "recipient": "omniflix1abc123...",
    "amount": "100",
    "denom": "uflix",
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token transfer:
- recipient wallet address mentioned in the current message
- amount to transfer mentioned in the current message
- denom (uflix/FLIX/flix) mentioned in the current message

Respond with a JSON markdown block containing only the extracted values.`;
var SendTokensAction = class {
  async transfer(params, runtime, message, state) {
    try {
      const wallet = await walletProvider.get(
        runtime,
        message,
        state
      );
      const bankProvider = new BankProvider(wallet);
      let url = runtime.getSetting("OMNIFLIX_API_URL") || process.env.OMNIFLIX_API_URL;
      if (!url) {
        url = "https://rest.omniflix.network";
      }
      if (params.denom === "FLIX" || params.denom === "flix") {
        params.denom = "uflix";
        if (typeof params.amount === "number") {
          params.amount = params.amount * 1e6;
        } else if (typeof params.amount === "string") {
          params.amount = Number.parseInt(params.amount) * 1e6;
        }
      }
      const txHash = await bankProvider.sendTokens(params.recipient, {
        amount: params.amount.toString(),
        denom: params.denom
      });
      return txHash.transactionHash;
    } catch (error) {
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }
};
var buildTransferDetails = async (runtime, message, state) => {
  let currentState = state;
  if (!currentState) {
    currentState = await runtime.composeState(message);
  }
  currentState = await runtime.updateRecentMessageState(currentState);
  const transferContext = composeContext({
    state: currentState,
    template: sendTokensTemplate
  });
  const content = await generateObjectDeprecated({
    runtime,
    context: transferContext,
    modelClass: ModelClass.SMALL
  });
  const transferContent = content;
  return transferContent;
};
var send_tokens_default2 = {
  name: "SEND_TOKENS",
  similes: [
    "send tokens",
    "send FLIX",
    "send FLIX to {address}",
    "send FLIX to {address} from my omniflix address",
    "send {amount} FLIX to {address}",
    "send {amount} FLIX to {address} from my omniflix address"
  ],
  description: "Send tokens to a specified omniflix address.",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger4.log("Starting SEND_TOKENS handler...");
    const transferDetails = await buildTransferDetails(
      runtime,
      message,
      state
    );
    const validationResult = isSendTokensContent(transferDetails);
    if (!validationResult.success) {
      if (callback) {
        callback({
          text: validationResult.message,
          content: { error: validationResult.message }
        });
      }
      return false;
    }
    try {
      const action = new SendTokensAction();
      const txHash = await action.transfer(
        transferDetails,
        runtime,
        message,
        state
      );
      state = await runtime.updateRecentMessageState(state);
      if (callback) {
        let displayAmount = transferDetails.amount;
        let displayDenom = transferDetails.denom;
        if (transferDetails.denom === "uflix") {
          displayAmount = transferDetails.amount / 1e6;
          displayDenom = "FLIX";
        }
        callback({
          text: `Successfully transferred ${displayAmount} ${displayDenom} to ${transferDetails.recipient}, Transaction: ${txHash}`,
          content: {
            success: true,
            hash: txHash,
            amount: displayAmount,
            recipient: transferDetails.recipient,
            denom: displayDenom,
            ...transferDetails
          }
        });
      }
      return true;
    } catch (error) {
      if (callback) {
        callback({
          text: `Error transferring tokens: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  template: sendTokensTemplate,
  validate: async (_runtime) => {
    return true;
  },
  examples: send_tokens_default
};

// src/actions/bank/stake_balance.ts
import {
  elizaLogger as elizaLogger5
} from "@elizaos/core";

// src/action_examples/bank/stake_balance.ts
var stake_balance_default = [
  [
    {
      user: "{{user1}}",
      content: { text: "What is my staked balance of my wallet?" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Sure thing, I'll check that for you.",
        action: "GET_STAKE_BALANCE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Check delegated balance for my wallet" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll check delegated balance for that address right away.",
        action: "GET_STAKE_BALANCE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Can you tell me how many FLIX I have delegated?" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll look up your delegated balance now.",
        action: "GET_STAKE_BALANCE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Show me the delegated balance of my wallet" }
    },
    {
      user: "{{FlixAgent}}",
      content: { text: "Let me fetch that delegated balance information for you." }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "What's my total FLIX holdings including delegated amount?" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll check both your regular and delegated balances.",
        action: "GET_STAKE_BALANCE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "I want to check my delegated balance" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Let me check that for you.",
        action: "GET_STAKE_BALANCE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "How much FLIX do I have delegated ?" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Let me check that for you.",
        action: "GET_STAKE_BALANCE"
      }
    }
  ]
];

// src/actions/bank/stake_balance.ts
var GetStakeBalanceAction = class {
  async getStakedBalance(runtime, message, state) {
    try {
      const messageText = message.content?.text?.toLowerCase() || "";
      const addressMatch = messageText.match(/omniflix[a-zA-Z0-9]{39}/);
      let queryAddress;
      if (addressMatch) {
        queryAddress = addressMatch[0];
      } else {
        const wallet2 = await walletProvider.get(
          runtime,
          message,
          state
        );
        queryAddress = await wallet2.getAddress();
      }
      const wallet = await walletProvider.get(
        runtime,
        message,
        state
      );
      const client = await wallet.getClient();
      elizaLogger5.info(
        `Checking staked balance for address: ${queryAddress}`
      );
      const balance = await client.getBalanceStaked(queryAddress);
      if (!balance) {
        return {
          balance: 0,
          address: queryAddress
        };
      }
      const balanceInFLIX = Number(balance.amount) / 10 ** 6;
      elizaLogger5.info(
        `Staked balance of ${queryAddress} is ${balanceInFLIX} FLIX`
      );
      return {
        balance: balanceInFLIX,
        address: queryAddress
      };
    } catch (error) {
      throw new Error(`Staked balance check failed: ${error.message}`);
    }
  }
};
var stake_balance_default2 = {
  name: "GET_STAKE_BALANCE",
  description: "Retrieve the staked balance of a specified blockchain address in FLIX tokens.",
  similes: [
    "check staked balance",
    "staked balance inquiry",
    "account staked balance"
  ],
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger5.log("Starting GET_STAKE_BALANCE handler...");
    try {
      const action = new GetStakeBalanceAction();
      const stakedBalance = await action.getStakedBalance(
        runtime,
        message,
        state
      );
      if (callback) {
        callback({
          text: `Successfully retrieved staked balance of ${stakedBalance.address}
Staked Balance: ${stakedBalance.balance} FLIX`,
          content: {
            success: true,
            amount: stakedBalance.balance,
            address: stakedBalance.address
          }
        });
      }
      return true;
    } catch (error) {
      if (callback) {
        callback({
          text: `Error checking staked balance: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  validate: async (_runtime) => {
    return true;
  },
  examples: stake_balance_default
};

// src/actions/bank/index.ts
var bankActions = [balance_default2, send_tokens_default2, stake_balance_default2];

// src/actions/staking/delegate_token.ts
import {
  elizaLogger as elizaLogger7,
  composeContext as composeContext2,
  ModelClass as ModelClass2,
  generateObjectDeprecated as generateObjectDeprecated2
} from "@elizaos/core";

// src/providers/staking.ts
import { elizaLogger as elizaLogger6 } from "@elizaos/core";
var StakingProvider = class {
  wallet;
  constructor(wallet) {
    this.wallet = wallet;
  }
  async delegate(validator_address, amount) {
    const address = await this.wallet.getAddress();
    if (!address) {
      throw new Error("Could not get address");
    }
    try {
      const client = await this.wallet.getClient();
      const tx = await client.delegateTokens(
        address,
        validator_address,
        amount,
        "auto",
        "Delegated tokens using Eliza"
      );
      return tx;
    } catch (e) {
      elizaLogger6.error(`Error in delegate: ${e}`);
      throw e;
    }
  }
  async undelegate(validator_address, amount) {
    const address = await this.wallet.getAddress();
    if (!address) {
      throw new Error("Could not get address");
    }
    try {
      const client = await this.wallet.getClient();
      const tx = await client.undelegateTokens(
        address,
        validator_address,
        amount,
        "auto",
        "Undelegated tokens using Eliza"
      );
      return tx;
    } catch (e) {
      elizaLogger6.error(`Error in undelegate: ${e}`);
      throw e;
    }
  }
  async redelegate(validator_src_address, validator_dst_address, amount) {
    const address = await this.wallet.getAddress();
    if (!address) {
      throw new Error("Could not get address");
    }
    const msg = {
      typeUrl: "/cosmos.staking.v1beta1.MsgBeginRedelegate",
      value: {
        delegatorAddress: address.trim(),
        validatorSrcAddress: validator_src_address.trim(),
        validatorDstAddress: validator_dst_address.trim(),
        amount
      }
    };
    try {
      const client = await this.wallet.getClient();
      const tx = await client.signAndBroadcast(
        address,
        [msg],
        "auto",
        "Redelegated tokens using Eliza"
      );
      return tx;
    } catch (e) {
      elizaLogger6.error(`Error in redelegate: ${e}`);
      throw e;
    }
  }
  async cancelUnbondingDelegation(validator_address, creation_height, amount) {
    const address = await this.wallet.getAddress();
    if (!address) {
      throw new Error("Could not get address");
    }
    const msg = {
      typeUrl: "/cosmos.staking.v1beta1.MsgCancelUnbondingDelegation",
      value: {
        delegatorAddress: address.trim(),
        validatorAddress: validator_address.trim(),
        amount,
        creationHeight: BigInt(creation_height)
      }
    };
    try {
      const client = await this.wallet.getClient();
      const tx = await client.signAndBroadcast(
        address.trim(),
        [msg],
        "auto",
        "Cancelled unbonding delegation using Eliza"
      );
      return tx;
    } catch (e) {
      elizaLogger6.error(`Error in cancelUnbondingDelegation: ${e}`);
      throw e;
    }
  }
};

// src/actions/staking/delegate_token.ts
import { bech32 as bech322 } from "bech32";

// src/action_examples/staking/delegate_token.ts
var delegate_token_default = [
  [
    {
      user: "{{user1}}",
      content: { text: "Delegate 100 FLIX to omniflixvaloper1abc123..., please let me know when it's done." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll delegate 100 FLIX to that address right away.",
        action: "DELEGATE_TOKEN"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "I want to delegate 50 FLIX to validator omniflixvaloper1abc123def456..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll process your delegation request of 50 FLIX now.",
        action: "DELEGATE_TOKEN"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Can you delegate 75 FLIX to omniflixvaloper1xyz789..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll process your delegation request of 75 FLIX now.",
        action: "DELEGATE_TOKEN"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "delegate FLIX" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I need more information to process your delegation request. Please provide:\n1. The amount of FLIX you want to delegate\n2. The validator address (starting with 'omniflixvaloper')",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "I want to delegate 200 FLIX to omniflixvaloper1def..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll process your delegation request of 200 FLIX now.",
        action: "DELEGATE_TOKEN"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "delegate 1000000 FLIX to omniflixvaloper1ghi..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Processing your delegation of 1000000 FLIX now.",
        action: "DELEGATE_TOKEN"
      }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'm sorry, but it seems like you don't have enough FLIX to delegate. Please check your balance and try again.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "Okay, can you delegate 100 FLIX instead?" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll process your delegation request of 100 FLIX now.",
        action: "DELEGATE_TOKEN"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "delegate 100 FLIX to invalidaddress123" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "The validator address you provided is invalid. A valid validator address should start with 'omniflixvaloper'. Please provide a correct validator address.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "How do I find validator addresses?" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "You can find validator addresses on the OmniFlix Network explorer or through the official OmniFlix staking interface. Would you like me to provide more information about finding validators?",
        action: "NONE"
      }
    }
  ]
];

// src/actions/staking/delegate_token.ts
function isDelegateTokensContent(content) {
  let msg = "";
  if (!content.validator_address) {
    msg += "Please provide a validator address for the delegation request.";
  } else {
    try {
      const { prefix } = bech322.decode(
        content.validator_address
      );
      if (prefix !== "omniflixvaloper") {
        msg += "Please provide a valid Omniflix validator address for the delegation request.";
      }
    } catch (error) {
      msg += "Please provide a valid Omniflix validator address for the delegation request.";
    }
  }
  if (!content.amount) {
    msg += "Please provide an amount for the delegation request.";
  }
  if (!content.denom) {
    msg += "Please provide a denom for the delegation request.";
  }
  if (msg !== "") {
    return {
      success: false,
      message: msg
    };
  }
  return {
    success: true,
    message: "Delegation request is valid."
  };
}
var delegateTokensTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "validator_address": "omniflixvaloper...",
    "amount": "100",
    "denom": "uflix"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token delegation:
- validator_address mentioned in the current message
- amount to delegate mentioned in the current message
- denom mentioned in the current message or recent messages (if any)

Respond with a JSON markdown block containing only the extracted values.`;
var DelegateTokensAction = class {
  async delegate(params, runtime, message, state) {
    try {
      const wallet = await walletProvider.get(
        runtime,
        message,
        state
      );
      const stakingProvider = new StakingProvider(wallet);
      if (params.denom === "FLIX" || params.denom === "flix") {
        params.denom = "uflix";
        if (typeof params.amount === "number") {
          params.amount = params.amount * 1e6;
        } else if (typeof params.amount === "string") {
          params.amount = Number.parseInt(params.amount) * 1e6;
        }
      }
      const txHash = await stakingProvider.delegate(
        params.validator_address,
        {
          amount: params.amount.toString(),
          denom: params.denom
        }
      );
      return txHash.transactionHash;
    } catch (error) {
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }
};
var buildDelegateTokensContent = async (runtime, message, state) => {
  let currentState = state;
  if (!currentState) {
    currentState = await runtime.composeState(message);
  }
  currentState = await runtime.updateRecentMessageState(currentState);
  const delegateContext = composeContext2({
    state: currentState,
    template: delegateTokensTemplate
  });
  const content = await generateObjectDeprecated2({
    runtime,
    context: delegateContext,
    modelClass: ModelClass2.SMALL
  });
  const delegateContent = content;
  return delegateContent;
};
var delegate_token_default2 = {
  name: "TOKENS_DELEGATE",
  similes: [
    "^delegate\\b(?!.*undelegate)(?!.*redelegate)",
    "^delegate_tokens\\b(?!.*undelegate)(?!.*redelegate)",
    "^delegate_FLIX\\b(?!.*undelegate)(?!.*redelegate)",
    "^delegate\\s+FLIX\\s+to(?!.*undelegate)(?!.*redelegate)"
  ],
  description: "Delegate tokens to a specified omniflix validator address.",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger7.log("Starting TOKENS_DELEGATE handler...");
    const delegateContent = await buildDelegateTokensContent(
      runtime,
      message,
      state
    );
    const validationResult = isDelegateTokensContent(delegateContent);
    if (!validationResult.success) {
      if (callback) {
        callback({
          text: validationResult.message,
          content: { error: validationResult.message }
        });
      }
      return false;
    }
    try {
      const action = new DelegateTokensAction();
      const txHash = await action.delegate(
        delegateContent,
        runtime,
        message,
        state
      );
      state = await runtime.updateRecentMessageState(state);
      if (callback) {
        if (delegateContent.denom === "uflix") {
          delegateContent.amount = delegateContent.amount / 1e6;
        }
        callback({
          text: `Successfully delegated ${delegateContent.amount} FLIX to ${delegateContent.validator_address}
TxHash: ${txHash}`,
          content: {
            success: true,
            hash: txHash,
            amount: delegateContent.amount,
            validator_address: delegateContent.validator_address
          }
        });
      }
      return true;
    } catch (error) {
      if (callback) {
        callback({
          text: `Error occurred during TOKENS_DELEGATE please try again later with valid details.`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  template: delegateTokensTemplate,
  validate: async (_runtime) => {
    return true;
  },
  examples: delegate_token_default
};

// src/actions/staking/undelegate_token.ts
import {
  elizaLogger as elizaLogger8,
  composeContext as composeContext3,
  ModelClass as ModelClass3,
  generateObjectDeprecated as generateObjectDeprecated3
} from "@elizaos/core";
import { bech32 as bech323 } from "bech32";

// src/action_examples/staking/undelegate_token.ts
var undelegate_token_default = [
  [
    {
      user: "{{user1}}",
      content: { text: "undelegate 100 FLIX from omniflixvaloper1abc123..., please let me know when it's done." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll undelegate 100 FLIX from that address right away.",
        action: "TOKENS_UNDELEGATE"
      }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'm sorry, but it seems that validator omniflixvaloper1xyz... is not a valid validator. Please provide a valid validator address.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "omniflixvaloper1abc123..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you undelegate 100 FLIX from omniflixvaloper1abc123...",
        action: "TOKENS_UNDELEGATE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "When will I receive my tokens?" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Your tokens will be available after a 21-day unbonding period. This is a network rule to maintain stability. I'll notify you when they're ready to use.",
        action: "NONE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "I want to undelegate 50 FLIX from validator omniflixvaloper1abc123def456..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you undelegate 50 FLIX from that validator. Processing your request now.",
        action: "TOKENS_UNDELEGATE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "I want to undelegate another 30 FLIX from the same validator" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'm sorry, but it seems that the amount you want to undelegate is greater than your current delegation. Please provide a valid amount.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "10 FLIX" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you undelegate 10 FLIX from omniflixvaloper1abc123def456...",
        action: "TOKENS_UNDELEGATE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "undelegate FLIX" }
    },
    {
      user: "{{FlixAgent}}",
      content: { text: "I need more information to process your undelegation request. Please provide:\n1. The amount of FLIX you want to undelegate\n2. The validator address (starting with 'omniflixvaloper')" }
    },
    {
      user: "{{user1}}",
      content: { text: "I want to undelegate 200 FLIX from omniflixvaloper1xyz..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Processing your undelegation of 200 FLIX now.",
        action: "TOKENS_UNDELEGATE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "Let me undelegate 100 more FLIX from omniflixvaloper1xyz..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Processing the undelegation of 100 FLIX now.",
        action: "TOKENS_UNDELEGATE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "undelegate 100 FLIX from invalidaddress123" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "The validator address you provided (invalidaddress123) is invalid. A valid validator address should start with 'omniflixvaloper'. Please provide a correct validator address.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "How can I find the correct validator address?" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "You can find validator addresses on the OmniFlix Network explorer or through the official OmniFlix staking interface. Would you like me to provide more information about finding validators?",
        action: "NONE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "undelegate 1000000 FLIX from omniflixvaloper1ghi..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I cannot process this undelegation. The requested amount (1000000 FLIX) exceeds your delegated balance with this validator. Please check your delegated balance and try again with a smaller amount.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "What is my delegated balance with that validator?" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Your delegated balance with validator omniflixvaloper1ghi... is 10000 FLIX. Would you like to undelegate a smaller amount?",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "Yes, let me undelegate 5000 FLIX instead" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Processing the undelegation of 5000 FLIX now.",
        action: "TOKENS_UNDELEGATE"
      }
    }
  ]
];

// src/actions/staking/undelegate_token.ts
function isUndelegateTokensContent(content) {
  let msg = "";
  if (!content.validator_address) {
    msg += "Please provide a validator address for the undelegation request.";
  } else {
    try {
      const { prefix } = bech323.decode(
        content.validator_address
      );
      if (prefix !== "omniflixvaloper") {
        msg += "Please provide a valid Omniflix validator address for the undelegation request.";
      }
    } catch {
      msg += "Please provide a valid Omniflix validator address for the undelegation request.";
    }
  }
  if (!content.amount) {
    msg += "Please provide an amount for the undelegation request.";
  }
  if (!content.denom) {
    msg += "Please provide a denom for the undelegation request.";
  }
  if (msg !== "") {
    return {
      success: false,
      message: msg
    };
  }
  return {
    success: true,
    message: "Undelegation request is valid."
  };
}
var undelegateTokensTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "validator_address": "omniflixvaloper...",
    "amount": "100",
    "denom": "FLIX"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token undelegation:
- validator_address mentioned in the current message
- amount to undelegate mentioned in the current message
- denom(uflix/flix/FLIX) mentioned in the current message or recent messages (if any)

Respond with a JSON markdown block containing only the extracted values.`;
var UndelegateTokensAction = class {
  async undelegate(params, runtime, message, state) {
    try {
      const wallet = await walletProvider.get(
        runtime,
        message,
        state
      );
      const stakingProvider = new StakingProvider(wallet);
      if (params.denom === "FLIX" || params.denom === "flix") {
        params.denom = "uflix";
        if (typeof params.amount === "number") {
          params.amount = params.amount * 1e6;
        } else if (typeof params.amount === "string") {
          params.amount = Number.parseInt(params.amount) * 1e6;
        }
      }
      const txHash = await stakingProvider.undelegate(
        params.validator_address,
        {
          amount: params.amount.toString(),
          denom: params.denom
        }
      );
      return txHash.transactionHash;
    } catch (error) {
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }
};
var buildUndelegateTokensContent = async (runtime, message, state) => {
  let currentState = state;
  if (!currentState) {
    currentState = await runtime.composeState(message);
  }
  currentState = await runtime.updateRecentMessageState(currentState);
  const undelegateContext = composeContext3({
    state: currentState,
    template: undelegateTokensTemplate
  });
  const content = await generateObjectDeprecated3({
    runtime,
    context: undelegateContext,
    modelClass: ModelClass3.SMALL
  });
  const undelegateContent = content;
  return undelegateContent;
};
var undelegate_token_default2 = {
  name: "TOKENS_UNDELEGATE",
  similes: [
    "^undelegate\\b",
    "^undelegate_tokens\\b",
    "^undelegate_FLIX\\b",
    "^undelegate\\s+FLIX\\s+from",
    "^remove_delegation",
    "^withdraw_delegation"
  ],
  description: "Undelegate tokens from a specified omniflix validator address.",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger8.log("Starting TOKENS_UNDELEGATE handler...");
    const undelegateContent = await buildUndelegateTokensContent(
      runtime,
      message,
      state
    );
    const validationResult = isUndelegateTokensContent(undelegateContent);
    if (!validationResult.success) {
      if (callback) {
        callback({
          text: validationResult.message,
          content: { error: validationResult.message }
        });
      }
      return false;
    }
    try {
      const action = new UndelegateTokensAction();
      const txHash = await action.undelegate(
        undelegateContent,
        runtime,
        message,
        state
      );
      state.memo = undelegateContent.memo;
      state = await runtime.updateRecentMessageState(state);
      if (callback) {
        if (undelegateContent.denom === "uflix") {
          undelegateContent.amount = undelegateContent.amount / 1e6;
        }
        callback({
          text: `Successfully undelegated ${undelegateContent.amount} FLIX from ${undelegateContent.validator_address}
TxHash: ${txHash}`,
          content: {
            success: true,
            hash: txHash,
            amount: undelegateContent.amount,
            validator_address: undelegateContent.validator_address
          }
        });
      }
      return true;
    } catch (error) {
      if (callback) {
        callback({
          text: `Error transferring tokens: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  template: undelegateTokensTemplate,
  validate: async (_runtime) => {
    return true;
  },
  examples: undelegate_token_default
};

// src/actions/staking/redelegate.ts
import {
  elizaLogger as elizaLogger9,
  composeContext as composeContext4,
  ModelClass as ModelClass4,
  generateObjectDeprecated as generateObjectDeprecated4
} from "@elizaos/core";
import { bech32 as bech324 } from "bech32";

// src/action_examples/staking/redelegate.ts
var redelegate_default = [
  [
    {
      user: "{{user1}}",
      content: { text: "Redelegate 100 FLIX from omniflixvaloper1abc123... to omniflixvaloper1def456..., please let me know when it's done." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll redelegate 100 FLIX from that address right away.",
        action: "TOKENS_REDELEGATE"
      }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'm sorry, but it seems that validator omniflixvaloper1xyz... is not a valid validator. Please provide a valid validator address.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "omniflixvaloper1abc123..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you redelegate 100 FLIX from omniflixvaloper1abc123... to omniflixvaloper1def456...",
        action: "TOKENS_REDELEGATE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "How long until I can redelegate these tokens again?" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "There is a 21-day waiting period before you can redelegate these tokens again. This is a network rule to maintain stability.",
        action: "NONE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "I want to redelegate 50 FLIX from validator omniflixvaloper1abc123... to validator omniflixvaloper1def456..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you redelegate 50 FLIX from that validator. Processing your request now.",
        action: "TOKENS_REDELEGATE"
      }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'm sorry, but the amount of FLIX you provided is invalid. Please provide a valid amount of FLIX.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "50 FLIX" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you redelegate 50 FLIX from omniflixvaloper1abc123... to omniflixvaloper1def456...",
        action: "TOKENS_REDELEGATE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Can you redelegate 75 FLIX from omniflixvaloper1abc123... to omniflixvaloper1xyz789..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll process your redelegation request of 75 FLIX now.",
        action: "TOKENS_REDELEGATE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "redelegate FLIX" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I need more information to process your redelegation request. Please provide:\n1. The amount of FLIX you want to redelegate\n2. The source validator address (starting with 'omniflixvaloper')\n3. The destination validator address (starting with 'omniflixvaloper')",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "I want to redelegate 200 FLIX from omniflixvaloper1xyz... to omniflixvaloper1pqr..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Processing your redelegation of 200 FLIX now.",
        action: "TOKENS_REDELEGATE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "redelegate 100 FLIX from invalidaddress123 to omniflixvaloper1def..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "The source validator address you provided (invalidaddress123) is invalid. A valid validator address should start with 'omniflixvaloper'. Please provide a correct validator address.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "How can I find the correct validator address?" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "You can find validator addresses on the OmniFlix Network explorer or through the official OmniFlix staking interface. Would you like me to provide more information about finding validators?",
        action: "NONE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "redelegate 1000000 FLIX from omniflixvaloper1abc... to omniflixvaloper1def..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I cannot process this redelegation. The requested amount (1000000 FLIX) exceeds your delegated balance with the source validator. Please check your delegated balance and try again with a smaller amount.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "What is my delegated balance?" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Sure, Let me check your delegated balance.",
        action: "GET_BALANCE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "redelegate 50 FLIX from omniflixvaloper1abc... to omniflixvaloper1def..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you redelegate 50 FLIX from omniflixvaloper1abc... to omniflixvaloper1def...",
        action: "TOKENS_REDELEGATE"
      }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I apologize, but it seems these tokens were redelegated recently. You need to wait for the 21-day cooling period to complete before redelegating these tokens again.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "Can I delegate to a different validator instead?" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Yes, you can make a new delegation to any validator using your available (non-staked) FLIX tokens. Would you like to do that instead?",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "Yes, I want to delegate to a different validator." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Great! I'll help you delegate to a different validator. Please provide the new validator address and the amount of FLIX you want to delegate.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "omniflixvaloper1abc123..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you delegate 50 FLIX to omniflixvaloper1abc123...",
        action: "TOKENS_REDELEGATE"
      }
    }
  ]
];

// src/actions/staking/redelegate.ts
function isRedelegateTokensContent(content) {
  let msg = "";
  if (!content.validator_src_address) {
    msg += "Please provide a validator source address for the redelegation request.";
  } else {
    try {
      const { prefix } = bech324.decode(
        content.validator_src_address
      );
      if (prefix !== "omniflixvaloper") {
        msg += "Please provide a valid Omniflix validator source address for the redelegation request.";
      }
    } catch {
      msg += "Please provide a valid Omniflix validator source address for the redelegation request.";
    }
  }
  if (!content.validator_dst_address) {
    msg += "Please provide a validator destination address for the redelegation request.";
  } else {
    try {
      const { prefix } = bech324.decode(
        content.validator_dst_address
      );
      if (prefix !== "omniflixvaloper") {
        msg += "Please provide a valid Omniflix validator destination address for the redelegation request.";
      }
    } catch (error) {
      msg += "Please provide a valid Omniflix validator destination address for the redelegation request.";
    }
  }
  if (!content.amount) {
    msg += "Please provide an amount for the redelegation request.";
  }
  if (!content.denom) {
    msg += "Please provide a denom for the redelegation request.";
  }
  if (msg !== "") {
    return {
      success: false,
      message: msg
    };
  }
  return {
    success: true,
    message: "Redelegation request is valid."
  };
}
var redelegateTokensTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "validator_src_address": "omniflixvaloper...",
    "validator_dst_address": "omniflixvaloper...",
    "amount": "100",
    "denom": "uflix"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token redelegation:
- validator_src_address mentioned in the current message
- validator_dst_address mentioned in the current message
- amount to redelegate mentioned in the current message
- denom(uflix/flix/FLIX) mentioned in the current message or recent messages (if any)

Respond with a JSON markdown block containing only the extracted values.`;
var RedelegateTokensAction = class {
  async redelegate(params, runtime, message, state) {
    try {
      const wallet = await walletProvider.get(
        runtime,
        message,
        state
      );
      const stakingProvider = new StakingProvider(wallet);
      if (params.denom === "FLIX" || params.denom === "flix") {
        params.denom = "uflix";
        if (typeof params.amount === "number") {
          params.amount = params.amount * 1e6;
        } else if (typeof params.amount === "string") {
          params.amount = Number.parseInt(params.amount) * 1e6;
        }
      }
      const txHash = await stakingProvider.redelegate(
        params.validator_src_address,
        params.validator_dst_address,
        {
          amount: params.amount.toString(),
          denom: params.denom
        }
      );
      return txHash.transactionHash;
    } catch (error) {
      throw new Error(`Transfer failed: ${error.message}`);
    }
  }
};
var buildRedelegateDetails = async (runtime, message, state) => {
  let currentState = state;
  if (!currentState) {
    currentState = await runtime.composeState(message);
  }
  currentState = await runtime.updateRecentMessageState(currentState);
  const redelegateContext = composeContext4({
    state: currentState,
    template: redelegateTokensTemplate
  });
  const content = await generateObjectDeprecated4({
    runtime,
    context: redelegateContext,
    modelClass: ModelClass4.SMALL
  });
  const redelegateContent = content;
  return redelegateContent;
};
var redelegate_default2 = {
  name: "TOKENS_REDELEGATE",
  similes: [
    "^redelegate\\b(?!.*undelegate)(?!.*delegate\\b)",
    "^redelegate_tokens\\b(?!.*undelegate)(?!.*delegate\\b)",
    "^redelegate_FLIX\\b(?!.*undelegate)(?!.*delegate\\b)",
    "^redelegate\\s+FLIX\\s+to(?!.*undelegate)(?!.*delegate\\b)"
  ],
  description: "Redelegate tokens to a specified omniflix validator address.",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger9.log("Starting TOKENS_REDELEGATE handler...");
    const redelegateDetails = await buildRedelegateDetails(
      runtime,
      message,
      state
    );
    const validationResult = isRedelegateTokensContent(redelegateDetails);
    if (!validationResult.success) {
      if (callback) {
        callback({
          text: validationResult.message,
          content: { error: validationResult.message }
        });
      }
      return false;
    }
    try {
      const action = new RedelegateTokensAction();
      const txHash = await action.redelegate(
        redelegateDetails,
        runtime,
        message,
        state
      );
      state = await runtime.updateRecentMessageState(state);
      if (callback) {
        if (redelegateDetails.denom === "uflix") {
          redelegateDetails.amount = redelegateDetails.amount / 1e6;
        }
        callback({
          text: `Successfully delegated ${redelegateDetails.amount} FLIX from ${redelegateDetails.validator_src_address} to ${redelegateDetails.validator_dst_address}
TxHash: ${txHash}`,
          content: {
            success: true,
            hash: txHash,
            amount: redelegateDetails.amount,
            validator_src_address: redelegateDetails.validator_src_address,
            validator_dst_address: redelegateDetails.validator_dst_address
          }
        });
      }
      return true;
    } catch (error) {
      if (callback) {
        callback({
          text: `Error redelegating tokens: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  template: redelegateTokensTemplate,
  validate: async (_runtime) => {
    return true;
  },
  examples: redelegate_default
};

// src/actions/staking/cancel_unbonding.ts
import {
  elizaLogger as elizaLogger10,
  composeContext as composeContext5,
  ModelClass as ModelClass5,
  generateObjectDeprecated as generateObjectDeprecated5
} from "@elizaos/core";
import { bech32 as bech325 } from "bech32";

// src/action_examples/staking/cancel_unbonding.ts
var cancel_unbonding_default = [
  [
    {
      user: "{{user1}}",
      content: { text: "Cancel unbonding delegation of 100 FLIX to omniflixvaloper1abc123..., please let me know when it's done." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll cancel unbonding delegation of 100 FLIX to that validator right away.",
        action: "CANCEL_UNBONDING"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "I want to cancel unbonding delegation of 50 FLIX to validator omniflixvaloper1abc123def456..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you cancel unbonding delegation of 50 FLIX to that validator.",
        action: "CANCEL_UNBONDING"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Can you cancel unbonding delegation of 75 FLIX to omniflixvaloper1xyz789..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll proceed to cancel unbonding delegation of 75 FLIX to that address.",
        action: "CANCEL_UNBONDING"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Cancel unbonding" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you cancel an unbonding delegation. Please provide:\n1. The amount of FLIX to cancel unbonding\n2. The validator address",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "100 FLIX" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Please provide the validator address.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "omniflixvaloper1abc123..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll proceed to cancel unbonding delegation of 100 FLIX to that address.",
        action: "CANCEL_UNBONDING"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Cancel unbonding of -50 FLIX to omniflixvaloper1abc123..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Invalid amount. The amount of FLIX to cancel unbonding must be a positive number.",
        action: "NONE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Cancel unbonding of 100 FLIX to invalid_validator" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "The validator address 'invalid_validator' is not a valid Omniflix validator address. Please provide a valid validator address starting with 'omniflixvaloper1'.",
        action: "NONE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Cancel unbonding of 50 FLIX to omniflixvaloper1def456..." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll proceed to cancel unbonding delegation of 50 FLIX to that address.",
        action: "CANCEL_UNBONDING"
      }
    }
  ]
];

// src/actions/staking/cancel_unbonding.ts
function isCancelUnbondingContent(content) {
  let msg = "";
  if (!content.validator_address) {
    msg += "Missing validator address.";
  } else {
    try {
      const { prefix } = bech325.decode(
        content.validator_address
      );
      if (prefix !== "omniflixvaloper") {
        msg += "Invalid validator address.";
      }
    } catch (error) {
      msg += "Invalid validator address.";
    }
  }
  if (!content.amount) {
    msg += "Missing amount.";
  }
  if (!content.denom) {
    msg += "Missing denom.";
  }
  if (!content.creation_height) {
    msg += "Missing creation height of unbonding delegation.";
  }
  if (msg !== "") {
    return {
      success: false,
      message: msg
    };
  }
  return {
    success: true,
    message: "Unbonding delegation request is valid."
  };
}
var cancelUnbondingTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "validator_address": "omniflixvaloper...",
    "amount": "100",
    "denom": "uflix",
    "creation_height": 123456
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested unbonding delegation cancellation:
- validator_address mentioned in the current message
- amount to unbond mentioned in the current message
- denom mentioned in the current message or recent messages (if any)
- creation_height mentioned in the current message or recent messages (if any)

Respond with a JSON markdown block containing only the extracted values.`;
var CancelUnbondingAction = class {
  async cancelUnbonding(params, runtime, message, state) {
    try {
      const wallet = await walletProvider.get(
        runtime,
        message,
        state
      );
      const stakingProvider = new StakingProvider(wallet);
      if (params.denom === "FLIX" || params.denom === "flix") {
        params.denom = "uflix";
        if (typeof params.amount === "number") {
          params.amount = params.amount * 1e6;
        } else if (typeof params.amount === "string") {
          params.amount = Number.parseInt(params.amount) * 1e6;
        }
      }
      const txHash = await stakingProvider.cancelUnbondingDelegation(
        params.validator_address,
        params.creation_height,
        {
          amount: params.amount.toString(),
          denom: params.denom
        }
      );
      return txHash.transactionHash;
    } catch (error) {
      throw new Error(
        `Unbonding delegation cancellation failed: ${error.message}`
      );
    }
  }
};
var buildCancelUnbondingContent = async (runtime, message, state) => {
  let currentState = state;
  if (!currentState) {
    currentState = await runtime.composeState(message);
  }
  currentState = await runtime.updateRecentMessageState(currentState);
  const cancelUnbondingContext = composeContext5({
    state: currentState,
    template: cancelUnbondingTemplate
  });
  const content = await generateObjectDeprecated5({
    runtime,
    context: cancelUnbondingContext,
    modelClass: ModelClass5.SMALL
  });
  const cancelUnbondingContent = content;
  return cancelUnbondingContent;
};
var cancel_unbonding_default2 = {
  name: "CANCEL_UNBONDING",
  similes: ["^cancel$", "^cancel_unbonding$", "^cancel unbonding"],
  description: "Cancel unbonding delegation to a specified omniflix validator address.",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger10.log("Starting CANCEL_UNBONDING handler...");
    const cancelUnbondingContent = await buildCancelUnbondingContent(
      runtime,
      message,
      state
    );
    const validationResult = isCancelUnbondingContent(
      cancelUnbondingContent
    );
    if (!validationResult.success) {
      if (callback) {
        callback({
          text: validationResult.message,
          content: { error: validationResult.message }
        });
      }
      return false;
    }
    try {
      const action = new CancelUnbondingAction();
      const txHash = await action.cancelUnbonding(
        cancelUnbondingContent,
        runtime,
        message,
        state
      );
      state = await runtime.updateRecentMessageState(state);
      if (callback) {
        if (cancelUnbondingContent.denom === "uflix") {
          cancelUnbondingContent.amount = cancelUnbondingContent.amount / 1e6;
        }
        callback({
          text: `Successfully cancelled unbonding delegation of ${cancelUnbondingContent.amount} ${cancelUnbondingContent.denom} to ${cancelUnbondingContent.validator_address}
TxHash: ${txHash}`,
          content: {
            success: true,
            hash: txHash,
            amount: cancelUnbondingContent.amount,
            validator_address: cancelUnbondingContent.validator_address
          }
        });
      }
      return true;
    } catch (error) {
      if (callback) {
        callback({
          text: `Error occurred during TOKENS_UNBONDING please try again later with valid details.`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  template: cancelUnbondingTemplate,
  validate: async (_runtime) => {
    return true;
  },
  examples: cancel_unbonding_default
};

// src/actions/staking/index.ts
var stakingActions = [
  redelegate_default2,
  undelegate_token_default2,
  delegate_token_default2,
  cancel_unbonding_default2
];

// src/actions/gov/vote_on_proposal.ts
import {
  elizaLogger as elizaLogger12
} from "@elizaos/core";

// src/providers/gov.ts
import { elizaLogger as elizaLogger11 } from "@elizaos/core";
import { VoteOption } from "cosmjs-types/cosmos/gov/v1beta1/gov";
var GovProvider = class {
  wallet;
  constructor(wallet) {
    this.wallet = wallet;
  }
  async voteOnProposal(proposalId, vote) {
    try {
      const address = await this.wallet.getAddress();
      const client = await this.wallet.getClient();
      if (!address) {
        throw new Error("Could not get address");
      }
      const voteOption = VoteOption[vote];
      const msg = {
        typeUrl: "/cosmos.gov.v1beta1.MsgVote",
        value: {
          proposalId: BigInt(proposalId),
          voter: address,
          option: VoteOption[voteOption]
        }
      };
      const tx = await client.signAndBroadcast(
        address,
        [msg],
        2e5,
        "Voted on proposal using Eliza"
      );
      return tx;
    } catch (e) {
      elizaLogger11.error(`Error in voteOnProposal: ${e}`);
      throw e;
    }
  }
};

// src/actions/gov/vote_on_proposal.ts
import { VoteOption as VoteOption2 } from "cosmjs-types/cosmos/gov/v1beta1/gov";

// src/action_examples/gov/vote_on_proposal.ts
var vote_on_proposal_default = [
  [
    {
      user: "{{user1}}",
      content: { text: "Vote on proposal 1 with vote vote on option yes" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you vote on proposal 1 with vote VOTE_OPTION_YES.",
        action: "NONE"
      }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you vote on proposal 1 with vote VOTE_OPTION_YES.",
        action: "VOTE_ON_PROPOSAL"
      }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'm sorry, but it seems that the address doesn't have any FLIX tokens to vote.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "I have funded my account FLIX." }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you vote on proposal 1 with vote VOTE_OPTION_YES.",
        action: "VOTE_ON_PROPOSAL"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Vote on proposal 2 with vote vote on option abstain" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you vote on proposal 2 with vote VOTE_OPTION_ABSTAIN.",
        action: "VOTE_ON_PROPOSAL"
      }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "It seems that proposal 2 is voting period completed. Please provide a valid proposal ID.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "1" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you vote on proposal 1 with vote VOTE_OPTION_ABSTAIN.",
        action: "VOTE_ON_PROPOSAL"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Can you vote on proposal 1 with vote vote on option no" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you vote on proposal 1 with vote VOTE_OPTION_NO.",
        action: "VOTE_ON_PROPOSAL"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Vote on proposal 1 with vote vote on option no with veto" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you vote on proposal 1 with vote VOTE_OPTION_NO_WITH_VETO.",
        action: "VOTE_ON_PROPOSAL"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Vote on proposal 999" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you vote on proposal 999.",
        action: "VOTE_ON_PROPOSAL"
      }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I apologize, but proposal 999 doesn't exist. Please verify the proposal ID and try again.",
        action: "NONE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Vote on proposal 4 with invalid option" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Invalid vote option. Please choose one of the following options: yes, no, abstain, or no_with_veto.",
        action: "NONE"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Vote on proposal" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll help you vote. Please provide the following information:\n1. Proposal ID\n2. Vote option (yes, no, abstain, or no_with_veto)",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "123456 yes" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll vote on proposal 1 with vote VOTE_OPTION_YES.",
        action: "VOTE_ON_PROPOSAL"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Vote on proposal 7" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "Please specify your vote option (yes, no, abstain, or no_with_veto) for proposal 7.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "yes" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll vote on proposal 7 with vote VOTE_OPTION_YES.",
        action: "VOTE_ON_PROPOSAL"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Vote yes" }
    },
    {
      user: "{{FlixAgent}}",
      content: { text: "I need the proposal ID to process your vote. Please provide the proposal number you'd like to vote on." }
    },
    {
      user: "{{user1}}",
      content: { text: "123456" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll vote on proposal 1 with vote VOTE_OPTION_YES.",
        action: "VOTE_ON_PROPOSAL"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Vote maybe on proposal 3" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "'Maybe' is not a valid voting option. Please choose from: yes, no, abstain, or no_with_veto.",
        action: "NONE"
      }
    },
    {
      user: "{{user1}}",
      content: { text: "yes" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll vote on proposal 7 with vote VOTE_OPTION_YES.",
        action: "VOTE_ON_PROPOSAL"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Vote yes on proposal 2" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll vote on proposal 2 with vote VOTE_OPTION_YES.",
        action: "VOTE_ON_PROPOSAL"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: { text: "Vote yes on proposal 3" }
    },
    {
      user: "{{FlixAgent}}",
      content: {
        text: "I'll vote on proposal 3 with vote VOTE_OPTION_YES.",
        action: "VOTE_ON_PROPOSAL"
      }
    }
  ]
];

// src/actions/gov/vote_on_proposal.ts
function isVoteOnProposalContent(content) {
  let msg = "";
  if (!content.proposal_id) {
    msg += "Please provide a proposal id for the vote request.";
  }
  if (!content.vote) {
    msg += "Please provide a vote option for the vote request.";
  }
  if (msg !== "") {
    return {
      success: false,
      message: msg
    };
  }
  return {
    success: true,
    message: "Vote on proposal request is valid."
  };
}
var voteOnProposalTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "proposal_id": "1",
    "vote": "VOTE_OPTION_YES",
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested vote on proposal:
- proposal_id mentioned in the current message
- deduce the vote option from the current message using these STRICT rules:
    - VOTE_OPTION_YES: when "yes" is mentioned
    - VOTE_OPTION_ABSTAIN: when "abstain" is mentioned
    - VOTE_OPTION_NO: when "no" is mentioned and "veto" is NOT present
    - VOTE_OPTION_NO_WITH_VETO: ONLY when the phrase "no with veto" appears exactly
    - VOTE_OPTION_UNSPECIFIED: when none of the above conditions are met

CRITICAL: For a NO vote:
- If the message contains "no" WITHOUT the word "veto" \u2192 use VOTE_OPTION_NO
- ONLY use VOTE_OPTION_NO_WITH_VETO if the exact phrase "no with veto" is present

Respond with a JSON markdown block containing only the extracted values.`;
function validateVoteOption(message) {
  const lowercaseMessage = message.toLowerCase();
  if (lowercaseMessage.includes("no with veto")) {
    return VoteOption2.VOTE_OPTION_NO_WITH_VETO;
  } else if (lowercaseMessage.includes("no")) {
    return VoteOption2.VOTE_OPTION_NO;
  } else if (lowercaseMessage.includes("yes")) {
    return VoteOption2.VOTE_OPTION_YES;
  } else if (lowercaseMessage.includes("abstain")) {
    return VoteOption2.VOTE_OPTION_ABSTAIN;
  }
  return VoteOption2.VOTE_OPTION_UNSPECIFIED;
}
var VoteOnProposalAction = class {
  async voteOnProposal(params, runtime, message, state) {
    try {
      const wallet = await walletProvider.get(
        runtime,
        message,
        state
      );
      const govProvider = new GovProvider(wallet);
      const apiEndpoint = runtime.getSetting("apiEndpoint") || process.env.OMNIFLIX_API_URL || "https://rest.omniflix.network";
      const proposalStatus = await verifyProposalStatus(
        apiEndpoint,
        params.proposal_id
      );
      if (!proposalStatus) {
        throw new Error(
          `Proposal ${params.proposal_id} is not in voting period.`
        );
      }
      const txHash = await govProvider.voteOnProposal(
        params.proposal_id,
        params.vote
      );
      return txHash.transactionHash;
    } catch (error) {
      throw new Error(`Vote on proposal failed: ${error.message}`);
    }
  }
};
var buildVoteOnProposalContent = async (runtime, message, state) => {
  if (!state) {
    state = await runtime.composeState(message);
  }
  const proposalMatch = message.content?.text?.match(/proposal[^\d]*(\d+)/i);
  if (!proposalMatch) {
    throw new Error("No proposal ID found in message");
  }
  const proposalId = proposalMatch[1];
  const vote = validateVoteOption(message.content.text);
  if (vote === VoteOption2.VOTE_OPTION_UNSPECIFIED) {
    throw new Error(
      "No valid vote option found. Please specify YES, NO, ABSTAIN, or NO WITH VETO"
    );
  }
  const voteOnProposalContent = {
    proposal_id: proposalId,
    vote,
    memo: "Vote submitted via Eliza",
    text: message.content.text
  };
  elizaLogger12.info(
    `Prepared vote content: ${JSON.stringify(voteOnProposalContent)}`
  );
  return voteOnProposalContent;
};
var vote_on_proposal_default2 = {
  name: "VOTE_ON_PROPOSAL",
  similes: [
    "^vote$",
    "^vote_on_proposal$",
    "^vote_proposal$",
    "^vote_proposal_on$"
  ],
  description: "Vote on a specified omniflix proposal.",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger12.log("Starting VOTE_ON_PROPOSAL handler...");
    const voteOnProposalContent = await buildVoteOnProposalContent(
      runtime,
      message,
      state
    );
    const validationResult = isVoteOnProposalContent(voteOnProposalContent);
    if (!validationResult.success) {
      if (callback) {
        callback({
          text: validationResult.message,
          content: { error: validationResult.message }
        });
      }
      return false;
    }
    try {
      const action = new VoteOnProposalAction();
      const txHash = await action.voteOnProposal(
        voteOnProposalContent,
        runtime,
        message,
        state
      );
      state = await runtime.updateRecentMessageState(state);
      if (callback) {
        callback({
          text: `Successfully voted on proposal ${voteOnProposalContent.proposal_id} with vote ${voteOnProposalContent.vote}
TxHash: ${txHash}`,
          content: {
            success: true,
            hash: txHash,
            proposal_id: voteOnProposalContent.proposal_id,
            vote: voteOnProposalContent.vote
          }
        });
      }
      return true;
    } catch (error) {
      if (callback) {
        callback({
          text: `Error voting on proposal: ${error.message}`,
          content: { error: error.message }
        });
      }
      return false;
    }
  },
  template: voteOnProposalTemplate,
  validate: async (_runtime) => {
    return true;
  },
  examples: vote_on_proposal_default
};
var verifyProposalStatus = async (apiEndpoint, proposalId) => {
  const url = `${apiEndpoint}/cosmos/gov/v1/proposals/${proposalId}`;
  const response = await fetch(url);
  const data = await response.json();
  if (data.proposal.status === "PROPOSAL_STATUS_VOTING_PERIOD") {
    return true;
  }
  return false;
};

// src/actions/gov/index.ts
var govActions = [
  vote_on_proposal_default2
];

// src/actions/index.ts
var actions = [...bankActions, ...stakingActions, ...govActions];
var actions_default = actions;

// src/index.ts
var OmniflixPlugin = {
  name: "omniflix",
  description: "Plugin for Omniflix",
  evaluators: [],
  actions: actions_default,
  providers: providers_default
};
var index_default = OmniflixPlugin;
export {
  OmniflixPlugin,
  index_default as default
};
//# sourceMappingURL=index.js.map