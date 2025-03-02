// src/actions/fetchMatchAction.ts
import {
  elizaLogger
} from "@elizaos/core";
var fetchMatchAction = {
  name: "FETCH_MATCH",
  similes: ["LIVE_MATCH", "GET_SCORE", "FETCH_MATCH"],
  description: "Fetch live match scores and events",
  validate: async (runtime, _message, _state) => {
    const apiKey = runtime.getSetting("FOOTBALL_API_KEY");
    return !!apiKey;
  },
  handler: async (runtime, _message, _state, _options, callback) => {
    try {
      const apiKey = runtime.getSetting("FOOTBALL_API_KEY");
      const apiUrl = "https://api.football-data.org/v4/matches";
      const response = await fetch(apiUrl, {
        headers: { "X-Auth-Token": apiKey },
        signal: AbortSignal.timeout(5e3)
      });
      if (!response.ok) {
        elizaLogger.error(
          "Error fetching live match data:",
          response.statusText
        );
        callback({
          text: "Error fetching live match data:",
          action: "FETCH_MATCH"
        });
        return false;
      }
      const matchData = await response.json();
      elizaLogger.log("Fetched match data:", matchData);
      callback(
        {
          text: `Football match data fetched successfully:
                    - Matches found: ${matchData.resultSet.count}
                    - Competitions: ${matchData.resultSet.competitions}
                    - Date range: ${matchData.filters.dateFrom} to ${matchData.filters.dateTo}

                    Match Results:
                    ${matchData.matches.map(
            (match) => `
                    ${match.competition.name}
                    ${match.homeTeam.name} ${match.score.fullTime.home} - ${match.score.fullTime.away} ${match.awayTeam.name}
                    Status: ${match.status}
                    `
          ).join("\n")}`
        },
        []
      );
      return true;
    } catch (error) {
      elizaLogger.error("Error in fetchMatchAction:", error);
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "What's the score of the Chelsea vs Arsenal match?"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "The latest score is Chelsea 1-2 Arsenal, full-time.",
          action: "FETCH_MATCH"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Give me the latest score for today's match!"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Sure! Let me check the live match details.",
          action: "FETCH_MATCH"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "What's the score in the Premier League game?"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "The score for the Premier League match is 2-1 in favor of Manchester United, full-time.",
          action: "FETCH_MATCH"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "What's the score for today's matches?" }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Here are today's live scores for the matches:",
          action: "FETCH_MATCH"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Tell me the score for Arsenal vs Chelsea." }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Fetching the live score for Arsenal vs Chelsea...",
          action: "FETCH_MATCH"
        }
      }
    ]
  ]
};

// src/actions/fetchStandingsAction.ts
import {
  elizaLogger as elizaLogger2
} from "@elizaos/core";
var TIMEOUT_MS = 5e3;
var RATE_LIMIT_WINDOW_MS = 6e4;
var lastRequestTime = 0;
var fetchStandingsAction = {
  name: "FETCH_STANDINGS",
  similes: ["GET_TABLE", "LEAGUE_STANDINGS"],
  description: "Fetch current league standings",
  validate: async (runtime, _message, _state) => {
    const apiKey = runtime.getSetting("FOOTBALL_API_KEY");
    return !!apiKey;
  },
  handler: async (runtime, _message, _state, _options, callback) => {
    try {
      const league = runtime.getSetting("LEAGUE_ID") || "PL";
      const apiKey = runtime.getSetting("FOOTBALL_API_KEY");
      if (!apiKey?.match(/^[a-f0-9]{32}$/i)) {
        elizaLogger2.error("Invalid API key format");
        return false;
      }
      const now = Date.now();
      if (now - lastRequestTime < RATE_LIMIT_WINDOW_MS) {
        elizaLogger2.error("Rate limit exceeded");
        return false;
      }
      lastRequestTime = now;
      const apiUrl = `https://api.football-data.org/v4/competitions/${league}/standings`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const response = await fetch(apiUrl, {
        headers: { "X-Auth-Token": apiKey },
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!response.ok) {
        elizaLogger2.error(
          "Error fetching standings data:",
          response.statusText
        );
        callback({
          text: "Error fetching standings data:",
          action: "FETCH_STANDINGS"
        });
        return false;
      }
      const standingsData = await response.json();
      callback(
        {
          text: `Football standings data fetched successfully:
                    - Result: ${JSON.stringify(standingsData, null, 2)}`
        },
        []
      );
      return;
    } catch (error) {
      elizaLogger2.error("Error in fetchStandingsAction:", error);
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "What are the current standings in the Premier League?"
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "The top 2 teams are: 1. Manchester City - 45 points, 2. Arsenal - 42 points.",
          action: "FETCH_STANDINGS"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Give me the table for La Liga" }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "The top 3 teams in La Liga are: 1. Barcelona, 2. Real Madrid, 3. Atletico Madrid.",
          action: "FETCH_STANDINGS"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: { text: "Check the Serie A table for me." }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Serie A current standings: Juventus 1st, AC Milan 2nd, Inter Milan 3rd.",
          action: "FETCH_STANDINGS"
        }
      }
    ]
  ]
};

// src/index.ts
var footballPlugin = {
  name: "football",
  description: "Football data plugin to fetch live scores, standings, and fixtures",
  actions: [fetchMatchAction, fetchStandingsAction]
};
var index_default = footballPlugin;
export {
  index_default as default,
  footballPlugin
};
//# sourceMappingURL=index.js.map