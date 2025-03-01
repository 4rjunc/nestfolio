// src/actions/postTweetAction.ts
import {
  elizaLogger as elizaLogger3
} from "@elizaos/core";

// src/util/twitterScraper.ts
import { Scraper } from "agent-twitter-client";
import { elizaLogger } from "@elizaos/core";

// src/util/primusUtil.ts
import { PrimusCoreTLS } from "@primuslabs/zktls-core-sdk";
var generateProof = async (endpoint, method, headers, body, responseParsePath) => {
  const zkTLS = new PrimusCoreTLS();
  await zkTLS.init(process.env.PRIMUS_APP_ID, process.env.PRIMUS_APP_SECRET);
  const requestParam = body ? {
    url: endpoint,
    method,
    header: headers,
    body
  } : {
    url: endpoint,
    method,
    header: headers
  };
  const attestationParams = zkTLS.generateRequestParams(requestParam, [
    {
      keyName: "content",
      parsePath: responseParsePath,
      parseType: "string"
    }
  ]);
  attestationParams.setAttMode({
    algorithmType: "proxytls"
  });
  return await zkTLS.startAttestation(attestationParams);
};
var verifyProof = async (attestation) => {
  const zkTLS = new PrimusCoreTLS();
  await zkTLS.init(process.env.PRIMUS_APP_ID, process.env.PRIMUS_APP_SECRET);
  return zkTLS.verifyAttestation(attestation);
};

