import { Action, Provider, Plugin } from '@elizaos/core';

declare const _default: Action;

interface WalletProvider {
    address: string;
    balance: string;
    getBalance(): Promise<string>;
    getAddress(): Promise<string>;
}
declare const walletProvider: Provider;

declare const trikonPlugin: Plugin;

export { _default as TransferTrikonToken, type WalletProvider, trikonPlugin as default, trikonPlugin, walletProvider };
