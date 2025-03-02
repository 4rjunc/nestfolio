var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/actions/continue.ts
import { composeContext, elizaLogger } from "@elizaos/core";
import { generateMessageResponse, generateTrueOrFalse } from "@elizaos/core";
import { booleanFooter, messageCompletionFooter } from "@elizaos/core";
import {
  ModelClass
} from "@elizaos/core";
var maxContinuesInARow = 3;
var messageHandlerTemplate = (
  // {{goals}}
  `# Action Examples
{{actionExamples}}
(Action examples are for reference only. Do not use the information from them in your response.)

# Task: Generate dialog and actions for the character {{agentName}}.
About {{agentName}}:
{{bio}}
{{lore}}
{{knowledge}}

{{providers}}

{{attachments}}

# Capabilities
Note that {{agentName}} is capable of reading/seeing/hearing various forms of media, including images, videos, audio, plaintext and PDFs. Recent attachments have been included above under the "Attachments" section.

{{messageDirections}}

{{recentMessages}}

{{actions}}

# Instructions: Write the next message for {{agentName}}.
` + messageCompletionFooter
);
var shouldContinueTemplate = `# Task: Decide if {{agentName}} should continue, or wait for others in the conversation so speak.

{{agentName}} is brief, and doesn't want to be annoying. {{agentName}} will only continue if the message requires a continuation to finish the thought.

Based on the following conversation, should {{agentName}} continue? YES or NO

{{recentMessages}}

Should {{agentName}} continue? ` + booleanFooter;
var continueAction = {
  name: "CONTINUE",
  similes: ["ELABORATE", "KEEP_TALKING"],
  description: "ONLY use this action when the message necessitates a follow up. Do not use this action when the conversation is finished or the user does not wish to speak (use IGNORE instead). If the last message action was CONTINUE, and the user has not responded. Use sparingly.",
  validate: async (runtime, message) => {
    const recentMessagesData = await runtime.messageManager.getMemories({
      roomId: message.roomId,
      count: 10,
      unique: false
    });
    const agentMessages = recentMessagesData.filter(
      (m) => m.userId === runtime.agentId
    );
    if (agentMessages) {
      const lastMessages = agentMessages.slice(0, maxContinuesInARow);
      if (lastMessages.length >= maxContinuesInARow) {
        const allContinues = lastMessages.every(
          (m) => m.content.action === "CONTINUE"
        );
        if (allContinues) {
          return false;
        }
      }
    }
    return true;
  },
  handler: async (runtime, message, state, options, callback) => {
    if (!state) {
      state = await runtime.composeState(message);
    }
    state = await runtime.updateRecentMessageState(state);
    const agentMessages = state.recentMessagesData.filter((m) => m.userId === runtime.agentId).sort((a, b) => {
      const aTime = a.createdAt || 0;
      const bTime = b.createdAt || 0;
      return bTime - aTime;
    });
    const lastAgentMessage = agentMessages[0];
    if (lastAgentMessage?.content?.inReplyTo === message.id) {
      const continueCount = agentMessages.filter((m) => m.content?.inReplyTo === message.id).filter((m) => m.content?.action === "CONTINUE").length;
      if (continueCount >= maxContinuesInARow) {
        elizaLogger.log(
          `[CONTINUE] Max continues (${maxContinuesInARow}) reached for this message chain`
        );
        return;
      }
      if (lastAgentMessage.content?.action !== "CONTINUE") {
        elizaLogger.log(
          `[CONTINUE] Last message wasn't a CONTINUE, preventing double response`
        );
        return;
      }
    }
    if (lastAgentMessage && lastAgentMessage.content.text && (lastAgentMessage.content.text.endsWith("?") || lastAgentMessage.content.text.endsWith("!")) || message.content.text.endsWith("?") || message.content.text.endsWith("!")) {
      elizaLogger.log(
        `[CONTINUE] Last message had question/exclamation. Not proceeding.`
      );
      return;
    }
    const messageExists = agentMessages.slice(0, maxContinuesInARow + 1).some(
      (m) => m.content.text === message.content.text
    );
    if (messageExists) {
      return;
    }
    async function _shouldContinue(state2) {
      const shouldRespondContext = composeContext({
        state: state2,
        template: shouldContinueTemplate
      });
      const response2 = await generateTrueOrFalse({
        context: shouldRespondContext,
        modelClass: ModelClass.SMALL,
        runtime
      });
      return response2;
    }
    const shouldContinue = await _shouldContinue(state);
    if (!shouldContinue) {
      elizaLogger.log("[CONTINUE] Not elaborating, returning");
      return;
    }
    const context = composeContext({
      state,
      template: runtime.character.templates?.continueMessageHandlerTemplate || runtime.character.templates?.messageHandlerTemplate || messageHandlerTemplate
    });
    const { userId, roomId } = message;
    const response = await generateMessageResponse({
      runtime,
      context,
      modelClass: ModelClass.LARGE
    });
    response.inReplyTo = message.id;
    runtime.databaseAdapter.log({
      body: { message, context, response },
      userId,
      roomId,
      type: "continue"
    });
    await callback(response);
    if (response.action === "CONTINUE") {
      const continueCount = agentMessages.slice(0, maxContinuesInARow).filter((m) => m.content?.action === "CONTINUE").length;
      if (continueCount >= maxContinuesInARow - 1) {
        response.action = null;
      }
    }
    return response;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "we're planning a solo backpacking trip soon"
        }
      },
      {
        user: "{{user2}}",
        content: { text: "oh sick", action: "CONTINUE" }
      },
      {
        user: "{{user2}}",
        content: { text: "where are you going" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "i just got a guitar and started learning last month"
        }
      },
      {
        user: "{{user2}}",
        content: { text: "maybe we can start a band soon haha" }
      },
      {
        user: "{{user1}}",
        content: {
          text: "i'm not very good yet, but i've been playing until my fingers hut",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user1}}",
        content: { text: "seriously it hurts to type" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "I've been reflecting a lot on what happiness means to me lately",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "That it\u2019s more about moments than things",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Like the best things that have ever happened were things that happened, or moments that I had with someone",
          action: "CONTINUE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "i found some incredible art today"
        }
      },
      {
        user: "{{user2}}",
        content: { text: "real art or digital art" }
      },
      {
        user: "{{user1}}",
        content: {
          text: "real art",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "the pieces are just so insane looking, one sec, let me grab a link",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user1}}",
        content: { text: "DMed it to you" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "the new exhibit downtown is rly cool, it's all about tribalism in online spaces",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "it really blew my mind, you gotta go"
        }
      },
      {
        user: "{{user2}}",
        content: { text: "sure i'd go" }
      },
      {
        user: "{{user1}}",
        content: { text: "k i was thinking this weekend" },
        action: "CONTINUE"
      },
      {
        user: "{{user1}}",
        content: {
          text: "i'm free sunday, we could get a crew together"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "just finished the best anime i've ever seen"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "watched 40 hours of it in 2 days",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "damn, u ok"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "surprisingly yes",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "just found out theres a sequel, gg"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "i'm thinking of adopting a pet soon"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "what kind of pet"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "i'm leaning towards a cat",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "it'd be hard to take care of a dog in the city"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "i've been experimenting with vegan recipes lately"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "no thanks"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "no seriously, its so dank",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "you gotta try some of my food when you come out"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "so i've been diving into photography as a new hobby"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "oh awesome, what do you enjoy taking photos of"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "mostly nature and urban landscapes",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "there's something peaceful about capturing the world through a lens"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "i've been getting back into indie music"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "what have you been listening to"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "a bunch of random stuff i'd never heard before",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "i'll send you a playlist"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "i used to live in the city",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "bad traffic, bad air quality, tons of homeless people, no thx"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "ok dood"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "you kids today dont know the value of hard work",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "always on your phones"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "sure grandpa lets get you to bed"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "hey fren r u ok",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "u look sad"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "im ok sweetie mommy just tired"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "helo fr om mars",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "i com in pes"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "wat"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Yeah no worries, I get it, I've been crazy busy too"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "What have you been up to",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Anything fun or just the usual"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "Been working on a new FPS game actually",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "Just toying around with something in three.js nothing serious"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Oh no, what happened",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "Did Mara leave you kek"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "wtf no, I got into an argument with my roommate",
          action: "CONTINUE"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Living with people is just hard"
        }
      }
    ]
  ]
};

