// src/index.ts
import { elizaLogger } from "@elizaos/core";
var AutoClient = class {
  interval;
  runtime;
  constructor(runtime) {
    this.runtime = runtime;
    this.interval = setInterval(
      async () => {
        elizaLogger.log("running auto client...");
      },
      60 * 60 * 1e3
    );
  }
};
var AutoClientInterface = {
  start: async (runtime) => {
    const client = new AutoClient(runtime);
    return client;
  },
  stop: async (_runtime) => {
    console.warn("Direct client does not support stopping yet");
  }
};
var index_default = AutoClientInterface;
export {
  AutoClient,
  AutoClientInterface,
  index_default as default
};
//# sourceMappingURL=index.js.map