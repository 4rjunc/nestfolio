import { BankrunProvider, startAnchor } from "anchor-bankrun";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, Connection, SystemProgram } from "@solana/web3.js";
import { Nestfolio } from "../target/types/nestfolio";
import { expect } from "chai";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";

const IDL = require("../target/idl/nestfolio.json");

const DAO_PROGRAM_ID = new PublicKey(
  "FXvTKSj5SXeRvaKqGxVc97pekvqN77btHBoZ4Qsn9iZX"
);

describe("DAO Initialization", () => {
  let context;
  let provider;
  let daoProgram;
  let creator;
  let member;
  let voter = new Keypair();

  before(async () => {
    context = await startAnchor(
      "",
      [{ name: "nestfolio", programId: DAO_PROGRAM_ID }],
      [
        {
          address: voter.publicKey,
          info: {
            lamports: 2_000_000_000,
            data: Buffer.alloc(0),
            owner: SYSTEM_PROGRAM_ID,
            executable: false,
          },
        },
      ]
    );
    provider = new BankrunProvider(context);
    daoProgram = new Program<Nestfolio>(IDL, provider);
    creator = provider.wallet.publicKey;
    member = new Keypair().publicKey;
  });

  it("Initialize a DAO", async () => {
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), creator.toBuffer()],
      DAO_PROGRAM_ID
    );

    await daoProgram.methods
      .initializeOrganization("DAO", new anchor.BN(1000))
      .rpc();

    const dao = await daoProgram.account.organisation.fetchNullable(daoAddress);

    console.log(dao);

    expect(dao.name).to.equal("DAO");
    expect(dao.treasuryBalance.toString()).to.equal("0");
    expect(dao.totalMembers).to.equal(0);
    expect(dao.createdAt.toString()).to.not.equal(0);
    expect(dao.status).to.be.true;
    expect(dao.proposalLimit).to.equal(10);
    expect(dao.memberRegistrationFee.toString()).to.equal("1000");
    expect(dao.minimumDepositAmount.toString()).to.equal("1000");
  });

  it("Update Organisation Settings", async () => {
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), creator.toBuffer()],
      DAO_PROGRAM_ID
    );
    await daoProgram.methods
      .updateOrganisation(new anchor.BN(7000000000), new anchor.BN(20))
      .accounts({
        organisation: daoAddress,
      })
      .rpc();

    const dao = await daoProgram.account.organisation.fetchNullable(daoAddress);

    console.log(dao);
    expect(dao.treasuryBalance.toString()).to.equal("0");
    expect(dao.proposalLimit).to.equal(20);
  });

  it("emergency pause", async () => {
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), creator.toBuffer()],
      DAO_PROGRAM_ID
    );

    const pauseTimestamp = Math.floor(Date.now() / 1000) + 3600;

    await daoProgram.methods
      .emergencyPause(new anchor.BN(pauseTimestamp))
      .accounts({
        organisation: daoAddress,
      })
      .rpc();

    const dao = await daoProgram.account.organisation.fetchNullable(daoAddress);

    console.log(dao);

    expect(dao.paused).to.be.true;
    expect(dao.unlockTimestamp.toString()).to.equal(pauseTimestamp.toString());
  });

  it("resume DAO operations", async () => {
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), creator.toBuffer()],
      DAO_PROGRAM_ID
    );

    await daoProgram.methods
      .resumeOperations()
      .accounts({
        organisation: daoAddress,
      })
      .rpc();

    const dao = await daoProgram.account.organisation.fetchNullable(daoAddress);

    console.log(dao);
    expect(dao.paused).to.be.false;
  });

  it("deposit funds", async () => {
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), creator.toBuffer()],
      DAO_PROGRAM_ID
    );

    const [treasuryAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), daoAddress.toBuffer()],
      DAO_PROGRAM_ID
    );

    await daoProgram.methods
      .depositFund(new anchor.BN(1000000))
      .accounts({
        organisation: daoAddress,
        treasury: treasuryAddress,
        signer: member.publicKey,
      })
      .signers(member instanceof anchor.web3.Keypair ? [member] : [])
      .rpc();

    const dao = await daoProgram.account.organisation.fetchNullable(daoAddress);

    console.log(dao);
  });

  it("Register Member", async () => {
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), creator.toBuffer()],
      DAO_PROGRAM_ID
    );

    const [memberAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("member"), daoAddress.toBuffer()],
      DAO_PROGRAM_ID
    );

    const [memberNftMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("member_nft"), daoAddress.toBuffer()],
      DAO_PROGRAM_ID
    );

    const memberNftTokenAccount = await getAssociatedTokenAddress(
      memberNftMint,
      creator
    );

    console.log("member", memberAddress);
    await daoProgram.methods
      .initializeMember("Avhi")
      .accounts({
        organization: daoAddress,
        member: memberAddress,
        memberNftMint,
        memberNftTokenAccount,
      })
      .rpc();

    const member_data = await daoProgram.account.member.fetchNullable(
      memberAddress
    );
    console.log(member_data);

    const tokenAccount = await getAccount(
      provider.connection,
      memberNftTokenAccount
    );
    expect(tokenAccount.amount.toString()).to.equal("1");
    console.log("NFT Minted Successfully!");
  });
  it("Create Proposal", async () => {
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), creator.toBuffer()],
      DAO_PROGRAM_ID
    );
    const [proposalAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        creator.toBuffer(),
        daoAddress.toBuffer(),
        Buffer.from("Buy a new laptop"),
      ],
      DAO_PROGRAM_ID
    );

    await daoProgram.methods
      .createProposal(
        "Buy a new laptop",
        "Buy a new laptop for the organization",
        new anchor.BN(1821246480)
      )
      .accounts({
        proposer: creator,
        organization: daoAddress,
        proposal: proposalAddress,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const proposal = await daoProgram.account.proposal.fetch(proposalAddress);
    console.log("Proposal created successfully:", proposal);
  });

  it("Vote on Proposal", async () => {
    console.log("wallet balance:");
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), creator.toBuffer()],
      DAO_PROGRAM_ID
    );

    const [proposalAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        creator.toBuffer(),
        daoAddress.toBuffer(),
        Buffer.from("Buy a new laptop"),
      ],
      DAO_PROGRAM_ID
    );

    const [proposalNftMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("proposal"), proposalAddress.toBuffer()],
      DAO_PROGRAM_ID
    );

    const proposalNftTokenAccount = await getAssociatedTokenAddress(
      proposalNftMint,
      voter.publicKey
    );

    await daoProgram.methods
      .voteOnProposal(true)
      .accounts({
        voter: voter.publicKey,
        proposal: proposalAddress,
        proposalNftMint,
        proposalNftTokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([voter])
      .rpc();

    await daoProgram.methods
      .voteOnProposal(true)
      .accounts({
        voter: voter.publicKey,
        proposal: proposalAddress,
        proposalNftMint,
        proposalNftTokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([voter])
      .rpc();

    await daoProgram.methods
      .voteOnProposal(false)
      .accounts({
        voter: voter.publicKey,
        proposal: proposalAddress,
        proposalNftMint,
        proposalNftTokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([voter])
      .rpc();

    const vote = await daoProgram.account.proposal.fetch(proposalAddress);
    console.log("Proposal voted successfully:", vote);

    const tokenAccount = await getAccount(
      provider.connection,
      proposalNftTokenAccount
    );
    //expect(tokenAccount.amount.toString()).to.equal("1");
    console.log("NFT Minted Successfully!");
  });

  it("Vote Query - List all proposals", async () => {
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), creator.toBuffer()],
      DAO_PROGRAM_ID
    );

    const dao = await daoProgram.account.organisation.fetchNullable(daoAddress);
    if (!dao) {
      throw new Error("DAO not found!");
    }
    console.log("DAO Name:", dao.name);

    if (!dao.proposalList || dao.proposalList.length === 0) {
      console.log("No proposals found.");
      return;
    }

    for (const proposalAddress of dao.proposalList) {
      const proposal = await daoProgram.account.proposal.fetchNullable(
        proposalAddress
      );
      if (!proposal) continue;

      console.log(`Proposal: ${proposal.title}`);
      console.log("  Description:", proposal.description);
      console.log("  Proposer:", proposal.proposer.toBase58());
      console.log("  Up Votes:", proposal.upVotes.toString());
      console.log("  Down Votes:", proposal.downVotes.toString());
      console.log("  Status:", proposal.status);
      console.log(
        "  Expiry:",
        new Date(proposal.expiryTime.toNumber() * 1000).toISOString()
      );
    }

    expect(dao.proposalList.length).to.be.greaterThan(
      0,
      "No proposals found for the organization"
    );
  });

  it("distribute rewards", async () => {
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), creator.toBuffer()],
      DAO_PROGRAM_ID
    );

    const [treasuryPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      DAO_PROGRAM_ID
    );

    console.log("DAO Address:", daoAddress.toBase58());
    console.log("Treasury PDA:", treasuryPDA.toBase58());

    let dao;
    try {
      dao = await daoProgram.account.organisation.fetch(daoAddress);
    } catch (err) {
      throw new Error("DAO organization not initialized.");
    }

    if (!dao.proposalList || dao.proposalList.length < 3) {
      console.log("Creating missing proposals...");
      for (let i = dao.proposalList.length; i < 3; i++) {
        const proposalKeypair = new Keypair();
        await daoProgram.methods
          .createProposal(`Proposal ${i + 1}`)
          .accounts({
            creator,
            proposal: proposalKeypair.publicKey,
            organization: daoAddress,
            systemProgram: SystemProgram.programId,
          })
          .signers([proposalKeypair])
          .rpc();
      }

      // Fetch updated DAO data after creating proposals
      dao = await daoProgram.account.organisation.fetch(daoAddress);
    }

    const proposalPromises = dao.proposalList
      .slice(0, 3)
      .map(async (proposalKey) => {
        return {
          key: proposalKey,
          proposal: await daoProgram.account.proposal.fetch(proposalKey),
        };
      });

    const proposals = await Promise.all(proposalPromises);

    proposals.forEach((p, i) => {
      console.log(
        `Proposal ${i + 1}:`,
        p.proposal.title,
        "Votes:",
        p.proposal.upVotes - p.proposal.downVotes
      );
    });

    

    // Find the most voted proposal
    const mostVotedProposal = proposals.reduce(
      (max, proposal) =>
        proposal.upVotes - proposal.downVotes > max.upVotes - max.downVotes
          ? proposal
          : max,
      proposals[0]
    )

    console.log(
      "Most Voted Proposal:",
      mostVotedProposal.proposal.title,
      "Net Votes:",
      mostVotedProposal.proposal.upVotes - mostVotedProposal.proposal.downVotes
    );

    const treasuryBefore = await daoProgram.account.treasury.fetch(treasuryPDA);
    console.log("Treasury Balance Before:", treasuryBefore.amount.toString());

    await daoProgram.methods
      .distributeRewards()
      .accounts({
        creator,
        organization: daoAddress,
        treasury: treasuryPDA,
        proposal1: proposals[0].key,
        proposal2: proposals[1].key,
        proposal3: proposals[2].key,
        proposer: new PublicKey(mostVotedProposal.proposal.proposer),
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const treasuryAfter = await daoProgram.account.treasury.fetch(treasuryPDA);
    console.log("Treasury Balance After:", treasuryAfter.amount.toString());

    const rewardReceiver = await provider.connection.getBalance(
      mostVotedProposal.proposal.proposer
    );
    console.log("Reward Receiver Balance:", rewardReceiver);
  });
});
