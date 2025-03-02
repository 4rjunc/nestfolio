// src/providers/wallet.ts
import { Actor, HttpAgent } from "@dfinity/agent";
import { Ed25519KeyIdentity } from "@dfinity/identity";
var WalletProvider = class {
  privateKey;
  identity;
  host;
  constructor(privateKey, host = "https://ic0.app") {
    this.privateKey = privateKey;
    this.host = host;
    this.identity = this.createIdentity();
  }
  createIdentity = () => {
    if (!this.privateKey) {
      throw new Error("Private key is required");
    }
    try {
      const privateKeyBytes = Buffer.from(this.privateKey, "hex");
      if (privateKeyBytes.length !== 32) {
        throw new Error("Invalid private key length");
      }
      const arrayBuffer = privateKeyBytes.buffer.slice(
        privateKeyBytes.byteOffset,
        privateKeyBytes.byteOffset + privateKeyBytes.length
      );
      return Ed25519KeyIdentity.fromSecretKey(arrayBuffer);
    } catch {
      throw new Error("Failed to create ICP identity");
    }
  };
  createAgent = async () => {
    return HttpAgent.create({
      identity: this.identity,
      host: this.host
    });
  };
  getIdentity = () => {
    return this.identity;
  };
  getPrincipal = () => {
    return this.identity.getPrincipal();
  };
  createActor = async (idlFactory2, canisterId, fetchRootKey = false) => {
    const agent = await this.createAgent();
    if (fetchRootKey) {
      await agent.fetchRootKey();
    }
    return Actor.createActor(idlFactory2, {
      agent,
      canisterId
    });
  };
};
var icpWalletProvider = {
  async get(runtime, _message, _state) {
    try {
      const privateKey = runtime.getSetting(
        "INTERNET_COMPUTER_PRIVATE_KEY"
      );
      if (!privateKey) {
        throw new Error("INTERNET_COMPUTER_PRIVATE_KEY not found");
      }
      const wallet = new WalletProvider(privateKey);
      return {
        wallet,
        identity: wallet.getIdentity(),
        principal: wallet.getPrincipal().toString(),
        isAuthenticated: true,
        createActor: wallet.createActor
      };
    } catch (error) {
      return {
        wallet: null,
        identity: null,
        principal: null,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
};

// src/actions/createToken.ts
import {
  composeContext,
  generateImage,
  generateText,
  generateObjectDeprecated
} from "@elizaos/core";
import {
  ModelClass
} from "@elizaos/core";

// src/canisters/pick-pump/index.did.ts
var idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({ Ok: IDL.Nat, Err: IDL.Text });
  const CreateMemeTokenArg = IDL.Record({
    twitter: IDL.Opt(IDL.Text),
    logo: IDL.Text,
    name: IDL.Text,
    description: IDL.Text,
    website: IDL.Opt(IDL.Text),
    telegram: IDL.Opt(IDL.Text),
    symbol: IDL.Text
  });
  const MemeToken = IDL.Record({
    id: IDL.Nat64,
    creator: IDL.Text,
    available_token: IDL.Nat,
    twitter: IDL.Opt(IDL.Text),
    volume_24h: IDL.Nat,
    logo: IDL.Text,
    name: IDL.Text,
    liquidity: IDL.Float64,
    description: IDL.Text,
    created_at: IDL.Nat64,
    website: IDL.Opt(IDL.Text),
    last_tx_time: IDL.Nat64,
    canister: IDL.Opt(IDL.Text),
    market_cap_icp: IDL.Nat,
    market_cap_usd: IDL.Float64,
    price: IDL.Float64,
    telegram: IDL.Opt(IDL.Text),
    symbol: IDL.Text
  });
  const Result_1 = IDL.Variant({ Ok: MemeToken, Err: IDL.Text });
  const Transaction = IDL.Record({
    token_amount: IDL.Nat,
    token_id: IDL.Nat64,
    token_symbol: IDL.Text,
    from: IDL.Text,
    timestamp: IDL.Nat64,
    icp_amount: IDL.Nat,
    tx_type: IDL.Text
  });
  const CreateCommentArg = IDL.Record({
    token: IDL.Text,
    content: IDL.Text,
    image: IDL.Opt(IDL.Text)
  });
  const Sort = IDL.Variant({
    CreateTimeDsc: IDL.Null,
    LastTradeDsc: IDL.Null,
    MarketCapDsc: IDL.Null
  });
  const Candle = IDL.Record({
    low: IDL.Float64,
    high: IDL.Float64,
    close: IDL.Float64,
    open: IDL.Float64,
    timestamp: IDL.Nat64
  });
  const Comment = IDL.Record({
    creator: IDL.Text,
    token: IDL.Text,
    content: IDL.Text,
    created_at: IDL.Nat64,
    image: IDL.Opt(IDL.Text)
  });
  const Holder = IDL.Record({ balance: IDL.Nat, owner: IDL.Text });
  const User = IDL.Record({
    principal: IDL.Text,
    name: IDL.Text,
    last_login_seconds: IDL.Nat64,
    register_at_second: IDL.Nat64,
    avatar: IDL.Text
  });
  const MemeTokenView = IDL.Record({
    token: MemeToken,
    balance: IDL.Nat
  });
  const WalletReceiveResult = IDL.Record({ accepted: IDL.Nat64 });
  return IDL.Service({
    buy: IDL.Func([IDL.Nat64, IDL.Float64], [Result], []),
    calculate_buy: IDL.Func([IDL.Nat64, IDL.Float64], [Result], ["query"]),
    calculate_sell: IDL.Func([IDL.Nat64, IDL.Float64], [Result], ["query"]),
    create_token: IDL.Func([CreateMemeTokenArg], [Result_1], []),
    king_of_hill: IDL.Func([], [IDL.Opt(MemeToken)], ["query"]),
    last_txs: IDL.Func([IDL.Nat64], [IDL.Vec(Transaction)], ["query"]),
    post_comment: IDL.Func([CreateCommentArg], [], []),
    query_all_tokens: IDL.Func(
      [IDL.Nat64, IDL.Nat64, IDL.Opt(Sort)],
      [IDL.Vec(MemeToken), IDL.Nat64],
      ["query"]
    ),
    query_token: IDL.Func([IDL.Nat64], [IDL.Opt(MemeToken)], ["query"]),
    query_token_candle: IDL.Func(
      [IDL.Nat64, IDL.Opt(IDL.Nat64)],
      [IDL.Vec(Candle)],
      ["query"]
    ),
    query_token_comments: IDL.Func(
      [IDL.Principal, IDL.Nat64, IDL.Nat64],
      [IDL.Vec(Comment), IDL.Nat64],
      ["query"]
    ),
    query_token_holders: IDL.Func(
      [IDL.Nat64, IDL.Nat64, IDL.Nat64],
      [IDL.Vec(Holder), IDL.Nat64],
      ["query"]
    ),
    query_token_transactions: IDL.Func(
      [IDL.Nat64, IDL.Nat64, IDL.Nat64],
      [IDL.Vec(Transaction), IDL.Nat64],
      ["query"]
    ),
    query_user: IDL.Func([IDL.Opt(IDL.Principal)], [User], ["query"]),
    query_user_launched: IDL.Func(
      [IDL.Opt(IDL.Principal)],
      [IDL.Vec(MemeToken)],
      ["query"]
    ),
    query_user_tokens: IDL.Func(
      [IDL.Opt(IDL.Principal)],
      [IDL.Vec(MemeTokenView)],
      ["query"]
    ),
    sell: IDL.Func([IDL.Nat64, IDL.Float64], [Result], []),
    wallet_balance: IDL.Func([], [IDL.Nat], ["query"]),
    wallet_receive: IDL.Func([], [WalletReceiveResult], [])
  });
};

// src/utils/common/types/options.ts
var unwrapOption = (v) => v.length ? v[0] : void 0;
var wrapOption = (v) => v !== void 0 ? [v] : [];

// src/utils/ic/principals.ts
import { Principal } from "@dfinity/principal";
var isPrincipalText = (text) => {
  if (!text) return false;
  try {
    Principal.fromText(text);
    return true;
  } catch {
    return false;
  }
};

// src/utils/common/data/json.ts
var customStringify = (v) => JSON.stringify(v, (_key, value) => {
  if (typeof value === "bigint") {
    return `${value}`;
  } else if (value && typeof value === "object" && value._isPrincipal === true) {
    return value.toText();
  } else if (value && typeof value === "object" && value.__principal__ && isPrincipalText(value.__principal__)) {
    return value.__principal__;
  }
  return value;
});

// src/utils/common/types/results.ts
var unwrapRustResultMap = (result, transform_ok, transform_err) => {
  if (result.Ok !== void 0) return transform_ok(result.Ok);
  if (result.Err !== void 0) return transform_err(result.Err);
  throw new Error(`wrong rust result: ${customStringify(result)}`);
};

// src/constants/apis.ts
var WEB3_STORAGE_API_HOST = "";

// src/apis/uploadFile.ts
async function uploadFileToWeb3Storage(base64Data, fileName = "image.png") {
  try {
    const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, "");
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/png" });
    const file = new File([blob], fileName, { type: "image/png" });
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(WEB3_STORAGE_API_HOST, {
      method: "POST",
      body: formData
    });
    if (!response.ok) {
      throw new Error(`Upload failed with status: ${response.status}`);
    }
    const result = await response.json();
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "upload failed"
    };
  }
}

