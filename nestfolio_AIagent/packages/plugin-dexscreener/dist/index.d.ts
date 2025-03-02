import { Action, IAgentRuntime, Memory, State, HandlerCallback, Evaluator, Provider, Plugin } from '@elizaos/core';

declare const priceTemplate = "Determine if this is a token price request. If it is one of the specified situations, perform the corresponding action:\n\nSituation 1: \"Get token price\"\n- Message contains: words like \"price\", \"value\", \"cost\", \"worth\" AND a token symbol/address\n- Example: \"What's the price of ETH?\" or \"How much is BTC worth?\"\n- Action: Get the current price of the token\n\nPrevious conversation for context:\n{{conversation}}\n\nYou are replying to: {{message}}\n";
declare class TokenPriceAction implements Action {
    name: string;
    similes: string[];
    description: string;
    suppressInitialMessage: boolean;
    template: string;
    validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean>;
    handler(runtime: IAgentRuntime, message: Memory, state?: State, _options?: {
        [key: string]: unknown;
    }, callback?: HandlerCallback): Promise<boolean>;
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
}
declare const tokenPriceAction: TokenPriceAction;

declare const latestTokensTemplate = "Determine if this is a request for latest tokens. If it is one of the specified situations, perform the corresponding action:\n\nSituation 1: \"Get latest tokens\"\n- Message contains: words like \"latest\", \"new\", \"recent\" AND \"tokens\"\n- Example: \"Show me the latest tokens\" or \"What are the new tokens?\"\n- Action: Get the most recent tokens listed\n\nPrevious conversation for context:\n{{conversation}}\n\nYou are replying to: {{message}}\n";
declare class LatestTokensAction implements Action {
    name: string;
    similes: string[];
    description: string;
    suppressInitialMessage: boolean;
    template: string;
    validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean>;
    handler(runtime: IAgentRuntime, message: Memory, _state?: State, _options?: {
        [key: string]: unknown;
    }, callback?: HandlerCallback): Promise<boolean>;
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
}
declare const latestBoostedTemplate = "Determine if this is a request for latest boosted tokens. If it is one of the specified situations, perform the corresponding action:\n\nSituation 1: \"Get latest boosted tokens\"\n- Message contains: words like \"latest\", \"new\", \"recent\" AND \"boosted tokens\"\n- Example: \"Show me the latest boosted tokens\" or \"What are the new promoted tokens?\"\n- Action: Get the most recent boosted tokens\n\nPrevious conversation for context:\n{{conversation}}\n\nYou are replying to: {{message}}\n";
declare class LatestBoostedTokensAction implements Action {
    name: string;
    similes: string[];
    description: string;
    suppressInitialMessage: boolean;
    template: string;
    validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean>;
    handler(runtime: IAgentRuntime, message: Memory, _state?: State, _options?: {
        [key: string]: unknown;
    }, callback?: HandlerCallback): Promise<boolean>;
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
}
declare const topBoostedTemplate = "Determine if this is a request for top boosted tokens. If it is one of the specified situations, perform the corresponding action:\n\nSituation 1: \"Get top boosted tokens\"\n- Message contains: words like \"top\", \"best\", \"most\" AND \"boosted tokens\"\n- Example: \"Show me the top boosted tokens\" or \"What are the most promoted tokens?\"\n- Action: Get the tokens with most active boosts\n\nPrevious conversation for context:\n{{conversation}}\n\nYou are replying to: {{message}}\n";
declare class TopBoostedTokensAction implements Action {
    name: string;
    similes: string[];
    description: string;
    suppressInitialMessage: boolean;
    template: string;
    validate(_runtime: IAgentRuntime, message: Memory): Promise<boolean>;
    handler(runtime: IAgentRuntime, message: Memory, _state?: State, _options?: {
        [key: string]: unknown;
    }, callback?: HandlerCallback): Promise<boolean>;
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
}
declare const latestTokensAction: LatestTokensAction;
declare const latestBoostedTokensAction: LatestBoostedTokensAction;
declare const topBoostedTokensAction: TopBoostedTokensAction;

