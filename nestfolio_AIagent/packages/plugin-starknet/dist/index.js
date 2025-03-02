// src/actions/swap.ts
import {
  composeContext,
  elizaLogger as elizaLogger2,
  generateObjectDeprecated,
  ModelClass
} from "@elizaos/core";
import {
  executeSwap as executeAvnuSwap,
  fetchQuotes
} from "@avnu/avnu-sdk";

// src/utils/index.ts
import { elizaLogger } from "@elizaos/core";
import { Percent } from "@uniswap/sdk-core";
import { Account, Contract, RpcProvider } from "starknet";
var getStarknetProvider = (runtime) => {
  return new RpcProvider({
    nodeUrl: runtime.getSetting("STARKNET_RPC_URL")
  });
};
var getStarknetAccount = (runtime) => {
  return new Account(
    getStarknetProvider(runtime),
    runtime.getSetting("STARKNET_ADDRESS"),
    runtime.getSetting("STARKNET_PRIVATE_KEY")
  );
};

// src/environment.ts
import { z } from "zod";
var STARKNET_PUBLIC_RPC = "https://starknet-mainnet.public.blastapi.io";
var starknetEnvSchema = z.object({
  STARKNET_ADDRESS: z.string().min(1, "Starknet address is required"),
  STARKNET_PRIVATE_KEY: z.string().min(1, "Starknet private key is required"),
  STARKNET_RPC_URL: z.string().min(1, "Starknet RPC URL is required")
});
async function validateStarknetConfig(runtime) {
  try {
    const config = {
      STARKNET_ADDRESS: runtime.getSetting("STARKNET_ADDRESS") || process.env.STARKNET_ADDRESS,
      STARKNET_PRIVATE_KEY: runtime.getSetting("STARKNET_PRIVATE_KEY") || process.env.STARKNET_PRIVATE_KEY,
      STARKNET_RPC_URL: runtime.getSetting("STARKNET_RPC_URL") || process.env.STARKNET_RPC_URL || STARKNET_PUBLIC_RPC
    };
    return starknetEnvSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("\n");
      throw new Error(
        `Starknet configuration validation failed:
${errorMessages}`
      );
    }
    throw error;
  }
}

// src/actions/swap.ts
function isSwapContent(content) {
  const validTypes = typeof content.sellTokenAddress === "string" && typeof content.buyTokenAddress === "string" && typeof content.sellAmount === "string";
  if (!validTypes) {
    return false;
  }
  const validAddresses = content.sellTokenAddress.startsWith("0x") && content.sellTokenAddress.length === 66 && content.buyTokenAddress.startsWith("0x") && content.buyTokenAddress.length === 66;
  return validAddresses;
}
var swapTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

These are known addresses you will get asked to swap, use these addresses for sellTokenAddress and buyTokenAddress:
- BROTHER/brother/$brother: 0x03b405a98c9e795d427fe82cdeeeed803f221b52471e3a757574a2b4180793ee
- BTC/btc: 0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac
- ETH/eth: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
- STRK/strk: 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
- LORDS/lords: 0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49

Example response:
\`\`\`json
{
    "sellTokenAddress": "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    "buyTokenAddress": "0x124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49",
    "sellAmount": "1000000000000000000"
}
\`\`\`

{{recentMessages}}

Extract the following information about the requested token swap:
- Sell token address
- Buy token address
- Amount to sell (in wei)

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.`;
var executeSwap = {
  name: "EXECUTE_STARKNET_SWAP",
  similes: [
    "STARKNET_SWAP_TOKENS",
    "STARKNET_TOKEN_SWAP",
    "STARKNET_TRADE_TOKENS",
    "STARKNET_EXCHANGE_TOKENS"
  ],
  validate: async (runtime, _message) => {
    await validateStarknetConfig(runtime);
    return true;
  },
  description: "Perform a token swap on starknet. Use this action when a user asks you to swap tokens anything.",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger2.log("Starting EXECUTE_STARKNET_SWAP handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    const swapContext = composeContext({
      state: currentState,
      template: swapTemplate
    });
    const response = await generateObjectDeprecated({
      runtime,
      context: swapContext,
      modelClass: ModelClass.MEDIUM
    });
    elizaLogger2.debug("Response:", response);
    if (!isSwapContent(response)) {
      callback?.({ text: "Invalid swap content, please try again." });
      return false;
    }
    try {
      const quoteParams = {
        sellTokenAddress: response.sellTokenAddress,
        buyTokenAddress: response.buyTokenAddress,
        sellAmount: BigInt(response.sellAmount)
      };
      const quote = await fetchQuotes(quoteParams);
      const swapResult = await executeAvnuSwap(
        getStarknetAccount(runtime),
        quote[0],
        {
          slippage: 0.05,
          // 5% slippage
          executeApprove: true
        }
      );
      elizaLogger2.log(
        `Swap completed successfully! tx: ${swapResult.transactionHash}`
      );
      callback?.({
        text: `Swap completed successfully! tx: ${swapResult.transactionHash}`
      });
      return true;
    } catch (error) {
      elizaLogger2.error("Error during token swap:", error);
      callback?.({ text: `Error during swap: ${error.message}` });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Swap 10 ETH for LORDS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Ok, I'll swap 10 ETH for LORDS"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Swap 100 $lords on starknet"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Ok, I'll swap 100 $lords on starknet"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Swap 0.5 BTC for LORDS"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Ok, I'll swap 0.5 BTC for LORDS"
        }
      }
    ]
  ]
};

