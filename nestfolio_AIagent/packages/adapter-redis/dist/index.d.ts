import { IDatabaseCacheAdapter, UUID } from '@elizaos/core';

declare class RedisClient implements IDatabaseCacheAdapter {
    private client;
    constructor(redisUrl: string);
    getCache(params: {
        agentId: UUID;
        key: string;
    }): Promise<string | undefined>;
    setCache(params: {
        agentId: UUID;
        key: string;
        value: string;
    }): Promise<boolean>;
    deleteCache(params: {
        agentId: UUID;
        key: string;
    }): Promise<boolean>;
    disconnect(): Promise<void>;
    private buildKey;
}

export { RedisClient, RedisClient as default };
