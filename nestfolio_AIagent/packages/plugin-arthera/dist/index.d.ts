import { IAgentRuntime, Provider, Memory, State, HandlerCallback, Plugin } from '@elizaos/core';
import { Address, Hash, Chain, PublicClient, HttpTransport, Account, WalletClient, PrivateKeyAccount } from 'viem';
import * as viemChains from 'viem/chains';

declare const _SupportedChainList: Array<keyof typeof viemChains>;
type SupportedChain = (typeof _SupportedChainList)[number];
interface Transaction {
    hash: Hash;
    from: Address;
    to: Address;
    value: bigint;
    data?: `0x${string}`;
    chainId?: number;
}
interface ChainMetadata {
    chainId: number;
    name: string;
    chain: Chain;
    rpcUrl: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
    blockExplorerUrl: string;
}
interface ChainConfig {
    chain: Chain;
    publicClient: PublicClient<HttpTransport, Chain, Account | undefined>;
    walletClient?: WalletClient;
}
interface TransferParams {
    fromChain: SupportedChain;
    toAddress: Address;
    amount: string;
    data?: `0x${string}`;
}
interface ArtheraPluginConfig {
    rpcUrl?: {
        arthera?: string;
    };
    secrets?: {
        ARTHERA_PRIVATE_KEY: string;
    };
    testMode?: boolean;
    multicall?: {
        batchSize?: number;
        wait?: number;
    };
}
interface ProviderError extends Error {
    code?: number;
    data?: unknown;
}

declare class WalletProvider {
    private currentChain;
    chains: Record<string, Chain>;
    account: PrivateKeyAccount;
    constructor(privateKey: `0x${string}`, chains?: Record<string, Chain>);
    getAddress(): Address;
    getCurrentChain(): Chain;
    getPublicClient(chainName: SupportedChain): PublicClient<HttpTransport, Chain, Account | undefined>;
    getWalletClient(chainName: SupportedChain): WalletClient;
    getChainConfigs(chainName: SupportedChain): Chain;
    getWalletBalance(): Promise<string | null>;
    getWalletBalanceForChain(chainName: SupportedChain): Promise<string | null>;
    private setAccount;
    private setChains;
    private setCurrentChain;
    private createHttpTransport;
    static genChainFromName(chainName: string, customRpcUrl?: string | null): Chain;
}
declare const initWalletProvider: (runtime: IAgentRuntime) => WalletProvider;
declare const artheraWalletProvider: Provider;

declare const transferTemplate = "Given the recent messages and wallet information below:\n\n{{recentMessages}}\n\n{{walletInfo}}\n\nExtract the following information about the requested transfer:\n- Chain to execute on: Must be one of [\"arthera\", \"base\", ...] (like in viem/chains)\n- Amount to transfer: Must be a string representing the amount in AA (only number without coin symbol, e.g., \"0.1\")\n- Recipient address: Must be a valid Arthera address starting with \"0x\"\n- Token symbol or address (if not native token): Optional, leave as null for AA transfers\n\nRespond with a JSON markdown block containing only the extracted values. All fields except 'token' are required:\n\n```json\n{\n    \"fromChain\": SUPPORTED_CHAINS,\n    \"amount\": string,\n    \"toAddress\": string,\n    \"token\": string | null\n}\n```\n";

declare class TransferAction {
    private walletProvider;
    constructor(walletProvider: WalletProvider);
    transfer(params: TransferParams): Promise<Transaction>;
}
declare const transferAction: {
    name: string;
    description: string;
    handler: (runtime: IAgentRuntime, _message: Memory, state: State, _options: Record<string, unknown>, callback?: HandlerCallback) => Promise<boolean>;
    template: string;
    validate: (runtime: IAgentRuntime) => Promise<boolean>;
    examples: {
        user: string;
        content: {
            text: string;
            action: string;
        };
    }[][];
    similes: string[];
};

declare const artheraPlugin: Plugin;

export { type ArtheraPluginConfig, type ChainConfig, type ChainMetadata, type ProviderError, type SupportedChain, type Transaction, TransferAction, type TransferParams, WalletProvider, artheraPlugin, artheraWalletProvider, artheraPlugin as default, initWalletProvider, transferAction, transferTemplate };
