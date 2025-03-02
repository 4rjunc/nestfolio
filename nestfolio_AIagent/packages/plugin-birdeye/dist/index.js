// src/actions/token-search-address.ts
import {
  elizaLogger as elizaLogger3,
  formatTimestamp
} from "@elizaos/core";

// src/birdeye.ts
import { elizaLogger as elizaLogger2, settings } from "@elizaos/core";
import NodeCache from "node-cache";
import * as path from "node:path";

// src/constants.ts
var DEFAULT_MAX_RETRIES = 3;
var DEFAULT_SUPPORTED_SYMBOLS = {
  SOL: "So11111111111111111111111111111111111111112",
  BTC: "qfnqNqs3nCAHjnyCgLRDbBtq4p2MtHZxw8YjSyYhPoL",
  ETH: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
  Example: "2weMjPLLybRMMva1fM3U31goWWrCpF59CHWNhnCJ9Vyh"
};
var API_BASE_URL = "https://public-api.birdeye.so";
var RETRY_DELAY_MS = 2e3;
var BIRDEYE_ENDPOINTS = {
  defi: {
    networks: "/defi/networks",
    // https://docs.birdeye.so/reference/get_defi-networks
    price: "/defi/price",
    // https://docs.birdeye.so/reference/get_defi-price
    price_multi: "/defi/multi_price",
    // https://docs.birdeye.so/reference/get_defi-multi-price
    price_multi_POST: "/defi/multi_price",
    // https://docs.birdeye.so/reference/post_defi-multi-price
    history_price: "/defi/history_price",
    // https://docs.birdeye.so/reference/get_defi-history-price
    historical_price_unix: "/defi/historical_price_unix",
    // https://docs.birdeye.so/reference/get_defi-historical-price-unix
    trades_token: "/defi/txs/token",
    // https://docs.birdeye.so/reference/get_defi-txs-token
    trades_pair: "/defi/txs/pair",
    // https://docs.birdeye.so/reference/get_defi-txs-pair
    trades_token_seek: "/defi/txs/token/seek_by_time",
    // https://docs.birdeye.so/reference/get_defi-txs-token-seek-by-time
    trades_pair_seek: "/defi/txs/pair/seek_by_time",
    // https://docs.birdeye.so/reference/get_defi-txs-pair-seek-by-time
    ohlcv: "/defi/ohlcv",
    // https://docs.birdeye.so/reference/get_defi-ohlcv
    ohlcv_pair: "/defi/ohlcv/pair",
    // https://docs.birdeye.so/reference/get_defi-ohlcv-pair
    ohlcv_base_quote: "/defi/ohlcv/base_quote",
    // https://docs.birdeye.so/reference/get_defi-ohlcv-base-quote
    price_volume: "/defi/price_volume/single",
    // https://docs.birdeye.so/reference/get_defi-price-volume-single
    price_volume_multi: "/defi/price_volume/multi",
    // https://docs.birdeye.so/reference/get_defi-price-volume-multi
    price_volume_multi_POST: "/defi/price_volume/multi"
    // https://docs.birdeye.so/reference/post_defi-price-volume-multi
  },
  token: {
    list_all: "/defi/tokenlist",
    // https://docs.birdeye.so/reference/get_defi-tokenlist
    security: "/defi/token_security",
    // https://docs.birdeye.so/reference/get_defi-token-security
    overview: "/defi/token_overview",
    // https://docs.birdeye.so/reference/get_defi-token-overview
    creation_info: "/defi/token_creation_info",
    // https://docs.birdeye.so/reference/get_defi-token-creation-info
    trending: "/defi/token_trending",
    // https://docs.birdeye.so/reference/get_defi-token-trending
    list_all_v2_POST: "/defi/v2/tokens/all",
    // https://docs.birdeye.so/reference/post_defi-v2-tokens-all
    new_listing: "/defi/v2/tokens/new_listing",
    // https://docs.birdeye.so/reference/get_defi-v2-tokens-new-listing
    top_traders: "/defi/v2/tokens/top_traders",
    // https://docs.birdeye.so/reference/get_defi-v2-tokens-top-traders
    all_markets: "/defi/v2/markets",
    // https://docs.birdeye.so/reference/get_defi-v2-markets
    metadata_single: "/defi/v3/token/meta-data/single",
    // https://docs.birdeye.so/reference/get_defi-v3-token-meta-data-single
    metadata_multi: "/defi/v3/token/meta-data/multiple",
    // https://docs.birdeye.so/reference/get_defi-v3-token-meta-data-multiple
    market_data: "/defi/v3/token/market-data",
    // https://docs.birdeye.so/reference/get_defi-v3-token-market-data
    trade_data_single: "/defi/v3/token/trade-data/single",
    // https://docs.birdeye.so/reference/get_defi-v3-token-trade-data-single
    trade_data_multi: "/defi/v3/token/trade-data/multiple",
    // https://docs.birdeye.so/reference/get_defi-v3-token-trade-data-multiple
    holders: "/defi/v3/token/holder",
    // https://docs.birdeye.so/reference/get_defi-v3-token-holder
    mint_burn: "/defi/v3/token/mint-burn-txs"
    // https://docs.birdeye.so/reference/get_defi-v3-token-mint-burn-txs
  },
  wallet: {
    networks: "/v1/wallet/list_supported_chain",
    // https://docs.birdeye.so/reference/get_v1-wallet-list-supported-chain
    portfolio: "/v1/wallet/token_list",
    // https://docs.birdeye.so/reference/get_v1-wallet-token-list
    portfolio_multichain: "/v1/wallet/multichain_token_list",
    // https://docs.birdeye.so/reference/get_v1-wallet-multichain-token-list
    token_balance: "/v1/wallet/token_balance",
    // https://docs.birdeye.so/reference/get_v1-wallet-token-balance
    transaction_history: "/v1/wallet/tx_list",
    // https://docs.birdeye.so/reference/get_v1-wallet-tx-list
    transaction_history_multichain: "/v1/wallet/multichain_tx_list",
    // https://docs.birdeye.so/reference/get_v1-wallet-multichain-tx-list
    transaction_simulation_POST: "/v1/wallet/simulate"
    // https://docs.birdeye.so/reference/post_v1-wallet-simulate
  },
  trader: {
    gainers_losers: "/trader/gainers-losers",
    // https://docs.birdeye.so/reference/get_trader-gainers-losers
    trades_seek: "/trader/txs/seek_by_time"
    // https://docs.birdeye.so/reference/get_trader-txs-seek-by-time
  },
  pair: {
    overview_multi: "/defi/v3/pair/overview/multiple",
    // https://docs.birdeye.so/reference/get_defi-v3-pair-overview-multiple
    overview_single: "/defi/v3/pair/overview/single"
    // https://docs.birdeye.so/reference/get_defi-v3-pair-overview-single
  },
  search: {
    token_market: "/defi/v3/search"
    // https://docs.birdeye.so/reference/get_defi-v3-search
  }
};

