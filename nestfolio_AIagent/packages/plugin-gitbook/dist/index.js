// src/providers/gitbook.ts
import {
  elizaLogger
} from "@elizaos/core";
function cleanText(text) {
  const cleaned = text.replace(/<@!?\d+>/g, "").replace(/<#\d+>/g, "").replace(/<@&\d+>/g, "").replace(/(?:^|\s)@[\w_]+/g, "").trim();
  return cleaned;
}
async function validateQuery(runtime, text) {
  const keywords = {
    generalQueries: [
      "how",
      "what",
      "where",
      "explain",
      "show",
      "tell",
      "can",
      "does",
      "is",
      "are",
      "will",
      "why",
      "benefits",
      "features",
      "cost",
      "price",
      "use",
      "using",
      "work",
      "access",
      "get"
    ]
  };
  try {
    const gitbookConfig = runtime.character.clientConfig?.gitbook;
    const projectTerms = gitbookConfig?.keywords?.projectTerms || [];
    const documentTriggers = gitbookConfig?.documentTriggers || [];
    if (gitbookConfig?.keywords?.generalQueries) {
      keywords.generalQueries = [
        ...keywords.generalQueries,
        ...gitbookConfig.keywords.generalQueries
      ];
    }
    const containsAnyWord = (text2, words = []) => {
      return words.length === 0 || words.some((word) => {
        if (word.includes(" ")) {
          return text2.includes(word.toLowerCase());
        }
        const regex = new RegExp(`\\b${word}\\b`, "i");
        return regex.test(text2);
      });
    };
    const hasProjectTerm = containsAnyWord(text, projectTerms);
    const hasDocTrigger = containsAnyWord(text, documentTriggers);
    const hasGeneralQuery = containsAnyWord(text, keywords.generalQueries);
    const isValid = hasProjectTerm || hasDocTrigger || hasGeneralQuery;
    elizaLogger.info(`\u2705 Is GitBook Validation Result: ${isValid}`);
    return isValid;
  } catch (error) {
    elizaLogger.warn(`\u274C Error in GitBook validation:
${error}`);
    return false;
  }
}
var gitbookProvider = {
  get: async (runtime, message, _state) => {
    try {
      const spaceId = runtime.getSetting("GITBOOK_SPACE_ID");
      if (!spaceId) {
        elizaLogger.error("\u26A0\uFE0F GitBook Space ID not configured");
        return "";
      }
      const text = message.content.text.toLowerCase().trim();
      const isValidQuery = await validateQuery(runtime, text);
      if (!isValidQuery) {
        elizaLogger.info("\u26A0\uFE0F GitBook Query validation failed");
        return "";
      }
      const cleanedQuery = cleanText(message.content.text);
      const response = await fetch(
        `https://api.gitbook.com/v1/spaces/${spaceId}/search/ask`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            query: cleanedQuery,
            variables: {}
          })
        }
      );
      if (!response.ok) {
        elizaLogger.error("\u274C GitBook API error:", response.status);
        return "";
      }
      const result = await response.json();
      return `## GitBook Provider
### Query: ${message.content.text}
### Answer:
${result.answer?.text || ""}`;
    } catch (error) {
      elizaLogger.error("\u274C Error in GitBook provider:", error);
      return "";
    }
  }
};

// src/index.ts
var gitbookPlugin = {
  name: "GitBook Documentation",
  description: "Plugin for querying GitBook documentation",
  actions: [],
  providers: [gitbookProvider],
  evaluators: []
};
var index_default = gitbookPlugin;
export {
  index_default as default,
  gitbookPlugin
};
//# sourceMappingURL=index.js.map