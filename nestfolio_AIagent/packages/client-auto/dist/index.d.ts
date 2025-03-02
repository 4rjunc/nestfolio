import { Client, IAgentRuntime } from '@elizaos/core';

declare class AutoClient {
    interval: NodeJS.Timeout;
    runtime: IAgentRuntime;
    constructor(runtime: IAgentRuntime);
}
declare const AutoClientInterface: Client;

export { AutoClient, AutoClientInterface, AutoClientInterface as default };
