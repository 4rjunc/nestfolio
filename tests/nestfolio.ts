import { BankrunProvider, startAnchor } from "anchor-bankrun";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Nestfolio } from "../target/types/nestfolio";
import { expect } from "chai";

const IDL = require("../target/idl/nestfolio.json");

const DAO_PROGRAM_ID = new PublicKey(
  "FXvTKSj5SXeRvaKqGxVc97pekvqN77btHBoZ4Qsn9iZX"
);

describe("Nestfolio DAO Initialization", () => {
  it("Initialize a DAO", async () => {
    const context = await startAnchor(
      "",
      [{ name: "nestfolio", programId: DAO_PROGRAM_ID }],
      []
    );
    const provider = new BankrunProvider(context);
    const daoProgram = new Program<Nestfolio>(IDL, provider);

    const creator = provider.wallet.publicKey;

    await daoProgram.methods
      .initializeOrganization("DAO", new anchor.BN(1000))
      .rpc();

    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), creator.toBuffer()],
      DAO_PROGRAM_ID
    );

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
});
