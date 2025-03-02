// src/services/teeLogService.ts
import { Service, ServiceType } from "@elizaos/core";
import { TEEMode } from "@elizaos/plugin-tee";

// src/types.ts
var TeeType = /* @__PURE__ */ ((TeeType2) => {
  TeeType2["SGX_GRAMINE"] = "sgx_gramine";
  TeeType2["TDX_DSTACK"] = "tdx_dstack";
  return TeeType2;
})(TeeType || {});
var TeeLogDAO = class {
  db;
};

// src/adapters/sqliteTables.ts
var sqliteTables = `
BEGIN TRANSACTION;

-- Table: tee_logs
CREATE TABLE IF NOT EXISTS "tee_logs" (
    "id" TEXT PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "signature" TEXT NOT NULL
);

-- Table: tee_agents
CREATE TABLE IF NOT EXISTS "tee_agents" (
    "id" TEXT PRIMARY KEY,
    "agentId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "publicKey" TEXT NOT NULL,
    "attestation" TEXT NOT NULL
);

COMMIT;`;

// src/adapters/sqliteDAO.ts
var SqliteTeeLogDAO = class extends TeeLogDAO {
  constructor(db) {
    super();
    this.db = db;
  }
  async initialize() {
    this.db.exec(sqliteTables);
  }
  async addLog(log) {
    const stmt = this.db.prepare(
      "INSERT INTO tee_logs (id, agentId, roomId, userId, type, content, timestamp, signature) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    );
    try {
      stmt.run(log.id, log.agentId, log.roomId, log.userId, log.type, log.content, log.timestamp, log.signature);
      return true;
    } catch (error) {
      console.error("Error adding log to database", error);
      return false;
    }
  }
  async getPagedLogs(query, page, pageSize) {
    if (page < 1) {
      page = 1;
    }
    const offset = (page - 1) * pageSize;
    const limit = pageSize;
    const whereConditions = [];
    const params = [];
    if (query.agentId && query.agentId !== "") {
      whereConditions.push("agentId = ?");
      params.push(query.agentId);
    }
    if (query.roomId && query.roomId !== "") {
      whereConditions.push("roomId = ?");
      params.push(query.roomId);
    }
    if (query.userId && query.userId !== "") {
      whereConditions.push("userId = ?");
      params.push(query.userId);
    }
    if (query.type && query.type !== "") {
      whereConditions.push("type = ?");
      params.push(query.type);
    }
    if (query.containsContent && query.containsContent !== "") {
      whereConditions.push("content LIKE ?");
      params.push(`%${query.containsContent}%`);
    }
    if (query.startTimestamp) {
      whereConditions.push("timestamp >= ?");
      params.push(query.startTimestamp);
    }
    if (query.endTimestamp) {
      whereConditions.push("timestamp <= ?");
      params.push(query.endTimestamp);
    }
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";
    try {
      const total_stmt = this.db.prepare(
        `SELECT COUNT(*) as total FROM tee_logs ${whereClause}`
      );
      const total = total_stmt.get(params).total;
      const logs_stmt = this.db.prepare(
        `SELECT * FROM tee_logs ${whereClause} ORDER BY timestamp ASC LIMIT ? OFFSET ?`
      );
      const logs = logs_stmt.all(...params, limit, offset);
      return {
        page,
        pageSize,
        total,
        data: logs
      };
    } catch (error) {
      console.error("Error getting paged logs from database", error);
      throw error;
    }
  }
  async addAgent(agent) {
    const stmt = this.db.prepare(
      "INSERT INTO tee_agents (id, agentId, agentName, createdAt, publicKey, attestation) VALUES (?, ?, ?, ?, ?, ?)"
    );
    try {
      stmt.run(agent.id, agent.agentId, agent.agentName, agent.createdAt, agent.publicKey, agent.attestation);
      return true;
    } catch (error) {
      console.error("Error adding agent to database", error);
      return false;
    }
  }
  async getAgent(agentId) {
    const stmt = this.db.prepare("SELECT * FROM tee_agents WHERE agentId = ? ORDER BY createdAt DESC LIMIT 1");
    try {
      return stmt.get(agentId);
    } catch (error) {
      console.error("Error getting agent from database", error);
      throw error;
    }
  }
  async getAllAgents() {
    const stmt = this.db.prepare("SELECT * FROM tee_agents");
    try {
      return stmt.all();
    } catch (error) {
      console.error("Error getting all agents from database", error);
      throw error;
    }
  }
};

// src/services/teeLogManager.ts
import {
  RemoteAttestationProvider as TdxAttestationProvider
} from "@elizaos/plugin-tee";
import { SgxAttestationProvider } from "@elizaos/plugin-sgx";
import elliptic from "elliptic";

// ../../node_modules/uuid/dist/esm-node/rng.js
import crypto from "crypto";
var rnds8Pool = new Uint8Array(256);
var poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    crypto.randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}

