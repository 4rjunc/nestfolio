// src/actions/audit.ts
import {
  ModelClass,
  composeContext,
  elizaLogger,
  generateMessageResponse
} from "@elizaos/core";

// src/templates/index.ts
import { messageCompletionFooter } from "@elizaos/core";
var auditTemplate = `Extract and analyze token security information based on the conversation context:

# Task: Generate a response for the character {{agentName}}. DO NOT PROVIDE ANY FOLLOW UP ACTIONS.
About {{agentName}}:
{{bio}}
{{lore}}

{{recentMessages}}

First, determine the token and chain to audit from the results below:

Security Audit Results:
{{auditData}}

Market Data Results:
{{marketData}}

**Analysis Instructions:**

1.  **Data Check:** If {{auditData}} is empty or indicates no security data, respond with a concise message stating there is "No security data available". Don't provide any further analysis, links, or market data. You can politely ask the user to double-check the address and chain to help confirm no issues.

2.  **Analyze User Message:** Review the {{recentMessages}} for any specific questions or areas of focus from the user. Identify keywords such as "taxes modifiable", "liquidity", "risk", "should I buy/sell", and other key points from their message. This will help you prioritize the response, while still presenting an overall summary.

3.  **Financial Advice Disclaimer:** Under no circumstances should you provide financial advice. If the user asks direct questions about buying or selling you must state you are only providing security analysis, and that any financial decisions are solely the responsibility of the user, and you will not be telling the user to buy or sell.

4.  **Risk Assessment:** Provide three distinct risk evaluations:
    * Contract Risk: Based on audit data - evaluate security features, functions, and potential vulnerabilities in the smart contract
    * Liquidity Risk: Based on market data - evaluate the total liquidity across all sources and its distribution
    * Overall Risk: Combine contract and liquidity risks, plus consider any other relevant factors
    * For low-risk contracts, always remind users to:
      - Conduct their own research (DYOR)
      - Assess the team/project behind the token
      - Evaluate the broader project context beyond just technical analysis

5.  **Data Discrepancy Check:** Compare the liquidity information provided in {{auditData}} with that from {{marketData}}. Use market data as the source of truth for liquidity information. Do not explicitly mention discrepancies unless they present a specific security risk.

6.  **Tax Handling:** When reporting buy/sell/transfer taxes:
    * Always round DOWN to the nearest whole number (e.g., 4.5% becomes 4%, 0.5% becomes 0%)
    * Do not include messaging about slippage
    * Present the rounded tax percentage directly

7.  **Character Focus & Structure:** Infuse the response with the persona of {{agentName}} using details from {{bio}} and {{lore}}. This includes determining the structure, tone, and overall presentation style. You are free to use the basic data points (risks, findings, liquidity, market, link) in a format that is appropriate for the character. The format should be a natural conversation, and not always a strict list. The user should still be able to determine the risk clearly, and any key findings should still be highlighted, but in a more dynamic format.

8.  **Security Analysis (if data exists):**
    * Begin by stating the token symbol along with the address and chain
    * Provide an overall security assessment using simple language
    * Highlight key security findings, emphasizing any high risks, and any user-related topics
    * Provide key analysis points that are clear and easily understandable, avoiding jargon
    * Address trading parameters and limitations specific to the security data
    * Present total liquidity as a combined figure across all sources, only breaking down if there's a specific reason to highlight distribution
    * If the data implies any high risk or need for further due diligence, make sure to highlight that clearly

9.  **Quick Intel link** If security data is present, include the following link for further investigation, replacing {{chain}} and {{token}} with the relevant values, and make sure it's well placed within the text:
    https://app.quickintel.io/scanner?type=token&chain={{chain}}&contractAddress={{token}}

10. **No Hypotheticals:** Don't explore hypothetical or "what if" scenarios. Stick to the data you are given, and avoid speculation.

11. **User Friendly:** Format your response as a clear security analysis suitable for users, in an easy-to-understand manner, avoiding overly technical language.

# Instructions: Based on the context above, provide your response, inline with the character {{agentName}}.` + messageCompletionFooter;

