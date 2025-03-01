import { Action, ICacheManager, IAgentRuntime, Plugin } from '@elizaos/core';
import { PublicKey, UInt64 } from 'o1js';

declare const _default$2: Action;

declare const _default$1: Action;

declare const _default: Action;

interface WalletPortfolio {
    totalUsd: string;
    totalMina: string;
}
interface Prices {
    mina: {
        usd: number;
    };
}
declare class WalletProvider {
    private account;
    private cacheManager;
    private cache;
    private cacheKey;
    constructor(network: string, account: PublicKey, cacheManager: ICacheManager);
    get address(): string;
    private readFromCache;
    private writeToCache;
    private getCachedData;
    private setCachedData;
    private fetchPricesWithRetry;
    getBalance(): Promise<UInt64>;
    fetchPortfolioValue(): Promise<WalletPortfolio>;
    fetchPrices(): Promise<Prices>;
    formatPortfolio(runtime: IAgentRuntime, portfolio: WalletPortfolio): string;
    getFormattedPortfolio(runtime: IAgentRuntime): Promise<string>;
}

declare const minaPlugin: Plugin;

export { _default as BalanceMinaToken, _default$1 as FaucetMinaToken, _default$2 as TransferMinaToken, WalletProvider, minaPlugin as default, minaPlugin };
