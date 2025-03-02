// src/actions.ts
import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { sendETH } from "@goat-sdk/wallet-evm";
import { zilliqa } from "@goat-sdk/plugin-zilliqa";
import {
  generateText,
  ModelClass,
  composeContext
} from "@elizaos/core";
async function getOnChainActions(evmWallet, zilliqaWallet) {
  const actionsWithoutHandler = [
    {
      name: "GET_BALANCE",
      description: "Retrieve the balance of a zilliqa account using the GET_ZILLIQA_ADDRESS_BALANCE tool or an evm account using the GET_BALANCE tool. Addresses may be expressed as a hex or bech32 address",
      similes: [],
      validate: async () => true,
      examples: [
        [
          {
            user: "{{user1}}",
            content: {
              text: "Tell me the balance of account 0xf0cb24ac66ba7375bf9b9c4fa91e208d9eaabd2e",
              action: "GET_BALANCE"
            }
          },
          {
            user: "{{agentName}}",
            content: {
              text: "The balance of account 0xf0cb24ac66ba7375bf9b9c4fa91e208d9eaabd2e is 2.01 zil",
              action: "GET_BALANCE"
            }
          }
        ],
        [
          {
            user: "{{user1}}",
            content: {
              text: "Tell me the balance of the account zil17r9jftrxhfeht0umn386j83q3k0240fwn7g70g"
            }
          },
          {
            user: "{{agentName}}",
            content: {
              text: "The balance of account zil17r9jftrxhfeht0umn386j83q3k0240fwn7g70g is 18.05 zil",
              action: "GET_BALANCE"
            }
          }
        ]
      ]
    },
    {
      name: "CONVERT",
      description: "Convert address formats from bech32 to hex using the CONVERT_FROM_BECH32 tool or from hex to bech32 using the CONVERT_TO_BECH32 tool. The addresses to be converted may be either evm or zilliqa",
      similes: [],
      validate: async () => true,
      examples: [
        [
          {
            user: "{{user1}}",
            content: {
              text: "Convert 0xf0cb24ac66ba7375bf9b9c4fa91e208d9eaabd2e to bech32"
            }
          },
          {
            user: "{{agentName}}",
            content: {
              text: "The bech32 address for 0xf0cb24ac66ba7375bf9b9c4fa91e208d9eaabd2e is zil17r9jftrxhfeht0umn386j83q3k0240fwn7g70g",
              action: "CONVERT"
            }
          }
        ],
        [
          {
            user: "{{user1}}",
            content: {
              text: "Convert zil17r9jftrxhfeht0umn386j83q3k0240fwn7g70g to hex"
            }
          },
          {
            user: "{{agentName}}",
            content: {
              text: "The hex address for zil17r9jftrxhfeht0umn386j83q3k0240fwn7g70g is 0xf0cb24ac66ba7375bf9b9c4fa91e208d9eaabd2e",
              action: "CONVERT"
            }
          }
        ]
      ]
    },
    {
      name: "TRANSFER",
      description: "Transfer funds from a Zilliqa address using TRANSFER_FROM_ZILLIQA_ADDRESS or from an EVM address using TRANSFER_FROM_EVM_ADDRESS. Addresses may be in either bech32 or hex format. Both kinds of transfer return the transaction id in hex.",
      similes: [],
      validate: async () => true,
      examples: [
        [
          {
            user: "{{user1}}",
            content: {
              text: "Transfer 2 ZIL from the EVM address zil17r9jftrxhfeht0umn386j83q3k0240fwn7g70g to 0xf0cb24ac66ba7375bf9b9c4fa91e208d9eaabd2e",
              action: "TRANSFER"
            }
          }
        ],
        [
          {
            user: "{{user1}}",
            content: {
              text: "Transfer 2 ZIL from the Zilliqa address zil17r9jftrxhfeht0umn386j83q3k0240fwn7g70g to 0xf0cb24ac66ba7375bf9b9c4fa91e208d9eaabd2e",
              action: "TRANSFER"
            }
          }
        ]
      ]
    }
    // 1. Add your actions here
  ];
  const tools = await getOnChainTools({
    wallet: evmWallet,
    // 2. Configure the plugins you need to perform those actions
    plugins: [sendETH()]
  });
  const zilTools = await getOnChainTools({
    wallet: zilliqaWallet,
    plugins: [zilliqa()]
  });
  const allTools = { ...zilTools, ...tools };
  return actionsWithoutHandler.map((action) => ({
    ...action,
    handler: getActionHandler(action.name, action.description, allTools)
  }));
}
function getActionHandler(actionName, actionDescription, tools) {
  return async (runtime, message, state, options, callback) => {
    let currentState = state ?? await runtime.composeState(message);
    currentState = await runtime.updateRecentMessageState(currentState);
    try {
      const context = composeActionContext(
        actionName,
        actionDescription,
        currentState
      );
      const result = await generateText({
        runtime,
        context,
        tools,
        maxSteps: 10,
        // Uncomment to see the log each tool call when debugging
        onStepFinish: (step) => {
          console.log(step.toolResults);
        },
        modelClass: ModelClass.LARGE
      });
      const response = composeResponseContext(result, currentState);
      const responseText = await generateResponse(runtime, response);
      callback?.({
        text: responseText,
        content: {}
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorResponse = composeErrorResponseContext(
        errorMessage,
        currentState
      );
      const errorResponseText = await generateResponse(
        runtime,
        errorResponse
      );
      callback?.({
        text: errorResponseText,
        content: { error: errorMessage }
      });
      return false;
    }
  };
}
function composeActionContext(actionName, actionDescription, state) {
  const actionTemplate = `
# Knowledge
{{knowledge}}

About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}


# Action: ${actionName}
${actionDescription}

{{recentMessages}}

Based on the action chosen and the previous messages, execute the action and respond to the user using the tools you were given.
`;
  return composeContext({ state, template: actionTemplate });
}
function composeResponseContext(result, state) {
  const responseTemplate = `
    # Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

Here is the result:
${JSON.stringify(result)}

{{actions}}

Respond to the message knowing that the action was successful and these were the previous messages:
{{recentMessages}}
  `;
  return composeContext({ state, template: responseTemplate });
}
function composeErrorResponseContext(errorMessage, state) {
  const errorResponseTemplate = `
# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{actions}}

Respond to the message knowing that the action failed.
The error was:
${errorMessage}

These were the previous messages:
{{recentMessages}}
    `;
  return composeContext({ state, template: errorResponseTemplate });
}
async function generateResponse(runtime, context) {
  return generateText({
    runtime,
    context,
    modelClass: ModelClass.SMALL
  });
}

// src/wallet.ts
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mode } from "viem/chains";
import {
  zilliqaChainId,
  zilliqaJSViemWalletClient
} from "@goat-sdk/wallet-zilliqa";
import { Account } from "@zilliqa-js/zilliqa";
function getViemChain(provider, id, decimals) {
  return {
    id: id | 32768,
    name: "zilliqa",
    nativeCurrency: {
      decimals,
      name: "Zil",
      symbol: "ZIL"
    },
    rpcUrls: {
      default: {
        https: [provider]
      }
    }
  };
}
async function getZilliqaWalletClient(getSetting) {
  const privateKey = getSetting("ZILLIQA_PRIVATE_KEY");
  if (!privateKey) return null;
  const provider = getSetting("ZILLIQA_PROVIDER_URL");
  if (!provider) throw new Error("ZILLIQA_PROVIDER_URL not configured");
  const chainId = await zilliqaChainId(provider);
  const account = new Account(privateKey);
  const viemChain = getViemChain(provider, chainId, 18);
  const viemWallet = createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain: viemChain,
    transport: http(provider)
  });
  return zilliqaJSViemWalletClient(viemWallet, provider, account, chainId);
}
function getWalletProviders(walletClient, zilliqa2) {
  return [
    {
      async get() {
        try {
          const address = walletClient.getAddress();
          const balance = await walletClient.balanceOf(address);
          return `EVM Wallet Address: ${address}
Balance: ${balance} ZIL`;
        } catch (error) {
          console.error("Error in EVM wallet provider:", error);
          return null;
        }
      }
    },
    {
      async get() {
        try {
          const address = zilliqa2.getZilliqa().wallet.defaultAccount?.address;
          return `Zilliqa wallet address: ${address}
`;
        } catch (error) {
          console.error("Error in zilliqa wallet provider:", error);
          return null;
        }
      }
    }
  ];
}

// src/index.ts
async function zilliqaPlugin(getSetting) {
  const zilliqaWalletClient = await getZilliqaWalletClient(getSetting);
  if (!zilliqaWalletClient) {
    throw new Error("Zilliqa wallet client initialization failed. Ensure that ZILLIQA_PRIVATE_KEY and ZILLIQA_PROVIDER_URL are configured.");
  }
  const walletClient = zilliqaWalletClient.getEVM();
  const actions = await getOnChainActions(walletClient, zilliqaWalletClient);
  return {
    name: "[ZILLIQA] Onchain Actions",
    description: "Zilliqa integration plugin",
    providers: getWalletProviders(walletClient, zilliqaWalletClient),
    evaluators: [],
    services: [],
    actions
  };
}
var index_default = zilliqaPlugin;
export {
  index_default as default,
  zilliqaPlugin
};
//# sourceMappingURL=index.js.map