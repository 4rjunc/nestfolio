// src/index.ts
import { Service, ServiceType } from "@elizaos/core";

// src/providers/verifiableLogProvider.ts
import { elizaLogger } from "@elizaos/core";
import {
  DeriveKeyProvider,
  RemoteAttestationProvider
} from "@elizaos/plugin-tee";
var VerifiableLogProvider = class {
  dao;
  keyPath = "/keys/verifiable_key";
  remoteAttestationProvider;
  provider;
  constructor(dao, teeMode) {
    this.dao = dao;
    this.remoteAttestationProvider = new RemoteAttestationProvider(teeMode);
    this.provider = new DeriveKeyProvider(teeMode);
  }
  async log(params, subject) {
    let singed = "";
    try {
      const evmKeypair = await this.provider.deriveEcdsaKeypair(
        this.keyPath,
        subject,
        params.agentId
      );
      const signature = await evmKeypair.keypair.signMessage({
        message: params.content
      });
      singed = signature.toString();
    } catch (error) {
      elizaLogger.error("EVM key derivation failed:", error);
      return false;
    }
    return this.dao.addLog({
      agent_id: params.agentId,
      room_id: params.roomId,
      user_id: params.userId,
      type: params.type,
      content: params.content,
      signature: singed
    });
  }
  async registerAgent(params, subject) {
    if (params.agentId === void 0) {
      throw new Error("agentId is required");
    }
    const agent = await this.dao.getAgent(params.agentId);
    if (agent !== null) {
      return true;
    }
    const evmKeypair = await this.provider.deriveEcdsaKeypair(
      this.keyPath,
      subject,
      params.agentId
    );
    const publicKey = evmKeypair.keypair.publicKey;
    return this.dao.addAgent({
      agent_id: params.agentId,
      agent_name: params.agentName,
      agent_keypair_path: this.keyPath,
      agent_keypair_vlog_pk: publicKey
    });
  }
  async generateAttestation(params) {
    if (params.agentId === void 0 || params.publicKey === void 0) {
      throw new Error("agentId and publicKey are required");
    }
    try {
      const reportData = JSON.stringify(params);
      const quote = await this.remoteAttestationProvider.generateAttestation(reportData);
      return JSON.stringify(quote);
    } catch (error) {
      elizaLogger.error("Failed to generate attestation quote:", error);
      throw error;
    }
  }
};

// src/adapters/sqliteVerifiableDAO.ts
import { v4 as uuidv4 } from "uuid";

// src/types/logTypes.ts
var VerifiableDAO = class {
  constructor() {
  }
  /**
   * The database instance.
   */
  db;
};

