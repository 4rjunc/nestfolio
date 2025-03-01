import { IAgentRuntime, Client } from '@elizaos/core';
import { AnyPublicationFragment } from '@lens-protocol/client';
import { PrivateKeyAccount } from 'viem';

type Profile = {
    id: string;
    profileId: string;
    name?: string | null;
    handle?: string;
    pfp?: string;
    bio?: string | null;
    url?: string;
};

declare class LensClient {
    runtime: IAgentRuntime;
    account: PrivateKeyAccount;
    cache: Map<string, any>;
    lastInteractionTimestamp: Date;
    profileId: `0x${string}`;
    private authenticated;
    private authenticatedProfile;
    private core;
    constructor(opts: {
        runtime: IAgentRuntime;
        cache: Map<string, any>;
        account: PrivateKeyAccount;
        profileId: `0x${string}`;
    });
    authenticate(): Promise<void>;
    createPublication(contentURI: string, onchain?: boolean, commentOn?: string): Promise<AnyPublicationFragment | null | undefined>;
    getPublication(pubId: string): Promise<AnyPublicationFragment | null>;
    getPublicationsFor(profileId: string, limit?: number): Promise<AnyPublicationFragment[]>;
    getMentions(): Promise<{
        mentions: AnyPublicationFragment[];
        next?: () => object;
    }>;
    getProfile(profileId: string): Promise<Profile>;
    getTimeline(profileId: string, limit?: number): Promise<AnyPublicationFragment[]>;
    private createPostOnchain;
    private createPostMomoka;
    private createCommentOnchain;
    private createCommentMomoka;
}

declare class StorjProvider {
    private STORJ_API_URL;
    private STORJ_API_USERNAME;
    private STORJ_API_PASSWORD;
    private baseURL;
    private client;
    constructor(runtime: IAgentRuntime);
    private createClient;
    private hash;
    gatewayURL(uriOrHash: string): string;
    pinJson(json: any): Promise<string>;
    pinFile(file: {
        buffer: Buffer;
        originalname: string;
        mimetype: string;
    }): Promise<string>;
}

declare class LensPostManager {
    client: LensClient;
    runtime: IAgentRuntime;
    private profileId;
    cache: Map<string, any>;
    private ipfs;
    private timeout;
    constructor(client: LensClient, runtime: IAgentRuntime, profileId: string, cache: Map<string, any>, ipfs: StorjProvider);
    start(): Promise<void>;
    stop(): Promise<void>;
    private generateNewPublication;
}

declare class LensInteractionManager {
    client: LensClient;
    runtime: IAgentRuntime;
    private profileId;
    cache: Map<string, any>;
    private ipfs;
    private timeout;
    constructor(client: LensClient, runtime: IAgentRuntime, profileId: string, cache: Map<string, any>, ipfs: StorjProvider);
    start(): Promise<void>;
    stop(): Promise<void>;
    private handleInteractions;
    private handlePublication;
}

declare class LensAgentClient implements Client {
    runtime: IAgentRuntime;
    client: LensClient;
    posts: LensPostManager;
    interactions: LensInteractionManager;
    private profileId;
    private ipfs;
    constructor(runtime: IAgentRuntime);
    start(): Promise<void>;
    stop(): Promise<void>;
}

export { LensAgentClient };
