var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/index.ts
import { TwitterClientInterface } from "@elizaos/client-twitter";

// src/actions/sn34.ts
import { elizaLogger } from "@elizaos/core";
var formatAnalysisHistory = (analyses) => {
  const analysisStrings = analyses.reverse().map((analysis) => {
    const { isAIGenerated, confidenceScore } = analysis.content;
    const scorePercentage = Number(confidenceScore);
    return `Image Analysis: ${isAIGenerated ? "AI Generated" : "Natural"} (${(scorePercentage * 100).toFixed(2)}% confidence)`;
  });
  return analysisStrings.join("\n");
};
var validateAnalysisRequest = async (runtime, message) => {
  elizaLogger.info("\u{1F50D} BitMind: Validating analysis request...");
  const urlMatch = message?.content?.text?.match(/https?:\/\/[^\s]+/);
  const imageUrls = message?.content?.imageUrls;
  if (!urlMatch && (!imageUrls || imageUrls.length === 0)) {
    elizaLogger.error("\u274C BitMind: No image URL found in request");
    return false;
  }
  if (!runtime?.character?.settings?.secrets?.BITMIND) {
    elizaLogger.error("\u274C BitMind: API credentials not configured");
    return false;
  }
  elizaLogger.info("\u2705 BitMind: Request validation successful");
  return true;
};
var extractImageUrl = (message) => {
  const urlMatch = message.content.text.match(/https?:\/\/[^\s]+/);
  const imageUrls = message.content.imageUrls;
  const isTweet = Boolean(imageUrls && imageUrls.length > 0);
  if (isTweet && imageUrls) {
    return { url: imageUrls[0], isTweet };
  }
  if (urlMatch) {
    return { url: urlMatch[0], isTweet };
  }
  throw new Error("No valid image URL found in request");
};
var analyzeImageWithBitMind = async (imageUrl, apiKey) => {
  try {
    const response = await fetch("https://subnet-api.bitmindlabs.ai/detect-image", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ image: imageUrl })
    });
    if (!response.ok) {
      const errorMessage = `BitMind API error (${response.status}): ${response.statusText}`;
      elizaLogger.error(`\u274C ${errorMessage}`);
      if (response.status === 500) {
        throw new Error("BitMind service is currently experiencing issues. Please try again later.");
      }
      throw new Error(errorMessage);
    }
    const result = await response.json();
    return {
      isAIGenerated: result.isAI,
      confidenceScore: result.confidence
    };
  } catch (error) {
    if (error.message.includes("BitMind service")) {
      throw error;
    }
    elizaLogger.error("\u274C BitMind API request failed:", error);
    throw new Error("Failed to connect to BitMind service. Please check your connection and try again.");
  }
};
var generateAnalysisReport = (result) => {
  const confidencePercent = (result.confidenceScore * 100).toFixed(2);
  const confidenceValue = parseFloat(confidencePercent);
  return `\u{1F50D} Trinity Matrix Deepfake Analysis
Powered by BitMind Subnet (SN34) on Bittensor

${result.isAIGenerated ? "\u{1F916} AI Generated" : "\u{1F4F8} Natural Image"}
${confidencePercent}% AI Influence Rating
${confidenceValue > 75 ? "\u26A0\uFE0F High synthetic probability detected. Approach with caution." : confidenceValue > 40 ? "\u26A1 Moderate AI patterns present. Verification recommended." : "\u2705 Low synthetic markers. Likely authentic content."}

\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014`;
};
var analyzeImage = {
  name: "DETECT_IMAGE",
  similes: ["ANALYZE_IMAGE", "VERIFY_IMAGE", "BITMIND_DETECTION", "AI_DETECTION", "REAL_OR_FAKE"],
  validate: validateAnalysisRequest,
  description: "Analyze an image to determine if it was AI-generated using BitMind API",
  handler: async (runtime, message, state, options, callback) => {
    if (state["isAnalysisInProgress"]) return;
    state["isAnalysisInProgress"] = true;
    elizaLogger.info("\u{1F916} BitMind: Initiating image analysis...");
    if (!runtime.character?.settings?.secrets?.BITMIND) {
      throw new Error("BitMind API credentials not configured");
    }
    try {
      const { url: imageUrl, isTweet } = extractImageUrl(message);
      elizaLogger.info(`\u{1F4F8} BitMind: Processing image: ${imageUrl}`);
      const result = await analyzeImageWithBitMind(imageUrl, runtime.character.settings.secrets.BITMIND);
      elizaLogger.info(`\u2705 BitMind: Analysis complete`, {
        isAIGenerated: result.isAIGenerated,
        confidenceScore: result.confidenceScore,
        source: isTweet ? "tweet" : "message"
      });
      const analysisMemory = {
        ...message,
        content: {
          text: `Image Analysis: ${result.isAIGenerated ? "AI Generated" : "Natural"} (${(result.confidenceScore * 100).toFixed(2)}% confidence)`,
          imageUrl,
          isAIGenerated: result.isAIGenerated,
          confidenceScore: result.confidenceScore,
          imageSource: isTweet ? "tweet" : "url",
          actionType: "DETECT_IMAGE"
        },
        createdAt: Date.now()
      };
      elizaLogger.info("Saving analysis memory:", {
        roomId: message.roomId,
        analysisMemory
      });
      await runtime.messageManager.createMemory(analysisMemory);
      elizaLogger.info("Analysis memory saved");
      callback({
        text: generateAnalysisReport(result),
        isAIGenerated: result.isAIGenerated,
        confidenceScore: result.confidenceScore
      });
    } catch (error) {
      elizaLogger.error(`\u274C BitMind: Analysis error:`, error);
      throw new Error(`Image analysis failed: ${error.message}`);
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "analyze this image: https://example.com/image.jpg" }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "I'll analyze that image for you...",
          action: "DETECT_IMAGE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "is this image AI generated?" }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Let me check if that image is AI generated...",
          action: "DETECT_IMAGE"
        }
      }
    ]
  ]
};
var generateConfidenceBar = (confidence) => {
  const barLength = 20;
  const filledBars = Math.round(confidence * barLength);
  const emptyBars = barLength - filledBars;
  return `[${"\u2588".repeat(filledBars)}${"\u2591".repeat(emptyBars)}]`;
};
var analysisHistory = {
  name: "IMAGE_REPORT",
  similes: ["SHOW_DETECTIONS", "IMAGE_HISTORY", "PAST_ANALYSES", "DETECTION_HISTORY"],
  validate: async (runtime) => {
    return true;
  },
  description: "Display history of AI image analysis results",
  handler: async (runtime, message, state, options, callback) => {
    elizaLogger.info("\u{1F4CA} BitMind: Generating analysis history...");
    try {
      const limit = options?.limit || 10;
      const rooms = await runtime.databaseAdapter.getRoomsForParticipant(runtime.agentId);
      elizaLogger.info(`\u{1F4CA} BitMind: Found ${rooms.length} rooms`);
      const allMemories = await runtime.messageManager.getMemoriesByRoomIds({
        roomIds: rooms,
        limit: limit * 5
      });
      elizaLogger.info(`\u{1F4CA} BitMind: Retrieved ${allMemories.length} memories`);
      const imageAnalyses = allMemories.filter(
        (mem) => mem.content.actionType === "DETECT_IMAGE"
      );
      elizaLogger.info(`\u{1F4CA} BitMind: Found ${imageAnalyses.length} image analyses`);
      if (!imageAnalyses || imageAnalyses.length === 0) {
        callback({
          text: "No image analyses found."
        });
        return;
      }
      const statistics = imageAnalyses.reduce((acc, analysis) => {
        acc.total++;
        if (analysis.content.isAIGenerated) acc.aiCount++;
        acc.avgConfidence += analysis.content.confidenceScore;
        return acc;
      }, { total: 0, aiCount: 0, avgConfidence: 0 });
      const reportText = `\u{1F50D} Trinity Matrix Analysis Report
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501

\u{1F4CA} Recent Analyses (${imageAnalyses.length})
${formatAnalysisHistory(imageAnalyses)}

\u{1F4C8} Statistical Overview
\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2510
\u2502 \u{1F50D} Total Analyzed : ${statistics.total.toString().padEnd(12)} \u2502
\u2502 \u{1F916} AI Generated  : ${statistics.aiCount.toString().padEnd(12)} \u2502
\u2502 \u{1F4F8} Natural       : ${(statistics.total - statistics.aiCount).toString().padEnd(12)} \u2502
\u2502 \u26A1 AI Detection Rate: ${(statistics.aiCount / statistics.total * 100).toFixed(1)}%      \u2502
\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2518

\u{1F3AF} Confidence Metrics
Average Confidence: ${(statistics.avgConfidence / statistics.total * 100).toFixed(1)}%
${generateConfidenceBar(statistics.avgConfidence / statistics.total)}

Powered by BitMind Subnet (SN34) on Bittensor`;
      callback({ text: reportText });
    } catch (error) {
      elizaLogger.error(`\u274C BitMind: History generation error:`, error);
      throw new Error(`Failed to generate analysis history: ${error.message}`);
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "show me recent image analyses" }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here's your image analysis report...",
          action: "IMAGE_REPORT"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "what images have you checked recently?" }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Let me show you the recent image detection history...",
          action: "IMAGE_REPORT"
        }
      }
    ]
  ]
};

