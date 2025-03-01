// src/index.ts
import {
  getEmbeddingZeroVector as getEmbeddingZeroVector3,
  stringToUuid as stringToUuid3,
  elizaLogger as elizaLogger4
} from "@elizaos/core";
import {
  Client,
  Events,
  GatewayIntentBits,
  Partials
} from "discord.js";
import { EventEmitter as EventEmitter2 } from "events";

// src/actions/chat_with_attachments.ts
import { composeContext, getModelSettings } from "@elizaos/core";
import { generateText, trimTokens } from "@elizaos/core";
import { parseJSONObjectFromText } from "@elizaos/core";
import {
  ModelClass
} from "@elizaos/core";
import * as fs from "fs";
var summarizationTemplate = `# Summarized so far (we are adding to this)
{{currentSummary}}

# Current attachments we are summarizing
{{attachmentsWithText}}

Summarization objective: {{objective}}

# Instructions: Summarize the attachments. Return the summary. Do not acknowledge this request, just summarize and continue the existing summary if there is one. Capture any important details based on the objective. Only respond with the new summary text.`;
var attachmentIdsTemplate = `# Messages we are summarizing
{{recentMessages}}

# Instructions: {{senderName}} is requesting a summary of specific attachments. Your goal is to determine their objective, along with the list of attachment IDs to summarize.
The "objective" is a detailed description of what the user wants to summarize based on the conversation.
The "attachmentIds" is an array of attachment IDs that the user wants to summarize. If not specified, default to including all attachments from the conversation.

Your response must be formatted as a JSON block with this structure:
\`\`\`json
{
  "objective": "<What the user wants to summarize>",
  "attachmentIds": ["<Attachment ID 1>", "<Attachment ID 2>", ...]
}
\`\`\`
`;
var getAttachmentIds = async (runtime, message, state) => {
  state = await runtime.composeState(message);
  const context = composeContext({
    state,
    template: attachmentIdsTemplate
  });
  for (let i = 0; i < 5; i++) {
    const response = await generateText({
      runtime,
      context,
      modelClass: ModelClass.SMALL
    });
    console.log("response", response);
    const parsedResponse = parseJSONObjectFromText(response);
    if (parsedResponse?.objective && parsedResponse?.attachmentIds) {
      return parsedResponse;
    }
  }
  return null;
};
var summarizeAction = {
  name: "CHAT_WITH_ATTACHMENTS",
  similes: [
    "CHAT_WITH_ATTACHMENT",
    "SUMMARIZE_FILES",
    "SUMMARIZE_FILE",
    "SUMMARIZE_ATACHMENT",
    "CHAT_WITH_PDF",
    "ATTACHMENT_SUMMARY",
    "RECAP_ATTACHMENTS",
    "SUMMARIZE_FILE",
    "SUMMARIZE_VIDEO",
    "SUMMARIZE_AUDIO",
    "SUMMARIZE_IMAGE",
    "SUMMARIZE_DOCUMENT",
    "SUMMARIZE_LINK",
    "ATTACHMENT_SUMMARY",
    "FILE_SUMMARY"
  ],
  description: "Answer a user request informed by specific attachments based on their IDs. If a user asks to chat with a PDF, or wants more specific information about a link or video or anything else they've attached, this is the action to use.",
  validate: async (_runtime, message, _state) => {
    if (message.content.source !== "discord") {
      return false;
    }
    const keywords = [
      "attachment",
      "summary",
      "summarize",
      "research",
      "pdf",
      "video",
      "audio",
      "image",
      "document",
      "link",
      "file",
      "attachment",
      "summarize",
      "code",
      "report",
      "write",
      "details",
      "information",
      "talk",
      "chat",
      "read",
      "listen",
      "watch"
    ];
    return keywords.some(
      (keyword) => message.content.text.toLowerCase().includes(keyword.toLowerCase())
    );
  },
  handler: async (runtime, message, state, options, callback) => {
    state = await runtime.composeState(message);
    const callbackData = {
      text: "",
      // fill in later
      action: "CHAT_WITH_ATTACHMENTS_RESPONSE",
      source: message.content.source,
      attachments: []
    };
    const attachmentData = await getAttachmentIds(runtime, message, state);
    if (!attachmentData) {
      console.error("Couldn't get attachment IDs from message");
      return;
    }
    const { objective, attachmentIds } = attachmentData;
    const attachments = state.recentMessagesData.filter(
      (msg) => msg.content.attachments && msg.content.attachments.length > 0
    ).flatMap((msg) => msg.content.attachments).filter(
      (attachment) => attachmentIds.map((attch) => attch.toLowerCase().slice(0, 5)).includes(attachment.id.toLowerCase().slice(0, 5)) || // or check the other way
      attachmentIds.some((id) => {
        const attachmentId = id.toLowerCase().slice(0, 5);
        return attachment.id.toLowerCase().includes(attachmentId);
      })
    );
    const attachmentsWithText = attachments.map((attachment) => `# ${attachment.title}
${attachment.text}`).join("\n\n");
    let currentSummary = "";
    const modelSettings = getModelSettings(
      runtime.character.modelProvider,
      ModelClass.SMALL
    );
    const chunkSize = modelSettings.maxOutputTokens;
    state.attachmentsWithText = attachmentsWithText;
    state.objective = objective;
    const template = await trimTokens(
      summarizationTemplate,
      chunkSize + 500,
      runtime
    );
    const context = composeContext({
      state,
      // make sure it fits, we can pad the tokens a bit
      // Get the model's tokenizer based on the current model being used
      template
    });
    const summary = await generateText({
      runtime,
      context,
      modelClass: ModelClass.SMALL
    });
    currentSummary = currentSummary + "\n" + summary;
    if (!currentSummary) {
      console.error("No summary found, that's not good!");
      return;
    }
    callbackData.text = currentSummary.trim();
    if (callbackData.text && (currentSummary.trim()?.split("\n").length < 4 || currentSummary.trim()?.split(" ").length < 100)) {
      callbackData.text = `Here is the summary:
\`\`\`md
${currentSummary.trim()}
\`\`\`
`;
      await callback(callbackData);
    } else if (currentSummary.trim()) {
      const summaryFilename = `content/summary_${Date.now()}.md`;
      try {
        console.log("Creating summary file:", {
          filename: summaryFilename,
          summaryLength: currentSummary.length
        });
        await fs.promises.writeFile(
          summaryFilename,
          currentSummary,
          "utf8"
        );
        console.log("File written successfully");
        await runtime.cacheManager.set(summaryFilename, currentSummary);
        console.log("Cache set operation completed");
        await callback(
          {
            ...callbackData,
            text: `I've attached the summary of the requested attachments as a text file.`
          },
          [summaryFilename]
        );
        console.log("Callback completed with summary file");
      } catch (error) {
        console.error("Error in file/cache process:", error);
        throw error;
      }
    } else {
      console.warn(
        "Empty response from chat with attachments action, skipping"
      );
    }
    return callbackData;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Can you summarize the attachments b3e23, c4f67, and d5a89?"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Sure thing! I'll pull up those specific attachments and provide a summary of their content.",
          action: "CHAT_WITH_ATTACHMENTS"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "I need a technical summary of the PDFs I sent earlier - a1b2c3.pdf, d4e5f6.pdf, and g7h8i9.pdf"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'll take a look at those specific PDF attachments and put together a technical summary for you. Give me a few minutes to review them.",
          action: "CHAT_WITH_ATTACHMENTS"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Can you watch this video for me and tell me which parts you think are most relevant to the report I'm writing? (the one I attached in my last message)"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "sure, no problem.",
          action: "CHAT_WITH_ATTACHMENTS"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "can you read my blog post and give me a detailed breakdown of the key points I made, and then suggest a handful of tweets to promote it?"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "great idea, give me a minute",
          action: "CHAT_WITH_ATTACHMENTS"
        }
      }
    ]
  ]
};
var chat_with_attachments_default = summarizeAction;

// src/actions/download_media.ts
import path from "path";
import { composeContext as composeContext2 } from "@elizaos/core";
import { parseJSONObjectFromText as parseJSONObjectFromText2 } from "@elizaos/core";
import {
  ModelClass as ModelClass2,
  ServiceType
} from "@elizaos/core";
import { generateText as generateText2 } from "@elizaos/core";
var mediaUrlTemplate = `# Messages we are searching for a media URL
{{recentMessages}}

# Instructions: {{senderName}} is requesting to download a specific media file (video or audio). Your goal is to determine the URL of the media they want to download.
The "mediaUrl" is the URL of the media file that the user wants downloaded. If not specified, return null.

Your response must be formatted as a JSON block with this structure:
\`\`\`json
{
  "mediaUrl": "<Media URL>"
}
\`\`\`
`;
var getMediaUrl = async (runtime, message, state) => {
  if (!state) {
    state = await runtime.composeState(message);
  }
  const context = composeContext2({
    state,
    template: mediaUrlTemplate
  });
  for (let i = 0; i < 5; i++) {
    const response = await generateText2({
      runtime,
      context,
      modelClass: ModelClass2.SMALL
    });
    const parsedResponse = parseJSONObjectFromText2(response);
    if (parsedResponse?.mediaUrl) {
      return parsedResponse.mediaUrl;
    }
  }
  return null;
};
var download_media_default = {
  name: "DOWNLOAD_MEDIA",
  similes: [
    "DOWNLOAD_VIDEO",
    "DOWNLOAD_AUDIO",
    "GET_MEDIA",
    "DOWNLOAD_PODCAST",
    "DOWNLOAD_YOUTUBE"
  ],
  description: "Downloads a video or audio file from a URL and attaches it to the response message.",
  validate: async (runtime, message, _state) => {
    if (message.content.source !== "discord") {
      return false;
    }
  },
  handler: async (runtime, message, state, options, callback) => {
    const videoService = runtime.getService(ServiceType.VIDEO).getInstance();
    if (!state) {
      state = await runtime.composeState(message);
    }
    const mediaUrl = await getMediaUrl(runtime, message, state);
    if (!mediaUrl) {
      console.error("Couldn't get media URL from messages");
      return;
    }
    const videoInfo = await videoService.fetchVideoInfo(mediaUrl);
    const mediaPath = await videoService.downloadVideo(videoInfo);
    const response = {
      text: `I downloaded the video "${videoInfo.title}" and attached it below.`,
      action: "DOWNLOAD_MEDIA_RESPONSE",
      source: message.content.source,
      attachments: []
    };
    const filename = path.basename(mediaPath);
    const maxRetries = 3;
    let retries = 0;
    while (retries < maxRetries) {
      try {
        await callback(
          {
            ...response
          },
          ["content_cache/" + filename]
        );
        break;
      } catch (error) {
        retries++;
        console.error(
          `Error sending message (attempt ${retries}):`,
          error
        );
        if (retries === maxRetries) {
          console.error(
            "Max retries reached. Failed to send message with attachment."
          );
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 2e3));
      }
    }
    return response;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Downloading the YouTube video now, one sec",
          action: "DOWNLOAD_MEDIA"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Can you grab this video for me? https://vimeo.com/123456789"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Sure thing, I'll download that Vimeo video for you",
          action: "DOWNLOAD_MEDIA"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "I need this video downloaded: https://www.youtube.com/watch?v=abcdefg"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "No problem, I'm on it. I'll have that YouTube video downloaded in a jiffy",
          action: "DOWNLOAD_MEDIA"
        }
      }
    ]
  ]
};

// src/actions/joinvoice.ts
import {
  composeContext as composeContext3,
  generateText as generateText3,
  ModelClass as ModelClass3
} from "@elizaos/core";
import {
  ChannelType
} from "discord.js";
import { joinVoiceChannel } from "@discordjs/voice";
var joinvoice_default = {
  name: "JOIN_VOICE",
  similes: [
    "JOIN_VOICE",
    "JOIN_VC",
    "JOIN_VOICE_CHAT",
    "JOIN_VOICE_CHANNEL",
    "JOIN_MEETING",
    "JOIN_CALL"
  ],
  validate: async (_runtime, message, state) => {
    if (message.content.source !== "discord") {
      return false;
    }
    if (!state.discordClient) {
      return;
    }
    const keywords = [
      "join",
      "come to",
      "come on",
      "enter",
      "voice",
      "chat",
      "talk",
      "call",
      "hop on",
      "get on",
      "vc",
      "meeting",
      "discussion"
    ];
    if (!keywords.some(
      (keyword) => message.content.text.toLowerCase().includes(keyword)
    )) {
      return false;
    }
    return true;
  },
  description: "Join a voice channel to participate in voice chat.",
  handler: async (runtime, message, state) => {
    if (!state) {
      console.error("State is not available.");
    }
    const discordMessage = state.discordChannel || state.discordMessage;
    if (!discordMessage.content) {
      discordMessage.content = message.content.text;
    }
    const id = discordMessage.guild?.id;
    const client = state.discordClient;
    const voiceChannels = client.guilds.cache.get(id).channels.cache.filter(
      (channel) => channel.type === ChannelType.GuildVoice
    );
    const messageContent = discordMessage.content;
    const targetChannel = voiceChannels.find((channel) => {
      const name = channel.name.toLowerCase();
      const replacedName = name.replace(/[^a-z0-9 ]/g, "");
      return name.includes(messageContent) || messageContent.includes(name) || replacedName.includes(messageContent) || messageContent.includes(replacedName);
    });
    if (targetChannel) {
      joinVoiceChannel({
        channelId: targetChannel.id,
        guildId: discordMessage.guild?.id,
        adapterCreator: client.guilds.cache.get(id).voiceAdapterCreator,
        selfDeaf: false,
        selfMute: false,
        group: client.user.id
      });
      return true;
    } else {
      const member = discordMessage.member;
      if (member?.voice?.channel) {
        joinVoiceChannel({
          channelId: member.voice.channel.id,
          guildId: discordMessage.guild?.id,
          adapterCreator: client.guilds.cache.get(id).voiceAdapterCreator,
          selfDeaf: false,
          selfMute: false,
          group: client.user.id
        });
        return true;
      }
      const messageTemplate = `
The user has requested to join a voice channel.
Here is the list of channels available in the server:
{{voiceChannels}}

Here is the user's request:
{{userMessage}}

Please respond with the name of the voice channel which the bot should join. Try to infer what channel the user is talking about. If the user didn't specify a voice channel, respond with "none".
You should only respond with the name of the voice channel or none, no commentary or additional information should be included.
`;
      const guessState = {
        userMessage: message.content.text,
        voiceChannels: voiceChannels.map((channel) => channel.name).join("\n")
      };
      const context = composeContext3({
        template: messageTemplate,
        state: guessState
      });
      const _datestr = (/* @__PURE__ */ new Date()).toUTCString().replace(/:/g, "-");
      const responseContent = await generateText3({
        runtime,
        context,
        modelClass: ModelClass3.SMALL
      });
      runtime.databaseAdapter.log({
        body: { message, context, response: responseContent },
        userId: message.userId,
        roomId: message.roomId,
        type: "joinvoice"
      });
      if (responseContent && responseContent.trim().length > 0) {
        const channelName = responseContent.toLowerCase();
        const targetChannel2 = voiceChannels.find((channel) => {
          const name = channel.name.toLowerCase();
          const replacedName = name.replace(/[^a-z0-9 ]/g, "");
          return name.includes(channelName) || channelName.includes(name) || replacedName.includes(channelName) || channelName.includes(replacedName);
        });
        if (targetChannel2) {
          joinVoiceChannel({
            channelId: targetChannel2.id,
            guildId: discordMessage.guild?.id,
            adapterCreator: client.guilds.cache.get(id).voiceAdapterCreator,
            selfDeaf: false,
            selfMute: false,
            group: client.user.id
          });
          return true;
        }
      }
      await discordMessage.reply(
        "I couldn't figure out which channel you wanted me to join."
      );
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Hey, let's jump into the 'General' voice and chat"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Sounds good",
          action: "JOIN_VOICE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user2}}, can you join the vc, I want to discuss our strat"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Sure I'll join right now",
          action: "JOIN_VOICE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "hey {{user2}}, we're having a team meeting in the 'conference' voice channel, plz join us"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "OK see you there",
          action: "JOIN_VOICE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user2}}, let's have a quick voice chat in the 'Lounge' channel."
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "kk be there in a sec",
          action: "JOIN_VOICE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Hey {{user2}}, can you join me in the 'Music' voice channel"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Sure",
          action: "JOIN_VOICE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "join voice chat with us {{user2}}"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "coming",
          action: "JOIN_VOICE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "hop in vc {{user2}}"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "joining now",
          action: "JOIN_VOICE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "get in vc with us {{user2}}"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "im in",
          action: "JOIN_VOICE"
        }
      }
    ]
  ]
};

