var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/services/AnyoneClientService.ts
import { Anon } from "@anyone-protocol/anyone-client";
var AnyoneClientService = class {
  static instance = null;
  static getInstance() {
    return this.instance;
  }
  static async initialize() {
    if (!this.instance) {
      this.instance = new Anon({
        displayLog: true,
        socksPort: 9050,
        autoTermsAgreement: true
      });
      await this.instance.start();
    }
  }
  static async stop() {
    if (this.instance) {
      await this.instance.stop();
      this.instance = null;
    }
  }
};

// src/services/AnyoneProxyService.ts
import { AnonSocksClient } from "@anyone-protocol/anyone-client";
import axios from "axios";
var AnyoneProxyService = class _AnyoneProxyService {
  static instance = null;
  sockClient = null;
  originalAxios = null;
  originalDefaults = null;
  static getInstance() {
    if (!_AnyoneProxyService.instance) {
      _AnyoneProxyService.instance = new _AnyoneProxyService();
    }
    return _AnyoneProxyService.instance;
  }
  async initialize() {
    await AnyoneClientService.initialize();
    const anon = AnyoneClientService.getInstance();
    if (!anon) {
      throw new Error("Anyone client not initialized");
    }
    this.sockClient = new AnonSocksClient(anon);
    this.originalDefaults = { ...axios.defaults };
    this.originalAxios = {
      request: axios.request,
      get: axios.get,
      post: axios.post,
      put: axios.put,
      delete: axios.delete,
      patch: axios.patch
    };
    axios.defaults = {
      ...axios.defaults,
      ...this.sockClient.axios.defaults
    };
    axios.request = this.sockClient.axios.request.bind(
      this.sockClient.axios
    );
    axios.get = this.sockClient.axios.get.bind(this.sockClient.axios);
    axios.post = this.sockClient.axios.post.bind(this.sockClient.axios);
    axios.put = this.sockClient.axios.put.bind(this.sockClient.axios);
    axios.delete = this.sockClient.axios.delete.bind(this.sockClient.axios);
    axios.patch = this.sockClient.axios.patch.bind(this.sockClient.axios);
  }
  cleanup() {
    if (this.originalAxios && this.originalDefaults) {
      axios.defaults = { ...this.originalDefaults };
      axios.request = this.originalAxios.request.bind(axios);
      axios.get = this.originalAxios.get.bind(axios);
      axios.post = this.originalAxios.post.bind(axios);
      axios.put = this.originalAxios.put.bind(axios);
      axios.delete = this.originalAxios.delete.bind(axios);
      axios.patch = this.originalAxios.patch.bind(axios);
      this.originalAxios = null;
      this.originalDefaults = null;
    }
    _AnyoneProxyService.instance = null;
  }
};

// src/actions/startAnyone.ts
var startAnyone = {
  name: "START_ANYONE",
  similes: ["ANYONE"],
  validate: async (_runtime, _message) => {
    return true;
  },
  description: "Start the Anyone client and proxy service",
  handler: async (_runtime, _message, _state, _options, _callback) => {
    await AnyoneClientService.initialize();
    const proxyService = AnyoneProxyService.getInstance();
    await proxyService.initialize();
    _callback({
      text: "Started Anyone"
    });
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Can you start Anyone for me?" }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'll start Anyone right away",
          action: "START_ANYONE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Initialize the Anyone client please" }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Starting Anyone now",
          action: "START_ANYONE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "I need to start using Anyone" }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'll help you start Anyone",
          action: "START_ANYONE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Launch Anyone for me" }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'll launch Anyone for you now",
          action: "START_ANYONE"
        }
      }
    ]
  ]
};

// src/actions/stopAnyone.ts
var stopAnyone = {
  name: "STOP_ANYONE",
  similes: ["STOP_PROXY"],
  validate: async (_runtime, _message) => {
    return true;
  },
  description: "Stop the Anyone client and proxy service",
  handler: async (_runtime, _message, _state, _options, _callback) => {
    const proxyService = AnyoneProxyService.getInstance();
    proxyService.cleanup();
    await AnyoneClientService.stop();
    _callback({
      text: "Stopped Anyone and cleaned up proxy"
    });
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Can you stop Anyone for me?" }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'll stop Anyone right away",
          action: "STOP_ANYONE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Please shut down Anyone" }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Stopping Anyone now",
          action: "STOP_ANYONE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "I need to stop using Anyone" }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'll help you stop Anyone",
          action: "STOP_ANYONE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Close Anyone for me" }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'll close Anyone for you now",
          action: "STOP_ANYONE"
        }
      }
    ]
  ]
};

// src/actions/index.ts
var actions_exports = {};
__export(actions_exports, {
  startAnyone: () => startAnyone,
  stopAnyone: () => stopAnyone
});

// src/index.ts
var anyonePlugin = {
  name: "anyone",
  description: "Proxy requests through Anyone",
  actions: [startAnyone, stopAnyone]
};
export {
  actions_exports as actions,
  anyonePlugin
};
//# sourceMappingURL=index.js.map