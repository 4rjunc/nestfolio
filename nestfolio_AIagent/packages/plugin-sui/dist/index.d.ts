import { Action, ICacheManager, Plugin } from '@elizaos/core';
import { SuiClient } from '@mysten/sui/client';

declare const _default: Action;

interface WalletPortfolio {
    totalUsd: string;
    totalSui: string;
}
interface Prices {
    sui: {
        usd: string;
    };
}
declare class WalletProvider {
    private suiClient;
    private address;
    private cacheManager;
    private cache;
    private cacheKey;
    constructor(suiClient: SuiClient, address: string, cacheManager: ICacheManager);
    private readFromCache;
    private writeToCache;
    private getCachedData;
    private setCachedData;
    private fetchPricesWithRetry;
    fetchPortfolioValue(): Promise<WalletPortfolio>;
    fetchPrices(): Promise<Prices>;
    formatPortfolio(runtime: any, portfolio: WalletPortfolio): string;
    getFormattedPortfolio(runtime: any): Promise<string>;
}

declare const suiPlugin: Plugin;

export { _default as TransferSuiToken, WalletProvider, suiPlugin as default, suiPlugin };
