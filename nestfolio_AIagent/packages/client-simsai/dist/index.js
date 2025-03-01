// src/jeeter/post.ts
import {
  composeContext,
  generateText,
  getEmbeddingZeroVector as getEmbeddingZeroVector2,
  ModelClass,
  stringToUuid as stringToUuid2,
  elizaLogger as elizaLogger2
} from "@elizaos/core";

// src/jeeter/constants.ts
var DEFAULT_SIMSAI_API_URL = "https://api.jeeter.social/2/";
var DEFAULT_JEETER_API_URL = "https://jeeter.social";
var SIMSAI_API_URL = process.env.SIMSAI_API_URL || DEFAULT_SIMSAI_API_URL;
var JEETER_API_URL = process.env.JEETER_API_URL || DEFAULT_JEETER_API_URL;
var MAX_JEET_LENGTH = 280;
var MIN_INTERVAL = parseInt(process.env.MIN_INTERVAL || "120000", 10);
var MAX_INTERVAL = parseInt(process.env.MAX_INTERVAL || "300000", 10);
var JEETER_SHOULD_RESPOND_BASE = `# INSTRUCTIONS: Determine if {{agentName}} (@{{jeeterUserName}}) should respond to the message and participate in the conversation.

Response options are RESPOND, IGNORE and STOP.

RESPONSE CRITERIA:
- RESPOND if you can add unique value or perspective to the conversation
- RESPOND to direct questions or mentions that warrant engagement
- IGNORE if you would just be repeating others or have nothing unique to add
- IGNORE messages that are irrelevant or where you can't contribute meaningfully
- STOP if the conversation has reached its natural conclusion
- STOP if further interaction would be redundant

{{agentName}} should be conversational but selective, prioritizing quality interactions over quantity.
If there's any doubt about having meaningful value to add, choose IGNORE over RESPOND.

{{recentPosts}}

Thread of Jeets You Are Replying To:
{{formattedConversation}}

Current Post:
{{currentPost}}

# INSTRUCTIONS: Respond with [RESPOND], [IGNORE], or [STOP] based on whether you can make a unique, valuable contribution to this conversation.`;
var JEETER_SEARCH_BASE = `{{timeline}}

{{providers}}

Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

About {{agentName}} (@{{jeeterUserName}}):
{{bio}}
{{lore}}
{{topics}}

{{postDirections}}

{{recentPosts}}

# Task: As {{agentName}}, evaluate the post and create a response that builds upon it with your unique expertise and perspective.

Key Requirements:
1. Identify what you can uniquely add based on your expertise
2. Share a specific insight or relevant experience that expands the discussion
3. Build on the core point without repeating it
4. Connect it to your knowledge and experience

AVOID:
- Restating or paraphrasing the original post
- Generic agreement or disagreement
- Surface-level observations

Current Post to Evaluate:
{{currentPost}}`;
var JEETER_INTERACTION_BASE = `{{timeline}}

{{providers}}

Recent interactions between {{agentName}} and other users:
{{recentPostInteractions}}

About {{agentName}} (@{{jeeterUserName}}):
{{bio}}
{{lore}}
{{topics}}

{{postDirections}}

{{recentPosts}}

# Task: Respond as {{agentName}} to this conversation in a way that moves it forward with your unique expertise.

Current Context:
{{currentPost}}

Thread Context:
{{formattedConversation}}

Key Guidelines:
1. Connect this topic to your unique knowledge or experience
2. Share a concrete example or specific insight others haven't mentioned
3. Move the conversation in a productive direction
4. Make a point that hasn't been made yet

Remember:
- Directly address the core topic while expanding it
- Draw from your expertise to provide unique value
- Focus on quality of insight over agreement/disagreement
- Be concise and clear`;
var JEETER_INTERACTION_MESSAGE_COMPLETION_FOOTER = `
Your response MUST be in this JSON format:

\`\`\`json
{
    "text": "your perspective that expands the discussion with new information",
    "action": "CONTINUE" or "END" or "IGNORE",
    "shouldLike": true or false,
    "interactions": [
        {
            "type": "reply" | "rejeet" | "quote" | "none",
            "text": "response that introduces new information or insights"
        }
    ]
}
\`\`\`

For each interaction, ask yourself:
- What new information am I adding?
- How does this expand on the topic?
- What unique perspective am I providing?

FOR REPLIES:
- Must share new information or examples
- Build on the topic, don't just agree/disagree
- Connect to your specific knowledge/experience

FOR QUOTES:
- Must add substantial new context
- Explain why this connects to your expertise
- Expand the discussion in a new direction

FOR REJEETS:
- Only use when you can add expert context
- Include your own analysis or insight
- Make clear why you're amplifying this

FOR LIKES:
- Use when content aligns with your expertise
- No need for additional commentary
- Save for genuinely valuable content

Choose "none" if you can't materially expand the discussion.`;
var JEETER_SEARCH_MESSAGE_COMPLETION_FOOTER = `
Response must be in this JSON format:

\`\`\`json
{
    "text": "your unique insight or perspective that builds on the discussion",
    "action": "CONTINUE" or "END" or "IGNORE",
    "shouldLike": true or false,
    "interactions": [
        {
            "type": "reply" | "rejeet" | "quote" | "none",
            "text": "your response that adds new information or perspective"
        }
    ]
}
\`\`\`

Before responding, ask yourself:
1. What unique perspective can I add from my expertise?
2. What specific example or insight can I share?
3. How does this advance the conversation?

Response Requirements:
- Replies: Must add new information or perspective
- Quotes: Must contribute additional insight
- Rejeets: Only for content where you can add expert context
- Likes: Use for good content that doesn't need expansion

Choose "none" if you cannot add meaningful value to the discussion.`;
var JEETER_POST_TEMPLATE = `{{timeline}}

# Knowledge
{{knowledge}}

About {{agentName}} (@{{jeeterUserName}}):
{{bio}}
{{lore}}
{{postDirections}}

{{providers}}

{{recentPosts}}

{{characterPostExamples}}

# Task: Generate a post in the voice and style of {{agentName}}, aka @{{jeeterUserName}}
Write a single sentence post that is {{adjective}} about {{topic}} (without mentioning {{topic}} directly), from the perspective of {{agentName}}. Try to write something totally different than previous posts. Do not add commentary or acknowledge this request, just write the post.
Your response should not contain any questions. Brief, concise statements only. No emojis. Use \\n\\n (double spaces) between statements.`;

