import pg, { QueryResultRow, QueryConfig, QueryConfigValues, QueryResult } from 'pg';
import { DatabaseAdapter, IDatabaseCacheAdapter, UUID, Participant, Memory, Account, Actor, Goal, Relationship, GoalStatus, RAGKnowledgeItem } from '@elizaos/core';

type Pool = pg.Pool;

declare class PostgresDatabaseAdapter extends DatabaseAdapter<Pool> implements IDatabaseCacheAdapter {
    private pool;
    private readonly maxRetries;
    private readonly baseDelay;
    private readonly maxDelay;
    private readonly jitterMax;
    private readonly connectionTimeout;
    constructor(connectionConfig: any);
    private setupPoolErrorHandling;
    private withDatabase;
    private withRetry;
    private handlePoolError;
    query<R extends QueryResultRow = any, I = any[]>(queryTextOrConfig: string | QueryConfig<I>, values?: QueryConfigValues<I>): Promise<QueryResult<R>>;
    private validateVectorSetup;
    init(): Promise<void>;
    close(): Promise<void>;
    testConnection(): Promise<boolean>;
    cleanup(): Promise<void>;
    getRoom(roomId: UUID): Promise<UUID | null>;
    getParticipantsForAccount(userId: UUID): Promise<Participant[]>;
    getParticipantUserState(roomId: UUID, userId: UUID): Promise<"FOLLOWED" | "MUTED" | null>;
    getMemoriesByRoomIds(params: {
        roomIds: UUID[];
        agentId?: UUID;
        tableName: string;
        limit?: number;
    }): Promise<Memory[]>;
    setParticipantUserState(roomId: UUID, userId: UUID, state: "FOLLOWED" | "MUTED" | null): Promise<void>;
    getParticipantsForRoom(roomId: UUID): Promise<UUID[]>;
    getAccountById(userId: UUID): Promise<Account | null>;
    createAccount(account: Account): Promise<boolean>;
    getActorById(params: {
        roomId: UUID;
    }): Promise<Actor[]>;
    getMemoryById(id: UUID): Promise<Memory | null>;
    getMemoriesByIds(memoryIds: UUID[], tableName?: string): Promise<Memory[]>;
    createMemory(memory: Memory, tableName: string): Promise<void>;
    searchMemories(params: {
        tableName: string;
        agentId: UUID;
        roomId: UUID;
        embedding: number[];
        match_threshold: number;
        match_count: number;
        unique: boolean;
    }): Promise<Memory[]>;
    getMemories(params: {
        roomId: UUID;
        count?: number;
        unique?: boolean;
        tableName: string;
        agentId?: UUID;
        start?: number;
        end?: number;
    }): Promise<Memory[]>;
    getGoals(params: {
        roomId: UUID;
        userId?: UUID | null;
        onlyInProgress?: boolean;
        count?: number;
    }): Promise<Goal[]>;
    updateGoal(goal: Goal): Promise<void>;
    createGoal(goal: Goal): Promise<void>;
    removeGoal(goalId: UUID): Promise<void>;
    createRoom(roomId?: UUID): Promise<UUID>;
    removeRoom(roomId: UUID): Promise<void>;
    createRelationship(params: {
        userA: UUID;
        userB: UUID;
    }): Promise<boolean>;
    getRelationship(params: {
        userA: UUID;
        userB: UUID;
    }): Promise<Relationship | null>;
    getRelationships(params: {
        userId: UUID;
    }): Promise<Relationship[]>;
    getCachedEmbeddings(opts: {
        query_table_name: string;
        query_threshold: number;
        query_input: string;
        query_field_name: string;
        query_field_sub_name: string;
        query_match_count: number;
    }): Promise<{
        embedding: number[];
        levenshtein_score: number;
    }[]>;
    log(params: {
        body: {
            [key: string]: unknown;
        };
        userId: UUID;
        roomId: UUID;
        type: string;
    }): Promise<void>;
    searchMemoriesByEmbedding(embedding: number[], params: {
        match_threshold?: number;
        count?: number;
        agentId?: UUID;
        roomId?: UUID;
        unique?: boolean;
        tableName: string;
    }): Promise<Memory[]>;
    addParticipant(userId: UUID, roomId: UUID): Promise<boolean>;
    removeParticipant(userId: UUID, roomId: UUID): Promise<boolean>;
    updateGoalStatus(params: {
        goalId: UUID;
        status: GoalStatus;
    }): Promise<void>;
    removeMemory(memoryId: UUID, tableName: string): Promise<void>;
    removeAllMemories(roomId: UUID, tableName: string): Promise<void>;
    countMemories(roomId: UUID, unique?: boolean, tableName?: string): Promise<number>;
    removeAllGoals(roomId: UUID): Promise<void>;
    getRoomsForParticipant(userId: UUID): Promise<UUID[]>;
    getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]>;
    getActorDetails(params: {
        roomId: string;
    }): Promise<Actor[]>;
    getCache(params: {
        key: string;
        agentId: UUID;
    }): Promise<string | undefined>;
    setCache(params: {
        key: string;
        agentId: UUID;
        value: string;
    }): Promise<boolean>;
    deleteCache(params: {
        key: string;
        agentId: UUID;
    }): Promise<boolean>;
    getKnowledge(params: {
        id?: UUID;
        agentId: UUID;
        limit?: number;
        query?: string;
    }): Promise<RAGKnowledgeItem[]>;
    searchKnowledge(params: {
        agentId: UUID;
        embedding: Float32Array;
        match_threshold: number;
        match_count: number;
        searchText?: string;
    }): Promise<RAGKnowledgeItem[]>;
    createKnowledge(knowledge: RAGKnowledgeItem): Promise<void>;
    removeKnowledge(id: UUID): Promise<void>;
    clearKnowledge(agentId: UUID, shared?: boolean): Promise<void>;
    private createKnowledgeChunk;
}

export { PostgresDatabaseAdapter, PostgresDatabaseAdapter as default };
