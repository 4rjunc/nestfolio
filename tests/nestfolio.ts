import { BankrunProvider, startAnchor } from "anchor-bankrun";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { Nestfolio } from "../target/types/nestfolio";

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
  });
});
