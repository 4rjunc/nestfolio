import { Action, ICacheManager, Plugin } from '@elizaos/core';
import { Aptos } from '@aptos-labs/ts-sdk';

declare const _default: Action;

interface WalletPortfolio {
    totalUsd: string;
    totalMove: string;
}
interface Prices {
    move: {
        usd: string;
    };
}
declare class WalletProvider {
    private aptosClient;
    private address;
    private cacheManager;
    private cache;
    private cacheKey;
    constructor(aptosClient: Aptos, address: string, cacheManager: ICacheManager);
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

declare const movementPlugin: Plugin;

export { _default as TransferMovementToken, WalletProvider, movementPlugin as default, movementPlugin };
