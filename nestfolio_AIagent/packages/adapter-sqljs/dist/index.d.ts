import { DatabaseAdapter, IDatabaseCacheAdapter, UUID, Participant, Memory, Account, Actor, GoalStatus, Goal, Relationship, RAGKnowledgeItem } from '@elizaos/core';

declare const sqliteTables = "\nPRAGMA foreign_keys=OFF;\nBEGIN TRANSACTION;\n\n-- Table: accounts\nCREATE TABLE IF NOT EXISTS \"accounts\" (\n    \"id\" TEXT PRIMARY KEY,\n    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    \"name\" TEXT,\n    \"username\" TEXT,\n    \"email\" TEXT NOT NULL,\n    \"avatarUrl\" TEXT,\n    \"details\" TEXT DEFAULT '{}' CHECK(json_valid(\"details\")) -- Ensuring details is a valid JSON field\n);\n\n-- Table: memories\nCREATE TABLE IF NOT EXISTS \"memories\" (\n    \"id\" TEXT PRIMARY KEY,\n    \"type\" TEXT NOT NULL,\n    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    \"content\" TEXT NOT NULL,\n    \"embedding\" BLOB NOT NULL, -- TODO: EMBEDDING ARRAY, CONVERT TO BEST FORMAT FOR SQLITE-VSS (JSON?)\n    \"userId\" TEXT,\n    \"roomId\" TEXT,\n    \"agentId\" TEXT,\n    \"unique\" INTEGER DEFAULT 1 NOT NULL,\n    FOREIGN KEY (\"userId\") REFERENCES \"accounts\"(\"id\"),\n    FOREIGN KEY (\"roomId\") REFERENCES \"rooms\"(\"id\"),\n    FOREIGN KEY (\"agentId\") REFERENCES \"accounts\"(\"id\")\n);\n\n-- Table: goals\nCREATE TABLE IF NOT EXISTS \"goals\" (\n    \"id\" TEXT PRIMARY KEY,\n    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    \"userId\" TEXT,\n    \"name\" TEXT,\n    \"status\" TEXT,\n    \"description\" TEXT,\n    \"roomId\" TEXT,\n    \"objectives\" TEXT DEFAULT '[]' NOT NULL CHECK(json_valid(\"objectives\")) -- Ensuring objectives is a valid JSON array\n);\n\n-- Table: logs\nCREATE TABLE IF NOT EXISTS \"logs\" (\n    \"id\" TEXT PRIMARY KEY,\n    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    \"userId\" TEXT NOT NULL,\n    \"body\" TEXT NOT NULL,\n    \"type\" TEXT NOT NULL,\n    \"roomId\" TEXT NOT NULL\n);\n\n-- Table: participants\nCREATE TABLE IF NOT EXISTS \"participants\" (\n    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    \"userId\" TEXT,\n    \"roomId\" TEXT,\n    \"userState\" TEXT,\n    \"id\" TEXT PRIMARY KEY,\n    \"last_message_read\" TEXT,\n    FOREIGN KEY (\"userId\") REFERENCES \"accounts\"(\"id\"),\n    FOREIGN KEY (\"roomId\") REFERENCES \"rooms\"(\"id\")\n);\n\n-- Table: relationships\nCREATE TABLE IF NOT EXISTS \"relationships\" (\n    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    \"userA\" TEXT NOT NULL,\n    \"userB\" TEXT NOT NULL,\n    \"status\" \"text\",\n    \"id\" TEXT PRIMARY KEY,\n    \"userId\" TEXT NOT NULL,\n    FOREIGN KEY (\"userA\") REFERENCES \"accounts\"(\"id\"),\n    FOREIGN KEY (\"userB\") REFERENCES \"accounts\"(\"id\"),\n    FOREIGN KEY (\"userId\") REFERENCES \"accounts\"(\"id\")\n);\n\n-- Table: rooms\nCREATE TABLE IF NOT EXISTS \"rooms\" (\n    \"id\" TEXT PRIMARY KEY,\n    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n);\n\n-- Table: cache\nCREATE TABLE IF NOT EXISTS \"cache\" (\n    \"key\" TEXT NOT NULL,\n    \"agentId\" TEXT NOT NULL,\n    \"value\" TEXT DEFAULT '{}' CHECK(json_valid(\"value\")),\n    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    \"expiresAt\" TIMESTAMP,\n    PRIMARY KEY (\"key\", \"agentId\")\n);\n\n-- Table: knowledge\nCREATE TABLE IF NOT EXISTS \"knowledge\" (\n    \"id\" TEXT PRIMARY KEY,\n    \"agentId\" TEXT,\n    \"content\" TEXT NOT NULL CHECK(json_valid(\"content\")),\n    \"embedding\" BLOB,\n    \"createdAt\" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    \"isMain\" INTEGER DEFAULT 0,\n    \"originalId\" TEXT,\n    \"chunkIndex\" INTEGER,\n    \"isShared\" INTEGER DEFAULT 0,\n    FOREIGN KEY (\"agentId\") REFERENCES \"accounts\"(\"id\"),\n    FOREIGN KEY (\"originalId\") REFERENCES \"knowledge\"(\"id\"),\n    CHECK((isShared = 1 AND agentId IS NULL) OR (isShared = 0 AND agentId IS NOT NULL))\n);\n\n-- Index: relationships_id_key\nCREATE UNIQUE INDEX IF NOT EXISTS \"relationships_id_key\" ON \"relationships\" (\"id\");\n\n-- Index: memories_id_key\nCREATE UNIQUE INDEX IF NOT EXISTS \"memories_id_key\" ON \"memories\" (\"id\");\n\n-- Index: participants_id_key\nCREATE UNIQUE INDEX IF NOT EXISTS \"participants_id_key\" ON \"participants\" (\"id\");\n\n-- Index: knowledge\nCREATE INDEX IF NOT EXISTS \"knowledge_agent_key\" ON \"knowledge\" (\"agentId\");\nCREATE INDEX IF NOT EXISTS \"knowledge_agent_main_key\" ON \"knowledge\" (\"agentId\", \"isMain\");\nCREATE INDEX IF NOT EXISTS \"knowledge_original_key\" ON \"knowledge\" (\"originalId\");\nCREATE INDEX IF NOT EXISTS \"knowledge_content_key\" ON \"knowledge\"\n    ((json_extract(content, '$.text')))\n    WHERE json_extract(content, '$.text') IS NOT NULL;\nCREATE INDEX IF NOT EXISTS \"knowledge_created_key\" ON \"knowledge\" (\"agentId\", \"createdAt\");\nCREATE INDEX IF NOT EXISTS \"knowledge_shared_key\" ON \"knowledge\" (\"isShared\");\n\nCOMMIT;";

