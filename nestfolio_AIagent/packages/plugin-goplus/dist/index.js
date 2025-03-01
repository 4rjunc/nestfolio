// src/services/GoplusSecurityService.ts
import { ModelClass, Service, ServiceType, elizaLogger, generateObjectDeprecated, generateText } from "@elizaos/core";

// src/lib/GoPlusManage.ts
var GoPlusType = {
  EVMTOKEN_SECURITY_CHECK: "EVMTOKEN_SECURITY_CHECK",
  SOLTOKEN_SECURITY_CHECK: "SOLTOKEN_SECURITY_CHECK",
  SUITOKEN_SECURITY_CHECK: "SUITOKEN_SECURITY_CHECK",
  RUGPULL_SECURITY_CHECK: "RUGPULL_SECURITY_CHECK",
  NFT_SECURITY_CHECK: "NFT_SECURITY_CHECK",
  ADDRESS_SECURITY_CHECK: "ADDRESS_SECURITY_CHECK",
  APPROVAL_SECURITY_CHECK: "APPROVAL_SECURITY_CHECK",
  ACCOUNT_ERC20_SECURITY_CHECK: "ACCOUNT_ERC20_SECURITY_CHECK",
  ACCOUNT_ERC721_SECURITY_CHECK: "ACCOUNT_ERC721_SECURITY_CHECK",
  ACCOUNT_ERC1155_SECURITY_CHECK: "ACCOUNT_ERC1155_SECURITY_CHECK",
  SIGNATURE_SECURITY_CHECK: "SIGNATURE_SECURITY_CHECK",
  URL_SECURITY_CHECK: "URL_SECURITY_CHECK"
};
var GoPlusManage = class {
  apiKey;
  constructor(apiKey = null) {
    this.apiKey = apiKey;
  }
  async requestGet(api) {
    const myHeaders = new Headers();
    if (this.apiKey) {
      myHeaders.append("Authorization", this.apiKey);
    }
    const url = `https://api.gopluslabs.io/${api}`;
    const res = await fetch(url, {
      method: "GET",
      headers: myHeaders,
      redirect: "follow"
    });
    return await res.json();
  }
  async tokenSecurity(chainId, address) {
    const api = `api/v1/token_security/${chainId}?contract_addresses=${address}`;
    return await this.requestGet(api);
  }
  async rugpullDetection(chainId, address) {
    const api = `api/v1/rugpull_detecting/${chainId}?contract_addresses=${address}`;
    return await this.requestGet(api);
  }
  async solanaTokenSecurityUsingGET(address) {
    const api = `api/v1/solana/token_security?contract_addresses=${address}`;
    return await this.requestGet(api);
  }
  async suiTokenSecurityUsingGET(address) {
    const api = `api/v1/sui/token_security?contract_addresses=${address}`;
    return await this.requestGet(api);
  }
  async nftSecurity(chainId, address) {
    const api = `api/v1/nft_security/${chainId}?contract_addresses=${address}`;
    return await this.requestGet(api);
  }
  async addressSecurity(address) {
    const api = `api/v1/address_security/${address}`;
    return await this.requestGet(api);
  }
  async approvalSecurity(chainId, contract) {
    const api = `api/v1/approval_security/${chainId}?contract_addresses=${contract}`;
    return await this.requestGet(api);
  }
  async erc20ApprovalSecurity(chainId, wallet) {
    const api = `api/v2/token_approval_security/${chainId}?addresses=${wallet}`;
    return await this.requestGet(api);
  }
  async erc721ApprovalSecurity(chainId, wallet) {
    const api = `api/v2/nft721_approval_security/${chainId}?addresses=${wallet}`;
    return await this.requestGet(api);
  }
  async erc1155ApprovalSecurity(chainId, wallet) {
    const api = `api/v2/nft1155_approval_security/${chainId}?addresses=${wallet}`;
    return await this.requestGet(api);
  }
  async inputDecode(chainId, data) {
    const body = JSON.stringify({
      chain_id: chainId,
      data
    });
    const res = await fetch("https://api.gopluslabs.io/api/v1/abi/input_decode", {
      "headers": {
        "accept": "*/*",
        "accept-language": "en,zh-CN;q=0.9,zh;q=0.8",
        "content-type": "application/json"
      },
      "body": body,
      "method": "POST"
    });
    return await res.json();
  }
  async dappSecurityAndPhishingSite(url) {
    const api = `api/v1/dapp_security?url=${url}`;
    const data1 = await this.requestGet(api);
    const api2 = `api/v1/phishing_site?url=${url}`;
    const data2 = await this.requestGet(api2);
    return {
      data1,
      data2
    };
  }
};

