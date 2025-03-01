import { IAgentRuntime, Memory, State, HandlerCallback, Content, Provider, Plugin } from '@elizaos/core';
import { Squid } from '@0xsquid/sdk';
import { ethers } from 'ethers';
import { ChainData, Token, RouteRequest, RouteResponse } from '@0xsquid/squid-types';
import { ExecuteRoute, TransactionResponses } from '@0xsquid/sdk/dist/types';

declare const xChainSwapTemplate = "Given the recent messages and wallet information below:\n\n{{recentMessages}}\n\nExtract the following information about the requested cross chain swap:\n- Token symbol to swap from\n- Token symbol to swap into (if defined, otherwise the same as the token symbol to swap from)\n- Source chain\n- Destination chain (if defined, otherwise the same as the source chain)\n- Amount to swap, denominated in the token to be sent\n- Destination address (if specified)\n\nIf the destination address is not specified, the EVM address of the runtime should be used.\nIf the token to swap into is not specified, the token to swap from should be used.\nIf the destination chain is not specified, the source chain should be used.\n\nRespond with a JSON markdown block containing only the extracted values:\n\n```json\n{\n    \"fromToken\": string | null,\n    \"toToken\": string | null,\n    \"fromChain\": string | null,\n    \"toChain\": string | null,\n    \"amount\": string | null,\n    \"toAddress\": string | null\n}\n```\n";

declare const xChainSwapAction: {
    name: string;
    description: string;
    handler: (runtime: IAgentRuntime, message: Memory, state: State, _options: {
        [key: string]: unknown;
    }, callback?: HandlerCallback) => Promise<boolean>;
    template: string;
    validate: (runtime: IAgentRuntime) => Promise<boolean>;
    examples: ({
        user: string;
        content: {
            text: string;
            action?: undefined;
        };
    } | {
        user: string;
        content: {
            text: string;
            action: string;
        };
    })[][];
    similes: string[];
};

declare const nativeTokenConstant = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
interface XChainSwapContent extends Content {
    fromToken: string;
    toToken: string;
    fromChain: string;
    toChain: string;
    amount: string | number;
    toAddress: string;
}
interface SquidToken {
    address: string;
    isNative: boolean;
    symbol: string;
    decimals: number;
    enabled: boolean;
}

declare class SquidRouterProvider {
    private squidSDKUrl;
    private squidIntegratorID;
    private squid;
    constructor(squidSDKUrl: string, squidIntegratorID: string);
    initialize(): Promise<void>;
    getSquidObject(): Squid;
    getChains(): ChainData[];
    getTokens(): Token[];
    getChain(targetChainName: string): ChainData | undefined;
    getToken(targetChain: ChainData, targetTokenSymbol: string): SquidToken | undefined;
    getRoute(route: RouteRequest): Promise<RouteResponse>;
    executeRoute(route: ExecuteRoute): Promise<TransactionResponses>;
    getEVMSignerForChain(chain: ChainData, runtime: any): Promise<ethers.Signer>;
}
declare const initSquidRouterProvider: (runtime: IAgentRuntime) => SquidRouterProvider;
declare const squidRouterProvider: Provider;

declare const squidRouterPlugin: Plugin;

export { SquidRouterProvider, type SquidToken, type XChainSwapContent, squidRouterPlugin as default, initSquidRouterProvider, nativeTokenConstant, squidRouterPlugin, squidRouterProvider, xChainSwapAction, xChainSwapTemplate };