type SqlValue = number | string | Uint8Array | null;
type ParamsObject = Record<string, SqlValue>;
type ParamsCallback = (obj: ParamsObject) => void;
type BindParams = SqlValue[] | ParamsObject | null;
interface QueryExecResult {
    columns: string[];
    values: SqlValue[][];
}
declare class StatementIterator implements Iterator<Statement>, Iterable<Statement> {
    [Symbol.iterator](): Iterator<Statement>;
    getRemainingSQL(): string;
    next(): StatementIteratorResult;
}
interface StatementIteratorResult {
    /** `true` if there are no more available statements */
    done: boolean;
    /** the next available Statement (as returned by `Database.prepare`) */
    value: Statement;
}
declare class Statement {
    /**
     * Bind values to the parameters, after having reseted the statement. If
     * values is null, do nothing and return true.
     *
     * SQL statements can have parameters, named '?', '?NNN', ':VVV',
     * '@VVV', '$VVV', where NNN is a number and VVV a string. This function
     * binds these parameters to the given values.
     *
     * Warning: ':', '@', and '$' are included in the parameters names
     *
     * ### Value types
     *
     * |Javascript type|SQLite type|
     * |-|-|
     * |number|REAL, INTEGER|
     * |boolean|INTEGER|
     * |string|TEXT|
     * |Array, Uint8Array|BLOB|
     * |null|NULL|
     * @see [https://sql.js.org/documentation/Statement.html#["bind"]](https://sql.js.org/documentation/Statement.html#%5B%22bind%22%5D)
     *
     * @param values The values to bind
     */
    bind(values?: BindParams): boolean;
    /**
     * Free the memory used by the statement
     * @see [https://sql.js.org/documentation/Statement.html#["free"]](https://sql.js.org/documentation/Statement.html#%5B%22free%22%5D)
     */
    free(): boolean;
    /**
     * Free the memory allocated during parameter binding
     * @see [https://sql.js.org/documentation/Statement.html#["freemem"]](https://sql.js.org/documentation/Statement.html#%5B%22freemem%22%5D)
     */
    freemem(): void;
    /**
     * Get one row of results of a statement. If the first parameter is not
     * provided, step must have been called before.
     * @see [https://sql.js.org/documentation/Statement.html#["get"]](https://sql.js.org/documentation/Statement.html#%5B%22get%22%5D)
     *
     * @param params If set, the values will be bound to the statement
     * before it is executed
     */
    get(params?: BindParams): SqlValue[];
    /**
     * Get one row of result as a javascript object, associating column
     * names with their value in the current row
     * @see [https://sql.js.org/documentation/Statement.html#["getAsObject"]](https://sql.js.org/documentation/Statement.html#%5B%22getAsObject%22%5D)
     *
     * @param params If set, the values will be bound to the statement, and
     * it will be executed
     */
    getAsObject(params?: BindParams): ParamsObject;
    /**
     * Get the list of column names of a row of result of a statement.
     * @see [https://sql.js.org/documentation/Statement.html#["getColumnNames"]](https://sql.js.org/documentation/Statement.html#%5B%22getColumnNames%22%5D)
     */
    getColumnNames(): string[];
    /**
     * Get the SQLite's normalized version of the SQL string used in
     * preparing this statement. The meaning of "normalized" is not
     * well-defined: see
     * [the SQLite documentation](https://sqlite.org/c3ref/expanded_sql.html).
     * @see [https://sql.js.org/documentation/Statement.html#["getNormalizedSQL"]](https://sql.js.org/documentation/Statement.html#%5B%22getNormalizedSQL%22%5D)
     */
    getNormalizedSQL(): string;
    /**
     * Get the SQL string used in preparing this statement.
     * @see [https://sql.js.org/documentation/Statement.html#["getSQL"]](https://sql.js.org/documentation/Statement.html#%5B%22getSQL%22%5D)
     */
    getSQL(): string;
    /**
     * Reset a statement, so that its parameters can be bound to new
     * values. It also clears all previous bindings, freeing the memory used
     * by bound parameters.
     * @see [https://sql.js.org/documentation/Statement.html#["reset"]](https://sql.js.org/documentation/Statement.html#%5B%22reset%22%5D)
     */
    reset(): void;
    /**
     * Shorthand for bind + step + reset Bind the values, execute the
     * statement, ignoring the rows it returns, and resets it
     * @param values Value to bind to the statement
     */
    run(values?: BindParams): void;
    /**
     * Execute the statement, fetching the next line of result, that can
     * be retrieved with `Statement.get`.
     * @see [https://sql.js.org/documentation/Statement.html#["step"]](https://sql.js.org/documentation/Statement.html#%5B%22step%22%5D)
     */
    step(): boolean;
}
declare class Database {
    constructor(data?: ArrayLike<number> | Buffer | null);
    close(): void;
    create_function(name: string, func: (...args: any[]) => any): Database;
    each(sql: string, params: BindParams, callback: ParamsCallback, done: () => void): Database;
    each(sql: string, callback: ParamsCallback, done: () => void): Database;
    /**
     * Execute an SQL query, and returns the result.
     *
     * This is a wrapper against `Database.prepare`, `Statement.bind`, `Statement.step`, `Statement.get`, and `Statement.free`.
     *
     * The result is an array of result elements. There are as many result elements as the number of statements in your sql string (statements are separated by a semicolon)
     * @see [https://sql.js.org/documentation/Database.html#["exec"]](https://sql.js.org/documentation/Database.html#%5B%22exec%22%5D)
     *
     * @param sql a string containing some SQL text to execute
     * @param params When the SQL statement contains placeholders, you can
     * pass them in here. They will be bound to the statement before it is
     * executed. If you use the params argument as an array, you **cannot**
     * provide an sql string that contains several statements (separated by
     * `;`). This limitation does not apply to params as an object.
     */
    exec(sql: string, params?: BindParams): QueryExecResult[];
    /**
     * Exports the contents of the database to a binary array
     * @see [https://sql.js.org/documentation/Database.html#["export"]](https://sql.js.org/documentation/Database.html#%5B%22export%22%5D)
     */
    export(): Uint8Array;
    /**
     * Returns the number of changed rows (modified, inserted or deleted) by
     * the latest completed `INSERT`, `UPDATE` or `DELETE` statement on the
     * database. Executing any other type of SQL statement does not modify
     * the value returned by this function.
     * @see [https://sql.js.org/documentation/Database.html#["getRowsModified"]](https://sql.js.org/documentation/Database.html#%5B%22getRowsModified%22%5D)
     */
    getRowsModified(): number;
    /**
     * Analyze a result code, return null if no error occurred, and throw an
     * error with a descriptive message otherwise
     * @see [https://sql.js.org/documentation/Database.html#["handleError"]](https://sql.js.org/documentation/Database.html#%5B%22handleError%22%5D)
     */
    handleError(): null | never;
    /**
     * Iterate over multiple SQL statements in a SQL string. This function
     * returns an iterator over Statement objects. You can use a `for..of`
     * loop to execute the returned statements one by one.
     * @see [https://sql.js.org/documentation/Database.html#["iterateStatements"]](https://sql.js.org/documentation/Database.html#%5B%22iterateStatements%22%5D)
     *
     * @param sql a string of SQL that can contain multiple statements
     */
    iterateStatements(sql: string): StatementIterator;
    /**
     * Prepare an SQL statement
     * @see [https://sql.js.org/documentation/Database.html#["prepare"]](https://sql.js.org/documentation/Database.html#%5B%22prepare%22%5D)
     *
     * @param sql a string of SQL, that can contain placeholders (`?`, `:VVV`, `:AAA`, `@AAA`)
     * @param params values to bind to placeholders
     */
    prepare(sql: string, params?: BindParams): Statement;
    /**
     * Execute an SQL query, ignoring the rows it returns.
     * @see [https://sql.js.org/documentation/Database.html#["run"]](https://sql.js.org/documentation/Database.html#%5B%22run%22%5D)
     *
     * @param sql a string containing some SQL text to execute
     * @param params When the SQL statement contains placeholders, you can
     * pass them in here. They will be bound to the statement before it is
     * executed. If you use the params argument as an array, you **cannot**
     * provide an sql string that contains several statements (separated by
     * `;`). This limitation does not apply to params as an object.
     */
    run(sql: string, params?: BindParams): Database;
}

declare class SqlJsDatabaseAdapter extends DatabaseAdapter<Database> implements IDatabaseCacheAdapter {
    constructor(db: Database);
    init(): Promise<void>;
    close(): Promise<void>;
    getRoom(roomId: UUID): Promise<UUID | null>;
    getParticipantsForAccount(userId: UUID): Promise<Participant[]>;
    getParticipantUserState(roomId: UUID, userId: UUID): Promise<"FOLLOWED" | "MUTED" | null>;
    getMemoriesByRoomIds(params: {
        agentId: UUID;
        roomIds: UUID[];
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
    getActorDetails(params: {
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
    searchMemoriesByEmbedding(_embedding: number[], params: {
        agentId: UUID;
        match_threshold?: number;
        count?: number;
        roomId?: UUID;
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
        agentId?: UUID;
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

export { Database, SqlJsDatabaseAdapter, sqliteTables };
