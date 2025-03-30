/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/nestfolio.json`.
 */
export type Nestfolio = {
  "address": "DsuyobFDVzaNeQjwLvxSL2efU7eX6W1nBHZQv5Y7dB6E",
  "metadata": {
    "name": "nestfolio",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createProposal",
      "discriminator": [
        132,
        116,
        68,
        174,
        216,
        160,
        198,
        22
      ],
      "accounts": [
        {
          "name": "proposer",
          "writable": true,
          "signer": true
        },
        {
          "name": "proposal",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  112,
                  111,
                  115,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "proposer"
              },
              {
                "kind": "account",
                "path": "organization"
              },
              {
                "kind": "arg",
                "path": "title"
              }
            ]
          }
        },
        {
          "name": "organization",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "expiryTime",
          "type": "i64"
        }
      ]
    },
    {
      "name": "depositFund",
      "discriminator": [
        189,
        21,
        71,
        93,
        11,
        59,
        198,
        37
      ],
      "accounts": [
        {
          "name": "member",
          "writable": true,
          "signer": true
        },
        {
          "name": "organization",
          "writable": true
        },
        {
          "name": "treasuryPda",
          "docs": [
            "CHECK"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "organization"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "bump",
          "type": "u8"
        }
      ]
    },
    {
      "name": "emergencyPause",
      "discriminator": [
        21,
        143,
        27,
        142,
        200,
        181,
        210,
        255
      ],
      "accounts": [
        {
          "name": "organization",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "unlockTime",
          "type": "i64"
        }
      ]
    },
    {
      "name": "initializeMember",
      "discriminator": [
        175,
        223,
        6,
        110,
        126,
        61,
        144,
        21
      ],
      "accounts": [
        {
          "name": "memberAddress",
          "writable": true,
          "signer": true
        },
        {
          "name": "member",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "organization"
              }
            ]
          }
        },
        {
          "name": "memberNftMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  101,
                  109,
                  98,
                  101,
                  114,
                  95,
                  110,
                  102,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "organization"
              }
            ]
          }
        },
        {
          "name": "memberNftTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "memberAddress"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "memberNftMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "organization"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        }
      ]
    },
    {
      "name": "initializeOrganization",
      "discriminator": [
        21,
        20,
        253,
        138,
        250,
        160,
        119,
        87
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "organization",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  103,
                  97,
                  110,
                  105,
                  122,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "fee",
          "type": "u64"
        }
      ]
    },
    {
      "name": "listProposal",
      "discriminator": [
        134,
        224,
        243,
        174,
        42,
        55,
        4,
        7
      ],
      "accounts": [
        {
          "name": "admin",
          "signer": true
        },
        {
          "name": "organization",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  111,
                  114,
                  103,
                  97,
                  110,
                  105,
                  122,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "organization"
              }
            ]
          },
          "relations": [
            "proposal"
          ]
        },
        {
          "name": "proposal"
        }
      ],
      "args": [
        {
          "name": "title",
          "type": "string"
        },
        {
          "name": "description",
          "type": "string"
        },
        {
          "name": "expiryTime",
          "type": "i64"
        }
      ]
    },
    {
      "name": "resumeOperations",
      "discriminator": [
        240,
        141,
        133,
        154,
        232,
        15,
        166,
        157
      ],
      "accounts": [
        {
          "name": "organization",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "updateOrganisation",
      "discriminator": [
        184,
        113,
        83,
        234,
        129,
        184,
        233,
        49
      ],
      "accounts": [
        {
          "name": "organization",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "votingThreshold",
          "type": "u64"
        },
        {
          "name": "proposalLimit",
          "type": "u32"
        }
      ]
    },
    {
      "name": "voteOnProposal",
      "discriminator": [
        188,
        239,
        13,
        88,
        119,
        199,
        251,
        119
      ],
      "accounts": [
        {
          "name": "voter",
          "writable": true,
          "signer": true
        },
        {
          "name": "proposal",
          "writable": true
        },
        {
          "name": "proposalNftMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  112,
                  111,
                  115,
                  97,
                  108
                ]
              },
              {
                "kind": "account",
                "path": "proposal"
              }
            ]
          }
        },
        {
          "name": "proposalNftTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "voter"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "proposalNftMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      "args": [
        {
          "name": "vote",
          "type": "bool"
        }
      ]
    },
    {
      "name": "withdrawFund",
      "discriminator": [
        251,
        169,
        221,
        19,
        158,
        53,
        139,
        10
      ],
      "accounts": [
        {
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "organization",
          "writable": true
        },
        {
          "name": "treasuryPda",
          "docs": [
            "CHECK"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              },
              {
                "kind": "account",
                "path": "organization"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "bump",
          "type": "u8"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "member",
      "discriminator": [
        54,
        19,
        162,
        21,
        29,
        166,
        17,
        198
      ]
    },
    {
      "name": "organisation",
      "discriminator": [
        100,
        235,
        183,
        55,
        240,
        174,
        86,
        191
      ]
    },
    {
      "name": "proposal",
      "discriminator": [
        26,
        94,
        189,
        187,
        116,
        136,
        53,
        33
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "Unauthorized: You do not have permission to perform this action."
    },
    {
      "code": 6001,
      "name": "insufficientFunds",
      "msg": "InsufficientFunds: Not enough funds to complete the transaction."
    },
    {
      "code": 6002,
      "name": "accountNotInitialized",
      "msg": "AccountNotInitialized: The account has not been initialized."
    },
    {
      "code": 6003,
      "name": "accountAlreadyInitialized",
      "msg": "AccountAlreadyInitialized: The account is already initialized."
    },
    {
      "code": 6004,
      "name": "daoNotFound",
      "msg": "DAONotFound: The specified DAO does not exist."
    },
    {
      "code": 6005,
      "name": "daoNotActive",
      "msg": "DAONotActive: The DAO is not active and cannot accept proposals or votes."
    },
    {
      "code": 6006,
      "name": "proposalNotFound",
      "msg": "ProposalNotFound: The specified proposal does not exist."
    },
    {
      "code": 6007,
      "name": "proposalNotActive",
      "msg": "ProposalNotActive: The proposal is not active and cannot be voted on."
    },
    {
      "code": 6008,
      "name": "proposalAlreadyExecuted",
      "msg": "ProposalAlreadyExecuted: The proposal has already been executed."
    },
    {
      "code": 6009,
      "name": "proposalExpired",
      "msg": "ProposalExpired: The proposal has expired and can no longer be voted on."
    },
    {
      "code": 6010,
      "name": "proposalVotingThresholdNotMet",
      "msg": "ProposalVotingThresholdNotMet: The proposal did not meet the required voting threshold."
    },
    {
      "code": 6011,
      "name": "proposalAlreadyCanceled",
      "msg": "ProposalAlreadyCanceled: The proposal has already been canceled."
    },
    {
      "code": 6012,
      "name": "proposalNotCancelable",
      "msg": "ProposalNotCancelable: The proposal cannot be canceled in its current state."
    },
    {
      "code": 6013,
      "name": "memberNotFound",
      "msg": "MemberNotFound: The specified member does not exist in the DAO."
    },
    {
      "code": 6014,
      "name": "memberAlreadyExists",
      "msg": "MemberAlreadyExists: The user is already a member of the DAO."
    },
    {
      "code": 6015,
      "name": "insufficientStake",
      "msg": "InsufficientStake: The user has not staked enough tokens to perform this action."
    },
    {
      "code": 6016,
      "name": "stakeLocked",
      "msg": "StakeLocked: The staked tokens are locked and cannot be withdrawn yet."
    },
    {
      "code": 6017,
      "name": "treasuryWithdrawalFailed",
      "msg": "TreasuryWithdrawalFailed: The treasury withdrawal failed due to insufficient funds or invalid parameters."
    },
    {
      "code": 6018,
      "name": "treasuryDepositFailed",
      "msg": "TreasuryDepositFailed: The treasury deposit failed due to invalid parameters."
    },
    {
      "code": 6019,
      "name": "alreadyVoted",
      "msg": "AlreadyVoted: The user has already voted on this proposal."
    },
    {
      "code": 6020,
      "name": "votingNotAllowed",
      "msg": "VotingNotAllowed: The user is not allowed to vote on this proposal."
    },
    {
      "code": 6021,
      "name": "memberNotActive",
      "msg": "MemberNotActive: The user is not active."
    },
    {
      "code": 6022,
      "name": "cannotDelegateToSelf",
      "msg": "Cannot delegate vote to self."
    },
    {
      "code": 6023,
      "name": "alreadyDelegated",
      "msg": "Vote has already been delegated."
    },
    {
      "code": 6024,
      "name": "invalidOrganization",
      "msg": "Member does not belong to this organization."
    }
  ],
  "types": [
    {
      "name": "member",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "address",
            "type": "pubkey"
          },
          {
            "name": "stakedAmount",
            "type": "u64"
          },
          {
            "name": "votingPower",
            "type": "u32"
          },
          {
            "name": "joinedAt",
            "type": "i64"
          },
          {
            "name": "memberBump",
            "type": "u8"
          },
          {
            "name": "delegate",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "isActive",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "organisation",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "treasuryBalance",
            "type": "u64"
          },
          {
            "name": "totalMembers",
            "type": "u32"
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "status",
            "type": "bool"
          },
          {
            "name": "proposalLimit",
            "type": "u32"
          },
          {
            "name": "memberRegistrationFee",
            "type": "u64"
          },
          {
            "name": "minimumDepositAmount",
            "type": "u64"
          },
          {
            "name": "orgBump",
            "type": "u8"
          },
          {
            "name": "votingThreshold",
            "type": "u64"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "unlockTimestamp",
            "type": "i64"
          },
          {
            "name": "proposalList",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "treasuryPda",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "proposal",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "title",
            "type": "string"
          },
          {
            "name": "description",
            "type": "string"
          },
          {
            "name": "proposer",
            "type": "pubkey"
          },
          {
            "name": "upVotes",
            "type": "u32"
          },
          {
            "name": "downVotes",
            "type": "u32"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "proposalStatus"
              }
            }
          },
          {
            "name": "expiryTime",
            "type": "i64"
          },
          {
            "name": "organization",
            "type": "pubkey"
          },
          {
            "name": "proposalBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "proposalStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pending"
          },
          {
            "name": "approved"
          },
          {
            "name": "rejected"
          }
        ]
      }
    }
  ]
};
