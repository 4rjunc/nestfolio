// src/provider.ts
import { Edwin } from "edwin-sdk";
var edwinRunningInstance = null;
async function getEdwinClient() {
  if (edwinRunningInstance) {
    return edwinRunningInstance;
  }
  const edwinConfig = {
    evmPrivateKey: process.env.EVM_PRIVATE_KEY,
    solanaPrivateKey: process.env.SOLANA_PRIVATE_KEY,
    actions: ["supply", "withdraw", "stake", "getPools", "addLiquidity"]
  };
  edwinRunningInstance = new Edwin(edwinConfig);
  return edwinRunningInstance;
}
var edwinProvider = {
  async get(runtime) {
    try {
      const edwin = await getEdwinClient();
      return edwin.getPortfolio();
    } catch (error) {
      console.error("Error in Edwin provider:", error);
      return null;
    }
  }
};

// src/actions.ts
import {
  generateText,
  ModelClass,
  composeContext,
  generateObjectDeprecated
} from "@elizaos/core";
async function getEdwinActions({
  getClient
}) {
  const edwin = await getClient();
  const edwinActions = await edwin.getActions();
  const actions = edwinActions.map((action) => ({
    name: action.name.toUpperCase(),
    description: action.description,
    similes: [],
    validate: async () => true,
    handler: async (runtime, message, state, options, callback) => {
      try {
        const client = await getClient();
        if (!state) {
          state = await runtime.composeState(message);
        } else {
          state = await runtime.updateRecentMessageState(state);
        }
        const parameterContext = composeContext({
          state,
          template: action.template
        });
        const parameters = await generateObjectDeprecated({
          runtime,
          context: parameterContext,
          modelClass: ModelClass.LARGE
        });
        const result = await executeAction(action, parameters, client);
        const responseContext = composeResponseContext(
          action,
          result,
          state
        );
        const response = await generateResponse(
          runtime,
          responseContext
        );
        callback?.({ text: response, content: result });
        return true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        callback?.({
          text: `Error executing action ${action.name}: ${errorMessage}`,
          content: { error: errorMessage }
        });
        return false;
      }
    },
    examples: []
  }));
  return actions;
}
async function executeAction(action, parameters, edwin) {
  const result = await action.execute(parameters);
  return result;
}
function composeResponseContext(action, result, state) {
  const responseTemplate = `
# Action Examples
{{actionExamples}}

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

The action "${action.name}" was executed successfully.
Here is the result:
${JSON.stringify(result)}

{{actions}}

Respond to the message knowing that the action was successful and these were the previous messages:
{{recentMessages}}
`;
  const context = composeContext({ state, template: responseTemplate });
  return context;
}
async function generateResponse(runtime, context) {
  const response = await generateText({
    runtime,
    context,
    modelClass: ModelClass.LARGE
  });
  return response;
}

// src/index.ts
console.log("\n\u250C\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2510");
console.log("\u2502            EDWIN PLUGIN             \u2502");
console.log("\u2502                 ,_,                 \u2502");
console.log("\u2502                (o,o)                \u2502");
console.log("\u2502                {`\"'}                \u2502");
console.log('\u2502                -"-"-                \u2502');
console.log("\u251C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2524");
console.log("\u2502  Initializing Edwin Plugin...       \u2502");
console.log("\u2502  Version: 0.0.1                     \u2502");
console.log("\u2514\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2518");
var edwinPlugin = {
  name: "[Edwin] Integration",
  description: "Edwin integration plugin",
  providers: [edwinProvider],
  evaluators: [],
  services: [],
  actions: await getEdwinActions({
    getClient: getEdwinClient
  })
};
var index_default = edwinPlugin;
export {
  index_default as default,
  edwinPlugin
};
//# sourceMappingURL=index.js.map