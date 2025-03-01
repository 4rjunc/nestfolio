// src/index.ts
import { v4 } from "uuid";
import pg from "pg";
import {
  DatabaseAdapter,
  EmbeddingProvider,
  elizaLogger,
  getEmbeddingConfig
} from "@elizaos/core";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var PostgresDatabaseAdapter = class extends DatabaseAdapter {
  pool;
  maxRetries = 3;
  baseDelay = 1e3;
  // 1 second
  maxDelay = 1e4;
  // 10 seconds
  jitterMax = 1e3;
  // 1 second
  connectionTimeout = 5e3;
  // 5 seconds
  constructor(connectionConfig) {
    super({
      //circuitbreaker stuff
      failureThreshold: 5,
      resetTimeout: 6e4,
      halfOpenMaxAttempts: 3
    });
    const defaultConfig = {
      max: 20,
      idleTimeoutMillis: 3e4,
      connectionTimeoutMillis: this.connectionTimeout
    };
    this.pool = new pg.Pool({
      ...defaultConfig,
      ...connectionConfig
      // Allow overriding defaults
    });
    this.pool.on("error", (err) => {
      elizaLogger.error("Unexpected pool error", err);
      this.handlePoolError(err);
    });
    this.setupPoolErrorHandling();
    this.testConnection();
  }
  setupPoolErrorHandling() {
    process.on("SIGINT", async () => {
      await this.cleanup();
      process.exit(0);
    });
    process.on("SIGTERM", async () => {
      await this.cleanup();
      process.exit(0);
    });
    process.on("beforeExit", async () => {
      await this.cleanup();
    });
  }
  async withDatabase(operation, context) {
    return this.withCircuitBreaker(async () => {
      return this.withRetry(operation);
    }, context);
  }
  async withRetry(operation) {
    let lastError = new Error("Unknown error");
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries) {
          const backoffDelay = Math.min(
            this.baseDelay * Math.pow(2, attempt - 1),
            this.maxDelay
          );
          const jitter = Math.random() * this.jitterMax;
          const delay = backoffDelay + jitter;
          elizaLogger.warn(
            `Database operation failed (attempt ${attempt}/${this.maxRetries}):`,
            {
              error: error instanceof Error ? error.message : String(error),
              nextRetryIn: `${(delay / 1e3).toFixed(1)}s`
            }
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          elizaLogger.error("Max retry attempts reached:", {
            error: error instanceof Error ? error.message : String(error),
            totalAttempts: attempt
          });
          throw error instanceof Error ? error : new Error(String(error));
        }
      }
    }
    throw lastError;
  }
  async handlePoolError(error) {
    elizaLogger.error("Pool error occurred, attempting to reconnect", {
      error: error.message
    });
    try {
      await this.pool.end();
      this.pool = new pg.Pool({
        ...this.pool.options,
        connectionTimeoutMillis: this.connectionTimeout
      });
      await this.testConnection();
      elizaLogger.success("Pool reconnection successful");
    } catch (reconnectError) {
      elizaLogger.error("Failed to reconnect pool", {
        error: reconnectError instanceof Error ? reconnectError.message : String(reconnectError)
      });
      throw reconnectError;
    }
  }
  async query(queryTextOrConfig, values) {
    return this.withDatabase(async () => {
      return await this.pool.query(queryTextOrConfig, values);
    }, "query");
  }
  async validateVectorSetup() {
    try {
      const vectorExt = await this.query(`
                SELECT 1 FROM pg_extension WHERE extname = 'vector'
            `);
      const hasVector = vectorExt.rows.length > 0;
      if (!hasVector) {
        elizaLogger.error("Vector extension not found in database");
        return false;
      }
      return true;
    } catch (error) {
      elizaLogger.error("Failed to validate vector extension:", {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
  async init() {
    await this.testConnection();
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const embeddingConfig = getEmbeddingConfig();
      if (embeddingConfig.provider === EmbeddingProvider.OpenAI) {
        await client.query("SET app.use_openai_embedding = 'true'");
        await client.query("SET app.use_ollama_embedding = 'false'");
        await client.query("SET app.use_gaianet_embedding = 'false'");
      } else if (embeddingConfig.provider === EmbeddingProvider.Ollama) {
        await client.query("SET app.use_openai_embedding = 'false'");
        await client.query("SET app.use_ollama_embedding = 'true'");
        await client.query("SET app.use_gaianet_embedding = 'false'");
      } else if (embeddingConfig.provider === EmbeddingProvider.GaiaNet) {
        await client.query("SET app.use_openai_embedding = 'false'");
        await client.query("SET app.use_ollama_embedding = 'false'");
        await client.query("SET app.use_gaianet_embedding = 'true'");
      } else {
        await client.query("SET app.use_openai_embedding = 'false'");
        await client.query("SET app.use_ollama_embedding = 'false'");
      }
      const { rows } = await client.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'rooms'
                );
            `);
      if (!rows[0].exists || !await this.validateVectorSetup()) {
        elizaLogger.info(
          "Applying database schema - tables or vector extension missing"
        );
        const schema = fs.readFileSync(
          path.resolve(__dirname, "../schema.sql"),
          "utf8"
        );
        await client.query(schema);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async close() {
    await this.pool.end();
  }
  async testConnection() {
    let client;
    try {
      client = await this.pool.connect();
      const result = await client.query("SELECT NOW()");
      elizaLogger.success(
        "Database connection test successful:",
        result.rows[0]
      );
      return true;
    } catch (error) {
      elizaLogger.error("Database connection test failed:", error);
      throw new Error(
        `Failed to connect to database: ${error.message}`
      );
    } finally {
      if (client) client.release();
    }
  }
  async cleanup() {
    try {
      await this.pool.end();
      elizaLogger.info("Database pool closed");
    } catch (error) {
      elizaLogger.error("Error closing database pool:", error);
    }
  }
  async getRoom(roomId) {
    return this.withDatabase(async () => {
      const { rows } = await this.pool.query(
        "SELECT id FROM rooms WHERE id = $1",
        [roomId]
      );
      return rows.length > 0 ? rows[0].id : null;
    }, "getRoom");
  }
  async getParticipantsForAccount(userId) {
    return this.withDatabase(async () => {
      const { rows } = await this.pool.query(
        `SELECT id, "userId", "roomId", "last_message_read"
                FROM participants
                WHERE "userId" = $1`,
        [userId]
      );
      return rows;
    }, "getParticipantsForAccount");
  }
  async getParticipantUserState(roomId, userId) {
    return this.withDatabase(async () => {
      const { rows } = await this.pool.query(
        `SELECT "userState" FROM participants WHERE "roomId" = $1 AND "userId" = $2`,
        [roomId, userId]
      );
      return rows.length > 0 ? rows[0].userState : null;
    }, "getParticipantUserState");
  }
  async getMemoriesByRoomIds(params) {
    return this.withDatabase(async () => {
      if (params.roomIds.length === 0) return [];
      const placeholders = params.roomIds.map((_, i) => `$${i + 2}`).join(", ");
      let query = `SELECT * FROM memories WHERE type = $1 AND "roomId" IN (${placeholders})`;
      let queryParams = [params.tableName, ...params.roomIds];
      if (params.agentId) {
        query += ` AND "agentId" = $${params.roomIds.length + 2}`;
        queryParams = [...queryParams, params.agentId];
      }
      query += ` ORDER BY "createdAt" DESC`;
      if (params.limit) {
        query += ` LIMIT $${queryParams.length + 1}`;
        queryParams.push(params.limit.toString());
      }
      const { rows } = await this.pool.query(query, queryParams);
      return rows.map((row) => ({
        ...row,
        content: typeof row.content === "string" ? JSON.parse(row.content) : row.content
      }));
    }, "getMemoriesByRoomIds");
  }
  async setParticipantUserState(roomId, userId, state) {
    return this.withDatabase(async () => {
      await this.pool.query(
        `UPDATE participants SET "userState" = $1 WHERE "roomId" = $2 AND "userId" = $3`,
        [state, roomId, userId]
      );
    }, "setParticipantUserState");
  }
  async getParticipantsForRoom(roomId) {
    return this.withDatabase(async () => {
      const { rows } = await this.pool.query(
        'SELECT "userId" FROM participants WHERE "roomId" = $1',
        [roomId]
      );
      return rows.map((row) => row.userId);
    }, "getParticipantsForRoom");
  }
  async getAccountById(userId) {
    return this.withDatabase(async () => {
      const { rows } = await this.pool.query(
        "SELECT * FROM accounts WHERE id = $1",
        [userId]
      );
      if (rows.length === 0) {
        elizaLogger.debug("Account not found:", { userId });
        return null;
      }
      const account = rows[0];
      return {
        ...account,
        details: typeof account.details === "string" ? JSON.parse(account.details) : account.details
      };
    }, "getAccountById");
  }
  async createAccount(account) {
    return this.withDatabase(async () => {
      try {
        const accountId = account.id ?? v4();
        await this.pool.query(
          `INSERT INTO accounts (id, name, username, email, "avatarUrl", details)
                    VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            accountId,
            account.name,
            account.username || "",
            account.email || "",
            account.avatarUrl || "",
            JSON.stringify(account.details)
          ]
        );
        elizaLogger.debug("Account created successfully:", {
          accountId
        });
        return true;
      } catch (error) {
        elizaLogger.error("Error creating account:", {
          error: error instanceof Error ? error.message : String(error),
          accountId: account.id,
          name: account.name
          // Only log non-sensitive fields
        });
        return false;
      }
    }, "createAccount");
  }
  async getActorById(params) {
    return this.withDatabase(async () => {
      const { rows } = await this.pool.query(
        `SELECT a.id, a.name, a.username, a.details
                FROM participants p
                LEFT JOIN accounts a ON p."userId" = a.id
                WHERE p."roomId" = $1`,
        [params.roomId]
      );
      elizaLogger.debug("Retrieved actors:", {
        roomId: params.roomId,
        actorCount: rows.length
      });
      return rows.map((row) => {
        try {
          return {
            ...row,
            details: typeof row.details === "string" ? JSON.parse(row.details) : row.details
          };
        } catch (error) {
          elizaLogger.warn("Failed to parse actor details:", {
            actorId: row.id,
            error: error instanceof Error ? error.message : String(error)
          });
          return {
            ...row,
            details: {}
            // Provide default empty details on parse error
          };
        }
      });
    }, "getActorById").catch((error) => {
      elizaLogger.error("Failed to get actors:", {
        roomId: params.roomId,
        error: error.message
      });
      throw error;
    });
  }
  async getMemoryById(id) {
    return this.withDatabase(async () => {
      const { rows } = await this.pool.query(
        "SELECT * FROM memories WHERE id = $1",
        [id]
      );
      if (rows.length === 0) return null;
      return {
        ...rows[0],
        content: typeof rows[0].content === "string" ? JSON.parse(rows[0].content) : rows[0].content
      };
    }, "getMemoryById");
  }
  async getMemoriesByIds(memoryIds, tableName) {
    return this.withDatabase(async () => {
      if (memoryIds.length === 0) return [];
      const placeholders = memoryIds.map((_, i) => `$${i + 1}`).join(",");
      let sql = `SELECT * FROM memories WHERE id IN (${placeholders})`;
      const queryParams = [...memoryIds];
      if (tableName) {
        sql += ` AND type = $${memoryIds.length + 1}`;
        queryParams.push(tableName);
      }
      const { rows } = await this.pool.query(sql, queryParams);
      return rows.map((row) => ({
        ...row,
        content: typeof row.content === "string" ? JSON.parse(row.content) : row.content
      }));
    }, "getMemoriesByIds");
  }
  async createMemory(memory, tableName) {
    return this.withDatabase(async () => {
      elizaLogger.debug("PostgresAdapter createMemory:", {
        memoryId: memory.id,
        embeddingLength: memory.embedding?.length,
        contentLength: memory.content?.text?.length
      });
      let isUnique = true;
      if (memory.embedding) {
        const similarMemories = await this.searchMemoriesByEmbedding(
          memory.embedding,
          {
            tableName,
            roomId: memory.roomId,
            match_threshold: 0.95,
            count: 1
          }
        );
        isUnique = similarMemories.length === 0;
      }
      await this.pool.query(
        `INSERT INTO memories (
                    id, type, content, embedding, "userId", "roomId", "agentId", "unique", "createdAt"
                ) VALUES ($1, $2, $3, $4, $5::uuid, $6::uuid, $7::uuid, $8, to_timestamp($9/1000.0))`,
        [
          memory.id ?? v4(),
          tableName,
          JSON.stringify(memory.content),
          memory.embedding ? `[${memory.embedding.join(",")}]` : null,
          memory.userId,
          memory.roomId,
          memory.agentId,
          memory.unique ?? isUnique,
          Date.now()
        ]
      );
    }, "createMemory");
  }
  async searchMemories(params) {
    return await this.searchMemoriesByEmbedding(params.embedding, {
      match_threshold: params.match_threshold,
      count: params.match_count,
      agentId: params.agentId,
      roomId: params.roomId,
      unique: params.unique,
      tableName: params.tableName
    });
  }
  async getMemories(params) {
    if (!params.tableName) throw new Error("tableName is required");
    if (!params.roomId) throw new Error("roomId is required");
    return this.withDatabase(async () => {
      let sql = `SELECT * FROM memories WHERE type = $1 AND "roomId" = $2`;
      const values = [params.tableName, params.roomId];
      let paramCount = 2;
      if (params.start) {
        paramCount++;
        sql += ` AND "createdAt" >= to_timestamp($${paramCount})`;
        values.push(params.start / 1e3);
      }
      if (params.end) {
        paramCount++;
        sql += ` AND "createdAt" <= to_timestamp($${paramCount})`;
        values.push(params.end / 1e3);
      }
      if (params.unique) {
        sql += ` AND "unique" = true`;
      }
      if (params.agentId) {
        paramCount++;
        sql += ` AND "agentId" = $${paramCount}`;
        values.push(params.agentId);
      }
      sql += ' ORDER BY "createdAt" DESC';
      if (params.count) {
        paramCount++;
        sql += ` LIMIT $${paramCount}`;
        values.push(params.count);
      }
      elizaLogger.debug("Fetching memories:", {
        roomId: params.roomId,
        tableName: params.tableName,
        unique: params.unique,
        agentId: params.agentId,
        timeRange: params.start || params.end ? {
          start: params.start ? new Date(params.start).toISOString() : void 0,
          end: params.end ? new Date(params.end).toISOString() : void 0
        } : void 0,
        limit: params.count
      });
      const { rows } = await this.pool.query(sql, values);
      return rows.map((row) => ({
        ...row,
        content: typeof row.content === "string" ? JSON.parse(row.content) : row.content
      }));
    }, "getMemories");
  }
  async getGoals(params) {
    return this.withDatabase(async () => {
      let sql = `SELECT * FROM goals WHERE "roomId" = $1`;
      const values = [params.roomId];
      let paramCount = 1;
      if (params.userId) {
        paramCount++;
        sql += ` AND "userId" = $${paramCount}`;
        values.push(params.userId);
      }
      if (params.onlyInProgress) {
        sql += " AND status = 'IN_PROGRESS'";
      }
      if (params.count) {
        paramCount++;
        sql += ` LIMIT $${paramCount}`;
        values.push(params.count);
      }
      const { rows } = await this.pool.query(sql, values);
      return rows.map((row) => ({
        ...row,
        objectives: typeof row.objectives === "string" ? JSON.parse(row.objectives) : row.objectives
      }));
    }, "getGoals");
  }
  async updateGoal(goal) {
    return this.withDatabase(async () => {
      try {
        await this.pool.query(
          `UPDATE goals SET name = $1, status = $2, objectives = $3 WHERE id = $4`,
          [
            goal.name,
            goal.status,
            JSON.stringify(goal.objectives),
            goal.id
          ]
        );
      } catch (error) {
        elizaLogger.error("Failed to update goal:", {
          goalId: goal.id,
          error: error instanceof Error ? error.message : String(error),
          status: goal.status
        });
        throw error;
      }
    }, "updateGoal");
  }
  async createGoal(goal) {
    return this.withDatabase(async () => {
      await this.pool.query(
        `INSERT INTO goals (id, "roomId", "userId", name, status, objectives)
                VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          goal.id ?? v4(),
          goal.roomId,
          goal.userId,
          goal.name,
          goal.status,
          JSON.stringify(goal.objectives)
        ]
      );
    }, "createGoal");
  }
  async removeGoal(goalId) {
    if (!goalId) throw new Error("Goal ID is required");
    return this.withDatabase(async () => {
      try {
        const result = await this.pool.query(
          "DELETE FROM goals WHERE id = $1 RETURNING id",
          [goalId]
        );
        elizaLogger.debug("Goal removal attempt:", {
          goalId,
          removed: result?.rowCount ?? 0 > 0
        });
      } catch (error) {
        elizaLogger.error("Failed to remove goal:", {
          goalId,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }, "removeGoal");
  }
  async createRoom(roomId) {
    return this.withDatabase(async () => {
      const newRoomId = roomId || v4();
      await this.pool.query("INSERT INTO rooms (id) VALUES ($1)", [
        newRoomId
      ]);
      return newRoomId;
    }, "createRoom");
  }
  async removeRoom(roomId) {
    if (!roomId) throw new Error("Room ID is required");
    return this.withDatabase(async () => {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        const checkResult = await client.query(
          "SELECT id FROM rooms WHERE id = $1",
          [roomId]
        );
        if (checkResult.rowCount === 0) {
          elizaLogger.warn("No room found to remove:", { roomId });
          throw new Error(`Room not found: ${roomId}`);
        }
        await client.query('DELETE FROM memories WHERE "roomId" = $1', [
          roomId
        ]);
        await client.query(
          'DELETE FROM participants WHERE "roomId" = $1',
          [roomId]
        );
        await client.query('DELETE FROM goals WHERE "roomId" = $1', [
          roomId
        ]);
        const result = await client.query(
          "DELETE FROM rooms WHERE id = $1 RETURNING id",
          [roomId]
        );
        await client.query("COMMIT");
        elizaLogger.debug(
          "Room and related data removed successfully:",
          {
            roomId,
            removed: result?.rowCount ?? 0 > 0
          }
        );
      } catch (error) {
        await client.query("ROLLBACK");
        elizaLogger.error("Failed to remove room:", {
          roomId,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      } finally {
        if (client) client.release();
      }
    }, "removeRoom");
  }
  async createRelationship(params) {
    if (!params.userA || !params.userB) {
      throw new Error("userA and userB are required");
    }
    return this.withDatabase(async () => {
      try {
        const relationshipId = v4();
        await this.pool.query(
          `INSERT INTO relationships (id, "userA", "userB", "userId")
                    VALUES ($1, $2, $3, $4)
                    RETURNING id`,
          [relationshipId, params.userA, params.userB, params.userA]
        );
        elizaLogger.debug("Relationship created successfully:", {
          relationshipId,
          userA: params.userA,
          userB: params.userB
        });
        return true;
      } catch (error) {
        if (error.code === "23505") {
          elizaLogger.warn("Relationship already exists:", {
            userA: params.userA,
            userB: params.userB,
            error: error instanceof Error ? error.message : String(error)
          });
        } else {
          elizaLogger.error("Failed to create relationship:", {
            userA: params.userA,
            userB: params.userB,
            error: error instanceof Error ? error.message : String(error)
          });
        }
        return false;
      }
    }, "createRelationship");
  }
  async getRelationship(params) {
    if (!params.userA || !params.userB) {
      throw new Error("userA and userB are required");
    }
    return this.withDatabase(async () => {
      try {
        const { rows } = await this.pool.query(
          `SELECT * FROM relationships
                    WHERE ("userA" = $1 AND "userB" = $2)
                    OR ("userA" = $2 AND "userB" = $1)`,
          [params.userA, params.userB]
        );
        if (rows.length > 0) {
          elizaLogger.debug("Relationship found:", {
            relationshipId: rows[0].id,
            userA: params.userA,
            userB: params.userB
          });
          return rows[0];
        }
        elizaLogger.debug("No relationship found between users:", {
          userA: params.userA,
          userB: params.userB
        });
        return null;
      } catch (error) {
        elizaLogger.error("Error fetching relationship:", {
          userA: params.userA,
          userB: params.userB,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }, "getRelationship");
  }
  async getRelationships(params) {
    if (!params.userId) {
      throw new Error("userId is required");
    }
    return this.withDatabase(async () => {
      try {
        const { rows } = await this.pool.query(
          `SELECT * FROM relationships
                    WHERE "userA" = $1 OR "userB" = $1
                    ORDER BY "createdAt" DESC`,
          // Add ordering if you have this field
          [params.userId]
        );
        elizaLogger.debug("Retrieved relationships:", {
          userId: params.userId,
          count: rows.length
        });
        return rows;
      } catch (error) {
        elizaLogger.error("Failed to fetch relationships:", {
          userId: params.userId,
          error: error instanceof Error ? error.message : String(error)
        });
        throw error;
      }
    }, "getRelationships");
  }
  async getCachedEmbeddings(opts) {
    if (!opts.query_table_name)
      throw new Error("query_table_name is required");
    if (!opts.query_input) throw new Error("query_input is required");
    if (!opts.query_field_name)
      throw new Error("query_field_name is required");
    if (!opts.query_field_sub_name)
      throw new Error("query_field_sub_name is required");
    if (opts.query_match_count <= 0)
      throw new Error("query_match_count must be positive");
    return this.withDatabase(async () => {
      try {
        elizaLogger.debug("Fetching cached embeddings:", {
          tableName: opts.query_table_name,
          fieldName: opts.query_field_name,
          subFieldName: opts.query_field_sub_name,
          matchCount: opts.query_match_count,
          inputLength: opts.query_input.length
        });
        const sql = `
                    WITH content_text AS (
                        SELECT
                            embedding,
                            COALESCE(
                                content->>$2,
                                ''
                            ) as content_text
                        FROM memories
                        WHERE type = $3
                        AND content->>$2 IS NOT NULL
                    )
                    SELECT
                        embedding,
                        levenshtein(
                            $1,
                            content_text
                        ) as levenshtein_score
                    FROM content_text
                    WHERE levenshtein(
                        $1,
                        content_text
                    ) <= $5  -- Add threshold check
                    ORDER BY levenshtein_score
                    LIMIT $4
                `;
        const { rows } = await this.pool.query(sql, [
          opts.query_input,
          opts.query_field_sub_name,
          opts.query_table_name,
          opts.query_match_count,
          opts.query_threshold
        ]);
        elizaLogger.debug("Retrieved cached embeddings:", {
          count: rows.length,
          tableName: opts.query_table_name,
          matchCount: opts.query_match_count
        });
        return rows.map(
          (row) => {
            if (!Array.isArray(row.embedding)) return null;
            return {
              embedding: row.embedding,
              levenshtein_score: Number(
                row.levenshtein_score
              )
            };
          }
        ).filter(
          (row) => row !== null
        );
      } catch (error) {
        elizaLogger.error("Error in getCachedEmbeddings:", {
          error: error instanceof Error ? error.message : String(error),
          tableName: opts.query_table_name,
          fieldName: opts.query_field_name
        });
        throw error;
      }
    }, "getCachedEmbeddings");
  }
  async log(params) {
    if (!params.userId) throw new Error("userId is required");
    if (!params.roomId) throw new Error("roomId is required");
    if (!params.type) throw new Error("type is required");
    if (!params.body || typeof params.body !== "object") {
      throw new Error("body must be a valid object");
    }
    return this.withDatabase(async () => {
      try {
        const logId = v4();
        await this.pool.query(
          `INSERT INTO logs (
                        id,
                        body,
                        "userId",
                        "roomId",
                        type,
                        "createdAt"
                    ) VALUES ($1, $2, $3, $4, $5, NOW())
                    RETURNING id`,
          [
            logId,
            JSON.stringify(params.body),
            // Ensure body is stringified
            params.userId,
            params.roomId,
            params.type
          ]
        );
        elizaLogger.debug("Log entry created:", {
          logId,
          type: params.type,
          roomId: params.roomId,
          userId: params.userId,
          bodyKeys: Object.keys(params.body)
        });
      } catch (error) {
        elizaLogger.error("Failed to create log entry:", {
          error: error instanceof Error ? error.message : String(error),
          type: params.type,
          roomId: params.roomId,
          userId: params.userId
        });
        throw error;
      }
    }, "log");
  }
  async searchMemoriesByEmbedding(embedding, params) {
    return this.withDatabase(async () => {
      elizaLogger.debug("Incoming vector:", {
        length: embedding.length,
        sample: embedding.slice(0, 5),
        isArray: Array.isArray(embedding),
        allNumbers: embedding.every((n) => typeof n === "number")
      });
      if (embedding.length !== getEmbeddingConfig().dimensions) {
        throw new Error(
          `Invalid embedding dimension: expected ${getEmbeddingConfig().dimensions}, got ${embedding.length}`
        );
      }
      const cleanVector = embedding.map((n) => {
        if (!Number.isFinite(n)) return 0;
        return Number(n.toFixed(6));
      });
      const vectorStr = `[${cleanVector.join(",")}]`;
      elizaLogger.debug("Vector debug:", {
        originalLength: embedding.length,
        cleanLength: cleanVector.length,
        sampleStr: vectorStr.slice(0, 100)
      });
      let sql = `
                SELECT *,
                1 - (embedding <-> $1::vector(${getEmbeddingConfig().dimensions})) as similarity
                FROM memories
                WHERE type = $2
            `;
      const values = [vectorStr, params.tableName];
      elizaLogger.debug("Query debug:", {
        sql: sql.slice(0, 200),
        paramTypes: values.map((v) => typeof v),
        vectorStrLength: vectorStr.length
      });
      let paramCount = 2;
      if (params.unique) {
        sql += ` AND "unique" = true`;
      }
      if (params.agentId) {
        paramCount++;
        sql += ` AND "agentId" = $${paramCount}`;
        values.push(params.agentId);
      }
      if (params.roomId) {
        paramCount++;
        sql += ` AND "roomId" = $${paramCount}::uuid`;
        values.push(params.roomId);
      }
      if (params.match_threshold) {
        paramCount++;
        sql += ` AND 1 - (embedding <-> $1::vector) >= $${paramCount}`;
        values.push(params.match_threshold);
      }
      sql += ` ORDER BY embedding <-> $1::vector`;
      if (params.count) {
        paramCount++;
        sql += ` LIMIT $${paramCount}`;
        values.push(params.count);
      }
      const { rows } = await this.pool.query(sql, values);
      return rows.map((row) => ({
        ...row,
        content: typeof row.content === "string" ? JSON.parse(row.content) : row.content,
        similarity: row.similarity
      }));
    }, "searchMemoriesByEmbedding");
  }
  async addParticipant(userId, roomId) {
    return this.withDatabase(async () => {
      try {
        await this.pool.query(
          `INSERT INTO participants (id, "userId", "roomId")
                    VALUES ($1, $2, $3)`,
          [v4(), userId, roomId]
        );
        return true;
      } catch (error) {
        console.log("Error adding participant", error);
        return false;
      }
    }, "addParticpant");
  }
  async removeParticipant(userId, roomId) {
    return this.withDatabase(async () => {
      try {
        await this.pool.query(
          `DELETE FROM participants WHERE "userId" = $1 AND "roomId" = $2`,
          [userId, roomId]
        );
        return true;
      } catch (error) {
        console.log("Error removing participant", error);
        return false;
      }
    }, "removeParticipant");
  }
  async updateGoalStatus(params) {
    return this.withDatabase(async () => {
      await this.pool.query(
        "UPDATE goals SET status = $1 WHERE id = $2",
        [params.status, params.goalId]
      );
    }, "updateGoalStatus");
  }
  async removeMemory(memoryId, tableName) {
    return this.withDatabase(async () => {
      await this.pool.query(
        "DELETE FROM memories WHERE type = $1 AND id = $2",
        [tableName, memoryId]
      );
    }, "removeMemory");
  }
  async removeAllMemories(roomId, tableName) {
    return this.withDatabase(async () => {
      await this.pool.query(
        `DELETE FROM memories WHERE type = $1 AND "roomId" = $2`,
        [tableName, roomId]
      );
    }, "removeAllMemories");
  }
  async countMemories(roomId, unique = true, tableName = "") {
    if (!tableName) throw new Error("tableName is required");
    return this.withDatabase(async () => {
      let sql = `SELECT COUNT(*) as count FROM memories WHERE type = $1 AND "roomId" = $2`;
      if (unique) {
        sql += ` AND "unique" = true`;
      }
      const { rows } = await this.pool.query(sql, [tableName, roomId]);
      return Number.parseInt(rows[0].count);
    }, "countMemories");
  }
  async removeAllGoals(roomId) {
    return this.withDatabase(async () => {
      await this.pool.query(`DELETE FROM goals WHERE "roomId" = $1`, [
        roomId
      ]);
    }, "removeAllGoals");
  }
  async getRoomsForParticipant(userId) {
    return this.withDatabase(async () => {
      const { rows } = await this.pool.query(
        `SELECT "roomId" FROM participants WHERE "userId" = $1`,
        [userId]
      );
      return rows.map((row) => row.roomId);
    }, "getRoomsForParticipant");
  }
  async getRoomsForParticipants(userIds) {
    return this.withDatabase(async () => {
      const placeholders = userIds.map((_, i) => `$${i + 1}`).join(", ");
      const { rows } = await this.pool.query(
        `SELECT DISTINCT "roomId" FROM participants WHERE "userId" IN (${placeholders})`,
        userIds
      );
      return rows.map((row) => row.roomId);
    }, "getRoomsForParticipants");
  }
  async getActorDetails(params) {
    if (!params.roomId) {
      throw new Error("roomId is required");
    }
    return this.withDatabase(async () => {
      try {
        const sql = `
                    SELECT
                        a.id,
                        a.name,
                        a.username,
                        a."avatarUrl",
                        COALESCE(a.details::jsonb, '{}'::jsonb) as details
                    FROM participants p
                    LEFT JOIN accounts a ON p."userId" = a.id
                    WHERE p."roomId" = $1
                    ORDER BY a.name
                `;
        const result = await this.pool.query(sql, [
          params.roomId
        ]);
        elizaLogger.debug("Retrieved actor details:", {
          roomId: params.roomId,
          actorCount: result.rows.length
        });
        return result.rows.map((row) => {
          try {
            return {
              ...row,
              details: typeof row.details === "string" ? JSON.parse(row.details) : row.details
            };
          } catch (parseError) {
            elizaLogger.warn("Failed to parse actor details:", {
              actorId: row.id,
              error: parseError instanceof Error ? parseError.message : String(parseError)
            });
            return {
              ...row,
              details: {}
              // Fallback to empty object if parsing fails
            };
          }
        });
      } catch (error) {
        elizaLogger.error("Failed to fetch actor details:", {
          roomId: params.roomId,
          error: error instanceof Error ? error.message : String(error)
        });
        throw new Error(
          `Failed to fetch actor details: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }, "getActorDetails");
  }
  async getCache(params) {
    return this.withDatabase(async () => {
      try {
        const sql = `SELECT "value"::TEXT FROM cache WHERE "key" = $1 AND "agentId" = $2`;
        const { rows } = await this.query(sql, [
          params.key,
          params.agentId
        ]);
        return rows[0]?.value ?? void 0;
      } catch (error) {
        elizaLogger.error("Error fetching cache", {
          error: error instanceof Error ? error.message : String(error),
          key: params.key,
          agentId: params.agentId
        });
        return void 0;
      }
    }, "getCache");
  }
  async setCache(params) {
    return this.withDatabase(async () => {
      try {
        const client = await this.pool.connect();
        try {
          await client.query("BEGIN");
          await client.query(
            `INSERT INTO cache ("key", "agentId", "value", "createdAt")
                         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
                         ON CONFLICT ("key", "agentId")
                         DO UPDATE SET "value" = EXCLUDED.value, "createdAt" = CURRENT_TIMESTAMP`,
            [params.key, params.agentId, params.value]
          );
          await client.query("COMMIT");
          return true;
        } catch (error) {
          await client.query("ROLLBACK");
          elizaLogger.error("Error setting cache", {
            error: error instanceof Error ? error.message : String(error),
            key: params.key,
            agentId: params.agentId
          });
          return false;
        } finally {
          if (client) client.release();
        }
      } catch (error) {
        elizaLogger.error(
          "Database connection error in setCache",
          error
        );
        return false;
      }
    }, "setCache");
  }
  async deleteCache(params) {
    return this.withDatabase(async () => {
      try {
        const client = await this.pool.connect();
        try {
          await client.query("BEGIN");
          await client.query(
            `DELETE FROM cache WHERE "key" = $1 AND "agentId" = $2`,
            [params.key, params.agentId]
          );
          await client.query("COMMIT");
          return true;
        } catch (error) {
          await client.query("ROLLBACK");
          elizaLogger.error("Error deleting cache", {
            error: error instanceof Error ? error.message : String(error),
            key: params.key,
            agentId: params.agentId
          });
          return false;
        } finally {
          client.release();
        }
      } catch (error) {
        elizaLogger.error(
          "Database connection error in deleteCache",
          error
        );
        return false;
      }
    }, "deleteCache");
  }
  async getKnowledge(params) {
    return this.withDatabase(async () => {
      let sql = `SELECT * FROM knowledge WHERE ("agentId" = $1 OR "isShared" = true)`;
      const queryParams = [params.agentId];
      let paramCount = 1;
      if (params.id) {
        paramCount++;
        sql += ` AND id = $${paramCount}`;
        queryParams.push(params.id);
      }
      if (params.limit) {
        paramCount++;
        sql += ` LIMIT $${paramCount}`;
        queryParams.push(params.limit);
      }
      const { rows } = await this.pool.query(sql, queryParams);
      return rows.map((row) => ({
        id: row.id,
        agentId: row.agentId,
        content: typeof row.content === "string" ? JSON.parse(row.content) : row.content,
        embedding: row.embedding ? new Float32Array(row.embedding) : void 0,
        createdAt: row.createdAt.getTime()
      }));
    }, "getKnowledge");
  }
  async searchKnowledge(params) {
    return this.withDatabase(async () => {
      const cacheKey = `embedding_${params.agentId}_${params.searchText}`;
      const cachedResult = await this.getCache({
        key: cacheKey,
        agentId: params.agentId
      });
      if (cachedResult) {
        return JSON.parse(cachedResult);
      }
      const vectorStr = `[${Array.from(params.embedding).join(",")}]`;
      const sql = `
                WITH vector_scores AS (
                    SELECT id,
                        1 - (embedding <-> $1::vector) as vector_score
                    FROM knowledge
                    WHERE ("agentId" IS NULL AND "isShared" = true) OR "agentId" = $2
                    AND embedding IS NOT NULL
                ),
                keyword_matches AS (
                    SELECT id,
                    CASE
                        WHEN content->>'text' ILIKE $3 THEN 3.0
                        ELSE 1.0
                    END *
                    CASE
                        WHEN (content->'metadata'->>'isChunk')::boolean = true THEN 1.5
                        WHEN (content->'metadata'->>'isMain')::boolean = true THEN 1.2
                        ELSE 1.0
                    END as keyword_score
                    FROM knowledge
                    WHERE ("agentId" IS NULL AND "isShared" = true) OR "agentId" = $2
                )
                SELECT k.*,
                    v.vector_score,
                    kw.keyword_score,
                    (v.vector_score * kw.keyword_score) as combined_score
                FROM knowledge k
                JOIN vector_scores v ON k.id = v.id
                LEFT JOIN keyword_matches kw ON k.id = kw.id
                WHERE ("agentId" IS NULL AND "isShared" = true) OR k."agentId" = $2
                AND (
                    v.vector_score >= $4
                    OR (kw.keyword_score > 1.0 AND v.vector_score >= 0.3)
                )
                ORDER BY combined_score DESC
                LIMIT $5
            `;
      const { rows } = await this.pool.query(sql, [
        vectorStr,
        params.agentId,
        `%${params.searchText || ""}%`,
        params.match_threshold,
        params.match_count
      ]);
      const results = rows.map((row) => ({
        id: row.id,
        agentId: row.agentId,
        content: typeof row.content === "string" ? JSON.parse(row.content) : row.content,
        embedding: row.embedding ? new Float32Array(row.embedding) : void 0,
        createdAt: row.createdAt.getTime(),
        similarity: row.combined_score
      }));
      await this.setCache({
        key: cacheKey,
        agentId: params.agentId,
        value: JSON.stringify(results)
      });
      return results;
    }, "searchKnowledge");
  }
  async createKnowledge(knowledge) {
    return this.withDatabase(async () => {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        const metadata = knowledge.content.metadata || {};
        const vectorStr = knowledge.embedding ? `[${Array.from(knowledge.embedding).join(",")}]` : null;
        if (metadata.isChunk && metadata.originalId) {
          await this.createKnowledgeChunk({
            id: knowledge.id,
            originalId: metadata.originalId,
            agentId: metadata.isShared ? null : knowledge.agentId,
            content: knowledge.content,
            embedding: knowledge.embedding,
            chunkIndex: metadata.chunkIndex || 0,
            isShared: metadata.isShared || false,
            createdAt: knowledge.createdAt || Date.now()
          });
        } else {
          await client.query(
            `
                        INSERT INTO knowledge (
                            id, "agentId", content, embedding, "createdAt",
                            "isMain", "originalId", "chunkIndex", "isShared"
                        ) VALUES ($1, $2, $3, $4, to_timestamp($5/1000.0), $6, $7, $8, $9)
                        ON CONFLICT (id) DO NOTHING
                    `,
            [
              knowledge.id,
              metadata.isShared ? null : knowledge.agentId,
              knowledge.content,
              vectorStr,
              knowledge.createdAt || Date.now(),
              true,
              null,
              null,
              metadata.isShared || false
            ]
          );
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }, "createKnowledge");
  }
  async removeKnowledge(id) {
    return this.withDatabase(async () => {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        if (typeof id === "string" && id.includes("-chunk-*")) {
          const mainId = id.split("-chunk-")[0];
          await client.query(
            'DELETE FROM knowledge WHERE "originalId" = $1',
            [mainId]
          );
        } else {
          await client.query(
            'DELETE FROM knowledge WHERE "originalId" = $1',
            [id]
          );
          await client.query("DELETE FROM knowledge WHERE id = $1", [
            id
          ]);
        }
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        elizaLogger.error("Error removing knowledge", {
          error: error instanceof Error ? error.message : String(error),
          id
        });
        throw error;
      } finally {
        client.release();
      }
    }, "removeKnowledge");
  }
  async clearKnowledge(agentId, shared) {
    return this.withDatabase(async () => {
      const sql = shared ? 'DELETE FROM knowledge WHERE ("agentId" = $1 OR "isShared" = true)' : 'DELETE FROM knowledge WHERE "agentId" = $1';
      await this.pool.query(sql, [agentId]);
    }, "clearKnowledge");
  }
  async createKnowledgeChunk(params) {
    const vectorStr = params.embedding ? `[${Array.from(params.embedding).join(",")}]` : null;
    const patternId = `${params.originalId}-chunk-${params.chunkIndex}`;
    const contentWithPatternId = {
      ...params.content,
      metadata: {
        ...params.content.metadata,
        patternId
      }
    };
    await this.pool.query(
      `
            INSERT INTO knowledge (
                id, "agentId", content, embedding, "createdAt",
                "isMain", "originalId", "chunkIndex", "isShared"
            ) VALUES ($1, $2, $3, $4, to_timestamp($5/1000.0), $6, $7, $8, $9)
            ON CONFLICT (id) DO NOTHING
        `,
      [
        v4(),
        // Generate a proper UUID for PostgreSQL
        params.agentId,
        contentWithPatternId,
        // Store the pattern ID in metadata
        vectorStr,
        params.createdAt,
        false,
        params.originalId,
        params.chunkIndex,
        params.isShared
      ]
    );
  }
};
var index_default = PostgresDatabaseAdapter;
export {
  PostgresDatabaseAdapter,
  index_default as default
};
//# sourceMappingURL=index.js.map