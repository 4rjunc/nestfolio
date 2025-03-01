// src/providers/udio.ts
var API_BASE_URL = "https://www.udio.com/api";
var UdioProvider = class _UdioProvider {
  authToken;
  baseUrl;
  static async get(runtime, _message, _state) {
    const authToken = runtime.getSetting("UDIO_AUTH_TOKEN");
    if (!authToken) {
      throw new Error("UDIO_AUTH_TOKEN is required");
    }
    return new _UdioProvider({ authToken });
  }
  constructor(config) {
    this.authToken = config.authToken;
    this.baseUrl = config.baseUrl || API_BASE_URL;
  }
  async get(_runtime, _message, _state) {
    return this;
  }
  async makeRequest(url, method, data) {
    const headers = {
      "Accept": method === "GET" ? "application/json, text/plain, */*" : "application/json",
      "Content-Type": "application/json",
      "Cookie": `sb-api-auth-token=${this.authToken}`,
      "Origin": "https://www.udio.com",
      "Referer": "https://www.udio.com/my-creations"
    };
    const options = {
      method,
      headers,
      body: data ? JSON.stringify(data) : void 0
    };
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`UDIO_API_ERROR: ${response.status}`);
    }
    return response.json();
  }
  async generateSong(prompt, samplerOptions, customLyrics) {
    const url = `${this.baseUrl}/generate-proxy`;
    const data = {
      prompt,
      samplerOptions,
      ...customLyrics && { lyricInput: customLyrics }
    };
    return this.makeRequest(url, "POST", data);
  }
  async checkSongStatus(songIds) {
    const url = `${this.baseUrl}/songs?songIds=${songIds.join(",")}`;
    return this.makeRequest(url, "GET");
  }
};

// src/actions/generate.ts
var generateMusic = {
  name: "generate",
  description: "Generate music using Udio AI",
  similes: [
    "CREATE_MUSIC",
    "MAKE_MUSIC",
    "COMPOSE_MUSIC",
    "GENERATE_AUDIO",
    "CREATE_SONG",
    "MAKE_SONG"
  ],
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("UDIO_AUTH_TOKEN");
  },
  handler: async (runtime, message, state, _options, callback) => {
    try {
      const provider = await UdioProvider.get(runtime, message, state);
      const content = message.content;
      if (!content.prompt) {
        throw new Error("Missing required parameter: prompt");
      }
      const generateResult = await provider.generateSong(
        content.prompt,
        { seed: content.seed || -1 },
        content.customLyrics
      );
      while (true) {
        const status = await provider.checkSongStatus(generateResult.track_ids);
        if (status.songs.every((song) => song.finished)) {
          if (callback) {
            callback({
              text: "Successfully generated music based on your prompt",
              content: status
            });
          }
          return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 5e3));
      }
    } catch (error) {
      if (callback) {
        callback({
          text: `Failed to generate music: ${error.message}`,
          error
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Create a happy and energetic song",
          prompt: "A cheerful and energetic melody with upbeat rhythm",
          seed: 12345
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll generate a happy and energetic song for you.",
          action: "generate"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Successfully generated your upbeat and energetic song."
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Generate a song with custom lyrics",
          prompt: "A pop song with vocals",
          seed: 54321,
          customLyrics: "Verse 1: This is my custom song..."
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll create a pop song with your custom lyrics.",
          action: "generate"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Successfully generated your song with custom lyrics."
        }
      }
    ]
  ]
};
var generate_default = generateMusic;

// src/actions/extend.ts
var extendMusic = {
  name: "extend",
  description: "Extend an existing music piece using Udio AI",
  similes: [
    "CONTINUE_MUSIC",
    "EXTEND_SONG",
    "LENGTHEN_MUSIC",
    "CONTINUE_SONG",
    "EXTEND_AUDIO",
    "CONTINUE_AUDIO"
  ],
  validate: async (runtime, _message) => {
    return !!runtime.getSetting("UDIO_AUTH_TOKEN");
  },
  handler: async (runtime, message, state, _options, callback) => {
    try {
      const provider = await UdioProvider.get(runtime, message, state);
      const content = message.content;
      if (!content.prompt || !content.audioConditioningPath || !content.audioConditioningSongId) {
        throw new Error("Missing required parameters: prompt, audioConditioningPath, or audioConditioningSongId");
      }
      const generateResult = await provider.generateSong(
        content.prompt,
        {
          seed: content.seed || -1,
          audio_conditioning_path: content.audioConditioningPath,
          audio_conditioning_song_id: content.audioConditioningSongId,
          audio_conditioning_type: "continuation",
          ...content.cropStartTime !== void 0 && { crop_start_time: content.cropStartTime }
        },
        content.customLyrics
      );
      while (true) {
        const status = await provider.checkSongStatus(generateResult.track_ids);
        if (status.songs.every((song) => song.finished)) {
          if (callback) {
            callback({
              text: "Successfully extended the music based on your prompt",
              content: status
            });
          }
          return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 5e3));
      }
    } catch (error) {
      if (callback) {
        callback({
          text: `Failed to extend music: ${error.message}`,
          error
        });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Extend this song with a similar style",
          prompt: "Continue with the same energy and mood",
          audioConditioningPath: "/path/to/original.mp3",
          audioConditioningSongId: "original-123",
          cropStartTime: 60
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll extend your song maintaining its style.",
          action: "extend"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Successfully extended your song."
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Continue this track with custom lyrics",
          prompt: "Continue the melody and add vocals",
          audioConditioningPath: "/path/to/song.mp3",
          audioConditioningSongId: "song-456",
          seed: 54321,
          customLyrics: "Verse 2: Continuing the story..."
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll extend your track with the new lyrics.",
          action: "extend"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Successfully extended your track with the new lyrics."
        }
      }
    ]
  ]
};
var extend_default = extendMusic;

// src/index.ts
var udioProvider = {
  get: async (runtime, message, state) => {
    const provider = await UdioProvider.get(runtime, message, state);
    return provider;
  }
};
var udioPlugin = {
  name: "udio",
  description: "Udio AI Music Generation Plugin for Eliza",
  actions: [generate_default, extend_default],
  evaluators: [],
  providers: [udioProvider]
};
var index_default = udioPlugin;
export {
  extend_default as ExtendMusic,
  generate_default as GenerateMusic,
  UdioProvider,
  index_default as default,
  udioPlugin
};
//# sourceMappingURL=index.js.map