import { Database } from 'better-sqlite3';
import { DatabaseAdapter, IDatabaseCacheAdapter, UUID, Participant, Account, Actor, Memory, GoalStatus, Goal, Relationship, RAGKnowledgeItem } from '@elizaos/core';

declare const sqliteTables = "\nPRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n\n-- Table: accounts\nCREATE TABLE IF NOT EXISTS \"accounts\" (\n    \"id\" TEXT PRIMARY KEY,\n    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    \"name\" TEXT,\n    \"username\" TEXT,\n    \"email\" TEXT NOT NULL,\n    \"avatarUrl\" TEXT,\n    \"details\" TEXT DEFAULT '{}' CHECK(json_valid(\"details\")) -- Ensuring details is a valid JSON field\n);\n\n-- Table: memories\nCREATE TABLE IF NOT EXISTS \"memories\" (\n    \"id\" TEXT PRIMARY KEY,\n    \"type\" TEXT NOT NULL,\n    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    \"content\" TEXT NOT NULL,\n    \"embedding\" BLOB NOT NULL, -- TODO: EMBEDDING ARRAY, CONVERT TO BEST FORMAT FOR SQLITE-VSS (JSON?)\n    \"userId\" TEXT,\n    \"roomId\" TEXT,\n    \"agentId\" TEXT,\n    \"unique\" INTEGER DEFAULT 1 NOT NULL,\n    FOREIGN KEY (\"userId\") REFERENCES \"accounts\"(\"id\"),\n    FOREIGN KEY (\"roomId\") REFERENCES \"rooms\"(\"id\"),\n    FOREIGN KEY (\"agentId\") REFERENCES \"accounts\"(\"id\")\n);\n\n-- Table: goals\nCREATE TABLE IF NOT EXISTS \"goals\" (\n    \"id\" TEXT PRIMARY KEY,\n    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    \"userId\" TEXT,\n    \"name\" TEXT,\n    \"status\" TEXT,\n    \"description\" TEXT,\n    \"roomId\" TEXT,\n    \"objectives\" TEXT DEFAULT '[]' NOT NULL CHECK(json_valid(\"objectives\")) -- Ensuring objectives is a valid JSON array\n);\n\n-- Table: logs\nCREATE TABLE IF NOT EXISTS \"logs\" (\n    \"id\" TEXT PRIMARY KEY,\n    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    \"userId\" TEXT NOT NULL,\n    \"body\" TEXT NOT NULL,\n    \"type\" TEXT NOT NULL,\n    \"roomId\" TEXT NOT NULL\n);\n\n-- Table: participants\nCREATE TABLE IF NOT EXISTS \"participants\" (\n    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    \"userId\" TEXT,\n    \"roomId\" TEXT,\n    \"userState\" TEXT,\n    \"id\" TEXT PRIMARY KEY,\n    \"last_message_read\" TEXT,\n    FOREIGN KEY (\"userId\") REFERENCES \"accounts\"(\"id\"),\n    FOREIGN KEY (\"roomId\") REFERENCES \"rooms\"(\"id\")\n);\n\n-- Table: relationships\nCREATE TABLE IF NOT EXISTS \"relationships\" (\n    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    \"userA\" TEXT NOT NULL,\n    \"userB\" TEXT NOT NULL,\n    \"status\" \"text\",\n    \"id\" TEXT PRIMARY KEY,\n    \"userId\" TEXT NOT NULL,\n    FOREIGN KEY (\"userA\") REFERENCES \"accounts\"(\"id\"),\n    FOREIGN KEY (\"userB\") REFERENCES \"accounts\"(\"id\"),\n    FOREIGN KEY (\"userId\") REFERENCES \"accounts\"(\"id\")\n);\n\n-- Table: rooms\nCREATE TABLE IF NOT EXISTS \"rooms\" (\n    \"id\" TEXT PRIMARY KEY,\n    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\n-- Table: cache\nCREATE TABLE IF NOT EXISTS \"cache\" (\n    \"key\" TEXT NOT NULL,\n    \"agentId\" TEXT NOT NULL,\n    \"value\" TEXT DEFAULT '{}' CHECK(json_valid(\"value\")),\n    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    \"expiresAt\" TIMESTAMP,\n    PRIMARY KEY (\"key\", \"agentId\")\n);\n\n-- Table: knowledge\nCREATE TABLE IF NOT EXISTS \"knowledge\" (\n    \"id\" TEXT PRIMARY KEY,\n    \"agentId\" TEXT,\n    \"content\" TEXT NOT NULL CHECK(json_valid(\"content\")),\n    \"embedding\" BLOB,\n    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    \"isMain\" INTEGER DEFAULT 0,\n    \"originalId\" TEXT,\n    \"chunkIndex\" INTEGER,\n    \"isShared\" INTEGER DEFAULT 0,\n    FOREIGN KEY (\"agentId\") REFERENCES \"accounts\"(\"id\"),\n    FOREIGN KEY (\"originalId\") REFERENCES \"knowledge\"(\"id\"),\n    CHECK((isShared = 1 AND agentId IS NULL) OR (isShared = 0 AND agentId IS NOT NULL))\n);\n\n-- Index: relationships_id_key\nCREATE UNIQUE INDEX IF NOT EXISTS \"relationships_id_key\" ON \"relationships\" (\"id\");\n\n-- Index: memories_id_key\nCREATE UNIQUE INDEX IF NOT EXISTS \"memories_id_key\" ON \"memories\" (\"id\");\n\n-- Index: participants_id_key\nCREATE UNIQUE INDEX IF NOT EXISTS \"participants_id_key\" ON \"participants\" (\"id\");\n\n-- Index: knowledge\nCREATE INDEX IF NOT EXISTS \"knowledge_agent_key\" ON \"knowledge\" (\"agentId\");\nCREATE INDEX IF NOT EXISTS \"knowledge_agent_main_key\" ON \"knowledge\" (\"agentId\", \"isMain\");\nCREATE INDEX IF NOT EXISTS \"knowledge_original_key\" ON \"knowledge\" (\"originalId\");\nCREATE INDEX IF NOT EXISTS \"knowledge_content_key\" ON \"knowledge\"\n    ((json_extract(content, '$.text')))\n    WHERE json_extract(content, '$.text') IS NOT NULL;\nCREATE INDEX IF NOT EXISTS \"knowledge_created_key\" ON \"knowledge\" (\"agentId\", \"createdAt\");\nCREATE INDEX IF NOT EXISTS \"knowledge_shared_key\" ON \"knowledge\" (\"isShared\");\n\nCOMMIT;";

