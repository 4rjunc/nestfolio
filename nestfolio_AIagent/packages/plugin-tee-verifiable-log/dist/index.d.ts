import { Service, ServiceType, IAgentRuntime, Plugin } from '@elizaos/core';

interface VerifiableLog {
    id: string;
    created_at?: Date;
    agent_id: string;
    room_id: string;
    user_id: string;
    type: string;
    content: string;
    signature: string;
}
interface VerifiableLogQuery {
    idEq: string;
    agentIdEq: string;
    roomIdEq: string;
    userIdEq: string;
    typeEq: string;
    contLike: string;
    signatureEq: string;
}
interface VerifiableAgent {
    id: string;
    created_at?: Date;
    agent_id: string;
    agent_name: string;
    agent_keypair_path: string;
    agent_keypair_vlog_pk: string;
}
interface PageQuery<Result = unknown> {
    page: number;
    pageSize: number;
    total?: number;
    data?: Result;
}

declare class DeriveProvider {
    private provider;
    constructor(teeModel: string);
    deriveKeyPair(params: {
        agentId: string;
        bizModel: string;
    }): Promise<Buffer>;
    encryptAgentData(params: {
        agentId: string;
        bizModel: string;
    }, plainText: string): Promise<{
        success: boolean;
        errorMsg: string;
        ivHex: string;
        encryptedData: string;
    }>;
    decryptAgentData(params: {
        agentId: string;
        bizModel: string;
    }, ivHex: string, encryptedData: string): Promise<{
        success: boolean;
        errorMsg: string;
        plainText: string;
    }>;
    private encrypt;
    private decrypt;
}

declare class VerifiableLogService extends Service {
    getInstance(): VerifiableLogService;
    static get serviceType(): ServiceType;
    private verifiableLogProvider;
    private verifiableDAO;
    private teeMode;
    private vlogOpen;
    initialize(runtime: IAgentRuntime): Promise<void>;
    log(params: {
        agentId: string;
        roomId: string;
        userId: string;
        type: string;
        content: string;
    }): Promise<boolean>;
    generateAttestation(params: {
        agentId: string;
        publicKey: string;
    }): Promise<string>;
    listAgent(): Promise<VerifiableAgent[]>;
    pageQueryLogs(query: VerifiableLogQuery, page: number, pageSize: number): Promise<PageQuery<VerifiableLog[]>>;
}
declare const verifiableLogPlugin: Plugin;

export { DeriveProvider, type PageQuery, type VerifiableAgent, type VerifiableLog, type VerifiableLogQuery, VerifiableLogService, verifiableLogPlugin };