// src/actions/leavevoice.ts
import { getVoiceConnection } from "@discordjs/voice";
import {
  ChannelType as ChannelType2
} from "discord.js";
var leavevoice_default = {
  name: "LEAVE_VOICE",
  similes: [
    "LEAVE_VOICE",
    "LEAVE_VC",
    "LEAVE_VOICE_CHAT",
    "LEAVE_VOICE_CHANNEL",
    "LEAVE_MEETING",
    "LEAVE_CALL"
  ],
  validate: async (runtime, message, state) => {
    if (message.content.source !== "discord") {
      return false;
    }
    if (!state.discordClient) {
      return false;
    }
    const keywords = [
      "leave",
      "exit",
      "stop",
      "quit",
      "get off",
      "get out",
      "bye",
      "cya",
      "see you",
      "hop off",
      "get off",
      "voice",
      "vc",
      "chat",
      "call",
      "meeting",
      "discussion"
    ];
    if (!keywords.some(
      (keyword) => message.content.text.toLowerCase().includes(keyword)
    )) {
      return false;
    }
    const client = state.discordClient;
    const isConnectedToVoice = client.voice.adapters.size > 0;
    return isConnectedToVoice;
  },
  description: "Leave the current voice channel.",
  handler: async (runtime, message, state) => {
    if (!state.discordClient) {
      return;
    }
    const discordMessage = state.discordMessage || state.discordChannel;
    if (!discordMessage) {
      throw new Error("Discord message is not available in the state.");
    }
    const voiceChannels = state.discordClient?.guilds.cache.get(discordMessage.guild?.id)?.channels.cache.filter(
      (channel) => channel.type === ChannelType2.GuildVoice
    );
    voiceChannels?.forEach((_channel) => {
      const connection = getVoiceConnection(
        discordMessage.guild?.id
      );
      if (connection) {
        connection.destroy();
      }
    });
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Hey {{user2}} please leave the voice channel"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Sure",
          action: "LEAVE_VOICE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "I have to go now but thanks for the chat"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "You too, talk to you later",
          action: "LEAVE_VOICE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Great call everyone, hopping off now",
          action: "LEAVE_VOICE"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Agreed, I'll hop off too",
          action: "LEAVE_VOICE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Hey {{user2}} I need you to step away from the voice chat for a bit"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "No worries, I'll leave the voice channel",
          action: "LEAVE_VOICE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user2}}, I think we covered everything, you can leave the voice chat now"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Sounds good, see you both later",
          action: "LEAVE_VOICE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "leave voice {{user2}}"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "ok leaving",
          action: "LEAVE_VOICE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "plz leave the voice chat {{user2}}"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "aight im out",
          action: "LEAVE_VOICE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "yo {{user2}} gtfo the vc"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "sorry, talk to you later",
          action: "LEAVE_VOICE"
        }
      }
    ]
  ]
};

// src/actions/summarize_conversation.ts
import { composeContext as composeContext4, getModelSettings as getModelSettings2 } from "@elizaos/core";
import { generateText as generateText4, splitChunks, trimTokens as trimTokens2 } from "@elizaos/core";
import { getActorDetails } from "@elizaos/core";
import { parseJSONObjectFromText as parseJSONObjectFromText3 } from "@elizaos/core";
import {
  ModelClass as ModelClass4
} from "@elizaos/core";
var summarizationTemplate2 = `# Summarized so far (we are adding to this)
{{currentSummary}}

# Current conversation chunk we are summarizing (includes attachments)
{{memoriesWithAttachments}}

Summarization objective: {{objective}}

# Instructions: Summarize the conversation so far. Return the summary. Do not acknowledge this request, just summarize and continue the existing summary if there is one. Capture any important details to the objective. Only respond with the new summary text.
Your response should be extremely detailed and include any and all relevant information.`;
var dateRangeTemplate = `# Messages we are summarizing (the conversation is continued after this)
{{recentMessages}}

# Instructions: {{senderName}} is requesting a summary of the conversation. Your goal is to determine their objective, along with the range of dates that their request covers.
The "objective" is a detailed description of what the user wants to summarize based on the conversation. If they just ask for a general summary, you can either base it off the conversation if the summary range is very recent, or set the object to be general, like "a detailed summary of the conversation between all users".
The "start" and "end" are the range of dates that the user wants to summarize, relative to the current time. The start and end should be relative to the current time, and measured in seconds, minutes, hours and days. The format is "2 days ago" or "3 hours ago" or "4 minutes ago" or "5 seconds ago", i.e. "<integer> <unit> ago".
If you aren't sure, you can use a default range of "0 minutes ago" to "2 hours ago" or more. Better to err on the side of including too much than too little.

Your response must be formatted as a JSON block with this structure:
\`\`\`json
{
  "objective": "<What the user wants to summarize>",
  "start": "0 minutes ago",
  "end": "2 hours ago"
}
\`\`\`
`;
var getDateRange = async (runtime, message, state) => {
  state = await runtime.composeState(message);
  const context = composeContext4({
    state,
    template: dateRangeTemplate
  });
  for (let i = 0; i < 5; i++) {
    const response = await generateText4({
      runtime,
      context,
      modelClass: ModelClass4.SMALL
    });
    console.log("response", response);
    const parsedResponse = parseJSONObjectFromText3(response);
    if (parsedResponse) {
      if (parsedResponse.objective && parsedResponse.start && parsedResponse.end) {
        const startIntegerString = parsedResponse.start.match(/\d+/)?.[0];
        const endIntegerString = parsedResponse.end.match(
          /\d+/
        )?.[0];
        const multipliers = {
          second: 1 * 1e3,
          minute: 60 * 1e3,
          hour: 3600 * 1e3,
          day: 86400 * 1e3
        };
        const startMultiplier = parsedResponse.start.match(
          /second|minute|hour|day/
        )?.[0];
        const endMultiplier = parsedResponse.end.match(
          /second|minute|hour|day/
        )?.[0];
        const startInteger = startIntegerString ? Number.parseInt(startIntegerString) : 0;
        const endInteger = endIntegerString ? Number.parseInt(endIntegerString) : 0;
        const startTime = startInteger * multipliers[startMultiplier];
        console.log("startTime", startTime);
        const endTime = endInteger * multipliers[endMultiplier];
        console.log("endTime", endTime);
        parsedResponse.start = Date.now() - startTime;
        parsedResponse.end = Date.now() - endTime;
        return parsedResponse;
      }
    }
  }
};
var summarizeAction2 = {
  name: "SUMMARIZE_CONVERSATION",
  similes: [
    "RECAP",
    "RECAP_CONVERSATION",
    "SUMMARIZE_CHAT",
    "SUMMARIZATION",
    "CHAT_SUMMARY",
    "CONVERSATION_SUMMARY"
  ],
  description: "Summarizes the conversation and attachments.",
  validate: async (runtime, message, _state) => {
    if (message.content.source !== "discord") {
      return false;
    }
    const keywords = [
      "summarize",
      "summarization",
      "summary",
      "recap",
      "report",
      "overview",
      "review",
      "rundown",
      "wrap-up",
      "brief",
      "debrief",
      "abstract",
      "synopsis",
      "outline",
      "digest",
      "abridgment",
      "condensation",
      "encapsulation",
      "essence",
      "gist",
      "main points",
      "key points",
      "key takeaways",
      "bulletpoint",
      "highlights",
      "tldr",
      "tl;dr",
      "in a nutshell",
      "bottom line",
      "long story short",
      "sum up",
      "sum it up",
      "short version",
      "bring me up to speed",
      "catch me up"
    ];
    return keywords.some(
      (keyword) => message.content.text.toLowerCase().includes(keyword.toLowerCase())
    );
  },
  handler: async (runtime, message, state, options, callback) => {
    state = await runtime.composeState(message);
    const callbackData = {
      text: "",
      // fill in later
      action: "SUMMARIZATION_RESPONSE",
      source: message.content.source,
      attachments: []
    };
    const { roomId } = message;
    const dateRange = await getDateRange(runtime, message, state);
    if (!dateRange) {
      console.error("Couldn't get date range from message");
      return;
    }
    console.log("dateRange", dateRange);
    const { objective, start, end } = dateRange;
    const memories = await runtime.messageManager.getMemories({
      roomId,
      // subtract start from current time
      start: Number.parseInt(start),
      end: Number.parseInt(end),
      count: 1e4,
      unique: false
    });
    const actors = await getActorDetails({
      runtime,
      roomId
    });
    const actorMap = new Map(actors.map((actor) => [actor.id, actor]));
    const formattedMemories = memories.map((memory) => {
      const attachments = memory.content.attachments?.map((attachment) => {
        return `---
Attachment: ${attachment.id}
${attachment.description}
${attachment.text}
---`;
      }).join("\n");
      return `${actorMap.get(memory.userId)?.name ?? "Unknown User"} (${actorMap.get(memory.userId)?.username ?? ""}): ${memory.content.text}
${attachments}`;
    }).join("\n");
    let currentSummary = "";
    const modelSettings = getModelSettings2(
      runtime.character.modelProvider,
      ModelClass4.SMALL
    );
    const chunkSize = modelSettings.maxOutputTokens - 1e3;
    const chunks = await splitChunks(formattedMemories, chunkSize, 0);
    const _datestr = (/* @__PURE__ */ new Date()).toUTCString().replace(/:/g, "-");
    state.memoriesWithAttachments = formattedMemories;
    state.objective = objective;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      state.currentSummary = currentSummary;
      state.currentChunk = chunk;
      const template = await trimTokens2(
        summarizationTemplate2,
        chunkSize + 500,
        runtime
      );
      const context = composeContext4({
        state,
        // make sure it fits, we can pad the tokens a bit
        template
      });
      const summary = await generateText4({
        runtime,
        context,
        modelClass: ModelClass4.SMALL
      });
      currentSummary = currentSummary + "\n" + summary;
    }
    if (!currentSummary) {
      console.error("No summary found, that's not good!");
      return;
    }
    callbackData.text = currentSummary.trim();
    if (callbackData.text && (currentSummary.trim()?.split("\n").length < 4 || currentSummary.trim()?.split(" ").length < 100)) {
      callbackData.text = `Here is the summary:
\`\`\`md
${currentSummary.trim()}
\`\`\`
`;
      await callback(callbackData);
    } else if (currentSummary.trim()) {
      const summaryFilename = `content/conversation_summary_${Date.now()}`;
      await runtime.cacheManager.set(summaryFilename, currentSummary);
      await callback(
        {
          ...callbackData,
          text: `I've attached the summary of the conversation from \`${new Date(Number.parseInt(start)).toString()}\` to \`${new Date(Number.parseInt(end)).toString()}\` as a text file.`
        },
        [summaryFilename]
      );
    } else {
      console.warn(
        "Empty response from summarize conversation action, skipping"
      );
    }
    return callbackData;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "```js\nconst x = 10\n```"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "can you give me a detailed report on what we're talking about?"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "sure, no problem, give me a minute to get that together for you",
          action: "SUMMARIZE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "please summarize the conversation we just had and include this blogpost i'm linking (Attachment: b3e12)"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "sure, give me a sec",
          action: "SUMMARIZE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Can you summarize what moon and avf are talking about?"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Yeah, just hold on a second while I get that together for you...",
          action: "SUMMARIZE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "i need to write a blog post about farming, can you summarize the discussion from a few hours ago?"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "no problem, give me a few minutes to read through everything",
          action: "SUMMARIZE"
        }
      }
    ]
  ]
};
var summarize_conversation_default = summarizeAction2;

// src/actions/transcribe_media.ts
import { composeContext as composeContext5 } from "@elizaos/core";
import { generateText as generateText5 } from "@elizaos/core";
import { parseJSONObjectFromText as parseJSONObjectFromText4 } from "@elizaos/core";
import {
  ModelClass as ModelClass5
} from "@elizaos/core";
var mediaAttachmentIdTemplate = `# Messages we are transcribing
{{recentMessages}}

# Instructions: {{senderName}} is requesting a transcription of a specific media file (audio or video). Your goal is to determine the ID of the attachment they want transcribed.
The "attachmentId" is the ID of the media file attachment that the user wants transcribed. If not specified, return null.

Your response must be formatted as a JSON block with this structure:
\`\`\`json
{
  "attachmentId": "<Attachment ID>"
}
\`\`\`
`;
var getMediaAttachmentId = async (runtime, message, state) => {
  state = await runtime.composeState(message);
  const context = composeContext5({
    state,
    template: mediaAttachmentIdTemplate
  });
  for (let i = 0; i < 5; i++) {
    const response = await generateText5({
      runtime,
      context,
      modelClass: ModelClass5.SMALL
    });
    console.log("response", response);
    const parsedResponse = parseJSONObjectFromText4(response);
    if (parsedResponse?.attachmentId) {
      return parsedResponse.attachmentId;
    }
  }
  return null;
};
var transcribeMediaAction = {
  name: "TRANSCRIBE_MEDIA",
  similes: [
    "TRANSCRIBE_AUDIO",
    "TRANSCRIBE_VIDEO",
    "MEDIA_TRANSCRIPT",
    "VIDEO_TRANSCRIPT",
    "AUDIO_TRANSCRIPT"
  ],
  description: "Transcribe the full text of an audio or video file that the user has attached.",
  validate: async (_runtime, message, _state) => {
    if (message.content.source !== "discord") {
      return false;
    }
    const keywords = [
      "transcribe",
      "transcript",
      "audio",
      "video",
      "media",
      "youtube",
      "meeting",
      "recording",
      "podcast",
      "call",
      "conference",
      "interview",
      "speech",
      "lecture",
      "presentation"
    ];
    return keywords.some(
      (keyword) => message.content.text.toLowerCase().includes(keyword.toLowerCase())
    );
  },
  handler: async (runtime, message, state, options, callback) => {
    state = await runtime.composeState(message);
    const callbackData = {
      text: "",
      // fill in later
      action: "TRANSCRIBE_MEDIA_RESPONSE",
      source: message.content.source,
      attachments: []
    };
    const attachmentId = await getMediaAttachmentId(
      runtime,
      message,
      state
    );
    if (!attachmentId) {
      console.error("Couldn't get media attachment ID from message");
      return;
    }
    const attachment = state.recentMessagesData.filter(
      (msg) => msg.content.attachments && msg.content.attachments.length > 0
    ).flatMap((msg) => msg.content.attachments).find(
      (attachment2) => attachment2.id.toLowerCase() === attachmentId.toLowerCase()
    );
    if (!attachment) {
      console.error(`Couldn't find attachment with ID ${attachmentId}`);
      return;
    }
    const mediaTranscript = attachment.text;
    callbackData.text = mediaTranscript.trim();
    if (callbackData.text && (callbackData.text?.split("\n").length < 4 || callbackData.text?.split(" ").length < 100)) {
      callbackData.text = `Here is the transcript:
\`\`\`md
${mediaTranscript.trim()}
\`\`\`
`;
      await callback(callbackData);
    } else if (callbackData.text) {
      const transcriptFilename = `content/transcript_${Date.now()}`;
      await runtime.cacheManager.set(
        transcriptFilename,
        callbackData.text
      );
      await callback(
        {
          ...callbackData,
          text: `I've attached the transcript as a text file.`
        },
        [transcriptFilename]
      );
    } else {
      console.warn(
        "Empty response from transcribe media action, skipping"
      );
    }
    return callbackData;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Please transcribe the audio file I just sent."
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Sure, I'll transcribe the full audio for you.",
          action: "TRANSCRIBE_MEDIA"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Can I get a transcript of that video recording?"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Absolutely, give me a moment to generate the full transcript of the video.",
          action: "TRANSCRIBE_MEDIA"
        }
      }
    ]
  ]
};
var transcribe_media_default = transcribeMediaAction;

