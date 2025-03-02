// src/actions/startSession.ts
import {
  elizaLogger as elizaLogger2
} from "@elizaos/core";

// src/providers/devinRequests.ts
import { elizaLogger } from "@elizaos/core";
import fetch from "node-fetch";
var API_BASE = "https://api.devin.ai/v1";
var MIN_REQUEST_INTERVAL = 1e3;
var MAX_RETRIES = 3;
var INITIAL_BACKOFF = 1e3;
var lastRequestTime = 0;
async function rateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
}
async function withRetry(fn, retries = MAX_RETRIES, backoff = INITIAL_BACKOFF) {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, backoff));
    return withRetry(fn, retries - 1, backoff * 2);
  }
}
async function createSession(runtime, prompt) {
  const API_KEY = runtime.getSetting("DEVIN_API_TOKEN");
  if (!API_KEY) {
    const error = new Error("No Devin API token found");
    error.status = 401;
    throw error;
  }
  await rateLimit();
  return withRetry(async () => {
    const response = await fetch(`${API_BASE}/sessions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt })
    });
    if (!response.ok) {
      const error = await response.text();
      elizaLogger.error("Failed to create Devin session:", error);
      throw new Error(`Failed to create session: ${error}`);
    }
    const data = await response.json();
    return data;
  });
}
async function getSessionDetails(runtime, sessionId) {
  const API_KEY = runtime.getSetting("DEVIN_API_TOKEN");
  if (!API_KEY) {
    const error = new Error("No Devin API token found");
    error.status = 401;
    throw error;
  }
  await rateLimit();
  return withRetry(async () => {
    const response = await fetch(`${API_BASE}/session/${sessionId}`, {
      headers: {
        "Authorization": `Bearer ${API_KEY}`
      }
    });
    if (!response.ok) {
      const error = await response.text();
      elizaLogger.error("Failed to get session details:", error);
      const apiError = new Error(`Failed to get session details: ${error}`);
      apiError.status = response.status;
      throw apiError;
    }
    const data = await response.json();
    return data;
  });
}

// src/actions/startSession.ts
var startSessionAction = {
  name: "START_DEVIN_SESSION",
  description: "Creates a new Devin session and returns session info",
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("DEVIN_API_TOKEN");
  },
  handler: async (runtime, message, _state, _options, callback) => {
    try {
      if (!callback) {
        elizaLogger2.error("No callback provided for startSessionAction");
        return;
      }
      const prompt = message.content.text;
      if (!prompt) {
        callback({ text: "No prompt provided for session creation" }, []);
        return;
      }
      const sessionInfo = await createSession(runtime, prompt);
      callback(
        {
          text: `New Devin session created successfully:
Session ID: ${sessionInfo.session_id}
Status: ${sessionInfo.status_enum}
URL: ${sessionInfo.url}`,
          action: "START_SESSION"
        },
        []
      );
    } catch (error) {
      elizaLogger2.error("Error creating Devin session:", error);
      if (!callback) {
        return;
      }
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      callback(
        {
          text: `Failed to create Devin session: ${errorMessage}`,
          error: errorMessage
        },
        []
      );
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Start a new Devin session with prompt: Help me with my code" }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "New Devin session created successfully:\nSession ID: abc123\nStatus: running\nURL: https://app.devin.ai/sessions/abc123",
          action: "START_SESSION"
        }
      }
    ]
  ],
  similes: ["create devin session", "start devin session", "begin devin session"]
};

// src/providers/devinProvider.ts
import {
  elizaLogger as elizaLogger3
} from "@elizaos/core";
var devinProvider = {
  get: async (runtime, _message, state) => {
    try {
      const API_KEY = runtime.getSetting("DEVIN_API_TOKEN");
      if (!API_KEY) {
        elizaLogger3.error("No Devin API token found");
        return {
          error: "No Devin API token found",
          lastUpdate: Date.now()
        };
      }
      const devinState = state?.devin || {};
      if (devinState.sessionId) {
        try {
          const sessionDetails = await getSessionDetails(runtime, devinState.sessionId);
          return {
            sessionId: sessionDetails.session_id,
            status: sessionDetails.status_enum,
            url: sessionDetails.url,
            lastUpdate: Date.now(),
            structured_output: sessionDetails.structured_output
          };
        } catch (error) {
          elizaLogger3.error("Error fetching session details:", error);
          return {
            error: "Failed to fetch session details",
            lastUpdate: Date.now(),
            sessionId: devinState.sessionId
            // Keep the session ID for reference
          };
        }
      }
      return {
        lastUpdate: Date.now()
      };
    } catch (error) {
      elizaLogger3.error("Error in devinProvider:", error);
      return {
        error: "Internal provider error",
        lastUpdate: Date.now()
      };
    }
  }
};

// src/index.ts
var devinPlugin = {
  name: "devinPlugin",
  description: "Integrates Devin API with Eliza for task automation and session management",
  actions: [startSessionAction],
  providers: [devinProvider]
};
export {
  devinPlugin
};
//# sourceMappingURL=index.js.map