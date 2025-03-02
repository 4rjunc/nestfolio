import { startAnchor } from "anchor-bankrun";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { Nestfolio } from "../target/types/nestfolio";
import { expect } from "chai";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";

const IDL = require("../target/idl/nestfolio.json");

const DAO_PROGRAM_ID = new PublicKey(
  "FmvHXQmUhsY1SYmQgysUC3wJjM4JQCsGHwHnsfw1YDUs"
);

describe("DAO Initialization", () => {
  let provider;
  let daoProgram;
  let creator;
  let member = new Keypair();
  let voter = new Keypair();

  before(async () => {
    provider = anchor.getProvider();
    anchor.setProvider(provider);
    daoProgram = new Program<Nestfolio>(IDL, provider);
    creator = provider.wallet.publicKey;

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        member.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
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

  it("Should initialize a DAO", async () => {
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

  it("Should update organisation settings", async () => {
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

  it("Should pause DAO operations", async () => {
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

  it("Should resume DAO operations", async () => {
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

  it("should deposit funds into the treasury", async () => {
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), creator.toBuffer()],
      daoProgram.programId
    );

    const [treasuryAddress, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), daoAddress.toBuffer()],
      daoProgram.programId
    );

    const memberBalanceBefore = await provider.connection.getBalance(
      member.publicKey
    );
    const memberBalanceBeforeInSol =
      Number(memberBalanceBefore) / anchor.web3.LAMPORTS_PER_SOL;
    console.log(`Member Balance Before: ${memberBalanceBeforeInSol} SOL`);

    const depositAmount = new anchor.BN(1_000_000_000);
    await daoProgram.methods
      .depositFund(depositAmount, treasuryBump)
      .accounts({
        member: member.publicKey,
        organization: daoAddress,
        treasuryPda: treasuryAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([member])
      .rpc();

    const dao = await daoProgram.account.organisation.fetch(daoAddress);
    console.log("Organization:", dao);

    const treasuryBalance = await provider.connection.getBalance(
      treasuryAddress
    );
    const treasuryBalanceInSol =
      Number(treasuryBalance) / anchor.web3.LAMPORTS_PER_SOL;
    console.log(`Treasury Balance: ${treasuryBalanceInSol} SOL`);

    const memberBalanceAfter = await provider.connection.getBalance(
      member.publicKey
    );
    const memberBalanceAfterInSol =
      Number(memberBalanceAfter) / anchor.web3.LAMPORTS_PER_SOL;
    console.log(`Member Balance After: ${memberBalanceAfterInSol} SOL`);
  });

  it("Should register a member", async () => {
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

  it("Should create a proposal", async () => {
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

  it("Should Vote on a Proposal", async () => {
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

  it("Should query/list votes", async () => {
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

  it("should withdraw funds from the treasury", async () => {
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), creator.toBuffer()],
      daoProgram.programId
    );

    const [treasuryAddress, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), daoAddress.toBuffer()],
      daoProgram.programId
    );

    console.log("Expected Treasury PDA:", treasuryAddress.toBase58());
    console.log("Treasury Bump:", treasuryBump);

    const treasuryBalanceBefore = await provider.connection.getBalance(
      treasuryAddress
    );
    const treasuryBalanceBeforeInSol =
      Number(treasuryBalanceBefore) / anchor.web3.LAMPORTS_PER_SOL;
    console.log(
      `Treasury Balance Before Withdrawal: ${treasuryBalanceBeforeInSol} SOL`
    );

    const withdrawAmount = new anchor.BN(500_000_000);
    await daoProgram.methods
      .withdrawFund(withdrawAmount, treasuryBump)
      .accounts({
        signer: member.publicKey,
        organization: daoAddress,
        treasuryPda: treasuryAddress,
        systemProgram: SystemProgram.programId,
      })
      .signers([member])
      .rpc();

    const treasuryBalanceAfter = await provider.connection.getBalance(
      treasuryAddress
    );
    const treasuryBalanceAfterInSol =
      Number(treasuryBalanceAfter) / anchor.web3.LAMPORTS_PER_SOL;
    console.log(
      `Treasury Balance After Withdrawal: ${treasuryBalanceAfterInSol} SOL`
    );

    const dao = await daoProgram.account.organisation.fetch(daoAddress);
    expect(dao.treasuryBalance.toString(), "500000000");

    expect(treasuryBalanceAfter, "500_000_000");
  });
});
