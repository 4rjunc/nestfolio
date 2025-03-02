import { Service, ServiceType, IAgentRuntime, Plugin } from '@elizaos/core';

interface IGoplusSecurityService extends Service {
    check(text: string): Promise<string>;
}
declare class GoplusSecurityService extends Service implements IGoplusSecurityService {
    private apiKey;
    private runtime;
    getInstance(): GoplusSecurityService;
    static get serviceType(): ServiceType;
    initialize(runtime: IAgentRuntime): Promise<void>;
    /**
     * Connect to WebSocket and send a message
     */
    check(text: string): Promise<string>;
}

declare const goplusPlugin: Plugin;

export { GoplusSecurityService, type IGoplusSecurityService, goplusPlugin as default, goplusPlugin };
