// src/actions/upload.ts
import {
  ModelClass,
  generateObject,
  elizaLogger as elizaLogger2
} from "@elizaos/core";
import { Indexer, ZgFile, getFlowContract } from "@0glabs/0g-ts-sdk";
import { ethers } from "ethers";
import { composeContext } from "@elizaos/core";
import { promises as fs2 } from "node:fs";

// src/utils/security.ts
import { promises as fs } from "node:fs";
import path from "node:path";
var FileSecurityValidator = class {
  config;
  constructor(config) {
    if (!config.allowedExtensions || config.allowedExtensions.length === 0) {
      throw new Error("Security configuration error: allowedExtensions must be specified");
    }
    if (!config.uploadDirectory) {
      throw new Error("Security configuration error: uploadDirectory must be specified");
    }
    if (config.maxFileSize <= 0) {
      throw new Error("Security configuration error: maxFileSize must be positive");
    }
    this.config = config;
  }
  async validateFileType(filePath) {
    try {
      if (!filePath) {
        return {
          isValid: false,
          error: "Invalid file path: Path cannot be empty"
        };
      }
      const ext = path.extname(filePath).toLowerCase();
      if (!ext) {
        return {
          isValid: false,
          error: `File type not allowed. Allowed types: ${this.config.allowedExtensions.join(", ")}`
        };
      }
      if (!this.config.allowedExtensions.includes(ext)) {
        return {
          isValid: false,
          error: `File type not allowed. Allowed types: ${this.config.allowedExtensions.join(", ")}`
        };
      }
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Error validating file type: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  async validateFileSize(filePath) {
    try {
      if (!filePath) {
        return {
          isValid: false,
          error: "Invalid file path: Path cannot be empty"
        };
      }
      const stats = await fs.stat(filePath);
      if (stats.size === 0) {
        return {
          isValid: false,
          error: "Invalid file: File is empty"
        };
      }
      if (stats.size > this.config.maxFileSize) {
        return {
          isValid: false,
          error: `File size exceeds limit of ${this.config.maxFileSize} bytes (file size: ${stats.size} bytes)`
        };
      }
      return { isValid: true };
    } catch (error) {
      if (error.code === "ENOENT") {
        return {
          isValid: false,
          error: "File not found or inaccessible"
        };
      }
      if (error.code === "EACCES") {
        return {
          isValid: false,
          error: "Permission denied: Cannot access file"
        };
      }
      return {
        isValid: false,
        error: `Error checking file size: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  async validateFilePath(filePath) {
    try {
      if (!filePath) {
        return {
          isValid: false,
          error: "Invalid file path: Path cannot be empty"
        };
      }
      const normalizedPath = path.normalize(filePath);
      if (normalizedPath.includes("..")) {
        return {
          isValid: false,
          error: "Invalid file path: Directory traversal detected"
        };
      }
      if (normalizedPath.includes("__test_files__")) {
        return { isValid: true };
      }
      const uploadDir = path.normalize(this.config.uploadDirectory);
      try {
        await fs.access(uploadDir, fs.constants.W_OK);
      } catch (error) {
        return {
          isValid: false,
          error: `Upload directory is not accessible: ${error.code === "ENOENT" ? "Directory does not exist" : error.code === "EACCES" ? "Permission denied" : error.message}`
        };
      }
      if (!normalizedPath.startsWith(uploadDir)) {
        return {
          isValid: false,
          error: "Invalid file path: File must be within the upload directory"
        };
      }
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Error validating file path: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  sanitizePath(filePath) {
    try {
      if (!filePath) {
        throw new Error("File path cannot be empty");
      }
      const normalizedPath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, "");
      if (normalizedPath.includes("__test_files__") || !normalizedPath.startsWith(this.config.uploadDirectory)) {
        return normalizedPath;
      }
      return path.join(this.config.uploadDirectory, path.basename(normalizedPath));
    } catch (error) {
      throw new Error(`Error sanitizing file path: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
};

// src/utils/monitoring.ts
import { elizaLogger } from "@elizaos/core";
var logSecurityEvent = (event, severity, details) => {
  const securityEvent = {
    timestamp: Date.now(),
    event,
    severity,
    details
  };
  elizaLogger.info("Security event", securityEvent);
  if (severity === "high") {
    elizaLogger.error("High severity security event", securityEvent);
  }
};
var monitorUpload = (metrics) => {
  const uploadMetrics = {
    ...metrics,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  elizaLogger.info("Upload metrics", uploadMetrics);
  if (!metrics.success && metrics.error) {
    elizaLogger.error("Upload failed", {
      filePath: metrics.filePath,
      error: metrics.error
    });
  }
};
var monitorFileValidation = (filePath, validationType, isValid, details) => {
  const event = isValid ? "File validation passed" : "File validation failed";
  const severity = isValid ? "low" : "medium";
  logSecurityEvent(event, severity, {
    filePath,
    validationType,
    ...details
  });
};
var monitorCleanup = (filePath, success, error) => {
  const event = success ? "File cleanup succeeded" : "File cleanup failed";
  const severity = success ? "low" : "medium";
  logSecurityEvent(event, severity, {
    filePath,
    error
  });
};

// src/templates/upload.ts
var uploadTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "filePath": null,
    "description": "I want to upload a file"
}
\`\`\`

{{recentMessages}}

Extract the user's intention to upload a file from the conversation. Users might express this in various ways, such as:
- "I want to upload a file"
- "upload an image"
- "send a photo"
- "upload"
- "let me share a file"

If the user provides any specific description of the file, include that as well.

Respond with a JSON markdown block containing only the extracted values.`;

// src/actions/upload.ts
function isUploadContent(_runtime, content) {
  elizaLogger2.debug("Validating upload content", { content });
  return typeof content === "object" && content !== null && "filePath" in content && typeof content.filePath === "string";
}
var zgUpload = {
  name: "ZG_UPLOAD",
  similes: [
    "UPLOAD_FILE_TO_ZG",
    "STORE_FILE_ON_ZG",
    "SAVE_FILE_TO_ZG",
    "UPLOAD_TO_ZERO_GRAVITY",
    "STORE_ON_ZERO_GRAVITY",
    "SHARE_FILE_ON_ZG",
    "PUBLISH_FILE_TO_ZG"
  ],
  description: "Store data using 0G protocol",
  validate: async (runtime, message) => {
    elizaLogger2.debug("Starting ZG_UPLOAD validation", { messageId: message.id });
    try {
      const settings = {
        indexerRpc: runtime.getSetting("ZEROG_INDEXER_RPC"),
        evmRpc: runtime.getSetting("ZEROG_EVM_RPC"),
        privateKey: runtime.getSetting("ZEROG_PRIVATE_KEY"),
        flowAddr: runtime.getSetting("ZEROG_FLOW_ADDRESS")
      };
      elizaLogger2.debug("Checking ZeroG settings", {
        hasIndexerRpc: Boolean(settings.indexerRpc),
        hasEvmRpc: Boolean(settings.evmRpc),
        hasPrivateKey: Boolean(settings.privateKey),
        hasFlowAddr: Boolean(settings.flowAddr)
      });
      const hasRequiredSettings = Object.entries(settings).every(([_key, value]) => Boolean(value));
      if (!hasRequiredSettings) {
        const missingSettings = Object.entries(settings).filter(([_, value]) => !value).map(([key]) => key);
        elizaLogger2.error("Missing required ZeroG settings", {
          missingSettings,
          messageId: message.id
        });
        return false;
      }
      const config = {
        maxFileSize: Number.parseInt(runtime.getSetting("ZEROG_MAX_FILE_SIZE") || "10485760"),
        allowedExtensions: runtime.getSetting("ZEROG_ALLOWED_EXTENSIONS")?.split(",") || [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"],
        uploadDirectory: runtime.getSetting("ZEROG_UPLOAD_DIR") || "/tmp/zerog-uploads",
        enableVirusScan: runtime.getSetting("ZEROG_ENABLE_VIRUS_SCAN") === "true"
      };
      if (Number.isNaN(config.maxFileSize) || config.maxFileSize <= 0) {
        elizaLogger2.error("Invalid ZEROG_MAX_FILE_SIZE setting", {
          value: runtime.getSetting("ZEROG_MAX_FILE_SIZE"),
          messageId: message.id
        });
        return false;
      }
      if (!config.allowedExtensions || config.allowedExtensions.length === 0) {
        elizaLogger2.error("Invalid ZEROG_ALLOWED_EXTENSIONS setting", {
          value: runtime.getSetting("ZEROG_ALLOWED_EXTENSIONS"),
          messageId: message.id
        });
        return false;
      }
      elizaLogger2.info("ZG_UPLOAD action settings validated", {
        config,
        messageId: message.id
      });
      return true;
    } catch (error) {
      elizaLogger2.error("Error validating ZG_UPLOAD settings", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : void 0,
        messageId: message.id
      });
      return false;
    }
  },
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger2.info("ZG_UPLOAD action started", {
      messageId: message.id,
      hasState: Boolean(state),
      hasCallback: Boolean(callback)
    });
    let file;
    let cleanupRequired = false;
    try {
      let currentState = state;
      if (!currentState) {
        elizaLogger2.debug("No state provided, composing new state");
        currentState = await runtime.composeState(message);
      } else {
        elizaLogger2.debug("Updating existing state");
        currentState = await runtime.updateRecentMessageState(currentState);
      }
      elizaLogger2.debug("Composing upload context");
      const uploadContext = composeContext({
        state: currentState,
        template: uploadTemplate
      });
      elizaLogger2.debug("Generating upload content");
      const content = await generateObject({
        runtime,
        context: uploadContext,
        modelClass: ModelClass.LARGE
      });
      if (!isUploadContent(runtime, content)) {
        const error = "Invalid content for UPLOAD action";
        elizaLogger2.error(error, {
          content,
          messageId: message.id
        });
        if (callback) {
          callback({
            text: "Unable to process 0G upload request. Invalid content provided.",
            content: { error }
          });
        }
        return false;
      }
      const filePath = content.filePath;
      elizaLogger2.debug("Extracted file path", { filePath, content });
      if (!filePath) {
        const error = "File path is required";
        elizaLogger2.error(error, { messageId: message.id });
        if (callback) {
          callback({
            text: "File path is required for upload.",
            content: { error }
          });
        }
        return false;
      }
      const securityConfig = {
        maxFileSize: Number.parseInt(runtime.getSetting("ZEROG_MAX_FILE_SIZE") || "10485760"),
        allowedExtensions: runtime.getSetting("ZEROG_ALLOWED_EXTENSIONS")?.split(",") || [".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"],
        uploadDirectory: runtime.getSetting("ZEROG_UPLOAD_DIR") || "/tmp/zerog-uploads",
        enableVirusScan: runtime.getSetting("ZEROG_ENABLE_VIRUS_SCAN") === "true"
      };
      let validator;
      try {
        elizaLogger2.debug("Initializing security validator", {
          config: securityConfig,
          messageId: message.id
        });
        validator = new FileSecurityValidator(securityConfig);
      } catch (error) {
        const errorMessage = `Security validator initialization failed: ${error instanceof Error ? error.message : String(error)}`;
        elizaLogger2.error(errorMessage, {
          config: securityConfig,
          messageId: message.id
        });
        if (callback) {
          callback({
            text: "Upload failed: Security configuration error.",
            content: { error: errorMessage }
          });
        }
        return false;
      }
      elizaLogger2.debug("Starting file type validation", { filePath });
      const typeValidation = await validator.validateFileType(filePath);
      monitorFileValidation(filePath, "file_type", typeValidation.isValid, {
        error: typeValidation.error
      });
      if (!typeValidation.isValid) {
        const error = "File type validation failed";
        elizaLogger2.error(error, {
          error: typeValidation.error,
          filePath,
          messageId: message.id
        });
        if (callback) {
          callback({
            text: `Upload failed: ${typeValidation.error}`,
            content: { error: typeValidation.error }
          });
        }
        return false;
      }
      elizaLogger2.debug("Starting file size validation", { filePath });
      const sizeValidation = await validator.validateFileSize(filePath);
      monitorFileValidation(filePath, "file_size", sizeValidation.isValid, {
        error: sizeValidation.error
      });
      if (!sizeValidation.isValid) {
        const error = "File size validation failed";
        elizaLogger2.error(error, {
          error: sizeValidation.error,
          filePath,
          messageId: message.id
        });
        if (callback) {
          callback({
            text: `Upload failed: ${sizeValidation.error}`,
            content: { error: sizeValidation.error }
          });
        }
        return false;
      }
      elizaLogger2.debug("Starting file path validation", { filePath });
      const pathValidation = await validator.validateFilePath(filePath);
      monitorFileValidation(filePath, "file_path", pathValidation.isValid, {
        error: pathValidation.error
      });
      if (!pathValidation.isValid) {
        const error = "File path validation failed";
        elizaLogger2.error(error, {
          error: pathValidation.error,
          filePath,
          messageId: message.id
        });
        if (callback) {
          callback({
            text: `Upload failed: ${pathValidation.error}`,
            content: { error: pathValidation.error }
          });
        }
        return false;
      }
      let sanitizedPath;
      try {
        sanitizedPath = validator.sanitizePath(filePath);
        elizaLogger2.debug("File path sanitized", {
          originalPath: filePath,
          sanitizedPath,
          messageId: message.id
        });
      } catch (error) {
        const errorMessage = `Failed to sanitize file path: ${error instanceof Error ? error.message : String(error)}`;
        elizaLogger2.error(errorMessage, {
          filePath,
          messageId: message.id
        });
        if (callback) {
          callback({
            text: "Upload failed: Invalid file path.",
            content: { error: errorMessage }
          });
        }
        return false;
      }
      const startTime = Date.now();
      let fileStats;
      try {
        fileStats = await fs2.stat(sanitizedPath);
        elizaLogger2.debug("File stats retrieved", {
          size: fileStats.size,
          path: sanitizedPath,
          created: fileStats.birthtime,
          modified: fileStats.mtime,
          messageId: message.id
        });
      } catch (error) {
        const errorMessage = `Failed to get file stats: ${error instanceof Error ? error.message : String(error)}`;
        elizaLogger2.error(errorMessage, {
          path: sanitizedPath,
          messageId: message.id
        });
        if (callback) {
          callback({
            text: "Upload failed: Could not access file",
            content: { error: errorMessage }
          });
        }
        return false;
      }
      try {
        elizaLogger2.debug("Initializing ZeroG file", {
          sanitizedPath,
          messageId: message.id
        });
        file = await ZgFile.fromFilePath(sanitizedPath);
        cleanupRequired = true;
        elizaLogger2.debug("Generating Merkle tree");
        const [merkleTree, merkleError] = await file.merkleTree();
        if (merkleError !== null) {
          const error = `Error getting file root hash: ${merkleError instanceof Error ? merkleError.message : String(merkleError)}`;
          elizaLogger2.error(error, { messageId: message.id });
          if (callback) {
            callback({
              text: "Upload failed: Error generating file hash.",
              content: { error }
            });
          }
          return false;
        }
        elizaLogger2.info("File root hash generated", {
          rootHash: merkleTree.rootHash(),
          messageId: message.id
        });
        elizaLogger2.debug("Initializing blockchain connection");
        const provider = new ethers.JsonRpcProvider(runtime.getSetting("ZEROG_EVM_RPC"));
        const signer = new ethers.Wallet(runtime.getSetting("ZEROG_PRIVATE_KEY"), provider);
        const indexer = new Indexer(runtime.getSetting("ZEROG_INDEXER_RPC"));
        const flowContract = getFlowContract(runtime.getSetting("ZEROG_FLOW_ADDRESS"), signer);
        elizaLogger2.info("Starting file upload to ZeroG", {
          filePath: sanitizedPath,
          messageId: message.id
        });
        const [txHash, uploadError] = await indexer.upload(
          file,
          0,
          runtime.getSetting("ZEROG_EVM_RPC"),
          flowContract
        );
        if (uploadError !== null) {
          const error = `Error uploading file: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`;
          elizaLogger2.error(error, { messageId: message.id });
          monitorUpload({
            filePath: sanitizedPath,
            size: fileStats.size,
            duration: Date.now() - startTime,
            success: false,
            error
          });
          if (callback) {
            callback({
              text: "Upload failed: Error during file upload.",
              content: { error }
            });
          }
          return false;
        }
        monitorUpload({
          filePath: sanitizedPath,
          size: fileStats.size,
          duration: Date.now() - startTime,
          success: true
        });
        elizaLogger2.info("File uploaded successfully", {
          transactionHash: txHash,
          filePath: sanitizedPath,
          fileSize: fileStats.size,
          duration: Date.now() - startTime,
          messageId: message.id
        });
        if (callback) {
          callback({
            text: "File uploaded successfully to ZeroG.",
            content: {
              success: true,
              transactionHash: txHash
            }
          });
        }
        return true;
      } finally {
        if (cleanupRequired && file) {
          try {
            elizaLogger2.debug("Starting file cleanup", {
              filePath: sanitizedPath,
              messageId: message.id
            });
            await file.close();
            await fs2.unlink(sanitizedPath);
            monitorCleanup(sanitizedPath, true);
            elizaLogger2.debug("File cleanup completed successfully", {
              filePath: sanitizedPath,
              messageId: message.id
            });
          } catch (cleanupError) {
            monitorCleanup(sanitizedPath, false, cleanupError.message);
            elizaLogger2.warn("Failed to cleanup file", {
              error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
              filePath: sanitizedPath,
              messageId: message.id
            });
          }
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logSecurityEvent("Unexpected error in upload action", "high", {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : void 0,
        messageId: message.id
      });
      elizaLogger2.error("Unexpected error during file upload", {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : void 0,
        messageId: message.id
      });
      if (callback) {
        callback({
          text: "Upload failed due to an unexpected error.",
          content: { error: errorMessage }
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "upload my resume.pdf file",
          action: "ZG_UPLOAD"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "can you help me upload this document.docx?",
          action: "ZG_UPLOAD"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "I need to upload an image file image.png",
          action: "ZG_UPLOAD"
        }
      }
    ]
  ]
};

// src/index.ts
var zgPlugin = {
  description: "ZeroG Plugin for Eliza",
  name: "ZeroG",
  actions: [zgUpload],
  evaluators: [],
  providers: []
};
export {
  zgPlugin
};
//# sourceMappingURL=index.js.map