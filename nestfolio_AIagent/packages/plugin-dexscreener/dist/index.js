var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/providers/tokenProvider.ts
var TokenPriceProvider = class {
  async get(_lengthruntime, message, _state) {
    try {
      const content = typeof message.content === "string" ? message.content : message.content?.text;
      if (!content) {
        throw new Error("No message content provided");
      }
      const tokenIdentifier = this.extractToken(content);
      if (!tokenIdentifier) {
        throw new Error("Could not identify token in message");
      }
      console.log(`Fetching price for token: ${tokenIdentifier}`);
      const isAddress = /^0x[a-fA-F0-9]{40}$/.test(tokenIdentifier) || /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(tokenIdentifier);
      const endpoint = isAddress ? `https://api.dexscreener.com/latest/dex/tokens/${tokenIdentifier}` : `https://api.dexscreener.com/latest/dex/search?q=${tokenIdentifier}`;
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      const data = await response.json();
      if (!data.pairs || data.pairs.length === 0) {
        throw new Error(`No pricing data found for ${tokenIdentifier}`);
      }
      const bestPair = this.getBestPair(data.pairs);
      return this.formatPriceData(bestPair);
    } catch (error) {
      console.error("TokenPriceProvider error:", error);
      return `Error: ${error.message}`;
    }
  }
  extractToken(content) {
    const patterns = [
      /0x[a-fA-F0-9]{40}/,
      // ETH address
      /[$#]([a-zA-Z0-9]+)/,
      // $TOKEN or #TOKEN
      /(?:price|value|worth|cost)\s+(?:of|for)\s+([a-zA-Z0-9]+)/i,
      // "price of TOKEN"
      /\b(?:of|for)\s+([a-zA-Z0-9]+)\b/i
      // "of TOKEN"
    ];
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const token = match[1] || match[0];
        return token.replace(/[$#]/g, "").toLowerCase().trim();
      }
    }
    return null;
  }
  getBestPair(pairs) {
    return pairs.reduce((best, current) => {
      const bestLiquidity = Number.parseFloat(best.liquidity?.usd || "0");
      const currentLiquidity = Number.parseFloat(current.liquidity?.usd || "0");
      return currentLiquidity > bestLiquidity ? current : best;
    }, pairs[0]);
  }
  formatPriceData(pair) {
    const price = Number.parseFloat(pair.priceUsd).toFixed(6);
    const liquidity = Number.parseFloat(
      pair.liquidity?.usd || "0"
    ).toLocaleString();
    const volume = (pair.volume?.h24 || 0).toLocaleString();
    return `
        The price of ${pair.baseToken.symbol} is $${price} USD, with liquidity of $${liquidity} and 24h volume of $${volume}.`;
  }
};
var tokenPriceProvider = new TokenPriceProvider();

// src/actions/tokenAction.ts
var priceTemplate = `Determine if this is a token price request. If it is one of the specified situations, perform the corresponding action:

Situation 1: "Get token price"
- Message contains: words like "price", "value", "cost", "worth" AND a token symbol/address
- Example: "What's the price of ETH?" or "How much is BTC worth?"
- Action: Get the current price of the token

Previous conversation for context:
{{conversation}}

You are replying to: {{message}}
`;
var TokenPriceAction = class {
  name = "GET_TOKEN_PRICE";
  similes = ["FETCH_TOKEN_PRICE", "CHECK_TOKEN_PRICE", "TOKEN_PRICE"];
  description = "Fetches and returns token price information";
  suppressInitialMessage = true;
  template = priceTemplate;
  async validate(_runtime, message) {
    const content = typeof message.content === "string" ? message.content : message.content?.text;
    if (!content) return false;
    const hasPriceKeyword = /\b(price|value|worth|cost)\b/i.test(content);
    const hasToken = /0x[a-fA-F0-9]{40}/.test(content) || /[$#]?[a-zA-Z0-9]+/i.test(content);
    return hasPriceKeyword && hasToken;
  }
  async handler(runtime, message, state, _options = {}, callback) {
    try {
      const provider = runtime.providers.find((p) => p instanceof TokenPriceProvider);
      if (!provider) {
        throw new Error("Token price provider not found");
      }
      console.log("Fetching price data...");
      const priceData = await provider.get(runtime, message, state);
      console.log("Received price data:", priceData);
      if (priceData.includes("Error")) {
        throw new Error(priceData);
      }
      if (callback) {
        await callback({
          text: priceData,
          action: this.name
        });
      }
      if (state) {
        state.responseData = {
          text: priceData,
          action: this.name
        };
      }
      return true;
    } catch (error) {
      console.error("Error in price action handler:", error);
      if (callback) {
        await callback({
          text: `Sorry, I couldn't fetch the token price: ${error.message}`,
          action: this.name
        });
      }
      return false;
    }
  }
  examples = [
    [
      {
        user: "{{user}}",
        content: {
          text: "check price of eth"
        }
      },
      {
        user: "{{system}}",
        content: {
          text: "The current price of Ethereum (ETH) is $2,345.67 with a 24h trading volume of $9.87B. The liquidity pool holds $1.23B, and the price has changed +5.43% in the last 24 hours.",
          action: "GET_TOKEN_PRICE"
        }
      }
    ],
    [
      {
        user: "{{user}}",
        content: {
          text: "How much is BTC worth right now?"
        }
      },
      {
        user: "{{system}}",
        content: {
          text: "Bitcoin (BTC) is currently trading at $42,567.89. There's $15.23B in liquidity, with a 24h volume of $25.87B. The price is up 2.15% in the last 24 hours.",
          action: "GET_TOKEN_PRICE"
        }
      }
    ],
    [
      {
        user: "{{user}}",
        content: {
          text: "what's the current value of $bnb"
        }
      },
      {
        user: "{{system}}",
        content: {
          text: "Binance Coin (BNB) is priced at $345.67 with $5.23B in liquidity. The trading volume over the last 24h is $1.87B, and the price has decreased by 1.23% during this period.",
          action: "GET_TOKEN_PRICE"
        }
      }
    ],
    [
      {
        user: "{{user}}",
        content: {
          text: "can you tell me the price for USDT?"
        }
      },
      {
        user: "{{system}}",
        content: {
          text: "Tether (USDT) is maintaining its peg at $1.00 with minimal change (+0.01%). The token has $25.23B in liquidity and has seen $45.87B in trading volume over the past 24 hours.",
          action: "GET_TOKEN_PRICE"
        }
      }
    ],
    [
      {
        user: "{{user}}",
        content: {
          text: "show me the cost of #SOL"
        }
      },
      {
        user: "{{system}}",
        content: {
          text: "Solana (SOL) is trading at $123.45, showing strong momentum with an 8.75% increase in the last 24 hours. The liquidity stands at $3.23B with a 24h trading volume of $987.54M.",
          action: "GET_TOKEN_PRICE"
        }
      }
    ],
    [
      {
        user: "{{user}}",
        content: {
          text: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0 price please"
        }
      },
      {
        user: "{{system}}",
        content: {
          text: "The price of Polygon (MATIC) is currently $1.23, up 3.45% in the past 24 hours. The token has $2.23B in liquidity and has seen $567.54M in trading volume today.",
          action: "GET_TOKEN_PRICE"
        }
      }
    ]
  ];
};
var tokenPriceAction = new TokenPriceAction();

// src/evaluators/tokenEvaluator.ts
var TokenPriceEvaluator = class {
  name = "TOKEN_PRICE_EVALUATOR";
  similes = ["price", "token price", "check price"];
  description = "Evaluates messages for token price requests";
  async validate(runtime, message) {
    const content = typeof message.content === "string" ? message.content : message.content?.text;
    if (!content) return false;
    const hasPriceKeyword = /\b(price|value|worth|cost)\b/i.test(content);
    const hasToken = /0x[a-fA-F0-9]{40}/.test(content) || // Ethereum address
    /[$#][a-zA-Z]+/.test(content) || // $TOKEN or #TOKEN format
    /\b(of|for)\s+[a-zA-Z0-9]+\b/i.test(content);
    return hasPriceKeyword && hasToken;
  }
  async handler(_runtime, _message, _state) {
    return "GET_TOKEN_PRICE";
  }
  examples = [
    {
      context: "User asking for token price with address",
      messages: [
        {
          user: "{{user}}",
          content: {
            text: "What's the price of 0x1234567890123456789012345678901234567890?",
            action: "GET_TOKEN_PRICE"
          }
        }
      ],
      outcome: "GET_TOKEN_PRICE"
    },
    {
      context: "User checking token price with $ symbol",
      messages: [
        {
          user: "{{user}}",
          content: {
            text: "Check price of $eth",
            action: "GET_TOKEN_PRICE"
          }
        }
      ],
      outcome: "GET_TOKEN_PRICE"
    },
    {
      context: "User checking token price with plain symbol",
      messages: [
        {
          user: "{{user}}",
          content: {
            text: "What's the value for btc",
            action: "GET_TOKEN_PRICE"
          }
        }
      ],
      outcome: "GET_TOKEN_PRICE"
    }
  ];
};
var tokenPriceEvaluator = new TokenPriceEvaluator();

// src/actions/trendsAction.ts
import {
  elizaLogger,
  getEmbeddingZeroVector
} from "@elizaos/core";
var createTokenMemory = async (runtime, _message, formattedOutput) => {
  const memory = {
    userId: _message.userId,
    agentId: _message.agentId,
    roomId: _message.roomId,
    content: { text: formattedOutput },
    createdAt: Date.now(),
    embedding: getEmbeddingZeroVector()
  };
  await runtime.messageManager.createMemory(memory);
};
var latestTokensTemplate = `Determine if this is a request for latest tokens. If it is one of the specified situations, perform the corresponding action:

Situation 1: "Get latest tokens"
- Message contains: words like "latest", "new", "recent" AND "tokens"
- Example: "Show me the latest tokens" or "What are the new tokens?"
- Action: Get the most recent tokens listed

Previous conversation for context:
{{conversation}}

You are replying to: {{message}}
`;
var LatestTokensAction = class {
  name = "GET_LATEST_TOKENS";
  similes = ["FETCH_NEW_TOKENS", "CHECK_RECENT_TOKENS", "LIST_NEW_TOKENS"];
  description = "Get the latest tokens from DexScreener API";
  suppressInitialMessage = true;
  template = latestTokensTemplate;
  async validate(_runtime, message) {
    const content = typeof message.content === "string" ? message.content : message.content?.text;
    if (!content) return false;
    const hasLatestKeyword = /\b(latest|new|recent)\b/i.test(content);
    const hasTokensKeyword = /\b(tokens?|coins?|crypto)\b/i.test(content);
    return hasLatestKeyword && hasTokensKeyword;
  }
  async handler(runtime, message, _state, _options = {}, callback) {
    elizaLogger.log("Starting GET_LATEST_TOKENS handler...");
    try {
      const response = await fetch(
        "https://api.dexscreener.com/token-profiles/latest/v1",
        {
          method: "GET",
          headers: {
            accept: "application/json"
          }
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const tokens = await response.json();
      const formattedOutput = tokens.map((token) => {
        const description = token.description || "No description available";
        return `Chain: ${token.chainId}
Token Address: ${token.tokenAddress}
URL: ${token.url}
Description: ${description}

`;
      }).join("");
      await createTokenMemory(runtime, message, formattedOutput);
      if (callback) {
        await callback({
          text: formattedOutput,
          action: this.name
        });
      }
      return true;
    } catch (error) {
      elizaLogger.error("Error fetching latest tokens:", error);
      if (callback) {
        await callback({
          text: `Failed to fetch latest tokens: ${error.message}`,
          action: this.name
        });
      }
      return false;
    }
  }
  examples = [
    [
      {
        user: "{{user}}",
        content: {
          text: "show me the latest tokens"
        }
      },
      {
        user: "{{system}}",
        content: {
          text: "Here are the latest tokens added to DexScreener...",
          action: "GET_LATEST_TOKENS"
        }
      }
    ]
  ];
};
var latestBoostedTemplate = `Determine if this is a request for latest boosted tokens. If it is one of the specified situations, perform the corresponding action:

Situation 1: "Get latest boosted tokens"
- Message contains: words like "latest", "new", "recent" AND "boosted tokens"
- Example: "Show me the latest boosted tokens" or "What are the new promoted tokens?"
- Action: Get the most recent boosted tokens

Previous conversation for context:
{{conversation}}

You are replying to: {{message}}
`;
var LatestBoostedTokensAction = class {
  name = "GET_LATEST_BOOSTED_TOKENS";
  similes = [
    "FETCH_NEW_BOOSTED_TOKENS",
    "CHECK_RECENT_BOOSTED_TOKENS",
    "LIST_NEW_BOOSTED_TOKENS"
  ];
  description = "Get the latest boosted tokens from DexScreener API";
  suppressInitialMessage = true;
  template = latestBoostedTemplate;
  async validate(_runtime, message) {
    const content = typeof message.content === "string" ? message.content : message.content?.text;
    if (!content) return false;
    const hasLatestKeyword = /\b(latest|new|recent)\b/i.test(content);
    const hasBoostedKeyword = /\b(boosted|promoted|featured)\b/i.test(
      content
    );
    const hasTokensKeyword = /\b(tokens?|coins?|crypto)\b/i.test(content);
    return hasLatestKeyword && (hasBoostedKeyword || hasTokensKeyword);
  }
  async handler(runtime, message, _state, _options = {}, callback) {
    elizaLogger.log("Starting GET_LATEST_BOOSTED_TOKENS handler...");
    try {
      const response = await fetch(
        "https://api.dexscreener.com/token-boosts/latest/v1",
        {
          method: "GET",
          headers: {
            accept: "application/json"
          }
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const tokens = await response.json();
      const formattedOutput = tokens.map((token) => {
        const description = token.description || "No description available";
        return `Chain: ${token.chainId}
Token Address: ${token.tokenAddress}
URL: ${token.url}
Description: ${description}

`;
      }).join("");
      await createTokenMemory(runtime, message, formattedOutput);
      if (callback) {
        await callback({
          text: formattedOutput,
          action: this.name
        });
      }
      return true;
    } catch (error) {
      elizaLogger.error("Error fetching latest boosted tokens:", error);
      if (callback) {
        await callback({
          text: `Failed to fetch latest boosted tokens: ${error.message}`,
          action: this.name
        });
      }
      return false;
    }
  }
  examples = [
    [
      {
        user: "{{user}}",
        content: {
          text: "show me the latest boosted tokens"
        }
      },
      {
        user: "{{system}}",
        content: {
          text: "Here are the latest boosted tokens on DexScreener...",
          action: "GET_LATEST_BOOSTED_TOKENS"
        }
      }
    ]
  ];
};
var topBoostedTemplate = `Determine if this is a request for top boosted tokens. If it is one of the specified situations, perform the corresponding action:

Situation 1: "Get top boosted tokens"
- Message contains: words like "top", "best", "most" AND "boosted tokens"
- Example: "Show me the top boosted tokens" or "What are the most promoted tokens?"
- Action: Get the tokens with most active boosts

Previous conversation for context:
{{conversation}}

You are replying to: {{message}}
`;
var TopBoostedTokensAction = class {
  name = "GET_TOP_BOOSTED_TOKENS";
  similes = [
    "FETCH_MOST_BOOSTED_TOKENS",
    "CHECK_HIGHEST_BOOSTED_TOKENS",
    "LIST_TOP_BOOSTED_TOKENS"
  ];
  description = "Get tokens with most active boosts from DexScreener API";
  suppressInitialMessage = true;
  template = topBoostedTemplate;
  async validate(_runtime, message) {
    const content = typeof message.content === "string" ? message.content : message.content?.text;
    if (!content) return false;
    const hasTopKeyword = /\b(top|best|most)\b/i.test(content);
    const hasBoostedKeyword = /\b(boosted|promoted|featured)\b/i.test(
      content
    );
    const hasTokensKeyword = /\b(tokens?|coins?|crypto)\b/i.test(content);
    return hasTopKeyword && (hasBoostedKeyword || hasTokensKeyword);
  }
  async handler(runtime, message, _state, _options = {}, callback) {
    elizaLogger.log("Starting GET_TOP_BOOSTED_TOKENS handler...");
    try {
      const response = await fetch(
        "https://api.dexscreener.com/token-boosts/top/v1",
        {
          method: "GET",
          headers: {
            accept: "application/json"
          }
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const tokens = await response.json();
      const formattedOutput = tokens.map((token) => {
        const description = token.description || "No description available";
        return `Chain: ${token.chainId}
Token Address: ${token.tokenAddress}
URL: ${token.url}
Description: ${description}

`;
      }).join("");
      await createTokenMemory(runtime, message, formattedOutput);
      if (callback) {
        await callback({
          text: formattedOutput,
          action: this.name
        });
      }
      return true;
    } catch (error) {
      elizaLogger.error("Error fetching top boosted tokens:", error);
      if (callback) {
        await callback({
          text: `Failed to fetch top boosted tokens: ${error.message}`,
          action: this.name
        });
      }
      return false;
    }
  }
  examples = [
    [
      {
        user: "{{user}}",
        content: {
          text: "show me the top boosted tokens"
        }
      },
      {
        user: "{{system}}",
        content: {
          text: "Here are the tokens with the most active boosts on DexScreener...",
          action: "GET_TOP_BOOSTED_TOKENS"
        }
      }
    ]
  ];
};
var latestTokensAction = new LatestTokensAction();
var latestBoostedTokensAction = new LatestBoostedTokensAction();
var topBoostedTokensAction = new TopBoostedTokensAction();

// src/actions/index.ts
var actions_exports = {};
__export(actions_exports, {
  LatestBoostedTokensAction: () => LatestBoostedTokensAction,
  LatestTokensAction: () => LatestTokensAction,
  TokenPriceAction: () => TokenPriceAction,
  TopBoostedTokensAction: () => TopBoostedTokensAction,
  latestBoostedTemplate: () => latestBoostedTemplate,
  latestBoostedTokensAction: () => latestBoostedTokensAction,
  latestTokensAction: () => latestTokensAction,
  latestTokensTemplate: () => latestTokensTemplate,
  priceTemplate: () => priceTemplate,
  tokenPriceAction: () => tokenPriceAction,
  topBoostedTemplate: () => topBoostedTemplate,
  topBoostedTokensAction: () => topBoostedTokensAction
});

// src/evaluators/index.ts
var evaluators_exports = {};
__export(evaluators_exports, {
  TokenPriceEvaluator: () => TokenPriceEvaluator,
  tokenPriceEvaluator: () => tokenPriceEvaluator
});

// src/providers/index.ts
var providers_exports = {};
__export(providers_exports, {
  TokenPriceProvider: () => TokenPriceProvider,
  tokenPriceProvider: () => tokenPriceProvider
});

// src/index.ts
var dexScreenerPlugin = {
  name: "dexscreener",
  description: "Dex Screener Plugin with Token Price Action, Token Trends, Evaluators and Providers",
  actions: [new TokenPriceAction(), new LatestTokensAction(), new LatestBoostedTokensAction(), new TopBoostedTokensAction()],
  evaluators: [new TokenPriceEvaluator()],
  providers: [new TokenPriceProvider()]
};
var index_default = dexScreenerPlugin;
export {
  actions_exports as actions,
  index_default as default,
  dexScreenerPlugin,
  evaluators_exports as evaluators,
  providers_exports as providers
};
//# sourceMappingURL=index.js.map