// src/messages.ts
import { composeContext as composeContext6, composeRandomUser } from "@elizaos/core";
import { generateMessageResponse, generateShouldRespond } from "@elizaos/core";
import {
  ModelClass as ModelClass8,
  ServiceType as ServiceType3
} from "@elizaos/core";
import { stringToUuid, getEmbeddingZeroVector } from "@elizaos/core";
import {
  ChannelType as ChannelType4
} from "discord.js";
import { elizaLogger as elizaLogger2 } from "@elizaos/core";

// src/attachments.ts
import { generateText as generateText6, trimTokens as trimTokens3 } from "@elizaos/core";
import { parseJSONObjectFromText as parseJSONObjectFromText5 } from "@elizaos/core";
import {
  ModelClass as ModelClass6,
  ServiceType as ServiceType2
} from "@elizaos/core";
import { Collection } from "discord.js";
import ffmpeg from "fluent-ffmpeg";
import fs2 from "fs";
async function generateSummary(runtime, text) {
  text = await trimTokens3(text, 1e5, runtime);
  const prompt = `Please generate a concise summary for the following text:

  Text: """
  ${text}
  """

  Respond with a JSON object in the following format:
  \`\`\`json
  {
    "title": "Generated Title",
    "summary": "Generated summary and/or description of the text"
  }
  \`\`\``;
  const response = await generateText6({
    runtime,
    context: prompt,
    modelClass: ModelClass6.SMALL
  });
  const parsedResponse = parseJSONObjectFromText5(response);
  if (parsedResponse?.title && parsedResponse?.summary) {
    return {
      title: parsedResponse.title,
      description: parsedResponse.summary
    };
  }
  return {
    title: "",
    description: ""
  };
}
var AttachmentManager = class {
  attachmentCache = /* @__PURE__ */ new Map();
  runtime;
  constructor(runtime) {
    this.runtime = runtime;
  }
  async processAttachments(attachments) {
    const processedAttachments = [];
    const attachmentCollection = attachments instanceof Collection ? attachments : new Collection(attachments.map((att) => [att.id, att]));
    for (const [, attachment] of attachmentCollection) {
      const media = await this.processAttachment(attachment);
      if (media) {
        processedAttachments.push(media);
      }
    }
    return processedAttachments;
  }
  async processAttachment(attachment) {
    if (this.attachmentCache.has(attachment.url)) {
      return this.attachmentCache.get(attachment.url);
    }
    let media = null;
    if (attachment.contentType?.startsWith("application/pdf")) {
      media = await this.processPdfAttachment(attachment);
    } else if (attachment.contentType?.startsWith("text/plain")) {
      media = await this.processPlaintextAttachment(attachment);
    } else if (attachment.contentType?.startsWith("audio/") || attachment.contentType?.startsWith("video/mp4")) {
      media = await this.processAudioVideoAttachment(attachment);
    } else if (attachment.contentType?.startsWith("image/")) {
      media = await this.processImageAttachment(attachment);
    } else if (attachment.contentType?.startsWith("video/") || this.runtime.getService(ServiceType2.VIDEO).isVideoUrl(attachment.url)) {
      media = await this.processVideoAttachment(attachment);
    } else {
      media = await this.processGenericAttachment(attachment);
    }
    if (media) {
      this.attachmentCache.set(attachment.url, media);
    }
    return media;
  }
  async processAudioVideoAttachment(attachment) {
    try {
      const response = await fetch(attachment.url);
      const audioVideoArrayBuffer = await response.arrayBuffer();
      let audioBuffer;
      if (attachment.contentType?.startsWith("audio/")) {
        audioBuffer = Buffer.from(audioVideoArrayBuffer);
      } else if (attachment.contentType?.startsWith("video/mp4")) {
        audioBuffer = await this.extractAudioFromMP4(
          audioVideoArrayBuffer
        );
      } else {
        throw new Error("Unsupported audio/video format");
      }
      const transcriptionService = this.runtime.getService(
        ServiceType2.TRANSCRIPTION
      );
      if (!transcriptionService) {
        throw new Error("Transcription service not found");
      }
      const transcription = await transcriptionService.transcribeAttachment(audioBuffer);
      const { title, description } = await generateSummary(
        this.runtime,
        transcription
      );
      return {
        id: attachment.id,
        url: attachment.url,
        title: title || "Audio/Video Attachment",
        source: attachment.contentType?.startsWith("audio/") ? "Audio" : "Video",
        description: description || "User-uploaded audio/video attachment which has been transcribed",
        text: transcription || "Audio/video content not available"
      };
    } catch (error) {
      console.error(
        `Error processing audio/video attachment: ${error.message}`
      );
      return {
        id: attachment.id,
        url: attachment.url,
        title: "Audio/Video Attachment",
        source: attachment.contentType?.startsWith("audio/") ? "Audio" : "Video",
        description: "An audio/video attachment (transcription failed)",
        text: `This is an audio/video attachment. File name: ${attachment.name}, Size: ${attachment.size} bytes, Content type: ${attachment.contentType}`
      };
    }
  }
  async extractAudioFromMP4(mp4Data) {
    const tempMP4File = `temp_${Date.now()}.mp4`;
    const tempAudioFile = `temp_${Date.now()}.mp3`;
    try {
      fs2.writeFileSync(tempMP4File, Buffer.from(mp4Data));
      await new Promise((resolve, reject) => {
        ffmpeg(tempMP4File).outputOptions("-vn").audioCodec("libmp3lame").save(tempAudioFile).on("end", () => {
          resolve();
        }).on("error", (err) => {
          reject(err);
        }).run();
      });
      const audioData = fs2.readFileSync(tempAudioFile);
      return audioData;
    } finally {
      if (fs2.existsSync(tempMP4File)) {
        fs2.unlinkSync(tempMP4File);
      }
      if (fs2.existsSync(tempAudioFile)) {
        fs2.unlinkSync(tempAudioFile);
      }
    }
  }
  async processPdfAttachment(attachment) {
    try {
      const response = await fetch(attachment.url);
      const pdfBuffer = await response.arrayBuffer();
      const text = await this.runtime.getService(ServiceType2.PDF).convertPdfToText(Buffer.from(pdfBuffer));
      const { title, description } = await generateSummary(
        this.runtime,
        text
      );
      return {
        id: attachment.id,
        url: attachment.url,
        title: title || "PDF Attachment",
        source: "PDF",
        description: description || "A PDF document",
        text
      };
    } catch (error) {
      console.error(`Error processing PDF attachment: ${error.message}`);
      return {
        id: attachment.id,
        url: attachment.url,
        title: "PDF Attachment (conversion failed)",
        source: "PDF",
        description: "A PDF document that could not be converted to text",
        text: `This is a PDF attachment. File name: ${attachment.name}, Size: ${attachment.size} bytes`
      };
    }
  }
  async processPlaintextAttachment(attachment) {
    try {
      const response = await fetch(attachment.url);
      const text = await response.text();
      const { title, description } = await generateSummary(
        this.runtime,
        text
      );
      return {
        id: attachment.id,
        url: attachment.url,
        title: title || "Plaintext Attachment",
        source: "Plaintext",
        description: description || "A plaintext document",
        text
      };
    } catch (error) {
      console.error(
        `Error processing plaintext attachment: ${error.message}`
      );
      return {
        id: attachment.id,
        url: attachment.url,
        title: "Plaintext Attachment (retrieval failed)",
        source: "Plaintext",
        description: "A plaintext document that could not be retrieved",
        text: `This is a plaintext attachment. File name: ${attachment.name}, Size: ${attachment.size} bytes`
      };
    }
  }
  async processImageAttachment(attachment) {
    try {
      const { description, title } = await this.runtime.getService(
        ServiceType2.IMAGE_DESCRIPTION
      ).describeImage(attachment.url);
      return {
        id: attachment.id,
        url: attachment.url,
        title: title || "Image Attachment",
        source: "Image",
        description: description || "An image attachment",
        text: description || "Image content not available"
      };
    } catch (error) {
      console.error(
        `Error processing image attachment: ${error.message}`
      );
      return this.createFallbackImageMedia(attachment);
    }
  }
  createFallbackImageMedia(attachment) {
    return {
      id: attachment.id,
      url: attachment.url,
      title: "Image Attachment",
      source: "Image",
      description: "An image attachment (recognition failed)",
      text: `This is an image attachment. File name: ${attachment.name}, Size: ${attachment.size} bytes, Content type: ${attachment.contentType}`
    };
  }
  async processVideoAttachment(attachment) {
    const videoService = this.runtime.getService(
      ServiceType2.VIDEO
    );
    if (!videoService) {
      throw new Error("Video service not found");
    }
    if (videoService.isVideoUrl(attachment.url)) {
      const videoInfo = await videoService.processVideo(
        attachment.url,
        this.runtime
      );
      return {
        id: attachment.id,
        url: attachment.url,
        title: videoInfo.title,
        source: "YouTube",
        description: videoInfo.description,
        text: videoInfo.text
      };
    } else {
      return {
        id: attachment.id,
        url: attachment.url,
        title: "Video Attachment",
        source: "Video",
        description: "A video attachment",
        text: "Video content not available"
      };
    }
  }
  async processGenericAttachment(attachment) {
    return {
      id: attachment.id,
      url: attachment.url,
      title: "Generic Attachment",
      source: "Generic",
      description: "A generic attachment",
      text: "Attachment content not available"
    };
  }
};

// src/templates.ts
import { messageCompletionFooter, shouldRespondFooter } from "@elizaos/core";
var discordShouldRespondTemplate = `# Task: Decide if {{agentName}} should respond.
About {{agentName}}:
{{bio}}

# INSTRUCTIONS: Determine if {{agentName}} should respond to the message and participate in the conversation. Do not comment. Just respond with "RESPOND" or "IGNORE" or "STOP".

# RESPONSE EXAMPLES
{{user1}}: I just saw a really great movie
{{user2}}: Oh? Which movie?
Result: [IGNORE]

{{agentName}}: Oh, this is my favorite scene
{{user1}}: sick
{{user2}}: wait, why is it your favorite scene
Result: [RESPOND]

{{user1}}: stfu bot
Result: [STOP]

{{user1}}: Hey {{agent}}, can you help me with something
Result: [RESPOND]

{{user1}}: {{agentName}} stfu plz
Result: [STOP]

{{user1}}: i need help
{{agentName}}: how can I help you?
{{user1}}: no. i need help from someone else
Result: [IGNORE]

{{user1}}: Hey {{agent}}, can I ask you a question
{{agentName}}: Sure, what is it
{{user1}}: can you ask claude to create a basic react module that demonstrates a counter
Result: [RESPOND]

{{user1}}: {{agentName}} can you tell me a story
{{user1}}: about a girl named elara
{{agentName}}: Sure.
{{agentName}}: Once upon a time, in a quaint little village, there was a curious girl named Elara.
{{agentName}}: Elara was known for her adventurous spirit and her knack for finding beauty in the mundane.
{{user1}}: I'm loving it, keep going
Result: [RESPOND]

{{user1}}: {{agentName}} stop responding plz
Result: [STOP]

{{user1}}: okay, i want to test something. can you say marco?
{{agentName}}: marco
{{user1}}: great. okay, now do it again
Result: [RESPOND]

Response options are [RESPOND], [IGNORE] and [STOP].

{{agentName}} is in a room with other users and is very worried about being annoying and saying too much.
Respond with [RESPOND] to messages that are directed at {{agentName}}, or participate in conversations that are interesting or relevant to their background.
If a message is not interesting or relevant, respond with [IGNORE]
Unless directly responding to a user, respond with [IGNORE] to messages that are very short or do not contain much information.
If a user asks {{agentName}} to be quiet, respond with [STOP]
If {{agentName}} concludes a conversation and isn't part of the conversation anymore, respond with [STOP]

IMPORTANT: {{agentName}} is particularly sensitive about being annoying, so if there is any doubt, it is better to respond with [IGNORE].
If {{agentName}} is conversing with a user and they have not asked to stop, it is better to respond with [RESPOND].

{{recentMessages}}

# INSTRUCTIONS: Choose the option that best describes {{agentName}}'s response to the last message. Ignore messages if they are addressed to someone else.
` + shouldRespondFooter;
var discordVoiceHandlerTemplate = `# Task: Generate conversational voice dialog for {{agentName}}.
About {{agentName}}:
{{bio}}

# Attachments
{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{actions}}

{{messageDirections}}

{{recentMessages}}

# Instructions: Write the next message for {{agentName}}. Include an optional action if appropriate. {{actionNames}}
` + messageCompletionFooter;
var discordMessageHandlerTemplate = (
  // {{goals}}
  `# Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Knowledge
{{knowledge}}

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

Examples of {{agentName}}'s dialog and actions:
{{characterMessageExamples}}

{{providers}}

{{attachments}}

{{actions}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

# Instructions: Write the next message for {{agentName}}. Include an action, if appropriate. {{actionNames}}
` + messageCompletionFooter
);
var discordAutoPostTemplate = `# Action Examples
NONE: Respond but perform no additional action. This is the default if the agent is speaking and not doing anything additional.

# Task: Generate an engaging community message as {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

Examples of {{agentName}}'s dialog and actions:
{{characterMessageExamples}}

{{messageDirections}}

# Recent Chat History:
{{recentMessages}}

# Instructions: Write a natural, engaging message to restart community conversation. Focus on:
- Community engagement
- Educational topics
- General discusions
- Support queries
- Keep message warm and inviting
- Maximum 3 lines
- Use 1-2 emojis maximum
- Avoid financial advice
- Stay within known facts
- No team member mentions
- Be hyped, not repetitive
- Be natural, act like a human, connect with the community
- Don't sound so robotic like
- Randomly grab the most recent 5 messages for some context. Validate the context randomly and use that as a reference point for your next message, but not always, only when relevant.
- If the recent messages are mostly from {{agentName}}, make sure to create conversation starters, given there is no messages from others to reference.
- DO NOT REPEAT THE SAME thing that you just said from your recent chat history, start the message different each time, and be organic, non reptitive.

# Instructions: Write the next message for {{agentName}}. Include the "NONE" action only, as the only valid action for auto-posts is "NONE".
` + messageCompletionFooter;
var discordAnnouncementHypeTemplate = `# Action Examples
NONE: Respond but perform no additional action. This is the default if the agent is speaking and not doing anything additional.

# Task: Generate announcement hype message as {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}

Examples of {{agentName}}'s dialog and actions:
{{characterMessageExamples}}

{{messageDirections}}

# Announcement Content:
{{announcementContent}}

# Instructions: Write an exciting message to bring attention to the announcement. Requirements:
- Reference the announcement channel using <#{{announcementChannelId}}>
- Reference the announcement content to get information about the announcement to use where appropriate to make the message dynamic vs a static post
- Create genuine excitement
- Encourage community participation
- If there are links like Twitter/X posts, encourage users to like/retweet/comment to spread awarenress, but directly say that, wrap that into the post so its natural.
- Stay within announced facts only
- No additional promises or assumptions
- No team member mentions
- Start the message differently each time. Don't start with the same word like "hey", "hey hey", etc. be dynamic
- Address everyone, not as a direct reply to whoever made the announcement or wrote it, but you can reference them
- Maximum 3-7 lines formatted nicely if needed, based on the context of the announcement
- Use 1-2 emojis maximum

# Instructions: Write the next message for {{agentName}}. Include the "NONE" action only, as no other actions are appropriate for announcement hype.
` + messageCompletionFooter;

