import { IAgentRuntime, Provider, Plugin } from '@elizaos/core';
import { z } from 'zod';
import * as fcl from '@onflow/fcl';
import { Account, TransactionStatus } from '@onflow/typedefs';
import NodeCache from 'node-cache';

declare const flowEnvSchema: z.ZodObject<{
    FLOW_ADDRESS: z.ZodString;
    FLOW_PRIVATE_KEY: z.ZodString;
    FLOW_NETWORK: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    FLOW_ENDPOINT_URL: z.ZodDefault<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    FLOW_ADDRESS?: string;
    FLOW_PRIVATE_KEY?: string;
    FLOW_NETWORK?: string;
    FLOW_ENDPOINT_URL?: string;
}, {
    FLOW_ADDRESS?: string;
    FLOW_PRIVATE_KEY?: string;
    FLOW_NETWORK?: string;
    FLOW_ENDPOINT_URL?: string;
}>;
type FlowConfig = z.infer<typeof flowEnvSchema>;
declare function validateFlowConfig(runtime: IAgentRuntime): Promise<FlowConfig>;

interface IFlowScriptExecutor {
    /**
     * Execute a script
     * @param code Cadence code
     * @param args Cadence arguments
     */
    executeScript<T>(code: string, args: fcl.ArgumentFunction, defaultValue: T): Promise<T>;
}
/**
 * Signer interface
 */
interface IFlowSigner {
    /**
     * Send a transaction
     */
    sendTransaction(code: string, args: fcl.ArgumentFunction, authz?: fcl.FclAuthorization): Promise<string>;
    /**
     * Build authorization
     */
    buildAuthorization(accountIndex?: number, privateKey?: string): (acct: Account) => Promise<fcl.AuthZ>;
}
interface TransactionResponse {
    signer: {
        address: string;
        keyIndex: number;
    };
    txid: string;
}
interface FlowAccountBalanceInfo {
    address: string;
    balance: number;
    coaAddress?: string;
    coaBalance?: number;
}

declare const scripts: {
    evmCall: any;
    evmERC20BalanceOf: any;
    evmERC20GetDecimals: any;
    evmERC20GetTotalSupply: any;
    mainGetAccountInfo: any;
};

declare const transactions: {
    evmCall: any;
    mainAccountCreateNewWithCOA: any;
    mainAccountSetupCOA: any;
    mainEVMTransferERC20: any;
    mainFlowTokenDynamicTransfer: any;
    mainFTGenericTransfer: any;
};

/**
 * Query the balance of an EVM ERC20 token
 * @param executor
 * @param owner
 * @param evmContractAddress
 */
declare function queryEvmERC20BalanceOf(executor: IFlowScriptExecutor, owner: string, evmContractAddress: string): Promise<bigint>;
/**
 * Query the decimals of an EVM ERC20 token
 * @param executor
 * @param evmContractAddress
 */
declare function queryEvmERC20Decimals(executor: IFlowScriptExecutor, evmContractAddress: string): Promise<number>;
/**
 * Query the total supply of an EVM ERC20 token
 * @param executor
 * @param evmContractAddress
 */
declare function queryEvmERC20TotalSupply(executor: IFlowScriptExecutor, evmContractAddress: string): Promise<bigint>;
/**
 * Query the account info of a Flow address
 * @param executor
 * @param address
 */
declare function queryAccountBalanceInfo(executor: IFlowScriptExecutor, address: string): Promise<FlowAccountBalanceInfo | undefined>;

declare const queries_queryAccountBalanceInfo: typeof queryAccountBalanceInfo;
declare const queries_queryEvmERC20BalanceOf: typeof queryEvmERC20BalanceOf;
declare const queries_queryEvmERC20Decimals: typeof queryEvmERC20Decimals;
declare const queries_queryEvmERC20TotalSupply: typeof queryEvmERC20TotalSupply;
declare namespace queries {
  export { queries_queryAccountBalanceInfo as queryAccountBalanceInfo, queries_queryEvmERC20BalanceOf as queryEvmERC20BalanceOf, queries_queryEvmERC20Decimals as queryEvmERC20Decimals, queries_queryEvmERC20TotalSupply as queryEvmERC20TotalSupply };
}