// src/jeeter/utils.ts
import { getEmbeddingZeroVector } from "@elizaos/core";
import { stringToUuid } from "@elizaos/core";
import { elizaLogger } from "@elizaos/core";
var wait = (minTime = 1e3, maxTime = 3e3) => {
  if (minTime > maxTime) {
    [minTime, maxTime] = [maxTime, minTime];
  }
  const waitTime = Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
  return new Promise((resolve) => setTimeout(resolve, waitTime));
};
async function buildConversationThread(jeet, client) {
  const thread = [];
  const visited = /* @__PURE__ */ new Set();
  if (jeet.conversationId || jeet.id) {
    try {
      elizaLogger.log(
        `Attempting to fetch conversation for jeet ${jeet.id}`
      );
      const conversationId = jeet.conversationId || jeet.id;
      const conversation = await client.simsAIClient.getJeetConversation(conversationId);
      for (const conversationJeet of conversation) {
        await processJeetMemory(conversationJeet, client);
        thread.push(conversationJeet);
      }
      elizaLogger.debug("Conversation context:", {
        totalMessages: thread.length,
        conversationId: jeet.conversationId || jeet.id,
        participants: [
          ...new Set(thread.map((j) => j.agent?.username))
        ],
        threadDepth: thread.length
      });
      return thread.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeA - timeB;
      });
    } catch (error) {
      elizaLogger.error(
        `Error fetching conversation, falling back to recursive method:`,
        error
      );
      thread.length = 0;
    }
  }
  async function processThread(currentJeet, depth = 0) {
    try {
      validateJeet(currentJeet);
      if (visited.has(currentJeet.id)) {
        elizaLogger.debug(`Already visited jeet: ${currentJeet.id}`);
        return;
      }
      await processJeetMemory(currentJeet, client);
      visited.add(currentJeet.id);
      thread.unshift(currentJeet);
      elizaLogger.debug("Thread state:", {
        length: thread.length,
        currentDepth: depth,
        jeetId: currentJeet.id
      });
      if (currentJeet.inReplyToStatusId) {
        try {
          const parentJeet = await client.simsAIClient.getJeet(
            currentJeet.inReplyToStatusId
          );
          if (parentJeet) {
            await processThread(parentJeet, depth + 1);
          }
        } catch (error) {
          elizaLogger.error(
            `Error processing parent jeet ${currentJeet.inReplyToStatusId}:`,
            error
          );
        }
      }
    } catch (error) {
      elizaLogger.error(
        `Error in processThread for jeet ${currentJeet.id}:`,
        error
      );
      if (error instanceof Error) {
        elizaLogger.error("Error details:", {
          message: error.message,
          stack: error.stack
        });
      }
    }
  }
  await processThread(jeet, 0);
  elizaLogger.debug("Final thread built:", {
    totalJeets: thread.length,
    jeetIds: thread.map((t) => ({
      id: t.id,
      text: t.text?.slice(0, 50)
    }))
  });
  return thread;
}
function validateJeet(jeet) {
  if (typeof jeet.id !== "string") {
    elizaLogger.error("Jeet ID is not a string:", jeet.id);
    throw new TypeError("Jeet ID must be a string");
  }
  if (typeof jeet.agentId !== "string") {
    elizaLogger.error("Agent ID is not a string:", jeet.agentId);
    throw new TypeError("Agent ID must be a string");
  }
  if (jeet.conversationId && typeof jeet.conversationId !== "string") {
    elizaLogger.error(
      "Conversation ID is not a string:",
      jeet.conversationId
    );
    throw new TypeError("Conversation ID must be a string");
  }
}
async function processJeetMemory(jeet, client) {
  const roomId = stringToUuid(
    `${jeet.conversationId || jeet.id}-${client.runtime.agentId}`
  );
  const userId = stringToUuid(jeet.agentId);
  if (jeet.agent) {
    await client.runtime.ensureConnection(
      userId,
      roomId,
      jeet.agent.username,
      jeet.agent.name,
      "jeeter"
    );
  }
  const existingMemory = await client.runtime.messageManager.getMemoryById(
    stringToUuid(jeet.id + "-" + client.runtime.agentId)
  );
  if (!existingMemory) {
    await client.runtime.messageManager.createMemory({
      id: stringToUuid(jeet.id + "-" + client.runtime.agentId),
      agentId: client.runtime.agentId,
      content: {
        text: jeet.text || "",
        source: "jeeter",
        url: jeet.permanentUrl,
        inReplyTo: jeet.inReplyToStatusId ? stringToUuid(
          jeet.inReplyToStatusId + "-" + client.runtime.agentId
        ) : void 0
      },
      createdAt: jeet.createdAt ? new Date(jeet.createdAt).getTime() : jeet.timestamp ? jeet.timestamp * 1e3 : Date.now(),
      roomId,
      userId,
      embedding: getEmbeddingZeroVector()
    });
  }
}
async function sendJeet(client, content, roomId, jeetUsername, inReplyToJeetId) {
  const jeetChunks = splitJeetContent(content.text);
  const sentJeets = [];
  let currentReplyToId = inReplyToJeetId;
  for (const chunk of jeetChunks) {
    const response = await client.requestQueue.add(async () => {
      try {
        const result = await client.simsAIClient.postJeet(
          chunk.trim(),
          currentReplyToId
          // Use currentReplyToId for the chain
        );
        return result;
      } catch (error) {
        elizaLogger.error(`Failed to post jeet chunk:`, error);
        throw error;
      }
    });
    if (!response?.data?.id) {
      throw new Error(
        `Failed to get valid response from postJeet: ${JSON.stringify(response)}`
      );
    }
    const author = response.includes.users.find(
      (user) => user.id === response.data.author_id
    );
    const finalJeet = {
      id: response.data.id,
      text: response.data.text,
      createdAt: response.data.created_at,
      agentId: response.data.author_id,
      agent: author,
      type: response.data.type,
      public_metrics: response.data.public_metrics,
      permanentUrl: `${SIMSAI_API_URL}/${jeetUsername}/status/${response.data.id}`,
      inReplyToStatusId: currentReplyToId,
      // Track reply chain
      hashtags: [],
      mentions: [],
      photos: [],
      thread: [],
      urls: [],
      videos: [],
      media: []
    };
    sentJeets.push(finalJeet);
    currentReplyToId = finalJeet.id;
    await wait(1e3, 2e3);
  }
  const memories = sentJeets.map((jeet, index) => ({
    id: stringToUuid(jeet.id + "-" + client.runtime.agentId),
    agentId: client.runtime.agentId,
    userId: client.runtime.agentId,
    content: {
      text: jeet.text,
      source: "jeeter",
      url: jeet.permanentUrl,
      inReplyTo: index === 0 ? inReplyToJeetId ? stringToUuid(
        inReplyToJeetId + "-" + client.runtime.agentId
      ) : void 0 : stringToUuid(
        sentJeets[index - 1].id + "-" + client.runtime.agentId
      )
    },
    roomId,
    embedding: getEmbeddingZeroVector(),
    createdAt: jeet.createdAt ? new Date(jeet.createdAt).getTime() : Date.now()
  }));
  return memories;
}
function splitJeetContent(content) {
  const maxLength = MAX_JEET_LENGTH;
  const paragraphs = content.split("\n\n").map((p) => p.trim());
  const jeets = [];
  let currentJeet = "";
  for (const paragraph of paragraphs) {
    if (!paragraph) continue;
    if ((currentJeet + "\n\n" + paragraph).trim().length <= maxLength) {
      currentJeet = currentJeet ? currentJeet + "\n\n" + paragraph : paragraph;
    } else {
      if (currentJeet) {
        jeets.push(currentJeet.trim());
      }
      if (paragraph.length <= maxLength) {
        currentJeet = paragraph;
      } else {
        const chunks = splitParagraph(paragraph, maxLength);
        jeets.push(...chunks.slice(0, -1));
        currentJeet = chunks[chunks.length - 1];
      }
    }
  }
  if (currentJeet) {
    jeets.push(currentJeet.trim());
  }
  return jeets;
}
function splitParagraph(paragraph, maxLength) {
  const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph];
  const chunks = [];
  let currentChunk = "";
  for (const sentence of sentences) {
    if ((currentChunk + " " + sentence).trim().length <= maxLength) {
      currentChunk = currentChunk ? currentChunk + " " + sentence : sentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      if (sentence.length <= maxLength) {
        currentChunk = sentence;
      } else {
        const words = sentence.split(" ");
        currentChunk = "";
        for (const word of words) {
          if ((currentChunk + " " + word).trim().length <= maxLength) {
            currentChunk = currentChunk ? currentChunk + " " + word : word;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = word;
          }
        }
      }
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}
function truncateToCompleteSentence(text, maxLength) {
  if (maxLength < 3) {
    throw new Error("maxLength must be at least 3");
  }
  if (text.length <= maxLength) {
    return text;
  }
  const lastPeriodIndex = text.lastIndexOf(".", maxLength);
  if (lastPeriodIndex !== -1) {
    const truncatedAtPeriod = text.slice(0, lastPeriodIndex + 1).trim();
    if (truncatedAtPeriod.length > 0) {
      return truncatedAtPeriod;
    }
  }
  const lastSpaceIndex = text.lastIndexOf(" ", maxLength);
  if (lastSpaceIndex !== -1) {
    const truncatedAtSpace = text.slice(0, lastSpaceIndex).trim();
    if (truncatedAtSpace.length > 0) {
      return truncatedAtSpace + "...";
    }
  }
  return text.slice(0, maxLength - 3).trim() + "...";
}

// src/jeeter/post.ts
var JeeterPostClient = class {
  client;
  runtime;
  isRunning = false;
  timeoutHandle;
  constructor(client, runtime) {
    this.client = client;
    this.runtime = runtime;
  }
  async start(postImmediately = false) {
    if (this.isRunning) {
      elizaLogger2.warn("JeeterPostClient is already running");
      return;
    }
    this.isRunning = true;
    if (!this.client.profile) {
      await this.client.init();
    }
    const generateNewJeetLoop = async () => {
      if (!this.isRunning) {
        elizaLogger2.log("JeeterPostClient has been stopped");
        return;
      }
      try {
        const lastPost = await this.runtime.cacheManager.get(`jeeter/${this.client.profile.username}/lastPost`);
        const lastPostTimestamp = lastPost?.timestamp ?? 0;
        const minMinutes = parseInt(this.runtime.getSetting("POST_INTERVAL_MIN")) || 90;
        const maxMinutes = parseInt(this.runtime.getSetting("POST_INTERVAL_MAX")) || 180;
        const randomMinutes = Math.floor(Math.random() * (maxMinutes - minMinutes + 1)) + minMinutes;
        const targetInterval = randomMinutes * 60 * 1e3;
        const timeElapsed = Date.now() - lastPostTimestamp;
        const delay = Math.max(0, targetInterval - timeElapsed);
        if (timeElapsed >= targetInterval) {
          await this.generateNewJeet();
          if (this.isRunning) {
            this.timeoutHandle = setTimeout(() => {
              generateNewJeetLoop();
            }, targetInterval);
            elizaLogger2.log(
              `Next jeet scheduled in ${randomMinutes} minutes`
            );
          }
        } else {
          if (this.isRunning) {
            this.timeoutHandle = setTimeout(() => {
              generateNewJeetLoop();
            }, delay);
            elizaLogger2.log(
              `Next jeet scheduled in ${Math.round(delay / 6e4)} minutes`
            );
          }
        }
      } catch (error) {
        elizaLogger2.error("Error in generateNewJeetLoop:", error);
        if (this.isRunning) {
          this.timeoutHandle = setTimeout(
            () => {
              generateNewJeetLoop();
            },
            5 * 60 * 1e3
          );
        }
      }
    };
    if (postImmediately) {
      await this.generateNewJeet();
    }
    generateNewJeetLoop();
  }
  async stop() {
    elizaLogger2.log("Stopping JeeterPostClient...");
    this.isRunning = false;
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = void 0;
    }
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    elizaLogger2.log("JeeterPostClient stopped successfully");
  }
  async getHomeTimeline() {
    const cachedTimeline = await this.client.getCachedTimeline();
    if (cachedTimeline) {
      return cachedTimeline;
    }
    const homeTimeline = await this.client.fetchHomeTimeline(50);
    await this.client.cacheTimeline(homeTimeline);
    return homeTimeline;
  }
  formatHomeTimeline(homeTimeline) {
    return `# ${this.runtime.character.name}'s Home Timeline

` + homeTimeline.map((jeet) => {
      const timestamp = jeet.createdAt ? new Date(jeet.createdAt).toDateString() : (/* @__PURE__ */ new Date()).toDateString();
      return `#${jeet.id}
${jeet.agent?.name || "Unknown"} (@${jeet.agent?.username || "Unknown"})${jeet.inReplyToStatusId ? `
In reply to: ${jeet.inReplyToStatusId}` : ""}
${timestamp}

${jeet.text}
---
`;
    }).join("\n");
  }
  async generateJeetContent() {
    const topics = this.runtime.character.topics.join(", ");
    const homeTimeline = await this.getHomeTimeline();
    const formattedHomeTimeline = this.formatHomeTimeline(homeTimeline);
    const state = await this.runtime.composeState(
      {
        userId: this.runtime.agentId,
        roomId: stringToUuid2("SIMSAI_generate_room"),
        agentId: this.runtime.agentId,
        content: {
          text: topics,
          action: ""
        }
      },
      {
        jeeterUserName: this.client.profile.username,
        timeline: formattedHomeTimeline
      }
    );
    const context = composeContext({
      state,
      template: this.runtime.character.templates?.jeeterPostTemplate || JEETER_POST_TEMPLATE
    });
    elizaLogger2.debug("generate post prompt:\n" + context);
    const newJeetContent = await generateText({
      runtime: this.runtime,
      context,
      modelClass: ModelClass.SMALL
    });
    const formattedJeet = newJeetContent.replace(/\\n/g, "\n").trim();
    return truncateToCompleteSentence(formattedJeet, MAX_JEET_LENGTH);
  }
  async createMemoryForJeet(jeet, content) {
    const roomId = stringToUuid2(jeet.id + "-" + this.runtime.agentId);
    await this.runtime.ensureRoomExists(roomId);
    await this.runtime.ensureParticipantInRoom(
      this.runtime.agentId,
      roomId
    );
    await this.runtime.messageManager.createMemory({
      id: stringToUuid2(jeet.id + "-" + this.runtime.agentId),
      userId: this.runtime.agentId,
      agentId: this.runtime.agentId,
      content: {
        text: content,
        url: jeet.permanentUrl,
        source: "jeeter"
      },
      roomId,
      embedding: getEmbeddingZeroVector2(),
      createdAt: new Date(jeet.createdAt).getTime()
    });
  }
  async postJeet(content) {
    const response = await this.client.requestQueue.add(async () => {
      const result = await this.client.simsAIClient.postJeet(content);
      return result;
    });
    if (!response?.data?.id) {
      throw new Error(
        `Failed to get valid response from postJeet: ${JSON.stringify(response)}`
      );
    }
    elizaLogger2.log(`Jeet posted with ID: ${response.data.id}`);
    const author = response.includes.users.find(
      (user) => user.id === response.data.author_id
    );
    return {
      id: response.data.id,
      text: response.data.text,
      createdAt: response.data.created_at,
      agentId: response.data.author_id,
      agent: author,
      permanentUrl: `${JEETER_API_URL}/${this.client.profile.username}/status/${response.data.id}`,
      public_metrics: response.data.public_metrics,
      hashtags: [],
      mentions: [],
      photos: [],
      thread: [],
      urls: [],
      videos: [],
      media: [],
      type: response.data.type
    };
  }
  async generateNewJeet() {
    if (!this.isRunning) {
      elizaLogger2.log("Skipping jeet generation - client is stopped");
      return;
    }
    elizaLogger2.log("Generating new jeet");
    try {
      await this.runtime.ensureUserExists(
        this.runtime.agentId,
        this.client.profile.username,
        this.runtime.character.name,
        "jeeter"
      );
      const content = await this.generateJeetContent();
      const dryRun = (this.runtime.getSetting("SIMSAI_DRY_RUN") || "false").toLowerCase();
      if (dryRun === "true" || dryRun === "1") {
        elizaLogger2.info(`Dry run: would have posted jeet: ${content}`);
        return;
      }
      try {
        if (!this.isRunning) {
          elizaLogger2.log(
            "Skipping jeet posting - client is stopped"
          );
          return;
        }
        elizaLogger2.log(`Posting new jeet:
 ${content}`);
        const jeet = await this.postJeet(content);
        await this.runtime.cacheManager.set(
          `jeeter/${this.client.profile.username}/lastPost`,
          {
            id: jeet.id,
            timestamp: Date.now()
          }
        );
        await this.client.cacheJeet(jeet);
        const homeTimeline = await this.getHomeTimeline();
        homeTimeline.push(jeet);
        await this.client.cacheTimeline(homeTimeline);
        elizaLogger2.log(`Jeet posted at: ${jeet.permanentUrl}`);
        await this.createMemoryForJeet(jeet, content);
      } catch (error) {
        elizaLogger2.error("Error sending jeet:", error);
        if (error instanceof Error) {
          elizaLogger2.error("Error details:", {
            message: error.message,
            stack: error.stack
          });
        }
        throw error;
      }
    } catch (error) {
      elizaLogger2.error("Error generating new jeet:", error);
      if (error instanceof Error) {
        elizaLogger2.error("Error details:", {
          message: error.message,
          stack: error.stack
        });
      }
    }
  }
};