// src/util/twitterScraper.ts
var TwitterScraper = class {
  scraper;
  constructor() {
  }
  getScraper() {
    return this.scraper;
  }
  async getUserIdByScreenName(screenName) {
    return await this.scraper.getUserIdByScreenName(screenName);
  }
  async login() {
    this.scraper = new Scraper();
    const username = process.env.TWITTER_USERNAME;
    const password = process.env.TWITTER_PASSWORD;
    const email = process.env.TWITTER_EMAIL;
    const twitter2faSecret = process.env.TWITTER_2FA_SECRET;
    if (!username || !password) {
      elizaLogger.error(
        "Twitter credentials not configured in environment"
      );
      return;
    }
    await this.scraper.login(username, password, email, twitter2faSecret);
    if (!await this.scraper.isLoggedIn()) {
      elizaLogger.error("Failed to login to Twitter");
      return false;
    }
  }
  async getUserLatestTweet(userId) {
    const onboardingTaskUrl = "https://api.twitter.com/1.1/onboarding/task.json";
    const cookies = await this.scraper.auth.cookieJar().getCookies(onboardingTaskUrl);
    const xCsrfToken = cookies.find((cookie) => cookie.key === "ct0");
    const headers = {
      authorization: `Bearer ${this.scraper.auth.bearerToken}`,
      cookie: await this.scraper.auth.cookieJar().getCookieString(onboardingTaskUrl),
      "content-type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 11; Nokia G20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.88 Mobile Safari/537.36",
      "x-guest-token": this.scraper.guestToken,
      "x-twitter-auth-type": "OAuth2Client",
      "x-twitter-active-user": "yes",
      "x-twitter-client-language": "en",
      "x-csrf-token": xCsrfToken?.value
    };
    const variables = {
      userId,
      count: 1,
      includePromotedContent: true,
      withQuickPromoteEligibilityTweetFields: true,
      withVoice: true,
      withV2Timeline: true
    };
    const features = {
      profile_label_improvements_pcf_label_in_post_enabled: false,
      rweb_tipjar_consumption_enabled: true,
      tweetypie_unmention_optimization_enabled: false,
      responsive_web_graphql_exclude_directive_enabled: true,
      verified_phone_label_enabled: false,
      creator_subscriptions_tweet_preview_api_enabled: true,
      responsive_web_graphql_timeline_navigation_enabled: true,
      responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
      premium_content_api_read_enabled: false,
      communities_web_enable_tweet_community_results_fetch: true,
      c9s_tweet_anatomy_moderator_badge_enabled: true,
      responsive_web_grok_analyze_button_fetch_trends_enabled: false,
      responsive_web_grok_analyze_post_followups_enabled: true,
      responsive_web_grok_share_attachment_enabled: true,
      articles_preview_enabled: true,
      responsive_web_edit_tweet_api_enabled: true,
      graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
      view_counts_everywhere_api_enabled: true,
      longform_notetweets_consumption_enabled: true,
      responsive_web_twitter_article_tweet_consumption_enabled: true,
      tweet_awards_web_tipping_enabled: false,
      creator_subscriptions_quote_tweet_preview_enabled: false,
      freedom_of_speech_not_reach_fetch_enabled: true,
      standardized_nudges_misinfo: true,
      tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
      rweb_video_timestamps_enabled: true,
      longform_notetweets_rich_text_read_enabled: true,
      longform_notetweets_inline_media_enabled: true,
      responsive_web_enhance_cards_enabled: false
    };
    const fieldToggles = {
      withArticlePlainText: false
    };
    const variablesUrlEncoded = encodeURIComponent(
      JSON.stringify(variables)
    );
    const featureUrlEncoded = encodeURIComponent(JSON.stringify(features));
    const fieldTogglesUrlEncoded = encodeURIComponent(
      JSON.stringify(fieldToggles)
    );
    const endpoint = `https://twitter.com/i/api/graphql/V7H0Ap3_Hh2FyS75OCDO3Q/UserTweets?variables=${variablesUrlEncoded}&features=${featureUrlEncoded}&fieldToggles=${fieldTogglesUrlEncoded}`;
    const responseParsePath = "$.data.user.result.timeline_v2.timeline.instructions[1].entry.content.itemContent.tweet_results.result.legacy.full_text";
    const attestation = await generateProof(
      endpoint,
      "GET",
      headers,
      void 0,
      responseParsePath
    );
    elizaLogger.info(
      "Tweet getting proof generated successfully:",
      attestation
    );
    const verifyResult = verifyProof(attestation);
    if (!verifyResult) {
      throw new Error(
        "Verify attestation failed,data from source is illegality"
      );
    }
    const responseData = JSON.parse(attestation.data);
    const content = responseData.content;
    elizaLogger.info(`get tweet content success:${content}`);
    return this.removeEmojis(content);
  }
  isEmoji(char) {
    const codePoint = char.codePointAt(0);
    return codePoint >= 128512 && codePoint <= 128591 || codePoint >= 127744 && codePoint <= 128511 || codePoint >= 128640 && codePoint <= 128767 || codePoint >= 9728 && codePoint <= 9983 || codePoint >= 9984 && codePoint <= 10175 || codePoint >= 129280 && codePoint <= 129535 || codePoint >= 127462 && codePoint <= 127487;
  }
  removeEmojis(input) {
    return Array.from(input).filter((char) => !this.isEmoji(char)).join("");
  }
  async sendTweet(content) {
    const onboardingTaskUrl = "https://api.twitter.com/1.1/onboarding/task.json";
    const cookies = await this.scraper.auth.cookieJar().getCookies(onboardingTaskUrl);
    const xCsrfToken = cookies.find((cookie) => cookie.key === "ct0");
    const headers = {
      authorization: `Bearer ${this.scraper.auth.bearerToken}`,
      cookie: await this.scraper.auth.cookieJar().getCookieString(onboardingTaskUrl),
      "content-type": "application/json",
      "User-Agent": "Mozilla/5.0 (Linux; Android 11; Nokia G20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.88 Mobile Safari/537.36",
      "x-guest-token": this.scraper.guestToken,
      "x-twitter-auth-type": "OAuth2Client",
      "x-twitter-active-user": "yes",
      "x-twitter-client-language": "en",
      "x-csrf-token": xCsrfToken?.value
    };
    const variables = {
      tweet_text: content,
      dark_request: false,
      media: {
        media_entities: [],
        possibly_sensitive: false
      },
      semantic_annotation_ids: []
    };
    const bodyStr = JSON.stringify({
      variables,
      features: {
        interactive_text_enabled: true,
        longform_notetweets_inline_media_enabled: false,
        responsive_web_text_conversations_enabled: false,
        tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: false,
        vibe_api_enabled: false,
        rweb_lists_timeline_redesign_enabled: true,
        responsive_web_graphql_exclude_directive_enabled: true,
        verified_phone_label_enabled: false,
        creator_subscriptions_tweet_preview_api_enabled: true,
        responsive_web_graphql_timeline_navigation_enabled: true,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        tweetypie_unmention_optimization_enabled: true,
        responsive_web_edit_tweet_api_enabled: true,
        graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
        view_counts_everywhere_api_enabled: true,
        longform_notetweets_consumption_enabled: true,
        tweet_awards_web_tipping_enabled: false,
        freedom_of_speech_not_reach_fetch_enabled: true,
        standardized_nudges_misinfo: true,
        longform_notetweets_rich_text_read_enabled: true,
        responsive_web_enhance_cards_enabled: false,
        subscriptions_verification_info_enabled: true,
        subscriptions_verification_info_reason_enabled: true,
        subscriptions_verification_info_verified_since_enabled: true,
        super_follow_badge_privacy_enabled: false,
        super_follow_exclusive_tweet_notifications_enabled: false,
        super_follow_tweet_api_enabled: false,
        super_follow_user_api_enabled: false,
        android_graphql_skip_api_media_color_palette: false,
        creator_subscriptions_subscription_count_enabled: false,
        blue_business_profile_image_shape_enabled: false,
        unified_cards_ad_metadata_container_dynamic_card_content_query_enabled: false,
        rweb_video_timestamps_enabled: false,
        c9s_tweet_anatomy_moderator_badge_enabled: false,
        responsive_web_twitter_article_tweet_consumption_enabled: false
      },
      fieldToggles: {}
    });
    const endpoint = "https://twitter.com/i/api/graphql/a1p9RWpkYKBjWv_I3WzS-A/CreateTweet";
    const method = "POST";
    const attestation = await generateProof(endpoint, method, headers, bodyStr, "$.data.create_tweet.tweet_results.result.rest_id");
    elizaLogger.info(
      "Tweet posting proof generated successfully:",
      attestation
    );
    const verifyResult = verifyProof(attestation);
    if (!verifyResult) {
      throw new Error(
        "Verify attestation failed, data from source is illegality"
      );
    }
    const responseData = JSON.parse(attestation.data);
    elizaLogger.info(`send tweet success,tweetId:${responseData.content}`);
    return responseData.content;
  }
};

