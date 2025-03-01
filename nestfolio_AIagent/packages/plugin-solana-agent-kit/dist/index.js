// src/actions/createToken.ts
import {
  composeContext,
  elizaLogger as elizaLogger2,
  generateObjectDeprecated,
  ModelClass
} from "@elizaos/core";

// src/client.ts
import { SolanaAgentKit } from "solana-agent-kit";

// src/keypairUtils.ts
import { Keypair, PublicKey } from "@solana/web3.js";
import { DeriveKeyProvider, TEEMode } from "@elizaos/plugin-tee";
import bs58 from "bs58";
import { elizaLogger } from "@elizaos/core";
async function getWalletKey(runtime, requirePrivateKey = true) {
  const teeMode = runtime.getSetting("TEE_MODE") || TEEMode.OFF;
  if (teeMode !== TEEMode.OFF) {
    const walletSecretSalt = runtime.getSetting("WALLET_SECRET_SALT");
    if (!walletSecretSalt) {
      throw new Error(
        "WALLET_SECRET_SALT required when TEE_MODE is enabled"
      );
    }
    const deriveKeyProvider = new DeriveKeyProvider(teeMode);
    const deriveKeyResult = await deriveKeyProvider.deriveEd25519Keypair(
      "/",
      walletSecretSalt,
      runtime.agentId
    );
    return requirePrivateKey ? { keypair: deriveKeyResult.keypair } : { publicKey: deriveKeyResult.keypair.publicKey };
  }
  if (requirePrivateKey) {
    const privateKeyString = runtime.getSetting("SOLANA_PRIVATE_KEY") ?? runtime.getSetting("WALLET_PRIVATE_KEY");
    if (!privateKeyString) {
      throw new Error("Private key not found in settings");
    }
    try {
      const secretKey = bs58.decode(privateKeyString);
      return { keypair: Keypair.fromSecretKey(secretKey) };
    } catch (e) {
      elizaLogger.log("Error decoding base58 private key:", e);
      try {
        elizaLogger.log("Try decoding base64 instead");
        const secretKey = Uint8Array.from(
          Buffer.from(privateKeyString, "base64")
        );
        return { keypair: Keypair.fromSecretKey(secretKey) };
      } catch (e2) {
        elizaLogger.error("Error decoding private key: ", e2);
        throw new Error("Invalid private key format");
      }
    }
  } else {
    const publicKeyString = runtime.getSetting("SOLANA_PUBLIC_KEY") ?? runtime.getSetting("WALLET_PUBLIC_KEY");
    if (!publicKeyString) {
      throw new Error("Public key not found in settings");
    }
    return { publicKey: new PublicKey(publicKeyString) };
  }
}

// src/client.ts
import bs582 from "bs58";
async function getSAK(runtime) {
  const { publicKey } = await getWalletKey(runtime, false);
  const { keypair } = await getWalletKey(runtime, true);
  if (keypair.publicKey.toBase58() !== publicKey.toBase58()) {
    throw new Error(
      "Generated public key doesn't match expected public key"
    );
  }
  return new SolanaAgentKit(
    bs582.encode(keypair.secretKey),
    runtime.getSetting("SOLANA_RPC_URL"),
    {
      OPENAI_API_KEY: runtime.getSetting("OPENAI_API_KEY")
    }
  );
}

// src/actions/createToken.ts
function isCreateTokenContent(content) {
  elizaLogger2.log("Content for createToken", content);
  return typeof content.name === "string" && typeof content.uri === "string" && typeof content.symbol === "string" && typeof content.decimals === "number" && typeof content.initialSupply === "number";
}
var createTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "name": "Example Token",
    "symbol": "EXMPL",
    "uri": "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/CompressedCoil/image.png",
    "decimals": 18,
    "initialSupply": 1000000,
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token transfer:
- Token name
- Token symbol
- Token uri
- Token decimals
- Token initialSupply