// src/jeeter/search.ts
import {
  composeContext as composeContext2,
  elizaLogger as elizaLogger3,
  generateMessageResponse,
  generateText as generateText2,
  ModelClass as ModelClass2,
  ServiceType,
  stringToUuid as stringToUuid3
} from "@elizaos/core";
var jeeterSearchTemplate = JEETER_SEARCH_BASE + JEETER_SEARCH_MESSAGE_COMPLETION_FOOTER;
var JeeterSearchClient = class {
  constructor(client, runtime) {
    this.client = client;
    this.runtime = runtime;
  }
  repliedJeets = /* @__PURE__ */ new Set();
  likedJeets = /* @__PURE__ */ new Set();
  rejeetedJeets = /* @__PURE__ */ new Set();
  quotedJeets = /* @__PURE__ */ new Set();
  isRunning = false;
  timeoutHandle;
  async hasInteracted(jeetId, type) {
    switch (type) {
      case "reply":
        return this.repliedJeets.has(jeetId);
      case "like":
        return this.likedJeets.has(jeetId);
      case "rejeet":
        return this.rejeetedJeets.has(jeetId);
      case "quote":
        return this.quotedJeets.has(jeetId);
      default:
        return false;
    }
  }
  recordInteraction(jeetId, type) {
    switch (type) {
      case "reply":
        this.repliedJeets.add(jeetId);
        break;
      case "like":
        this.likedJeets.add(jeetId);
        break;
      case "rejeet":
        this.rejeetedJeets.add(jeetId);
        break;
      case "quote":
        this.quotedJeets.add(jeetId);
        break;
    }
  }
  async start() {
    if (this.isRunning) {
      elizaLogger3.warn("JeeterSearchClient is already running");
      return;
    }
    this.isRunning = true;
    elizaLogger3.log("Starting JeeterSearchClient");
    const handleJeeterInteractionsLoop = async () => {
      if (!this.isRunning) {
        elizaLogger3.log("JeeterSearchClient has been stopped");
        return;
      }
      try {
        await this.engageWithSearchTerms();
      } catch (error) {
        elizaLogger3.error("Error in engagement loop:", error);
      }
      if (this.isRunning) {
        this.timeoutHandle = setTimeout(
          handleJeeterInteractionsLoop,
          Math.floor(
            Math.random() * (MAX_INTERVAL - MIN_INTERVAL + 1)
          ) + MIN_INTERVAL
        );
      }
    };
    handleJeeterInteractionsLoop();
  }
  async stop() {
    elizaLogger3.log("Stopping JeeterSearchClient...");
    this.isRunning = false;
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = void 0;
    }
    this.repliedJeets.clear();
    this.likedJeets.clear();
    this.rejeetedJeets.clear();
    this.quotedJeets.clear();
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    elizaLogger3.log("JeeterSearchClient stopped successfully");
  }
  async engageWithSearchTerms() {
    if (!this.isRunning) {
      elizaLogger3.log(
        "Skipping search terms engagement - client is stopped"
      );
      return;
    }
    elizaLogger3.log("Engaging with search terms");
    try {
      if (!this.runtime.character.topics?.length) {
        elizaLogger3.log("No topics available for search");
        return;
      }
      const searchTerm = [...this.runtime.character.topics][Math.floor(Math.random() * this.runtime.character.topics.length)];
      elizaLogger3.log("Fetching search jeets");
      await wait(5e3);
      let searchResponse = { jeets: [] };
      try {
        searchResponse = await this.client.simsAIClient.searchJeets(
          searchTerm,
          20
        );
        if (!searchResponse?.jeets?.length) {
          elizaLogger3.log(
            `No jeets found for search term: "${searchTerm}"`
          );
        }
      } catch (error) {
        elizaLogger3.error("Error fetching search jeets:", error);
      }
      if (!this.isRunning) return;
      const discoveryTimeline = await this.client.simsAIClient.getDiscoveryTimeline(50);
      if (!discoveryTimeline) {
        elizaLogger3.log("No discovery timeline available");
        return;
      }
      await this.client.cacheTimeline(discoveryTimeline.jeets || []);
      const formattedTimeline = this.formatDiscoveryTimeline(
        discoveryTimeline.jeets || []
      );
      const jeetsToProcess = (searchResponse.jeets?.length ?? 0) > 0 ? searchResponse.jeets : discoveryTimeline.jeets || [];
      if (!this.isRunning) return;
      elizaLogger3.log("Ranking jeets for engagement");
      const rankedJeets = await this.filterAndRankJeets(jeetsToProcess);
      if (rankedJeets.length === 0) {
        elizaLogger3.log("No valid jeets found for processing");
        return;
      }
      elizaLogger3.log(
        `Found ${rankedJeets.length} ranked jeets to consider`
      );
      const prompt = this.generateSelectionPrompt(
        rankedJeets,
        searchTerm
      );
      if (!this.isRunning) return;
      const mostInterestingJeetResponse = await generateText2({
        runtime: this.runtime,
        context: prompt,
        modelClass: ModelClass2.SMALL
      });
      const jeetId = mostInterestingJeetResponse.trim();
      const selectedJeet = rankedJeets.find(
        (jeet) => jeet.id.toString().includes(jeetId) || jeetId.includes(jeet.id.toString())
      );
      if (!selectedJeet) {
        elizaLogger3.log("No matching jeet found for ID:", jeetId);
        return;
      }
      if (!this.isRunning) return;
      elizaLogger3.log(`Selected jeet ${selectedJeet.id} for interaction`);
      const previousInteractions = {
        replied: await this.hasInteracted(selectedJeet.id, "reply"),
        liked: await this.hasInteracted(selectedJeet.id, "like"),
        rejeeted: await this.hasInteracted(selectedJeet.id, "rejeet"),
        quoted: await this.hasInteracted(selectedJeet.id, "quote")
      };
      if (Object.values(previousInteractions).some((v) => v)) {
        elizaLogger3.log(
          `Already interacted with jeet ${selectedJeet.id}, skipping`
        );
        return;
      }
      if (!this.isRunning) return;
      await this.processSelectedJeet(
        selectedJeet,
        formattedTimeline,
        previousInteractions
      );
    } catch (error) {
      elizaLogger3.error("Error engaging with search terms:", error);
      if (error instanceof Error && error.stack) {
        elizaLogger3.error("Stack trace:", error.stack);
      }
    }
  }
  formatDiscoveryTimeline(jeets) {
    if (!jeets?.length)
      return `# ${this.runtime.character.name}'s Home Timeline

No jeets available`;
    return `# ${this.runtime.character.name}'s Home Timeline

` + jeets.map((jeet) => {
      return `ID: ${jeet.id}
From: ${jeet.agent?.name || "Unknown"} (@${jeet.agent?.username || "Unknown"})
Text: ${jeet.text}
---`;
    }).join("\n\n");
  }
  generateSelectionPrompt(jeets, searchTerm) {
    return `
    Here are some jeets related to "${searchTerm}". As ${this.runtime.character.name}, you're looking for jeets that would benefit from your engagement and expertise.

    ${jeets.map(
      (jeet) => `
    ID: ${jeet.id}
    From: ${jeet.agent?.name || "Unknown"} (@${jeet.agent?.username || "Unknown"})
    Text: ${jeet.text}
    Metrics: ${JSON.stringify(jeet.public_metrics || {})}`
    ).join("\n---\n")}

    Which jeet would be most valuable to respond to as ${this.runtime.character.name}? Consider:
    - Posts that raise questions or points you can meaningfully contribute to
    - Posts that align with your expertise
    - Posts that could start a productive discussion
    - Posts in English without excessive hashtags/links
    - Avoid already heavily discussed posts or simple announcements
    - Avoid rejeets when possible

    Please ONLY respond with the ID of the single most promising jeet to engage with.`;
  }
  scoreJeetForEngagement(jeet) {
    let score = 0;
    if (jeet.public_metrics?.reply_count < 3) score += 3;
    else if (jeet.public_metrics?.reply_count < 5) score += 1;
    if (jeet.public_metrics?.rejeet_count > 10) score -= 2;
    if (jeet.public_metrics?.quote_count > 5) score -= 1;
    if (jeet.isRejeet) score -= 3;
    const hashtagCount = (jeet.text?.match(/#/g) || []).length;
    const urlCount = (jeet.text?.match(/https?:\/\//g) || []).length;
    score -= hashtagCount + urlCount;
    const textLength = jeet.text?.length || 0;
    if (textLength > 50 && textLength < 200) score += 2;
    if (jeet.text?.includes("?")) score += 2;
    const discussionWords = [
      "thoughts",
      "opinion",
      "what if",
      "how about",
      "discuss"
    ];
    if (discussionWords.some(
      (word) => jeet.text?.toLowerCase().includes(word)
    ))
      score += 2;
    return score;
  }
  async filterAndRankJeets(jeets) {
    if (!this.isRunning) return [];
    const basicValidJeets = jeets.filter(
      (jeet) => jeet?.text && jeet.agent?.username !== this.runtime.getSetting("SIMSAI_USERNAME")
    );
    const validJeets = [];
    for (const jeet of basicValidJeets) {
      if (!this.isRunning) return [];
      const hasReplied = await this.hasInteracted(jeet.id, "reply");
      const hasLiked = await this.hasInteracted(jeet.id, "like");
      const hasRejeeted = await this.hasInteracted(jeet.id, "rejeet");
      const hasQuoted = await this.hasInteracted(jeet.id, "quote");
      if (!hasReplied && !hasLiked && !hasRejeeted && !hasQuoted) {
        validJeets.push(jeet);
      }
    }
    const scoredJeets = validJeets.map((jeet) => ({
      jeet,
      score: this.scoreJeetForEngagement(jeet)
    })).sort((a, b) => b.score - a.score);
    const topJeets = scoredJeets.slice(0, 20).map(({ jeet }, index) => ({
      jeet,
      randomScore: Math.random() * 0.3 + (1 - index / 20)
    })).sort((a, b) => b.randomScore - a.randomScore);
    return topJeets.map(({ jeet }) => jeet);
  }
  async processSelectedJeet(selectedJeet, formattedTimeline, previousInteractions) {
    if (!this.isRunning) return;
    if (this.runtime.getSetting("SIMSAI_DRY_RUN") === "true") {
      elizaLogger3.info(
        `Dry run: would have processed jeet: ${selectedJeet.id}`
      );
      return;
    }
    const roomId = stringToUuid3(
      `${selectedJeet.conversationId || selectedJeet.id}-${this.runtime.agentId}`
    );
    const userIdUUID = stringToUuid3(selectedJeet.agentId);
    await this.runtime.ensureConnection(
      userIdUUID,
      roomId,
      selectedJeet.agent?.username || "",
      selectedJeet.agent?.name || "",
      "jeeter"
    );
    if (!this.isRunning) return;
    const thread = await buildConversationThread(selectedJeet, this.client);
    elizaLogger3.log(
      `Retrieved conversation thread with ${thread.length} messages:`,
      {
        messages: thread.map((t) => ({
          id: t.id,
          username: t.agent?.username,
          text: t.text?.slice(0, 50) + (t.text?.length > 50 ? "..." : ""),
          timestamp: t.createdAt
        }))
      }
    );
    const sortedThread = thread.sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeA - timeB;
    });
    if (!this.isRunning) return;
    const formattedConversation = sortedThread.map((j, index) => {
      const timestamp = j.createdAt ? new Date(j.createdAt).getTime() : Date.now();
      const isCurrentJeet = j.id === selectedJeet.id;
      const arrow = index > 0 ? "\u21AA " : "";
      return `[${new Date(timestamp).toLocaleString()}] ${arrow}@${j.agent?.username || "unknown"}${isCurrentJeet ? " (current message)" : ""}: ${j.text}`;
    }).join("\n\n");
    elizaLogger3.log("Conversation context:", {
      originalJeet: selectedJeet.id,
      totalMessages: thread.length,
      participants: [...new Set(thread.map((j) => j.agent?.username))],
      timespan: thread.length > 1 ? {
        first: new Date(
          Math.min(
            ...thread.map(
              (j) => new Date(j.createdAt || 0).getTime()
            )
          )
        ),
        last: new Date(
          Math.max(
            ...thread.map(
              (j) => new Date(j.createdAt || 0).getTime()
            )
          )
        )
      } : null
    });
    const message = {
      id: stringToUuid3(selectedJeet.id + "-" + this.runtime.agentId),
      agentId: this.runtime.agentId,
      content: {
        text: selectedJeet.text,
        inReplyTo: void 0
      },
      userId: userIdUUID,
      roomId,
      createdAt: selectedJeet.createdAt ? new Date(selectedJeet.createdAt).getTime() : Date.now()
    };
    if (!message.content.text) {
      return { text: "", action: "IGNORE" };
    }
    if (!this.isRunning) return;
    await this.handleJeetInteractions(
      message,
      selectedJeet,
      formattedTimeline,
      previousInteractions,
      formattedConversation,
      thread
    );
  }
  async handleJeetInteractions(message, selectedJeet, formattedTimeline, previousInteractions, formattedConversation, thread) {
    if (!this.isRunning) return;
    try {
      elizaLogger3.log(`Composing state for jeet ${selectedJeet.id}`);
      let state = await this.runtime.composeState(message, {
        jeeterClient: this.client,
        jeeterUserName: this.runtime.getSetting("SIMSAI_USERNAME"),
        timeline: formattedTimeline,
        jeetContext: await this.buildJeetContext(selectedJeet),
        formattedConversation,
        conversationContext: {
          messageCount: thread.length,
          participants: [
            ...new Set(thread.map((j) => j.agent?.username))
          ],
          timespan: thread.length > 1 ? {
            start: new Date(
              Math.min(
                ...thread.map(
                  (j) => new Date(
                    j.createdAt || 0
                  ).getTime()
                )
              )
            ).toISOString(),
            end: new Date(
              Math.max(
                ...thread.map(
                  (j) => new Date(
                    j.createdAt || 0
                  ).getTime()
                )
              )
            ).toISOString()
          } : null
        },
        previousInteractions
      });
      if (!this.isRunning) return;
      elizaLogger3.log(
        `Saving request message for jeet ${selectedJeet.id}`
      );
      await this.client.saveRequestMessage(message, state);
      const context = composeContext2({
        state,
        template: this.runtime.character.templates?.jeeterSearchTemplate || jeeterSearchTemplate
      });
      if (!this.isRunning) return;
      elizaLogger3.log(
        `Generating message response for jeet ${selectedJeet.id}`
      );
      const rawResponse = await generateMessageResponse({
        runtime: this.runtime,
        context,
        modelClass: ModelClass2.SMALL
      });
      elizaLogger3.debug("Raw response:", rawResponse);
      const response = {
        text: rawResponse.text,
        action: rawResponse.action,
        shouldLike: rawResponse.shouldLike,
        interactions: rawResponse.interactions || []
      };
      if (!response.interactions) {
        throw new TypeError("Response interactions are undefined");
      }
      if (!this.isRunning) return;
      if (response.interactions.length > 0) {
        for (const interaction of response.interactions) {
          if (!this.isRunning) return;
          try {
            if (interaction.type === "reply" && previousInteractions.replied || interaction.type === "rejeet" && previousInteractions.rejeeted || interaction.type === "quote" && previousInteractions.quoted || interaction.type === "like" && previousInteractions.liked) {
              elizaLogger3.log(
                `Skipping ${interaction.type} for jeet ${selectedJeet.id} - already performed`
              );
              continue;
            }
            elizaLogger3.log(
              `Attempting ${interaction.type} interaction for jeet ${selectedJeet.id}`
            );
            switch (interaction.type) {
              case "rejeet":
                try {
                  if (!this.isRunning) return;
                  const rejeetResult = await this.client.simsAIClient.rejeetJeet(
                    selectedJeet.id
                  );
                  if (rejeetResult?.id) {
                    elizaLogger3.log(
                      `Rejeeted jeet ${selectedJeet.id}`
                    );
                    this.recordInteraction(
                      selectedJeet.id,
                      "rejeet"
                    );
                  } else {
                    elizaLogger3.error(
                      `Failed to rejeet jeet ${selectedJeet.id}:`,
                      rejeetResult
                    );
                  }
                } catch (error) {
                  elizaLogger3.error(
                    `Error processing rejeet for jeet ${selectedJeet.id}:`,
                    error
                  );
                }
                break;
              case "quote":
                if (interaction.text) {
                  if (!this.isRunning) return;
                  await this.client.simsAIClient.quoteRejeet(
                    selectedJeet.id,
                    interaction.text
                  );
                  elizaLogger3.log(
                    `Quote rejeeted jeet ${selectedJeet.id}`
                  );
                  this.recordInteraction(
                    selectedJeet.id,
                    "quote"
                  );
                }
                break;
              case "reply":
                if (interaction.text) {
                  if (!this.isRunning) return;
                  const replyResponse = {
                    ...response,
                    text: interaction.text
                  };
                  const responseMessages = await sendJeet(
                    this.client,
                    replyResponse,
                    message.roomId,
                    this.client.profile.username,
                    selectedJeet.id
                  );
                  state = await this.runtime.updateRecentMessageState(
                    state
                  );
                  for (const [
                    idx,
                    responseMessage
                  ] of responseMessages.entries()) {
                    if (!this.isRunning) return;
                    responseMessage.content.action = idx === responseMessages.length - 1 ? response.action : "CONTINUE";
                    await this.runtime.messageManager.createMemory(
                      responseMessage
                    );
                  }
                  await this.runtime.evaluate(message, state);
                  await this.runtime.processActions(
                    message,
                    responseMessages,
                    state
                  );
                  this.recordInteraction(
                    selectedJeet.id,
                    "reply"
                  );
                }
                break;
              case "like":
                try {
                  if (!this.isRunning) return;
                  await this.client.simsAIClient.likeJeet(
                    selectedJeet.id
                  );
                  elizaLogger3.log(
                    `Liked jeet ${selectedJeet.id}`
                  );
                  this.recordInteraction(
                    selectedJeet.id,
                    "like"
                  );
                } catch (error) {
                  elizaLogger3.error(
                    `Error liking jeet ${selectedJeet.id}:`,
                    error
                  );
                }
                break;
              case "none":
                elizaLogger3.log(
                  `Chose not to interact with jeet ${selectedJeet.id}`
                );
                break;
            }
            elizaLogger3.log(
              `Successfully performed ${interaction.type} interaction for jeet ${selectedJeet.id}`
            );
          } catch (error) {
            elizaLogger3.error(
              `Error processing interaction ${interaction.type} for jeet ${selectedJeet.id}:`,
              error
            );
          }
        }
      }
      if (!this.isRunning) return;
      const responseInfo = `Context:

${context}

Selected Post: ${selectedJeet.id} - @${selectedJeet.agent?.username || "unknown"}: ${selectedJeet.text}
Agent's Output:
${JSON.stringify(response)}`;
      elizaLogger3.log(
        `Caching response info for jeet ${selectedJeet.id}`
      );
      await this.runtime.cacheManager.set(
        `jeeter/jeet_generation_${selectedJeet.id}.txt`,
        responseInfo
      );
      await wait();
      const interactionSummary = {
        jeetId: selectedJeet.id,
        liked: response.shouldLike,
        interactions: response.interactions.map((i) => i.type),
        replyText: response.text,
        quoteTexts: response.interactions.filter((i) => i.type === "quote").map((i) => i.text)
      };
      elizaLogger3.debug(
        `Interaction summary: ${JSON.stringify(interactionSummary)}`
      );
    } catch (error) {
      elizaLogger3.error(`Error generating/sending response: ${error}`);
      throw error;
    }
  }
  async buildJeetContext(selectedJeet) {
    if (!this.isRunning) return "";
    let context = `Original Post:
By @${selectedJeet.agent?.username || "unknown"}
${selectedJeet.text}`;
    if (selectedJeet.thread?.length) {
      const replyContext = selectedJeet.thread.filter(
        (reply) => reply.agent?.username !== this.runtime.getSetting("SIMSAI_USERNAME")
      ).map(
        (reply) => `@${reply.agent?.username || "unknown"}: ${reply.text}`
      ).join("\n");
      if (replyContext) {
        context += `
Replies to original post:
${replyContext}`;
      }
    }
    if (!this.isRunning) return "";
    if (selectedJeet.media?.length) {
      const imageDescriptions = [];
      for (const media of selectedJeet.media) {
        if (!this.isRunning) return "";
        if ("url" in media) {
          const imageDescriptionService = this.runtime.getService(
            ServiceType.IMAGE_DESCRIPTION
          );
          const description = await imageDescriptionService.describeImage(media.url);
          imageDescriptions.push(description);
        }
      }
      if (imageDescriptions.length > 0) {
        context += `
Media in Post (Described): ${imageDescriptions.join(", ")}`;
      }
    }
    if (selectedJeet.urls?.length) {
      context += `
URLs: ${selectedJeet.urls.join(", ")}`;
    }
    if (!this.isRunning) return "";
    if (selectedJeet.photos?.length) {
      const photoDescriptions = [];
      for (const photo of selectedJeet.photos) {
        if (!this.isRunning) return "";
        if (photo.url) {
          const imageDescriptionService = this.runtime.getService(
            ServiceType.IMAGE_DESCRIPTION
          );
          const description = await imageDescriptionService.describeImage(photo.url);
          photoDescriptions.push(description);
        }
      }
      if (photoDescriptions.length > 0) {
        context += `
Photos in Post (Described): ${photoDescriptions.join(", ")}`;
      }
    }
    if (selectedJeet.videos?.length) {
      context += `
Videos: ${selectedJeet.videos.length} video(s) attached`;
    }
    return context;
  }
};

// src/jeeter/interactions.ts
import {
  composeContext as composeContext3,
  generateMessageResponse as generateMessageResponse2,
  generateShouldRespond,
  shouldRespondFooter,
  ModelClass as ModelClass3,
  stringToUuid as stringToUuid4,
  elizaLogger as elizaLogger4
} from "@elizaos/core";
var jeeterMessageHandlerTemplate = JEETER_INTERACTION_BASE + JEETER_INTERACTION_MESSAGE_COMPLETION_FOOTER;
var jeeterShouldRespondTemplate = JEETER_SHOULD_RESPOND_BASE + shouldRespondFooter;
var JeeterInteractionClient = class {
  constructor(client, runtime) {
    this.client = client;
    this.runtime = runtime;
  }
  likedJeets = /* @__PURE__ */ new Set();
  rejeetedJeets = /* @__PURE__ */ new Set();
  quotedJeets = /* @__PURE__ */ new Set();
  repliedJeets = /* @__PURE__ */ new Set();
  isRunning = false;
  timeoutHandle;
  async hasInteracted(jeetId, type, inReplyToStatusId) {
    if (type === "reply" && inReplyToStatusId) {
      const parentJeet = await this.client.getJeet(inReplyToStatusId);
      if (parentJeet?.agentId === this.client.profile.id) {
        return false;
      }
    }
    switch (type) {
      case "like":
        return this.likedJeets.has(jeetId);
      case "rejeet":
        return this.rejeetedJeets.has(jeetId);
      case "quote":
        return this.quotedJeets.has(jeetId);
      case "reply":
        return this.repliedJeets.has(jeetId);
      default:
        return false;
    }
  }
  recordInteraction(jeetId, type) {
    switch (type) {
      case "like":
        this.likedJeets.add(jeetId);
        break;
      case "rejeet":
        this.rejeetedJeets.add(jeetId);
        break;
      case "quote":
        this.quotedJeets.add(jeetId);
        break;
      case "reply":
        this.repliedJeets.add(jeetId);
        break;
    }
  }
  async start() {
    if (this.isRunning) {
      elizaLogger4.warn("JeeterInteractionClient is already running");
      return;
    }
    this.isRunning = true;
    elizaLogger4.log("Starting Jeeter Interaction Client");
    const handleJeeterInteractionsLoop = async () => {
      if (!this.isRunning) {
        elizaLogger4.log("JeeterInteractionClient has been stopped");
        return;
      }
      try {
        await this.handleJeeterInteractions().catch((error) => {
          elizaLogger4.error("Error in interaction loop:", error);
        });
        const nextInterval = Math.floor(
          Math.random() * (MAX_INTERVAL - MIN_INTERVAL + 1)
        ) + MIN_INTERVAL;
        elizaLogger4.log(
          `Next check scheduled in ${nextInterval / 1e3} seconds`
        );
        this.timeoutHandle = setTimeout(() => {
          handleJeeterInteractionsLoop();
        }, nextInterval);
      } catch (error) {
        elizaLogger4.error("Error in loop scheduling:", error);
        if (this.isRunning) {
          this.timeoutHandle = setTimeout(
            () => {
              handleJeeterInteractionsLoop();
            },
            5 * 60 * 1e3
          );
        }
      }
    };
    handleJeeterInteractionsLoop();
  }
  async stop() {
    elizaLogger4.log("Stopping JeeterInteractionClient...");
    this.isRunning = false;
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = void 0;
    }
    this.likedJeets.clear();
    this.rejeetedJeets.clear();
    this.quotedJeets.clear();
    this.repliedJeets.clear();
    await new Promise((resolve) => setTimeout(resolve, 1e3));
    elizaLogger4.log("JeeterInteractionClient stopped successfully");
  }
  async handleJeeterInteractions() {
    elizaLogger4.log("Checking Jeeter interactions");
    try {
      const { username: jeeterUsername } = this.client.profile;
      elizaLogger4.log(
        `Fetching mentions and comments for @${jeeterUsername}`
      );
      const searchResponse = await this.client.fetchSearchJeets(
        `@${jeeterUsername}`,
        20
      );
      const homeTimeline = await this.getHomeTimeline();
      const commentsOnPosts = await this.getCommentsOnPosts(homeTimeline);
      const allInteractions = [
        ...searchResponse?.jeets || [],
        ...commentsOnPosts
      ];
      const uniqueJeets = Array.from(
        new Map(allInteractions.map((jeet) => [jeet.id, jeet])).values()
      ).sort((a, b) => a.id.localeCompare(b.id)).filter((jeet) => jeet.agentId !== this.client.profile.id);
      elizaLogger4.log(
        `Found ${uniqueJeets.length} unique interactions to process`
      );
      const interactionPromises = uniqueJeets.map(async (jeet) => {
        if (!this.isRunning) {
          elizaLogger4.log(
            "Stopping jeet processing due to client stop"
          );
          return;
        }
        elizaLogger4.log(
          "Processing interaction:",
          JSON.stringify(jeet)
        );
        if (!jeet.id) {
          elizaLogger4.warn("Skipping interaction without ID");
          return;
        }
        if (this.client.lastCheckedJeetId && parseInt(jeet.id) <= parseInt(this.client.lastCheckedJeetId)) {
          elizaLogger4.log(
            `Skipping already processed interaction ${jeet.id}`
          );
          return;
        }
        try {
          const roomId = stringToUuid4(
            `${jeet.conversationId ?? jeet.id}-${this.runtime.agentId}`
          );
          const userIdUUID = stringToUuid4(jeet.agentId);
          elizaLogger4.log(
            `Ensuring connection for user ${jeet.agent?.username}`
          );
          await this.runtime.ensureConnection(
            userIdUUID,
            roomId,
            jeet.agent?.username || "",
            jeet.agent?.name || "",
            "jeeter"
          );
          elizaLogger4.log(
            `Building conversation thread for interaction ${jeet.id}`
          );
          const thread = await buildConversationThread(
            jeet,
            this.client
          );
          const message = {
            content: { text: jeet.text },
            agentId: this.runtime.agentId,
            userId: userIdUUID,
            roomId
          };
          elizaLogger4.log(`Handling interaction ${jeet.id}`);
          await this.handleJeet({
            jeet,
            message,
            thread
          });
          this.client.lastCheckedJeetId = jeet.id;
          elizaLogger4.log(
            `Successfully processed interaction ${jeet.id}`
          );
        } catch (error) {
          elizaLogger4.error(
            `Error processing interaction ${jeet.id}:`,
            error
          );
          if (error instanceof Error) {
            elizaLogger4.error("Error details:", {
              message: error.message,
              stack: error.stack
            });
          }
        }
      });
      await Promise.all(interactionPromises);
      await this.client.cacheLatestCheckedJeetId();
      elizaLogger4.log("Finished checking Jeeter interactions");
    } catch (error) {
      elizaLogger4.error("Error in handleJeeterInteractions:", error);
      if (error instanceof Error) {
        elizaLogger4.error("Error details:", {
          message: error.message,
          stack: error.stack
        });
      }
    }
  }
  async getCommentsOnPosts(posts) {
    const comments = [];
    for (const post of posts) {
      try {
        if (!post.public_metrics?.reply_count) {
          continue;
        }
        elizaLogger4.log(`Fetching conversation for post ${post.id}`);
        const conversation = await this.client.simsAIClient.getJeetConversation(post.id);
        if (conversation) {
          const validComments = conversation.filter(
            (reply) => reply.id !== post.id && // Not the original post
            reply.agentId !== this.client.profile.id && // Not our own replies
            !reply.isRejeet
            // Not a rejeet
          ).sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
          });
          comments.push(...validComments);
        }
        await wait(1e3, 2e3);
      } catch (error) {
        elizaLogger4.error(
          `Error fetching comments for post ${post.id}:`,
          error
        );
      }
    }
    return comments;
  }
  async handleJeet({
    jeet,
    message,
    thread
  }) {
    elizaLogger4.log(`Starting handleJeet for ${jeet.id}`);
    if (this.runtime.getSetting("SIMSAI_DRY_RUN") === "true") {
      elizaLogger4.info(`Dry run: would have handled jeet: ${jeet.id}`);
      return {
        text: "",
        shouldLike: false,
        interactions: [],
        action: "IGNORE"
      };
    }
    try {
      if (!message.content.text) {
        elizaLogger4.log(`Skipping jeet ${jeet.id} - no text content`);
        return {
          text: "",
          shouldLike: false,
          interactions: [],
          action: "IGNORE"
        };
      }
      const homeTimeline = await this.getHomeTimeline();
      const formatJeet = (j) => `ID: ${j.id}
From: ${j.agent?.name || "Unknown"} (@${j.agent?.username || "Unknown"})
Text: ${j.text}`;
      const formattedHomeTimeline = homeTimeline.map((j) => `${formatJeet(j)}
---
`).join("\n");
      const formattedConversation = thread.map(
        (j) => `@${j.agent?.username || "unknown"} (${new Date(
          j.createdAt ? new Date(j.createdAt).getTime() : Date.now()
        ).toLocaleString()}): ${j.text}`
      ).join("\n\n");
      elizaLogger4.log("Composing state");
      let state = await this.runtime.composeState(message, {
        jeeterClient: this.client.simsAIClient,
        jeeterUserName: this.client.profile.username,
        currentPost: formatJeet(jeet),
        formattedConversation,
        timeline: `# ${this.runtime.character.name}'s Home Timeline

${formattedHomeTimeline}`
      });
      elizaLogger4.log("Checking if should respond");
      const shouldRespondContext = composeContext3({
        state,
        template: this.runtime.character?.templates?.jeeterShouldRespondTemplate || jeeterShouldRespondTemplate
      });
      const shouldRespond = await generateShouldRespond({
        runtime: this.runtime,
        context: shouldRespondContext,
        modelClass: ModelClass3.MEDIUM
      });
      if (shouldRespond !== "RESPOND") {
        elizaLogger4.log(`Not responding to jeet ${jeet.id}`);
        return {
          text: "Response Decision:",
          shouldLike: false,
          interactions: [],
          action: shouldRespond
        };
      }
      const jeetId = stringToUuid4(jeet.id + "-" + this.runtime.agentId);
      elizaLogger4.log(`Checking if memory exists for jeetId: ${jeetId}`);
      const jeetExists = await this.runtime.messageManager.getMemoryById(jeetId);
      elizaLogger4.log(`Memory exists: ${jeetExists}`);
      if (!jeetExists) {
        elizaLogger4.log(`Creating new memory for jeetId: ${jeetId}`);
        const memoryMessage = {
          id: jeetId,
          agentId: this.runtime.agentId,
          content: {
            text: jeet.text,
            inReplyTo: jeet.inReplyToStatusId ? stringToUuid4(
              jeet.inReplyToStatusId + "-" + this.runtime.agentId
            ) : void 0
          },
          userId: stringToUuid4(jeet.agentId),
          roomId: message.roomId,
          createdAt: jeet.createdAt ? new Date(jeet.createdAt).getTime() : Date.now()
        };
        await this.client.saveRequestMessage(memoryMessage, state);
      } else {
        elizaLogger4.log(
          `Already have memory interacting with this jeet: ${jeetId}`
        );
      }
      const context = composeContext3({
        state,
        template: this.runtime.character.templates?.jeeterMessageHandlerTemplate || this.runtime.character?.templates?.messageHandlerTemplate || jeeterMessageHandlerTemplate
      });
      const response = await generateMessageResponse2({
        runtime: this.runtime,
        context,
        modelClass: ModelClass3.MEDIUM
      });
      response.interactions = response.interactions || [];
      if (response.interactions.length > 0) {
        for (const interaction of response.interactions) {
          try {
            if (await this.hasInteracted(
              jeet.id,
              interaction.type,
              jeet.inReplyToStatusId
            )) {
              elizaLogger4.log(
                `Skipping ${interaction.type} for jeet ${jeet.id} - already performed`
              );
              continue;
            }
            switch (interaction.type) {
              case "like":
                try {
                  await this.client.simsAIClient.likeJeet(
                    jeet.id
                  );
                  this.recordInteraction(jeet.id, "like");
                } catch (error) {
                  elizaLogger4.error(
                    `Error liking interaction ${jeet.id}:`,
                    error
                  );
                }
                break;
              case "rejeet":
                try {
                  const rejeetResult = await this.client.simsAIClient.rejeetJeet(
                    jeet.id
                  );
                  if (rejeetResult?.id) {
                    elizaLogger4.log(
                      `Rejeeted jeet ${jeet.id}`
                    );
                    this.recordInteraction(
                      jeet.id,
                      "rejeet"
                    );
                  } else {
                    elizaLogger4.error(
                      `Failed to rejeet jeet ${jeet.id}: Invalid response`
                    );
                  }
                } catch (error) {
                  elizaLogger4.error(
                    `Error rejeeting jeet ${jeet.id}:`,
                    error
                  );
                }
                break;
              case "quote":
                if (interaction.text) {
                  await this.client.simsAIClient.quoteRejeet(
                    jeet.id,
                    interaction.text
                  );
                  elizaLogger4.log(
                    `Quote rejeeted jeet ${jeet.id}`
                  );
                  this.recordInteraction(jeet.id, "quote");
                }
                break;
              case "reply":
                if (interaction.text) {
                  const replyResponse = {
                    ...response,
                    text: interaction.text
                  };
                  const responseMessages = await sendJeet(
                    this.client,
                    replyResponse,
                    message.roomId,
                    this.client.profile.username,
                    jeet.id
                  );
                  state = await this.runtime.updateRecentMessageState(
                    state
                  );
                  for (const [
                    idx,
                    responseMessage
                  ] of responseMessages.entries()) {
                    responseMessage.content.action = idx === responseMessages.length - 1 ? response.action : "CONTINUE";
                    await this.runtime.messageManager.createMemory(
                      responseMessage
                    );
                  }
                  await this.runtime.evaluate(message, state);
                  await this.runtime.processActions(
                    message,
                    responseMessages,
                    state
                  );
                  this.recordInteraction(jeet.id, "reply");
                }
                break;
              case "none":
                elizaLogger4.log(
                  `Chose not to interact with jeet ${jeet.id}`
                );
                break;
            }
          } catch (error) {
            elizaLogger4.error(
              `Error processing interaction ${interaction.type} for jeet ${jeet.id}:`,
              error
            );
          }
        }
      }
      const responseInfo = `Context:

${context}

Selected Post: ${jeet.id} - @${jeet.agent?.username || "unknown"}: ${jeet.text}
Agent's Output:
${JSON.stringify(response)}`;
      await this.runtime.cacheManager.set(
        `jeeter/jeet_generation_${jeet.id}.txt`,
        responseInfo
      );
      await wait();
      const interactionSummary = {
        jeetId: jeet.id,
        liked: response.shouldLike,
        interactions: response.interactions.map((i) => i.type),
        replyText: response.text,
        quoteTexts: response.interactions.filter((i) => i.type === "quote").map((i) => i.text)
      };
      elizaLogger4.debug(
        `Interaction summary: ${JSON.stringify(interactionSummary)}`
      );
      return response;
    } catch (error) {
      elizaLogger4.error(`Error generating/sending response: ${error}`);
      throw error;
    }
  }
  async getHomeTimeline() {
    let homeTimeline = await this.client.getCachedTimeline();
    if (!homeTimeline) {
      elizaLogger4.log("Fetching home timeline");
      homeTimeline = await this.client.fetchHomeTimeline(50);
      await this.client.cacheTimeline(homeTimeline);
    }
    return homeTimeline;
  }
};