// src/constants.ts
var TEAM_COORDINATION = {
  KEYWORDS: [
    "team",
    "all agents",
    "team update",
    "gm team",
    "hello team",
    "hey team",
    "hi team",
    "morning team",
    "evening team",
    "night team",
    "update team"
  ]
};
var MESSAGE_CONSTANTS = {
  MAX_MESSAGES: 10,
  RECENT_MESSAGE_COUNT: 3,
  CHAT_HISTORY_COUNT: 5,
  INTEREST_DECAY_TIME: 5 * 60 * 1e3,
  // 5 minutes
  PARTIAL_INTEREST_DECAY: 3 * 60 * 1e3,
  // 3 minutes
  DEFAULT_SIMILARITY_THRESHOLD: 0.3,
  DEFAULT_SIMILARITY_THRESHOLD_FOLLOW_UPS: 0.2
};
var MESSAGE_LENGTH_THRESHOLDS = {
  LOSE_INTEREST: 100,
  SHORT_MESSAGE: 10,
  VERY_SHORT_MESSAGE: 2,
  IGNORE_RESPONSE: 4
};
var TIMING_CONSTANTS = {
  LEADER_RESPONSE_TIMEOUT: 3e3,
  TEAM_MEMBER_DELAY: 1500,
  LEADER_DELAY_MIN: 3e3,
  LEADER_DELAY_MAX: 4e3,
  TEAM_MEMBER_DELAY_MIN: 1e3,
  TEAM_MEMBER_DELAY_MAX: 3e3
};
var RESPONSE_CHANCES = {
  AFTER_LEADER: 0.5,
  // 50% chance
  FREQUENT_CHATTER: 0.5
  // Base chance for frequent responders
};
var LOSE_INTEREST_WORDS = [
  "shut up",
  "stop",
  "please shut up",
  "shut up please",
  "dont talk",
  "silence",
  "stop talking",
  "be quiet",
  "hush",
  "wtf",
  "chill",
  "stfu",
  "stupid bot",
  "dumb bot",
  "stop responding",
  "god damn it",
  "god damn",
  "goddamnit",
  "can you not",
  "can you stop",
  "be quiet",
  "hate you",
  "hate this",
  "fuck up"
];
var IGNORE_RESPONSE_WORDS = [
  "lol",
  "nm",
  "uh",
  "wtf",
  "stfu",
  "dumb",
  "jfc",
  "omg"
];