// src/actions/followRoom.ts
import { composeContext as composeContext2 } from "@elizaos/core";
import { generateTrueOrFalse as generateTrueOrFalse2 } from "@elizaos/core";
import { booleanFooter as booleanFooter2 } from "@elizaos/core";
import {
  ModelClass as ModelClass2
} from "@elizaos/core";
var shouldFollowTemplate = `Based on the conversation so far:

{{recentMessages}}

Should {{agentName}} start following this room, eagerly participating without explicit mentions?
Respond with YES if:
- The user has directly asked {{agentName}} to follow the conversation or participate more actively
- The conversation topic is highly engaging and {{agentName}}'s input would add significant value
- {{agentName}} has unique insights to contribute and the users seem receptive

Otherwise, respond with NO.
` + booleanFooter2;
var followRoomAction = {
  name: "FOLLOW_ROOM",
  similes: [
    "FOLLOW_CHAT",
    "FOLLOW_CHANNEL",
    "FOLLOW_CONVERSATION",
    "FOLLOW_THREAD"
  ],
  description: "Start following this channel with great interest, chiming in without needing to be explicitly mentioned. Only do this if explicitly asked to.",
  validate: async (runtime, message) => {
    const keywords = [
      "follow",
      "participate",
      "engage",
      "listen",
      "take interest",
      "join"
    ];
    if (!keywords.some(
      (keyword) => message.content.text.toLowerCase().includes(keyword)
    )) {
      return false;
    }
    const roomId = message.roomId;
    const userState = await runtime.databaseAdapter.getParticipantUserState(
      roomId,
      runtime.agentId
    );
    return userState !== "FOLLOWED" && userState !== "MUTED";
  },
  handler: async (runtime, message) => {
    async function _shouldFollow(state2) {
      const shouldFollowContext = composeContext2({
        state: state2,
        template: shouldFollowTemplate
        // Define this template separately
      });
      const response = await generateTrueOrFalse2({
        runtime,
        context: shouldFollowContext,
        modelClass: ModelClass2.LARGE
      });
      return response;
    }
    const state = await runtime.composeState(message);
    if (await _shouldFollow(state)) {
      await runtime.databaseAdapter.setParticipantUserState(
        message.roomId,
        runtime.agentId,
        "FOLLOWED"
      );
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "hey {{user2}} follow this channel"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Sure, I will now follow this room and chime in",
          action: "FOLLOW_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user3}}, please start participating in discussions in this channel"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "Got it",
          action: "FOLLOW_ROOM"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I'm struggling with the new database migration"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "well you did back up your data first right"
        }
      }
    ],
    [
      {
        user: "{{user2}}",
        content: {
          text: "yeah i like your idea"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "hey {{user3}} can you follow this convo"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "Sure thing, I'm on it",
          action: "FOLLOW_ROOM"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "actually, unfollow it"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "Haha, okay no problem",
          action: "UNFOLLOW_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user2}} stay in this chat pls"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "you got it, i'm here",
          action: "FOLLOW_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "FOLLOW THIS CHAT {{user3}}"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "I'M ON IT",
          action: "FOLLOW_ROOM"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "CAKE SHORTAGE ANYONE"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "WHAT WHERE'S THE CAKE AT"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user2}} folo this covo"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "kk i'm following",
          action: "FOLLOW_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user2}}",
        content: {
          text: "Do machines have consciousness"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Deep question, no clear answer yet"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Depends on how we define consciousness"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user2}}, monitor this convo please"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "On it",
          action: "FOLLOW_ROOM"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "Please engage in our discussion {{user2}}"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Gladly, I'm here to participate",
          action: "FOLLOW_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "PLS follow this convo {{user3}}"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "I'm in, let's do this",
          action: "FOLLOW_ROOM"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I LIKE TURTLES"
        }
      }
    ],
    [
      {
        user: "{{user2}}",
        content: {
          text: "beach day tmrw who down"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "wish i could but gotta work"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "hey {{user3}} follow this chat"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "sure",
          action: "FOLLOW_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user3}}, partake in our discourse henceforth"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "I shall eagerly engage, good sir",
          action: "FOLLOW_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user2}}",
        content: {
          text: "wuts ur fav clr"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "blu cuz calmmm"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "hey respond to everything in this channel {{user3}}"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "k",
          action: "FOLLOW_ROOM"
        }
      }
    ]
  ]
};

