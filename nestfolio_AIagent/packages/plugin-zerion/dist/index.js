// src/constants.ts
var ZERION_V1_BASE_URL = "https://api.zerion.io/v1";

// src/providers/index.ts
var zerionProvider = {
  get: async (_runtime, message, _state) => {
    try {
      if (!process.env.ZERION_API_KEY) {
        throw new Error("Zerion API key not found in environment variables. Make sure to set the ZERION_API_KEY environment variable.");
      }
      const content = message.content;
      const addressMatch = content.text.match(/0x[a-fA-F0-9]{40}/);
      if (!addressMatch) {
        throw new Error("Valid ethereum address not found in message");
      }
      const address = addressMatch[0];
      const baseUrl = ZERION_V1_BASE_URL;
      const response = await fetch(`${baseUrl}/wallets/${address}/portfolio`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Basic ${process.env.ZERION_API_KEY}`
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch portfolio: ${response.statusText}`);
      }
      const apiResponse = await response.json();
      const { attributes } = apiResponse.data;
      const portfolioData = {
        totalValue: attributes.total.positions,
        chainDistribution: attributes.positions_distribution_by_chain,
        positionTypes: attributes.positions_distribution_by_type,
        changes: {
          absolute_1d: attributes.changes.absolute_1d,
          percent_1d: attributes.changes.percent_1d
        }
      };
      return { success: true, data: portfolioData };
    } catch (error) {
      console.log("error fetching portfolio", error);
      return { success: false, error: error instanceof Error ? error.message : "Failed to fetch portfolio data from zerion" };
    }
  },
  getPositions: async (_runtime, message) => {
    const addressMatch = message.content.text.match(/0x[a-fA-F0-9]{40}/);
    if (!addressMatch) {
      return {
        success: false,
        error: "No valid address found in message"
      };
    }
    const address = addressMatch[0];
    const response = await fetch(`https://api.zerion.io/v1/wallets/${address}/positions?filter[positions]=only_simple&currency=usd&filter[trash]=only_non_trash&sort=value`, {
      headers: {
        "Accept": "application/json",
        "Authorization": `Basic ${process.env.ZERION_API_KEY}`
      }
    });
    const data = await response.json();
    let totalValue = 0;
    const positions = data.data.map((position) => {
      const value = position.attributes.value || 0;
      totalValue += value;
      return {
        name: position.attributes.fungible_info.name,
        symbol: position.attributes.fungible_info.symbol,
        quantity: position.attributes.quantity.float,
        value: position.attributes.value,
        price: position.attributes.price,
        chain: position.relationships.chain.data.id,
        change24h: position.attributes.changes?.percent_1d || null,
        verified: position.attributes.fungible_info.flags.verified
      };
    });
    return {
      success: true,
      data: {
        positions,
        totalValue
      }
    };
  }
};

// src/utils.ts
var formatPortfolioData = (data) => {
  return `Total Value of the portfolio is $${data.totalValue.toFixed(2)}. In 24 hours the portfolio has changed by (${data.changes.percent_1d}%).`;
};
var formatPositionsData = (data) => {
  let response = `Total Portfolio Value: $${data.totalValue.toFixed(2)}

Token Positions:
`;
  const sortedPositions = [...data.positions].sort((a, b) => {
    if (a.value === null && b.value === null) return 0;
    if (a.value === null) return 1;
    if (b.value === null) return -1;
    return b.value - a.value;
  });
  for (const position of sortedPositions) {
    const valueStr = position.value !== null ? `$${position.value.toFixed(2)}` : "N/A";
    const change24hStr = position.change24h !== null ? `${position.change24h.toFixed(2)}%` : "N/A";
    response += `${position.name} Value: ${valueStr} 24h Change: ${change24hStr}
`;
  }
  return response;
};