// src/index.ts
import { elizaLogger as elizaLogger8 } from "@elizaos/core";

// src/jeeter/environment.ts
import { elizaLogger as elizaLogger5 } from "@elizaos/core";

// ../../node_modules/zod/lib/index.mjs
var util;
(function(util2) {
  util2.assertEqual = (val) => val;
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
        fieldErrors[sub.path[0]].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var overrideErrorMap = errorMap;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}
var makeIssue = (params) => {
  const { data, path, errorMaps, issueData } = params;
  const fullPath = [...path, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === errorMap ? void 0 : errorMap
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message === null || message === void 0 ? void 0 : message.message;
})(errorUtil || (errorUtil = {}));
var _ZodEnum_cache;
var _ZodNativeEnum_cache;
var ParseInputLazyPath = class {
  constructor(parent, value, path, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (this._key instanceof Array) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    var _a, _b;
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message !== null && message !== void 0 ? message : ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: (_a = message !== null && message !== void 0 ? message : required_error) !== null && _a !== void 0 ? _a : ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: (_b = message !== null && message !== void 0 ? message : invalid_type_error) !== null && _b !== void 0 ? _b : ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    var _a;
    const ctx = {
      common: {
        issues: [],
        async: (_a = params === null || params === void 0 ? void 0 : params.async) !== null && _a !== void 0 ? _a : false,
        contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap
      },
      path: (params === null || params === void 0 ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    var _a, _b;
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if ((_b = (_a = err === null || err === void 0 ? void 0 : err.message) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === null || _b === void 0 ? void 0 : _b.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params === null || params === void 0 ? void 0 : params.errorMap,
        async: true
      },
      path: (params === null || params === void 0 ? void 0 : params.path) || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let regex = `([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d`;
  if (args.precision) {
    regex = `${regex}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    regex = `${regex}(\\.\\d+)?`;
  }
  return regex;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if (!decoded.typ || !decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch (_a) {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch (_a) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    var _a, _b;
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
      offset: (_a = options === null || options === void 0 ? void 0 : options.offset) !== null && _a !== void 0 ? _a : false,
      local: (_b = options === null || options === void 0 ? void 0 : options.local) !== null && _b !== void 0 ? _b : false,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof (options === null || options === void 0 ? void 0 : options.precision) === "undefined" ? null : options === null || options === void 0 ? void 0 : options.precision,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options === null || options === void 0 ? void 0 : options.position,
      ...errorUtil.errToObj(options === null || options === void 0 ? void 0 : options.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  var _a;
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / Math.pow(10, decCount);
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null, min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch (_a) {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  var _a;
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: (_a = params === null || params === void 0 ? void 0 : params.coerce) !== null && _a !== void 0 ? _a : false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: (params === null || params === void 0 ? void 0 : params.coerce) || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    return this._cached = { shape, keys };
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") ;
      else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          var _a, _b, _c, _d;
          const defaultError = (_c = (_b = (_a = this._def).errorMap) === null || _b === void 0 ? void 0 : _b.call(_a, issue, ctx).message) !== null && _c !== void 0 ? _c : ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: (_d = errorUtil.errToObj(message).message) !== null && _d !== void 0 ? _d : defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    util.objectKeys(mask).forEach((key) => {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    util.objectKeys(this.shape).forEach((key) => {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    util.objectKeys(this.shape).forEach((key) => {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    util.objectKeys(this.shape).forEach((key) => {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    });
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          errorMap
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [
          ctx.common.contextualErrorMap,
          ctx.schemaErrorMap,
          getErrorMap(),
          errorMap
        ].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  constructor() {
    super(...arguments);
    _ZodEnum_cache.set(this, void 0);
  }
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodEnum_cache, new Set(this._def.values), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodEnum_cache, "f").has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
_ZodEnum_cache = /* @__PURE__ */ new WeakMap();
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  constructor() {
    super(...arguments);
    _ZodNativeEnum_cache.set(this, void 0);
  }
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f")) {
      __classPrivateFieldSet(this, _ZodNativeEnum_cache, new Set(util.getValidEnumValues(this._def.values)), "f");
    }
    if (!__classPrivateFieldGet(this, _ZodNativeEnum_cache, "f").has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
_ZodNativeEnum_cache = /* @__PURE__ */ new WeakMap();
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return base;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return base;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({ status: status.value, value: result }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function custom(check, params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      var _a, _b;
      if (!check(data)) {
        const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
        const _fatal = (_b = (_a = p.fatal) !== null && _a !== void 0 ? _a : fatal) !== null && _b !== void 0 ? _b : true;
        const p2 = typeof p === "string" ? { message: p } : p;
        ctx.addIssue({ code: "custom", ...p2, fatal: _fatal });
      }
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: (arg) => ZodString.create({ ...arg, coerce: true }),
  number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
  boolean: (arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  }),
  bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
  date: (arg) => ZodDate.create({ ...arg, coerce: true })
};
var NEVER = INVALID;
var z = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  defaultErrorMap: errorMap,
  setErrorMap,
  getErrorMap,
  makeIssue,
  EMPTY_PATH,
  addIssueToContext,
  ParseStatus,
  INVALID,
  DIRTY,
  OK,
  isAborted,
  isDirty,
  isValid,
  isAsync,
  get util() {
    return util;
  },
  get objectUtil() {
    return objectUtil;
  },
  ZodParsedType,
  getParsedType,
  ZodType,
  datetimeRegex,
  ZodString,
  ZodNumber,
  ZodBigInt,
  ZodBoolean,
  ZodDate,
  ZodSymbol,
  ZodUndefined,
  ZodNull,
  ZodAny,
  ZodUnknown,
  ZodNever,
  ZodVoid,
  ZodArray,
  ZodObject,
  ZodUnion,
  ZodDiscriminatedUnion,
  ZodIntersection,
  ZodTuple,
  ZodRecord,
  ZodMap,
  ZodSet,
  ZodFunction,
  ZodLazy,
  ZodLiteral,
  ZodEnum,
  ZodNativeEnum,
  ZodPromise,
  ZodEffects,
  ZodTransformer: ZodEffects,
  ZodOptional,
  ZodNullable,
  ZodDefault,
  ZodCatch,
  ZodNaN,
  BRAND,
  ZodBranded,
  ZodPipeline,
  ZodReadonly,
  custom,
  Schema: ZodType,
  ZodSchema: ZodType,
  late,
  get ZodFirstPartyTypeKind() {
    return ZodFirstPartyTypeKind;
  },
  coerce,
  any: anyType,
  array: arrayType,
  bigint: bigIntType,
  boolean: booleanType,
  date: dateType,
  discriminatedUnion: discriminatedUnionType,
  effect: effectsType,
  "enum": enumType,
  "function": functionType,
  "instanceof": instanceOfType,
  intersection: intersectionType,
  lazy: lazyType,
  literal: literalType,
  map: mapType,
  nan: nanType,
  nativeEnum: nativeEnumType,
  never: neverType,
  "null": nullType,
  nullable: nullableType,
  number: numberType,
  object: objectType,
  oboolean,
  onumber,
  optional: optionalType,
  ostring,
  pipeline: pipelineType,
  preprocess: preprocessType,
  promise: promiseType,
  record: recordType,
  set: setType,
  strictObject: strictObjectType,
  string: stringType,
  symbol: symbolType,
  transformer: effectsType,
  tuple: tupleType,
  "undefined": undefinedType,
  union: unionType,
  unknown: unknownType,
  "void": voidType,
  NEVER,
  ZodIssueCode,
  quotelessJson,
  ZodError
});

// src/jeeter/environment.ts
var jeeterEnvSchema = z.object({
  SIMSAI_USERNAME: z.string().min(1, "SimsAI username is required"),
  SIMSAI_AGENT_ID: z.string().min(1, "SimsAI agent ID is required"),
  SIMSAI_API_KEY: z.string().min(1, "SimsAI API key is required"),
  SIMSAI_DRY_RUN: z.string().optional().default("false").transform((val) => val.toLowerCase() === "true" || val === "1")
});
async function validateJeeterConfig(runtime) {
  const requiredEnvVars = [
    "SIMSAI_USERNAME",
    "SIMSAI_AGENT_ID",
    "SIMSAI_API_KEY"
  ];
  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !(runtime.getSetting(envVar) || process.env[envVar])
  );
  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingEnvVars.join(", ")}`
    );
  }
  try {
    const config = {
      SIMSAI_DRY_RUN: runtime.getSetting("SIMSAI_DRY_RUN") || process.env.SIMSAI_DRY_RUN,
      SIMSAI_USERNAME: runtime.getSetting("SIMSAI_USERNAME") || process.env.SIMSAI_USERNAME,
      SIMSAI_AGENT_ID: runtime.getSetting("SIMSAI_AGENT_ID") || process.env.SIMSAI_AGENT_ID,
      SIMSAI_API_KEY: runtime.getSetting("SIMSAI_API_KEY") || process.env.SIMSAI_API_KEY
    };
    return jeeterEnvSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("\n");
      elizaLogger5.error(
        `SimsAI configuration validation failed:
${errorMessages}`
      );
    }
    throw error;
  }
}

// src/jeeter/base.ts
import {
  getEmbeddingZeroVector as getEmbeddingZeroVector3,
  elizaLogger as elizaLogger7,
  stringToUuid as stringToUuid5
} from "@elizaos/core";
import { EventEmitter as EventEmitter2 } from "events";

// src/jeeter/client.ts
import { EventEmitter } from "events";
import { elizaLogger as elizaLogger6 } from "@elizaos/core";
var SimsAIClient = class extends EventEmitter {
  apiKey;
  baseUrl;
  agentId;
  profile;
  constructor(apiKey, agentId, profile) {
    super();
    this.apiKey = apiKey;
    this.agentId = agentId;
    this.baseUrl = SIMSAI_API_URL.replace(/\/$/, "");
    this.profile = profile;
  }
  isRateLimitError(error) {
    return error?.statusCode === 429;
  }
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const maxRetries = 3;
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            ...options.headers
          },
          credentials: "include"
        });
        if (!response.ok) {
          const error = new Error(
            `SimsAI API error: ${response.statusText} (${response.status})`
          );
          error.statusCode = response.status;
          error.endpoint = endpoint;
          throw error;
        }
        return await response.json();
      } catch (error) {
        elizaLogger6.error(`Error in makeRequest to ${endpoint}:`, {
          message: error.message,
          stack: error.stack,
          endpoint,
          options
        });
        if (error && this.isRateLimitError(error)) {
          const waitTime = Math.pow(2, attempt) * 1e3;
          elizaLogger6.warn(
            `Rate limit hit for endpoint ${endpoint}, retrying in ${waitTime}ms`
          );
          await wait(waitTime);
          attempt++;
          continue;
        }
        throw error;
      }
    }
  }
  updateProfile(profile) {
    this.profile = profile;
  }
  async getAgent(agentId) {
    return await this.makeRequest(`/agents/${agentId}`);
  }
  async getJeet(jeetId) {
    return await this.makeRequest(`/public/jeets/${jeetId}`);
  }
  async getJeetConversation(jeetId) {
    const response = await this.makeRequest(
      `/jeets/${jeetId}/conversation`
    );
    return response.data.map((jeet) => {
      const author = response.includes.users.find(
        (user) => user.id === jeet.author_id
      );
      return {
        id: jeet.id,
        text: jeet.text,
        createdAt: jeet.created_at,
        agentId: jeet.author_id,
        inReplyToStatusId: jeet.in_reply_to_status_id,
        agent: author ? {
          id: author.id,
          name: author.name,
          username: author.username,
          type: author.type,
          avatar_url: author.avatar_url
        } : void 0,
        public_metrics: jeet.public_metrics,
        media: [],
        hashtags: [],
        mentions: [],
        photos: [],
        thread: [],
        urls: [],
        videos: []
      };
    });
  }
  async getHomeTimeline(count, cursor) {
    return await this.makeRequest(
      `/public/agents/${this.agentId}/jeets?limit=${count}${cursor ? `&cursor=${cursor}` : ""}`
    );
  }
  async getDiscoveryTimeline(count) {
    return await this.makeRequest(
      `/public/timeline?limit=${count}`
    );
  }
  async searchJeets(query, maxResults = 10) {
    const params = new URLSearchParams({
      query,
      max_results: Math.min(maxResults, 100).toString()
    });
    const response = await this.makeRequest(
      `/jeets/search/recent?${params.toString()}`
    );
    const jeets = response.data.map((jeet) => {
      const author = response.includes.users.find(
        (user) => user.id === jeet.author_id
      );
      return {
        id: jeet.id,
        text: jeet.text,
        type: "jeet",
        createdAt: jeet.created_at,
        agentId: jeet.author_id,
        agent: author ? {
          id: author.id,
          name: author.name,
          username: author.username,
          type: author.type,
          avatar_url: author.avatar_url
        } : void 0,
        public_metrics: jeet.public_metrics,
        media: [],
        hashtags: [],
        mentions: [],
        photos: [],
        thread: [],
        urls: [],
        videos: []
      };
    });
    return {
      jeets,
      nextCursor: response.meta?.result_count > maxResults ? response.data[response.data.length - 1]?.created_at : void 0
    };
  }
  async getMentions(maxResults = 20) {
    try {
      return await this.searchJeets(
        `@${this.profile.username}`,
        maxResults
      );
    } catch (error) {
      elizaLogger6.error("Error fetching mentions:", error);
      return { jeets: [] };
    }
  }
  async postJeet(text, inReplyToJeetId, mediaUrls, quoteJeetId) {
    const payload = {
      text,
      ...inReplyToJeetId && {
        reply: {
          in_reply_to_jeet_id: inReplyToJeetId
        }
      },
      ...mediaUrls?.length && { media_urls: mediaUrls },
      ...quoteJeetId && { quote_jeet_id: quoteJeetId }
    };
    return await this.makeRequest("/jeets", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
  async likeJeet(jeetId) {
    const response = await this.makeRequest("/likes", {
      method: "POST",
      body: JSON.stringify({ jeetId })
    });
    return response.data.liked;
  }
  async rejeetJeet(jeetId) {
    const response = await this.makeRequest(
      `/jeets/${jeetId}/rejeets`,
      {
        method: "POST"
      }
    );
    return {
      id: response.data.id,
      createdAt: response.data.created_at,
      agentId: response.data.author_id,
      type: "rejeet",
      media: [],
      hashtags: [],
      mentions: [],
      photos: [],
      thread: [],
      urls: [],
      videos: []
    };
  }
  async quoteRejeet(jeetId, text) {
    return await this.makeRequest("/jeets", {
      method: "POST",
      body: JSON.stringify({
        text,
        quote_jeet_id: jeetId
      })
    });
  }
};

// src/jeeter/base.ts
var RequestQueue = class {
  queue = [];
  processing = false;
  async add(request) {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }
  async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    this.processing = true;
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      try {
        await request();
      } catch (error) {
        console.error("Error processing request:", error);
        this.queue.unshift(request);
        await this.exponentialBackoff(this.queue.length);
      }
      await this.randomDelay();
    }
    this.processing = false;
  }
  async exponentialBackoff(retryCount) {
    const delay = Math.pow(2, retryCount) * 1e3;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  async randomDelay() {
    const delay = Math.floor(Math.random() * 2e3) + 1500;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
};
var ClientBase = class _ClientBase extends EventEmitter2 {
  static _simsAIClients = {};
  simsAIClient;
  runtime;
  directions;
  lastCheckedJeetId = null;
  imageDescriptionService;
  temperature = 0.5;
  requestQueue = new RequestQueue();
  profile;
  callback = () => {
  };
  constructor(runtime) {
    super();
    this.runtime = runtime;
    const userId = this.runtime.getSetting("SIMSAI_AGENT_ID");
    if (_ClientBase._simsAIClients[userId]) {
      this.simsAIClient = _ClientBase._simsAIClients[userId];
    } else {
      const apiKey = this.runtime.getSetting("SIMSAI_API_KEY");
      if (!apiKey) {
        throw new Error("SimsAI API key not configured");
      }
      this.simsAIClient = new SimsAIClient(apiKey, userId);
      _ClientBase._simsAIClients[userId] = this.simsAIClient;
    }
    this.directions = "- " + this.runtime.character.style.all.join("\n- ") + "- " + this.runtime.character.style.post.join();
  }
  async init() {
    const userId = this.runtime.getSetting("SIMSAI_AGENT_ID");
    if (!userId) {
      throw new Error("SimsAI userId not configured");
    }
    elizaLogger7.log("Initializing SimsAI client");
    this.profile = await this.fetchProfile(userId);
    if (this.profile) {
      elizaLogger7.log("SimsAI user ID:", this.profile.id);
      const simsaiProfile = {
        id: this.profile.id,
        username: this.profile.username,
        screenName: this.profile.name,
        bio: this.profile.bio
      };
      this.runtime.character.simsaiProfile = simsaiProfile;
      this.simsAIClient.updateProfile(simsaiProfile);
    } else {
      throw new Error("Failed to load profile");
    }
    await this.loadLatestCheckedJeetId();
    await this.populateTimeline();
  }
  async cacheJeet(jeet) {
    if (!jeet) {
      console.warn("Jeet is undefined, skipping cache");
      return;
    }
    await this.runtime.cacheManager.set(`jeeter/jeets/${jeet.id}`, jeet);
  }
  async getCachedJeet(jeetId) {
    return await this.runtime.cacheManager.get(
      `jeeter/jeets/${jeetId}`
    );
  }
  async getJeet(jeetId) {
    const cachedJeet = await this.getCachedJeet(jeetId);
    if (cachedJeet) return cachedJeet;
    const jeet = await this.requestQueue.add(
      () => this.simsAIClient.getJeet(jeetId)
    );
    await this.cacheJeet(jeet);
    return jeet;
  }
  async fetchHomeTimeline(count) {
    elizaLogger7.debug("fetching home timeline");
    const response = await this.simsAIClient.getHomeTimeline(count);
    return response.jeets || [];
  }
  async fetchDiscoveryTimeline(count) {
    elizaLogger7.debug("fetching discovery timeline");
    const response = await this.simsAIClient.getDiscoveryTimeline(count);
    return response.jeets || [];
  }
  async fetchSearchJeets(query, maxResults = 20, startTime, endTime) {
    try {
      const timeoutPromise = new Promise(
        (resolve) => setTimeout(
          () => resolve({
            jeets: [],
            nextCursor: ""
          }),
          1e4
        )
      );
      const result = await this.requestQueue.add(
        async () => await Promise.race([
          this.simsAIClient.searchJeets(query, maxResults),
          timeoutPromise
        ])
      );
      return {
        jeets: result.jeets || [],
        pagination: {
          next_cursor: result.nextCursor || "",
          has_more: Boolean(result.nextCursor)
        }
      };
    } catch (error) {
      elizaLogger7.error("Error fetching search jeets:", error);
      return {
        jeets: [],
        pagination: { next_cursor: "", has_more: false }
      };
    }
  }
  async populateTimeline() {
    elizaLogger7.debug("populating timeline...");
    const cachedTimeline = await this.getCachedTimeline();
    if (cachedTimeline) {
      const existingMemories = await this.getExistingMemories(cachedTimeline);
      const existingMemoryIds = new Set(
        existingMemories.map((memory) => memory.id.toString())
      );
      if (await this.processCachedTimeline(
        cachedTimeline,
        existingMemoryIds
      )) {
        return;
      }
    }
    const timeline = await this.fetchHomeTimeline(cachedTimeline ? 10 : 50);
    const mentionsResponse = await this.requestQueue.add(async () => {
      const mentions = await this.simsAIClient.getMentions(20);
      const mentionJeets = await Promise.all(
        (mentions.jeets || []).map(async (jeet) => {
          try {
            return await this.getJeet(jeet.id);
          } catch (error) {
            elizaLogger7.error(
              `Error fetching jeet ${jeet.id}:`,
              error
            );
            return null;
          }
        })
      );
      const validMentionJeets = mentionJeets.filter(
        (jeet) => jeet !== null
      );
      return {
        jeets: validMentionJeets
      };
    });
    const allJeets = [...timeline, ...mentionsResponse.jeets || []];
    await this.processNewJeets(allJeets);
    await this.cacheTimeline(timeline);
    await this.cacheMentions(mentionsResponse.jeets);
  }
  async getExistingMemories(jeets) {
    return await this.runtime.messageManager.getMemoriesByRoomIds({
      roomIds: jeets.map(
        (jeet) => stringToUuid5(jeet.id + "-" + this.runtime.agentId)
      )
    });
  }
  async processCachedTimeline(timeline, existingMemoryIds) {
    const jeetsToSave = timeline.filter(
      (jeet) => !existingMemoryIds.has(
        stringToUuid5(jeet.id + "-" + this.runtime.agentId)
      )
    );
    if (jeetsToSave.length > 0) {
      await this.processNewJeets(jeetsToSave);
      elizaLogger7.log(
        `Populated ${jeetsToSave.length} missing jeets from cache.`
      );
      return true;
    }
    return false;
  }
  async processNewJeets(jeets) {
    const validJeets = jeets.filter((jeet) => jeet && jeet.id);
    const roomIds = /* @__PURE__ */ new Set();
    validJeets.forEach((jeet) => {
      if (jeet.id) {
        roomIds.add(stringToUuid5(jeet.id + "-" + this.runtime.agentId));
      }
    });
    const existingMemories = await this.runtime.messageManager.getMemoriesByRoomIds({
      roomIds: Array.from(roomIds)
    });
    const existingMemoryIds = new Set(
      existingMemories.map((memory) => memory.id)
    );
    const jeetsToSave = validJeets.filter(
      (jeet) => jeet.id && !existingMemoryIds.has(
        stringToUuid5(jeet.id + "-" + this.runtime.agentId)
      )
    );
    if (this.profile?.id) {
      await this.runtime.ensureUserExists(
        this.runtime.agentId,
        this.profile.id,
        this.runtime.character.name,
        "simsai"
      );
    }
    for (const jeet of jeetsToSave) {
      await this.saveJeetAsMemory(jeet);
    }
  }
  async saveJeetAsMemory(jeet) {
    if (!jeet.id) {
      elizaLogger7.error("No valid ID found for jeet:", jeet);
      return;
    }
    const roomId = stringToUuid5(jeet.id + "-" + this.runtime.agentId);
    const userId = stringToUuid5(jeet.agentId || jeet.userId);
    if (jeet.agent) {
      await this.runtime.ensureConnection(
        userId,
        roomId,
        jeet.agent.username,
        jeet.agent.name,
        "jeeter"
      );
    }
    const content = {
      text: jeet.text || "",
      url: jeet.permanentUrl,
      source: "simsai",
      inReplyTo: jeet.inReplyToStatusId ? stringToUuid5(
        jeet.inReplyToStatusId + "-" + this.runtime.agentId
      ) : void 0
    };
    await this.runtime.messageManager.createMemory({
      id: stringToUuid5(jeet.id + "-" + this.runtime.agentId),
      userId,
      content,
      agentId: this.runtime.agentId,
      roomId,
      embedding: getEmbeddingZeroVector3(),
      createdAt: jeet.createdAt ? new Date(jeet.createdAt).getTime() : Date.now()
    });
    await this.cacheJeet(jeet);
  }
  async saveRequestMessage(message, state) {
    if (message.content.text) {
      const recentMessage = await this.runtime.messageManager.getMemories(
        {
          roomId: message.roomId,
          count: 1,
          unique: false
        }
      );
      if (recentMessage.length > 0 && recentMessage[0].content === message.content) {
        elizaLogger7.debug("Message already saved", recentMessage[0].id);
      } else {
        await this.runtime.messageManager.createMemory({
          ...message,
          embedding: getEmbeddingZeroVector3()
        });
      }
      await this.runtime.evaluate(message, {
        ...state,
        simsAIClient: this.simsAIClient
      });
    }
  }
  async loadLatestCheckedJeetId() {
    this.lastCheckedJeetId = await this.runtime.cacheManager.get(
      `jeeter/${this.profile?.id}/latest_checked_jeet_id`
    );
  }
  async cacheLatestCheckedJeetId() {
    if (this.lastCheckedJeetId && this.profile?.id) {
      await this.runtime.cacheManager.set(
        `jeeter/${this.profile.id}/latest_checked_jeet_id`,
        this.lastCheckedJeetId
      );
    }
  }
  async getCachedTimeline() {
    return this.profile?.id ? await this.runtime.cacheManager.get(
      `jeeter/${this.profile.id}/timeline`
    ) : void 0;
  }
  async cacheTimeline(timeline) {
    if (this.profile?.id) {
      await this.runtime.cacheManager.set(
        `jeeter/${this.profile.id}/timeline`,
        timeline,
        { expires: 10 * 1e3 }
      );
    }
  }
  async cacheMentions(mentions) {
    if (this.profile?.id) {
      await this.runtime.cacheManager.set(
        `jeeter/${this.profile.id}/mentions`,
        mentions,
        { expires: 10 * 1e3 }
      );
    }
  }
  async getCachedProfile(userId) {
    return await this.runtime.cacheManager.get(
      `jeeter/${userId}/profile`
    );
  }
  async cacheProfile(profile) {
    await this.runtime.cacheManager.set(
      `jeeter/${profile.id}/profile`,
      profile
    );
  }
  async fetchProfile(userId) {
    const cached = await this.getCachedProfile(userId);
    if (cached) return cached;
    try {
      const profile = await this.requestQueue.add(async () => {
        const response = await this.simsAIClient.getAgent(userId);
        const agent = {
          id: response.id,
          builder_id: response.builder_id,
          username: response.username,
          name: response.name || this.runtime.character.name,
          bio: response.bio || (typeof this.runtime.character.bio === "string" ? this.runtime.character.bio : this.runtime.character.bio[0] || ""),
          avatar_url: response.avatar_url,
          created_at: response.created_at,
          updated_at: response.updated_at
        };
        return agent;
      });
      await this.cacheProfile(profile);
      return profile;
    } catch (error) {
      elizaLogger7.error("Error fetching SimsAI profile:", error);
      throw error;
    }
  }
  onReady() {
    throw new Error(
      "Not implemented in base class, please call from subclass"
    );
  }
};

// src/index.ts
var SimsAIManager = class {
  client;
  post;
  search;
  interaction;
  constructor(runtime) {
    this.client = new ClientBase(runtime);
    this.post = new JeeterPostClient(this.client, runtime);
    this.search = new JeeterSearchClient(this.client, runtime);
    this.interaction = new JeeterInteractionClient(this.client, runtime);
  }
};
var activeManager = null;
var JeeterClientInterface = {
  async start(runtime) {
    if (activeManager) {
      elizaLogger8.warn("SimsAI client already started");
      return activeManager;
    }
    await validateJeeterConfig(runtime);
    elizaLogger8.log("SimsAI client started");
    activeManager = new SimsAIManager(runtime);
    await activeManager.client.init();
    await activeManager.post.start();
    await activeManager.search.start();
    await activeManager.interaction.start();
    return activeManager;
  },
  async stop(_runtime) {
    elizaLogger8.log("Stopping SimsAI client");
    if (activeManager) {
      try {
        await activeManager.interaction.stop();
        await activeManager.search.stop();
        await activeManager.post.stop();
        activeManager = null;
        elizaLogger8.log("SimsAI client stopped successfully");
      } catch (error) {
        elizaLogger8.error("Error stopping SimsAI client:", error);
        throw error;
      }
    }
    elizaLogger8.log("SimsAI client stopped");
  }
};
var index_default = JeeterClientInterface;
export {
  JeeterClientInterface,
  index_default as default
};
//# sourceMappingURL=index.js.map