type index$2_LatestBoostedTokensAction = LatestBoostedTokensAction;
declare const index$2_LatestBoostedTokensAction: typeof LatestBoostedTokensAction;
type index$2_LatestTokensAction = LatestTokensAction;
declare const index$2_LatestTokensAction: typeof LatestTokensAction;
type index$2_TokenPriceAction = TokenPriceAction;
declare const index$2_TokenPriceAction: typeof TokenPriceAction;
type index$2_TopBoostedTokensAction = TopBoostedTokensAction;
declare const index$2_TopBoostedTokensAction: typeof TopBoostedTokensAction;
declare const index$2_latestBoostedTemplate: typeof latestBoostedTemplate;
declare const index$2_latestBoostedTokensAction: typeof latestBoostedTokensAction;
declare const index$2_latestTokensAction: typeof latestTokensAction;
declare const index$2_latestTokensTemplate: typeof latestTokensTemplate;
declare const index$2_priceTemplate: typeof priceTemplate;
declare const index$2_tokenPriceAction: typeof tokenPriceAction;
declare const index$2_topBoostedTemplate: typeof topBoostedTemplate;
declare const index$2_topBoostedTokensAction: typeof topBoostedTokensAction;
declare namespace index$2 {
  export { index$2_LatestBoostedTokensAction as LatestBoostedTokensAction, index$2_LatestTokensAction as LatestTokensAction, index$2_TokenPriceAction as TokenPriceAction, index$2_TopBoostedTokensAction as TopBoostedTokensAction, index$2_latestBoostedTemplate as latestBoostedTemplate, index$2_latestBoostedTokensAction as latestBoostedTokensAction, index$2_latestTokensAction as latestTokensAction, index$2_latestTokensTemplate as latestTokensTemplate, index$2_priceTemplate as priceTemplate, index$2_tokenPriceAction as tokenPriceAction, index$2_topBoostedTemplate as topBoostedTemplate, index$2_topBoostedTokensAction as topBoostedTokensAction };
}

declare class TokenPriceEvaluator implements Evaluator {
    name: string;
    similes: string[];
    description: string;
    validate(runtime: IAgentRuntime, message: Memory): Promise<boolean>;
    handler(_runtime: IAgentRuntime, _message: Memory, _state?: State): Promise<string>;
    examples: {
        context: string;
        messages: {
            user: string;
            content: {
                text: string;
                action: string;
            };
        }[];
        outcome: string;
    }[];
}
declare const tokenPriceEvaluator: TokenPriceEvaluator;

type index$1_TokenPriceEvaluator = TokenPriceEvaluator;
declare const index$1_TokenPriceEvaluator: typeof TokenPriceEvaluator;
declare const index$1_tokenPriceEvaluator: typeof tokenPriceEvaluator;
declare namespace index$1 {
  export { index$1_TokenPriceEvaluator as TokenPriceEvaluator, index$1_tokenPriceEvaluator as tokenPriceEvaluator };
}

declare class TokenPriceProvider implements Provider {
    get(_lengthruntime: IAgentRuntime, message: Memory, _state?: State): Promise<string>;
    private extractToken;
    private getBestPair;
    private formatPriceData;
}
declare const tokenPriceProvider: TokenPriceProvider;

type index_TokenPriceProvider = TokenPriceProvider;
declare const index_TokenPriceProvider: typeof TokenPriceProvider;
declare const index_tokenPriceProvider: typeof tokenPriceProvider;
declare namespace index {
  export { index_TokenPriceProvider as TokenPriceProvider, index_tokenPriceProvider as tokenPriceProvider };
}

declare const dexScreenerPlugin: Plugin;

export { index$2 as actions, dexScreenerPlugin as default, dexScreenerPlugin, index$1 as evaluators, index as providers };
