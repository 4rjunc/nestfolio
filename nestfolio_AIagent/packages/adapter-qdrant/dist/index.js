// src/index.ts
import { v4, v5 } from "uuid";
import { QdrantClient } from "@qdrant/js-client-rest";
import {
  elizaLogger,
  DatabaseAdapter
} from "@elizaos/core";
var QdrantDatabaseAdapter = class extends DatabaseAdapter {
  db;
  collectionName = "collection";
  qdrantV5UUIDNamespace = "00000000-0000-0000-0000-000000000000";
  cacheM = /* @__PURE__ */ new Map();
  vectorSize;
  constructor(url, apiKey, port, vectorSize) {
    super();
    elizaLogger.info("new Qdrant client...");
    this.db = new QdrantClient({
      url,
      apiKey,
      port
    });
    this.vectorSize = vectorSize;
  }
  preprocess(content) {
    if (!content || typeof content !== "string") {
      elizaLogger.warn("Invalid input for preprocessing");
      return "";
    }
    const processedContent = content.replace(/```[\s\S]*?```/g, "").replace(/`.*?`/g, "").replace(/#{1,6}\s*(.*)/g, "$1").replace(/!\[(.*?)\]\(.*?\)/g, "$1").replace(/\[(.*?)\]\(.*?\)/g, "$1").replace(/(https?:\/\/)?(www\.)?([^\s]+\.[^\s]+)/g, "$3").replace(/<@[!&]?\d+>/g, "").replace(/<[^>]*>/g, "").replace(/^\s*[-*_]{3,}\s*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*/g, "").replace(/\s+/g, " ").replace(/\n{3,}/g, "\n\n").replace(/[^a-zA-Z0-9\s\-_./:?=&]/g, "").trim();
    return processedContent;
  }
  async init() {
    const response = await this.db.getCollections();
    const collectionNames = response.collections.map((collection) => collection.name);
    if (collectionNames.includes(this.collectionName)) {
      elizaLogger.info("Collection already exists.");
    } else {
      elizaLogger.info("create collection...");
      await this.db.createCollection(this.collectionName, {
        vectors: {
          size: this.vectorSize,
          distance: "Cosine"
        }
      });
    }
  }
  async createKnowledge(knowledge) {
    const metadata = knowledge.content.metadata || {};
    elizaLogger.info("Qdrant adapter createKnowledge id:", knowledge.id);
    await this.db.upsert(this.collectionName, {
      wait: true,
      points: [
        {
          id: this.buildQdrantID(knowledge.id),
          // the qdrant id must be a standard uuid
          vector: knowledge.embedding ? Array.from(knowledge.embedding) : [],
          payload: {
            agentId: metadata.isShared ? null : knowledge.agentId,
            content: {
              text: knowledge.content.text,
              metadata
            },
            createdAt: knowledge.createdAt || Date.now(),
            isMain: metadata.isMain || false,
            originalId: metadata.originalId || null,
            chunkIndex: metadata.chunkIndex || null,
            isShared: metadata.isShared || false
          }
        }
      ]
    });
  }
  async getKnowledge(params) {
    elizaLogger.info("Qdrant adapter getKnowledge...", params.id);
    const rows = await this.db.retrieve(this.collectionName, {
      ids: params.id ? [params.id.toString()] : []
    });
    const results = rows.map((row) => {
      const contentObj = typeof row.payload?.content === "string" ? JSON.parse(row.payload.content) : row.payload?.content;
      return {
        id: row.id.toString(),
        agentId: row.payload?.agentId || "",
        content: {
          text: String(contentObj.text || ""),
          metadata: contentObj.metadata
        },
        embedding: row.vector ? Float32Array.from(row.vector) : void 0,
        createdAt: row.payload?.createdAt
      };
    });
    return results;
  }
  async processFile(file) {
    return Promise.resolve(void 0);
  }
  async removeKnowledge(id) {
    return Promise.resolve(void 0);
  }
  async searchKnowledge(params) {
    const cacheKey = `${params.agentId}:${params.embedding.toString()}`;
    const cachedResult = await this.getCache({
      key: cacheKey,
      agentId: params.agentId
    });
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }
    const rows = await this.db.search(this.collectionName, {
      vector: Array.from(params.embedding),
      with_vector: true
    });
    const results = rows.map((row) => {
      const contentObj = typeof row.payload?.content === "string" ? JSON.parse(row.payload.content) : row.payload?.content;
      elizaLogger.info("Qdrant adapter searchKnowledge  id:", row.id.toString());
      return {
        id: row.id.toString(),
        agentId: row.payload?.agentId || "",
        content: {
          text: String(contentObj.text || ""),
          metadata: contentObj.metadata
        },
        embedding: row.vector ? Float32Array.from(row.vector) : void 0,
        createdAt: row.payload?.createdAt,
        similarity: row.score || 0
      };
    });
    elizaLogger.debug("Qdrant adapter searchKnowledge results:", results);
    await this.setCache({
      key: cacheKey,
      agentId: params.agentId,
      value: JSON.stringify(results)
    });
    return results;
  }
  async addParticipant(userId, roomId) {
    return Promise.resolve(false);
  }
  async clearKnowledge(agentId, shared) {
    return Promise.resolve(void 0);
  }
  async close() {
    return Promise.resolve(void 0);
  }
  async countMemories(roomId, unique, tableName) {
    return Promise.resolve(0);
  }
  async createAccount(account) {
    return Promise.resolve(false);
  }
  async createGoal(goal) {
    return Promise.resolve(void 0);
  }
  async createMemory(memory, tableName, unique) {
    return Promise.resolve(void 0);
  }
  async createRelationship(params) {
    return Promise.resolve(false);
  }
  async createRoom(roomId) {
    const newRoomId = roomId || v4();
    return newRoomId;
  }
  async getAccountById(userId) {
    return null;
  }
  async getActorDetails(params) {
    return Promise.resolve([]);
  }
  async getCachedEmbeddings(params) {
    return Promise.resolve([]);
  }
  async getGoals(params) {
    return Promise.resolve([]);
  }
  async getMemories(params) {
    return Promise.resolve([]);
  }
  async getMemoriesByRoomIds(params) {
    return Promise.resolve([]);
  }
  async getMemoryById(id) {
    return null;
  }
  async getParticipantUserState(roomId, userId) {
    return null;
  }
  async getParticipantsForAccount(userId) {
    return Promise.resolve([]);
  }
  async getParticipantsForRoom(roomId) {
    return Promise.resolve([]);
  }
  async getRelationship(params) {
    return null;
  }
  async getRelationships(params) {
    return Promise.resolve([]);
  }
  async getRoom(roomId) {
    return null;
  }
  async getRoomsForParticipant(userId) {
    return Promise.resolve([]);
  }
  async getRoomsForParticipants(userIds) {
    return Promise.resolve([]);
  }
  async log(params) {
    return Promise.resolve(void 0);
  }
  async removeAllGoals(roomId) {
    return Promise.resolve(void 0);
  }
  async removeAllMemories(roomId, tableName) {
    return Promise.resolve(void 0);
  }
  async removeGoal(goalId) {
    return Promise.resolve(void 0);
  }
  async removeMemory(memoryId, tableName) {
    return Promise.resolve(void 0);
  }
  async removeParticipant(userId, roomId) {
    return Promise.resolve(false);
  }
  async removeRoom(roomId) {
    return Promise.resolve(void 0);
  }
  async searchMemories(params) {
    return Promise.resolve([]);
  }
  async searchMemoriesByEmbedding(embedding, params) {
    return Promise.resolve([]);
  }
  async setParticipantUserState(roomId, userId, state) {
    return Promise.resolve(void 0);
  }
  async updateGoal(goal) {
    return Promise.resolve(void 0);
  }
  async updateGoalStatus(params) {
    return Promise.resolve(void 0);
  }
  getMemoriesByIds(memoryIds, tableName) {
    throw new Error("Method not implemented.");
  }
  async getCache(params) {
    let key = this.buildKey(params.agentId, params.key);
    let result = this.cacheM.get(key);
    return result;
  }
  async setCache(params) {
    this.cacheM.set(this.buildKey(params.agentId, params.key), params.value);
    return true;
  }
  async deleteCache(params) {
    const key = this.buildKey(params.agentId, params.key);
    return this.cacheM.delete(key);
  }
  buildKey(agentId, key) {
    return `${agentId}:${key}`;
  }
  buildQdrantID(id) {
    return v5(id, this.qdrantV5UUIDNamespace);
  }
};
var index_default = QdrantDatabaseAdapter;
export {
  QdrantDatabaseAdapter,
  index_default as default
};
//# sourceMappingURL=index.js.map