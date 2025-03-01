import { Plugin, IAgentRuntime, Memory, State, HandlerCallback } from '@elizaos/core';

declare const letzAiImageGeneration: {
    name: string;
    similes: string[];
    description: string;
    suppressInitialMessage: boolean;
    validate: (_runtime: IAgentRuntime, _message: Memory, _state: State) => Promise<boolean>;
    handler: (runtime: IAgentRuntime, message: Memory, _state: State, options: {
        width?: number;
        height?: number;
        quality?: number;
        creativity?: number;
        seed?: number;
        modelId?: string;
        jobId?: string;
        hasWatermark?: boolean;
        mode?: "default" | "sigma";
        systemVersion?: number;
    }, callback: HandlerCallback) => Promise<void>;
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
};
declare const letzAIPlugin: Plugin;

export { letzAIPlugin as default, letzAIPlugin, letzAiImageGeneration };
