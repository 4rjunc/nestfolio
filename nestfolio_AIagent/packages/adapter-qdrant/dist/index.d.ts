import { QdrantClient } from '@qdrant/js-client-rest';
import { DatabaseAdapter, IDatabaseCacheAdapter, RAGKnowledgeItem, UUID, Account, Goal, Memory, Actor, Participant, Relationship, GoalStatus } from '@elizaos/core';

declare class QdrantDatabaseAdapter extends DatabaseAdapter<QdrantClient> implements IDatabaseCacheAdapter {
    db: QdrantClient;
    collectionName: string;
    qdrantV5UUIDNamespace: string;
    cacheM: Map<string, string>;
    vectorSize: number;
    constructor(url: string, apiKey: string, port: number, vectorSize: number);
    private preprocess;
    init(): Promise<void>;
    createKnowledge(knowledge: RAGKnowledgeItem): Promise<void>;
    getKnowledge(params: {
        query?: string;
        id?: UUID;
        conversationContext?: string;
        limit?: number;
        agentId?: UUID;
    }): Promise<RAGKnowledgeItem[]>;
    processFile(file: {
        path: string;
        content: string;
        type: "pdf" | "md" | "txt";
        isShared: boolean;
    }): Promise<void>;
    removeKnowledge(id: UUID): Promise<void>;
    searchKnowledge(params: {
        agentId: UUID;
        embedding: Float32Array | number[];
        match_threshold?: number;
        match_count?: number;
        searchText?: string;
    }): Promise<RAGKnowledgeItem[]>;
    addParticipant(userId: UUID, roomId: UUID): Promise<boolean>;
    clearKnowledge(agentId: UUID, shared?: boolean): Promise<void>;
    close(): Promise<void>;
    countMemories(roomId: UUID, unique?: boolean, tableName?: string): Promise<number>;
    createAccount(account: Account): Promise<boolean>;
    createGoal(goal: Goal): Promise<void>;
    createMemory(memory: Memory, tableName: string, unique?: boolean): Promise<void>;
    createRelationship(params: {
        userA: UUID;
        userB: UUID;
    }): Promise<boolean>;
    createRoom(roomId?: UUID): Promise<UUID>;
    getAccountById(userId: UUID): Promise<Account | null>;
    getActorDetails(params: {
        roomId: UUID;
    }): Promise<Actor[]>;
    getCachedEmbeddings(params: {
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
    getGoals(params: {
        agentId: UUID;
        roomId: UUID;
        userId?: UUID | null;
        onlyInProgress?: boolean;
        count?: number;
    }): Promise<Goal[]>;
    getMemories(params: {
        roomId: UUID;
        count?: number;
        unique?: boolean;
        tableName: string;
        agentId: UUID;
        start?: number;
        end?: number;
    }): Promise<Memory[]>;
    getMemoriesByRoomIds(params: {
        tableName: string;
        agentId: UUID;
        roomIds: UUID[];
    }): Promise<Memory[]>;
    getMemoryById(id: UUID): Promise<Memory | null>;
    getParticipantUserState(roomId: UUID, userId: UUID): Promise<"FOLLOWED" | "MUTED" | null>;
    getParticipantsForAccount(userId: UUID): Promise<Participant[]>;
    getParticipantsForRoom(roomId: UUID): Promise<UUID[]>;
    getRelationship(params: {
        userA: UUID;
        userB: UUID;
    }): Promise<Relationship | null>;
    getRelationships(params: {
        userId: UUID;
    }): Promise<Relationship[]>;
    getRoom(roomId: UUID): Promise<UUID | null>;
    getRoomsForParticipant(userId: UUID): Promise<UUID[]>;
    getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]>;
    log(params: {
        body: {
            [p: string]: unknown;
        };
        userId: UUID;
        roomId: UUID;
        type: string;
    }): Promise<void>;
    removeAllGoals(roomId: UUID): Promise<void>;
    removeAllMemories(roomId: UUID, tableName: string): Promise<void>;
    removeGoal(goalId: UUID): Promise<void>;
    removeMemory(memoryId: UUID, tableName: string): Promise<void>;
    removeParticipant(userId: UUID, roomId: UUID): Promise<boolean>;
    removeRoom(roomId: UUID): Promise<void>;
    searchMemories(params: {
        tableName: string;
        agentId: UUID;
        roomId: UUID;
        embedding: number[];
        match_threshold: number;
        match_count: number;
        unique: boolean;
    }): Promise<Memory[]>;
    searchMemoriesByEmbedding(embedding: number[], params: {
        match_threshold?: number;
        count?: number;
        roomId?: UUID;
        agentId?: UUID;
        unique?: boolean;
        tableName: string;
    }): Promise<Memory[]>;
    setParticipantUserState(roomId: UUID, userId: UUID, state: "FOLLOWED" | "MUTED" | null): Promise<void>;
    updateGoal(goal: Goal): Promise<void>;
    updateGoalStatus(params: {
        goalId: UUID;
        status: GoalStatus;
    }): Promise<void>;
    getMemoriesByIds(memoryIds: UUID[], tableName?: string): Promise<Memory[]>;
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
    private buildKey;
    private buildQdrantID;
}

export { QdrantDatabaseAdapter, QdrantDatabaseAdapter as default };