// src/actions/getWalletPortfolio/examples.ts
var examples_default = [
  [
    {
      user: "{{user1}}",
      content: {
        text: "check the wallet balance of: {{address}}"
      }
    },
    {
      user: "{{agentName}}",
      content: {
        text: "Total Value of the portfolio is $5000",
        action: "getwallet_portfolio"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: {
        text: "what's the balance for {{address}}"
      }
    },
    {
      user: "{{agentName}}",
      content: {
        text: "I will fetch the portfolio for {{address}}",
        action: "getwallet_portfolio"
      }
    },
    {
      user: "{{agentName}}",
      content: {
        text: "Total Value of the portfolio is $40248.64"
      }
    }
  ]
];

// src/actions/getWalletPortfolio/index.ts
var getWalletPortfolio = {
  name: "getwallet_portfolio",
  description: "Fetch a wallet's portfolio data from Zerion for an address",
  similes: [
    "getwallet_portfolio",
    "displayportfolio",
    "getwallet_holdings",
    "getwallet_balance",
    "getwallet_value",
    "get_portfolio_value",
    "get wallet portfolio",
    "get wallet holdings",
    "get wallet balance",
    "get wallet value"
  ],
  examples: examples_default,
  validate: async (_runtime, message) => {
    const addressRegex = /0x[a-fA-F0-9]{40}/;
    return addressRegex.test(message.content.text);
  },
  handler: async (runtime, message, _state, _options, callback) => {
    console.log("inside handler of zerion");
    const response = await zerionProvider.get(runtime, message);
    console.log("ZERION portfolioAPI response: ", response);
    if (!response.success || !response.data) {
      return false;
    }
    console.log("ZERION API response: ", response);
    if (!isPortfolioData(response.data)) {
      return false;
    }
    const formattedResponse = formatPortfolioData(response.data);
    if (callback) {
      console.log("sending response to callback");
      callback({
        text: formattedResponse,
        content: {
          ...response.data
        }
      });
    }
    return true;
  }
};
function isPortfolioData(data) {
  return "chainDistribution" in data && "positionTypes" in data && "changes" in data;
}

// src/actions/getWalletPositions/examples.ts
var examples_default2 = [
  [
    {
      user: "{{user1}}",
      content: {
        text: "Show me the tokens in wallet 0x687fb7a442973c53674ac65bfcaf287860ba6db3"
      }
    },
    {
      user: "{{agentName}}",
      content: {
        text: "I'll fetch the token positions for wallet 0x687fb7a442973c53674ac65bfcaf287860ba6db3",
        action: "getwallet_positions"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: {
        text: "What tokens does 0x687fb7a442973c53674ac65bfcaf287860ba6db3 hold?"
      }
    },
    {
      user: "{{agentName}}",
      content: {
        text: "I'll check what tokens are held in wallet 0x687fb7a442973c53674ac65bfcaf287860ba6db3",
        action: "getwallet_positions"
      }
    },
    {
      user: "{{agentName}}",
      content: {
        text: "Total Portfolio Value: $40248.64\n\nToken Positions:\n"
      }
    }
  ],
  [
    {
      user: "{{user1}}",
      content: {
        text: "List the positions for 0x687fb7a442973c53674ac65bfcaf287860ba6db3"
      }
    },
    {
      user: "{{agentName}}",
      content: {
        text: "I'll get all token positions for wallet 0x687fb7a442973c53674ac65bfcaf287860ba6db3",
        action: "getwallet_positions"
      }
    }
  ]
];

// src/actions/getWalletPositions/index.ts
var getWalletPositions = {
  name: "getwallet_positions",
  description: "Fetch a wallet's token positions from Zerion for an address",
  examples: examples_default2,
  similes: [
    "getwallet_positions",
    "displaypositions",
    "getwallet_tokens",
    "get_token_positions",
    "get wallet positions",
    "get wallet tokens",
    "get token positions",
    "list tokens"
  ],
  validate: async (_runtime, message) => {
    const addressRegex = /0x[a-fA-F0-9]{40}/;
    return addressRegex.test(message.content.text);
  },
  handler: async (runtime, message, _state, _options, callback) => {
    const response = await zerionProvider.getPositions(runtime, message);
    console.log("ZERION positions API response: ", response);
    if (!response.success || !response.data) {
      return false;
    }
    console.log("ZERION API response: ", response);
    const formattedResponse = formatPositionsData(response.data);
    if (callback) {
      console.log("sending response to callback");
      callback({
        text: formattedResponse,
        content: {
          ...response.data
        }
      });
    }
    return true;
  }
};

// src/index.ts
var zerionPlugin = {
  name: "zerion",
  description: "Plugin for interacting with zerion API to fetch wallet portfolio data",
  actions: [getWalletPortfolio, getWalletPositions]
  // implement actions and use them here
};
export {
  zerionPlugin
};
//# sourceMappingURL=index.js.map