// ../../node_modules/uuid/dist/esm-node/regex.js
var regex_default = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;

// ../../node_modules/uuid/dist/esm-node/validate.js
function validate(uuid) {
  return typeof uuid === "string" && regex_default.test(uuid);
}
var validate_default = validate;

// ../../node_modules/uuid/dist/esm-node/stringify.js
var byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).substr(1));
}
function stringify(arr, offset = 0) {
  const uuid = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
  if (!validate_default(uuid)) {
    throw TypeError("Stringified UUID is invalid");
  }
  return uuid;
}
var stringify_default = stringify;

// ../../node_modules/uuid/dist/esm-node/v4.js
function v4(options, buf, offset) {
  options = options || {};
  const rnds = options.random || (options.rng || rng)();
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  if (buf) {
    offset = offset || 0;
    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }
    return buf;
  }
  return stringify_default(rnds);
}
var v4_default = v4;

// src/services/teeLogManager.ts
var TeeLogManager = class {
  teeLogDAO;
  teeType;
  teeMode;
  // Only used for plugin-tee with TDX dstack
  // Map of agentId to its key pair
  // These keypairs only store in memory.
  // When the agent restarts, we will generate new keypair.
  keyPairs = /* @__PURE__ */ new Map();
  constructor(teeLogDAO, teeType, teeMode) {
    this.teeLogDAO = teeLogDAO;
    this.teeType = teeType;
    this.teeMode = teeMode;
  }
  async registerAgent(agentId, agentName) {
    if (!agentId) {
      throw new Error("Agent ID is required");
    }
    const keyPair = this.generateKeyPair();
    this.keyPairs.set(agentId, keyPair);
    const publicKey = keyPair.getPublic().encode("hex", true);
    const attestation = await this.generateAttestation(publicKey);
    const new_agent = {
      id: v4_default(),
      agentId,
      agentName: agentName || "",
      createdAt: (/* @__PURE__ */ new Date()).getTime(),
      publicKey,
      attestation
    };
    console.log("registerAgent new_agent", new_agent);
    return this.teeLogDAO.addAgent(new_agent);
  }
  async getAllAgents() {
    return this.teeLogDAO.getAllAgents();
  }
  async getAgent(agentId) {
    return this.teeLogDAO.getAgent(agentId);
  }
  async log(agentId, roomId, userId, type, content) {
    const keyPair = this.keyPairs.get(agentId);
    if (!keyPair) {
      throw new Error(`Agent ${agentId} not found`);
    }
    const timestamp = (/* @__PURE__ */ new Date()).getTime();
    const messageToSign = `${agentId}|${roomId}|${userId}|${type}|${content}|${timestamp}`;
    const signature = "0x" + keyPair.sign(messageToSign).toDER("hex");
    return this.teeLogDAO.addLog({
      id: v4_default(),
      agentId,
      roomId,
      userId,
      type,
      content,
      timestamp,
      signature
    });
  }
  async getLogs(query, page, pageSize) {
    return this.teeLogDAO.getPagedLogs(query, page, pageSize);
  }
  generateKeyPair() {
    const ec = new elliptic.ec("secp256k1");
    const key = ec.genKeyPair();
    return key;
  }
  async generateAttestation(userReport) {
    if (this.teeType === "sgx_gramine" /* SGX_GRAMINE */) {
      const sgxAttestationProvider = new SgxAttestationProvider();
      const sgxAttestation = await sgxAttestationProvider.generateAttestation(userReport);
      return JSON.stringify(sgxAttestation);
    } else if (this.teeType === "tdx_dstack" /* TDX_DSTACK */) {
      const tdxAttestationProvider = new TdxAttestationProvider(this.teeMode);
      const tdxAttestation = await tdxAttestationProvider.generateAttestation(userReport);
      return JSON.stringify(tdxAttestation);
    } else {
      throw new Error("Invalid TEE type");
    }
  }
};

