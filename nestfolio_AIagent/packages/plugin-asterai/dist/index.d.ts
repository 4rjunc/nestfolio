import { IAgentRuntime, Provider, Plugin } from '@elizaos/core';
import { AsteraiClient } from '@asterai/client';
import { z } from 'zod';

declare const envSchema: z.ZodObject<{
    ASTERAI_AGENT_ID: z.ZodString;
    ASTERAI_PUBLIC_QUERY_KEY: z.ZodString;
}, "strip", z.ZodTypeAny, {
    ASTERAI_AGENT_ID?: string;
    ASTERAI_PUBLIC_QUERY_KEY?: string;
}, {
    ASTERAI_AGENT_ID?: string;
    ASTERAI_PUBLIC_QUERY_KEY?: string;
}>;
type AsteraiConfig = z.infer<typeof envSchema>;
declare function validateAsteraiConfig(runtime: IAgentRuntime): Promise<AsteraiConfig>;

declare const asteraiProvider: Provider;

declare const getInitAsteraiClient: (agentId: string, publicQueryKey: string) => AsteraiClient;
declare const asteraiPlugin: Plugin;

export { type AsteraiConfig, asteraiPlugin, asteraiProvider, asteraiPlugin as default, getInitAsteraiClient, validateAsteraiConfig };
