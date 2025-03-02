import { BankrunProvider, startAnchor } from "anchor-bankrun";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  Connection,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
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
  let member = new Keypair();
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
        {
          address: member.publicKey,
          info: {
            lamports: 5_000_000_000,
            data: Buffer.alloc(0),
            owner: SYSTEM_PROGRAM_ID,
            executable: false,
          },
        },
      ]
    );
    provider = anchor.getProvider();
    anchor.setProvider(provider);
    daoProgram = new Program<Nestfolio>(IDL, provider);
    creator = provider.wallet.publicKey;

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        member.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      ),
      "confirmed"
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        voter.publicKey,
        anchor.web3.LAMPORTS_PER_SOL
      ),
      "confirmed"
    );
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
        organization: daoAddress,
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
        organization: daoAddress,
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
        organization: daoAddress,
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

    const [treasuryAddress, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), daoAddress.toBuffer()],
      DAO_PROGRAM_ID
    );

    console.log("member", member.publicKey);

    const memberBalance = await provider.connection.getBalance(
      member.publicKey
    );
    const MemberbalanceInSol = Number(memberBalance) / LAMPORTS_PER_SOL;
    console.log(`Member Balance: ${MemberbalanceInSol} SOL`);

    await daoProgram.methods
      .depositFund(new anchor.BN(100000000), treasuryBump)
      .accounts({
        member: member.publicKey,
        organization: daoAddress,
        treasury: treasuryAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([member])
      .rpc();

    const dao = await daoProgram.account.organisation.fetchNullable(daoAddress);
    console.log(dao);

    expect(dao.treasuryBalance.toString()).to.equal("100000000");
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
    expect(member_data.name).to.equal("Avhi");
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

    expect(proposal.title).to.equal("Buy a new laptop");
    expect(proposal.description).to.equal(
      "Buy a new laptop for the organization"
    );
    expect(proposal.proposer.toBase58()).to.equal(creator.toBase58());
    expect(proposal.upVotes.toString()).to.equal("0");
    expect(proposal.downVotes.toString()).to.equal("0");
    expect(proposal.expiryTime.toString()).to.equal("1821246480");
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
    console.log("NFT Minted Successfully!");

    expect(tokenAccount.amount.toString()).to.equal("0");
    expect(vote.upVotes.toString()).to.equal("2");
    expect(vote.downVotes.toString()).to.equal("1");
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
    expect(dao.proposalList.length).to.equal(1);
  });

  it("withdraw funds", async () => {
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), creator.toBuffer()],
      DAO_PROGRAM_ID
    );

    console.log("daoAddress+++++++++++++++++++", daoAddress);

    const [treasuryAddress, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), daoAddress.toBuffer()],
      DAO_PROGRAM_ID
    );

    console.log("Expected Treasury PDA:", treasuryAddress.toBase58());
    console.log("Treasury Bump:", treasuryBump);

    const lamports = await provider.connection.getBalance(treasuryAddress);
    const solAmount = Number(lamports) / LAMPORTS_PER_SOL;
    console.log(`Treasury SOL: ${solAmount}`);

    await daoProgram.methods
      .withdrawFund(new anchor.BN(1_000_000))
      .accounts({
        signer: member.publicKey,
        organization: daoAddress,
        treasury: treasuryAddress,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const Updatelamports = await provider.connection.getBalance(
      treasuryAddress
    );
    const UpdatesolAmount = Number(Updatelamports) / LAMPORTS_PER_SOL;
    console.log(`Update Treasury SOL: ${UpdatesolAmount}`);

    console.log("++++++++++++++++++++++++++++++++++++++");

    const dao = await daoProgram.account.organization.fetchNullable(daoAddress);
    console.log("DAO Data:", dao);
  });
});