// src/utils.ts
import { elizaLogger } from "@elizaos/core";
var extractChain = (text) => {
  if (text.match(/0x[a-fA-F0-9]{64}/)) {
    return "sui";
  }
  if (text.match(/0x[a-fA-F0-9]{40}/)) {
    return "ethereum";
  }
  return "solana";
};
var extractAddresses = (text) => {
  const addresses = [];
  const evmAddresses = text.match(/0x[a-fA-F0-9]{40}/g);
  if (evmAddresses) {
    addresses.push(
      ...evmAddresses.map((address) => ({
        address,
        chain: "evm"
        // we don't yet know the chain but can assume it's EVM-compatible
      }))
    );
  }
  const solAddresses = text.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/g);
  if (solAddresses) {
    addresses.push(
      ...solAddresses.map((address) => ({
        address,
        chain: "solana"
      }))
    );
  }
  const suiAddresses = text.match(/0x[a-fA-F0-9]{64}/g);
  if (suiAddresses) {
    addresses.push(
      ...suiAddresses.map((address) => ({
        address,
        chain: "sui"
      }))
    );
  }
  return addresses;
};
var formatValue = (value) => {
  if (!value) return "N/A";
  if (value && value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  }
  if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  }
  if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
};
var formatPercentChange = (change) => {
  if (change === void 0) return "N/A";
  const symbol = change >= 0 ? "\u2191" : "\u2193";
  return `${symbol} ${Math.abs(change).toFixed(2)}%`;
};
var shortenAddress = (address) => {
  if (!address || address.length <= 12) return address || "Unknown";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
var formatPrice = (price) => {
  return price ? price < 0.01 ? price.toExponential(2) : price.toFixed(2) : "N/A";
};
var extractSymbols = (text, mode = "loose") => {
  const symbols = /* @__PURE__ */ new Set();
  const patterns = mode === "strict" ? [
    // $SYMBOL format
    /\$([A-Z0-9]{2,10})\b/gi,
    // $SYMBOL format with lowercase
    /\$([a-z0-9]{2,10})\b/gi
  ] : [
    // $SYMBOL format
    /\$([A-Z0-9]{2,10})\b/gi,
    // After articles (a/an)
    /\b(?:a|an)\s+([A-Z0-9]{2,10})\b/gi,
    // // Standalone caps
    /\b[A-Z0-9]{2,10}\b/g,
    // // Quoted symbols
    /["']([A-Z0-9]{2,10})["']/gi,
    // // Common price patterns
    /\b([A-Z0-9]{2,10})\/USD\b/gi,
    /\b([A-Z0-9]{2,10})-USD\b/gi
  ];
  patterns.forEach((pattern) => {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const symbol = (match[1] || match[0]).toUpperCase();
      symbols.add(symbol);
    }
  });
  return Array.from(symbols);
};
var waitFor = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
var formatPortfolio = (response) => {
  const { items } = response.data;
  if (!items?.length) return "No tokens found in portfolio";
  return items.map((item) => {
    const value = item?.priceUsd?.toFixed(2);
    const amount = item?.uiAmount?.toFixed(4);
    return `\u2022 ${item.symbol || "Unknown Token"}: ${amount} tokens${value !== "0.00" ? ` (Value: $${value || "unknown"})` : ""}`;
  }).join("\n");
};
var convertToStringParams = (params) => {
  return Object.entries(params || {}).reduce(
    (acc, [key, value]) => ({
      ...acc,
      [key]: value?.toString() || ""
    }),
    {}
  );
};

// src/birdeye.ts
var BaseCachedProvider = class {
  constructor(cacheManager, cacheKey, ttl) {
    this.cacheManager = cacheManager;
    this.cacheKey = cacheKey;
    this.cache = new NodeCache({ stdTTL: ttl || 300 });
  }
  cache;
  readFsCache(key) {
    return this.cacheManager.get(path.join(this.cacheKey, key));
  }
  writeFsCache(key, data) {
    return this.cacheManager.set(path.join(this.cacheKey, key), data, {
      expires: Date.now() + 5 * 60 * 1e3
    });
  }
  async readFromCache(key) {
    const val = this.cache.get(key);
    if (val) {
      return val;
    }
    const fsVal = await this.readFsCache(key);
    if (fsVal) {
      this.cache.set(key, fsVal);
    }
    return fsVal;
  }
  async writeToCache(key, val) {
    this.cache.set(key, val);
    await this.writeFsCache(key, val);
  }
};
var BirdeyeProvider = class extends BaseCachedProvider {
  symbolMap;
  maxRetries;
  constructor(cacheManager, symbolMap, maxRetries) {
    super(cacheManager, "birdeye/data");
    this.symbolMap = symbolMap || DEFAULT_SUPPORTED_SYMBOLS;
    this.maxRetries = maxRetries || DEFAULT_MAX_RETRIES;
  }
  /*
   * COMMON FETCH FUNCTIONS
   */
  async fetchWithRetry(url, options = {}) {
    let attempts = 0;
    const chain = options.headers?.["x-chain"] || settings.BIRDEYE_CHAIN || "solana";
    while (attempts < this.maxRetries) {
      attempts++;
      try {
        const resp = await fetch(url, {
          ...options,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "x-chain": chain,
            "X-API-KEY": settings.BIRDEYE_API_KEY || "",
            ...options.headers
          }
        });
        if (!resp.ok) {
          const errorText = await resp.text();
          throw new Error(
            `HTTP error! status: ${resp.status}, message: ${errorText}`
          );
        }
        const rawData = await resp.json();
        if (rawData.data !== void 0 && rawData.success !== void 0) {
          return rawData;
        }
        return {
          data: rawData,
          success: true
        };
      } catch (error) {
        if (attempts === this.maxRetries) {
          throw error;
        }
        await waitFor(RETRY_DELAY_MS);
      }
    }
  }
  async fetchWithCacheAndRetry({
    url,
    params,
    headers,
    method = "GET"
  }) {
    const stringParams = convertToStringParams(params);
    const fullUrl = `${API_BASE_URL}${url}`;
    const cacheKey = method === "GET" ? `${url}?${new URLSearchParams(stringParams)}` : `${url}:${JSON.stringify(params)}`;
    const val = await this.readFromCache(cacheKey);
    if (val) return val;
    const urlWithParams = method === "GET" && params ? `${fullUrl}?${new URLSearchParams(stringParams)}` : fullUrl;
    elizaLogger2.info(`Birdeye fetch: ${urlWithParams}`);
    const data = await this.fetchWithRetry(urlWithParams, {
      method,
      headers,
      ...method === "POST" && params && { body: JSON.stringify(params) }
    });
    await this.writeToCache(cacheKey, data);
    return data;
  }
  /*
   * DEFI FETCH FUNCTIONS
   */
  // Get a list of all supported networks.
  async fetchDefiSupportedNetworks() {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.defi.networks
    });
  }
  // Get price update of a token.
  async fetchDefiPrice(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.defi.price,
      params,
      headers: options.headers
    });
  }
  // Get price updates of multiple tokens in a single API call. Maximum 100 tokens
  async fetchDefiPriceMultiple(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.defi.price_multi,
      params,
      headers: options.headers
    });
  }
  // Get price updates of multiple tokens in a single API call. Maximum 100 tokens
  async fetchDefiPriceMultiple_POST(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.defi.price_multi_POST,
      params,
      headers: options.headers,
      method: "POST"
    });
  }
  // Get historical price line chart of a token.
  async fetchDefiPriceHistorical(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.defi.history_price,
      params,
      headers: options.headers
    });
  }
  // Get historical price by unix timestamp
  async fetchDefiPriceHistoricalByUnixTime(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.defi.historical_price_unix,
      params,
      headers: options.headers
    });
  }
  // Get list of trades of a certain token.
  async fetchDefiTradesToken(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.defi.trades_token,
      params,
      headers: options.headers
    });
  }
  // Get list of trades of a certain pair or market.
  async fetchDefiTradesPair(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.defi.trades_token,
      params,
      headers: options.headers
    });
  }
  // Get list of trades of a token with time bound option.
  async fetchDefiTradesTokenSeekByTime(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.defi.trades_token_seek,
      params,
      headers: options.headers
    });
  }
  // Get list of trades of a certain pair or market with time bound option.
  async fetchDefiTradesPairSeekByTime(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.defi.trades_pair_seek,
      params,
      headers: options.headers
    });
  }
  // Get OHLCV price of a token.
  async fetchDefiOHLCV(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.defi.ohlcv,
      params,
      headers: options.headers
    });
  }
  // Get OHLCV price of a pair.
  async fetchDefiOHLCVPair(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.defi.ohlcv_pair,
      params,
      headers: options.headers
    });
  }
  // Get OHLCV price of a base-quote pair.
  async fetchDefiOHLCVBaseQuote(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.defi.ohlcv_base_quote,
      params,
      headers: options.headers
    });
  }
  // Get price and volume of a token.
  async fetchDefiPriceVolume(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.defi.price_volume,
      params,
      headers: options.headers
    });
  }
  // Get price and volume updates of maximum 50 tokens
  async fetchDefiPriceVolumeMulti_POST(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.defi.price_volume_multi_POST,
      params,
      headers: options.headers,
      method: "POST"
    });
  }
  /*
   * TOKEN FETCH FUNCTIONS
   */
  // Get token list of any supported chains.
  async fetchTokenList(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.token.list_all,
      params,
      headers: options.headers
    });
  }
  // Get token security of any supported chains.
  async fetchTokenSecurityByAddress(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.token.security,
      params,
      headers: options.headers
    });
  }
  // Get overview of a token.
  async fetchTokenOverview(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.token.overview,
      params,
      headers: options.headers
    });
  }
  // Get creation info of token
  async fetchTokenCreationInfo(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.token.creation_info,
      params,
      headers: options.headers
    });
  }
  // Retrieve a dynamic and up-to-date list of trending tokens based on specified sorting criteria.
  async fetchTokenTrending(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.token.trending,
      params,
      headers: options.headers
    });
  }
  // This endpoint facilitates the retrieval of a list of tokens on a specified blockchain network. This upgraded version is exclusive to business and enterprise packages. By simply including the header for the requested blockchain without any query parameters, business and enterprise users can get the full list of tokens on the specified blockchain in the URL returned in the response. This removes the need for the limit response of the previous version and reduces the workload of making multiple calls.
  async fetchTokenListV2_POST(params) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.token.list_all_v2_POST,
      params,
      headers: params.headers,
      method: "POST"
    });
  }
  // Get newly listed tokens of any supported chains.
  async fetchTokenNewListing(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.token.new_listing,
      params,
      headers: options?.headers
    });
  }
  // Get top traders of given token.
  async fetchTokenTopTraders(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.token.top_traders,
      params,
      headers: options.headers
    });
  }
  // The API provides detailed information about the markets for a specific cryptocurrency token on a specified blockchain. Users can retrieve data for one or multiple markets related to a single token. This endpoint requires the specification of a token address and the blockchain to filter results. Additionally, it supports optional query parameters such as offset, limit, and required sorting by liquidity or sort type (ascending or descending) to refine the output.
  async fetchTokenAllMarketsList(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.token.all_markets,
      params,
      headers: options.headers
    });
  }
  // Get metadata of single token
  async fetchTokenMetadataSingle(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.token.metadata_single,
      params,
      headers: options.headers
    });
  }
  // Get metadata of multiple tokens
  async fetchTokenMetadataMulti(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.token.metadata_multi,
      params,
      headers: options.headers
    });
  }
  // Get market data of single token
  async fetchTokenMarketData(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.token.market_data,
      params,
      headers: options.headers
    });
  }
  // Get trade data of single token
  async fetchTokenTradeDataSingle(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.token.trade_data_single,
      params,
      headers: options.headers
    });
  }
  // Get trade data of multiple tokens
  async fetchTokenTradeDataMultiple(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.token.trade_data_multi,
      params,
      headers: options.headers
    });
  }
  // Get top holder list of the given token
  async fetchTokenHolders(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.token.holders,
      params,
      headers: options.headers
    });
  }
  // Get mint/burn transaction list of the given token. Only support solana currently
  async fetchTokenMintBurn(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.token.mint_burn,
      params,
      headers: options.headers
    });
  }
  /*
   * WALLET FETCH FUNCTIONS
   */
  async fetchWalletSupportedNetworks(options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.defi.networks,
      headers: options.headers
    });
  }
  async fetchWalletPortfolio(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.wallet.portfolio,
      params,
      headers: options.headers
    });
  }
  /**
   * @deprecated This endpoint will be decommissioned on Feb 1st, 2025.
   */
  async fetchWalletPortfolioMultichain(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.wallet.portfolio_multichain,
      params,
      headers: options.headers
    });
  }
  async fetchWalletTokenBalance(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.wallet.token_balance,
      params,
      headers: options.headers
    });
  }
  async fetchWalletTransactionHistory(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.wallet.transaction_history,
      params,
      headers: options.headers
    });
  }
  /**
   * @deprecated This endpoint will be decommissioned on Feb 1st, 2025.
   */
  async fetchWalletTransactionHistoryMultichain(params, options = {}) {
    return this.fetchWithCacheAndRetry(
      {
        url: BIRDEYE_ENDPOINTS.wallet.transaction_history_multichain,
        params,
        headers: options.headers
      }
    );
  }
  async fetchWalletTransactionSimulate_POST(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.wallet.transaction_simulation_POST,
      params,
      headers: options.headers,
      method: "POST"
    });
  }
  /*
   * TRADER FETCH FUNCTIONS
   */
  // The API provides detailed information top gainers/losers
  async fetchTraderGainersLosers(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.trader.gainers_losers,
      params,
      headers: options.headers
    });
  }
  // Get list of trades of a trader with time bound option.
  async fetchTraderTransactionsSeek(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.trader.trades_seek,
      params,
      headers: options.headers
    });
  }
  /*
   * PAIR FETCH FUNCTIONS
   */
  async fetchPairOverviewSingle(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.pair.overview_single,
      params,
      headers: options.headers
    });
  }
  // Get overview of multiple pairs
  async fetchMultiPairOverview(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.pair.overview_multi,
      params,
      headers: options.headers
    });
  }
  async fetchPairOverviewMultiple(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.pair.overview_multi,
      params,
      headers: options.headers
    });
  }
  /*
   * SEARCH FETCH FUNCTIONS
   */
  async fetchSearchTokenMarketData(params, options = {}) {
    return this.fetchWithCacheAndRetry({
      url: BIRDEYE_ENDPOINTS.search.token_market,
      params,
      headers: options.headers
    });
  }
};

