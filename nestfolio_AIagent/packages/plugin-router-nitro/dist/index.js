// src/actions/executeSwap.ts
import {
  composeContext,
  elizaLogger,
  generateObjectDeprecated,
  ModelClass
} from "@elizaos/core";

// src/actions/swapTemplate.ts
var swapTemplate = `Using the provided context and wallet information:

{{recentMessages}}

Extract the following details for the cross-chain swap request:
- **From Token**: The symbol of the token to swap from.
- **To Token**: The symbol of the token to swap into (default: same as "From Token").
- **Source Chain**: The chain to swap from.
- **Destination Chain**: The chain to swap into (default: same as "Source Chain").
- **Amount**: The amount to swap, in the "From Token."
- **Destination Address**: The address to send the swapped token to (if specified ).
If the destination address is not specified, the ROUTER NITRO EVM address of the runtime should be used.

If a value is not explicitly provided, use the default specified above.

Respond with a JSON object containing only the extracted information:

\\\`json
{
    "fromToken": string | null,
    "toToken": string | null,
    "fromChain": string | null,
    "toChain": string | null,
    "amount": string | null,
    "toAddress": string | null
}
\\\`
`;

// src/actions/utils.ts
import axios from "axios";
var ChainUtils = class {
  chainData = [];
  chainNameMappings = {
    "arbitrum": ["arbitrum", "arbitrum one", "arb", "arbitrum mainnet"],
    "ethereum": ["ethereum", "eth", "ethereum mainnet", "ether"],
    "polygon": ["polygon", "matic", "polygon mainnet", "polygon pos"],
    "avalanche": ["avalanche", "avax", "avalanche c-chain", "avalanche mainnet"],
    "binance": ["binance", "bsc", "bnb", "bnb smart chain", "bnb smart chain mainnet"],
    "optimism": ["optimism", "op", "op mainnet"],
    "base": ["base", "base mainnet"],
    "zksync": ["zksync", "zksync era", "zksync mainnet"],
    "manta": ["manta", "manta pacific", "manta pacific mainnet"],
    "mantle": ["mantle", "mantle mainnet"],
    "linea": ["linea", "linea mainnet"],
    "scroll": ["scroll", "scroll mainnet"],
    "mode": ["mode", "mode mainnet"],
    "blast": ["blast", "blast mainnet"],
    "polygon-zkevm": ["polygon zkevm", "polygon zkvm", "zkevm"],
    "boba": ["boba", "boba network"],
    "metis": ["metis", "metis andromeda", "metis mainnet"],
    "aurora": ["aurora", "aurora mainnet"],
    "taiko": ["taiko", "taiko mainnet"],
    "rootstock": ["rootstock", "rsk", "rootstock mainnet"],
    "dogechain": ["dogechain", "dogechain mainnet"],
    "oasis-sapphire": ["oasis sapphire", "sapphire"],
    "xlayer": ["x layer", "xlayer mainnet"],
    "rollux": ["rollux", "rollux mainnet"],
    "5ire": ["5ire", "5irechain", "5irechain mainnet"],
    "kyoto": ["kyoto", "kyoto mainnet"],
    "vanar": ["vanar", "vanar mainnet"],
    "saakuru": ["saakuru", "saakuru mainnet"],
    "redbelly": ["redbelly", "redbelly mainnet"],
    "shido": ["shido", "shido mainnet"],
    "nero": ["nero", "nero mainnet"],
    "soneium": ["soneium", "soneium mainnet"],
    "hyperliquid": ["hyperliquid", "hyperliquid mainnet"],
    "arthera": ["arthera", "arthera mainnet"]
  };
  constructor(apiResponse) {
    this.chainData = apiResponse.data;
  }
  normalizeChainName(input) {
    const normalized = input.toLowerCase().trim();
    for (const [standardName, aliases] of Object.entries(this.chainNameMappings)) {
      if (aliases.includes(normalized)) {
        const chainMatch = this.chainData.find(
          (chain) => aliases.includes(chain.name.toLowerCase()) || chain.name.toLowerCase().includes(standardName)
          // Match standard name
        );
        if (chainMatch) {
          return chainMatch.name;
        }
      }
    }
    const partialMatch = this.chainData.find(
      (chain) => chain.name.toLowerCase().includes(normalized) || normalized.includes(chain.name.toLowerCase())
    );
    if (partialMatch) {
      return partialMatch.name;
    }
    return input;
  }
  getChainId(chainName) {
    if (!chainName) return null;
    const normalizedName = this.normalizeChainName(chainName);
    const chain = this.chainData.find(
      (c) => c.name.toLowerCase() === normalizedName.toLowerCase()
    );
    return chain ? chain.chainId : null;
  }
  getChainType(chainName) {
    if (!chainName) return null;
    const normalizedName = this.normalizeChainName(chainName);
    const chain = this.chainData.find(
      (c) => c.name.toLowerCase() === normalizedName.toLowerCase()
    );
    return chain ? chain.type : null;
  }
  isChainLive(chainName) {
    if (!chainName) return false;
    const normalizedName = this.normalizeChainName(chainName);
    const chain = this.chainData.find(
      (c) => c.name.toLowerCase() === normalizedName.toLowerCase()
    );
    return chain ? chain.isLive : false;
  }
  getGasToken(chainName) {
    if (!chainName) return null;
    const normalizedName = this.normalizeChainName(chainName);
    const chain = this.chainData.find(
      (c) => c.name.toLowerCase() === normalizedName.toLowerCase()
    );
    return chain?.gasToken || null;
  }
  validateChain(chainName) {
    if (!chainName) {
      return {
        isValid: false,
        chainId: null,
        isLive: false,
        type: null,
        normalizedName: "",
        message: "Chain name is required"
      };
    }
    const normalizedName = this.normalizeChainName(chainName);
    const chainId = this.getChainId(normalizedName);
    const isLive = this.isChainLive(normalizedName);
    const type = this.getChainType(normalizedName);
    const isValid = chainId !== null;
    return {
      isValid,
      chainId,
      isLive,
      type,
      normalizedName,
      message: isValid ? void 0 : `Invalid chain name: ${chainName}`
    };
  }
  processChainSwap(fromChain, toChain) {
    const sourceChain = this.validateChain(fromChain);
    const destChain = this.validateChain(toChain);
    if (!sourceChain.isValid) {
      throw new Error(`Invalid source chain: ${fromChain}`);
    }
    if (!destChain.isValid) {
      throw new Error(`Invalid destination chain: ${toChain}`);
    }
    if (!sourceChain.isLive) {
      throw new Error(`Source chain ${sourceChain.normalizedName} is not currently active`);
    }
    if (!destChain.isLive) {
      throw new Error(`Destination chain ${destChain.normalizedName} is not currently active`);
    }
    return {
      fromChainId: sourceChain.chainId,
      toChainId: destChain.chainId
    };
  }
};
async function fetchChains() {
  const url = "https://api.nitroswap.routernitro.com/chain?page=0&limit=10000";
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error("Error fetching chains:", error);
    throw new Error("Failed to fetch chains.");
  }
}
var tokenCache = {};
async function fetchTokenConfig(chainId, token) {
  const cacheKey = `${chainId}-${token.toLowerCase()}`;
  if (tokenCache[cacheKey]) {
    console.log(`Cache hit for ${cacheKey}`);
    return tokenCache[cacheKey];
  }
  const tokenCases = [token.toLowerCase(), token.toUpperCase()];
  for (const tokenSymbol of tokenCases) {
    const url = `https://api.nitroswap.routernitro.com/token?&chainId=${chainId}&symbol=${tokenSymbol}`;
    try {
      const response = await axios.get(url);
      const tokenData = response.data?.data?.[0];
      if (tokenData) {
        tokenCache[cacheKey] = {
          address: tokenData.address,
          name: tokenData.name,
          decimals: tokenData.decimals,
          chainId: tokenData.chainId
        };
        return tokenCache[cacheKey];
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      console.warn(`Error with token symbol "${tokenSymbol}": ${errorMessage}`);
    }
  }
  throw new Error(`Failed to fetch token config for "${token}" on chainId "${chainId}"`);
}
async function fetchPathfinderQuote(params) {
  const { fromTokenAddress, toTokenAddress, amount, fromTokenChainId, toTokenChainId, partnerId } = params;
  const pathfinderUrl = `https://api-beta.pathfinder.routerprotocol.com/api/v2/quote?fromTokenAddress=${fromTokenAddress}&toTokenAddress=${toTokenAddress}&amount=${amount}&fromTokenChainId=${fromTokenChainId}&toTokenChainId=${toTokenChainId}&partnerId=${partnerId}`;
  try {
    const response = await axios.get(pathfinderUrl);
    return response.data;
  } catch (error) {
    console.error("Error fetching Pathfinder quote:", error instanceof Error ? error.message : String(error));
    throw new Error(`Pathfinder API call failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// src/environment.ts
import { z } from "zod";
var routerNitroEnvSchema = z.object({
  ROUTER_NITRO_EVM_ADDRESS: z.string().min(1, "Address is required for interacting with Router Nitro"),
  ROUTER_NITRO_EVM_PRIVATE_KEY: z.string().min(1, "Private key is required for interacting with Router Nitro")
});
async function validateRouterNitroConfig(runtime) {
  try {
    const config = {
      ROUTER_NITRO_EVM_ADDRESS: runtime.getSetting("ROUTER_NITRO_EVM_ADDRESS") || process.env.ROUTER_NITRO_EVM_ADDRESS,
      ROUTER_NITRO_EVM_PRIVATE_KEY: runtime.getSetting("ROUTER_NITRO_EVM_PRIVATE_KEY") || process.env.ROUTER_NITRO_EVM_PRIVATE_KEY
    };
    return routerNitroEnvSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("\n");
      throw new Error(
        `Router Nitro configuration validation failed:
${errorMessages}`
      );
    }
    throw error;
  }
}

// src/actions/txns.ts
import axios2 from "axios";
import { ethers } from "ethers";
import { erc20Abi } from "viem";
var checkUserBalance = async (wallet, tokenAddress, _decimals) => {
  try {
    if (!wallet.provider) {
      throw new Error("Wallet must be connected to a provider.");
    }
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, wallet.provider);
    const address = await wallet.getAddress();
    const balance = await tokenContract.balanceOf(address);
    return balance.toString();
  } catch (_error) {
    throw new Error("Unable to fetch balance");
  }
};
var checkNativeTokenBalance = async (wallet, _decimals) => {
  try {
    if (!wallet.provider) {
      throw new Error("Wallet must be connected to a provider.");
    }
    const address = await wallet.getAddress();
    const balance = await wallet.provider.getBalance(address);
    return balance.toString();
  } catch (_error) {
    throw new Error("Unable to fetch native token balance");
  }
};
var checkAndSetAllowance = async (wallet, tokenAddress, approvalAddress, amount) => {
  if (tokenAddress === ethers.ZeroAddress || tokenAddress.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
    console.log("Native token detected; no approval needed.");
    return;
  }
  console.log(`Checking allowance for token ${tokenAddress} and approval address ${approvalAddress}`);
  const erc20ReadOnly = new ethers.Contract(tokenAddress, erc20Abi, wallet.provider);
  const walletAddress = await wallet.getAddress();
  try {
    const allowance = await erc20ReadOnly.allowance(walletAddress, approvalAddress);
    console.log("Current allowance:", allowance.toString());
    if (allowance < amount) {
      const erc20WithSigner = new ethers.Contract(tokenAddress, erc20Abi, wallet);
      const approveTx = await erc20WithSigner.approve(approvalAddress, amount);
      console.log(`Approve transaction sent: ${approveTx.hash}`);
      await approveTx.wait();
      console.log(`Approved successfully: ${approveTx.hash}`);
    } else {
      console.log("Sufficient allowance already set.");
    }
  } catch (error) {
    console.error("Error during allowance check or approval:", error);
  }
};
var getSwapTransaction = async (quoteData, senderAddress, receiverAddress) => {
  const txDataUrl = "https://api-beta.pathfinder.routerprotocol.com/api/v2/transaction";
  const requestData = {
    ...quoteData,
    senderAddress,
    receiverAddress
  };
  const config = {
    method: "post",
    maxBodyLength: Number.POSITIVE_INFINITY,
    url: txDataUrl,
    headers: {
      "content-type": "application/json"
    },
    data: requestData
  };
  try {
    const res = await axios2.request(config);
    return res.data;
  } catch (e) {
    console.error(`Fetching tx data from pathfinder: ${e}`);
  }
};

// src/actions/executeSwap.ts
import { ethers as ethers2 } from "ethers";

// src/actions/chains.ts
import * as viemChains from "viem/chains";
var chains = Object.values(viemChains).reduce((acc, chain) => {
  if (chain && typeof chain === "object" && "id" in chain) {
    acc[chain.id] = chain;
  }
  return acc;
}, {});
var getRpcUrlFromChainId = (chainId) => {
  const chain = chains[chainId];
  if (!chain) {
    throw new Error(`Chain ID ${chainId} not found`);
  }
  return chain.rpcUrls.default.http[0];
};
var getBlockExplorerFromChainId = (chainId) => {
  const chain = chains[chainId];
  if (!chain) {
    throw new Error(`Chain ID ${chainId} not found`);
  }
  if (!chain.blockExplorers || !chain.blockExplorers.default) {
    throw new Error(`Block explorer not found for Chain ID ${chainId}`);
  }
  return {
    url: chain.blockExplorers.default.url
  };
};

// src/actions/executeSwap.ts
var validateAddress = (address) => typeof address === "string" && address.startsWith("0x") && address.length === 42;
var initializeWallet = async (runtime, rpc) => {
  const privateKey = runtime.getSetting("ROUTER_NITRO_EVM_PRIVATE_KEY");
  if (!privateKey) {
    throw new Error("Private key is missing. Please set ROUTER_NITRO_EVM_PRIVATE_KEY in the environment settings.");
  }
  const provider = new ethers2.JsonRpcProvider(rpc);
  return new ethers2.Wallet(privateKey, provider);
};
var checkBalances = async (wallet, tokenConfig, amountIn) => {
  const isNativeToken = tokenConfig.address.toLowerCase() === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";
  if (isNativeToken) {
    const nativeBalance = await checkNativeTokenBalance(wallet, tokenConfig.decimals);
    if (BigInt(nativeBalance) < amountIn) {
      throw new Error("Insufficient native token balance");
    }
  }
  const tokenBalance = await checkUserBalance(wallet, tokenConfig.address, tokenConfig.decimals);
  if (BigInt(tokenBalance) < amountIn) {
    throw new Error("Insufficient token balance");
  }
};
var handleTransaction = async (wallet, txResponse, blockExplorer, callback) => {
  const tx = await wallet.sendTransaction(txResponse.txn);
  const receipt = await tx.wait();
  if (!receipt?.status) {
    throw new Error("Transaction failed");
  }
  const txExplorerUrl = blockExplorer ? `${blockExplorer}/tx/${tx.hash}` : tx.hash;
  const successMessage = `Swap completed successfully! Txn: ${txExplorerUrl}`;
  callback?.({ text: successMessage });
  return true;
};
var executeSwapAction = {
  name: "ROUTER_NITRO_SWAP",
  description: "Swaps tokens across chains from the agent's wallet to a recipient wallet.",
  handler: async (runtime, message, state, _options = {}, callback) => {
    elizaLogger.log("Starting ROUTER_NITRO_SWAP handler...");
    try {
      const updatedState = state ? await runtime.updateRecentMessageState(state) : await runtime.composeState(message);
      const swapContext = composeContext({ state: updatedState, template: swapTemplate });
      const content = await generateObjectDeprecated({
        runtime,
        context: swapContext,
        modelClass: ModelClass.LARGE
      });
      if (!validateAddress(content.toAddress)) {
        content.toAddress = runtime.getSetting("ROUTER_NITRO_EVM_ADDRESS");
      }
      const chainUtils = new ChainUtils(await fetchChains());
      const swapDetails = chainUtils.processChainSwap(content.fromChain, content.toChain);
      if (!swapDetails.fromChainId || !swapDetails.toChainId) {
        throw new Error("Invalid chain data details");
      }
      const rpc = getRpcUrlFromChainId(swapDetails.fromChainId);
      const wallet = await initializeWallet(runtime, rpc);
      const address = await wallet.getAddress();
      const [fromTokenConfig, toTokenConfig] = await Promise.all([
        fetchTokenConfig(Number(swapDetails.fromChainId), content.fromToken),
        fetchTokenConfig(Number(swapDetails.toChainId), content.toToken)
      ]);
      const amountIn = BigInt(Math.floor(Number(content.amount) * 10 ** fromTokenConfig.decimals));
      await checkBalances(wallet, fromTokenConfig, amountIn);
      const pathfinderResponse = await fetchPathfinderQuote({
        fromTokenAddress: fromTokenConfig.address,
        toTokenAddress: toTokenConfig.address,
        amount: amountIn.toString(),
        fromTokenChainId: Number(swapDetails.fromChainId),
        toTokenChainId: Number(swapDetails.toChainId),
        partnerId: 127
      });
      if (pathfinderResponse) {
        await checkAndSetAllowance(
          wallet,
          fromTokenConfig.address,
          pathfinderResponse.allowanceTo,
          amountIn
        );
        const txResponse = await getSwapTransaction(pathfinderResponse, address, content.toAddress);
        const blockExplorer = getBlockExplorerFromChainId(swapDetails.fromChainId).url;
        return await handleTransaction(wallet, txResponse, blockExplorer, callback);
      }
      return false;
    } catch (error) {
      elizaLogger.log(`Error during executing swap: ${error.message}`);
      callback?.({ text: `Error during swap: ${error.message}` });
      return false;
    }
  },
  template: swapTemplate,
  validate: async (runtime) => {
    await validateRouterNitroConfig(runtime);
    return true;
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Bridge 1 ETH from Ethereum to Base on address 0xCCa8009f5e09F8C5dB63cb0031052F9CB635Af62"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Sure, I'll send 1 ETH from Ethereum to Base",
          action: "ROUTER_NITRO_SWAP"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Successfully sent 1 ETH to 0xCCa8009f5e09F8C5dB63cb0031052F9CB635Af62 on Base\nTransaction: 0x4fed598033f0added272c3ddefd4d83a521634a738474400b27378db462a76ec"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Please swap 1 ETH into USDC from Avalanche to Base on address 0xF43042865f4D3B32A19ECBD1C7d4d924613c41E8"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Sure, I'll swap 1 ETH into USDC from Solana to Base on address 0xF43042865f4D3B32A19ECBD1C7d4d924613c41E8",
          action: "ROUTER_NITRO_SWAP"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Successfully Swapped 1 ETH into USDC and sent to 0xF43042865f4D3B32A19ECBD1C7d4d924613c41E8 on Base\nTransaction: 2sj3ifA5iPdRDfnkyK5LZ4KoyN57AH2QoHFSzuefom11F1rgdiUriYf2CodBbq9LBi77Q5bLHz4CShveisTu954B"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Send 100 UNI from Arbitrum to Ethereum on 0xCCa8009f5e09F8C5dB63cb0031052F9CB635Af62 "
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Sure, I'll send 100 UNI to Ethereum right away.",
          action: "ROUTER_NITRO_SWAP"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Successfully sent 100 UNI to 0xCCa8009f5e09F8C5dB63cb0031052F9CB635Af62 on Ethereum\nTransaction: 0x4fed598033f0added272c3ddefd4d83a521634a738474400b27378db462a76ec"
        }
      }
    ],
    [
      {
        "user": "{{user1}}",
        "content": {
          "text": "Transfer 50 AAVE from Polygon to Optimism on address 0x5C7EDE23cFeBB3A2F60d2D51901A53a276e8F001"
        }
      },
      {
        "user": "{{agent}}",
        "content": {
          "text": "Sure, I'll transfer 50 AAVE from Polygon to Optimism",
          "action": "ROUTER_NITRO_SWAP"
        }
      },
      {
        "user": "{{agent}}",
        "content": {
          "text": "Successfully transferred 50 AAVE to 0x5C7EDE23cFeBB3A2F60d2D51901A53a276e8F001 on Optimism\nTransaction: 0x720b46c95f7f819f5d7e1e8df6fd7d8be12b8d06312bb9d96ea85a45fc65079a"
        }
      }
    ],
    [
      {
        "user": "{{user1}}",
        "content": {
          "text": "Send 1000 USDT from Ethereum to Arbitrum on address 0x456dC2FfE61d8F92A29b9Bd6b32730d345e0638c"
        }
      },
      {
        "user": "{{agent}}",
        "content": {
          "text": "Sure, I'll send 1000 USDT from Ethereum to Arbitrum",
          "action": "ROUTER_NITRO_SWAP"
        }
      },
      {
        "user": "{{agent}}",
        "content": {
          "text": "Successfully sent 1000 USDT to 0x456dC2FfE61d8F92A29b9Bd6b32730d345e0638c on Arbitrum\nTransaction: 0x3c72a5fe4d0278f2b46dbe765a5f5dbf2f78cbfdce3d0c2b8f11855969e9e173"
        }
      }
    ]
  ],
  similes: ["CROSS_CHAIN_SWAP", "CROSS_CHAIN_BRIDGE", "NITRO_BRIDGE", "SWAP", "BRIDGE", "TRANSFER"]
};

// src/index.ts
var nitroPlugin = {
  name: "Nitro",
  description: "Nitro Plugin for Eliza",
  actions: [executeSwapAction],
  evaluators: [],
  providers: []
};
var index_default = nitroPlugin;
export {
  index_default as default,
  nitroPlugin
};
//# sourceMappingURL=index.js.map