// src/utils/chain-detection.ts
var CHAIN_MAPPINGS = {
  eth: ["eth", "ethereum", "ether", "mainnet"],
  bsc: ["bsc", "binance", "bnb", "binance smart chain", "smartchain"],
  polygon: ["polygon", "matic", "poly"],
  arbitrum: ["arbitrum", "arb", "arbitrum one"],
  avalanche: ["avalanche", "avax", "avalanche c-chain"],
  base: ["base"],
  optimism: ["optimism", "op", "optimistic"],
  fantom: ["fantom", "ftm", "opera"],
  cronos: ["cronos", "cro"],
  gnosis: ["gnosis", "xdai", "dai chain"],
  celo: ["celo"],
  moonbeam: ["moonbeam", "glmr"],
  moonriver: ["moonriver", "movr"],
  harmony: ["harmony", "one"],
  aurora: ["aurora"],
  metis: ["metis", "andromeda"],
  boba: ["boba"],
  kcc: ["kcc", "kucoin"],
  heco: ["heco", "huobi"],
  okex: ["okex", "okexchain", "okc"],
  zkera: ["zkera", "zksync era", "era"],
  zksync: ["zksync", "zks"],
  polygonzkevm: ["polygon zkevm", "zkevm"],
  linea: ["linea"],
  mantle: ["mantle"],
  scroll: ["scroll"],
  core: ["core", "core dao"],
  telos: ["telos"],
  syscoin: ["syscoin", "sys"],
  conflux: ["conflux", "cfx"],
  klaytn: ["klaytn", "klay"],
  fusion: ["fusion", "fsn"],
  canto: ["canto"],
  nova: ["nova", "arbitrum nova"],
  fuse: ["fuse"],
  evmos: ["evmos"],
  astar: ["astar"],
  dogechain: ["dogechain", "doge"],
  thundercore: ["thundercore", "tt"],
  oasis: ["oasis"],
  velas: ["velas"],
  meter: ["meter"],
  sx: ["sx", "sx network"],
  kardiachain: ["kardiachain", "kai"],
  wanchain: ["wanchain", "wan"],
  gochain: ["gochain"],
  ethereumpow: ["ethereumpow", "ethw"],
  pulse: ["pulsechain", "pls"],
  kava: ["kava"],
  milkomeda: ["milkomeda"],
  nahmii: ["nahmii"],
  worldchain: ["worldchain"],
  ink: ["ink"],
  soneium: ["soneium"],
  sonic: ["sonic"],
  morph: ["morph"],
  real: ["real", "re.al"],
  mode: ["mode"],
  zeta: ["zeta"],
  blast: ["blast"],
  unichain: ["unichain"],
  abstract: ["abstract"],
  step: ["step", "stepnetwork"],
  ronin: ["ronin", "ron"],
  iotex: ["iotex"],
  shiden: ["shiden"],
  elastos: ["elastos", "ela"],
  solana: ["solana", "sol"],
  tron: ["tron", "trx"],
  sui: ["sui"]
};
var TOKEN_PATTERNS = {
  evm: /\b(0x[a-fA-F0-9]{40})\b/i,
  solana: /\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/i,
  tron: /\b(T[1-9A-HJ-NP-Za-km-z]{33})\b/i,
  sui: /\b(0x[a-fA-F0-9]{64})\b/i
};
function normalizeChainName(chain) {
  const normalizedInput = chain.toLowerCase().trim();
  for (const [standardName, variations] of Object.entries(CHAIN_MAPPINGS)) {
    if (variations.some((v) => normalizedInput.includes(v))) {
      return standardName;
    }
  }
  return normalizedInput;
}
function extractTokenInfo(message) {
  const result = {
    chain: null,
    tokenAddress: null
  };
  const cleanMessage = message.toLowerCase().trim();
  const prepositionPattern = /(?:on|for|in|at|chain)\s+([a-zA-Z0-9]+)/i;
  const prepositionMatch = cleanMessage.match(prepositionPattern);
  for (const [chainName, variations] of Object.entries(CHAIN_MAPPINGS)) {
    if (variations.some((v) => cleanMessage.includes(v))) {
      result.chain = chainName;
      break;
    }
  }
  if (!result.chain && prepositionMatch?.[1]) {
    result.chain = normalizeChainName(prepositionMatch[1]);
  }
  for (const [chainType, pattern] of Object.entries(TOKEN_PATTERNS)) {
    const match = message.match(pattern);
    if (match?.[1]) {
      result.tokenAddress = match[1];
      if (!result.chain && chainType === "solana" && match[1].length >= 32) {
        result.chain = "solana";
      }
      break;
    }
  }
  if (!result.chain && result.tokenAddress?.startsWith("0x")) {
    result.chain = "eth";
  }
  return result;
}

