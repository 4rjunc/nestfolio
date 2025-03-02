// src/index.ts
import { elizaLogger } from "@elizaos/core";
import { fal } from "@fal-ai/client";

// src/constants.ts
var FAL_CONSTANTS = {
  API_TTS_ENDPOINT: "fal-ai/playai/tts/v3",
  API_KEY_SETTING: "FAL_API_KEY"
  // The setting name to fetch from runtime
};
var VOICE_MAP = {
  "en": [
    {
      name: "Jennifer",
      style: "Conversational",
      region: "US/American",
      fullName: "Jennifer (English (US)/American)"
    },
    {
      name: "Dexter",
      style: "Conversational",
      region: "US/American",
      fullName: "Dexter (English (US)/American)"
    },
    {
      name: "Ava",
      style: "Conversational",
      region: "AU/Australian",
      fullName: "Ava (English (AU)/Australian)"
    },
    {
      name: "Tilly",
      style: "Conversational",
      region: "AU/Australian",
      fullName: "Tilly (English (AU)/Australian)"
    },
    {
      name: "Charlotte",
      style: "Advertising",
      region: "CA/Canadian",
      fullName: "Charlotte (Advertising) (English (CA)/Canadian)"
    },
    {
      name: "Charlotte",
      style: "Meditation",
      region: "CA/Canadian",
      fullName: "Charlotte (Meditation) (English (CA)/Canadian)"
    },
    {
      name: "Cecil",
      style: "Conversational",
      region: "GB/British",
      fullName: "Cecil (English (GB)/British)"
    },
    {
      name: "Sterling",
      style: "Conversational",
      region: "GB/British",
      fullName: "Sterling (English (GB)/British)"
    },
    {
      name: "Cillian",
      style: "Conversational",
      region: "IE/Irish",
      fullName: "Cillian (English (IE)/Irish)"
    },
    {
      name: "Madison",
      style: "Conversational",
      region: "IE/Irish",
      fullName: "Madison (English (IE)/Irish)"
    },
    {
      name: "Ada",
      style: "Conversational",
      region: "ZA/South african",
      fullName: "Ada (English (ZA)/South african)"
    },
    {
      name: "Sumita",
      style: "Conversational",
      region: "IN/Indian",
      fullName: "Sumita (English (IN)/Indian)"
    },
    {
      name: "Navya",
      style: "Conversational",
      region: "IN/Indian",
      fullName: "Navya (English (IN)/Indian)"
    }
  ],
  "ja": [
    {
      name: "Kiriko",
      style: "Conversational",
      region: "Japanese",
      fullName: "Kiriko Conversational (Japanese/Japanese)"
    },
    {
      name: "Kiriko",
      style: "Narrative",
      region: "Japanese",
      fullName: "Kiriko Narrative (Japanese/Japanese)"
    }
  ],
  "af": [
    {
      name: "Ronel",
      style: "Conversational",
      region: "South african",
      fullName: "Ronel Conversational (Afrikaans/South african)"
    },
    {
      name: "Ronel",
      style: "Narrative",
      region: "South african",
      fullName: "Ronel Narrative (Afrikaans/South african)"
    }
  ],
  "ar": [
    {
      name: "Abdo",
      style: "Conversational",
      region: "Arabic",
      fullName: "Abdo Conversational (Arabic/Arabic)"
    },
    {
      name: "Abdo",
      style: "Narrative",
      region: "Arabic",
      fullName: "Abdo Narrative (Arabic/Arabic)"
    }
  ],
  "bn": [
    {
      name: "Mousmi",
      style: "Conversational",
      region: "Bengali",
      fullName: "Mousmi Conversational (Bengali/Bengali)"
    },
    {
      name: "Mousmi",
      style: "Narrative",
      region: "Bengali",
      fullName: "Mousmi Narrative (Bengali/Bengali)"
    }
  ],
  "pt": [
    {
      name: "Caroline",
      style: "Conversational",
      region: "Brazilian",
      fullName: "Caroline Conversational (Portuguese (BR)/Brazilian)"
    },
    {
      name: "Caroline",
      style: "Narrative",
      region: "Brazilian",
      fullName: "Caroline Narrative (Portuguese (BR)/Brazilian)"
    }
  ],
  "fr": [
    {
      name: "Ange",
      style: "Conversational",
      region: "French",
      fullName: "Ange Conversational (French/French)"
    },
    {
      name: "Ange",
      style: "Narrative",
      region: "French",
      fullName: "Ange Narrative (French/French)"
    },
    {
      name: "Baptiste",
      style: "Conversational",
      region: "French",
      fullName: "Baptiste (English (FR)/French)"
    }
  ],
  "de": [
    {
      name: "Anke",
      style: "Conversational",
      region: "German",
      fullName: "Anke Conversational (German/German)"
    },
    {
      name: "Anke",
      style: "Narrative",
      region: "German",
      fullName: "Anke Narrative (German/German)"
    }
  ],
  "es": [
    {
      name: "Carmen",
      style: "Conversational",
      region: "Spanish",
      fullName: "Carmen Conversational (Spanish/Spanish)"
    },
    {
      name: "Patricia",
      style: "Conversational",
      region: "Spanish",
      fullName: "Patricia Conversational (Spanish/Spanish)"
    }
  ],
  "ko": [
    {
      name: "Dohee",
      style: "Conversational",
      region: "Korean",
      fullName: "Dohee Conversational (Korean/Korean)"
    },
    {
      name: "Dohee",
      style: "Narrative",
      region: "Korean",
      fullName: "Dohee Narrative (Korean/Korean)"
    }
  ],
  "he": [
    {
      name: "Mary",
      style: "Conversational",
      region: "Israeli",
      fullName: "Mary Conversational (Hebrew/Israeli)"
    },
    {
      name: "Mary",
      style: "Narrative",
      region: "Israeli",
      fullName: "Mary Narrative (Hebrew/Israeli)"
    }
  ],
  "id": [
    {
      name: "Ignatius",
      style: "Conversational",
      region: "Malay",
      fullName: "Ignatius Conversational (Malay/Malay)"
    },
    {
      name: "Ignatius",
      style: "Narrative",
      region: "Malay",
      fullName: "Ignatius Narrative (Malay/Malay)"
    }
  ],
  "ru": [
    {
      name: "Andrei",
      style: "Conversational",
      region: "Russian",
      fullName: "Andrei Conversational (Russian/Russian)"
    },
    {
      name: "Andrei",
      style: "Narrative",
      region: "Russian",
      fullName: "Andrei Narrative (Russian/Russian)"
    }
  ],
  "tl": [
    {
      name: "Aiken",
      style: "Conversational",
      region: "Filipino",
      fullName: "Aiken Conversational (Tagalog/Filipino)"
    },
    {
      name: "Aiken",
      style: "Narrative",
      region: "Filipino",
      fullName: "Aiken Narrative (Tagalog/Filipino)"
    }
  ],
  "mk": [
    {
      name: "Aleksa",
      style: "Conversational",
      region: "Serbian",
      fullName: "Aleksa Conversational (Serbian/Serbian)"
    },
    {
      name: "Aleksa",
      style: "Narrative",
      region: "Serbian",
      fullName: "Aleksa Narrative (Serbian/Serbian)"
    }
  ],
  "ne": [
    {
      name: "Anuj",
      style: "Conversational",
      region: "Indian",
      fullName: "Anuj Conversational (Hindi/Indian)"
    },
    {
      name: "Anuj",
      style: "Narrative",
      region: "Indian",
      fullName: "Anuj Narrative (Hindi/Indian)"
    }
  ],
  "th": [
    {
      name: "Katbundit",
      style: "Conversational",
      region: "Thai",
      fullName: "Katbundit Conversational (Thai/Thai)"
    },
    {
      name: "Katbundit",
      style: "Narrative",
      region: "Thai",
      fullName: "Katbundit Narrative (Thai/Thai)"
    }
  ],
  "tr": [
    {
      name: "Ali",
      style: "Conversational",
      region: "Turkish",
      fullName: "Ali Conversational (Turkish/Turkish)"
    },
    {
      name: "Ali",
      style: "Narrative",
      region: "Turkish",
      fullName: "Ali Narrative (Turkish/Turkish)"
    }
  ]
};
var getRandomVoice = (voiceOptions) => {
  const randomIndex = Math.floor(Math.random() * voiceOptions.length);
  return voiceOptions[randomIndex];
};

