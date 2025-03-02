// src/actions/news.ts
import {
  generateText,
  ModelClass
} from "@elizaos/core";
var currentNewsAction = {
  name: "CURRENT_NEWS",
  similes: ["NEWS", "GET_NEWS", "GET_CURRENT_NEWS"],
  validate: async (_runtime, _message) => {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      throw new Error("NEWS_API_KEY environment variable is not set");
    }
    return true;
  },
  description: "Get the latest news about a specific topic if asked by the user.",
  handler: async (_runtime, _message, _state, _options, _callback) => {
    async function getCurrentNews(searchTerm2) {
      try {
        const enhancedSearchTerm = encodeURIComponent(`"${searchTerm2}" AND (Spain OR Spanish OR Madrid OR Felipe)`);
        const [everythingResponse, headlinesResponse] = await Promise.all([
          fetch(
            `https://newsapi.org/v2/everything?q=${enhancedSearchTerm}&sortBy=relevancy&language=en&pageSize=50&apiKey=${process.env.NEWS_API_KEY}`
          ),
          fetch(
            `https://newsapi.org/v2/top-headlines?q=${searchTerm2}&country=es&language=en&pageSize=50&apiKey=${process.env.NEWS_API_KEY}`
          )
        ]);
        const [everythingData, headlinesData] = await Promise.all([
          everythingResponse.json(),
          headlinesResponse.json()
        ]);
        const allArticles = [
          ...headlinesData.articles || [],
          ...everythingData.articles || []
        ].filter(
          (article) => article.title && article.description && (article.title.toLowerCase().includes(searchTerm2.toLowerCase()) || article.description.toLowerCase().includes(searchTerm2.toLowerCase()))
        );
        const uniqueArticles = Array.from(
          new Map(allArticles.map((article) => [article.title, article])).values()
        ).slice(0, 15);
        if (!uniqueArticles.length) {
          return "No news articles found.";
        }
        return uniqueArticles.map((article, index) => {
          const content = article.description || "No content available";
          const urlDomain = article.url ? new URL(article.url).hostname : "";
          return [
            `\u{1F4F0} Article ${index + 1}`,
            "\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501",
            `\u{1F4CC} **${article.title || "No title"}**
`,
            `\u{1F4DD} ${content}
`,
            `\u{1F517} Read more at: ${urlDomain}`
          ].join("\n");
        }).join("\n");
      } catch (error) {
        console.error("Failed to fetch news:", error);
        return "Sorry, there was an error fetching the news.";
      }
    }
    const context = `What is the specific topic or subject the user wants news about? Extract ONLY the search term from this message: "${_message.content.text}". Return just the search term with no additional text, punctuation, or explanation.`;
    const searchTerm = await generateText({
      runtime: _runtime,
      context,
      modelClass: ModelClass.SMALL,
      stop: ["\n"]
    });
    console.log("Search term extracted:", searchTerm);
    const currentNews = await getCurrentNews(searchTerm);
    const responseText = ` *protocol droid noises*

${currentNews}`;
    const newMemory = {
      userId: _message.agentId,
      agentId: _message.agentId,
      roomId: _message.roomId,
      content: {
        text: responseText,
        action: "CURRENT_NEWS_RESPONSE",
        source: _message.content?.source
      }
    };
    await _runtime.messageManager.createMemory(newMemory);
    _callback(newMemory.content);
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "what's the latest news about <searchTerm>?" }
      },
      {
        user: "{{user2}}",
        content: { text: "", action: "CURRENT NEWS" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "can you show me the latest news about <searchTerm>?" }
      },
      {
        user: "{{user2}}",
        content: { text: "", action: "CURRENT NEWS" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "what's in the <searchTerm> news today?" }
      },
      {
        user: "{{user2}}",
        content: { text: "", action: "CURRENT NEWS" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "show me current events about <searchTerm>?" }
      },
      {
        user: "{{user2}}",
        content: { text: "", action: "CURRENT NEWS" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "what's going on in the world of <searchTerm>?" }
      },
      {
        user: "{{user2}}",
        content: { text: "", action: "CURRENT NEWS" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "give me the latest headlines about <searchTerm>?" }
      },
      {
        user: "{{user2}}",
        content: { text: "", action: "CURRENT NEWS" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "show me news updates about <searchTerm>?" }
      },
      {
        user: "{{user2}}",
        content: { text: "", action: "CURRENT NEWS" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "what are today's top stories about <searchTerm>?" }
      },
      {
        user: "{{user2}}",
        content: { text: "", action: "CURRENT NEWS" }
      }
    ]
  ]
};

// src/index.ts
var newsPlugin = {
  name: "newsPlugin",
  description: "Get the latest news about a specific topic if asked by the user.",
  actions: [currentNewsAction]
};
var index_default = newsPlugin;
export {
  index_default as default,
  newsPlugin
};
//# sourceMappingURL=index.js.map