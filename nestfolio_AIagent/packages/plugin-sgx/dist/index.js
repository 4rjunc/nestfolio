// src/providers/sgxAttestationProvider.ts
import { promises as fs } from "node:fs";
import { createHash } from "node:crypto";
function calculateSHA256(input) {
  const hash = createHash("sha256");
  hash.update(input);
  return hash.digest();
}
var SgxAttestationProvider = class {
  SGX_QUOTE_MAX_SIZE = 8192 * 4;
  SGX_TARGET_INFO_SIZE = 512;
  MY_TARGET_INFO_PATH = "/dev/attestation/my_target_info";
  TARGET_INFO_PATH = "/dev/attestation/target_info";
  USER_REPORT_DATA_PATH = "/dev/attestation/user_report_data";
  QUOTE_PATH = "/dev/attestation/quote";
  // Remove unnecessary constructor
  // constructor() {}
  async generateAttestation(reportData) {
    const rawUserReport = calculateSHA256(reportData);
    try {
      await fs.access(this.MY_TARGET_INFO_PATH);
      const quote = await this.generateQuoteByGramine(rawUserReport);
      const attestation = {
        quote,
        timestamp: Date.now()
      };
      return attestation;
    } catch (error) {
      console.error("Error generating SGX remote attestation:", error);
      throw new Error(
        `Failed to generate SGX Quote: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  async generateQuoteByGramine(rawUserReport) {
    if (rawUserReport.length > 64) {
      throw new Error("the length of rawUserReport exceeds 64 bytes");
    }
    const myTargetInfo = await fs.readFile(this.MY_TARGET_INFO_PATH);
    if (myTargetInfo.length !== this.SGX_TARGET_INFO_SIZE) {
      throw new Error("Invalid my_target_info length");
    }
    await fs.writeFile(this.TARGET_INFO_PATH, myTargetInfo);
    await fs.writeFile(this.USER_REPORT_DATA_PATH, rawUserReport);
    const quoteData = await fs.readFile(this.QUOTE_PATH);
    if (quoteData.length > this.SGX_QUOTE_MAX_SIZE) {
      throw new Error("Invalid quote length");
    }
    const realLen = quoteData.lastIndexOf(0);
    if (realLen === -1) {
      throw new Error("quote without EOF");
    }
    return `0x${quoteData.subarray(0, realLen + 1).toString("hex")}`;
  }
};
var sgxAttestationProvider = {
  get: async (runtime, _message, _state) => {
    const provider = new SgxAttestationProvider();
    const agentId = runtime.agentId;
    try {
      const attestation = await provider.generateAttestation(agentId);
      return `Your Agent's remote attestation is: ${JSON.stringify(attestation)}`;
    } catch (error) {
      console.error("Error in remote attestation provider:", error);
      throw new Error(
        `Failed to generate SGX Quote: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
};

// src/plugins/sgxPlugin.ts
var sgxPlugin = {
  name: "sgx",
  description: "Intel SGX plugin for Eliza, providing SGX attestation",
  actions: [],
  providers: [sgxAttestationProvider],
  evaluators: [],
  services: [],
  clients: []
};

// src/index.ts
var index_default = sgxPlugin;
export {
  SgxAttestationProvider,
  index_default as default,
  sgxAttestationProvider,
  sgxPlugin
};
//# sourceMappingURL=index.js.map