// src/index.ts
import * as fs from "node:fs";
import { Buffer } from "node:buffer";
import * as path from "node:path";
import * as process from "node:process";
import { detect } from "langdetect";
var generateTTS = async (prompt, voice, runtime) => {
  process.env.FAL_KEY = FAL_CONSTANTS.API_KEY_SETTING || runtime.getSetting("FAL_API_KEY");
  try {
    elizaLogger.log("Starting TTS generation with prompt:", prompt);
    const response = await fal.subscribe(FAL_CONSTANTS.API_TTS_ENDPOINT, {
      input: {
        input: prompt,
        voice
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(elizaLogger.debug);
        }
      }
    });
    elizaLogger.debug(
      "Generation request successful, received response:",
      response
    );
    return { success: true, data: response.data };
  } catch (error) {
    elizaLogger.error("TTS generation error:", error);
    return {
      success: false,
      error: error.message || "Unknown error occurred"
    };
  }
};
var TTSGeneration = {
  name: "GENERATE_TTS",
  similes: [
    "TTS_GENERATION",
    "CREATE_TTS",
    "TEXT2SPEECH",
    "T2S",
    "TEXT_TO_SPEECH",
    "AUDIO_CREATE"
  ],
  description: "Generate a tts audio based on a text prompt",
  validate: async (runtime, _message) => {
    elizaLogger.debug("Validating TTS action");
    const FalApiKey = runtime.getSetting("FAL_API_KEY");
    elizaLogger.debug("FAL_API_KEY present:", !!FalApiKey);
    return !!FalApiKey;
  },
  handler: async (runtime, message, _state, _options, callback) => {
    elizaLogger.debug("TTS request:", message);
    const TTSPrompt = message.content.text.replace(/<@\d+>/g, "").replace(/generate TTS|create TTS|make TTS|render TTS/gi, "").trim();
    if (!TTSPrompt || TTSPrompt.length < 3) {
      callback({ text: "Please input a word at least of length 3" });
      return;
    }
    elizaLogger.debug("TTS prompt:", TTSPrompt);
    callback({
      text: `I'll generate an audio based on your prompt: "${TTSPrompt}". This might take a few seconds...`
    });
    let target_voice;
    try {
      const language = detect(TTSPrompt);
      if (language && language.length > 0) {
        const voice_subject = VOICE_MAP[language[0].lang];
        target_voice = getRandomVoice(voice_subject).fullName;
      } else {
        throw new Error("Language detection failed, no language detected.");
      }
    } catch (error) {
      elizaLogger.error("Language detection error:", error);
      const defaultVoice = VOICE_MAP.en;
      target_voice = getRandomVoice(defaultVoice).fullName;
    }
    elizaLogger.debug("Starting TTS generation with prompt:", TTSPrompt, "and voice:", target_voice);
    try {
      const result = await generateTTS(TTSPrompt, target_voice, runtime);
      if (result.success && result.data.audio.url) {
        const cachedFile = `content_cache/tts_${result.data.audio.file_name}`;
        if (fs.existsSync(cachedFile)) {
          elizaLogger.debug("Using cached audio:", cachedFile);
        } else {
          const response = await fetch(result.data.audio.url);
          const arrayBuffer = await response.arrayBuffer();
          const directoryPath = path.dirname(cachedFile);
          if (!fs.existsSync(directoryPath)) {
            fs.mkdirSync(directoryPath, { recursive: true });
          }
          fs.writeFileSync(cachedFile, Buffer.from(arrayBuffer));
          elizaLogger.debug("Audio Duration:", result.data.audio.duration);
        }
        callback({
          text: "TTS Success! Here's your generated audio!",
          attachments: [
            {
              id: crypto.randomUUID(),
              url: result.data.audio.url,
              title: "TTS Generation",
              source: "TTSGeneration",
              description: TTSPrompt,
              text: TTSPrompt
            }
          ]
        }, [cachedFile]);
      } else {
        callback({ text: `TTS generation failed: ${result.error}`, error: true });
      }
    } catch (error) {
      elizaLogger.error(`Failed to generate TTS. Error: ${error}`);
      callback({ text: `TTS generation failed: ${error.message}`, error: true });
    }
  },
  examples: [
    [
      { user: "{{user1}}", content: { text: "Generate a TTS of prompt: Hello world!" } },
      { user: "{{agentName}}", content: { text: "I'll call a TTS to generate an audio based on your input prompt", action: "CREATE_TTS" } }
    ],
    [
      { user: "{{user1}}", content: { text: "Please do TTS to a prompt: Sam is busy now" } },
      { user: "{{agentName}}", content: { text: "Ok, please wait for the tts generation~", action: "AUDIO_CREATE" } }
    ]
  ]
};
var TTSGenerationPlugin = {
  name: "TTSGeneration",
  description: "Generate TTS using PlayAI tts (v3)",
  actions: [TTSGeneration],
  evaluators: [],
  providers: []
};
export {
  TTSGenerationPlugin
};
//# sourceMappingURL=index.js.map