// src/providers/tokenPriceProvider.ts
import { elizaLogger as elizaLogger2 } from "@elizaos/core";
var tokenPriceProvider = {
  // eslint-disable-next-line
  get: async (_runtime, _message, _state) => {
    const url = `${process.env.BINANCE_API_URL || "https://api.binance.com"}/api/v3/ticker/price?symbol=${process.env.BINANCE_SYMBOL || "BTCUSDT"}`;
    const method = "GET";
    const headers = {
      "Accept	": "*/*"
    };
    const attestation = await generateProof(url, method, headers, "", "$.price");
    const valid = await verifyProof(attestation);
    if (!valid) {
      throw new Error("Invalid price attestation");
    }
    elizaLogger2.info("price attestation:", attestation);
    try {
      const responseData = JSON.parse(attestation.data);
      const price = responseData.content;
      return `
            Get BTC price from Binance:
            BTC: ${price} USDT
            Time: ${(/* @__PURE__ */ new Date()).toUTCString()}
            POST by eliza #eliza
            Attested by Primus #primus #zktls
            `;
    } catch (error) {
      elizaLogger2.error("Failed to parse price data:", error);
      throw new Error("Failed to parse price data");
    }
  }
};

// src/actions/postTweetAction.ts
var postTweetAction = {
  description: "Post a tweet on Twitter and be verified by Primus",
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Get the latest BTC price and post it on my twitter."
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "The latest tweet has posted.",
          action: "POST_TWEET"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Help post a tweet which content is BTC price."
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Completed!",
          action: "POST_TWEET"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Post a tweet on twitter for me."
        }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "I'll post the latest tweet to your Twitter account now!",
          action: "POST_TWEET"
        }
      }
    ]
  ],
  handler: async (runtime, message, state) => {
    const contentYouWantToPost = await tokenPriceProvider.get(runtime, message, state);
    if (!(process.env.VERIFIABLE_INFERENCE_ENABLED === "true" && process.env.PRIMUS_APP_ID && process.env.PRIMUS_APP_SECRET)) {
      elizaLogger3.error(
        `Parameter 'VERIFIABLE_INFERENCE_ENABLED' not set, Eliza will run this action!`
      );
      return false;
    }
    try {
      if (process.env.TWITTER_DRY_RUN && process.env.TWITTER_DRY_RUN.toLowerCase() === "true") {
        elizaLogger3.info(
          `Dry run: would have posted tweet: ${contentYouWantToPost}`
        );
        return true;
      }
      const scraperWithPrimus = new TwitterScraper();
      await scraperWithPrimus.login();
      if (!await scraperWithPrimus.getScraper().isLoggedIn()) {
        elizaLogger3.error("Failed to login to Twitter");
        return false;
      }
      elizaLogger3.log("Attempting to send tweet:", contentYouWantToPost);
      const result = await scraperWithPrimus.sendTweet(contentYouWantToPost);
      elizaLogger3.log("Tweet response:", result);
      if (!result) {
        elizaLogger3.error(`Twitter API error ${result}`);
        return false;
      }
      return true;
    } catch (error) {
      elizaLogger3.error("Error in post action:", error);
      return false;
    }
  },
  name: "POST_TWEET",
  similes: ["TWEET", "POST", "SEND_TWEET"],
  validate: async (_runtime, _message, _state) => {
    const hasCredentials = !!process.env.TWITTER_USERNAME && !!process.env.TWITTER_PASSWORD;
    elizaLogger3.log(`Has credentials: ${hasCredentials}`);
    return hasCredentials;
  }
};