Respond with a JSON markdown block containing only the extracted values.`;
var createToken_default = {
  name: "CREATE_TOKEN",
  similes: ["DEPLOY_TOKEN"],
  validate: async (_runtime, _message) => true,
  description: "Create tokens",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger2.log("Starting CREATE_TOKEN handler...");
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const transferContext = composeContext({
      state,
      template: createTemplate
    });
    const content = await generateObjectDeprecated({
      runtime,
      context: transferContext,
      modelClass: ModelClass.LARGE
    });
    if (!isCreateTokenContent(content)) {
      elizaLogger2.error("Invalid content for CREATE_TOKEN action.");
      if (callback) {
        callback({
          text: "Unable to process create token request. Invalid content provided.",
          content: { error: "Invalid create token content" }
        });
      }
      return false;
    }
    elizaLogger2.log("Init solana agent kit...");
    const solanaAgentKit = await getSAK(runtime);
    try {
      const deployedAddress = await solanaAgentKit.deployToken(
        content.name,
        content.uri,
        content.symbol,
        content.decimals
        // content.initialSupply comment out this cause the sdk has some issue with this parameter
      );
      elizaLogger2.log("Create successful: ", deployedAddress);
      elizaLogger2.log(deployedAddress);
      if (callback) {
        callback({
          text: `Successfully create token ${content.name}`,
          content: {
            success: true,
            deployedAddress
          }
        });
      }
      return true;
    } catch (error) {
      if (callback) {
        elizaLogger2.error("Error during create token: ", error);
        callback({
          text: `Error creating token: ${error.message}`,
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
          text: "Create token, name is Example Token, symbol is EXMPL, uri is https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/CompressedCoil/image.png, decimals is 9, initialSupply is 100000000000"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'll create token now...",
          action: "CREATE_TOKEN"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Successfully create token 9jW8FPr6BSSsemWPV22UUCzSqkVdTp6HTyPqeqyuBbCa"
        }
      }
    ]
  ]
};

// src/actions/swap.ts
import {
  composeContext as composeContext2,
  generateObjectDeprecated as generateObjectDeprecated2,
  ModelClass as ModelClass2,
  settings,
  elizaLogger as elizaLogger3
} from "@elizaos/core";
import { Connection, PublicKey as PublicKey2 } from "@solana/web3.js";
import { ACTIONS } from "solana-agent-kit";
var TRADE_ACTION = ACTIONS.TRADE_ACTION;
var swapTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "inputTokenSymbol": "SOL",
    "outputTokenSymbol": "USDC",
    "inputTokenCA": "So11111111111111111111111111111111111111112",
    "outputTokenCA": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount": 1.5
}
\`\`\`

{{recentMessages}}

Given the recent messages and wallet information below:

{{walletInfo}}

Extract the following information about the requested token swap:
- Input token symbol (the token being sold)
- Output token symbol (the token being bought)
- Input token contract address if provided
- Output token contract address if provided
- Amount to swap

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined. The result should be a valid JSON object with the following schema:
\`\`\`json
{
    "inputTokenSymbol": string | null,
    "outputTokenSymbol": string | null,
    "inputTokenCA": string | null,
    "outputTokenCA": string | null,
    "amount": number | string | null
}
\`\`\``;
var swap_default = {
  name: TRADE_ACTION.name,
  similes: TRADE_ACTION.similes,
  validate: async (runtime, message) => {
    elizaLogger3.log("Message:", message);
    return true;
  },
  description: TRADE_ACTION.description,
  handler: async (runtime, message, state, _options, callback) => {
    const sak = await getSAK(runtime);
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const swapContext = composeContext2({
      state,
      template: swapTemplate
    });
    const response = await generateObjectDeprecated2({
      runtime,
      context: swapContext,
      modelClass: ModelClass2.LARGE
    });
    elizaLogger3.log("Response:", response);
    if (response.inputTokenSymbol?.toUpperCase() === "SOL") {
      response.inputTokenCA = settings.SOL_ADDRESS;
    }
    if (response.outputTokenSymbol?.toUpperCase() === "SOL") {
      response.outputTokenCA = settings.SOL_ADDRESS;
    }
    if (!response.amount) {
      elizaLogger3.log("No amount provided, skipping swap");
      const responseMsg = {
        text: "I need the amount to perform the swap"
      };
      callback?.(responseMsg);
      return true;
    }
    if (!response.amount) {
      elizaLogger3.log("Amount is not a number, skipping swap");
      const responseMsg = {
        text: "The amount must be a number"
      };
      callback?.(responseMsg);
      return true;
    }
    try {
      const connection = new Connection(
        "https://api.mainnet-beta.solana.com"
      );
      console.log("Wallet Public Key:", sak.wallet_address.toString());
      console.log("inputTokenSymbol:", response.inputTokenCA);
      console.log("outputTokenSymbol:", response.outputTokenCA);
      console.log("amount:", response.amount);
      const txid = await sak.trade(
        new PublicKey2(response.outputTokenCA),
        response.amount,
        new PublicKey2(response.inputTokenCA)
      );
      const latestBlockhash = await connection.getLatestBlockhash();
      const confirmation = await connection.confirmTransaction(
        {
          signature: txid,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
        },
        "confirmed"
      );
      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${confirmation.value.err}`
        );
      }
      if (confirmation.value.err) {
        throw new Error(
          `Transaction failed: ${confirmation.value.err}`
        );
      }
      elizaLogger3.log("Swap completed successfully!");
      elizaLogger3.log(`Transaction ID: ${txid}`);
      const responseMsg = {
        text: `Swap completed successfully! Transaction ID: ${txid}`
      };
      callback?.(responseMsg);
      return true;
    } catch (error) {
      elizaLogger3.error("Error during token swap:", error);
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          inputTokenSymbol: "SOL",
          outputTokenSymbol: "USDC",
          amount: 0.1
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Swapping 0.1 SOL for USDC...",
          action: "TOKEN_SWAP"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Swap completed successfully! Transaction ID: ..."
        }
      }
    ]
    // Add more examples as needed
  ]
};

// src/actions/lend.ts
import { elizaLogger as elizaLogger4 } from "@elizaos/core";
import {
  ModelClass as ModelClass3
} from "@elizaos/core";
import { composeContext as composeContext3 } from "@elizaos/core";
import { generateObjectDeprecated as generateObjectDeprecated3 } from "@elizaos/core";
import { ACTIONS as ACTIONS2 } from "solana-agent-kit";
var LEND_ASSET_ACTION = ACTIONS2.LEND_ASSET_ACTION;
function isLendAssetContent(runtime, content) {
  elizaLogger4.log("Content for lend", content);
  return typeof content.amount === "number";
}
var lendTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "amount": "100",
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the lending request:
- Amount of USDC to lend

Respond with a JSON markdown block containing only the extracted values.`;
var lend_default = {
  name: LEND_ASSET_ACTION.name,
  similes: LEND_ASSET_ACTION.similes,
  validate: async (runtime, message) => {
    elizaLogger4.log("Validating lend asset from user:", message.userId);
    return false;
  },
  description: LEND_ASSET_ACTION.description,
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger4.log("Starting LEND_ASSET handler...");
    const sak = await getSAK(runtime);
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const lendContext = composeContext3({
      state,
      template: lendTemplate
    });
    const content = await generateObjectDeprecated3({
      runtime,
      context: lendContext,
      modelClass: ModelClass3.LARGE
    });
    if (!isLendAssetContent(runtime, content)) {
      elizaLogger4.error("Invalid content for LEND_ASSET action.");
      if (callback) {
        callback({
          text: "Unable to process lending request. Invalid content provided.",
          content: { error: "Invalid lend content" }
        });
      }
      return false;
    }
    try {
      const lendResult = await sak.lendAssets(
        content.amount
      );
      console.log("Lend result:", lendResult);
      if (callback) {
        callback({
          text: `Successfully lent ${content.amount} USDC`,
          content: {
            success: true,
            lendResult
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger4.error("Error during lending:", error);
      if (callback) {
        callback({
          text: `Error lending asset: ${error.message}`,
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
          text: "I want to lend 100 USDC"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Lend 100 USDC",
          action: "LEND_ASSET"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Successfully lent 100 USDC"
        }
      }
    ]
  ]
};

// src/actions/stake.ts
import { elizaLogger as elizaLogger5 } from "@elizaos/core";
import {
  ModelClass as ModelClass4
} from "@elizaos/core";
import { composeContext as composeContext4 } from "@elizaos/core";
import { generateObjectDeprecated as generateObjectDeprecated4 } from "@elizaos/core";
import { ACTIONS as ACTIONS3 } from "solana-agent-kit";
var STAKE_ACTION = ACTIONS3.STAKE_WITH_JUP_ACTION;
function isStakeContent(runtime, content) {
  elizaLogger5.log("Content for stake", content);
  return typeof content.amount === "number";
}
var stakeTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "amount": "100",
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the staking request:
- Amount to stake

Respond with a JSON markdown block containing only the extracted values.`;
var stake_default = {
  name: STAKE_ACTION.name,
  similes: STAKE_ACTION.similes,
  validate: async (runtime, message) => {
    elizaLogger5.log("Validating stake from user:", message.userId);
    return false;
  },
  description: STAKE_ACTION.description,
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger5.log("Starting STAKE handler...");
    const sak = await getSAK(runtime);
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const stakeContext = composeContext4({
      state,
      template: stakeTemplate
    });
    const content = await generateObjectDeprecated4({
      runtime,
      context: stakeContext,
      modelClass: ModelClass4.LARGE
    });
    if (!isStakeContent(runtime, content)) {
      elizaLogger5.error("Invalid content for STAKE action.");
      if (callback) {
        callback({
          text: "Unable to process staking request. Invalid content provided.",
          content: { error: "Invalid stake content" }
        });
      }
      return false;
    }
    try {
      const stakeResult = await sak.stake(
        content.amount
      );
      console.log("Stake result:", stakeResult);
      if (callback) {
        callback({
          text: `Successfully staked ${content.amount} tokens`,
          content: {
            success: true,
            tx: stakeResult
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger5.error("Error during staking:", error);
      if (callback) {
        callback({
          text: `Error staking: ${error.message}`,
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
          text: "I want to stake 100 tokens"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Stake 100 tokens",
          action: "STAKE_WITH_JUP"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Successfully staked 100 tokens"
        }
      }
    ]
  ]
};

// src/actions/transfer.ts
import { elizaLogger as elizaLogger6 } from "@elizaos/core";
import {
  PublicKey as PublicKey3
} from "@solana/web3.js";
import {
  ModelClass as ModelClass5
} from "@elizaos/core";
import { composeContext as composeContext5 } from "@elizaos/core";
import { generateObjectDeprecated as generateObjectDeprecated5 } from "@elizaos/core";
import { ACTIONS as ACTIONS4 } from "solana-agent-kit";
var TRANSFER_ACTION = ACTIONS4.TRANSFER_ACTION;
function isTransferContent(runtime, content) {
  elizaLogger6.log("Content for transfer", content);
  return typeof content.tokenAddress === "string" && typeof content.recipient === "string" && (typeof content.amount === "string" || typeof content.amount === "number");
}
var transferTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "tokenAddress": "BieefG47jAHCGZBxi2q87RDuHyGZyYC3vAzxpyu8pump",
    "recipient": "9jW8FPr6BSSsemWPV22UUCzSqkVdTp6HTyPqeqyuBbCa",
    "amount": "1000"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token transfer:
- Token contract address
- Recipient wallet address
- Amount to transfer

Respond with a JSON markdown block containing only the extracted values.`;
var transfer_default = {
  name: TRANSFER_ACTION.name,
  similes: TRANSFER_ACTION.similes,
  validate: async (runtime, message) => {
    elizaLogger6.log("Validating transfer from user:", message.userId);
    return false;
  },
  description: TRANSFER_ACTION.description,
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger6.log("Starting SEND_TOKEN handler...");
    const sak = await getSAK(runtime);
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const transferContext = composeContext5({
      state,
      template: transferTemplate
    });
    const content = await generateObjectDeprecated5({
      runtime,
      context: transferContext,
      modelClass: ModelClass5.LARGE
    });
    if (!isTransferContent(runtime, content)) {
      elizaLogger6.error("Invalid content for TRANSFER_TOKEN action.");
      if (callback) {
        callback({
          text: "Unable to process transfer request. Invalid content provided.",
          content: { error: "Invalid transfer content" }
        });
      }
      return false;
    }
    try {
      const mintPubkey = new PublicKey3(content.tokenAddress);
      const recipientPubkey = new PublicKey3(content.recipient);
      const txId = await sak.transfer(recipientPubkey, Number(content.amount), mintPubkey);
      console.log("Transfer successful:", txId);
      if (callback) {
        callback({
          text: `Successfully transferred ${content.amount} tokens to ${content.recipient}
Transaction: ${txId}`,
          content: {
            success: true,
            signature: txId,
            amount: content.amount,
            recipient: content.recipient
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger6.error("Error during token transfer:", error);
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
          text: "Send 69 EZSIS BieefG47jAHCGZBxi2q87RDuHyGZyYC3vAzxpyu8pump to 9jW8FPr6BSSsemWPV22UUCzSqkVdTp6HTyPqeqyuBbCa"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'll send 69 EZSIS tokens now...",
          action: "SEND_TOKEN"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Successfully sent 69 EZSIS tokens to 9jW8FPr6BSSsemWPV22UUCzSqkVdTp6HTyPqeqyuBbCa\nTransaction: 5KtPn3DXXzHkb7VAVHZGwXJQqww39ASnrf7YkyJoF2qAGEpBEEGvRHLnnTG8ZVwKqNHMqSckWVGnsQAgfH5pbxEb"
        }
      }
    ]
  ]
};

// src/actions/getTokenInfo.ts
import { elizaLogger as elizaLogger7 } from "@elizaos/core";
import {
  ModelClass as ModelClass6
} from "@elizaos/core";
import { composeContext as composeContext6 } from "@elizaos/core";
import { generateObjectDeprecated as generateObjectDeprecated6 } from "@elizaos/core";
import { ACTIONS as ACTIONS5 } from "solana-agent-kit";
var GET_TOKEN_INFO_ACTION = ACTIONS5.GET_TOKEN_DATA_ACTION;
function isGetTokenInfoContent(runtime, content) {
  elizaLogger7.log("Content for transfer", content);
  return typeof content.tokenAddress === "string";
}
var getTokenInfoTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "tokenAddress": "SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa",
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token:
- Token contract address

Respond with a JSON markdown block containing only the extracted values.`;
var getTokenInfo_default = {
  name: GET_TOKEN_INFO_ACTION.name,
  similes: GET_TOKEN_INFO_ACTION.similes,
  validate: async (runtime, message) => {
    elizaLogger7.log("Validating get token info from user:", message.userId);
    return false;
  },
  description: GET_TOKEN_INFO_ACTION.description,
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger7.log("Starting GET_TOKEN_INFO handler...");
    const sak = await getSAK(runtime);
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const getTokenInfoContext = composeContext6({
      state,
      template: getTokenInfoTemplate
    });
    const content = await generateObjectDeprecated6({
      runtime,
      context: getTokenInfoContext,
      modelClass: ModelClass6.LARGE
    });
    if (!isGetTokenInfoContent(runtime, content)) {
      elizaLogger7.error("Invalid content for GET_TOKEN_INFO action.");
      if (callback) {
        callback({
          text: "Unable to process get token info request. Invalid content provided.",
          content: { error: "Invalid get token info content" }
        });
      }
      return false;
    }
    try {
      const tokenData = await sak.getTokenDataByAddress(content.tokenAddress);
      console.log("Token data:", tokenData);
      if (callback) {
        callback({
          text: `Successfully retrieved token data for ${content.tokenAddress}`,
          content: {
            success: true,
            tokenData
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger7.error("Error during get token info:", error);
      if (callback) {
        callback({
          text: `Error getting token info: ${error.message}`,
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
          text: "Get token info for SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Get token info for SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa",
          action: "GET_TOKEN_INFO"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Successfully retrieved token info for SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa"
        }
      }
    ]
  ]
};

// src/actions/gibwork.ts
import { elizaLogger as elizaLogger8 } from "@elizaos/core";
import {
  ModelClass as ModelClass7
} from "@elizaos/core";
import { composeContext as composeContext7 } from "@elizaos/core";
import { generateObjectDeprecated as generateObjectDeprecated7 } from "@elizaos/core";
import { ACTIONS as ACTIONS6 } from "solana-agent-kit";
var GIBWORK_ACTION = ACTIONS6.CREATE_GIBWORK_TASK_ACTION;
function isGibWorkContent(runtime, content) {
  elizaLogger8.log("Content for gibwork", content);
  return typeof content.title === "string" && typeof content.content === "string" && typeof content.requirements === "string" && Array.isArray(content.tags) && typeof content.tokenMintAddress === "string" && typeof content.tokenAmount === "number";
}
var gibworkTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "title": "Build a Solana dApp",
    "content": "Create a simple Solana dApp with React frontend",
    "requirements": "Experience with Rust and React",
    "tags": ["solana", "rust", "react"],
    "tokenMintAddress": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "tokenAmount": 100
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the GibWork task:
- Title of the task
- Content/description of the task
- Requirements for the task
- Tags related to the task
- Token mint address for payment
- Token amount for payment

Respond with a JSON markdown block containing only the extracted values.`;
var gibwork_default = {
  name: GIBWORK_ACTION.name,
  similes: GIBWORK_ACTION.similes,
  validate: async (runtime, message) => {
    elizaLogger8.log("Validating gibwork task from user:", message.userId);
    return false;
  },
  description: GIBWORK_ACTION.description,
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger8.log("Starting CREATE_GIBWORK_TASK handler...");
    const sak = await getSAK(runtime);
    if (!state) {
      state = await runtime.composeState(message);
    } else {
      state = await runtime.updateRecentMessageState(state);
    }
    const gibworkContext = composeContext7({
      state,
      template: gibworkTemplate
    });
    const content = await generateObjectDeprecated7({
      runtime,
      context: gibworkContext,
      modelClass: ModelClass7.LARGE
    });
    if (!isGibWorkContent(runtime, content)) {
      elizaLogger8.error("Invalid content for CREATE_GIBWORK_TASK action.");
      if (callback) {
        callback({
          text: "Unable to process GibWork task creation. Invalid content provided.",
          content: { error: "Invalid gibwork content" }
        });
      }
      return false;
    }
    try {
      const gibworkResult = await sak.createGibworkTask(
        content.title,
        content.content,
        content.requirements,
        content.tags,
        content.tokenMintAddress,
        content.tokenAmount
      );
      console.log("GibWork task creation result:", gibworkResult);
      if (callback) {
        callback({
          text: `Successfully created GibWork task: ${content.title}`,
          content: {
            success: true,
            gibworkResult
          }
        });
      }
      return true;
    } catch (error) {
      elizaLogger8.error("Error during GibWork task creation:", error);
      if (callback) {
        callback({
          text: `Error creating GibWork task: ${error.message}`,
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
          text: "Create a GibWork task for building a Solana dApp, offering 100 USDC"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Creating GibWork task",
          action: "CREATE_GIBWORK_TASK"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Successfully created GibWork task: Build a Solana dApp"
        }
      }
    ]
  ]
};

// src/index.ts
var solanaAgentkitPlugin = {
  name: "solana",
  description: "Solana Plugin with solana agent kit for Eliza",
  actions: [createToken_default, swap_default, lend_default, stake_default, transfer_default, getTokenInfo_default, gibwork_default],
  evaluators: [],
  providers: []
};
var index_default = solanaAgentkitPlugin;
export {
  index_default as default,
  solanaAgentkitPlugin
};
//# sourceMappingURL=index.js.map