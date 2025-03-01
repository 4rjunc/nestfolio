// src/actions/webSearch.ts
import {
  elizaLogger
} from "@elizaos/core";
import { encodingForModel } from "js-tiktoken";

// src/services/webSearchService.ts
import {
  Service,
  ServiceType
} from "@elizaos/core";
import { tavily } from "@tavily/core";
var WebSearchService = class _WebSearchService extends Service {
  tavilyClient;
  async initialize(_runtime) {
    const apiKey = _runtime.getSetting("TAVILY_API_KEY");
    if (!apiKey) {
      throw new Error("TAVILY_API_KEY is not set");
    }
    this.tavilyClient = tavily({ apiKey });
  }
  getInstance() {
    return _WebSearchService.getInstance();
  }
  static get serviceType() {
    return ServiceType.WEB_SEARCH;
  }
  async search(query, options) {
    try {
      const response = await this.tavilyClient.search(query, {
        includeAnswer: options?.includeAnswer || true,
        maxResults: options?.limit || 3,
        topic: options?.type || "general",
        searchDepth: options?.searchDepth || "basic",
        includeImages: options?.includeImages || false,
        days: options?.days || 3
      });
      return response;
    } catch (error) {
      console.error("Web search error:", error);
      throw error;
    }
  }
};

// src/actions/webSearch.ts
var DEFAULT_MAX_WEB_SEARCH_TOKENS = 4e3;
var DEFAULT_MODEL_ENCODING = "gpt-3.5-turbo";
function getTotalTokensFromString(str, encodingName = DEFAULT_MODEL_ENCODING) {
  const encoding = encodingForModel(encodingName);
  return encoding.encode(str).length;
}
function MaxTokens(data, maxTokens = DEFAULT_MAX_WEB_SEARCH_TOKENS) {
  if (getTotalTokensFromString(data) >= maxTokens) {
    return data.slice(0, maxTokens);
  }
  return data;
}
var webSearch = {
  name: "WEB_SEARCH",
  similes: [
    "SEARCH_WEB",
    "INTERNET_SEARCH",
    "LOOKUP",
    "QUERY_WEB",
    "FIND_ONLINE",
    "SEARCH_ENGINE",
    "WEB_LOOKUP",
    "ONLINE_SEARCH",
    "FIND_INFORMATION"
  ],
  suppressInitialMessage: true,
  description: "Perform a web search to find information related to the message.",
  // eslint-disable-next-line
  validate: async (runtime, message) => {
    const tavilyApiKeyOk = !!runtime.getSetting("TAVILY_API_KEY");
    return tavilyApiKeyOk;
  },
  handler: async (runtime, message, state, options, callback) => {
    elizaLogger.log("Composing state for message:", message);
    state = await runtime.composeState(message);
    const userId = runtime.agentId;
    elizaLogger.log("User ID:", userId);
    const webSearchPrompt = message.content.text;
    elizaLogger.log("web search prompt received:", webSearchPrompt);
    const webSearchService = new WebSearchService();
    await webSearchService.initialize(runtime);
    const searchResponse = await webSearchService.search(
      webSearchPrompt
    );
    if (searchResponse && searchResponse.results.length) {
      const responseList = searchResponse.answer ? `${searchResponse.answer}${Array.isArray(searchResponse.results) && searchResponse.results.length > 0 ? `

For more details, you can check out these resources:
${searchResponse.results.map(
        (result, index) => `${index + 1}. [${result.title}](${result.url})`
      ).join("\n")}` : ""}` : "";
      callback({
        text: MaxTokens(responseList, DEFAULT_MAX_WEB_SEARCH_TOKENS)
      });
    } else {
      elizaLogger.error("search failed or returned no data.");
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Find the latest news about SpaceX launches."
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here is the latest news about SpaceX launches:",
          action: "WEB_SEARCH"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Can you find details about the iPhone 16 release?"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here are the details I found about the iPhone 16 release:",
          action: "WEB_SEARCH"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "What is the schedule for the next FIFA World Cup?"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here is the schedule for the next FIFA World Cup:",
          action: "WEB_SEARCH"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Check the latest stock price of Tesla." }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here is the latest stock price of Tesla I found:",
          action: "WEB_SEARCH"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "What are the current trending movies in the US?"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here are the current trending movies in the US:",
          action: "WEB_SEARCH"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "What is the latest score in the NBA finals?"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here is the latest score from the NBA finals:",
          action: "WEB_SEARCH"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "When is the next Apple keynote event?" }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here is the information about the next Apple keynote event:",
          action: "WEB_SEARCH"
        }
      }
    ]
  ]
};

// src/index.ts
var webSearchPlugin = {
  name: "webSearch",
  description: "Search the web and get news",
  actions: [webSearch],
  evaluators: [],
  providers: [],
  services: [new WebSearchService()],
  clients: []
};
var index_default = webSearchPlugin;
export {
  index_default as default,
  webSearchPlugin
};
//# sourceMappingURL=index.js.map