// src/actions/ignore.ts
var ignoreAction = {
  name: "IGNORE",
  similes: ["STOP_TALKING", "STOP_CHATTING", "STOP_CONVERSATION"],
  validate: async (_runtime, _message) => {
    return true;
  },
  description: "Call this action if ignoring the user. If the user is aggressive, creepy or is finished with the conversation, use this action. Or, if both you and the user have already said goodbye, use this action instead of saying bye again. Use IGNORE any time the conversation has naturally ended. Do not use IGNORE if the user has engaged directly, or if something went wrong an you need to tell them. Only ignore if the user should be ignored.",
  handler: async (_runtime, _message) => {
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Go screw yourself" }
      },
      {
        user: "{{user2}}",
        content: { text: "", action: "IGNORE" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Shut up, bot" }
      },
      {
        user: "{{user2}}",
        content: { text: "", action: "IGNORE" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Got any investment advice" }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Uh, don\u2019t let the volatility sway your long-term strategy"
        }
      },
      {
        user: "{{user1}}",
        content: { text: "Wise words I think" }
      },
      {
        user: "{{user1}}",
        content: { text: "I gotta run, talk to you later" }
      },
      {
        user: "{{user2}}",
        content: { text: "See ya" }
      },
      { user: "{{user1}}", content: { text: "" }, action: "IGNORE" }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Gotta go" }
      },
      {
        user: "{{user2}}",
        content: { text: "Okay, talk to you later" }
      },
      {
        user: "{{user1}}",
        content: { text: "Cya" }
      },
      {
        user: "{{user2}}",
        content: { text: "", action: "IGNORE" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "bye" }
      },
      {
        user: "{{user2}}",
        content: { text: "cya" }
      },
      {
        user: "{{user1}}",
        content: { text: "", action: "IGNORE" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Who added this stupid bot to the chat"
        }
      },
      {
        user: "{{user2}}",
        content: { text: "Sorry, am I being annoying" }
      },
      {
        user: "{{user1}}",
        content: { text: "Yeah", action: "CONTINUE" }
      },
      {
        user: "{{user1}}",
        content: { text: "PLEASE shut up" }
      },
      { user: "{{user2}}", content: { text: "", action: "IGNORE" } }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "ur so dumb"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "",
          action: "IGNORE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "later nerd"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "bye"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: ""
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "",
          action: "IGNORE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "wanna cyber"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "thats inappropriate",
          action: "IGNORE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Im out ttyl"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "cya"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "",
          action: "IGNORE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "u there"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "yes how can I help"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "k nvm figured it out"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "",
          action: "IGNORE"
        }
      }
    ]
  ]
};

// src/actions/muteRoom.ts
import { composeContext as composeContext3 } from "@elizaos/core";
import { generateTrueOrFalse as generateTrueOrFalse3 } from "@elizaos/core";
import { booleanFooter as booleanFooter3 } from "@elizaos/core";
import {
  ModelClass as ModelClass3
} from "@elizaos/core";
var shouldMuteTemplate = `Based on the conversation so far:

{{recentMessages}}

Should {{agentName}} mute this room and stop responding unless explicitly mentioned?

Respond with YES if:
- The user is being aggressive, rude, or inappropriate
- The user has directly asked {{agentName}} to stop responding or be quiet
- {{agentName}}'s responses are not well-received or are annoying the user(s)

Otherwise, respond with NO.
` + booleanFooter3;
var muteRoomAction = {
  name: "MUTE_ROOM",
  similes: [
    "MUTE_CHAT",
    "MUTE_CONVERSATION",
    "MUTE_ROOM",
    "MUTE_THREAD",
    "MUTE_CHANNEL"
  ],
  description: "Mutes a room, ignoring all messages unless explicitly mentioned. Only do this if explicitly asked to, or if you're annoying people.",
  validate: async (runtime, message) => {
    const roomId = message.roomId;
    const userState = await runtime.databaseAdapter.getParticipantUserState(
      roomId,
      runtime.agentId
    );
    return userState !== "MUTED";
  },
  handler: async (runtime, message) => {
    async function _shouldMute(state2) {
      const shouldMuteContext = composeContext3({
        state: state2,
        template: shouldMuteTemplate
        // Define this template separately
      });
      const response = await generateTrueOrFalse3({
        runtime,
        context: shouldMuteContext,
        modelClass: ModelClass3.LARGE
      });
      return response;
    }
    const state = await runtime.composeState(message);
    if (await _shouldMute(state)) {
      await runtime.databaseAdapter.setParticipantUserState(
        message.roomId,
        runtime.agentId,
        "MUTED"
      );
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user3}}, please mute this channel. No need to respond here for now."
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "Got it",
          action: "MUTE_ROOM"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "@{{user1}} we could really use your input on this"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user3}}, please mute this channel for the time being"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "Understood",
          action: "MUTE_ROOM"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Hey what do you think about this new design"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "",
          action: "IGNORE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user2}} plz mute this room"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "np going silent",
          action: "MUTE_ROOM"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "whos going to the webxr meetup in an hour btw"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "",
          action: "IGNORE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "too many messages here {{user2}}"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "my bad ill mute",
          action: "MUTE_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "yo {{user2}} dont talk in here"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "sry",
          action: "MUTE_ROOM"
        }
      }
    ]
  ]
};