// src/actions/token-search-address.ts
var tokenSearchAddressAction = {
  name: "TOKEN_SEARCH_ADDRESS",
  similes: [
    "SEARCH_TOKEN_ADDRESS",
    "FIND_TOKEN_ADDRESS",
    "LOOKUP_TOKEN_ADDRESS",
    "CHECK_TOKEN_ADDRESS",
    "GET_TOKEN_BY_ADDRESS",
    "TOKEN_ADDRESS_INFO",
    "TOKEN_ADDRESS_LOOKUP",
    "TOKEN_ADDRESS_SEARCH",
    "TOKEN_ADDRESS_CHECK",
    "TOKEN_ADDRESS_DETAILS",
    "TOKEN_CONTRACT_SEARCH",
    "TOKEN_CONTRACT_LOOKUP",
    "TOKEN_CONTRACT_INFO",
    "TOKEN_CONTRACT_CHECK",
    "VERIFY_TOKEN_ADDRESS",
    "VALIDATE_TOKEN_ADDRESS",
    "GET_TOKEN_INFO",
    "TOKEN_INFO",
    "TOKEN_REPORT",
    "TOKEN_ANALYSIS",
    "TOKEN_OVERVIEW",
    "TOKEN_SUMMARY",
    "TOKEN_INSIGHT",
    "TOKEN_DATA",
    "TOKEN_STATS",
    "TOKEN_METRICS",
    "TOKEN_PROFILE",
    "TOKEN_REVIEW",
    "TOKEN_CHECK",
    "TOKEN_LOOKUP",
    "TOKEN_FIND",
    "TOKEN_DISCOVER",
    "TOKEN_EXPLORE"
  ],
  description: "Search for detailed token information including security and trade data by address",
  handler: async (runtime, message, _state, _options, callback) => {
    try {
      const provider = new BirdeyeProvider(runtime.cacheManager);
      const addresses = extractAddresses(message.content.text);
      elizaLogger3.info(
        `Searching Birdeye provider for ${addresses.length} addresses`
      );
      const results = await Promise.all(
        addresses.map(async ({ address, chain: addressChain }) => {
          const chain = addressChain === "evm" ? "ethereum" : addressChain;
          const [overview, marketData, security, tradeData] = await Promise.all([
            provider.fetchTokenOverview(
              {
                address
              },
              {
                headers: {
                  "x-chain": chain
                }
              }
            ),
            provider.fetchTokenMarketData(
              {
                address
              },
              {
                headers: {
                  "x-chain": chain
                }
              }
            ),
            provider.fetchTokenSecurityByAddress(
              {
                address
              },
              {
                headers: {
                  "x-chain": chain
                }
              }
            ),
            provider.fetchTokenTradeDataSingle(
              {
                address
              },
              {
                headers: {
                  "x-chain": chain
                }
              }
            )
          ]);
          return {
            overview,
            marketData,
            security,
            tradeData
          };
        })
      );
      console.log(results);
      const completeResults = `I performed a search for the token addresses you requested and found the following results:

${results.map(
        (result, i) => `${formatTokenReport(addresses[i], i, result)}`
      ).join("\n\n")}`;
      callback?.({ text: completeResults });
      return true;
    } catch (error) {
      console.error("Error in searchTokens handler:", error.message);
      callback?.({ text: `Error: ${error.message}` });
      return false;
    }
  },
  validate: async (_runtime, message) => {
    const addresses = extractAddresses(message.content.text);
    return addresses.length > 0;
  },
  examples: [
    [
      {
        user: "user",
        content: {
          text: "Search for 0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9",
          action: "TOKEN_SEARCH_ADDRESS"
        }
      },
      {
        user: "user",
        content: {
          text: "Look up contract So11111111111111111111111111111111111111112",
          action: "TOKEN_ADDRESS_LOOKUP"
        }
      },
      {
        user: "user",
        content: {
          text: "Check this address: 0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
          action: "CHECK_TOKEN_ADDRESS"
        }
      },
      {
        user: "user",
        content: {
          text: "Get info for 0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
          action: "TOKEN_ADDRESS_INFO"
        }
      },
      {
        user: "user",
        content: {
          text: "Analyze contract 0x514910771af9ca656af840dff83e8264ecf986ca",
          action: "TOKEN_CONTRACT_SEARCH"
        }
      }
    ]
  ]
};
var formatTokenReport = (address, _index, result) => {
  let output = "";
  if (result.overview?.data) {
    output += "\n";
    output += "Token Overview:\n";
    output += `\u{1F4DD} Name: ${result.overview.data.name}
`;
    output += result.overview.data.symbol ? `\u{1F516} Symbol: ${result.overview.data.symbol.toUpperCase()}
` : "";
    output += `\u{1F517} Address: ${address.address}
`;
    output += `\u{1F522} Decimals: ${result.overview.data.decimals}
`;
    output += "";
    if (result.overview.data.extensions) {
      const ext = result.overview.data.extensions;
      output += "\u{1F517} Links & Info:\n";
      if (ext.website) output += `   \u2022 Website: ${ext.website}
`;
      if (ext.twitter) output += `   \u2022 Twitter: ${ext.twitter}
`;
      if (ext.telegram) output += `   \u2022 Telegram: ${ext.telegram}
`;
      if (ext.discord) output += `   \u2022 Discord: ${ext.discord}
`;
      if (ext.medium) output += `   \u2022 Medium: ${ext.medium}
`;
      if (ext.coingeckoId)
        output += `   \u2022 CoinGecko ID: ${ext.coingeckoId}
`;
      if (ext.serumV3Usdc)
        output += `   \u2022 Serum V3 USDC: ${ext.serumV3Usdc}
`;
      if (ext.serumV3Usdt)
        output += `   \u2022 Serum V3 USDT: ${ext.serumV3Usdt}
`;
    }
    output += `\u{1F4A7} Liquidity: ${formatValue(result.overview.data.liquidity)}
`;
    output += `\u23F0 Last Trade Time: ${formatTimestamp(new Date(result.overview.data.lastTradeHumanTime).getTime() / 1e3)}
`;
    output += `\u{1F4B5} Price: ${formatPrice(result.overview.data.price)}
`;
    output += `\u{1F4DC} Description: ${result.overview.data.extensions?.description ?? "N/A"}
`;
  }
  if (result.marketData?.data) {
    output += "\n";
    output += "Market Data:\n";
    output += `\u{1F4A7} Liquidity: ${formatValue(result.marketData.data.liquidity)}
`;
    output += `\u{1F4B5} Price: ${formatPrice(result.marketData.data.price)}
`;
    output += `\u{1F4E6} Supply: ${formatValue(result.marketData.data.supply)}
`;
    output += `\u{1F4B0} Market Cap: ${formatValue(result.marketData.data.marketcap)}
`;
    output += `\u{1F504} Circulating Supply: ${formatValue(result.marketData.data.circulating_supply)}
`;
    output += `\u{1F4B0} Circulating Market Cap: ${formatValue(result.marketData.data.circulating_marketcap)}
`;
  }
  if (result.tradeData?.data) {
    output += "\n";
    output += "Trade Data:\n";
    output += `\u{1F465} Holders: ${result.tradeData.data.holder}
`;
    output += `\u{1F4CA} Unique Wallets (24h): ${result.tradeData.data.unique_wallet_24h}
`;
    output += `\u{1F4C9} Price Change (24h): ${formatPercentChange(result.tradeData.data.price_change_24h_percent)}
`;
    output += `\u{1F4B8} Volume (24h USD): ${formatValue(result.tradeData.data.volume_24h_usd)}
`;
    output += `\u{1F4B5} Current Price: $${formatPrice(result.tradeData.data.price)}
`;
  }
  if (result.security?.data) {
    output += "\n";
    output += "Ownership Distribution:\n";
    output += `\u{1F3E0} Owner Address: ${shortenAddress(result.security.data.ownerAddress)}
`;
    output += `\u{1F468}\u200D\u{1F4BC} Creator Address: ${shortenAddress(result.security.data.creatorAddress)}
`;
    output += `\u{1F4E6} Total Supply: ${formatValue(result.security.data.totalSupply)}
`;
    output += result.security.data.proxied ? `\u{1F33F} Mintable: ${result.security.data.mintable ?? "N/A"}
` : "";
    output += result.security.data.proxy ? `\u{1F504} Proxied: ${result.security.data.proxy ?? "N/A"}
` : "";
    output += result.security.data.securityChecks ? `\u{1F50D} Security Checks: ${JSON.stringify(result.security.data.securityChecks)}
` : "";
  }
  return output ?? `No results found for ${address.address}`;
};