// src/services/teeLogService.ts
import Database from "better-sqlite3";
import path from "path";
var TeeLogService = class extends Service {
  dbPath;
  initialized = false;
  enableTeeLog = false;
  teeType;
  teeMode = TEEMode.OFF;
  // Only used for plugin-tee with TDX dstack
  teeLogDAO;
  teeLogManager;
  getInstance() {
    return this;
  }
  static get serviceType() {
    return ServiceType.TEE_LOG;
  }
  async initialize(runtime) {
    if (this.initialized) {
      return;
    }
    const enableValues = ["true", "1", "yes", "enable", "enabled", "on"];
    const enableTeeLog = runtime.getSetting("ENABLE_TEE_LOG");
    if (enableTeeLog === null) {
      throw new Error("ENABLE_TEE_LOG is not set.");
    }
    this.enableTeeLog = enableValues.includes(enableTeeLog.toLowerCase());
    if (!this.enableTeeLog) {
      console.log("TEE log is not enabled.");
      return;
    }
    const runInSgx = runtime.getSetting("SGX");
    const teeMode = runtime.getSetting("TEE_MODE");
    const walletSecretSalt = runtime.getSetting("WALLET_SECRET_SALT");
    this.teeMode = teeMode ? TEEMode[teeMode] : TEEMode.OFF;
    const useSgxGramine = runInSgx && enableValues.includes(runInSgx.toLowerCase());
    const useTdxDstack = teeMode && teeMode !== TEEMode.OFF && walletSecretSalt;
    if (useSgxGramine && useTdxDstack) {
      throw new Error("Cannot configure both SGX and TDX at the same time.");
    } else if (useSgxGramine) {
      this.teeType = "sgx_gramine" /* SGX_GRAMINE */;
    } else if (useTdxDstack) {
      this.teeType = "tdx_dstack" /* TDX_DSTACK */;
    } else {
      throw new Error("Invalid TEE configuration.");
    }
    const dbPathSetting = runtime.getSetting("TEE_LOG_DB_PATH");
    this.dbPath = dbPathSetting || path.resolve("data/tee_log.sqlite");
    const db = new Database(this.dbPath);
    this.teeLogDAO = new SqliteTeeLogDAO(db);
    await this.teeLogDAO.initialize();
    this.teeLogManager = new TeeLogManager(this.teeLogDAO, this.teeType, this.teeMode);
    const isRegistered = await this.teeLogManager.registerAgent(
      runtime?.agentId,
      runtime?.character?.name
    );
    if (!isRegistered) {
      throw new Error(`Failed to register agent ${runtime.agentId}`);
    }
    this.initialized = true;
  }
  async log(agentId, roomId, userId, type, content) {
    if (!this.enableTeeLog) {
      return false;
    }
    return this.teeLogManager.log(agentId, roomId, userId, type, content);
  }
  async getAllAgents() {
    if (!this.enableTeeLog) {
      return [];
    }
    return this.teeLogManager.getAllAgents();
  }
  async getAgent(agentId) {
    if (!this.enableTeeLog) {
      return void 0;
    }
    return this.teeLogManager.getAgent(agentId);
  }
  async getLogs(query, page, pageSize) {
    if (!this.enableTeeLog) {
      return {
        data: [],
        total: 0,
        page,
        pageSize
      };
    }
    return this.teeLogManager.getLogs(query, page, pageSize);
  }
  async generateAttestation(userReport) {
    return this.teeLogManager.generateAttestation(userReport);
  }
};

// src/plugins/teeLogPlugin.ts
var teeLogPlugin = {
  name: "TEE-log",
  description: "Support verifiable logging for eliza running in TEE",
  actions: [],
  providers: [],
  evaluators: [],
  services: [new TeeLogService()],
  clients: []
};

// src/index.ts
var index_default = teeLogPlugin;
export {
  TeeLogDAO,
  TeeLogService,
  TeeType,
  index_default as default,
  teeLogPlugin
};
//# sourceMappingURL=index.js.map