type NetworkType = "mainnet" | "testnet" | "emulator";
declare class FlowConnector implements IFlowScriptExecutor {
    private readonly flowJSON;
    readonly network: NetworkType;
    private readonly defaultRpcEndpoint;
    /**
     * Initialize the Flow SDK
     */
    constructor(flowJSON: object, network?: NetworkType, defaultRpcEndpoint?: string);
    /**
     * Get the RPC endpoint
     */
    get rpcEndpoint(): string;
    /**
     * Initialize the Flow SDK
     */
    onModuleInit(): Promise<void>;
    /**
     * Ensure the Flow SDK is initialized
     */
    private ensureInited;
    /**
     * Get account information
     */
    getAccount(addr: string): Promise<Account>;
    /**
     * General method of sending transaction
     */
    sendTransaction(code: string, args: fcl.ArgumentFunction, mainAuthz?: fcl.FclAuthorization, extraAuthz?: fcl.FclAuthorization[]): Promise<string>;
    /**
     * Get transaction status
     */
    getTransactionStatus(transactionId: string): Promise<TransactionStatus>;
    /**
     * Get chain id
     */
    getChainId(): Promise<string>;
    /**
     * Send transaction with single authorization
     */
    onceTransactionSealed(transactionId: string): Promise<TransactionStatus>;
    /**
     * Get block object
     * @param blockId
     */
    getBlockHeaderObject(blockId: string): Promise<fcl.BlockHeaderObject>;
    /**
     * Send script
     */
    executeScript<T>(code: string, args: fcl.ArgumentFunction, defaultValue: T): Promise<T>;
}

/**
 * Get the singleton instance of the Flow connector
 * @param runtime
 */
declare function getFlowConnectorInstance(runtime: IAgentRuntime, inputedFlowJSON?: {
    [key: string]: unknown;
}): Promise<FlowConnector>;
/**
 * Flow connector provider for AI agents
 */
declare class FlowConnectorProvider {
    private readonly instance;
    constructor(instance: FlowConnector);
    getConnectorStatus(runtime: IAgentRuntime): string;
}
declare const flowConnectorProvider: Provider;

/**
 * Flow wallet Provider
 */
declare class FlowWalletProvider implements IFlowSigner, IFlowScriptExecutor {
    private readonly connector;
    private readonly cache;
    runtime: IAgentRuntime;
    private readonly privateKeyHex?;
    readonly address: string;
    private account;
    maxKeyIndex: number;
    constructor(runtime: IAgentRuntime, connector: FlowConnector, cache?: NodeCache);
    /**
     * Get the network type
     */
    get network(): NetworkType;
    /**
     * Send a transaction
     * @param code Cadence code
     * @param args Cadence arguments
     */
    sendTransaction(code: string, args: fcl.ArgumentFunction, authz?: fcl.FclAuthorization): Promise<string>;
    /**
     * Execute a script
     * @param code Cadence code
     * @param args Cadence arguments
     */
    executeScript<T>(code: string, args: fcl.ArgumentFunction, defaultValue: T): Promise<T>;
    /**
     * Build authorization
     */
    buildAuthorization(accountIndex?: number, privateKey?: string): (account: any) => any;
    /**
     * Sign a message
     * @param message Message to sign
     */
    signMessage(message: string, privateKey?: string): string;
    /**
     * Sync account info
     */
    syncAccountInfo(): Promise<void>;
    /**
     * Get the wallet balance
     * @returns Wallet balance
     */
    getWalletBalance(forceRefresh?: boolean): Promise<number>;
    /**
     * Query the balance of this wallet
     */
    queryAccountBalanceInfo(): Promise<FlowAccountBalanceInfo>;
}
/**
 * Check if an address is a Flow address
 * @param address Address to check
 */
declare function isFlowAddress(address: string): boolean;
/**
 * Check if an address is an EVM address
 * @param address Address to check
 */
declare function isEVMAddress(address: string): boolean;
/**
 * Check if a string is a Cadence identifier
 * @param str String to check
 */
declare function isCadenceIdentifier(str: string): boolean;
declare const flowWalletProvider: Provider;

declare const flowPlugin: Plugin;

export { type FlowAccountBalanceInfo, type FlowConfig, FlowConnector, FlowConnectorProvider, FlowWalletProvider, type IFlowScriptExecutor, type IFlowSigner, type TransactionResponse, flowPlugin as default, flowConnectorProvider, flowEnvSchema, flowPlugin, flowWalletProvider, getFlowConnectorInstance, isCadenceIdentifier, isEVMAddress, isFlowAddress, queries, scripts, transactions, validateFlowConfig };