// src/evaluators/fact.ts
import { composeContext } from "@elizaos/core";
import { generateObjectArray } from "@elizaos/core";
import { MemoryManager } from "@elizaos/core";
import {
  ModelClass
} from "@elizaos/core";
var formatFacts = (facts) => {
  const messageStrings = facts.reverse().map((fact) => fact.content.text);
  const finalMessageStrings = messageStrings.join("\n");
  return finalMessageStrings;
};
var factsTemplate = (
  // {{actors}}
  `TASK: Extract Claims from the conversation as an array of claims in JSON format.

# START OF EXAMPLES
These are an examples of the expected output of this task:
{{evaluationExamples}}
# END OF EXAMPLES

# INSTRUCTIONS

Extract any claims from the conversation that are not already present in the list of known facts above:
- Try not to include already-known facts. If you think a fact is already known, but you're not sure, respond with already_known: true.
- If the fact is already in the user's description, set in_bio to true
- If we've already extracted this fact, set already_known to true
- Set the claim type to 'status', 'fact' or 'opinion'
- For true facts about the world or the character that do not change, set the claim type to 'fact'
- For facts that are true but change over time, set the claim type to 'status'
- For non-facts, set the type to 'opinion'
- 'opinion' inlcudes non-factual opinions and also includes the character's thoughts, feelings, judgments or recommendations
- Include any factual detail, including where the user lives, works, or goes to school, what they do for a living, their hobbies, and any other relevant information

Recent Messages:
{{recentMessages}}

Response should be a JSON object array inside a JSON markdown block. Correct response format:
\`\`\`json
[
  {"claim": string, "type": enum<fact|opinion|status>, in_bio: boolean, already_known: boolean },
  {"claim": string, "type": enum<fact|opinion|status>, in_bio: boolean, already_known: boolean },
  ...
]
\`\`\``
);
async function handler(runtime, message) {
  const state = await runtime.composeState(message);
  const { agentId, roomId } = state;
  const context = composeContext({
    state,
    template: runtime.character.templates?.factsTemplate || factsTemplate
  });
  const facts = await generateObjectArray({
    runtime,
    context,
    modelClass: ModelClass.LARGE
  });
  const factsManager = new MemoryManager({
    runtime,
    tableName: "facts"
  });
  if (!facts) {
    return [];
  }
  const filteredFacts = facts.filter((fact) => {
    return !fact.already_known && fact.type === "fact" && !fact.in_bio && fact.claim && fact.claim.trim() !== "";
  }).map((fact) => fact.claim);
  if (!agentId) {
    return filteredFacts;
  }
  for (const fact of filteredFacts) {
    const factMemory = await factsManager.addEmbeddingToMemory({
      userId: agentId,
      agentId,
      content: { text: fact },
      roomId,
      createdAt: Date.now()
    });
    await factsManager.createMemory(factMemory, true);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return filteredFacts;
}
var factEvaluator = {
  name: "GET_FACTS",
  similes: [
    "GET_CLAIMS",
    "EXTRACT_CLAIMS",
    "EXTRACT_FACTS",
    "EXTRACT_CLAIM",
    "EXTRACT_INFORMATION"
  ],
  validate: async (runtime, message) => {
    const messageCount = await runtime.messageManager.countMemories(
      message.roomId
    );
    const reflectionCount = Math.ceil(runtime.getConversationLength() / 2);
    return messageCount % reflectionCount === 0;
  },
  description: "Extract factual information about the people in the conversation, the current events in the world, and anything else that might be important to remember.",
  handler,
  examples: [
    {
      context: `Actors in the scene:
{{user1}}: Programmer and moderator of the local story club.
{{user2}}: New member of the club. Likes to write and read.

Facts about the actors:
None`,
      messages: [
        {
          user: "{{user1}}",
          content: { text: "So where are you from" }
        },
        {
          user: "{{user2}}",
          content: { text: "I'm from the city" }
        },
        {
          user: "{{user1}}",
          content: { text: "Which city?" }
        },
        {
          user: "{{user2}}",
          content: { text: "Oakland" }
        },
        {
          user: "{{user1}}",
          content: {
            text: "Oh, I've never been there, but I know it's in California"
          }
        }
      ],
      outcome: `{ "claim": "{{user2}} is from Oakland", "type": "fact", "in_bio": false, "already_known": false },`
    },
    {
      context: `Actors in the scene:
{{user1}}: Athelete and cyclist. Worked out every day for a year to prepare for a marathon.
{{user2}}: Likes to go to the beach and shop.

Facts about the actors:
{{user1}} and {{user2}} are talking about the marathon
{{user1}} and {{user2}} have just started dating`,
      messages: [
        {
          user: "{{user1}}",
          content: {
            text: "I finally completed the marathon this year!"
          }
        },
        {
          user: "{{user2}}",
          content: { text: "Wow! How long did it take?" }
        },
        {
          user: "{{user1}}",
          content: { text: "A little over three hours." }
        },
        {
          user: "{{user1}}",
          content: { text: "I'm so proud of myself." }
        }
      ],
      outcome: `Claims:
json\`\`\`
[
  { "claim": "Alex just completed a marathon in just under 4 hours.", "type": "fact", "in_bio": false, "already_known": false },
  { "claim": "Alex worked out 2 hours a day at the gym for a year.", "type": "fact", "in_bio": true, "already_known": false },
  { "claim": "Alex is really proud of himself.", "type": "opinion", "in_bio": false, "already_known": false }
]
\`\`\`
`
    },
    {
      context: `Actors in the scene:
{{user1}}: Likes to play poker and go to the park. Friends with Eva.
{{user2}}: Also likes to play poker. Likes to write and read.

Facts about the actors:
Mike and Eva won a regional poker tournament about six months ago
Mike is married to Alex
Eva studied Philosophy before switching to Computer Science`,
      messages: [
        {
          user: "{{user1}}",
          content: {
            text: "Remember when we won the regional poker tournament last spring"
          }
        },
        {
          user: "{{user2}}",
          content: {
            text: "That was one of the best days of my life"
          }
        },
        {
          user: "{{user1}}",
          content: {
            text: "It really put our poker club on the map"
          }
        }
      ],
      outcome: `Claims:
json\`\`\`
[
  { "claim": "Mike and Eva won the regional poker tournament last spring", "type": "fact", "in_bio": false, "already_known": true },
  { "claim": "Winning the regional poker tournament put the poker club on the map", "type": "opinion", "in_bio": false, "already_known": false }
]
\`\`\``
    }
  ]
};

// src/providers/time.ts
var timeProvider = {
  get: async (_runtime, _message, _state) => {
    const currentDate = /* @__PURE__ */ new Date();
    const options = {
      timeZone: "UTC",
      dateStyle: "full",
      timeStyle: "long"
    };
    const humanReadable = new Intl.DateTimeFormat("en-US", options).format(
      currentDate
    );
    return `The current date and time is ${humanReadable}. Please use this as your reference for any time-based operations or responses.`;
  }
};

// src/actions/index.ts
var actions_exports = {};
__export(actions_exports, {
  analysisHistory: () => analysisHistory,
  analyzeImage: () => analyzeImage,
  formatAnalysisHistory: () => formatAnalysisHistory
});

// src/evaluators/index.ts
var evaluators_exports = {};
__export(evaluators_exports, {
  factEvaluator: () => factEvaluator,
  formatFacts: () => formatFacts
});

// src/providers/index.ts
var providers_exports = {};
__export(providers_exports, {
  timeProvider: () => timeProvider
});

// src/index.ts
var bittensorPlugin = {
  name: "bittensor",
  description: "Utilize the BitMind API to access a range of digital commodities, including inference, media generation, and deepfake detection, on Bittensor's decentralized AI network.",
  actions: [
    analyzeImage,
    analysisHistory
  ],
  evaluators: [factEvaluator],
  providers: [timeProvider],
  clients: [TwitterClientInterface]
};
var index_default = bittensorPlugin;
export {
  actions_exports as actions,
  bittensorPlugin,
  index_default as default,
  evaluators_exports as evaluators,
  providers_exports as providers
};
//# sourceMappingURL=index.js.map