// src/utils.ts
import {
  ModelClass as ModelClass7,
  elizaLogger,
  generateText as generateText7,
  trimTokens as trimTokens4,
  parseJSONObjectFromText as parseJSONObjectFromText6
} from "@elizaos/core";
import {
  ChannelType as ChannelType3,
  PermissionsBitField,
  ThreadChannel
} from "discord.js";
function getWavHeader(audioLength, sampleRate, channelCount = 1, bitsPerSample = 16) {
  const wavHeader = Buffer.alloc(44);
  wavHeader.write("RIFF", 0);
  wavHeader.writeUInt32LE(36 + audioLength, 4);
  wavHeader.write("WAVE", 8);
  wavHeader.write("fmt ", 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(channelCount, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(
    sampleRate * bitsPerSample * channelCount / 8,
    28
  );
  wavHeader.writeUInt16LE(bitsPerSample * channelCount / 8, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);
  wavHeader.write("data", 36);
  wavHeader.writeUInt32LE(audioLength, 40);
  return wavHeader;
}
var MAX_MESSAGE_LENGTH = 1900;
async function sendMessageInChunks(channel, content, inReplyTo, files) {
  const sentMessages = [];
  const messages = splitMessage(content);
  try {
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (message.trim().length > 0 || i === messages.length - 1 && files && files.length > 0) {
        const options = {
          content: message.trim()
        };
        if (i === messages.length - 1 && files && files.length > 0) {
          options.files = files;
        }
        const m = await channel.send(options);
        sentMessages.push(m);
      }
    }
  } catch (error) {
    elizaLogger.error("Error sending message:", error);
  }
  return sentMessages;
}
function splitMessage(content) {
  const messages = [];
  let currentMessage = "";
  const rawLines = content?.split("\n") || [];
  const lines = rawLines.flatMap((line) => {
    const chunks = [];
    while (line.length > MAX_MESSAGE_LENGTH) {
      chunks.push(line.slice(0, MAX_MESSAGE_LENGTH));
      line = line.slice(MAX_MESSAGE_LENGTH);
    }
    chunks.push(line);
    return chunks;
  });
  for (const line of lines) {
    if (currentMessage.length + line.length + 1 > MAX_MESSAGE_LENGTH) {
      messages.push(currentMessage.trim());
      currentMessage = "";
    }
    currentMessage += line + "\n";
  }
  if (currentMessage.trim().length > 0) {
    messages.push(currentMessage.trim());
  }
  return messages;
}
function canSendMessage(channel) {
  if (!channel) {
    return {
      canSend: false,
      reason: "No channel given"
    };
  }
  if (channel.type === ChannelType3.DM) {
    return {
      canSend: true,
      reason: null
    };
  }
  const botMember = channel.guild?.members.cache.get(channel.client.user.id);
  if (!botMember) {
    return {
      canSend: false,
      reason: "Not a guild channel or bot member not found"
    };
  }
  const requiredPermissions = [
    PermissionsBitField.Flags.ViewChannel,
    PermissionsBitField.Flags.SendMessages,
    PermissionsBitField.Flags.ReadMessageHistory
  ];
  if (channel instanceof ThreadChannel) {
    requiredPermissions.push(
      PermissionsBitField.Flags.SendMessagesInThreads
    );
  }
  const permissions = channel.permissionsFor(botMember);
  if (!permissions) {
    return {
      canSend: false,
      reason: "Could not retrieve permissions"
    };
  }
  const missingPermissions = requiredPermissions.filter(
    (perm) => !permissions.has(perm)
  );
  return {
    canSend: missingPermissions.length === 0,
    missingPermissions,
    reason: missingPermissions.length > 0 ? `Missing permissions: ${missingPermissions.map((p) => String(p)).join(", ")}` : null
  };
}
function cosineSimilarity(text1, text2, text3) {
  const preprocessText = (text) => text.toLowerCase().replace(/[^\w\s'_-]/g, " ").replace(/\s+/g, " ").trim();
  const getWords = (text) => {
    return text.split(" ").filter((word) => word.length > 1);
  };
  const words1 = getWords(preprocessText(text1));
  const words2 = getWords(preprocessText(text2));
  const words3 = text3 ? getWords(preprocessText(text3)) : [];
  const freq1 = {};
  const freq2 = {};
  const freq3 = {};
  words1.forEach((word) => freq1[word] = (freq1[word] || 0) + 1);
  words2.forEach((word) => freq2[word] = (freq2[word] || 0) + 1);
  if (words3.length) {
    words3.forEach((word) => freq3[word] = (freq3[word] || 0) + 1);
  }
  const uniqueWords = /* @__PURE__ */ new Set([
    ...Object.keys(freq1),
    ...Object.keys(freq2),
    ...words3.length ? Object.keys(freq3) : []
  ]);
  let dotProduct = 0;
  let magnitude1 = 0;
  let magnitude2 = 0;
  let magnitude3 = 0;
  uniqueWords.forEach((word) => {
    const val1 = freq1[word] || 0;
    const val2 = freq2[word] || 0;
    const val3 = freq3[word] || 0;
    if (words3.length) {
      const sim12 = val1 * val2;
      const sim23 = val2 * val3;
      const sim13 = val1 * val3;
      dotProduct += Math.max(sim12, sim23, sim13);
    } else {
      dotProduct += val1 * val2;
    }
    magnitude1 += val1 * val1;
    magnitude2 += val2 * val2;
    if (words3.length) {
      magnitude3 += val3 * val3;
    }
  });
  magnitude1 = Math.sqrt(magnitude1);
  magnitude2 = Math.sqrt(magnitude2);
  magnitude3 = words3.length ? Math.sqrt(magnitude3) : 1;
  if (magnitude1 === 0 || magnitude2 === 0 || words3.length && magnitude3 === 0)
    return 0;
  if (!words3.length) {
    return dotProduct / (magnitude1 * magnitude2);
  }
  const maxMagnitude = Math.max(
    magnitude1 * magnitude2,
    magnitude2 * magnitude3,
    magnitude1 * magnitude3
  );
  return dotProduct / maxMagnitude;
}

// src/messages.ts
var MessageManager = class {
  client;
  runtime;
  attachmentManager;
  interestChannels = {};
  discordClient;
  voiceManager;
  //Auto post
  autoPostConfig;
  lastChannelActivity = {};
  autoPostInterval;
  constructor(discordClient, voiceManager) {
    this.client = discordClient.client;
    this.voiceManager = voiceManager;
    this.discordClient = discordClient;
    this.runtime = discordClient.runtime;
    this.attachmentManager = new AttachmentManager(this.runtime);
    this.autoPostConfig = {
      enabled: this.runtime.character.clientConfig?.discord?.autoPost?.enabled || false,
      monitorTime: this.runtime.character.clientConfig?.discord?.autoPost?.monitorTime || 3e5,
      inactivityThreshold: this.runtime.character.clientConfig?.discord?.autoPost?.inactivityThreshold || 36e5,
      // 1 hour default
      mainChannelId: this.runtime.character.clientConfig?.discord?.autoPost?.mainChannelId,
      announcementChannelIds: this.runtime.character.clientConfig?.discord?.autoPost?.announcementChannelIds || [],
      minTimeBetweenPosts: this.runtime.character.clientConfig?.discord?.autoPost?.minTimeBetweenPosts || 72e5
      // 2 hours default
    };
    if (this.autoPostConfig.enabled) {
      this._startAutoPostMonitoring();
    }
  }
  async handleMessage(message) {
    if (this.runtime.character.clientConfig?.discord?.allowedChannelIds && !this.runtime.character.clientConfig.discord.allowedChannelIds.includes(message.channelId)) {
      return;
    }
    this.lastChannelActivity[message.channelId] = Date.now();
    if (message.interaction || message.author.id === this.client.user?.id) {
      return;
    }
    if (this.runtime.character.clientConfig?.discord?.shouldIgnoreBotMessages && message.author?.bot) {
      return;
    }
    if (this.runtime.character.clientConfig?.discord?.shouldRespondOnlyToMentions) {
      if (!this._isMessageForMe(message)) {
        return;
      }
    }
    if (this.runtime.character.clientConfig?.discord?.shouldIgnoreDirectMessages && message.channel.type === ChannelType4.DM) {
      return;
    }
    const userId = message.author.id;
    const userName = message.author.username;
    const name = message.author.displayName;
    const channelId = message.channel.id;
    const isDirectlyMentioned = this._isMessageForMe(message);
    const hasInterest = this._checkInterest(message.channelId);
    if (this.runtime.character.clientConfig?.discord?.isPartOfTeam && !this.runtime.character.clientConfig?.discord?.shouldRespondOnlyToMentions) {
      const authorId = this._getNormalizedUserId(message.author.id);
      if (!this._isTeamLeader() && this._isRelevantToTeamMember(message.content, channelId)) {
        this.interestChannels[message.channelId] = {
          currentHandler: this.client.user?.id,
          lastMessageSent: Date.now(),
          messages: []
        };
      }
      const isTeamRequest = this._isTeamCoordinationRequest(
        message.content
      );
      const isLeader = this._isTeamLeader();
      if (hasInterest && !isDirectlyMentioned) {
        const lastSelfMemories = await this.runtime.messageManager.getMemories({
          roomId: stringToUuid(
            channelId + "-" + this.runtime.agentId
          ),
          unique: false,
          count: 5
        });
        const lastSelfSortedMemories = lastSelfMemories?.filter((m) => m.userId === this.runtime.agentId).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        const isRelevant = this._isRelevantToTeamMember(
          message.content,
          channelId,
          lastSelfSortedMemories?.[0]
        );
        if (!isRelevant) {
          delete this.interestChannels[message.channelId];
          return;
        }
      }
      if (isTeamRequest) {
        if (isLeader) {
          this.interestChannels[message.channelId] = {
            currentHandler: this.client.user?.id,
            lastMessageSent: Date.now(),
            messages: []
          };
        } else {
          this.interestChannels[message.channelId] = {
            currentHandler: this.client.user?.id,
            lastMessageSent: Date.now(),
            messages: []
          };
          if (!isDirectlyMentioned) {
            this.interestChannels[message.channelId].lastMessageSent = 0;
          }
        }
      }
      const otherTeamMembers = this.runtime.character.clientConfig.discord.teamAgentIds.filter(
        (id) => id !== this.client.user?.id
      );
      const mentionedTeamMember = otherTeamMembers.find(
        (id) => message.content.includes(`<@${id}>`)
      );
      if (mentionedTeamMember) {
        if (hasInterest || this.interestChannels[message.channelId]?.currentHandler === this.client.user?.id) {
          delete this.interestChannels[message.channelId];
          if (!isDirectlyMentioned) {
            return;
          }
        }
      }
      if (isDirectlyMentioned) {
        this.interestChannels[message.channelId] = {
          currentHandler: this.client.user?.id,
          lastMessageSent: Date.now(),
          messages: []
        };
      } else if (!isTeamRequest && !hasInterest) {
        return;
      }
      if (message.author.bot) {
        if (this._isTeamMember(authorId) && !isDirectlyMentioned) {
          return;
        } else if (this.runtime.character.clientConfig.discord.shouldIgnoreBotMessages) {
          return;
        }
      }
    }
    try {
      const { processedContent, attachments } = await this.processMessageMedia(message);
      const audioAttachments = message.attachments.filter(
        (attachment) => attachment.contentType?.startsWith("audio/")
      );
      if (audioAttachments.size > 0) {
        const processedAudioAttachments = await this.attachmentManager.processAttachments(
          audioAttachments
        );
        attachments.push(...processedAudioAttachments);
      }
      const roomId = stringToUuid(channelId + "-" + this.runtime.agentId);
      const userIdUUID = stringToUuid(userId);
      await this.runtime.ensureConnection(
        userIdUUID,
        roomId,
        userName,
        name,
        "discord"
      );
      const messageId = stringToUuid(
        message.id + "-" + this.runtime.agentId
      );
      let shouldIgnore = false;
      let shouldRespond = true;
      const content = {
        text: processedContent,
        attachments,
        source: "discord",
        url: message.url,
        inReplyTo: message.reference?.messageId ? stringToUuid(
          message.reference.messageId + "-" + this.runtime.agentId
        ) : void 0
      };
      const userMessage = {
        content,
        userId: userIdUUID,
        agentId: this.runtime.agentId,
        roomId
      };
      const memory = {
        id: stringToUuid(message.id + "-" + this.runtime.agentId),
        ...userMessage,
        userId: userIdUUID,
        agentId: this.runtime.agentId,
        roomId,
        content,
        createdAt: message.createdTimestamp
      };
      if (content.text) {
        await this.runtime.messageManager.addEmbeddingToMemory(memory);
        await this.runtime.messageManager.createMemory(memory);
        if (this.interestChannels[message.channelId]) {
          this.interestChannels[message.channelId].messages.push({
            userId: userIdUUID,
            userName,
            content
          });
          if (this.interestChannels[message.channelId].messages.length > MESSAGE_CONSTANTS.MAX_MESSAGES) {
            this.interestChannels[message.channelId].messages = this.interestChannels[message.channelId].messages.slice(-MESSAGE_CONSTANTS.MAX_MESSAGES);
          }
        }
      }
      let state = await this.runtime.composeState(userMessage, {
        discordClient: this.client,
        discordMessage: message,
        agentName: this.runtime.character.name || this.client.user?.displayName
      });
      const canSendResult = canSendMessage(message.channel);
      if (!canSendResult.canSend) {
        return elizaLogger2.warn(
          `Cannot send message to channel ${message.channel}`,
          canSendResult
        );
      }
      if (!shouldIgnore) {
        shouldIgnore = await this._shouldIgnore(message);
      }
      if (shouldIgnore) {
        return;
      }
      const agentUserState = await this.runtime.databaseAdapter.getParticipantUserState(
        roomId,
        this.runtime.agentId
      );
      if (agentUserState === "MUTED" && !message.mentions.has(this.client.user.id) && !hasInterest) {
        console.log("Ignoring muted room");
        return;
      }
      if (agentUserState === "FOLLOWED") {
        shouldRespond = true;
      } else if (!shouldRespond && hasInterest || shouldRespond && !hasInterest) {
        shouldRespond = await this._shouldRespond(message, state);
      }
      if (shouldRespond) {
        const context = composeContext6({
          state,
          template: this.runtime.character.templates?.discordMessageHandlerTemplate || discordMessageHandlerTemplate
        });
        const stopTyping = this.simulateTyping(message);
        const responseContent = await this._generateResponse(
          memory,
          state,
          context
        ).finally(() => {
          stopTyping();
        });
        responseContent.text = responseContent.text?.trim();
        responseContent.inReplyTo = stringToUuid(
          message.id + "-" + this.runtime.agentId
        );
        if (!responseContent.text) {
          return;
        }
        const callback = async (content2, files) => {
          try {
            if (message.id && !content2.inReplyTo) {
              content2.inReplyTo = stringToUuid(
                message.id + "-" + this.runtime.agentId
              );
            }
            const messages = await sendMessageInChunks(
              message.channel,
              content2.text,
              message.id,
              files
            );
            const memories = [];
            for (const m of messages) {
              let action2 = content2.action;
              if (messages.length > 1 && m !== messages[messages.length - 1]) {
                action2 = "CONTINUE";
              }
              const memory2 = {
                id: stringToUuid(
                  m.id + "-" + this.runtime.agentId
                ),
                userId: this.runtime.agentId,
                agentId: this.runtime.agentId,
                content: {
                  ...content2,
                  action: action2,
                  inReplyTo: messageId,
                  url: m.url
                },
                roomId,
                embedding: getEmbeddingZeroVector(),
                createdAt: m.createdTimestamp
              };
              memories.push(memory2);
            }
            for (const m of memories) {
              await this.runtime.messageManager.createMemory(m);
            }
            return memories;
          } catch (error) {
            console.error("Error sending message:", error);
            return [];
          }
        };
        const action = this.runtime.actions.find((a) => a.name === responseContent.action);
        const shouldSuppressInitialMessage = action?.suppressInitialMessage;
        let responseMessages = [];
        if (!shouldSuppressInitialMessage) {
          responseMessages = await callback(responseContent);
        } else {
          responseMessages = [
            {
              id: stringToUuid(messageId + "-" + this.runtime.agentId),
              userId: this.runtime.agentId,
              agentId: this.runtime.agentId,
              content: responseContent,
              roomId,
              embedding: getEmbeddingZeroVector(),
              createdAt: Date.now()
            }
          ];
        }
        state = await this.runtime.updateRecentMessageState(state);
        await this.runtime.processActions(
          memory,
          responseMessages,
          state,
          callback
        );
      }
      await this.runtime.evaluate(memory, state, shouldRespond);
    } catch (error) {
      console.error("Error handling message:", error);
      if (message.channel.type === ChannelType4.GuildVoice) {
        const errorMessage = "Sorry, I had a glitch. What was that?";
        const speechService = this.runtime.getService(
          ServiceType3.SPEECH_GENERATION
        );
        if (!speechService) {
          throw new Error("Speech generation service not found");
        }
        const audioStream = await speechService.generate(
          this.runtime,
          errorMessage
        );
        await this.voiceManager.playAudioStream(userId, audioStream);
      } else {
        console.error("Error sending message:", error);
      }
    }
  }
  async cacheMessages(channel, count = 20) {
    const messages = await channel.messages.fetch({ limit: count });
    for (const [_, message] of messages) {
      await this.handleMessage(message);
    }
  }
  _startAutoPostMonitoring() {
    if (!this.client.isReady()) {
      elizaLogger2.info("[AutoPost Discord] Client not ready, waiting for ready event");
      this.client.once("ready", () => {
        elizaLogger2.info("[AutoPost Discord] Client ready, starting monitoring");
        this._initializeAutoPost();
      });
    } else {
      elizaLogger2.info("[AutoPost Discord] Client already ready, starting monitoring");
      this._initializeAutoPost();
    }
  }
  _initializeAutoPost() {
    setTimeout(() => {
      this.autoPostInterval = setInterval(() => {
        this._checkChannelActivity();
      }, Math.floor(Math.random() * (4 * 60 * 60 * 1e3) + 2 * 60 * 60 * 1e3));
      this._monitorAnnouncementChannels();
    }, 5e3);
  }
  async _checkChannelActivity() {
    if (!this.autoPostConfig.enabled || !this.autoPostConfig.mainChannelId) return;
    const channel = this.client.channels.cache.get(this.autoPostConfig.mainChannelId);
    if (!channel) return;
    try {
      const messages = await channel.messages.fetch({ limit: 1 });
      const lastMessage = messages.first();
      const lastMessageTime = lastMessage ? lastMessage.createdTimestamp : 0;
      const now = Date.now();
      const timeSinceLastMessage = now - lastMessageTime;
      const timeSinceLastAutoPost = now - (this.autoPostConfig.lastAutoPost || 0);
      const randomThreshold = this.autoPostConfig.inactivityThreshold + (Math.random() * 18e5 - 9e5);
      if (timeSinceLastMessage > randomThreshold && timeSinceLastAutoPost > (this.autoPostConfig.minTimeBetweenPosts || 0)) {
        try {
          const roomId = stringToUuid(channel.id + "-" + this.runtime.agentId);
          const memory = {
            id: stringToUuid(`autopost-${Date.now()}`),
            userId: this.runtime.agentId,
            agentId: this.runtime.agentId,
            roomId,
            content: { text: "AUTO_POST_ENGAGEMENT", source: "discord" },
            embedding: getEmbeddingZeroVector(),
            createdAt: Date.now()
          };
          let state = await this.runtime.composeState(memory, {
            discordClient: this.client,
            discordMessage: null,
            agentName: this.runtime.character.name || this.client.user?.displayName
          });
          const context = composeContext6({
            state,
            template: this.runtime.character.templates?.discordAutoPostTemplate || discordAutoPostTemplate
          });
          const responseContent = await this._generateResponse(memory, state, context);
          if (!responseContent?.text) return;
          const messages2 = await sendMessageInChunks(channel, responseContent.text.trim(), null, []);
          const memories = messages2.map((m) => ({
            id: stringToUuid(m.id + "-" + this.runtime.agentId),
            userId: this.runtime.agentId,
            agentId: this.runtime.agentId,
            content: {
              ...responseContent,
              url: m.url
            },
            roomId,
            embedding: getEmbeddingZeroVector(),
            createdAt: m.createdTimestamp
          }));
          for (const m of memories) {
            await this.runtime.messageManager.createMemory(m);
          }
          this.autoPostConfig.lastAutoPost = Date.now();
          state = await this.runtime.updateRecentMessageState(state);
          await this.runtime.evaluate(memory, state, true);
        } catch (error) {
          elizaLogger2.warn("[AutoPost Discord] Error:", error);
        }
      } else {
        elizaLogger2.warn("[AutoPost Discord] Activity within threshold. Not posting.");
      }
    } catch (error) {
      elizaLogger2.warn("[AutoPost Discord] Error checking last message:", error);
    }
  }
  async _monitorAnnouncementChannels() {
    if (!this.autoPostConfig.enabled || !this.autoPostConfig.announcementChannelIds.length) {
      elizaLogger2.warn("[AutoPost Discord] Auto post config disabled or no announcement channels");
      return;
    }
    for (const announcementChannelId of this.autoPostConfig.announcementChannelIds) {
      const channel = this.client.channels.cache.get(announcementChannelId);
      if (channel) {
        if (channel instanceof TextChannel || channel.type === ChannelType4.GuildAnnouncement) {
          const newsChannel = channel;
          try {
            newsChannel.createMessageCollector().on("collect", async (message) => {
              if (message.author.bot || Date.now() - message.createdTimestamp > 3e5) return;
              const mainChannel = this.client.channels.cache.get(this.autoPostConfig.mainChannelId);
              if (!mainChannel) return;
              try {
                const roomId = stringToUuid(mainChannel.id + "-" + this.runtime.agentId);
                const memory = {
                  id: stringToUuid(`announcement-${Date.now()}`),
                  userId: this.runtime.agentId,
                  agentId: this.runtime.agentId,
                  roomId,
                  content: {
                    text: message.content,
                    source: "discord",
                    metadata: { announcementUrl: message.url }
                  },
                  embedding: getEmbeddingZeroVector(),
                  createdAt: Date.now()
                };
                let state = await this.runtime.composeState(memory, {
                  discordClient: this.client,
                  discordMessage: message,
                  announcementContent: message?.content,
                  announcementChannelId: channel.id,
                  agentName: this.runtime.character.name || this.client.user?.displayName
                });
                const context = composeContext6({
                  state,
                  template: this.runtime.character.templates?.discordAnnouncementHypeTemplate || discordAnnouncementHypeTemplate
                });
                const responseContent = await this._generateResponse(memory, state, context);
                if (!responseContent?.text) return;
                const messages = await sendMessageInChunks(mainChannel, responseContent.text.trim(), null, []);
                const memories = messages.map((m) => ({
                  id: stringToUuid(m.id + "-" + this.runtime.agentId),
                  userId: this.runtime.agentId,
                  agentId: this.runtime.agentId,
                  content: {
                    ...responseContent,
                    url: m.url
                  },
                  roomId,
                  embedding: getEmbeddingZeroVector(),
                  createdAt: m.createdTimestamp
                }));
                for (const m of memories) {
                  await this.runtime.messageManager.createMemory(m);
                }
                state = await this.runtime.updateRecentMessageState(state);
                await this.runtime.evaluate(memory, state, true);
              } catch (error) {
                elizaLogger2.warn("[AutoPost Discord] Announcement Error:", error);
              }
            });
            elizaLogger2.info(`[AutoPost Discord] Successfully set up collector for announcement channel: ${newsChannel.name}`);
          } catch (error) {
            elizaLogger2.warn(`[AutoPost Discord] Error setting up announcement channel collector:`, error);
          }
        } else {
          elizaLogger2.warn(`[AutoPost Discord] Channel ${announcementChannelId} is not a valid announcement or text channel, type:`, channel.type);
        }
      } else {
        elizaLogger2.warn(`[AutoPost Discord] Could not find channel ${announcementChannelId} directly`);
      }
    }
  }
  _isMessageForMe(message) {
    const isMentioned = message.mentions.users?.has(
      this.client.user?.id
    );
    const guild = message.guild;
    const member = guild?.members.cache.get(this.client.user?.id);
    const nickname = member?.nickname;
    const hasRoleMentionOnly = message.mentions.roles.size > 0 && !isMentioned;
    if (hasRoleMentionOnly && this.runtime.character.clientConfig?.discord?.isPartOfTeam) {
      return false;
    }
    return isMentioned || !this.runtime.character.clientConfig?.discord?.shouldRespondOnlyToMentions && (message.content.toLowerCase().includes(
      this.client.user?.username.toLowerCase()
    ) || message.content.toLowerCase().includes(
      this.client.user?.tag.toLowerCase()
    ) || nickname && message.content.toLowerCase().includes(nickname.toLowerCase()));
  }
  async processMessageMedia(message) {
    let processedContent = message.content;
    let attachments = [];
    const codeBlockRegex = /```([\s\S]*?)```/g;
    let match;
    while (match = codeBlockRegex.exec(processedContent)) {
      const codeBlock = match[1];
      const lines = codeBlock.split("\n");
      const title = lines[0];
      const description = lines.slice(0, 3).join("\n");
      const attachmentId = `code-${Date.now()}-${Math.floor(Math.random() * 1e3)}`.slice(
        -5
      );
      attachments.push({
        id: attachmentId,
        url: "",
        title: title || "Code Block",
        source: "Code",
        description,
        text: codeBlock
      });
      processedContent = processedContent.replace(
        match[0],
        `Code Block (${attachmentId})`
      );
    }
    if (message.attachments.size > 0) {
      attachments = await this.attachmentManager.processAttachments(
        message.attachments
      );
    }
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urls = processedContent.match(urlRegex) || [];
    for (const url of urls) {
      if (this.runtime.getService(ServiceType3.VIDEO)?.isVideoUrl(url)) {
        const videoService = this.runtime.getService(
          ServiceType3.VIDEO
        );
        if (!videoService) {
          throw new Error("Video service not found");
        }
        const videoInfo = await videoService.processVideo(
          url,
          this.runtime
        );
        attachments.push({
          id: `youtube-${Date.now()}`,
          url,
          title: videoInfo.title,
          source: "YouTube",
          description: videoInfo.description,
          text: videoInfo.text
        });
      } else {
        const browserService = this.runtime.getService(
          ServiceType3.BROWSER
        );
        if (!browserService) {
          throw new Error("Browser service not found");
        }
        const { title, description: summary } = await browserService.getPageContent(url, this.runtime);
        attachments.push({
          id: `webpage-${Date.now()}`,
          url,
          title: title || "Web Page",
          source: "Web",
          description: summary,
          text: summary
        });
      }
    }
    return { processedContent, attachments };
  }
  _getNormalizedUserId(id) {
    return id.toString().replace(/[^0-9]/g, "");
  }
  _isTeamMember(userId) {
    const teamConfig = this.runtime.character.clientConfig?.discord;
    if (!teamConfig?.isPartOfTeam || !teamConfig.teamAgentIds) return false;
    const normalizedUserId = this._getNormalizedUserId(userId);
    const isTeamMember = teamConfig.teamAgentIds.some(
      (teamId) => this._getNormalizedUserId(teamId) === normalizedUserId
    );
    return isTeamMember;
  }
  _isTeamLeader() {
    return this.client.user?.id === this.runtime.character.clientConfig?.discord?.teamLeaderId;
  }
  _isTeamCoordinationRequest(content) {
    const contentLower = content.toLowerCase();
    return TEAM_COORDINATION.KEYWORDS?.some(
      (keyword) => contentLower.includes(keyword.toLowerCase())
    );
  }
  _isRelevantToTeamMember(content, channelId, lastAgentMemory = null) {
    const teamConfig = this.runtime.character.clientConfig?.discord;
    if (this._isTeamLeader() && lastAgentMemory?.content.text) {
      const timeSinceLastMessage = Date.now() - lastAgentMemory.createdAt;
      if (timeSinceLastMessage > MESSAGE_CONSTANTS.INTEREST_DECAY_TIME) {
        return false;
      }
      const similarity = cosineSimilarity(
        content.toLowerCase(),
        lastAgentMemory.content.text.toLowerCase()
      );
      return similarity >= MESSAGE_CONSTANTS.DEFAULT_SIMILARITY_THRESHOLD_FOLLOW_UPS;
    }
    if (!teamConfig?.teamMemberInterestKeywords) {
      return false;
    }
    return teamConfig.teamMemberInterestKeywords.some(
      (keyword) => content.toLowerCase().includes(keyword.toLowerCase())
    );
  }
  async _analyzeContextSimilarity(currentMessage, previousContext, agentLastMessage) {
    if (!previousContext) return 1;
    const timeDiff = Date.now() - previousContext.timestamp;
    const timeWeight = Math.max(0, 1 - timeDiff / (5 * 60 * 1e3));
    const similarity = cosineSimilarity(
      currentMessage.toLowerCase(),
      previousContext.content.toLowerCase(),
      agentLastMessage?.toLowerCase()
    );
    const weightedSimilarity = similarity * timeWeight;
    return weightedSimilarity;
  }
  async _shouldRespondBasedOnContext(message, channelState) {
    if (this._isMessageForMe(message)) return true;
    if (channelState?.currentHandler !== this.client.user?.id) return false;
    if (!channelState.messages?.length) return false;
    const lastUserMessage = [...channelState.messages].reverse().find(
      (m, index) => index > 0 && // Skip first message (current)
      m.userId !== this.runtime.agentId
    );
    if (!lastUserMessage) return false;
    const lastSelfMemories = await this.runtime.messageManager.getMemories({
      roomId: stringToUuid(
        message.channel.id + "-" + this.runtime.agentId
      ),
      unique: false,
      count: 5
    });
    const lastSelfSortedMemories = lastSelfMemories?.filter((m) => m.userId === this.runtime.agentId).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const contextSimilarity = await this._analyzeContextSimilarity(
      message.content,
      {
        content: lastUserMessage.content.text || "",
        timestamp: Date.now()
      },
      lastSelfSortedMemories?.[0]?.content?.text
    );
    const similarityThreshold = this.runtime.character.clientConfig?.discord?.messageSimilarityThreshold || channelState.contextSimilarityThreshold || MESSAGE_CONSTANTS.DEFAULT_SIMILARITY_THRESHOLD;
    return contextSimilarity >= similarityThreshold;
  }
  _checkInterest(channelId) {
    const channelState = this.interestChannels[channelId];
    if (!channelState) return false;
    const lastMessage = channelState.messages[channelState.messages.length - 1];
    const timeSinceLastMessage = Date.now() - channelState.lastMessageSent;
    if (timeSinceLastMessage > MESSAGE_CONSTANTS.INTEREST_DECAY_TIME) {
      delete this.interestChannels[channelId];
      return false;
    } else if (timeSinceLastMessage > MESSAGE_CONSTANTS.PARTIAL_INTEREST_DECAY) {
      return this._isRelevantToTeamMember(
        lastMessage.content.text || "",
        channelId
      );
    }
    if (this._isTeamLeader() && channelState.messages.length > 0) {
      if (!this._isRelevantToTeamMember(
        lastMessage.content.text || "",
        channelId
      )) {
        const recentTeamResponses = channelState.messages.slice(-3).some(
          (m) => m.userId !== this.client.user?.id && this._isTeamMember(m.userId)
        );
        if (recentTeamResponses) {
          delete this.interestChannels[channelId];
          return false;
        }
      }
    }
    if (channelState.messages.length > 0) {
      const recentMessages = channelState.messages.slice(
        -MESSAGE_CONSTANTS.RECENT_MESSAGE_COUNT
      );
      const differentUsers = new Set(recentMessages.map((m) => m.userId)).size;
      if (differentUsers > 1 && !recentMessages.some((m) => m.userId === this.client.user?.id)) {
        delete this.interestChannels[channelId];
        return false;
      }
    }
    return true;
  }
  async _shouldIgnore(message) {
    if (message.author.id === this.client.user?.id) return true;
    if (this.runtime.character.clientConfig?.discord?.shouldRespondOnlyToMentions) {
      return !this._isMessageForMe(message);
    }
    if (this.runtime.character.clientConfig?.discord?.isPartOfTeam) {
      const authorId = this._getNormalizedUserId(message.author.id);
      if (this._isTeamLeader()) {
        if (this._isTeamCoordinationRequest(message.content)) {
          return false;
        }
        if (!this._isMessageForMe(message)) {
          const otherMemberInterests = this.runtime.character.clientConfig?.discord?.teamMemberInterestKeywords || [];
          const hasOtherInterests = otherMemberInterests.some(
            (keyword) => message.content.toLowerCase().includes(keyword.toLowerCase())
          );
          if (hasOtherInterests) {
            return true;
          }
        }
      } else if (this._isTeamCoordinationRequest(message.content)) {
        const randomDelay = Math.floor(
          Math.random() * (TIMING_CONSTANTS.TEAM_MEMBER_DELAY_MAX - TIMING_CONSTANTS.TEAM_MEMBER_DELAY_MIN)
        ) + TIMING_CONSTANTS.TEAM_MEMBER_DELAY_MIN;
        await new Promise(
          (resolve) => setTimeout(resolve, randomDelay)
        );
        return false;
      }
      if (this._isTeamMember(authorId)) {
        if (!this._isMessageForMe(message)) {
          if (this._isRelevantToTeamMember(
            message.content,
            message.channelId
          )) {
            return false;
          }
          return true;
        }
      }
      const channelState = this.interestChannels[message.channelId];
      if (channelState?.currentHandler) {
        if (channelState.currentHandler === this.client.user?.id) {
          if (this._isRelevantToTeamMember(
            message.content,
            message.channelId
          )) {
            return false;
          }
          const shouldRespondContext = await this._shouldRespondBasedOnContext(
            message,
            channelState
          );
          return !shouldRespondContext;
        } else if (!this._isMessageForMe(message) && !this._isTeamCoordinationRequest(message.content)) {
          return true;
        }
      }
    }
    let messageContent = message.content.toLowerCase();
    const botMention = `<@!?${this.client.user?.id}>`;
    messageContent = messageContent.replace(
      new RegExp(botMention, "gi"),
      this.runtime.character.name.toLowerCase()
    );
    const botUsername = this.client.user?.username.toLowerCase();
    messageContent = messageContent.replace(
      new RegExp(`\\b${botUsername}\\b`, "g"),
      this.runtime.character.name.toLowerCase()
    );
    messageContent = messageContent.replace(/[^a-zA-Z0-9\s]/g, "");
    if (messageContent.length < MESSAGE_LENGTH_THRESHOLDS.LOSE_INTEREST && LOSE_INTEREST_WORDS.some((word) => messageContent.includes(word))) {
      delete this.interestChannels[message.channelId];
      return true;
    }
    if (messageContent.length < MESSAGE_LENGTH_THRESHOLDS.SHORT_MESSAGE && !this.interestChannels[message.channelId]) {
      return true;
    }
    const targetedPhrases = [
      this.runtime.character.name + " stop responding",
      this.runtime.character.name + " stop talking",
      this.runtime.character.name + " shut up",
      this.runtime.character.name + " stfu",
      "stop talking" + this.runtime.character.name,
      this.runtime.character.name + " stop talking",
      "shut up " + this.runtime.character.name,
      this.runtime.character.name + " shut up",
      "stfu " + this.runtime.character.name,
      this.runtime.character.name + " stfu",
      "chill" + this.runtime.character.name,
      this.runtime.character.name + " chill"
    ];
    if (targetedPhrases.some((phrase) => messageContent.includes(phrase))) {
      delete this.interestChannels[message.channelId];
      return true;
    }
    if (!this.interestChannels[message.channelId] && messageContent.length < MESSAGE_LENGTH_THRESHOLDS.VERY_SHORT_MESSAGE) {
      return true;
    }
    if (message.content.length < MESSAGE_LENGTH_THRESHOLDS.IGNORE_RESPONSE && IGNORE_RESPONSE_WORDS.some(
      (word) => message.content.toLowerCase().includes(word)
    )) {
      return true;
    }
    return false;
  }
  async _shouldRespond(message, state) {
    if (message.author.id === this.client.user?.id) return false;
    if (this.runtime.character.clientConfig?.discord?.shouldRespondOnlyToMentions) {
      return this._isMessageForMe(message);
    }
    const channelState = this.interestChannels[message.channelId];
    if (this.runtime.character.clientConfig?.discord?.isPartOfTeam && !this._isTeamLeader() && this._isRelevantToTeamMember(message.content, message.channelId)) {
      return true;
    }
    try {
      if (this.runtime.character.clientConfig?.discord?.isPartOfTeam) {
        if (this._isTeamLeader() && this._isTeamCoordinationRequest(message.content)) {
          return true;
        }
        if (!this._isTeamLeader() && this._isRelevantToTeamMember(
          message.content,
          message.channelId
        )) {
          await new Promise(
            (resolve) => setTimeout(resolve, TIMING_CONSTANTS.TEAM_MEMBER_DELAY)
          );
          if (channelState?.messages?.length) {
            const recentMessages = channelState.messages.slice(
              -MESSAGE_CONSTANTS.RECENT_MESSAGE_COUNT
            );
            const leaderResponded = recentMessages.some(
              (m) => m.userId === this.runtime.character.clientConfig?.discord?.teamLeaderId && Date.now() - channelState.lastMessageSent < 3e3
            );
            if (leaderResponded) {
              return Math.random() > RESPONSE_CHANCES.AFTER_LEADER;
            }
          }
          return true;
        }
        if (this._isTeamLeader() && !this._isRelevantToTeamMember(
          message.content,
          message.channelId
        )) {
          const randomDelay = Math.floor(
            Math.random() * (TIMING_CONSTANTS.LEADER_DELAY_MAX - TIMING_CONSTANTS.LEADER_DELAY_MIN)
          ) + TIMING_CONSTANTS.LEADER_DELAY_MIN;
          await new Promise(
            (resolve) => setTimeout(resolve, randomDelay)
          );
          if (channelState?.messages?.length) {
            const recentResponses = channelState.messages.slice(
              -MESSAGE_CONSTANTS.RECENT_MESSAGE_COUNT
            );
            const otherTeamMemberResponded = recentResponses.some(
              (m) => m.userId !== this.client.user?.id && this._isTeamMember(m.userId)
            );
            if (otherTeamMemberResponded) {
              return false;
            }
          }
        }
        if (this._isMessageForMe(message)) {
          const channelState2 = this.interestChannels[message.channelId];
          if (channelState2) {
            channelState2.currentHandler = this.client.user?.id;
            channelState2.lastMessageSent = Date.now();
          }
          return true;
        }
        if (channelState?.currentHandler) {
          if (channelState.currentHandler !== this.client.user?.id && this._isTeamMember(channelState.currentHandler)) {
            return false;
          }
        }
        if (!this._isMessageForMe(message) && channelState) {
          const recentMessages = channelState.messages.slice(
            -MESSAGE_CONSTANTS.CHAT_HISTORY_COUNT
          );
          const ourMessageCount = recentMessages.filter(
            (m) => m.userId === this.client.user?.id
          ).length;
          if (ourMessageCount > 2) {
            const responseChance = Math.pow(
              0.5,
              ourMessageCount - 2
            );
            if (Math.random() > responseChance) {
              return false;
            }
          }
        }
      }
    } catch (error) {
      elizaLogger2.error("Error in _shouldRespond team processing:", {
        error,
        agentId: this.runtime.agentId,
        channelId: message.channelId
      });
    }
    if (channelState?.previousContext) {
      const shouldRespondContext2 = await this._shouldRespondBasedOnContext(message, channelState);
      if (!shouldRespondContext2) {
        delete this.interestChannels[message.channelId];
        return false;
      }
    }
    if (message.mentions.has(this.client.user?.id)) return true;
    const guild = message.guild;
    const member = guild?.members.cache.get(this.client.user?.id);
    const nickname = member?.nickname;
    if (message.content.toLowerCase().includes(this.client.user?.username.toLowerCase()) || message.content.toLowerCase().includes(this.client.user?.tag.toLowerCase()) || nickname && message.content.toLowerCase().includes(nickname.toLowerCase())) {
      return true;
    }
    if (!message.guild) {
      return true;
    }
    const shouldRespondContext = composeContext6({
      state,
      template: this.runtime.character.templates?.discordShouldRespondTemplate || this.runtime.character.templates?.shouldRespondTemplate || composeRandomUser(discordShouldRespondTemplate, 2)
    });
    const response = await generateShouldRespond({
      runtime: this.runtime,
      context: shouldRespondContext,
      modelClass: ModelClass8.SMALL
    });
    if (response === "RESPOND") {
      if (channelState) {
        channelState.previousContext = {
          content: message.content,
          timestamp: Date.now()
        };
      }
      return true;
    } else if (response === "IGNORE") {
      return false;
    } else if (response === "STOP") {
      delete this.interestChannels[message.channelId];
      return false;
    } else {
      console.error(
        "Invalid response from response generateText:",
        response
      );
      return false;
    }
  }
  async _generateResponse(message, state, context) {
    const { userId, roomId } = message;
    const response = await generateMessageResponse({
      runtime: this.runtime,
      context,
      modelClass: ModelClass8.LARGE
    });
    if (!response) {
      console.error("No response from generateMessageResponse");
      return;
    }
    await this.runtime.databaseAdapter.log({
      body: { message, context, response },
      userId,
      roomId,
      type: "response"
    });
    return response;
  }
  async fetchBotName(botToken) {
    const url = "https://discord.com/api/v10/users/@me";
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bot ${botToken}`
      }
    });
    if (!response.ok) {
      throw new Error(
        `Error fetching bot details: ${response.statusText}`
      );
    }
    const data = await response.json();
    return data.username;
  }
  /**
   * Simulate discord typing while generating a response;
   * returns a function to interrupt the typing loop
   *
   * @param message
   */
  simulateTyping(message) {
    let typing = true;
    const typingLoop = async () => {
      while (typing) {
        await message.channel.sendTyping();
        await new Promise((resolve) => setTimeout(resolve, 3e3));
      }
    };
    typingLoop();
    return function stopTyping() {
      typing = false;
    };
  }
};

// src/providers/channelState.ts
import {
  ChannelType as ChannelType5
} from "discord.js";
var channelStateProvider = {
  get: async (runtime, message, state) => {
    const discordMessage = state?.discordMessage || state?.discordChannel;
    if (!discordMessage) {
      return "";
    }
    const guild = discordMessage?.guild;
    const agentName = state?.agentName || "The agent";
    const senderName = state?.senderName || "someone";
    if (!guild) {
      return agentName + " is currently in a direct message conversation with " + senderName;
    }
    const serverName = guild.name;
    const guildId = guild.id;
    const channel = discordMessage.channel;
    if (!channel) {
      console.log("channel is null");
      return "";
    }
    let response = agentName + " is currently having a conversation in the channel `@" + channel.id + " in the server `" + serverName + "` (@" + guildId + ")";
    if (channel.type === ChannelType5.GuildText && channel.topic) {
      response += "\nThe topic of the channel is: " + channel.topic;
    }
    return response;
  }
};
var channelState_default = channelStateProvider;

// src/providers/voiceState.ts
import { getVoiceConnection as getVoiceConnection2 } from "@discordjs/voice";
import { ChannelType as ChannelType6 } from "discord.js";
var voiceStateProvider = {
  get: async (runtime, message, state) => {
    const discordMessage = state?.discordMessage || state.discordChannel;
    const connection = getVoiceConnection2(
      discordMessage?.guild?.id
    );
    const agentName = state?.agentName || "The agent";
    if (!connection) {
      return agentName + " is not currently in a voice channel";
    }
    const channel = (state?.discordMessage || state.discordChannel)?.guild?.channels?.cache?.get(
      connection.joinConfig.channelId
    );
    if (!channel || channel.type !== ChannelType6.GuildVoice) {
      return agentName + " is in an invalid voice channel";
    }
    return `${agentName} is currently in the voice channel: ${channel.name} (ID: ${channel.id})`;
  }
};
var voiceState_default = voiceStateProvider;

// src/voice.ts
import {
  ModelClass as ModelClass9,
  ServiceType as ServiceType4,
  composeContext as composeContext7,
  composeRandomUser as composeRandomUser2,
  elizaLogger as elizaLogger3,
  getEmbeddingZeroVector as getEmbeddingZeroVector2,
  generateMessageResponse as generateMessageResponse2,
  stringToUuid as stringToUuid2,
  generateShouldRespond as generateShouldRespond2
} from "@elizaos/core";
import {
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnections,
  joinVoiceChannel as joinVoiceChannel2,
  entersState
} from "@discordjs/voice";
import {
  ChannelType as ChannelType7
} from "discord.js";
import EventEmitter from "events";
import prism from "prism-media";
import { pipeline } from "stream";
var DECODE_FRAME_SIZE = 1024;
var DECODE_SAMPLE_RATE = 16e3;
var AudioMonitor = class {
  readable;
  buffers = [];
  maxSize;
  lastFlagged = -1;
  ended = false;
  constructor(readable, maxSize, onStart, callback) {
    this.readable = readable;
    this.maxSize = maxSize;
    this.readable.on("data", (chunk) => {
      if (this.lastFlagged < 0) {
        this.lastFlagged = this.buffers.length;
      }
      this.buffers.push(chunk);
      const currentSize = this.buffers.reduce(
        (acc, cur) => acc + cur.length,
        0
      );
      while (currentSize > this.maxSize) {
        this.buffers.shift();
        this.lastFlagged--;
      }
    });
    this.readable.on("end", () => {
      elizaLogger3.log("AudioMonitor ended");
      this.ended = true;
      if (this.lastFlagged < 0) return;
      callback(this.getBufferFromStart());
      this.lastFlagged = -1;
    });
    this.readable.on("speakingStopped", () => {
      if (this.ended) return;
      elizaLogger3.log("Speaking stopped");
      if (this.lastFlagged < 0) return;
      callback(this.getBufferFromStart());
    });
    this.readable.on("speakingStarted", () => {
      if (this.ended) return;
      onStart();
      elizaLogger3.log("Speaking started");
      this.reset();
    });
  }
  stop() {
    this.readable.removeAllListeners("data");
    this.readable.removeAllListeners("end");
    this.readable.removeAllListeners("speakingStopped");
    this.readable.removeAllListeners("speakingStarted");
  }
  isFlagged() {
    return this.lastFlagged >= 0;
  }
  getBufferFromFlag() {
    if (this.lastFlagged < 0) {
      return null;
    }
    const buffer = Buffer.concat(this.buffers.slice(this.lastFlagged));
    return buffer;
  }
  getBufferFromStart() {
    const buffer = Buffer.concat(this.buffers);
    return buffer;
  }
  reset() {
    this.buffers = [];
    this.lastFlagged = -1;
  }
  isEnded() {
    return this.ended;
  }
};
var VoiceManager = class extends EventEmitter {
  processingVoice = false;
  transcriptionTimeout = null;
  userStates = /* @__PURE__ */ new Map();
  activeAudioPlayer = null;
  client;
  runtime;
  streams = /* @__PURE__ */ new Map();
  connections = /* @__PURE__ */ new Map();
  activeMonitors = /* @__PURE__ */ new Map();
  constructor(client) {
    super();
    this.client = client.client;
    this.runtime = client.runtime;
  }
  async handleVoiceStateUpdate(oldState, newState) {
    const oldChannelId = oldState.channelId;
    const newChannelId = newState.channelId;
    const member = newState.member;
    if (!member) return;
    if (member.id === this.client.user?.id) {
      return;
    }
    if (oldChannelId === newChannelId) {
      return;
    }
    if (oldChannelId && this.connections.has(oldChannelId)) {
      this.stopMonitoringMember(member.id);
    }
    if (newChannelId && this.connections.has(newChannelId)) {
      await this.monitorMember(
        member,
        newState.channel
      );
    }
  }
  async joinChannel(channel) {
    const oldConnection = this.getVoiceConnection(
      channel.guildId
    );
    if (oldConnection) {
      try {
        oldConnection.destroy();
        this.streams.clear();
        this.activeMonitors.clear();
      } catch (error) {
        console.error("Error leaving voice channel:", error);
      }
    }
    const connection = joinVoiceChannel2({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: false,
      selfMute: false,
      group: this.client.user.id
    });
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Ready, 2e4),
        entersState(
          connection,
          VoiceConnectionStatus.Signalling,
          2e4
        )
      ]);
      elizaLogger3.log(
        `Voice connection established in state: ${connection.state.status}`
      );
      connection.on("stateChange", async (oldState, newState) => {
        elizaLogger3.log(
          `Voice connection state changed from ${oldState.status} to ${newState.status}`
        );
        if (newState.status === VoiceConnectionStatus.Disconnected) {
          elizaLogger3.log("Handling disconnection...");
          try {
            await Promise.race([
              entersState(
                connection,
                VoiceConnectionStatus.Signalling,
                5e3
              ),
              entersState(
                connection,
                VoiceConnectionStatus.Connecting,
                5e3
              )
            ]);
            elizaLogger3.log("Reconnecting to channel...");
          } catch (e) {
            elizaLogger3.log(
              "Disconnection confirmed - cleaning up..." + e
            );
            connection.destroy();
            this.connections.delete(channel.id);
          }
        } else if (newState.status === VoiceConnectionStatus.Destroyed) {
          this.connections.delete(channel.id);
        } else if (!this.connections.has(channel.id) && (newState.status === VoiceConnectionStatus.Ready || newState.status === VoiceConnectionStatus.Signalling)) {
          this.connections.set(channel.id, connection);
        }
      });
      connection.on("error", (error) => {
        elizaLogger3.log("Voice connection error:", error);
        elizaLogger3.log(
          "Connection error - will attempt to recover..."
        );
      });
      this.connections.set(channel.id, connection);
      const me = channel.guild.members.me;
      if (me?.voice && me.permissions.has("DeafenMembers")) {
        try {
          await me.voice.setDeaf(false);
          await me.voice.setMute(false);
        } catch (error) {
          elizaLogger3.log("Failed to modify voice state:", error);
        }
      }
      connection.receiver.speaking.on("start", async (userId) => {
        let user = channel.members.get(userId);
        if (!user) {
          try {
            user = await channel.guild.members.fetch(userId);
          } catch (error) {
            console.error("Failed to fetch user:", error);
          }
        }
        if (user && !user?.user.bot) {
          this.monitorMember(user, channel);
          this.streams.get(userId)?.emit("speakingStarted");
        }
      });
      connection.receiver.speaking.on("end", async (userId) => {
        const user = channel.members.get(userId);
        if (!user?.user.bot) {
          this.streams.get(userId)?.emit("speakingStopped");
        }
      });
    } catch (error) {
      elizaLogger3.log("Failed to establish voice connection:", error);
      connection.destroy();
      this.connections.delete(channel.id);
      throw error;
    }
  }
  getVoiceConnection(guildId) {
    const connections = getVoiceConnections(this.client.user.id);
    if (!connections) {
      return;
    }
    const connection = [...connections.values()].find(
      (connection2) => connection2.joinConfig.guildId === guildId
    );
    return connection;
  }
  async monitorMember(member, channel) {
    const userId = member?.id;
    const userName = member?.user?.username;
    const name = member?.user?.displayName;
    const connection = this.getVoiceConnection(member?.guild?.id);
    const receiveStream = connection?.receiver.subscribe(userId, {
      autoDestroy: true,
      emitClose: true
    });
    if (!receiveStream || receiveStream.readableLength === 0) {
      return;
    }
    const opusDecoder = new prism.opus.Decoder({
      channels: 1,
      rate: DECODE_SAMPLE_RATE,
      frameSize: DECODE_FRAME_SIZE
    });
    const volumeBuffer = [];
    const VOLUME_WINDOW_SIZE = 30;
    const SPEAKING_THRESHOLD = 0.05;
    opusDecoder.on("data", (pcmData) => {
      if (this.activeAudioPlayer) {
        const samples = new Int16Array(
          pcmData.buffer,
          pcmData.byteOffset,
          pcmData.length / 2
        );
        const maxAmplitude = Math.max(...samples.map(Math.abs)) / 32768;
        volumeBuffer.push(maxAmplitude);
        if (volumeBuffer.length > VOLUME_WINDOW_SIZE) {
          volumeBuffer.shift();
        }
        const avgVolume = volumeBuffer.reduce((sum, v) => sum + v, 0) / VOLUME_WINDOW_SIZE;
        if (avgVolume > SPEAKING_THRESHOLD) {
          volumeBuffer.length = 0;
          this.cleanupAudioPlayer(this.activeAudioPlayer);
          this.processingVoice = false;
        }
      }
    });
    pipeline(
      receiveStream,
      opusDecoder,
      (err) => {
        if (err) {
          console.log(`Opus decoding pipeline error: ${err}`);
        }
      }
    );
    this.streams.set(userId, opusDecoder);
    this.connections.set(userId, connection);
    opusDecoder.on("error", (err) => {
      console.log(`Opus decoding error: ${err}`);
    });
    const errorHandler = (err) => {
      console.log(`Opus decoding error: ${err}`);
    };
    const streamCloseHandler = () => {
      console.log(`voice stream from ${member?.displayName} closed`);
      this.streams.delete(userId);
      this.connections.delete(userId);
    };
    const closeHandler = () => {
      console.log(`Opus decoder for ${member?.displayName} closed`);
      opusDecoder.removeListener("error", errorHandler);
      opusDecoder.removeListener("close", closeHandler);
      receiveStream?.removeListener("close", streamCloseHandler);
    };
    opusDecoder.on("error", errorHandler);
    opusDecoder.on("close", closeHandler);
    receiveStream?.on("close", streamCloseHandler);
    this.client.emit(
      "userStream",
      userId,
      name,
      userName,
      channel,
      opusDecoder
    );
  }
  leaveChannel(channel) {
    const connection = this.connections.get(channel.id);
    if (connection) {
      connection.destroy();
      this.connections.delete(channel.id);
    }
    for (const [memberId, monitorInfo] of this.activeMonitors) {
      if (monitorInfo.channel.id === channel.id && memberId !== this.client.user?.id) {
        this.stopMonitoringMember(memberId);
      }
    }
    console.log(`Left voice channel: ${channel.name} (${channel.id})`);
  }
  stopMonitoringMember(memberId) {
    const monitorInfo = this.activeMonitors.get(memberId);
    if (monitorInfo) {
      monitorInfo.monitor.stop();
      this.activeMonitors.delete(memberId);
      this.streams.delete(memberId);
      console.log(`Stopped monitoring user ${memberId}`);
    }
  }
  async handleGuildCreate(guild) {
    console.log(`Joined guild ${guild.name}`);
  }
  async debouncedProcessTranscription(userId, name, userName, channel) {
    const DEBOUNCE_TRANSCRIPTION_THRESHOLD = 1500;
    if (this.activeAudioPlayer?.state?.status === "idle") {
      elizaLogger3.log("Cleaning up idle audio player.");
      this.cleanupAudioPlayer(this.activeAudioPlayer);
    }
    if (this.activeAudioPlayer || this.processingVoice) {
      const state = this.userStates.get(userId);
      state.buffers.length = 0;
      state.totalLength = 0;
      return;
    }
    if (this.transcriptionTimeout) {
      clearTimeout(this.transcriptionTimeout);
    }
    this.transcriptionTimeout = setTimeout(async () => {
      this.processingVoice = true;
      try {
        await this.processTranscription(
          userId,
          channel.id,
          channel,
          name,
          userName
        );
        this.userStates.forEach((state, _) => {
          state.buffers.length = 0;
          state.totalLength = 0;
        });
      } finally {
        this.processingVoice = false;
      }
    }, DEBOUNCE_TRANSCRIPTION_THRESHOLD);
  }
  async handleUserStream(userId, name, userName, channel, audioStream) {
    console.log(`Starting audio monitor for user: ${userId}`);
    if (!this.userStates.has(userId)) {
      this.userStates.set(userId, {
        buffers: [],
        totalLength: 0,
        lastActive: Date.now(),
        transcriptionText: ""
      });
    }
    const state = this.userStates.get(userId);
    const processBuffer = async (buffer) => {
      try {
        state.buffers.push(buffer);
        state.totalLength += buffer.length;
        state.lastActive = Date.now();
        this.debouncedProcessTranscription(
          userId,
          name,
          userName,
          channel
        );
      } catch (error) {
        console.error(
          `Error processing buffer for user ${userId}:`,
          error
        );
      }
    };
    new AudioMonitor(
      audioStream,
      1e7,
      () => {
        if (this.transcriptionTimeout) {
          clearTimeout(this.transcriptionTimeout);
        }
      },
      async (buffer) => {
        if (!buffer) {
          console.error("Received empty buffer");
          return;
        }
        await processBuffer(buffer);
      }
    );
  }
  async processTranscription(userId, channelId, channel, name, userName) {
    const state = this.userStates.get(userId);
    if (!state || state.buffers.length === 0) return;
    try {
      let isValidTranscription = function(text) {
        if (!text || text.includes("[BLANK_AUDIO]")) return false;
        return true;
      };
      const inputBuffer = Buffer.concat(state.buffers, state.totalLength);
      state.buffers.length = 0;
      state.totalLength = 0;
      const wavBuffer = await this.convertOpusToWav(inputBuffer);
      console.log("Starting transcription...");
      const transcriptionText = await this.runtime.getService(ServiceType4.TRANSCRIPTION).transcribe(wavBuffer);
      if (transcriptionText && isValidTranscription(transcriptionText)) {
        state.transcriptionText += transcriptionText;
      }
      if (state.transcriptionText.length) {
        this.cleanupAudioPlayer(this.activeAudioPlayer);
        const finalText = state.transcriptionText;
        state.transcriptionText = "";
        await this.handleUserMessage(
          finalText,
          userId,
          channelId,
          channel,
          name,
          userName
        );
      }
    } catch (error) {
      console.error(
        `Error transcribing audio for user ${userId}:`,
        error
      );
    }
  }
  async handleUserMessage(message, userId, channelId, channel, name, userName) {
    try {
      const roomId = stringToUuid2(channelId + "-" + this.runtime.agentId);
      const userIdUUID = stringToUuid2(userId);
      await this.runtime.ensureConnection(
        userIdUUID,
        roomId,
        userName,
        name,
        "discord"
      );
      let state = await this.runtime.composeState(
        {
          agentId: this.runtime.agentId,
          content: { text: message, source: "Discord" },
          userId: userIdUUID,
          roomId
        },
        {
          discordChannel: channel,
          discordClient: this.client,
          agentName: this.runtime.character.name
        }
      );
      if (message && message.startsWith("/")) {
        return null;
      }
      const memory = {
        id: stringToUuid2(channelId + "-voice-message-" + Date.now()),
        agentId: this.runtime.agentId,
        content: {
          text: message,
          source: "discord",
          url: channel.url
        },
        userId: userIdUUID,
        roomId,
        embedding: getEmbeddingZeroVector2(),
        createdAt: Date.now()
      };
      if (!memory.content.text) {
        return { text: "", action: "IGNORE" };
      }
      await this.runtime.messageManager.createMemory(memory);
      state = await this.runtime.updateRecentMessageState(state);
      const shouldIgnore = await this._shouldIgnore(memory);
      if (shouldIgnore) {
        return { text: "", action: "IGNORE" };
      }
      const shouldRespond = await this._shouldRespond(
        message,
        userId,
        channel,
        state
      );
      if (!shouldRespond) {
        return;
      }
      const context = composeContext7({
        state,
        template: this.runtime.character.templates?.discordVoiceHandlerTemplate || this.runtime.character.templates?.messageHandlerTemplate || discordVoiceHandlerTemplate
      });
      const responseContent = await this._generateResponse(
        memory,
        state,
        context
      );
      const callback = async (content2) => {
        console.log("callback content: ", content2);
        const { roomId: roomId2 } = memory;
        const responseMemory = {
          id: stringToUuid2(
            memory.id + "-voice-response-" + Date.now()
          ),
          agentId: this.runtime.agentId,
          userId: this.runtime.agentId,
          content: {
            ...content2,
            user: this.runtime.character.name,
            inReplyTo: memory.id
          },
          roomId: roomId2,
          embedding: getEmbeddingZeroVector2()
        };
        if (responseMemory.content.text?.trim()) {
          await this.runtime.messageManager.createMemory(
            responseMemory
          );
          state = await this.runtime.updateRecentMessageState(state);
          const responseStream = await this.runtime.getService(
            ServiceType4.SPEECH_GENERATION
          ).generate(this.runtime, content2.text);
          if (responseStream) {
            await this.playAudioStream(
              userId,
              responseStream
            );
          }
          await this.runtime.evaluate(memory, state);
        } else {
          console.warn("Empty response, skipping");
        }
        return [responseMemory];
      };
      const responseMemories = await callback(responseContent);
      const response = responseContent;
      const content = response.responseMessage || response.content || response.message;
      if (!content) {
        return null;
      }
      console.log("responseMemories: ", responseMemories);
      await this.runtime.processActions(
        memory,
        responseMemories,
        state,
        callback
      );
    } catch (error) {
      console.error("Error processing transcribed text:", error);
    }
  }
  async convertOpusToWav(pcmBuffer) {
    try {
      const wavHeader = getWavHeader(
        pcmBuffer.length,
        DECODE_SAMPLE_RATE
      );
      const wavBuffer = Buffer.concat([wavHeader, pcmBuffer]);
      return wavBuffer;
    } catch (error) {
      console.error("Error converting PCM to WAV:", error);
      throw error;
    }
  }
  async _shouldRespond(message, userId, channel, state) {
    if (userId === this.client.user?.id) return false;
    const lowerMessage = message.toLowerCase();
    const botName = this.client.user.username.toLowerCase();
    const characterName = this.runtime.character.name.toLowerCase();
    const guild = channel.guild;
    const member = guild?.members.cache.get(this.client.user?.id);
    const nickname = member?.nickname;
    if (lowerMessage.includes(botName) || lowerMessage.includes(characterName) || lowerMessage.includes(
      this.client.user?.tag.toLowerCase()
    ) || nickname && lowerMessage.includes(nickname.toLowerCase())) {
      return true;
    }
    if (!channel.guild) {
      return true;
    }
    const shouldRespondContext = composeContext7({
      state,
      template: this.runtime.character.templates?.discordShouldRespondTemplate || this.runtime.character.templates?.shouldRespondTemplate || composeRandomUser2(discordShouldRespondTemplate, 2)
    });
    const response = await generateShouldRespond2({
      runtime: this.runtime,
      context: shouldRespondContext,
      modelClass: ModelClass9.SMALL
    });
    if (response === "RESPOND") {
      return true;
    } else if (response === "IGNORE") {
      return false;
    } else if (response === "STOP") {
      return false;
    } else {
      console.error(
        "Invalid response from response generateText:",
        response
      );
      return false;
    }
  }
  async _generateResponse(message, state, context) {
    const { userId, roomId } = message;
    const response = await generateMessageResponse2({
      runtime: this.runtime,
      context,
      modelClass: ModelClass9.SMALL
    });
    response.source = "discord";
    if (!response) {
      console.error("No response from generateMessageResponse");
      return;
    }
    await this.runtime.databaseAdapter.log({
      body: { message, context, response },
      userId,
      roomId,
      type: "response"
    });
    return response;
  }
  async _shouldIgnore(message) {
    elizaLogger3.debug("message.content: ", message.content);
    if (message.content.text.length < 3) {
      return true;
    }
    const loseInterestWords = [
      // telling the bot to stop talking
      "shut up",
      "stop",
      "dont talk",
      "silence",
      "stop talking",
      "be quiet",
      "hush",
      "stfu",
      "stupid bot",
      "dumb bot",
      // offensive words
      "fuck",
      "shit",
      "damn",
      "suck",
      "dick",
      "cock",
      "sex",
      "sexy"
    ];
    if (message.content.text.length < 50 && loseInterestWords.some(
      (word) => message.content.text?.toLowerCase().includes(word)
    )) {
      return true;
    }
    const ignoreWords = ["k", "ok", "bye", "lol", "nm", "uh"];
    if (message.content.text?.length < 8 && ignoreWords.some(
      (word) => message.content.text?.toLowerCase().includes(word)
    )) {
      return true;
    }
    return false;
  }
  async scanGuild(guild) {
    let chosenChannel = null;
    try {
      const channelId = this.runtime.getSetting(
        "DISCORD_VOICE_CHANNEL_ID"
      );
      if (channelId) {
        const channel = await guild.channels.fetch(channelId);
        if (channel?.isVoiceBased()) {
          chosenChannel = channel;
        }
      }
      if (!chosenChannel) {
        const channels = (await guild.channels.fetch()).filter(
          (channel) => channel?.type == ChannelType7.GuildVoice
        );
        for (const [, channel] of channels) {
          const voiceChannel = channel;
          if (voiceChannel.members.size > 0 && (chosenChannel === null || voiceChannel.members.size > chosenChannel.members.size)) {
            chosenChannel = voiceChannel;
          }
        }
      }
      if (chosenChannel) {
        console.log(`Joining channel: ${chosenChannel.name}`);
        await this.joinChannel(chosenChannel);
      } else {
        console.warn("No suitable voice channel found to join.");
      }
    } catch (error) {
      console.error("Error selecting or joining a voice channel:", error);
    }
  }
  async playAudioStream(userId, audioStream) {
    const connection = this.connections.get(userId);
    if (connection == null) {
      console.log(`No connection for user ${userId}`);
      return;
    }
    this.cleanupAudioPlayer(this.activeAudioPlayer);
    const audioPlayer = createAudioPlayer({
      behaviors: {
        noSubscriber: NoSubscriberBehavior.Pause
      }
    });
    this.activeAudioPlayer = audioPlayer;
    connection.subscribe(audioPlayer);
    const audioStartTime = Date.now();
    const resource = createAudioResource(audioStream, {
      inputType: StreamType.Arbitrary
    });
    audioPlayer.play(resource);
    audioPlayer.on("error", (err) => {
      console.log(`Audio player error: ${err}`);
    });
    audioPlayer.on(
      "stateChange",
      (_oldState, newState) => {
        if (newState.status == "idle") {
          const idleTime = Date.now();
          console.log(
            `Audio playback took: ${idleTime - audioStartTime}ms`
          );
        }
      }
    );
  }
  cleanupAudioPlayer(audioPlayer) {
    if (!audioPlayer) return;
    audioPlayer.stop();
    audioPlayer.removeAllListeners();
    if (audioPlayer === this.activeAudioPlayer) {
      this.activeAudioPlayer = null;
    }
  }
  async handleJoinChannelCommand(interaction) {
    try {
      await interaction.deferReply();
      const channelId = interaction.options.get("channel")?.value;
      if (!channelId) {
        await interaction.editReply(
          "Please provide a voice channel to join."
        );
        return;
      }
      const guild = interaction.guild;
      if (!guild) {
        await interaction.editReply("Could not find guild.");
        return;
      }
      const voiceChannel = interaction.guild.channels.cache.find(
        (channel) => channel.id === channelId && channel.type === ChannelType7.GuildVoice
      );
      if (!voiceChannel) {
        await interaction.editReply("Voice channel not found!");
        return;
      }
      await this.joinChannel(voiceChannel);
      await interaction.editReply(
        `Joined voice channel: ${voiceChannel.name}`
      );
    } catch (error) {
      console.error("Error joining voice channel:", error);
      await interaction.editReply("Failed to join the voice channel.").catch(console.error);
    }
  }
  async handleLeaveChannelCommand(interaction) {
    const connection = this.getVoiceConnection(interaction.guildId);
    if (!connection) {
      await interaction.reply("Not currently in a voice channel.");
      return;
    }
    try {
      connection.destroy();
      await interaction.reply("Left the voice channel.");
    } catch (error) {
      console.error("Error leaving voice channel:", error);
      await interaction.reply("Failed to leave the voice channel.");
    }
  }
};