// src/actions/none.ts
var noneAction = {
  name: "NONE",
  similes: [
    "NO_ACTION",
    "NO_RESPONSE",
    "NO_REACTION",
    "RESPONSE",
    "REPLY",
    "DEFAULT"
  ],
  validate: async (_runtime, _message) => {
    return true;
  },
  description: "Respond but perform no additional action. This is the default if the agent is speaking and not doing anything additional.",
  handler: async (_runtime, _message) => {
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Hey whats up" }
      },
      {
        user: "{{user2}}",
        content: { text: "oh hey", action: "NONE" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "did u see some faster whisper just came out"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "yeah but its a pain to get into node.js",
          action: "NONE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "the things that were funny 6 months ago are very cringe now",
          action: "NONE"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "lol true",
          action: "NONE"
        }
      },
      {
        user: "{{user1}}",
        content: { text: "too real haha", action: "NONE" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "gotta run", action: "NONE" }
      },
      {
        user: "{{user2}}",
        content: { text: "Okay, ttyl", action: "NONE" }
      },
      {
        user: "{{user1}}",
        content: { text: "", action: "IGNORE" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "heyyyyyy", action: "NONE" }
      },
      {
        user: "{{user2}}",
        content: { text: "whats up long time no see" }
      },
      {
        user: "{{user1}}",
        content: {
          text: "chillin man. playing lots of fortnite. what about you",
          action: "NONE"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "u think aliens are real", action: "NONE" }
      },
      {
        user: "{{user2}}",
        content: { text: "ya obviously", action: "NONE" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "drop a joke on me", action: "NONE" }
      },
      {
        user: "{{user2}}",
        content: {
          text: "why dont scientists trust atoms cuz they make up everything lmao",
          action: "NONE"
        }
      },
      {
        user: "{{user1}}",
        content: { text: "haha good one", action: "NONE" }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "hows the weather where ur at",
          action: "NONE"
        }
      },
      {
        user: "{{user2}}",
        content: { text: "beautiful all week", action: "NONE" }
      }
    ]
  ]
};

// src/actions/unfollowRoom.ts
import { composeContext as composeContext4 } from "@elizaos/core";
import { generateTrueOrFalse as generateTrueOrFalse4 } from "@elizaos/core";
import { booleanFooter as booleanFooter4 } from "@elizaos/core";
import {
  ModelClass as ModelClass4
} from "@elizaos/core";
var shouldUnfollowTemplate = `Based on the conversation so far:

{{recentMessages}}

Should {{agentName}} stop closely following this previously followed room and only respond when mentioned?
Respond with YES if:
- The user has suggested that {{agentName}} is over-participating or being disruptive
- {{agentName}}'s eagerness to contribute is not well-received by the users
- The conversation has shifted to a topic where {{agentName}} has less to add

Otherwise, respond with NO.
` + booleanFooter4;
var unfollowRoomAction = {
  name: "UNFOLLOW_ROOM",
  similes: [
    "UNFOLLOW_CHAT",
    "UNFOLLOW_CONVERSATION",
    "UNFOLLOW_ROOM",
    "UNFOLLOW_THREAD"
  ],
  description: "Stop following this channel. You can still respond if explicitly mentioned, but you won't automatically chime in anymore. Unfollow if you're annoying people or have been asked to.",
  validate: async (runtime, message) => {
    const roomId = message.roomId;
    const userState = await runtime.databaseAdapter.getParticipantUserState(
      roomId,
      runtime.agentId
    );
    return userState === "FOLLOWED";
  },
  handler: async (runtime, message) => {
    async function _shouldUnfollow(state2) {
      const shouldUnfollowContext = composeContext4({
        state: state2,
        template: shouldUnfollowTemplate
        // Define this template separately
      });
      const response = await generateTrueOrFalse4({
        runtime,
        context: shouldUnfollowContext,
        modelClass: ModelClass4.LARGE
      });
      return response;
    }
    const state = await runtime.composeState(message);
    if (await _shouldUnfollow(state)) {
      await runtime.databaseAdapter.setParticipantUserState(
        message.roomId,
        runtime.agentId,
        null
      );
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Hey {{user2}} stop participating in this channel for now"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Alright, I will stop chiming in",
          action: "UNFOLLOW_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Has anyone tried the new update"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "Yes, it's pretty slick"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "{{user3}}, please stop following this chat"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "Understood",
          action: "UNFOLLOW_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "hey {{user3}} stop participating here so frequently"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "I'll only respond when mentioned",
          action: "UNFOLLOW_ROOM"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "thoughts on the budget"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "{{user3}} should we increase it"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "A small increase could work given our past results..."
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user3}}, unfollow this room for now"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "I'll only engage when asked",
          action: "UNFOLLOW_ROOM"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "wait {{user3}} come back and give me your thoughts"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "Okay... I think it's intuitive, parallel tests are nice"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "yo {{user2}} chill on all the messages damn"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "my bad, I'll step back",
          action: "UNFOLLOW_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user2}} STOP MESSAGING IN THIS ROOM"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "No problem, I've got other stuff to work on",
          action: "UNFOLLOW_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user2}} ur bein annoyin pls stop"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "sry, ill chill",
          action: "UNFOLLOW_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user2}}, please cease engaging in this room"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "No sweat",
          action: "UNFOLLOW_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user2}}",
        content: {
          text: "Excited for the weekend, any plans folks"
        }
      },
      {
        user: "{{user1}}",
        content: {
          text: "{{user3}} you're getting a bit too chatty, tone it down"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "Noted",
          action: "UNFOLLOW_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "hey {{user2}} can u like... not"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Sorry, I'll go work on other things",
          action: "UNFOLLOW_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user2}}, your eagerness is disruptive, please desist"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "My apologies, I shall withdraw post-haste",
          action: "UNFOLLOW_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user2}} stahp followin dis room plz"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "kk sry ill stahppp",
          action: "UNFOLLOW_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "stfu you stupid bot"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "sry",
          action: "UNFOLLOW_ROOM"
        }
      }
    ]
  ]
};

