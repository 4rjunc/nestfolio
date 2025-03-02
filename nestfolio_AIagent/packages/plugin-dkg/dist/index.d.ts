import { Action, IAgentRuntime, Memory, Provider, Plugin } from '@elizaos/core';

declare const dkgInsert: Action;

declare const index$1_dkgInsert: typeof dkgInsert;
declare namespace index$1 {
  export { index$1_dkgInsert as dkgInsert };
}

interface BlockchainConfig {
    name: string;
    publicKey: string;
    privateKey: string;
}
interface DKGClientConfig {
    environment: string;
    endpoint: string;
    port: string;
    blockchain: BlockchainConfig;
    maxNumberOfRetries?: number;
    frequency?: number;
    contentType?: string;
    nodeApiVersion?: string;
}
declare class DKGProvider {
    private client;
    constructor(config: DKGClientConfig);
    private validateConfig;
    search(runtime: IAgentRuntime, message: Memory): Promise<string>;
}
declare const graphSearch: Provider;

type index_DKGProvider = DKGProvider;
declare const index_DKGProvider: typeof DKGProvider;
declare const index_graphSearch: typeof graphSearch;
declare namespace index {
  export { index_DKGProvider as DKGProvider, index_graphSearch as graphSearch };
}

declare const dkgPlugin: Plugin;

export { index$1 as actions, dkgPlugin, index as providers };