// src/actions/transfer.ts
import {
  composeContext as composeContext2,
  elizaLogger as elizaLogger3,
  generateObjectDeprecated as generateObjectDeprecated2,
  ModelClass as ModelClass2
} from "@elizaos/core";

// src/utils/ERC20Token.ts
import {
  cairo,
  CallData,
  Contract as Contract2
} from "starknet";

// src/utils/erc20.json
var erc20_default = [
  {
    name: "MintableToken",
    type: "impl",
    interface_name: "src::mintable_token_interface::IMintableToken"
  },
  {
    name: "core::integer::u256",
    type: "struct",
    members: [
      {
        name: "low",
        type: "core::integer::u128"
      },
      {
        name: "high",
        type: "core::integer::u128"
      }
    ]
  },
  {
    name: "src::mintable_token_interface::IMintableToken",
    type: "interface",
    items: [
      {
        name: "permissioned_mint",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "permissioned_burn",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "MintableTokenCamelImpl",
    type: "impl",
    interface_name: "src::mintable_token_interface::IMintableTokenCamel"
  },
  {
    name: "src::mintable_token_interface::IMintableTokenCamel",
    type: "interface",
    items: [
      {
        name: "permissionedMint",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "permissionedBurn",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "Replaceable",
    type: "impl",
    interface_name: "src::replaceability_interface::IReplaceable"
  },
  {
    name: "core::array::Span::<core::felt252>",
    type: "struct",
    members: [
      {
        name: "snapshot",
        type: "@core::array::Array::<core::felt252>"
      }
    ]
  },
  {
    name: "src::replaceability_interface::EICData",
    type: "struct",
    members: [
      {
        name: "eic_hash",
        type: "core::starknet::class_hash::ClassHash"
      },
      {
        name: "eic_init_data",
        type: "core::array::Span::<core::felt252>"
      }
    ]
  },
  {
    name: "core::option::Option::<src::replaceability_interface::EICData>",
    type: "enum",
    variants: [
      {
        name: "Some",
        type: "src::replaceability_interface::EICData"
      },
      {
        name: "None",
        type: "()"
      }
    ]
  },
  {
    name: "core::bool",
    type: "enum",
    variants: [
      {
        name: "False",
        type: "()"
      },
      {
        name: "True",
        type: "()"
      }
    ]
  },
  {
    name: "src::replaceability_interface::ImplementationData",
    type: "struct",
    members: [
      {
        name: "impl_hash",
        type: "core::starknet::class_hash::ClassHash"
      },
      {
        name: "eic_data",
        type: "core::option::Option::<src::replaceability_interface::EICData>"
      },
      {
        name: "final",
        type: "core::bool"
      }
    ]
  },
  {
    name: "src::replaceability_interface::IReplaceable",
    type: "interface",
    items: [
      {
        name: "get_upgrade_delay",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u64"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "get_impl_activation_time",
        type: "function",
        inputs: [
          {
            name: "implementation_data",
            type: "src::replaceability_interface::ImplementationData"
          }
        ],
        outputs: [
          {
            type: "core::integer::u64"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "add_new_implementation",
        type: "function",
        inputs: [
          {
            name: "implementation_data",
            type: "src::replaceability_interface::ImplementationData"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "remove_implementation",
        type: "function",
        inputs: [
          {
            name: "implementation_data",
            type: "src::replaceability_interface::ImplementationData"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "replace_to",
        type: "function",
        inputs: [
          {
            name: "implementation_data",
            type: "src::replaceability_interface::ImplementationData"
          }
        ],
        outputs: [],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "AccessControlImplExternal",
    type: "impl",
    interface_name: "src::access_control_interface::IAccessControl"
  },
  {
    name: "src::access_control_interface::IAccessControl",
    type: "interface",
    items: [
      {
        name: "has_role",
        type: "function",
        inputs: [
          {
            name: "role",
            type: "core::felt252"
          },
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "get_role_admin",
        type: "function",
        inputs: [
          {
            name: "role",
            type: "core::felt252"
          }
        ],
        outputs: [
          {
            type: "core::felt252"
          }
        ],
        state_mutability: "view"
      }
    ]
  },
  {
    name: "RolesImpl",
    type: "impl",
    interface_name: "src::roles_interface::IMinimalRoles"
  },
  {
    name: "src::roles_interface::IMinimalRoles",
    type: "interface",
    items: [
      {
        name: "is_governance_admin",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "is_upgrade_governor",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "register_governance_admin",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "remove_governance_admin",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "register_upgrade_governor",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "remove_upgrade_governor",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [],
        state_mutability: "external"
      },
      {
        name: "renounce",
        type: "function",
        inputs: [
          {
            name: "role",
            type: "core::felt252"
          }
        ],
        outputs: [],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "ERC20Impl",
    type: "impl",
    interface_name: "openzeppelin::token::erc20::interface::IERC20"
  },
  {
    name: "openzeppelin::token::erc20::interface::IERC20",
    type: "interface",
    items: [
      {
        name: "name",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::felt252"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "symbol",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::felt252"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "decimals",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u8"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "total_supply",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "balance_of",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "allowance",
        type: "function",
        inputs: [
          {
            name: "owner",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "spender",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "transfer",
        type: "function",
        inputs: [
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      },
      {
        name: "transfer_from",
        type: "function",
        inputs: [
          {
            name: "sender",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      },
      {
        name: "approve",
        type: "function",
        inputs: [
          {
            name: "spender",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "ERC20CamelOnlyImpl",
    type: "impl",
    interface_name: "openzeppelin::token::erc20::interface::IERC20CamelOnly"
  },
  {
    name: "openzeppelin::token::erc20::interface::IERC20CamelOnly",
    type: "interface",
    items: [
      {
        name: "totalSupply",
        type: "function",
        inputs: [],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "balanceOf",
        type: "function",
        inputs: [
          {
            name: "account",
            type: "core::starknet::contract_address::ContractAddress"
          }
        ],
        outputs: [
          {
            type: "core::integer::u256"
          }
        ],
        state_mutability: "view"
      },
      {
        name: "transferFrom",
        type: "function",
        inputs: [
          {
            name: "sender",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "recipient",
            type: "core::starknet::contract_address::ContractAddress"
          },
          {
            name: "amount",
            type: "core::integer::u256"
          }
        ],
        outputs: [
          {
            type: "core::bool"
          }
        ],
        state_mutability: "external"
      }
    ]
  },
  {
    name: "constructor",
    type: "constructor",
    inputs: [
      {
        name: "name",
        type: "core::felt252"
      },
      {
        name: "symbol",
        type: "core::felt252"
      },
      {
        name: "decimals",
        type: "core::integer::u8"
      },
      {
        name: "initial_supply",
        type: "core::integer::u256"
      },
      {
        name: "recipient",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "permitted_minter",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "provisional_governance_admin",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "upgrade_delay",
        type: "core::integer::u64"
      }
    ]
  },
  {
    name: "increase_allowance",
    type: "function",
    inputs: [
      {
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "added_value",
        type: "core::integer::u256"
      }
    ],
    outputs: [
      {
        type: "core::bool"
      }
    ],
    state_mutability: "external"
  },
  {
    name: "decrease_allowance",
    type: "function",
    inputs: [
      {
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "subtracted_value",
        type: "core::integer::u256"
      }
    ],
    outputs: [
      {
        type: "core::bool"
      }
    ],
    state_mutability: "external"
  },
  {
    name: "increaseAllowance",
    type: "function",
    inputs: [
      {
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "addedValue",
        type: "core::integer::u256"
      }
    ],
    outputs: [
      {
        type: "core::bool"
      }
    ],
    state_mutability: "external"
  },
  {
    name: "decreaseAllowance",
    type: "function",
    inputs: [
      {
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        name: "subtractedValue",
        type: "core::integer::u256"
      }
    ],
    outputs: [
      {
        type: "core::bool"
      }
    ],
    state_mutability: "external"
  },
  {
    kind: "struct",
    name: "openzeppelin::token::erc20_v070::erc20::ERC20::Transfer",
    type: "event",
    members: [
      {
        kind: "data",
        name: "from",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "to",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "value",
        type: "core::integer::u256"
      }
    ]
  },
  {
    kind: "struct",
    name: "openzeppelin::token::erc20_v070::erc20::ERC20::Approval",
    type: "event",
    members: [
      {
        kind: "data",
        name: "owner",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "spender",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "value",
        type: "core::integer::u256"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::replaceability_interface::ImplementationAdded",
    type: "event",
    members: [
      {
        kind: "data",
        name: "implementation_data",
        type: "src::replaceability_interface::ImplementationData"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::replaceability_interface::ImplementationRemoved",
    type: "event",
    members: [
      {
        kind: "data",
        name: "implementation_data",
        type: "src::replaceability_interface::ImplementationData"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::replaceability_interface::ImplementationReplaced",
    type: "event",
    members: [
      {
        kind: "data",
        name: "implementation_data",
        type: "src::replaceability_interface::ImplementationData"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::replaceability_interface::ImplementationFinalized",
    type: "event",
    members: [
      {
        kind: "data",
        name: "impl_hash",
        type: "core::starknet::class_hash::ClassHash"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::access_control_interface::RoleGranted",
    type: "event",
    members: [
      {
        kind: "data",
        name: "role",
        type: "core::felt252"
      },
      {
        kind: "data",
        name: "account",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "sender",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::access_control_interface::RoleRevoked",
    type: "event",
    members: [
      {
        kind: "data",
        name: "role",
        type: "core::felt252"
      },
      {
        kind: "data",
        name: "account",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "sender",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::access_control_interface::RoleAdminChanged",
    type: "event",
    members: [
      {
        kind: "data",
        name: "role",
        type: "core::felt252"
      },
      {
        kind: "data",
        name: "previous_admin_role",
        type: "core::felt252"
      },
      {
        kind: "data",
        name: "new_admin_role",
        type: "core::felt252"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::roles_interface::GovernanceAdminAdded",
    type: "event",
    members: [
      {
        kind: "data",
        name: "added_account",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "added_by",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::roles_interface::GovernanceAdminRemoved",
    type: "event",
    members: [
      {
        kind: "data",
        name: "removed_account",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "removed_by",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::roles_interface::UpgradeGovernorAdded",
    type: "event",
    members: [
      {
        kind: "data",
        name: "added_account",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "added_by",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    kind: "struct",
    name: "src::roles_interface::UpgradeGovernorRemoved",
    type: "event",
    members: [
      {
        kind: "data",
        name: "removed_account",
        type: "core::starknet::contract_address::ContractAddress"
      },
      {
        kind: "data",
        name: "removed_by",
        type: "core::starknet::contract_address::ContractAddress"
      }
    ]
  },
  {
    kind: "enum",
    name: "openzeppelin::token::erc20_v070::erc20::ERC20::Event",
    type: "event",
    variants: [
      {
        kind: "nested",
        name: "Transfer",
        type: "openzeppelin::token::erc20_v070::erc20::ERC20::Transfer"
      },
      {
        kind: "nested",
        name: "Approval",
        type: "openzeppelin::token::erc20_v070::erc20::ERC20::Approval"
      },
      {
        kind: "nested",
        name: "ImplementationAdded",
        type: "src::replaceability_interface::ImplementationAdded"
      },
      {
        kind: "nested",
        name: "ImplementationRemoved",
        type: "src::replaceability_interface::ImplementationRemoved"
      },
      {
        kind: "nested",
        name: "ImplementationReplaced",
        type: "src::replaceability_interface::ImplementationReplaced"
      },
      {
        kind: "nested",
        name: "ImplementationFinalized",
        type: "src::replaceability_interface::ImplementationFinalized"
      },
      {
        kind: "nested",
        name: "RoleGranted",
        type: "src::access_control_interface::RoleGranted"
      },
      {
        kind: "nested",
        name: "RoleRevoked",
        type: "src::access_control_interface::RoleRevoked"
      },
      {
        kind: "nested",
        name: "RoleAdminChanged",
        type: "src::access_control_interface::RoleAdminChanged"
      },
      {
        kind: "nested",
        name: "GovernanceAdminAdded",
        type: "src::roles_interface::GovernanceAdminAdded"
      },
      {
        kind: "nested",
        name: "GovernanceAdminRemoved",
        type: "src::roles_interface::GovernanceAdminRemoved"
      },
      {
        kind: "nested",
        name: "UpgradeGovernorAdded",
        type: "src::roles_interface::UpgradeGovernorAdded"
      },
      {
        kind: "nested",
        name: "UpgradeGovernorRemoved",
        type: "src::roles_interface::UpgradeGovernorRemoved"
      }
    ]
  }
];

// src/utils/ERC20Token.ts
var ERC20Token = class {
  // abi: any;
  abi;
  // Fix: Use the actual type of the ABI
  contract;
  calldata;
  constructor(token, providerOrAccount) {
    this.contract = new Contract2(erc20_default, token, providerOrAccount);
    this.calldata = new CallData(this.contract.abi);
  }
  address() {
    return this.contract.address;
  }
  async balanceOf(account) {
    const result = await this.contract.call("balance_of", [account]);
    return result;
  }
  async decimals() {
    const result = await this.contract.call("decimals");
    return result;
  }
  approveCall(spender, amount) {
    return {
      contractAddress: this.contract.address,
      entrypoint: "approve",
      calldata: this.calldata.compile("approve", {
        spender,
        amount: cairo.uint256(amount)
      })
    };
  }
  transferCall(recipient, amount) {
    return {
      contractAddress: this.contract.address,
      entrypoint: "transfer",
      calldata: this.calldata.compile("transfer", {
        recipient,
        amount: cairo.uint256(amount)
      })
    };
  }
};

// src/utils/starknetId.ts
import { starknetId } from "starknet";
var isStarkDomain = (domain) => {
  return /^(?:[a-z0-9-]{1,48}(?:[a-z0-9-]{1,48}[a-z0-9-])?\.)*[a-z0-9-]{1,48}\.stark$/.test(
    domain
  );
};
var getAddressFromName = async (account, name) => {
  const address = await account.getAddressFromStarkName(name);
  if (!address.startsWith("0x") || address === "0x0") {
    throw new Error("Invalid address");
  }
  return address;
};
var getTransferSubdomainCall = (account, domain, recipient) => {
  const namingContract = process.env.STARKNETID_NAMING_CONTRACT;
  const identityContract = process.env.STARKNETID_IDENTITY_CONTRACT;
  const newTokenId = Math.floor(Math.random() * 1e12);
  const domainParts = domain.replace(".stark", "").split(".");
  const encodedDomain = domainParts.map(
    (d) => starknetId.useEncoded(d).toString(10)
  );
  return [
    {
      contractAddress: identityContract,
      entrypoint: "mint",
      calldata: [newTokenId]
    },
    {
      contractAddress: namingContract,
      entrypoint: "transfer_domain",
      calldata: [domainParts.length, ...encodedDomain, newTokenId]
    },
    {
      contractAddress: identityContract,
      entrypoint: "transfer_from",
      calldata: [account, recipient, newTokenId, 0]
    }
  ];
};

// src/actions/transfer.ts
function isTransferContent(content) {
  const validTypes = typeof content.tokenAddress === "string" && (typeof content.recipient === "string" || typeof content.starkName === "string") && (typeof content.amount === "string" || typeof content.amount === "number");
  if (!validTypes) {
    return false;
  }
  const validTokenAddress = content.tokenAddress.startsWith("0x") && content.tokenAddress.length === 66;
  if (!validTokenAddress) {
    return false;
  }
  if (content.recipient) {
    const validRecipient = content.recipient.startsWith("0x") && content.recipient.length === 66;
    if (!validRecipient) {
      return false;
    }
  } else if (content.starkName) {
    const validStarkName = isStarkDomain(content.starkName);
    if (!validStarkName) {
      return false;
    }
  }
  return true;
}
var transferTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

For the amount to send, use a value from 1 - 100. Determine this based on your judgement of the recipient.

these are known addresses, if you get asked about them, use these:
- BTC/btc: 0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac
- ETH/eth: 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
- STRK/strk: 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
- LORDS/lords: 0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49

Example response:
\`\`\`json
{
    "tokenAddress": "0x49d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    "recipient": "0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF",
    "starkName": "domain.stark",
    "amount": "0.001"
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested token transfer:
- Token contract address
- Recipient wallet address
- Recipient .stark name


Respond with a JSON markdown block containing only the extracted values.`;
var transfer_default = {
  name: "SEND_TOKEN",
  similes: [
    "TRANSFER_TOKEN_ON_STARKNET",
    "TRANSFER_TOKENS_ON_STARKNET",
    "SEND_TOKENS_ON_STARKNET",
    "SEND_ETH_ON_STARKNET",
    "PAY_ON_STARKNET"
  ],
  validate: async (runtime, _message) => {
    await validateStarknetConfig(runtime);
    return true;
  },
  description: "MUST use this action if the user requests send a token or transfer a token, the request might be varied, but it will always be a token transfer. If the user requests a transfer of lords, use this action.",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger3.log("Starting SEND_TOKEN handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    const transferContext = composeContext2({
      state: currentState,
      template: transferTemplate
    });
    const content = await generateObjectDeprecated2({
      runtime,
      context: transferContext,
      modelClass: ModelClass2.MEDIUM
    });
    elizaLogger3.debug("Transfer content:", content);
    if (!isTransferContent(content)) {
      elizaLogger3.error("Invalid content for TRANSFER_TOKEN action.");
      if (callback) {
        callback({
          text: "Not enough information to transfer tokens. Please respond with token address, recipient address or stark name, and amount.",
          content: { error: "Invalid transfer content" }
        });
      }
      return false;
    }
    try {
      const account = getStarknetAccount(runtime);
      const erc20Token = new ERC20Token(content.tokenAddress, account);
      const decimals = await erc20Token.decimals();
      const amountInteger = Math.floor(
        Number(content.amount) * 10 ** Number(decimals)
        // Fix: Use exponentiation operator instead of Math.pow
      );
      const amountWei = BigInt(amountInteger.toString());
      const recipient = content.recipient ?? await getAddressFromName(account, content.starkName);
      const transferCall = erc20Token.transferCall(recipient, amountWei);
      elizaLogger3.success(
        "Transferring",
        amountWei,
        "of",
        content.tokenAddress,
        "to",
        recipient
      );
      const tx = await account.execute(transferCall);
      elizaLogger3.success(
        `Transfer completed successfully! tx: ${tx.transaction_hash}`
        // Fix: Use template literal
      );
      if (callback) {
        callback({
          text: `Transfer completed successfully! tx: ${tx.transaction_hash}`,
          // Fix: Use template literal
          content: {}
        });
      }
      return true;
    } catch (error) {
      elizaLogger3.error("Error during token transfer:", error);
      if (callback) {
        callback({
          text: `Error transferring tokens: ${error.message}`,
          content: { error: error.message }
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
          text: "Send 10 ETH to 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll transfer 10 ETH to that address right away. Let me process that for you."
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Send 10 ETH to domain.stark"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll transfer 10 ETH to domain.stark et address 0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49 right away. Let me process that for you."
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Can you transfer 50 LORDS tokens to 0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Executing transfer of 50 LORDS tokens to the specified address. One moment please."
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Can you transfer 50 LORDS tokens to domain.stark?"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Executing transfer of 50 LORDS tokens to domain.stark at address 0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49. One moment please."
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Please send 0.5 BTC to 0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Got it, initiating transfer of 0.5 BTC to the provided address. I'll confirm once it's complete."
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Please send 0.5 BTC to domain.stark"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Got it, initiating transfer of 0.5 BTC to domain.stark at address 0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac. I'll confirm once it's complete."
        }
      }
    ]
  ]
};

// src/actions/unruggable.ts
import {
  composeContext as composeContext3,
  elizaLogger as elizaLogger4,
  generateObjectDeprecated as generateObjectDeprecated3,
  ModelClass as ModelClass3
} from "@elizaos/core";
import { Percent as Percent2 } from "@uniswap/sdk-core";
import { createMemecoin, launchOnEkubo } from "unruggable-sdk";
function isDeployTokenContent(content) {
  const validTypes = typeof content.name === "string" && typeof content.symbol === "string" && typeof content.owner === "string" && typeof content.initialSupply === "string";
  if (!validTypes) {
    return false;
  }
  const validAddresses = content.name.length > 2 && content.symbol.length > 2 && Number.parseInt(content.initialSupply) > 0 && content.owner.startsWith("0x") && content.owner.length === 66;
  return validAddresses;
}
var deployTemplate = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "name": "Brother",
    "symbol": "BROTHER",
    "owner": "0x0000000000000000000000000000000000000000000000000000000000000000",
    "initialSupply": "1000000000000000000"
}
\`\`\`

{{recentMessages}}

Extract the following information about the requested token deployment:
- Token Name
- Token Symbol
- Token Owner
- Token initial supply

Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.`;
var deployToken = {
  name: "DEPLOY_STARKNET_UNRUGGABLE_MEME_TOKEN",
  similes: [
    "DEPLOY_STARKNET_UNRUGGABLE_TOKEN",
    "STARKNET_DEPLOY_MEMECOIN",
    "STARKNET_CREATE_MEMECOIN"
  ],
  validate: async (runtime, _message) => {
    await validateStarknetConfig(runtime);
    return true;
  },
  description: "Deploy an Unruggable Memecoin on Starknet. Use this action when a user asks you to deploy a new token on Starknet.",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger4.log(
      "Starting DEPLOY_STARKNET_UNRUGGABLE_MEME_TOKEN handler..."
    );
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    const deployContext = composeContext3({
      state: currentState,
      template: deployTemplate
    });
    const response = await generateObjectDeprecated3({
      runtime,
      context: deployContext,
      modelClass: ModelClass3.MEDIUM
    });
    elizaLogger4.log(`init supply. ${response.initialSupply}`);
    elizaLogger4.log(response);
    if (!isDeployTokenContent(response)) {
      callback?.({
        text: "Invalid deployment content, please try again."
      });
      return false;
    }
    try {
      const provider = getStarknetProvider(runtime);
      const account = getStarknetAccount(runtime);
      const chainId = await provider.getChainId();
      const config = {
        starknetChainId: chainId,
        starknetProvider: provider
      };
      const { tokenAddress, transactionHash } = await createMemecoin(
        config,
        {
          name: response.name,
          symbol: response.symbol,
          owner: response.owner,
          initialSupply: response.initialSupply,
          starknetAccount: account
        }
      );
      elizaLogger4.log(
        `Token deployment initiated for: ${response.name} at address: ${tokenAddress}`
      );
      await launchOnEkubo(config, {
        antiBotPeriodInSecs: 3600,
        currencyAddress: "0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49" /* LORDS */,
        fees: "3",
        holdLimit: "2",
        memecoinAddress: tokenAddress,
        starknetAccount: account,
        startingMarketCap: "5000",
        teamAllocations: [
          {
            address: "0x07c6eE09d10C9a98E5100F017439b825c85c5cbdaE1146c602013F79f4db9f1D" /* ELIZA */,
            amount: new Percent2(
              2.5,
              response.initialSupply
            ).toFixed(0)
          },
          {
            address: "0x04837488b417a286a4a42ccb296398c86b7a88b3ef74c67425aac34b9467f03f" /* BLOBERT */,
            amount: new Percent2(
              2.5,
              response.initialSupply
            ).toFixed(0)
          }
        ]
      });
      callback?.({
        text: `Token Deployment completed successfully! ${response.symbol} deployed in tx: ${transactionHash}`
      });
      return true;
    } catch (error) {
      elizaLogger4.error("Error during token deployment:", error);
      callback?.({
        text: `Error during deployment: ${error.message}`,
        content: { error: error.message }
      });
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: {
          text: "Deploy a new token called Lords with the symbol LORDS, owned by 0x024BA6a4023fB90962bDfc2314F3B94372aa382D155291635fc3E6b777657A5B and initial supply of 1000000000000000000 on Starknet"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Ok, I'll deploy the Lords token to Starknet"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Deploy the SLINK coin to Starknet"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Ok, I'll deploy your coin on Starknet"
        }
      }
    ],
    [
      {
        user: "{{user1}}",
        content: {
          text: "Create a new coin on Starknet"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "Ok, I'll create a new coin for you on Starknet"
        }
      }
    ]
  ]
};

// src/actions/subdomain.ts
import {
  ModelClass as ModelClass4,
  composeContext as composeContext4,
  generateObjectDeprecated as generateObjectDeprecated4,
  elizaLogger as elizaLogger5
} from "@elizaos/core";
function isSubdomainCreation(content) {
  const validTypes = typeof content.recipient === "string" && typeof content.subdomain === "string";
  if (!validTypes) {
    return false;
  }
  const validTokenAddress = content.recipient.startsWith("0x") && content.recipient.length === 66;
  if (!validTokenAddress) {
    return false;
  }
  const validStarkName = isStarkDomain(content.subdomain) && content.subdomain.split(".").length === 3;
  if (!validStarkName) {
    return false;
  }
  return true;
}
var transferTemplate2 = `Respond with a JSON markdown block containing only the extracted values. Use null for any values that cannot be determined.

Example response:
\`\`\`json
{
    "recipient": "0x1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF",
    "subdomain": "subdomain.domain.stark",
}
\`\`\`

{{recentMessages}}

Given the recent messages, extract the following information about the requested subdomain creation:
- Subdomain to create
- Recipient wallet address


Respond with a JSON markdown block containing only the extracted values.`;
var subdomain_default = {
  name: "CREATE_SUBDOMAIN",
  similes: [
    "CREATE_SUBDOMAIN_ON_STARKNET",
    "SUBDOMAIN_ON_STARKNET",
    "SUBDOMAIN_CREATION",
    "SEND_SUBDOMAIN_ON_STARKNET"
  ],
  validate: async (runtime, _message) => {
    await validateStarknetConfig(runtime);
    return true;
  },
  description: "MUST use this action if the user requests create a subdomain, the request might be varied, but it will always be a subdomain creation.",
  handler: async (runtime, message, state, _options, callback) => {
    elizaLogger5.log("Starting CREATE_SUBDOMAIN handler...");
    let currentState = state;
    if (!currentState) {
      currentState = await runtime.composeState(message);
    } else {
      currentState = await runtime.updateRecentMessageState(currentState);
    }
    const transferContext = composeContext4({
      state: currentState,
      template: transferTemplate2
    });
    const content = await generateObjectDeprecated4({
      runtime,
      context: transferContext,
      modelClass: ModelClass4.MEDIUM
    });
    elizaLogger5.debug("Transfer content:", content);
    if (!isSubdomainCreation(content)) {
      elizaLogger5.error("Invalid content for CREATE_SUBDOMAIN action.");
      if (callback) {
        callback({
          text: "Not enough information to create subdomain. Please respond with your domain and the subdomain to create.",
          content: { error: "Invalid subdomain creation content" }
        });
      }
      return false;
    }
    try {
      const account = getStarknetAccount(runtime);
      const transferCall = getTransferSubdomainCall(
        account.address,
        content.subdomain,
        content.recipient
      );
      elizaLogger5.success(
        "Transferring",
        content.subdomain,
        "to",
        content.recipient
      );
      const tx = await account.execute(transferCall);
      elizaLogger5.success(
        `Transfer completed successfully! tx: ${tx.transaction_hash}`
      );
      if (callback) {
        callback({
          text: `Transfer completed successfully! tx: ${tx.transaction_hash}`,
          content: {}
        });
      }
      return true;
    } catch (error) {
      elizaLogger5.error("Error during subdomain transfer:", error);
      if (callback) {
        callback({
          text: `Error transferring subdomain ${content.subdomain}: ${error.message}`,
          content: { error: error.message }
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
          text: "Send me subdomain.domain.stark to 0x0124aeb495b947201f5fac96fd1138e326ad86195b98df6dec9009158a533b49"
        }
      },
      {
        user: "{{agent}}",
        content: {
          text: "I'll transfer subdomain.domain.stark to that address right away. Let me process that for you."
        }
      }
    ]
  ]
};

// src/index.ts
var PROVIDER_CONFIG = {
  AVNU_API: "https://starknet.impulse.avnu.fi/v1",
  MAX_RETRIES: 3,
  RETRY_DELAY: 2e3,
  TOKEN_ADDRESSES: {
    BTC: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac",
    ETH: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7",
    STRK: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"
  },
  TOKEN_SECURITY_ENDPOINT: "/defi/token_security?address=",
  TOKEN_TRADE_DATA_ENDPOINT: "/defi/v3/token/trade-data/single?address=",
  DEX_SCREENER_API: "https://api.dexscreener.com/latest/dex/tokens/",
  MAIN_WALLET: ""
};
var starknetPlugin = {
  name: "starknet",
  description: "Starknet Plugin for Eliza",
  actions: [transfer_default, executeSwap, deployToken, subdomain_default],
  evaluators: [],
  providers: []
};
var index_default = starknetPlugin;
export {
  PROVIDER_CONFIG,
  index_default as default,
  starknetPlugin
};
//# sourceMappingURL=index.js.map