// src/templates/index.ts
var requestPrompt = (text) => `You are a security action detector for blockchain interactions. Your task is to analyze the user's input text and determine which security checks are needed.

Text to analyze:"""
${text}
"""
If the user is not sure which network the sent address belongs to, then according to the following logic initially determine which network the user sends the address belongs to.

Detection Logic:
1. First check if address starts with "0x":
   - If yes:
     - If length is 42 -> EVM address
     - If the address has a non-standard suffix (e.g., " ::s::S "), you may treat the base address (without the suffix) as the -> SUI address. , but the full address including the suffix should be placed in the "token" field.
   - If no:
     - If length is 44 and starts with letter -> Solana address

2. If none of the above patterns match:
   - -> EVM address
3. If detection is EVM address:
   - -> EVM address

Networks format
EVM: 0x26e550ac11b26f78a04489d5f20f24e3559f7dd9
Solana: 9DHe3pycTuymFk4H4bbPoAJ4hQrr2kaLDF6J6aAKpump
SUI: 0xea65bb5a79ff34ca83e2995f9ff6edd0887b08da9b45bf2e31f930d3efb82866::s::S

After determining which action to use, please reply in the json format below the action.

Available actions:
- [EVMTOKEN_SECURITY_CHECK]: For checking ERC20 token contract security
    Description: Security assessment for tokens on EVM-compatible chains (like Ethereum, BSC), including contract risks, permission configurations, transaction mechanisms
    Keywords: EVM token, ETH token, BEP20, smart contract, ERC20 security, on-chain token
    Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
"type": "EVMTOKEN_SECURITY_CHECK"
"network": "1", //default: 1 (Ethereum:1, Optimism:10, Cronos:25, BSC:56, Gnosis:100, HECO:128, Polygon:137, Fantom:250, KCC:321, zkSync Era:324, ETHW:10001, FON:201022, Arbitrum:42161, Avalanche:43114, Linea Mainnet:59144, Base:8453, Tron:tron, Scroll:534352, opBNB:204, Mantle:5000, ZKFair:42766, Blast:81457, Manta Pacific:169, Berachain Artio Testnet:80085, Merlin:4200, Bitlayer Mainnet:200901, zkLink Nova:810180, X Layer Mainnet:196)
"token": "" ,
}
\`\`\`


- [SOLTOKEN_SECURITY_CHECK]: For checking SPL token contract security
    Description: Security audit for Solana-based tokens, analyzing program authority settings, account states, transfer restrictions and other security factors
    Keywords: Solana token, SOL token, SPL token, Solana security, SOL contract
    Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
"type": "SOLTOKEN_SECURITY_CHECK"
"token": "" ,
}
\`\`\`


- [SUITOKEN_SECURITY_CHECK]: For checking Sui token contract security
    Description: Security inspection for tokens on SUI blockchain, examining token contract permissions, transaction restrictions, minting mechanisms and other security configurations
    Keywords: SUI token, SUI coins, MOVE token, SUI contract, SUI security
    Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
"type": "SUITOKEN_SECURITY_CHECK"
"token": "" ,
}
\`\`\`


- [RUGPULL_SECURITY_CHECK]:
    Description: Detection of potential rugpull risks in tokens/projects, including contract permissions, liquidity locks, team holdings and other risk factors
    Keywords: rugpull risk, token security, project reliability, contract risk, liquidity, team wallet
    Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
"type": "RUGPULL_SECURITY_CHECK"
"network": "1", //default: 1 (Ethereum:1, BSC:56)
"contract": "" | null,
}
\`\`\`


- [NFT_SECURITY_CHECK]
    Description: Security analysis of NFT project smart contracts, including minting mechanisms, trading restrictions, permission settings
    Keywords: NFT security, digital collectibles, minting risk, NFT trading, NFT contract
    Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
"type": "NFT_SECURITY_CHECK"
"network": "1", //default: 1 (Ethereum:1, Optimism:10, Cronos:25, BSC:56, Gnosis:100, HECO:128, Polygon:137, Fantom:250, KCC:321, zkSync Era:324, FON:201022, Arbitrum:42161, Avalanche:43114, Linea Mainnet:59144, Base:8453, Mantle:5000)
"token": "" | null,
}
\`\`\`


- [ADDRESS_SECURITY_CHECK]
    Description: Analysis of specific address security status, detecting known malicious addresses, scam addresses or high-risk addresses
    Keywords: wallet security, malicious address, scam address, blacklist
    Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
"type": "ADDRESS_SECURITY_CHECK",
"network": "1", //default: 1 (Ethereum:1, Optimism:10, Cronos:25, BSC:56, Gnosis:100, HECO:128, Polygon:137, Fantom:250, KCC:321, zkSync Era:324, FON:201022, Arbitrum:42161, Avalanche:43114, Linea Mainnet:59144, Tron:tron, Scroll:534352, opBNB:204, Base:8453, Solana:solana)
"wallet": "" | null,
}
\`\`\`


- [APPROVAL_SECURITY_CHECK]
    Description: Examination of smart contract approval settings, evaluating risk levels of third-party authorizations
    Keywords: approval check, contract authorization, spending approval, approval risk
    Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
"type": "APPROVAL_SECURITY_CHECK"
"network": "1", //default: 1 (Ethereum:1, BSC: 56, OKC: 66, Heco: 128, Polygon: 137, Fantom:250, Arbitrum: 42161, Avalanche: 43114)
"contract": "" | null,
}
\`\`\`


- [ACCOUNT_ERC20_SECURITY_CHECK]
    Description: Security assessment of account-related ERC20 token transactions and holdings
    Keywords: ERC20, token account, token security, account detection
    Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
"type": "ACCOUNT_ERC20_SECURITY_CHECK"
"network": "1", //default: 1 (Ethereum:1, Optimism:10, Cronos:25, BSC:56, Gnosis:100, HECO:128, Polygon:137, Fantom:250, KCC:321, zkSync Era:324, FON:201022, Arbitrum:42161, Avalanche:43114, Linea Mainnet:59144, Base:8453, Mantle:5000)
"wallet": "" | null,
}
\`\`\`


- [ACCOUNT_ERC721_SECURITY_CHECK]
    Description: Security analysis of account's ERC721 NFT assets
    Keywords: ERC721, NFT account, NFT assets, collectibles security
    Respond with a JSON markdown block containing only the extracted values:
\`\`\`json
{
"type": "ACCOUNT_ERC721_SECURITY_CHECK"
"network": "1", //default: 1 (Ethereum:1, Optimism:10, Cronos:25, BSC:56, Gnosis:100, HECO:128, Polygon:137, Fantom:250, KCC:321, zkSync Era:324, FON:201022, Arbitrum:42161, Avalanche:43114, Linea Mainnet:59144, Base:8453, Mantle:5000)
"wallet": "" | null,
}
\`\`\`


- [ACCOUNT_ERC1155_SECURITY_CHECK]
    Description: Security evaluation of account's ERC1155 multi-token standard assets
    Keywords: ERC1155, multi-token, hybrid assets, account security
    Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
"type": "ACCOUNT_ERC1155_SECURITY_CHECK"
"network": "1", //default: 1 (Ethereum:1, Optimism:10, Cronos:25, BSC:56, Gnosis:100, HECO:128, Polygon:137, Fantom:250, KCC:321, zkSync Era:324, FON:201022, Arbitrum:42161, Avalanche:43114, Linea Mainnet:59144, Base:8453, Mantle:5000)
"wallet": "" | null,
}
\`\`\`


- [SIGNATURE_SECURITY_CHECK]
    Description: Verification of signature security, preventing signature fraud risks
    Keywords: signature verification, message signing, signature risk, signature fraud
    Respond with a JSON markdown block containing only the extracted values:

\`\`\`json
{
"type": "SIGNATURE_SECURITY_CHECK"
"network": "1", //default: 1 (Ethereum: 1, Cronos:25, BSC: 56, Heco: 128, Polygon: 137, Fantom:250, KCC: 321, Arbitrum: 42161, Avalanche: 43114)
"data": "" | null,
}
\`\`\`


- [URL_SECURITY_CHECK]
    Description: Detection of known phishing websites, malicious sites or other security risks in URLs
    Keywords: link detection, phishing website, malicious URL, website security
    Respond with a JSON markdown block containing only the extracted values:
\`\`\`json
{
"type": "URL_SECURITY_CHECK"
"url": "" | null,
}
\`\`\`

Extract the necessary information(All fields present in the json are important information) and choose the appropriate action(s) based on the text. Return the JSON response following the format above.
important: do not response anything except json`;
var responsePrompt = (apiresult, text) => `You are a security action detector for blockchain interactions. Your task is to analyze the security API\u2019s response from GoPlus and summary the API result.
API to analyze:\u201C\u201D"
${apiresult}
\u201C\u201D"
user\u2019s request:\u201C\u201D
${text}
\u201C\u201D
Instructions:
1. **Identify the Action**: Analyze the API response to determine which specific action it relates to.
2. **Extract Relevant Information**: From the action and its parameters, extract and highlight the key details.
3. **Formulate a Clear Response**: Combine the action type, extracted information, and an analysis of the results. Provide a clear, concise response based on the security context. Focus on delivering the most relevant answer without unnecessary detail.
- Only reply with your conclusion.
- Do not discuss the safety aspects of the action; just focus on identifying and pointing out any risks.
- Tailor your response to the user\u2019s request, focusing on their specific query.`;