// src/adapter/primusAdapter.ts
import {
  VerifiableInferenceProvider,
  ModelProviderName,
  models,
  elizaLogger as elizaLogger4
} from "@elizaos/core";
var PrimusAdapter = class {
  options;
  constructor(options) {
    this.options = options;
  }
  async generateText(context, modelClass, options) {
    const provider = this.options.modelProvider || ModelProviderName.OPENAI;
    const baseEndpoint = options?.endpoint || models[provider].endpoint;
    const model = models[provider].model[modelClass];
    const apiKey = this.options.token;
    if (!apiKey) {
      throw new Error(
        `API key (token) is required for provider: ${provider}`
      );
    }
    let endpoint;
    let authHeader;
    let responseParsePath;
    switch (provider) {
      case ModelProviderName.OPENAI:
        endpoint = `${baseEndpoint}/chat/completions`;
        authHeader = `Bearer ${apiKey}`;
        responseParsePath = "$.choices[0].message.content";
        break;
      default:
        throw new Error(`Unsupported model provider: ${provider}`);
    }
    const headers = {
      "Content-Type": "application/json",
      "Authorization": authHeader
    };
    try {
      const body = {
        model: model.name,
        messages: [{ role: "user", content: context }],
        temperature: options?.providerOptions?.temperature || models[provider].model[modelClass].temperature
      };
      const attestation = await generateProof(endpoint, "POST", headers, JSON.stringify(body), responseParsePath);
      elizaLogger4.log("model attestation:", attestation);
      const responseData = JSON.parse(attestation.data);
      const text = JSON.parse(responseData.content);
      return {
        text,
        proof: attestation,
        provider: VerifiableInferenceProvider.PRIMUS,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error("Error in Primus generateText:", error);
      throw error;
    }
  }
  async verifyProof(result) {
    const isValid = verifyProof(result.proof);
    elizaLogger4.log("Proof is valid:", isValid);
    return isValid;
  }
};

// src/index.ts
var twitterPlugin = {
  name: "twitter",
  description: "Twitter integration plugin for posting tweets with proof generated by primus",
  actions: [postTweetAction],
  evaluators: [],
  providers: []
};
var index_default = twitterPlugin;
export {
  PrimusAdapter,
  index_default as default,
  twitterPlugin
};
//# sourceMappingURL=index.js.map