// src/adapters/sqliteVerifiableDAO.ts
var SQLite3VerifiableDAO = class extends VerifiableDAO {
  constructor(db) {
    super();
    this.db = db;
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('verifiable-logs', 'verifiable-agents');"
    ).all();
    if (tables.length !== 2) {
      this.initializeSchema();
    }
  }
  async initializeSchema() {
    this.db.exec(`
            CREATE TABLE IF NOT EXISTS "tee_verifiable_logs"
            (
                "id"         TEXT PRIMARY KEY,
                "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "agent_id"   TEXT NOT NULL,
                "room_id"    TEXT NOT NULL,
                "user_id"    TEXT,
                "type"       TEXT,
                "content"    TEXT NOT NULL,
                "signature"  TEXT NOT NULL
            );
        `);
    this.db.exec(`
            CREATE TABLE IF NOT EXISTS "tee_verifiable_agents"
            (
                "id"                    TEXT PRIMARY KEY,
                "created_at"            TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                "agent_id"              TEXT NOT NULL,
                "agent_name"            TEXT,
                "agent_keypair_path"    TEXT NOT NULL,
                "agent_keypair_vlog_pk" TEXT NOT NULL,
                UNIQUE ("agent_id")
            );
        `);
  }
  async addLog(log) {
    const sql = `
            INSERT INTO "tee_verifiable_logs" ("id", "created_at", "agent_id", "room_id", "user_id", "type", "content",
                                           "signature")
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        `;
    try {
      this.db.prepare(sql).run(
        log.id || uuidv4(),
        log.created_at || (/* @__PURE__ */ new Date()).getTime(),
        log.agent_id,
        log.room_id,
        log.user_id,
        log.type,
        log.content,
        log.signature
      );
      return true;
    } catch (error) {
      console.error("SQLite3 Error adding log:", error);
      return false;
    }
  }
  async pageQueryLogs(query, page, pageSize) {
    const conditions = [];
    const params = [];
    if (query.idEq) {
      conditions.push("id = ?");
      params.push(query.idEq);
    }
    if (query.agentIdEq) {
      conditions.push("agent_id = ?");
      params.push(query.agentIdEq);
    }
    if (query.roomIdEq) {
      conditions.push("room_id = ?");
      params.push(query.roomIdEq);
    }
    if (query.userIdEq) {
      conditions.push("user_id = ?");
      params.push(query.userIdEq);
    }
    if (query.typeEq) {
      conditions.push("type = ?");
      params.push(query.typeEq);
    }
    if (query.contLike) {
      conditions.push("content LIKE ?");
      params.push(`%${query.contLike}%`);
    }
    if (query.signatureEq) {
      conditions.push("signature = ?");
      params.push(query.signatureEq);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    let currentPage = page;
    if (currentPage < 1) {
      currentPage = 1;
    }
    const offset = (currentPage - 1) * pageSize;
    const limit = pageSize;
    try {
      const totalQuery = `SELECT COUNT(*) AS total
                                FROM tee_verifiable_logs ${whereClause}`;
      const stmt = this.db.prepare(totalQuery);
      const totalResult = stmt.get(params);
      const total = totalResult.total;
      const dataQuery = `
                SELECT *
                FROM tee_verifiable_logs ${whereClause}
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
            `;
      const dataResult = this.db.prepare(dataQuery).all(...params, limit, offset);
      return {
        page,
        pageSize,
        total,
        data: dataResult
      };
    } catch (error) {
      console.error("Error querying tee_verifiable_logs:", error);
      throw error;
    }
  }
  async addAgent(agent) {
    const sql = `
            INSERT INTO "tee_verifiable_agents" ("id", "created_at", "agent_id","agent_name","agent_keypair_path", "agent_keypair_vlog_pk")
            VALUES (?, ?, ?, ?, ?,?);
        `;
    try {
      this.db.prepare(sql).run(
        agent.id || uuidv4(),
        agent.created_at || (/* @__PURE__ */ new Date()).getTime(),
        agent.agent_id,
        agent.agent_name || "agent bot",
        agent.agent_keypair_path,
        agent.agent_keypair_vlog_pk
      );
      return true;
    } catch (error) {
      console.error("SQLite3 Error adding agent:", error);
      return false;
    }
  }
  async getAgent(agentId) {
    const sql = `SELECT *
                     FROM "tee_verifiable_agents"
                     WHERE agent_id = ?`;
    try {
      const agent = this.db.prepare(sql).get(agentId);
      if (agent) {
        return agent;
      }
      return null;
    } catch (error) {
      console.error("SQLite3 Error getting agent:", error);
      throw error;
    }
  }
  async listAgent() {
    const sql = `SELECT *
                     FROM "tee_verifiable_agents"`;
    try {
      const agents = this.db.prepare(sql).all();
      return agents;
    } catch (error) {
      console.error("SQLite3 Error listing agent:", error);
      throw error;
    }
  }
};