// src/services/GoplusSecurityService.ts
var GoplusSecurityService = class extends Service {
  apiKey;
  runtime;
  getInstance() {
    return this;
  }
  static get serviceType() {
    return ServiceType.GOPLUS_SECURITY;
  }
  initialize(runtime) {
    this.runtime = runtime;
    this.apiKey = runtime.getSetting("GOPLUS_API_KEY");
    return;
  }
  /**
   * Connect to WebSocket and send a message
   */
  async check(text) {
    try {
      elizaLogger.log("check input text", text);
      const obj = await generateObjectDeprecated({
        runtime: this.runtime,
        context: requestPrompt(text),
        modelClass: ModelClass.SMALL
        // gpt-4o-mini
      });
      elizaLogger.log("check generateObjectDeprecated text", obj);
      const goPlusManage = new GoPlusManage(this.apiKey);
      let checkResult;
      switch (obj.type) {
        case GoPlusType.EVMTOKEN_SECURITY_CHECK:
          checkResult = await goPlusManage.tokenSecurity(obj.network, obj.token);
          break;
        case GoPlusType.SOLTOKEN_SECURITY_CHECK:
          checkResult = await goPlusManage.solanaTokenSecurityUsingGET(obj.token);
          break;
        case GoPlusType.SUITOKEN_SECURITY_CHECK:
          checkResult = await goPlusManage.suiTokenSecurityUsingGET(obj.token);
          break;
        case GoPlusType.RUGPULL_SECURITY_CHECK:
          checkResult = await goPlusManage.rugpullDetection(obj.network, obj.contract);
          break;
        case GoPlusType.NFT_SECURITY_CHECK:
          checkResult = await goPlusManage.nftSecurity(obj.network, obj.token);
          break;
        case GoPlusType.ADDRESS_SECURITY_CHECK:
          checkResult = await goPlusManage.addressSecurity(obj.wallet);
          break;
        case GoPlusType.APPROVAL_SECURITY_CHECK:
          checkResult = await goPlusManage.approvalSecurity(obj.network, obj.contract);
          break;
        case GoPlusType.ACCOUNT_ERC20_SECURITY_CHECK:
          checkResult = await goPlusManage.erc20ApprovalSecurity(obj.network, obj.wallet);
          break;
        case GoPlusType.ACCOUNT_ERC721_SECURITY_CHECK:
          checkResult = await goPlusManage.erc721ApprovalSecurity(obj.network, obj.wallet);
          break;
        case GoPlusType.ACCOUNT_ERC1155_SECURITY_CHECK:
          checkResult = await goPlusManage.erc1155ApprovalSecurity(obj.network, obj.wallet);
          break;
        case GoPlusType.SIGNATURE_SECURITY_CHECK:
          checkResult = await goPlusManage.inputDecode(obj.network, obj.data);
          break;
        case GoPlusType.URL_SECURITY_CHECK:
          checkResult = await goPlusManage.dappSecurityAndPhishingSite(obj.url);
          break;
        default:
          throw new Error("type is invalid");
      }
      elizaLogger.log("checkResult text", checkResult);
      const checkResponse = await generateText({
        runtime: this.runtime,
        context: responsePrompt(JSON.stringify(checkResult), text),
        modelClass: ModelClass.SMALL
      });
      elizaLogger.log("checkResponse text", checkResponse);
      return checkResponse;
    } catch (e) {
      elizaLogger.error(e);
      return "error";
    }
  }
};
var GoplusSecurityService_default = GoplusSecurityService;

// src/index.ts
var goplusPlugin = {
  name: "goplus",
  description: "goplus Plugin for Eliza - Enables on-chain security checks",
  actions: [],
  evaluators: [],
  providers: [],
  services: [new GoplusSecurityService_default()]
};
var index_default = goplusPlugin;
export {
  GoplusSecurityService,
  index_default as default,
  goplusPlugin
};
//# sourceMappingURL=index.js.map