// src/actions/token-search-symbol.ts
import {
  elizaLogger as elizaLogger4
} from "@elizaos/core";
var SYMBOL_SEARCH_MODE = "strict";
var tokenSearchSymbolAction = {
  name: "TOKEN_SEARCH_SYMBOL",
  similes: [
    "SEARCH_TOKEN_SYMBOL",
    "FIND_TOKEN_SYMBOL",
    "LOOKUP_TOKEN_SYMBOL",
    "CHECK_TOKEN_SYMBOL",
    "GET_TOKEN_BY_SYMBOL",
    "SYMBOL_SEARCH",
    "SYMBOL_LOOKUP",
    "SYMBOL_CHECK",
    "TOKEN_SYMBOL_INFO",
    "TOKEN_SYMBOL_DETAILS",
    "TOKEN_SYMBOL_LOOKUP",
    "TOKEN_SYMBOL_SEARCH",
    "TOKEN_SYMBOL_CHECK",
    "TOKEN_SYMBOL_QUERY",
    "TOKEN_SYMBOL_FIND",
    "GET_TOKEN_INFO",
    "TOKEN_INFO",
    "TOKEN_REPORT",
    "TOKEN_ANALYSIS",
    "TOKEN_OVERVIEW",
    "TOKEN_SUMMARY",
    "TOKEN_INSIGHT",
    "TOKEN_DATA",
    "TOKEN_STATS",
    "TOKEN_METRICS",
    "TOKEN_PROFILE",
    "TOKEN_REVIEW",
    "TOKEN_CHECK",
    "TOKEN_LOOKUP",
    "TOKEN_FIND",
    "TOKEN_DISCOVER",
    "TOKEN_EXPLORE"
  ],
  description: "Search for detailed token information including security and trade data by symbol",
  handler: async (runtime, message, _state, _options, callback) => {
    try {
      const provider = new BirdeyeProvider(runtime.cacheManager);
      const symbols = extractSymbols(
        message.content.text,
        SYMBOL_SEARCH_MODE
      );
      elizaLogger4.info(
        `Searching Birdeye provider for ${symbols.length} symbols`
      );
      const results = await Promise.all(
        symbols.map(
          (symbol) => provider.fetchSearchTokenMarketData({
            keyword: symbol,
            sort_by: "volume_24h_usd",
            sort_type: "desc",
            chain: "all",
            limit: 5
          })
        )
      );
      const validResults = results.map(
        (r, i) => r.data.items.filter((item) => item.type === "token" && item.result).flatMap(
          (item) => item.result.filter(
            (r2) => r2.symbol?.toLowerCase() === symbols[i].toLowerCase()
          )
        )
      );
      if (validResults.length === 0) {
        return true;
      }
      const completeResults = `I performed a search for the token symbols you requested and found the following results (for more details search by contract address):

${validResults.map(
        (result, i) => `${formatTokenSummary(symbols[i], i, result)}`
      ).join("\n")}`;
      callback?.({ text: completeResults });
      return true;
    } catch (error) {
      console.error("Error in searchTokens handler:", error.message);
      callback?.({ text: `Error: ${error.message}` });
      return false;
    }
  },
  validate: async (_runtime, message) => {
    const symbols = extractSymbols(
      message.content.text,
      SYMBOL_SEARCH_MODE
    );
    return symbols.length > 0;
  },
  examples: [
    [
      {
        user: "user",
        content: {
          text: "Search for $SOL and $ETH",
          action: "SEARCH_TOKENS"
        }
      },
      {
        user: "user",
        content: {
          text: "Find information about $BTC",
          action: "TOKEN_SEARCH"
        }
      },
      {
        user: "user",
        content: {
          text: "Look up $WETH token",
          action: "LOOKUP_TOKENS"
        }
      },
      {
        user: "user",
        content: {
          text: "Tell me about SOL",
          action: "CHECK_TOKEN"
        }
      },
      {
        user: "user",
        content: {
          text: "Give me details on $ADA",
          action: "TOKEN_DETAILS"
        }
      },
      {
        user: "user",
        content: {
          text: "What can you tell me about $DOGE?",
          action: "TOKEN_INFO"
        }
      },
      {
        user: "user",
        content: {
          text: "I need a report on $XRP",
          action: "TOKEN_REPORT"
        }
      },
      {
        user: "user",
        content: {
          text: "Analyze $BNB for me",
          action: "TOKEN_ANALYSIS"
        }
      },
      {
        user: "user",
        content: {
          text: "Overview of $LTC",
          action: "TOKEN_OVERVIEW"
        }
      }
    ]
  ]
};
var formatTokenSummary = (symbol, _index, tokens) => {
  return tokens.map((token, i) => {
    let output = "";
    if (i === 0) {
      output += `Search Results for ${symbol}:

`;
    }
    output += `Search Result #${tokens.length > 0 ? i + 1 : ""}:
`;
    output += `\u{1F516} Symbol: $${token.symbol.toUpperCase()}
`;
    output += `\u{1F517} Address: ${token.address}
`;
    output += `\u{1F310} Network: ${token.network.toUpperCase()}
`;
    output += `\u{1F4B5} Price: ${formatPrice(token.price)} (${formatPercentChange(token.price_change_24h_percent)})
`;
    output += `\u{1F4B8} Volume (24h USD): ${formatValue(token.volume_24h_usd)}
`;
    output += token.market_cap ? `\u{1F4B0} Market Cap: ${formatValue(token.market_cap)}
` : "";
    output += token.fdv ? `\u{1F30A} FDV: ${formatValue(token.fdv)}
` : "";
    return output;
  }).join("\n");
};

