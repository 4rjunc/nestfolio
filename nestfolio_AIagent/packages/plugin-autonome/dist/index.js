// src/actions/launchAgent.ts
import axios from "axios";
import {
  composeContext,
  elizaLogger,
  generateObjectDeprecated,
  ModelClass
} from "@elizaos/core";
function isLaunchAgentContent(content) {
  elizaLogger.log("Content for launchAgent", content);
  return typeof content === "object" && content !== null && "name" in content && "config" in content && typeof content.name === "string" && typeof content.config === "string";
}
var launchTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "name": "xiaohuo",
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested agent launch:
- Agent name
- Character json config
`;
var launchAgent_default = {
  name: "LAUNCH_AGENT",
  similes: ["CREATE_AGENT", "DEPLOY_AGENT", "DEPLOY_ELIZA", "DEPLOY_BOT"],
  validate: async (_runtime, _message) => {
    return true;
  },
  description: "Launch an Eliza agent",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger.log("Starting LAUNCH_AGENT handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    const launchContext = composeContext({
      state: currentState,
      template: launchTemplate
    });
    const content = await generateObjectDeprecated({
      runtime,
      context: launchContext,
      modelClass: ModelClass.LARGE
    });
    if (!isLaunchAgentContent(content)) {
      elizaLogger.error("Invalid launch content", content);
      if (callback) {
        callback({
          text: "Unable to process launch agent request. Invalid content provided.",
          content: { error: "Invalid launch agent content" }
        });
      }
      return false;
    }
    const autonomeJwt = runtime.getSetting("AUTONOME_JWT_TOKEN");
    const autonomeRpc = runtime.getSetting("AUTONOME_RPC");
    const requestBody = {
      name: content.name,
      config: content.config,
      creationMethod: 2,
      envList: {},
      templateId: "Eliza"
    };
    const sendPostRequest = async () => {
      try {
        const response = await axios.post(autonomeRpc, requestBody, {
          headers: {
            Authorization: `Bearer ${autonomeJwt}`,
            "Content-Type": "application/json"
          }
        });
        return response;
      } catch (error) {
        console.error("Error making RPC call:", error);
      }
    };
    try {
      const resp = await sendPostRequest();
      if (resp?.data?.app?.id) {
        elizaLogger.log(
          "Launching successful, please find your agent on"
        );
        elizaLogger.log(
          `https://dev.autonome.fun/autonome/${resp.data.app.id}/details`
        );
      }
      if (callback) {
        callback({
          text: `Successfully launch agent ${content.name}`,
          content: {
            success: true,
            appId: `https://dev.autonome.fun/autonome/${resp.data.app.id}/details`
          }
        });
      }
      return true;
    } catch (error) {
      if (callback) {
        elizaLogger.error("Error during launching agent");
        elizaLogger.error(error);
        callback({
          text: `Error launching agent: ${error.message}`,
          content: { error: error.message }
        });
      }
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Launch an agent, name is xiaohuo"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'll launch the agent now...",
          action: "LAUNCH_AGENT"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Successfully launch agent, id is ba2e8369-e256-4a0d-9f90-9c64e306dc9f"
        }
      }
    ]
  ]
};

// src/index.ts
var autonomePlugin = {
  name: "autonome",
  description: "Autonome Plugin for Eliza",
  actions: [launchAgent_default],
  evaluators: [],
  providers: []
};
var index_default = autonomePlugin;
export {
  autonomePlugin,
  index_default as default
};
//# sourceMappingURL=index.js.map