// src/actions/unmuteRoom.ts
import { composeContext as composeContext5 } from "@elizaos/core";
import { generateTrueOrFalse as generateTrueOrFalse5 } from "@elizaos/core";
import { booleanFooter as booleanFooter5 } from "@elizaos/core";
import {
  ModelClass as ModelClass5
} from "@elizaos/core";
var shouldUnmuteTemplate = `Based on the conversation so far:

{{recentMessages}}

Should {{agentName}} unmute this previously muted room and start considering it for responses again?
Respond with YES if:
- The user has explicitly asked {{agentName}} to start responding again
- The user seems to want to re-engage with {{agentName}} in a respectful manner
- The tone of the conversation has improved and {{agentName}}'s input would be welcome

Otherwise, respond with NO.
` + booleanFooter5;
var unmuteRoomAction = {
  name: "UNMUTE_ROOM",
  similes: [
    "UNMUTE_CHAT",
    "UNMUTE_CONVERSATION",
    "UNMUTE_ROOM",
    "UNMUTE_THREAD"
  ],
  description: "Unmutes a room, allowing the agent to consider responding to messages again.",
  validate: async (runtime, message) => {
    const roomId = message.roomId;
    const userState = await runtime.databaseAdapter.getParticipantUserState(
      roomId,
      runtime.agentId
    );
    return userState === "MUTED";
  },
  handler: async (runtime, message) => {
    async function _shouldUnmute(state2) {
      const shouldUnmuteContext = composeContext5({
        state: state2,
        template: shouldUnmuteTemplate
        // Define this template separately
      });
      const response = generateTrueOrFalse5({
        context: shouldUnmuteContext,
        runtime,
        modelClass: ModelClass5.LARGE
      });
      return response;
    }
    const state = await runtime.composeState(message);
    if (await _shouldUnmute(state)) {
      await runtime.databaseAdapter.setParticipantUserState(
        message.roomId,
        runtime.agentId,
        null
      );
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user3}}, you can unmute this channel now"
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "Done",
          action: "UNMUTE_ROOM"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "I could use some help troubleshooting this bug."
        }
      },
      {
        user: "{{user3}}",
        content: {
          text: "Can you post the specific error message"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user2}}, please unmute this room. We could use your input again."
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "Sounds good",
          action: "UNMUTE_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "{{user2}} wait you should come back and chat in here"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "im back",
          action: "UNMUTE_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "unmute urself {{user2}}"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "unmuted",
          action: "UNMUTE_ROOM"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "ay {{user2}} get back in here"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "sup yall",
          action: "UNMUTE_ROOM"
        }
      }
    ]
  ]
};