// src/actions/wallet-search-address.ts
import {
  elizaLogger as elizaLogger5
} from "@elizaos/core";
var walletSearchAddressAction = {
  name: "WALLET_SEARCH_ADDRESS",
  similes: [
    "SEARCH_WALLET_ADDRESS",
    "FIND_WALLET_ADDRESS",
    "LOOKUP_WALLET_ADDRESS",
    "CHECK_WALLET_ADDRESS",
    "GET_WALLET_BY_ADDRESS",
    "WALLET_ADDRESS_INFO",
    "WALLET_ADDRESS_LOOKUP",
    "WALLET_ADDRESS_SEARCH",
    "WALLET_ADDRESS_CHECK",
    "WALLET_ADDRESS_DETAILS",
    "WALLET_CONTRACT_SEARCH",
    "WALLET_CONTRACT_LOOKUP",
    "WALLET_CONTRACT_INFO",
    "WALLET_CONTRACT_CHECK",
    "VERIFY_WALLET_ADDRESS",
    "VALIDATE_WALLET_ADDRESS",
    "GET_WALLET_INFO",
    "WALLET_INFO",
    "WALLET_REPORT",
    "WALLET_ANALYSIS",
    "WALLET_OVERVIEW",
    "WALLET_SUMMARY",
    "WALLET_INSIGHT",
    "WALLET_DATA",
    "WALLET_STATS",
    "WALLET_METRICS",
    "WALLET_PROFILE",
    "WALLET_REVIEW",
    "WALLET_CHECK",
    "WALLET_LOOKUP",
    "WALLET_FIND",
    "WALLET_DISCOVER",
    "WALLET_EXPLORE"
  ],
  description: "Search for detailed wallet information including portfolio and transaction data by address",
  handler: async (runtime, message, _state, _options, callback) => {
    try {
      const provider = new BirdeyeProvider(runtime.cacheManager);
      const addresses = extractAddresses(message.content.text);
      elizaLogger5.info(
        `Searching Birdeye provider for ${addresses.length} addresses`
      );
      const results = await Promise.all(
        addresses.map(async ({ address, chain: addressChain }) => {
          const chain = addressChain === "evm" ? "ethereum" : addressChain;
          return provider.fetchWalletPortfolio(
            {
              wallet: address
            },
            {
              headers: {
                chain
              }
            }
          );
        })
      );
      console.log(results);
      const completeResults = `I performed a search for the wallet addresses you requested and found the following results:

${results.map(
        (result, i) => `${formatWalletReport(addresses[i], results.length, i, result)}`
      ).join("\n\n")}`;
      callback?.({ text: completeResults });
      return true;
    } catch (error) {
      console.error("Error in searchTokens handler:", error.message);
      callback?.({ text: `Error: ${error.message}` });
      return false;
    }
  },
  validate: async (_runtime, message) => {
    const addresses = extractAddresses(message.content.text);
    return addresses.length > 0;
  },
  examples: [
    [
      {
        user: "user",
        content: {
          text: "Search wallet 0x1234567890abcdef1234567890abcdef12345678",
          action: "WALLET_SEARCH_ADDRESS"
        }
      },
      {
        user: "user",
        content: {
          text: "Look up wallet address HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH",
          action: "WALLET_ADDRESS_LOOKUP"
        }
      },
      {
        user: "user",
        content: {
          text: "Check this address: 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
          action: "CHECK_WALLET_ADDRESS"
        }
      },
      {
        user: "user",
        content: {
          text: "Get wallet info for 5yBYpGQRHPz4i5FkVnP9h9VTJBMnwgHRe5L5gw2bwp9q",
          action: "WALLET_INFO"
        }
      },
      {
        user: "user",
        content: {
          text: "Show me portfolio for 0x3cD751E6b0078Be393132286c442345e5DC49699",
          action: "WALLET_OVERVIEW"
        }
      }
    ]
  ]
};
var formatWalletReport = (address, totalResults, index, result) => {
  const tokens = result.data.items.slice(0, 10) || [];
  const totalValue = tokens.reduce(
    (sum, token) => sum + (token.valueUsd || 0),
    0
  );
  let header = `Wallet Result ${totalResults > 1 ? `#${index + 1}` : ""}
`;
  header += `\u{1F45B} Address ${address.address}*
`;
  header += `\u{1F4B0} Total Value: $${totalValue.toLocaleString()}
`;
  header += "\u{1F516} Top Holdings:";
  const tokenList = tokens.map(
    (token) => `\u2022 $${token.symbol.toUpperCase()}: $${token.valueUsd?.toLocaleString()} (${token.uiAmount?.toFixed(4)} tokens)`
  ).join("\n");
  return `${header}
${tokenList}`;
};

// src/providers/agent-portfolio-provider.ts
var agentPortfolioProvider = {
  get: async (runtime, _message, _state) => {
    try {
      const provider = new BirdeyeProvider(runtime.cacheManager);
      const walletAddr = runtime.getSetting("BIRDEYE_WALLET_ADDR");
      if (!walletAddr) {
        console.warn("No Birdeye wallet was specified");
        return "";
      }
      const chain = extractChain(walletAddr);
      const resp = await provider.fetchWalletPortfolio(
        {
          wallet: walletAddr
        },
        {
          headers: {
            chain
          }
        }
      );
      const portfolioText = formatPortfolio(resp);
      return `This is your wallet address: ${walletAddr}

This is your portfolio: [${portfolioText}]`;
    } catch (error) {
      console.error("Error fetching token data:", error);
      return "Unable to fetch token information. Please try again later.";
    }
  }
};

// src/index.ts
var birdeyePlugin = {
  name: "birdeye",
  description: "Birdeye Plugin for token data and analytics",
  actions: [
    tokenSearchSymbolAction,
    tokenSearchAddressAction,
    walletSearchAddressAction
    // testAllEndpointsAction, // this action can be used to optionally test all endpoints
  ],
  evaluators: [],
  providers: [agentPortfolioProvider]
};
var index_default = birdeyePlugin;
export {
  birdeyePlugin,
  index_default as default
};
//# sourceMappingURL=index.js.map