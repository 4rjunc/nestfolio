import { BankrunProvider, startAnchor } from "anchor-bankrun";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Nestfolio } from "../target/types/nestfolio";
import { expect } from "chai";

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
      []
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

  it("withdraw funds", async () => {
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), creator.toBuffer()],
      DAO_PROGRAM_ID
    );

    const [treasuryAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), daoAddress.toBuffer()],
      DAO_PROGRAM_ID
    );

    await daoProgram.methods
      .withdrawFund(new anchor.BN(1000000))
      .accounts({
        organization: daoAddress,
        treasury: treasuryAddress,
        signer: member.PublicKey,
      })
      .signer[member].rpc();

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

    console.log("member", memberAddress);
    await daoProgram.methods
      .initializeMember("Avhi")
      .accounts({
        organization: daoAddress,
      })
      .rpc();

    const member_data = await daoProgram.account.member.fetchNullable(
      memberAddress
    );
    console.log(member_data);
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
      .voteOnProposal(true)
      .accounts({
        voter: voter.publicKey,
        proposal: proposalAddress,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([voter])
      .rpc();

    const vote = await daoProgram.account.proposal.fetch(proposalAddress);
    console.log("Proposal voted successfully:", vote);
  });
});
