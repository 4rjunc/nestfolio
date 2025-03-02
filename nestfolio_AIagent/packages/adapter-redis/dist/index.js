// src/index.ts
import Redis from "ioredis";
import { elizaLogger } from "@elizaos/core";
var RedisClient = class {
  client;
  constructor(redisUrl) {
    this.client = new Redis(redisUrl);
    this.client.on("connect", () => {
      elizaLogger.success("Connected to Redis");
    });
    this.client.on("error", (err) => {
      elizaLogger.error("Redis error:", err);
    });
  }
  async getCache(params) {
    try {
      const redisKey = this.buildKey(params.agentId, params.key);
      const value = await this.client.get(redisKey);
      return value || void 0;
    } catch (err) {
      elizaLogger.error("Error getting cache:", err);
      return void 0;
    }
  }
  async setCache(params) {
    try {
      const redisKey = this.buildKey(params.agentId, params.key);
      await this.client.set(redisKey, params.value);
      return true;
    } catch (err) {
      elizaLogger.error("Error setting cache:", err);
      return false;
    }
  }
  async deleteCache(params) {
    try {
      const redisKey = this.buildKey(params.agentId, params.key);
      const result = await this.client.del(redisKey);
      return result > 0;
    } catch (err) {
      elizaLogger.error("Error deleting cache:", err);
      return false;
    }
  }
  async disconnect() {
    try {
      await this.client.quit();
      elizaLogger.success("Disconnected from Redis");
    } catch (err) {
      elizaLogger.error("Error disconnecting from Redis:", err);
    }
  }
  buildKey(agentId, key) {
    return `${agentId}:${key}`;
  }
};
var index_default = RedisClient;
export {
  RedisClient,
  index_default as default
};
//# sourceMappingURL=index.js.map