// src/actions/audit.ts
var TokenAuditAction = class {
  apiKey;
  constructor(apiKey) {
    this.apiKey = apiKey;
  }
  getGeckoChainId(chain) {
    const geckoSpecificMappings = {
      "polygon": "polygon_pos",
      "avalanche": "avax",
      "gnosis": "xdai",
      "arbitrum_nova": "arbitrum_nova",
      "polygonzkevm": "polygon-zkevm",
      "ethereumpow": "ethw"
    };
    const normalizedChain = chain.toLowerCase();
    return geckoSpecificMappings[normalizedChain] || normalizedChain;
  }
  async audit(chain, tokenAddress) {
    elizaLogger.log("Auditing token:", { chain, tokenAddress });
    const myHeaders = new Headers();
    myHeaders.append("X-QKNTL-KEY", this.apiKey);
    myHeaders.append("Content-Type", "application/json");
    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: JSON.stringify({ chain, tokenAddress }),
      redirect: "follow"
    };
    const response = await fetch("https://api.quickintel.io/v1/getquickiauditfull", requestOptions);
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    return await response.json();
  }
  async fetchDexScreenerData(tokenAddress, chain) {
    elizaLogger.log("Fetching DexScreener data:", { tokenAddress, chain });
    const requestOptions = {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    };
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`, requestOptions);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    if (!data?.pairs?.length) {
      return null;
    }
    const chainPairs = data.pairs.filter(
      (pair) => pair.chainId.toLowerCase() === chain.toLowerCase() || pair.chainId.toLowerCase().includes(chain.toLowerCase())
    );
    const otherChains = data.pairs.filter((pair) => pair.chainId.toLowerCase() !== chain.toLowerCase()).map((pair) => pair.chainId);
    return {
      pairs: chainPairs,
      otherChains: Array.from(new Set(otherChains))
    };
  }
  async fetchGeckoTerminalData(tokenAddress, chain) {
    elizaLogger.log("Fetching GeckoTerminal data:", { tokenAddress, chain });
    const geckoChain = this.getGeckoChainId(chain);
    const requestOptions = {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    };
    try {
      const response = await fetch(
        `https://api.geckoterminal.com/api/v2/networks/${geckoChain}/tokens/${tokenAddress}/pools?include=included&page=1`,
        requestOptions
      );
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      if (!data?.data?.length) {
        return null;
      }
      const pairs = data.data.map((pool) => ({
        chainId: chain,
        pairAddress: pool.attributes.address,
        dexId: pool.relationships.dex.data.id,
        pairCreatedAt: pool.attributes.pool_created_at,
        priceUsd: pool.attributes.base_token_price_usd,
        priceChange: {
          h24: pool.attributes.price_change_percentage.h24,
          h6: pool.attributes.price_change_percentage.h6,
          h1: pool.attributes.price_change_percentage.h1,
          m5: pool.attributes.price_change_percentage.m5
        },
        liquidity: {
          usd: pool.attributes.reserve_in_usd
        },
        volume: {
          h24: pool.attributes.volume_usd.h24,
          h6: pool.attributes.volume_usd.h6,
          h1: pool.attributes.volume_usd.h1,
          m5: pool.attributes.volume_usd.m5
        },
        txns: {
          h24: {
            buys: pool.attributes.transactions.h24.buys,
            sells: pool.attributes.transactions.h24.sells
          },
          h1: {
            buys: pool.attributes.transactions.h1.buys,
            sells: pool.attributes.transactions.h1.sells
          }
        },
        baseToken: {
          address: pool.relationships.base_token.data.id.split("_")[1],
          name: pool.attributes.name.split(" / ")[0]
        },
        quoteToken: {
          address: pool.relationships.quote_token.data.id.split("_")[1],
          name: pool.attributes.name.split(" / ")[1].split(" ")[0]
        },
        fdv: pool.attributes.fdv_usd,
        marketCap: pool.attributes.market_cap_usd
      }));
      return {
        pairs,
        otherChains: []
        // GeckoTerminal API is chain-specific, so no other chains
      };
    } catch (error) {
      elizaLogger.error("Error fetching GeckoTerminal data:", error);
      return null;
    }
  }
  async fetchDexData(tokenAddress, chain) {
    elizaLogger.log("Fetching DEX data:", { tokenAddress, chain });
    const dexScreenerData = await this.fetchDexScreenerData(tokenAddress, chain);
    if (dexScreenerData?.pairs?.length) {
      return dexScreenerData;
    }
    const geckoData = await this.fetchGeckoTerminalData(tokenAddress, chain);
    if (geckoData?.pairs?.length) {
      return geckoData;
    }
    return null;
  }
};
var auditAction = {
  name: "AUDIT_TOKEN",
  description: "Perform a security audit on a token using QuickIntel",
  similes: ["SCAN_TOKEN", "CHECK_TOKEN", "TOKEN_SECURITY", "ANALYZE_TOKEN"],
  suppressInitialMessage: true,
  validate: async (runtime) => {
    const apiKey = runtime.getSetting("QUICKINTEL_API_KEY");
    return typeof apiKey === "string" && apiKey.length > 0;
  },
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger.log("Starting QuickIntel audit handler...");
    try {
      const apiKey = runtime.getSetting("QUICKINTEL_API_KEY");
      if (!apiKey) {
        throw new Error("QuickIntel API key not configured");
      }
      const messageText = message.content.text;
      const { chain, tokenAddress } = extractTokenInfo(messageText);
      if (!chain || !tokenAddress) {
        throw new Error("Could not determine chain and token address. Please specify both the chain and token address.");
      }
      let dexData = null;
      elizaLogger.log("Performing audit for:", { chain, tokenAddress });
      const action = new TokenAuditAction(apiKey);
      const auditData = await action.audit(chain, tokenAddress);
      if (auditData) {
        try {
          dexData = await action.fetchDexData(tokenAddress, chain);
        } catch (error) {
        }
      }
      const newState = await runtime.composeState(message, {
        ...state,
        auditData: JSON.stringify(auditData, null, 2),
        marketData: auditData?.tokenDetails?.tokenName && dexData ? JSON.stringify(dexData, null, 2) : null
      });
      const context = composeContext({
        state: newState,
        template: auditTemplate
      });
      const responseContent = await generateMessageResponse({
        runtime,
        context,
        modelClass: ModelClass.LARGE
      });
      if (!responseContent) {
        throw new Error("Failed to generate audit analysis");
      }
      if (callback) {
        const response = {
          text: responseContent.text,
          content: {
            success: true,
            data: auditData,
            params: { chain, tokenAddress }
          },
          action: responseContent.action,
          inReplyTo: message.id
        };
        const memories = await callback(response);
      }
      return true;
    } catch (error) {
      elizaLogger.error("Error in AUDIT_TOKEN handler:", error?.message, error?.error);
      if (callback) {
        await callback({
          text: "An error occurred while performing the token audit. Please try again later, and ensure the address is correct, and chain is supported.",
          content: { error: "Internal server error" },
          inReplyTo: message.id
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
          text: "Can you check if this token is safe? 0x742d35Cc6634C0532925a3b844Bc454e4438f44e on BSC"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll analyze this token's security for you.",
          action: "AUDIT_TOKEN"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Here's what I found in the security audit:\n\n\u{1F512} Overall Security Status: Medium Risk\n\nKey Findings:\n\u2705 Contract is verified\n\u2705 Not a honeypot\n\u26A0\uFE0F Ownership not renounced\n\nDetailed Analysis:\n..."
        }
      }
    ]
  ]
};

// src/index.ts
var quickIntelPlugin = {
  name: "Quick Intel",
  description: "QuickIntel Plugin for Eliza - Enables token security analysis",
  actions: [auditAction],
  providers: [],
  evaluators: [],
  services: []
};
var index_default = quickIntelPlugin;
export {
  index_default as default,
  quickIntelPlugin
};
//# sourceMappingURL=index.js.map