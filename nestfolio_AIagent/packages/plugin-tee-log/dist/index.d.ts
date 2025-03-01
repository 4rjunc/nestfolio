import { Plugin, Service, ITeeLogService, ServiceType, IAgentRuntime } from '@elizaos/core';

declare const teeLogPlugin: Plugin;

declare enum TeeType {
    SGX_GRAMINE = "sgx_gramine",
    TDX_DSTACK = "tdx_dstack"
}
interface TeeLog {
    id: string;
    agentId: string;
    roomId: string;
    userId: string;
    type: string;
    content: string;
    timestamp: number;
    signature: string;
}
interface TeeLogQuery {
    agentId?: string;
    roomId?: string;
    userId?: string;
    type?: string;
    containsContent?: string;
    startTimestamp?: number;
    endTimestamp?: number;
}
interface TeeAgent {
    id: string;
    agentId: string;
    agentName: string;
    createdAt: number;
    publicKey: string;
    attestation: string;
}
interface PageQuery<Result = any> {
    page: number;
    pageSize: number;
    total?: number;
    data?: Result;
}
declare abstract class TeeLogDAO<DB = any> {
    db: DB;
    abstract initialize(): Promise<void>;
    abstract addLog(log: TeeLog): Promise<boolean>;
    abstract getPagedLogs(query: TeeLogQuery, page: number, pageSize: number): Promise<PageQuery<TeeLog[]>>;
    abstract addAgent(agent: TeeAgent): Promise<boolean>;
    abstract getAgent(agentId: string): Promise<TeeAgent>;
    abstract getAllAgents(): Promise<TeeAgent[]>;
}

declare class TeeLogService extends Service implements ITeeLogService {
    private dbPath;
    private initialized;
    private enableTeeLog;
    private teeType;
    private teeMode;
    private teeLogDAO;
    private teeLogManager;
    getInstance(): TeeLogService;
    static get serviceType(): ServiceType;
    initialize(runtime: IAgentRuntime): Promise<void>;
    log(agentId: string, roomId: string, userId: string, type: string, content: string): Promise<boolean>;
    getAllAgents(): Promise<TeeAgent[]>;
    getAgent(agentId: string): Promise<TeeAgent | undefined>;
    getLogs(query: TeeLogQuery, page: number, pageSize: number): Promise<PageQuery<TeeLog[]>>;
    generateAttestation(userReport: string): Promise<string>;
}

export { type PageQuery, type TeeAgent, type TeeLog, TeeLogDAO, type TeeLogQuery, TeeLogService, TeeType, teeLogPlugin as default, teeLogPlugin };