// src/providers/dreriveProvider.ts
import { DeriveKeyProvider as DeriveKeyProvider2 } from "@elizaos/plugin-tee";
import * as crypto from "node:crypto";
var DeriveProvider = class {
  provider;
  constructor(teeModel) {
    this.provider = new DeriveKeyProvider2(teeModel);
  }
  async deriveKeyPair(params) {
    const keyPath = `/${params.agentId}/tee/keypair/${params.bizModel}`;
    const seed = await this.provider.rawDeriveKey(keyPath, params.agentId);
    const privateKey = crypto.createPrivateKey({
      key: seed.key,
      format: "pem"
    });
    const privateKeyDer = privateKey.export({
      format: "der",
      type: "pkcs8"
    });
    return crypto.createHash("sha256").update(privateKeyDer).digest();
  }
  async encryptAgentData(params, plainText) {
    try {
      const rawKey = await this.deriveKeyPair(params);
      const { ivHex, encrypted } = this.encrypt(plainText, rawKey);
      return {
        success: true,
        errorMsg: "",
        ivHex,
        encryptedData: encrypted
      };
    } catch (error) {
      return {
        success: true,
        errorMsg: `encryptAgentData failed: ${error}`,
        // Changed to template literal
        ivHex: "",
        encryptedData: ""
      };
    }
  }
  async decryptAgentData(params, ivHex, encryptedData) {
    try {
      const rawKey = await this.deriveKeyPair(params);
      const plainText = this.decrypt(encryptedData, ivHex, rawKey);
      return {
        success: true,
        errorMsg: "",
        plainText
      };
    } catch (error) {
      return {
        success: false,
        errorMsg: `decryptAgentData failed: ${error}`,
        // Changed to template literal
        plainText: ""
      };
    }
  }
  encrypt(text, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return { ivHex: iv.toString("hex"), encrypted };
  }
  decrypt(encryptedData, ivHex, key) {
    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      key,
      Buffer.from(ivHex, "hex")
    );
    let decrypted = decipher.update(encryptedData, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
};

// src/index.ts
var VerifiableLogService = class extends Service {
  getInstance() {
    return this;
  }
  static get serviceType() {
    return ServiceType.VERIFIABLE_LOGGING;
  }
  verifiableLogProvider;
  verifiableDAO;
  teeMode;
  vlogOpen = false;
  // Add abstract initialize method that must be implemented by derived classes
  async initialize(runtime) {
    if (runtime.databaseAdapter.db === null) {
      throw new Error("Database adapter is not initialized.");
    }
    if (runtime.getSetting("TEE_MODE") === null) {
      throw new Error("TEE_MODE is not set.");
    }
    if (runtime.getSetting("WALLET_SECRET_SALT") === null) {
      throw new Error("WALLET_SECRET_SALT is not set.");
    }
    this.teeMode = runtime.getSetting("TEE_MODE");
    const value = runtime.getSetting("VLOG");
    const truthyValues = ["yes", "true", "YES", "TRUE", "Yes", "True", "1"];
    this.vlogOpen = truthyValues.includes(value.toLowerCase());
    this.verifiableDAO = new SQLite3VerifiableDAO(
      runtime.databaseAdapter.db
    );
    this.verifiableLogProvider = new VerifiableLogProvider(
      this.verifiableDAO,
      this.teeMode
    );
    const isOK = await this.verifiableLogProvider.registerAgent(
      { agentId: runtime?.agentId, agentName: runtime?.character?.name },
      this.teeMode
    );
    if (!isOK) {
      throw new Error(`Failed to register agent.${runtime.agentId}`);
    }
    return;
  }
  async log(params) {
    if (this.vlogOpen) {
      return this.verifiableLogProvider.log(params, this.teeMode);
    }
    return false;
  }
  async generateAttestation(params) {
    if (this.vlogOpen) {
      return this.verifiableLogProvider.generateAttestation(
        params
      );
    }
    return "";
  }
  async listAgent() {
    return this.verifiableDAO.listAgent();
  }
  async pageQueryLogs(query, page, pageSize) {
    return this.verifiableDAO.pageQueryLogs(query, page, pageSize);
  }
};
var verifiableLogPlugin = {
  name: "TeeVerifiableLog",
  description: "While Eliza operates within the TEE, it uses a derived key pair to sign its actions, ensuring that these actions are definitively executed by Eliza. Third-party users can remotely verify Eliza's public key to validate these actions",
  actions: [],
  evaluators: [],
  providers: [],
  services: [new VerifiableLogService()]
};
export {
  DeriveProvider,
  VerifiableLogService,
  verifiableLogPlugin
};
//# sourceMappingURL=index.js.map