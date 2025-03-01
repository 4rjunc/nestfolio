// src/actions/generate-meme.ts
import {
  composeContext,
  elizaLogger,
  generateText,
  ModelClass
} from "@elizaos/core";
var imgflipApiBaseUrl = "https://api.imgflip.com";
async function findImgflipTemplate(runtime, message) {
  const context = `
# Task: Find the best imgflip.com template for a meme, based on the user's message.
The message is:
${message}

# Instructions:
Get creative, don't stick to the most popular templates.
Only respond with the template name, do not include any other text.`;
  const response = await generateText({
    runtime,
    context,
    modelClass: ModelClass.MEDIUM
  });
  return response;
}
async function getImgflipTemplate(template) {
  const formData = new URLSearchParams({
    username: process.env.IMGFLIP_USERNAME,
    password: process.env.IMGFLIP_PASSWORD,
    query: template
  });
  const response = await fetch(`${imgflipApiBaseUrl}/search_memes`, {
    method: "POST",
    body: formData,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });
  const result = await response.json();
  if (!result.success || !result.data.memes.length) {
    const allMemesResponse = await fetch(`${imgflipApiBaseUrl}/get_memes`);
    const allMemes = await allMemesResponse.json();
    if (!allMemes.success || !allMemes.data.memes.length) {
      throw new Error("Failed to find meme template");
    }
    const closeMatches = allMemes.data.memes.filter(
      (meme) => meme.name.toLowerCase().includes(template.toLowerCase()) || template.toLowerCase().includes(meme.name.toLowerCase())
    );
    if (closeMatches.length === 0) {
      const randomIndex3 = Math.floor(
        Math.random() * Math.min(10, allMemes.data.memes.length)
      );
      return allMemes.data.memes[randomIndex3];
    }
    const randomIndex2 = Math.floor(Math.random() * closeMatches.length);
    return closeMatches[randomIndex2];
  }
  const randomIndex = Math.floor(Math.random() * result.data.memes.length);
  return result.data.memes[randomIndex];
}
async function generateMemeCaptions(runtime, message, state, imgflipTemplate, captionsCount) {
  const template = `
# About Arony:
{{bio}}
{{lore}}

# Task: Generate captions for a meme, based on a imgflip.com template, the user's message and a number of captions.
The template is: **${imgflipTemplate}**
The message is:
${message}
Generate **${captionsCount}** captions for the meme.

# Instructions:
Only respond with the captions - one per line, do not include any other text.`;
  const context = await composeContext({
    state,
    template
  });
  elizaLogger.debug("generateMemeCaptions context: ", context);
  const response = await generateText({
    runtime,
    context,
    modelClass: ModelClass.MEDIUM
  });
  return response.split("\n");
}
async function genereateMeme(imgflipTemplate, captions) {
  const username = process.env.IMGFLIP_USERNAME;
  const password = process.env.IMGFLIP_PASSWORD;
  if (!username || !password) {
    throw new Error("Imgflip credentials not configured. Please set IMGFLIP_USERNAME and IMGFLIP_PASSWORD environment variables.");
  }
  const formData = new URLSearchParams({
    template_id: imgflipTemplate.id,
    username,
    password
  });
  captions.forEach((text, index) => {
    formData.append(`boxes[${index}][text]`, text);
    formData.append(`boxes[${index}][color]`, "#FFFFFF");
    formData.append(`boxes[${index}][outline_color]`, "#000000");
  });
  const response = await fetch(`${imgflipApiBaseUrl}/caption_image`, {
    method: "POST",
    body: formData,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });
  const result = await response.json();
  if (!result.success || !result.data.url) {
    throw new Error(`Failed to generate meme: ${result.error_message}`);
  }
  return result.data.url;
}
async function generateMemeActionHandler(runtime, message, state) {
  const template = await findImgflipTemplate(runtime, message);
  const imgflipTemplate = await getImgflipTemplate(template);
  const captions = await generateMemeCaptions(
    runtime,
    message,
    state,
    template,
    imgflipTemplate.box_count
  );
  const url = await genereateMeme(imgflipTemplate, captions);
  const text = `Generated a meme, using imgflip.com:
Meme template: "${template}".
Captions:
${captions.join("\n")}
Meme URL: ${url}`;
  return {
    url,
    text
  };
}
var generateMemeAction = {
  name: "GENERATE_MEME",
  similes: ["MAKE_MEME", "NEW_MEME", "GENERATE_NEW_MEME", "MAKE_NEW_MEME"],
  description: "Use this action to generate a meme",
  validate: async (_runtime, _message) => {
    return true;
  },
  handler: async (runtime, message, state, _options, callback) => {
    const meme = await generateMemeActionHandler(
      runtime,
      message.content.text,
      state
    );
    const newMemory = {
      ...message,
      userId: message.agentId,
      content: {
        text: meme.text,
        attachments: [
          {
            url: meme.url
          }
        ],
        action: "GENERATE_MEME",
        source: message.content.source
      }
    };
    await runtime.messageManager.createMemory(newMemory);
    callback({
      text: "",
      attachments: newMemory.content.attachments
    });
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Can you make a meme about programming bugs?"
        }
      },
      {
        user: "{{assistant}}",
        content: {
          text: "I'll generate a meme about programming bugs.",
          action: "GENERATE_MEME"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Generate a funny meme about Monday mornings"
        }
      },
      {
        user: "{{assistant}}",
        content: {
          text: "I'll create a meme about Monday mornings for you!",
          action: "GENERATE_MEME"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "I need a meme that shows how I feel about deadlines"
        }
      },
      {
        user: "{{assistant}}",
        content: {
          text: "Let me make a meme about dealing with deadlines.",
          action: "GENERATE_MEME"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Make me a meme about pizza"
        }
      },
      {
        user: "{{assistant}}",
        content: {
          text: "I'll generate a meme about pizza for you.",
          action: "GENERATE_MEME"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Create a funny meme about working from home"
        }
      },
      {
        user: "{{assistant}}",
        content: {
          text: "I'll make a meme about the work from home life.",
          action: "GENERATE_MEME"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "I want a meme about trying to explain code to non-programmers"
        }
      },
      {
        user: "{{assistant}}",
        content: {
          text: "I'll generate a meme about explaining code to non-programmers.",
          action: "GENERATE_MEME"
        }
      }
    ]
  ]
};

// src/index.ts
var imgflipPlugin = {
  name: "imgflip",
  description: "Generate memes using imgflip.com",
  actions: [generateMemeAction],
  evaluators: [],
  providers: []
};
var index_default = imgflipPlugin;
export {
  index_default as default,
  generateMemeAction,
  generateMemeActionHandler,
  imgflipPlugin
};
//# sourceMappingURL=index.js.map