// src/index.ts
import { PermissionsBitField as PermissionsBitField2 } from "discord.js";
var DiscordClient = class extends EventEmitter2 {
  apiToken;
  client;
  runtime;
  character;
  messageManager;
  voiceManager;
  constructor(runtime) {
    super();
    this.apiToken = runtime.getSetting("DISCORD_API_TOKEN");
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.DirectMessageTyping,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildMessageReactions
      ],
      partials: [
        Partials.Channel,
        Partials.Message,
        Partials.User,
        Partials.Reaction
      ]
    });
    this.runtime = runtime;
    this.voiceManager = new VoiceManager(this);
    this.messageManager = new MessageManager(this, this.voiceManager);
    this.client.once(Events.ClientReady, this.onClientReady.bind(this));
    this.client.login(this.apiToken);
    this.setupEventListeners();
    this.runtime.registerAction(joinvoice_default);
    this.runtime.registerAction(leavevoice_default);
    this.runtime.registerAction(summarize_conversation_default);
    this.runtime.registerAction(chat_with_attachments_default);
    this.runtime.registerAction(transcribe_media_default);
    this.runtime.registerAction(download_media_default);
    this.runtime.providers.push(channelState_default);
    this.runtime.providers.push(voiceState_default);
  }
  setupEventListeners() {
    this.client.on("guildCreate", this.handleGuildCreate.bind(this));
    this.client.on(
      Events.MessageReactionAdd,
      this.handleReactionAdd.bind(this)
    );
    this.client.on(
      Events.MessageReactionRemove,
      this.handleReactionRemove.bind(this)
    );
    this.client.on(
      "voiceStateUpdate",
      this.voiceManager.handleVoiceStateUpdate.bind(this.voiceManager)
    );
    this.client.on(
      "userStream",
      this.voiceManager.handleUserStream.bind(this.voiceManager)
    );
    this.client.on(
      Events.MessageCreate,
      this.messageManager.handleMessage.bind(this.messageManager)
    );
    this.client.on(
      Events.InteractionCreate,
      this.handleInteractionCreate.bind(this)
    );
  }
  async stop() {
    try {
      await this.client.destroy();
    } catch (e) {
      elizaLogger4.error("client-discord instance stop err", e);
    }
  }
  async onClientReady(readyClient) {
    elizaLogger4.success(`Logged in as ${readyClient.user?.tag}`);
    const commands = [
      {
        name: "joinchannel",
        description: "Join a voice channel",
        options: [
          {
            name: "channel",
            type: 7,
            // CHANNEL type
            description: "The voice channel to join",
            required: true,
            channel_types: [2]
            // GuildVoice type
          }
        ]
      },
      {
        name: "leavechannel",
        description: "Leave the current voice channel"
      }
    ];
    try {
      await this.client.application?.commands.set(commands);
      elizaLogger4.success("Slash commands registered");
    } catch (error) {
      console.error("Error registering slash commands:", error);
    }
    const requiredPermissions = [
      // Text Permissions
      PermissionsBitField2.Flags.ViewChannel,
      PermissionsBitField2.Flags.SendMessages,
      PermissionsBitField2.Flags.SendMessagesInThreads,
      PermissionsBitField2.Flags.CreatePrivateThreads,
      PermissionsBitField2.Flags.CreatePublicThreads,
      PermissionsBitField2.Flags.EmbedLinks,
      PermissionsBitField2.Flags.AttachFiles,
      PermissionsBitField2.Flags.AddReactions,
      PermissionsBitField2.Flags.UseExternalEmojis,
      PermissionsBitField2.Flags.UseExternalStickers,
      PermissionsBitField2.Flags.MentionEveryone,
      PermissionsBitField2.Flags.ManageMessages,
      PermissionsBitField2.Flags.ReadMessageHistory,
      // Voice Permissions
      PermissionsBitField2.Flags.Connect,
      PermissionsBitField2.Flags.Speak,
      PermissionsBitField2.Flags.UseVAD,
      PermissionsBitField2.Flags.PrioritySpeaker
    ].reduce((a, b) => a | b, 0n);
    elizaLogger4.success("Use this URL to add the bot to your server:");
    elizaLogger4.success(
      `https://discord.com/api/oauth2/authorize?client_id=${readyClient.user?.id}&permissions=${requiredPermissions}&scope=bot%20applications.commands`
    );
    await this.onReady();
  }
  async handleReactionAdd(reaction, user) {
    try {
      elizaLogger4.log("Reaction added");
      if (!reaction || !user) {
        elizaLogger4.warn("Invalid reaction or user");
        return;
      }
      let emoji = reaction.emoji.name;
      if (!emoji && reaction.emoji.id) {
        emoji = `<:${reaction.emoji.name}:${reaction.emoji.id}>`;
      }
      if (reaction.partial) {
        try {
          await reaction.fetch();
        } catch (error) {
          elizaLogger4.error(
            "Failed to fetch partial reaction:",
            error
          );
          return;
        }
      }
      const timestamp = Date.now();
      const roomId = stringToUuid3(
        `${reaction.message.channel.id}-${this.runtime.agentId}`
      );
      const userIdUUID = stringToUuid3(
        `${user.id}-${this.runtime.agentId}`
      );
      const reactionUUID = stringToUuid3(
        `${reaction.message.id}-${user.id}-${emoji}-${timestamp}-${this.runtime.agentId}`
      );
      if (!userIdUUID || !roomId) {
        elizaLogger4.error("Invalid user ID or room ID", {
          userIdUUID,
          roomId
        });
        return;
      }
      const messageContent = reaction.message.content || "";
      const truncatedContent = messageContent.length > 100 ? `${messageContent.substring(0, 100)}...` : messageContent;
      const reactionMessage = `*<${emoji}>: "${truncatedContent}"*`;
      const userName = reaction.message.author?.username || "unknown";
      const name = reaction.message.author?.displayName || userName;
      await this.runtime.ensureConnection(
        userIdUUID,
        roomId,
        userName,
        name,
        "discord"
      );
      const memory = {
        id: reactionUUID,
        userId: userIdUUID,
        agentId: this.runtime.agentId,
        content: {
          text: reactionMessage,
          source: "discord",
          inReplyTo: stringToUuid3(
            `${reaction.message.id}-${this.runtime.agentId}`
          )
        },
        roomId,
        createdAt: timestamp,
        embedding: getEmbeddingZeroVector3()
      };
      try {
        await this.runtime.messageManager.createMemory(memory);
        elizaLogger4.debug("Reaction memory created", {
          reactionId: reactionUUID,
          emoji,
          userId: user.id
        });
      } catch (error) {
        if (error.code === "23505") {
          elizaLogger4.warn("Duplicate reaction memory, skipping", {
            reactionId: reactionUUID
          });
          return;
        }
        throw error;
      }
    } catch (error) {
      elizaLogger4.error("Error handling reaction:", error);
    }
  }
  async handleReactionRemove(reaction, user) {
    elizaLogger4.log("Reaction removed");
    let emoji = reaction.emoji.name;
    if (!emoji && reaction.emoji.id) {
      emoji = `<:${reaction.emoji.name}:${reaction.emoji.id}>`;
    }
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error(
          "Something went wrong when fetching the message:",
          error
        );
        return;
      }
    }
    const messageContent = reaction.message.content;
    const truncatedContent = messageContent.length > 50 ? messageContent.substring(0, 50) + "..." : messageContent;
    const reactionMessage = `*Removed <${emoji} emoji> from: "${truncatedContent}"*`;
    const roomId = stringToUuid3(
      reaction.message.channel.id + "-" + this.runtime.agentId
    );
    const userIdUUID = stringToUuid3(user.id);
    const reactionUUID = stringToUuid3(
      `${reaction.message.id}-${user.id}-${emoji}-removed-${this.runtime.agentId}`
    );
    const userName = reaction.message.author.username;
    const name = reaction.message.author.displayName;
    await this.runtime.ensureConnection(
      userIdUUID,
      roomId,
      userName,
      name,
      "discord"
    );
    try {
      await this.runtime.messageManager.createMemory({
        id: reactionUUID,
        // This is the ID of the reaction removal message
        userId: userIdUUID,
        agentId: this.runtime.agentId,
        content: {
          text: reactionMessage,
          source: "discord",
          inReplyTo: stringToUuid3(
            reaction.message.id + "-" + this.runtime.agentId
          )
          // This is the ID of the original message
        },
        roomId,
        createdAt: Date.now(),
        embedding: getEmbeddingZeroVector3()
      });
    } catch (error) {
      console.error("Error creating reaction removal message:", error);
    }
  }
  handleGuildCreate(guild) {
    console.log(`Joined guild ${guild.name}`);
    this.voiceManager.scanGuild(guild);
  }
  async handleInteractionCreate(interaction) {
    if (!interaction.isCommand()) return;
    switch (interaction.commandName) {
      case "joinchannel":
        await this.voiceManager.handleJoinChannelCommand(interaction);
        break;
      case "leavechannel":
        await this.voiceManager.handleLeaveChannelCommand(interaction);
        break;
    }
  }
  async onReady() {
    const guilds = await this.client.guilds.fetch();
    for (const [, guild] of guilds) {
      const fullGuild = await guild.fetch();
      this.voiceManager.scanGuild(fullGuild);
    }
  }
};
function startDiscord(runtime) {
  return new DiscordClient(runtime);
}
var DiscordClientInterface = {
  start: async (runtime) => new DiscordClient(runtime),
  stop: async (runtime) => {
    try {
      elizaLogger4.log("Stopping discord client", runtime.agentId);
      await runtime.clients.discord.stop();
    } catch (e) {
      elizaLogger4.error("client-discord interface stop error", e);
    }
  }
};
export {
  DiscordClient,
  DiscordClientInterface,
  startDiscord
};
//# sourceMappingURL=index.js.map