// src/actions/prompts/token.ts
var createTokenTemplate = `Based on the user's description, generate creative and memorable values for a new meme token on PickPump:

User's idea: "{{recentMessages}}"

Please generate:
1. A catchy and fun token name that reflects the theme
2. A 3-4 letter symbol based on the name (all caps)
3. An engaging and humorous description (include emojis)
4. Set other fields to null

Example response:
\`\`\`json
{
    "name": "CatLaser",
    "symbol": "PAWS",
    "description": "The first meme token powered by feline laser-chasing energy! Watch your investment zoom around like a red dot! \u{1F63A}\u{1F534}\u2728",
    "logo": null,
    "website": null,
    "twitter": null,
    "telegram": null
}
\`\`\`

Generate appropriate meme token information based on the user's description.
Respond with a JSON markdown block containing only the generated values.`;
var logoPromptTemplate = `Based on this token idea: "{{description}}", create a detailed prompt for generating a logo image.
The prompt should describe visual elements, style, and mood for the logo.
Focus on making it memorable and suitable for a cryptocurrency token.
Keep the response short and specific.
Respond with only the prompt text, no additional formatting.

Example for a dog-themed token:
"A playful cartoon dog face with a cryptocurrency symbol on its collar, using vibrant colors and bold outlines, crypto-themed minimal style"`;