declare function loadVecExtensions(db: Database): void;
/**
 * @param db - An instance of better - sqlite3 Database
 */
declare function load(db: Database): void;

declare class SqliteDatabaseAdapter extends DatabaseAdapter<Database> implements IDatabaseCacheAdapter {
    getRoom(roomId: UUID): Promise<UUID | null>;
    getParticipantsForAccount(userId: UUID): Promise<Participant[]>;
    getParticipantsForRoom(roomId: UUID): Promise<UUID[]>;
    getParticipantUserState(roomId: UUID, userId: UUID): Promise<"FOLLOWED" | "MUTED" | null>;
    setParticipantUserState(roomId: UUID, userId: UUID, state: "FOLLOWED" | "MUTED" | null): Promise<void>;
    constructor(db: Database);
    init(): Promise<void>;
    close(): Promise<void>;
    getAccountById(userId: UUID): Promise<Account | null>;
    createAccount(account: Account): Promise<boolean>;
    getActorDetails(params: {
        roomId: UUID;
    }): Promise<Actor[]>;
    getMemoriesByRoomIds(params: {
        agentId: UUID;
        roomIds: UUID[];
        tableName: string;
        limit?: number;
    }): Promise<Memory[]>;
    getMemoryById(memoryId: UUID): Promise<Memory | null>;
    getMemoriesByIds(memoryIds: UUID[], tableName?: string): Promise<Memory[]>;
    createMemory(memory: Memory, tableName: string): Promise<void>;
    searchMemories(params: {
        tableName: string;
        roomId: UUID;
        agentId?: UUID;
        embedding: number[];
        match_threshold: number;
        match_count: number;
        unique: boolean;
    }): Promise<Memory[]>;
    searchMemoriesByEmbedding(embedding: number[], params: {
        match_threshold?: number;
        count?: number;
        roomId?: UUID;
        agentId: UUID;
        unique?: boolean;
        tableName: string;
    }): Promise<Memory[]>;
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
    updateGoalStatus(params: {
        goalId: UUID;
        status: GoalStatus;
    }): Promise<void>;
    log(params: {
        body: {
            [key: string]: unknown;
        };
        userId: UUID;
        roomId: UUID;
        type: string;
    }): Promise<void>;
    getMemories(params: {
        roomId: UUID;
        count?: number;
        unique?: boolean;
        tableName: string;
        agentId: UUID;
        start?: number;
        end?: number;
    }): Promise<Memory[]>;
    removeMemory(memoryId: UUID, tableName: string): Promise<void>;
    removeAllMemories(roomId: UUID, tableName: string): Promise<void>;
    countMemories(roomId: UUID, unique?: boolean, tableName?: string): Promise<number>;
    getGoals(params: {
        roomId: UUID;
        userId?: UUID | null;
        onlyInProgress?: boolean;
        count?: number;
    }): Promise<Goal[]>;
    updateGoal(goal: Goal): Promise<void>;
    createGoal(goal: Goal): Promise<void>;
    removeGoal(goalId: UUID): Promise<void>;
    removeAllGoals(roomId: UUID): Promise<void>;
    createRoom(roomId?: UUID): Promise<UUID>;
    removeRoom(roomId: UUID): Promise<void>;
    getRoomsForParticipant(userId: UUID): Promise<UUID[]>;
    getRoomsForParticipants(userIds: UUID[]): Promise<UUID[]>;
    addParticipant(userId: UUID, roomId: UUID): Promise<boolean>;
    removeParticipant(userId: UUID, roomId: UUID): Promise<boolean>;
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
}

export { SqliteDatabaseAdapter, load, loadVecExtensions, sqliteTables };
