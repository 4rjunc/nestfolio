import { BankrunProvider, startAnchor } from "anchor-bankrun";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { Nestfolio } from "./nestfolio.json";
import { expect } from "chai";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system.js";

const IDL = require("./nestfolio.json");


const DAO_PROGRAM_ID = new PublicKey(
  "FXvTKSj5SXeRvaKqGxVc97pekvqN77btHBoZ4Qsn9iZX"
);

const keypairFile = "./wallet.json"
const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairFile)))
const keypair = anchor.web3.Keypair.fromSecretKey(secretKey)
const wallet = new anchor.Wallet(keypair)

const local = "http://127.0.0.1:8899"
const devnet = "https://api.devnet.solana.com"

const connection = new web3.Connection(devnet)

const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "processed"
})


//const provider = new anchor.AnchorProvider(connection, wallet, anchor.AnchorProvider.defaultOptions());

const IDL = JSON.parse(fs.readFileSync("./nestfolio.json", "utf-8"))

export async function initDAO(){

    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), creator.toBuffer()],
      DAO_PROGRAM_ID
    );

    await daoProgram.methods
      .initializeOrganization("DAO", new anchor.BN(1000))
      .rpc();

    const dao = await daoProgram.account.organisation.fetchNullable(daoAddress);

    console.log(dao);

}
