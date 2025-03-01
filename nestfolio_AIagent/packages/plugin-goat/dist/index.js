// src/actions.ts
import { getOnChainTools } from "@goat-sdk/adapter-vercel-ai";
import { MODE, USDC, erc20 } from "@goat-sdk/plugin-erc20";
import { kim } from "@goat-sdk/plugin-kim";
import { sendETH } from "@goat-sdk/wallet-evm";
import {
  generateText,
  ModelClass,
  composeContext
} from "@elizaos/core";
async function getOnChainActions(wallet) {
  const actionsWithoutHandler = [
    {
      name: "SWAP_TOKENS",
      description: "Swap two different tokens using KIM protocol",
      similes: [],
      validate: async () => true,
      examples: []
    }
    // 1. Add your actions here
  ];
  const tools = await getOnChainTools({
    wallet,
    // 2. Configure the plugins you need to perform those actions
    plugins: [sendETH(), erc20({ tokens: [USDC, MODE] }), kim()]
  });
  return actionsWithoutHandler.map((action) => ({
    ...action,
    handler: getActionHandler(action.name, action.description, tools)
  }));
}
function getActionHandler(actionName, actionDescription, tools) {
  return async (runtime, message, state, _options, callback) => {
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
        // onStepFinish: (step) => {
        //     console.log(step.toolResults);
        // },
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
import { viem } from "@goat-sdk/wallet-viem";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mode } from "viem/chains";
var chain = mode;
function getWalletClient(getSetting) {
  const privateKey = getSetting("EVM_PRIVATE_KEY");
  if (!privateKey) return null;
  const provider = getSetting("EVM_PROVIDER_URL");
  if (!provider) throw new Error("EVM_PROVIDER_URL not configured");
  const wallet = createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain,
    transport: http(provider)
  });
  return viem(wallet);
}
function getWalletProvider(walletClient) {
  return {
    async get() {
      try {
        const address = walletClient.getAddress();
        const balance = await walletClient.balanceOf(address);
        return `EVM Wallet Address: ${address}
Balance: ${balance} ETH`;
      } catch (error) {
        console.error("Error in EVM wallet provider:", error);
        return null;
      }
    }
  };
}

// src/index.ts
async function createGoatPlugin(getSetting) {
  const walletClient = getWalletClient(getSetting);
  const actions = await getOnChainActions(walletClient);
  return {
    name: "[GOAT] Onchain Actions",
    description: "Mode integration plugin",
    providers: [getWalletProvider(walletClient)],
    evaluators: [],
    services: [],
    actions
  };
}
var index_default = createGoatPlugin;
export {
  index_default as default
};
//# sourceMappingURL=index.js.map