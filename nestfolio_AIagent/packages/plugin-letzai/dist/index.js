// src/index.ts
import { elizaLogger } from "@elizaos/core";
async function pollLetzAiImageStatus(id, letzAiApiKey, callback, maxPolls = 40, pollIntervalMs = 3e3) {
  let polls = 0;
  let isReady = false;
  while (!isReady && polls < maxPolls) {
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    polls++;
    callback({
      text: `Still working on your image... (Poll #${polls})`
    });
    try {
      const resp = await fetch(`https://api.letz.ai/images/${id}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${letzAiApiKey}`
        }
      });
      if (!resp.ok) {
        callback({
          text: `Error checking LetzAI status: ${resp.status} - ${resp.statusText}`
        });
        return;
      }
      const statusData = await resp.json();
      const { status, imageVersions } = statusData;
      if (status === "ready") {
        isReady = true;
        let finalUrl = imageVersions?.original;
        if (Array.isArray(finalUrl) && finalUrl.length > 0) {
          finalUrl = finalUrl[0];
        }
        if (!finalUrl) {
          callback({
            text: "Image is ready, but no final URL found."
          });
          return;
        }
        callback({
          text: "Your image is ready!",
          attachments: [
            {
              id,
              url: finalUrl,
              title: "LetzAI Full Image",
              source: "letzAiImageGeneration",
              description: "Full-size image from LetzAI",
              contentType: "image/jpeg",
              text: "Here's your final image (original)."
            }
          ]
        });
      }
    } catch (err) {
      callback({
        text: `Error while polling LetzAI: ${err instanceof Error ? err.message : "Unknown error"}`
      });
      return;
    }
  }
  if (!isReady) {
    callback({
      text: `The image is still not ready after ${maxPolls} polls. Please try again later.`
    });
  }
}
var letzAiImageGeneration = {
  name: "GENERATE_IMAGE",
  similes: ["IMAGE_GENERATION", "IMAGE_GEN"],
  description: "Generate an image via LetzAI API (with polling).",
  suppressInitialMessage: true,
  validate: async (_runtime, _message, _state) => {
    return true;
  },
  handler: async (runtime, message, _state, options, callback) => {
    try {
      elizaLogger.log("Composing state for message:", message.content.text);
      callback({
        text: message.content.text
      });
      const userPrompt = message?.content?.text || "No prompt provided.";
      const letzAiApiKey = runtime.getSetting("LETZAI_API_KEY") || "fake_api_key";
      const letzAiModels = runtime.getSetting("LETZAI_MODELS") || "";
      const width = options.width ?? 720;
      const height = options.height ?? 1280;
      const quality = options.quality ?? 2;
      const creativity = options.creativity ?? 1;
      const hasWatermark = options.hasWatermark ?? true;
      const systemVersion = options.systemVersion ?? 3;
      const mode = options.mode ?? "default";
      let imagePrompt = userPrompt.trim();
      imagePrompt = `${letzAiModels}, ${imagePrompt}`;
      const prompt = imagePrompt;
      elizaLogger.log("Image prompt received:", imagePrompt);
      const createResp = await fetch("https://api.letz.ai/images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${letzAiApiKey}`
        },
        body: JSON.stringify({
          prompt,
          width,
          height,
          quality,
          creativity,
          hasWatermark,
          systemVersion,
          mode
        })
      });
      const createData = await createResp.json();
      if (!createResp.ok) {
        callback({
          text: `LetzAI creation failed: ${createData?.message || "Unknown error"}`
        });
        return;
      }
      const { id, status, progress } = createData;
      callback({
        text: `Started generating your image. (ID: ${id}, status: ${status}, progress: ${progress}%)`
      });
      await pollLetzAiImageStatus(
        id,
        letzAiApiKey,
        callback,
        /* maxPolls */
        20,
        /* pollIntervalMs */
        5e3
      );
    } catch (error) {
      callback({
        text: `Error while requesting LetzAI: ${error instanceof Error ? error.message : "Unknown error"}`
      });
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Generate an image of a neon futuristic cityscape"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Sure, generating image via LetzAI...",
          action: "GENERATE_IMAGE"
        }
      },
      {
        user: "{{user1}}",
        content: { text: "Take a selfie" }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Alright, hold on while I generate that selfie...",
          action: "GENERATE_IMAGE"
        }
      },
      {
        user: "{{user1}}",
        content: { text: "Make an image of a man on the beach" }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Making an image of a man on the beach!",
          action: "GENERATE_IMAGE"
        }
      }
    ]
  ]
};
var letzAIPlugin = {
  name: "letzai",
  description: "LetzAI Image Generation Plugin",
  actions: [letzAiImageGeneration],
  evaluators: [],
  providers: []
};
var index_default = letzAIPlugin;
export {
  index_default as default,
  letzAIPlugin,
  letzAiImageGeneration
};
//# sourceMappingURL=index.js.map