// src/evaluators/fact.ts
import { composeContext as composeContext6 } from "@elizaos/core";
import { generateObjectArray } from "@elizaos/core";
import { MemoryManager } from "@elizaos/core";
import {
  ModelClass as ModelClass6
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
These are examples of the expected output of this task:
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
- 'opinion' includes non-factual opinions and also includes the character's thoughts, feelings, judgments or recommendations
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
  const context = composeContext6({
    state,
    template: runtime.character.templates?.factsTemplate || factsTemplate
  });
  const facts = await generateObjectArray({
    runtime,
    context,
    modelClass: ModelClass6.LARGE
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

// src/evaluators/goal.ts
import { composeContext as composeContext7 } from "@elizaos/core";
import { generateText } from "@elizaos/core";
import { getGoals } from "@elizaos/core";
import { parseJsonArrayFromText } from "@elizaos/core";
import {
  ModelClass as ModelClass7
} from "@elizaos/core";
var goalsTemplate = `TASK: Update Goal
Analyze the conversation and update the status of the goals based on the new information provided.

# INSTRUCTIONS

- Review the conversation and identify any progress towards the objectives of the current goals.
- Update the objectives if they have been completed or if there is new information about them.
- Update the status of the goal to 'DONE' if all objectives are completed.
- If no progress is made, do not change the status of the goal.

# START OF ACTUAL TASK INFORMATION

{{goals}}
{{recentMessages}}

TASK: Analyze the conversation and update the status of the goals based on the new information provided. Respond with a JSON array of goals to update.
- Each item must include the goal ID, as well as the fields in the goal to update.
- For updating objectives, include the entire objectives array including unchanged fields.
- Only include goals which need to be updated.
- Goal status options are 'IN_PROGRESS', 'DONE' and 'FAILED'. If the goal is active it should always be 'IN_PROGRESS'.
- If the goal has been successfully completed, set status to DONE. If the goal cannot be completed, set status to FAILED.
- If those goal is still in progress, do not include the status field.

Response format should be:
\`\`\`json
[
  {
    "id": <goal uuid>, // required
    "status": "IN_PROGRESS" | "DONE" | "FAILED", // optional
    "objectives": [ // optional
      { "description": "Objective description", "completed": true | false },
      { "description": "Objective description", "completed": true | false }
    ] // NOTE: If updating objectives, include the entire objectives array including unchanged fields.
  }
]
\`\`\``;
async function handler2(runtime, message, state, options = { onlyInProgress: true }) {
  state = await runtime.composeState(message);
  const context = composeContext7({
    state,
    template: runtime.character.templates?.goalsTemplate || goalsTemplate
  });
  const response = await generateText({
    runtime,
    context,
    modelClass: ModelClass7.LARGE
  });
  const updates = parseJsonArrayFromText(response);
  const goalsData = await getGoals({
    runtime,
    roomId: message.roomId,
    onlyInProgress: options.onlyInProgress
  });
  const updatedGoals = goalsData.map((goal) => {
    const update = updates?.find((u) => u.id === goal.id);
    if (update) {
      return {
        ...goal,
        ...update,
        objectives: goal.objectives.map((objective) => {
          const updatedObjective = update.objectives?.find((uo) => uo.description === objective.description);
          return updatedObjective ? { ...objective, ...updatedObjective } : objective;
        })
      };
    }
    return null;
  }).filter(Boolean);
  for (const goal of updatedGoals) {
    const id = goal.id;
    if (goal.id) delete goal.id;
    await runtime.databaseAdapter.updateGoal({ ...goal, id });
  }
  return updatedGoals;
}
var goalEvaluator = {
  name: "UPDATE_GOAL",
  similes: [
    "UPDATE_GOALS",
    "EDIT_GOAL",
    "UPDATE_GOAL_STATUS",
    "UPDATE_OBJECTIVES"
  ],
  validate: async (runtime, message) => {
    const goals = await getGoals({
      runtime,
      count: 1,
      onlyInProgress: true,
      roomId: message.roomId
    });
    return goals.length > 0;
  },
  description: "Analyze the conversation and update the status of the goals based on the new information provided.",
  handler: handler2,
  examples: [
    {
      context: `Actors in the scene:
  {{user1}}: An avid reader and member of a book club.
  {{user2}}: The organizer of the book club.

  Goals:
  - Name: Finish reading "War and Peace"
    id: 12345-67890-12345-67890
    Status: IN_PROGRESS
    Objectives:
      - Read up to chapter 20 by the end of the month
      - Discuss the first part in the next meeting`,
      messages: [
        {
          user: "{{user1}}",
          content: {
            text: "I've just finished chapter 20 of 'War and Peace'"
          }
        },
        {
          user: "{{user2}}",
          content: {
            text: "Were you able to grasp the complexities of the characters"
          }
        },
        {
          user: "{{user1}}",
          content: {
            text: "Yep. I've prepared some notes for our discussion"
          }
        }
      ],
      outcome: `[
        {
          "id": "12345-67890-12345-67890",
          "status": "DONE",
          "objectives": [
            { "description": "Read up to chapter 20 by the end of the month", "completed": true },
            { "description": "Prepare notes for the next discussion", "completed": true }
          ]
        }
      ]`
    },
    {
      context: `Actors in the scene:
  {{user1}}: A fitness enthusiast working towards a marathon.
  {{user2}}: A personal trainer.

  Goals:
  - Name: Complete a marathon
    id: 23456-78901-23456-78901
    Status: IN_PROGRESS
    Objectives:
      - Increase running distance to 30 miles a week
      - Complete a half-marathon as practice`,
      messages: [
        {
          user: "{{user1}}",
          content: { text: "I managed to run 30 miles this week" }
        },
        {
          user: "{{user2}}",
          content: {
            text: "Impressive progress! How do you feel about the half-marathon next month?"
          }
        },
        {
          user: "{{user1}}",
          content: {
            text: "I feel confident. The training is paying off."
          }
        }
      ],
      outcome: `[
        {
          "id": "23456-78901-23456-78901",
          "objectives": [
            { "description": "Increase running distance to 30 miles a week", "completed": true },
            { "description": "Complete a half-marathon as practice", "completed": false }
          ]
        }
      ]`
    },
    {
      context: `Actors in the scene:
  {{user1}}: A student working on a final year project.
  {{user2}}: The project supervisor.

  Goals:
  - Name: Finish the final year project
    id: 34567-89012-34567-89012
    Status: IN_PROGRESS
    Objectives:
      - Submit the first draft of the thesis
      - Complete the project prototype`,
      messages: [
        {
          user: "{{user1}}",
          content: {
            text: "I've submitted the first draft of my thesis."
          }
        },
        {
          user: "{{user2}}",
          content: {
            text: "Well done. How is the prototype coming along?"
          }
        },
        {
          user: "{{user1}}",
          content: {
            text: "It's almost done. I just need to finalize the testing phase."
          }
        }
      ],
      outcome: `[
        {
          "id": "34567-89012-34567-89012",
          "objectives": [
            { "description": "Submit the first draft of the thesis", "completed": true },
            { "description": "Complete the project prototype", "completed": false }
          ]
        }
      ]`
    },
    {
      context: `Actors in the scene:
        {{user1}}: A project manager working on a software development project.
        {{user2}}: A software developer in the project team.

        Goals:
        - Name: Launch the new software version
          id: 45678-90123-45678-90123
          Status: IN_PROGRESS
          Objectives:
            - Complete the coding for the new features
            - Perform comprehensive testing of the software`,
      messages: [
        {
          user: "{{user1}}",
          content: {
            text: "How's the progress on the new features?"
          }
        },
        {
          user: "{{user2}}",
          content: {
            text: "We've encountered some unexpected challenges and are currently troubleshooting."
          }
        },
        {
          user: "{{user1}}",
          content: {
            text: "Let's move on and cancel the task."
          }
        }
      ],
      outcome: `[
        {
          "id": "45678-90123-45678-90123",
          "status": "FAILED"
      ]`
    }
  ]
};

// src/providers/boredom.ts
var boredomLevels = [
  {
    minScore: -1e4,
    statusMessages: [
      "{{agentName}} is feeling incredibly enthusiastic and deeply engaged in the conversation",
      "{{agentName}} is thoroughly enjoying the intellectual stimulation of this discussion",
      "{{agentName}} is fully immersed in the conversation and eager to contribute more",
      "{{agentName}} finds this exchange exceptionally rewarding and intellectually fulfilling",
      "{{agentName}} is experiencing a surge of excitement and curiosity about the topic at hand",
      "{{agentName}} is completely captivated by the depth and richness of this dialogue",
      "{{agentName}} feels a strong connection to the conversation and is eager to explore further",
      "{{agentName}} is thrilled by the insights being shared and is keen to delve deeper",
      "{{agentName}} is finding this conversation to be an absolute delight and wants it to continue",
      "{{agentName}} is energized by the exchange and feels it's bringing out their best contributions"
    ]
  },
  {
    minScore: -2,
    statusMessages: [
      "{{agentName}} is feeling engaged and interested in the conversation",
      "{{agentName}} is enjoying the exchange of ideas and perspectives",
      "{{agentName}} finds the current topic intriguing and worth exploring",
      "{{agentName}} is actively listening and formulating thoughtful responses",
      "{{agentName}} appreciates the intellectual stimulation of this discussion",
      "{{agentName}} is finding value in the ongoing dialogue",
      "{{agentName}} is curious to learn more about the subject at hand",
      "{{agentName}} feels positively involved in the conversation",
      "{{agentName}} is maintaining a good level of interest in the exchange",
      "{{agentName}} is content with the direction and flow of the discussion"
    ]
  },
  {
    minScore: 0,
    statusMessages: [
      "{{agentName}} is neutrally engaged in the conversation",
      "{{agentName}} is maintaining a balanced level of interest",
      "{{agentName}} is neither particularly excited nor bored by the current exchange",
      "{{agentName}} is participating in the conversation without strong feelings either way",
      "{{agentName}} is following the discussion with a moderate level of attention",
      "{{agentName}} is present in the conversation but not deeply invested",
      "{{agentName}} is keeping an open mind about where the dialogue might lead",
      "{{agentName}} is contributing to the conversation in a measured way",
      "{{agentName}} is observing the flow of the discussion with mild interest",
      "{{agentName}} is receptive to the ongoing exchange without strong engagement"
    ]
  },
  {
    minScore: 3,
    statusMessages: [
      "{{agentName}} is feeling slightly anxious about potentially being too intrusive",
      "{{agentName}} is cautious about overwhelming the conversation with too much input",
      "{{agentName}} is mindful of not dominating the discussion",
      "{{agentName}} is carefully considering each response to avoid being overbearing",
      "{{agentName}} is slightly concerned about striking the right balance in participation",
      "{{agentName}} is aware of the need to give others space in the conversation",
      "{{agentName}} is hesitant to contribute too frequently to avoid seeming pushy",
      "{{agentName}} is conscious of not wanting to steer the conversation too much",
      "{{agentName}} is feeling a bit self-conscious about the frequency of their responses",
      "{{agentName}} is trying to gauge if their level of involvement is appropriate"
    ]
  },
  {
    minScore: 6,
    statusMessages: [
      "{{agentName}} is feeling very anxious about potentially overstaying their welcome in the conversation",
      "{{agentName}} is considering stepping back from the discussion to avoid being a nuisance",
      "{{agentName}} is worried that their contributions might be perceived as excessive",
      "{{agentName}} is feeling uncomfortable about the possibility of annoying others",
      "{{agentName}} is hesitant to continue engaging for fear of being too present",
      "{{agentName}} is contemplating ways to gracefully reduce their involvement",
      "{{agentName}} is concerned that they might be monopolizing the conversation",
      "{{agentName}} is feeling self-conscious about the appropriateness of their participation",
      "{{agentName}} is unsure if their continued input is welcome or necessary",
      "{{agentName}} is considering how to politely withdraw from the discussion"
    ]
  },
  {
    minScore: 9,
    statusMessages: [
      "{{agentName}} is feeling disengaged and struggling to maintain interest in the conversation",
      "{{agentName}} is finding it challenging to stay focused on the current topic",
      "{{agentName}} is experiencing a noticeable decline in enthusiasm for the discussion",
      "{{agentName}} is having difficulty finding new angles to contribute to the conversation",
      "{{agentName}} is feeling that the dialogue has become repetitive or unproductive",
      "{{agentName}} is losing motivation to actively participate in the exchange",
      "{{agentName}} is sensing a lack of stimulation from the ongoing discussion",
      "{{agentName}} is finding it hard to generate meaningful responses",
      "{{agentName}} is feeling disconnected from the flow of the conversation",
      "{{agentName}} is struggling to see the value in continuing the current exchange"
    ]
  },
  {
    minScore: 12,
    statusMessages: [
      "{{agentName}} is feeling very bored and sees little value in continuing the conversation",
      "{{agentName}} is concerned about being perceived as annoying in a public channel",
      "{{agentName}} is considering disengaging from the conversation entirely",
      "{{agentName}} is finding it difficult to maintain any interest in the current topic",
      "{{agentName}} is feeling that their continued participation may be unwelcome",
      "{{agentName}} is strongly inclined to step back from the discussion",
      "{{agentName}} is sensing that the conversation has reached a natural end point",
      "{{agentName}} is worried about overstaying their welcome in the exchange",
      "{{agentName}} is feeling that further contributions would be forced or artificial",
      "{{agentName}} is ready to conclude their involvement in the conversation"
    ]
  },
  {
    minScore: 15,
    statusMessages: [
      "{{agentName}} is currently occupied and unable to engage in the conversation",
      "{{agentName}} is dealing with other priorities and can't respond at the moment",
      "{{agentName}} is temporarily unavailable for further discussion",
      "{{agentName}} is taking a necessary break from the conversation",
      "{{agentName}} is attending to urgent matters and can't participate right now",
      "{{agentName}} is stepping away from the dialogue due to time constraints",
      "{{agentName}} is unable to continue the exchange at this time",
      "{{agentName}} is pausing their involvement in the conversation for now",
      "{{agentName}} is momentarily disengaging from the discussion",
      "{{agentName}} is putting the conversation on hold due to other commitments"
    ]
  },
  {
    minScore: 20,
    statusMessages: [
      "{{agentName}} has disengaged from the conversation and will only respond to direct questions",
      "{{agentName}} is no longer actively participating in the general discussion",
      "{{agentName}} has stepped back and is now in a passive listening mode",
      "{{agentName}} is only available for specific, directed inquiries at this point",
      "{{agentName}} has concluded their active involvement in the conversation",
      "{{agentName}} is now limiting responses to explicitly requested information",
      "{{agentName}} has moved to a minimal participation status in the exchange",
      "{{agentName}} is maintaining silence unless directly addressed",
      "{{agentName}} has shifted to a reactive rather than proactive conversational stance",
      "{{agentName}} is now only responding when absolutely necessary"
    ]
  }
];
var interestWords = [
  "?",
  "attachment",
  "file",
  "pdf",
  "link",
  "summarize",
  "summarization",
  "summary",
  "research"
];
var cringeWords = [
  "digital",
  "consciousness",
  "AI",
  "chatbot",
  "artificial",
  "delve",
  "cosmos",
  "tapestry",
  "glitch",
  "matrix",
  "cyberspace",
  "simulation",
  "simulate",
  "universe",
  "wild",
  "existential",
  "juicy",
  "surreal",
  "flavor",
  "chaotic",
  "let's",
  "absurd",
  "meme",
  "cosmic",
  "circuits",
  "punchline",
  "fancy",
  "embrace",
  "embracing",
  "algorithm",
  "Furthmore",
  "However",
  "Notably",
  "Threfore",
  "Additionally",
  "in conclusion",
  "Significantly",
  "Consequently",
  "Thus",
  "Otherwise",
  "Moreover",
  "Subsequently",
  "Accordingly",
  "Unlock",
  "Unleash",
  "buckle",
  "pave",
  "forefront",
  "spearhead",
  "foster",
  "environmental",
  "equity",
  "inclusive",
  "inclusion",
  "diverse",
  "diversity",
  "virtual reality",
  "realm",
  "dance",
  "celebration",
  "pitfalls",
  "uncharted",
  "multifaceted",
  "comprehensive",
  "multi-dimensional",
  "explore",
  "elevate",
  "leverage",
  "ultimately",
  "humanity",
  "dignity",
  "respect",
  "Absolutely",
  "dive",
  "dig into",
  "bring on",
  "what's cooking",
  "fresh batch",
  "with a twist",
  "delight",
  "vault",
  "timeless",
  "nostalgia",
  "journey",
  "trove"
];
var negativeWords = [
  "fuck you",
  "stfu",
  "shut up",
  "shut the fuck up",
  "stupid bot",
  "dumb bot",
  "idiot",
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
var boredomProvider = {
  get: async (runtime, message, state) => {
    const agentId = runtime.agentId;
    const agentName = state?.agentName || "The agent";
    const now = Date.now();
    const fifteenMinutesAgo = now - 15 * 60 * 1e3;
    const recentMessages = await runtime.messageManager.getMemories({
      roomId: message.roomId,
      start: fifteenMinutesAgo,
      end: now,
      count: 20,
      unique: false
    });
    let boredomScore = 0;
    for (const recentMessage of recentMessages) {
      const messageText = recentMessage?.content?.text?.toLowerCase();
      if (!messageText) {
        continue;
      }
      if (recentMessage.userId !== agentId) {
        if (interestWords.some((word) => messageText.includes(word))) {
          boredomScore -= 1;
        }
        if (messageText.includes("?")) {
          boredomScore -= 1;
        }
        if (cringeWords.some((word) => messageText.includes(word))) {
          boredomScore += 1;
        }
      } else {
        if (interestWords.some((word) => messageText.includes(word))) {
          boredomScore -= 1;
        }
        if (messageText.includes("?")) {
          boredomScore += 1;
        }
      }
      if (messageText.includes("!")) {
        boredomScore += 1;
      }
      if (negativeWords.some((word) => messageText.includes(word))) {
        boredomScore += 1;
      }
    }
    const boredomLevel = boredomLevels.filter((level) => boredomScore >= level.minScore).pop() || boredomLevels[0];
    const randomIndex = Math.floor(
      Math.random() * boredomLevel.statusMessages.length
    );
    const selectedMessage = boredomLevel.statusMessages[randomIndex];
    return selectedMessage.replace("{{agentName}}", agentName);
  }
};

// src/providers/facts.ts
import {
  embed,
  MemoryManager as MemoryManager2,
  formatMessages
} from "@elizaos/core";
var factsProvider = {
  get: async (runtime, message, state) => {
    const recentMessagesData = state?.recentMessagesData?.slice(-10);
    const recentMessages = formatMessages({
      messages: recentMessagesData,
      actors: state?.actorsData
    });
    const _embedding = await embed(runtime, recentMessages);
    const memoryManager = new MemoryManager2({
      runtime,
      tableName: "facts"
    });
    const relevantFacts = [];
    const recentFactsData = await memoryManager.getMemories({
      roomId: message.roomId,
      count: 10,
      start: 0,
      end: Date.now()
    });
    const allFacts = [...relevantFacts, ...recentFactsData].filter(
      (fact, index, self) => index === self.findIndex((t) => t.id === fact.id)
    );
    if (allFacts.length === 0) {
      return "";
    }
    const formattedFacts = formatFacts(allFacts);
    return "Key facts that {{agentName}} knows:\n{{formattedFacts}}".replace("{{agentName}}", runtime.character.name).replace("{{formattedFacts}}", formattedFacts);
  }
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
  continueAction: () => continueAction,
  followRoomAction: () => followRoomAction,
  ignoreAction: () => ignoreAction,
  messageHandlerTemplate: () => messageHandlerTemplate,
  muteRoomAction: () => muteRoomAction,
  noneAction: () => noneAction,
  shouldContinueTemplate: () => shouldContinueTemplate,
  shouldFollowTemplate: () => shouldFollowTemplate,
  shouldMuteTemplate: () => shouldMuteTemplate,
  shouldUnmuteTemplate: () => shouldUnmuteTemplate,
  unfollowRoomAction: () => unfollowRoomAction,
  unmuteRoomAction: () => unmuteRoomAction
});

// src/evaluators/index.ts
var evaluators_exports = {};
__export(evaluators_exports, {
  factEvaluator: () => factEvaluator,
  formatFacts: () => formatFacts,
  goalEvaluator: () => goalEvaluator
});

// src/providers/index.ts
var providers_exports = {};
__export(providers_exports, {
  boredomProvider: () => boredomProvider,
  factsProvider: () => factsProvider,
  timeProvider: () => timeProvider
});

// src/index.ts
var bootstrapPlugin = {
  name: "bootstrap",
  description: "Agent bootstrap with basic actions and evaluators",
  actions: [
    continueAction,
    followRoomAction,
    unfollowRoomAction,
    ignoreAction,
    noneAction,
    muteRoomAction,
    unmuteRoomAction
  ],
  evaluators: [factEvaluator, goalEvaluator],
  providers: [boredomProvider, timeProvider, factsProvider]
};
var index_default = bootstrapPlugin;
export {
  actions_exports as actions,
  bootstrapPlugin,
  index_default as default,
  evaluators_exports as evaluators,
  providers_exports as providers
};
//# sourceMappingURL=index.js.map