// src/constants/canisters.ts
var CANISTER_IDS = {
  PICK_PUMP: "tl65e-yyaaa-aaaah-aq2pa-cai"
};

// src/actions/createToken.ts
async function createTokenTransaction(creator, tokenInfo) {
  const actor = await creator(idlFactory, CANISTER_IDS.PICK_PUMP);
  const result = await actor.create_token({
    ...tokenInfo,
    name: tokenInfo.name,
    symbol: tokenInfo.symbol,
    description: tokenInfo.description,
    logo: tokenInfo.logo,
    twitter: wrapOption(tokenInfo.twitter),
    website: wrapOption(tokenInfo.website),
    telegram: wrapOption(tokenInfo.telegram)
  });
  return unwrapRustResultMap(
    result,
    (ok) => ({
      ...ok,
      id: ok.id.toString(),
      created_at: ok.created_at.toString(),
      available_token: ok.available_token.toString(),
      volume_24h: ok.volume_24h.toString(),
      last_tx_time: ok.last_tx_time.toString(),
      market_cap_icp: ok.market_cap_icp.toString(),
      twitter: unwrapOption(ok.twitter),
      website: unwrapOption(ok.website),
      telegram: unwrapOption(ok.telegram)
    }),
    (err) => {
      throw new Error(`Token creation failed: ${err}`);
    }
  );
}
async function generateTokenLogo(description, runtime) {
  const logoPrompt = `Create a fun and memorable logo for a cryptocurrency token with these characteristics: ${description}. The logo should be simple, iconic, and suitable for a meme token. Style: minimal, bold colors, crypto-themed.`;
  const result = await generateImage(
    {
      prompt: logoPrompt,
      width: 512,
      height: 512,
      count: 1
    },
    runtime
  );
  if (result.success && result.data && result.data.length > 0) {
    return result.data[0];
  }
  return null;
}
var executeCreateToken = {
  name: "CREATE_TOKEN",
  similes: [
    "CREATE_PICKPUMP_TOKEN",
    "MINT_PICKPUMP",
    "PICKPUMP_TOKEN",
    "PP_TOKEN",
    "PICKPUMP\u53D1\u5E01",
    "PP\u53D1\u5E01",
    "\u5728PICKPUMP\u4E0A\u53D1\u5E01",
    "PICKPUMP\u4EE3\u5E01"
  ],
  description: "Create a new meme token on PickPump platform (Internet Computer). This action helps users create and launch tokens specifically on the PickPump platform.",
  validate: async (_runtime, message) => {
    const keywords = [
      "pickpump",
      "pp",
      "\u76AE\u514B\u5E2E",
      "token",
      "coin",
      "\u4EE3\u5E01",
      "\u5E01",
      "create",
      "mint",
      "launch",
      "deploy",
      "\u521B\u5EFA",
      "\u53D1\u884C",
      "\u94F8\u9020"
    ];
    const messageText = (typeof message.content === "string" ? message.content : message.content.text || "").toLowerCase();
    return keywords.some(
      (keyword) => messageText.includes(keyword.toLowerCase())
    );
  },
  handler: async (runtime, message, state, _options, callback) => {
    callback?.({
      text: "\u{1F504} Creating meme token...",
      action: "CREATE_TOKEN",
      type: "processing"
    });
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    const createTokenContext = composeContext({
      state: currentState,
      template: createTokenTemplate
    });
    const response = await generateObjectDeprecated({
      runtime,
      context: createTokenContext,
      modelClass: ModelClass.LARGE
    });
    const logoPromptContext = composeContext({
      state,
      template: logoPromptTemplate.replace(
        "{{description}}",
        response.description
      )
    });
    const logoPrompt = await generateText({
      runtime,
      context: logoPromptContext,
      modelClass: ModelClass.LARGE
    });
    const logo = await generateTokenLogo(logoPrompt, runtime);
    if (!logo) {
      throw new Error("Failed to generate token logo");
    }
    const logoUploadResult = await uploadFileToWeb3Storage(logo);
    if (!logoUploadResult.urls?.gateway) {
      throw new Error("Failed to upload logo to Web3Storage");
    }
    try {
      const { wallet } = await icpWalletProvider.get(
        runtime,
        message,
        state
      );
      const creator = wallet.createActor;
      const createTokenResult = await createTokenTransaction(creator, {
        name: response.name,
        symbol: response.symbol,
        description: response.description,
        logo: logoUploadResult.urls.gateway
      });
      const responseMsg = {
        text: `\u2728 Created new meme token:
\u{1FA99} ${response.name} (${response.symbol})
\u{1F4DD} ${response.description}`,
        data: createTokenResult,
        action: "CREATE_TOKEN",
        type: "success"
      };
      callback?.(responseMsg);
    } catch (error) {
      const responseMsg = {
        text: `Failed to create token: ${error instanceof Error ? error.message : "Unknown error"}`,
        action: "CREATE_TOKEN",
        type: "error"
      };
      callback?.(responseMsg);
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: "I want to create a space cat token on PickPump"
      },
      {
        user: "{{user2}}",
        content: {
          text: "Creating space cat token on PickPump...",
          action: "CREATE_TOKEN"
        }
      },
      {
        user: "{{user2}}",
        content: {
          text: "\u2728 Token created successfully!"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: "Help me create a pizza-themed funny token on PP"
      },
      {
        user: "{{user2}}",
        content: {
          text: "Creating pizza token on PickPump...",
          action: "CREATE_TOKEN"
        }
      }
    ]
  ]
};

// src/index.ts
var icpPlugin = {
  name: "icp",
  description: "Internet Computer Protocol Plugin for Eliza",
  providers: [icpWalletProvider],
  actions: [executeCreateToken],
  evaluators: []
};
var index_default = icpPlugin;
export {
  index_default as default,
  icpPlugin
};
//# sourceMappingURL=index.js.map