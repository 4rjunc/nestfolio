// src/index.ts
import {
  VerifiableInferenceProvider,
  ModelProviderName,
  models,
  elizaLogger
} from "@elizaos/core";

// src/utils/api.ts
async function verifyProof(baseUrl, _textID, proof) {
  const response = await fetch(`${baseUrl}/api/verify`, {
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(proof),
    method: "POST"
  });
  if (!response.ok) {
    throw new Error(`Failed to verify proof: ${response.statusText}`);
  }
  return await response.json();
}

// src/index.ts
var OpacityAdapter = class {
  options;
  constructor(options) {
    this.options = options;
  }
  async generateText(context, modelClass, options) {
    const provider = this.options.modelProvider || ModelProviderName.OPENAI;
    const baseEndpoint = options?.endpoint || `https://gateway.ai.cloudflare.com/v1/${this.options.teamId}/${this.options.teamName}`;
    const model = models[provider].model[modelClass];
    const apiKey = this.options.token;
    elizaLogger.log("Generating text with options:", {
      modelProvider: provider,
      model: modelClass
    });
    let endpoint;
    let authHeader;
    switch (provider) {
      case ModelProviderName.OPENAI:
        endpoint = `${baseEndpoint}/openai/chat/completions`;
        authHeader = `Bearer ${apiKey}`;
        break;
      default:
        throw new Error(`Unsupported model provider: ${provider}`);
    }
    try {
      let body;
      switch (provider) {
        case ModelProviderName.OPENAI:
          body = {
            model: model.name,
            messages: [
              {
                role: "system",
                content: context
              }
            ],
            temperature: model.temperature || 0.7,
            max_tokens: model.maxOutputTokens,
            frequency_penalty: model.frequency_penalty,
            presence_penalty: model.presence_penalty
          };
          break;
        default:
          throw new Error(`Unsupported model provider: ${provider}`);
      }
      elizaLogger.debug("Request body:", JSON.stringify(body, null, 2));
      const requestBody = JSON.stringify(body);
      const requestHeaders = {
        "Content-Type": "application/json",
        Authorization: authHeader,
        ...options?.headers
      };
      elizaLogger.debug("Making request to Cloudflare with:", {
        endpoint,
        headers: {
          ...requestHeaders,
          Authorization: "[REDACTED]"
        },
        body: requestBody
      });
      try {
        JSON.parse(requestBody);
      } catch {
        elizaLogger.error("Invalid JSON body:", body);
        throw new Error("Failed to create valid JSON request body");
      }
      elizaLogger.debug("Request body:", requestBody);
      const cloudflareResponse = await fetch(endpoint, {
        method: "POST",
        headers: requestHeaders,
        body: requestBody
      });
      if (!cloudflareResponse.ok) {
        const errorText = await cloudflareResponse.text();
        elizaLogger.error("Cloudflare error response:", {
          status: cloudflareResponse.status,
          statusText: cloudflareResponse.statusText,
          error: errorText
        });
        throw new Error(`Cloudflare request failed: ${errorText}`);
      }
      elizaLogger.debug("Cloudflare response:", {
        status: cloudflareResponse.status,
        statusText: cloudflareResponse.statusText,
        headers: cloudflareResponse.headers,
        type: cloudflareResponse.type,
        url: cloudflareResponse.url
      });
      const cloudflareLogId = cloudflareResponse.headers.get("cf-aig-log-id");
      const cloudflareResponseJson = await cloudflareResponse.json();
      const proof = await this.generateProof(
        this.options.opacityProverUrl,
        cloudflareLogId
      );
      elizaLogger.debug(
        "Proof generated for text generation ID:",
        cloudflareLogId
      );
      const text = cloudflareResponseJson.choices[0].message.content;
      const timestamp = Date.now();
      return {
        text,
        id: cloudflareLogId,
        provider: VerifiableInferenceProvider.OPACITY,
        timestamp,
        proof
      };
    } catch (error) {
      console.error("Error in Opacity generateText:", error);
      throw error;
    }
  }
  async generateProof(baseUrl, logId) {
    const response = await fetch(`${baseUrl}/api/logs/${logId}`);
    elizaLogger.debug("Fetching proof for log ID:", logId);
    if (!response.ok) {
      throw new Error(`Failed to fetch proof: ${response.statusText}`);
    }
    return await response.json();
  }
  async verifyProof(result) {
    const isValid = await verifyProof(
      `${this.options.opacityProverUrl}`,
      result.id,
      result.proof
    );
    console.log("Proof is valid:", isValid.success);
    if (!isValid.success) {
      throw new Error("Proof is invalid");
    }
    return isValid.success;
  }
};
var index_default = OpacityAdapter;
export {
  OpacityAdapter,
  index_default as default
};
