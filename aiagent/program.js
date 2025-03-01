import { BankrunProvider, startAnchor } from "anchor-bankrun";
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, TransactionInstruction, Transaction, sendAndConfirmTransaction, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
//import { Nestfolio } from "./nestfolio.json";
import { expect } from "chai";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system.js";
import * as fs from "fs"
import {BN} from "bn.js"

//const IDL = JSON.parse(fs.readFileSync("./nestfolio.json", "utf-8"))

const DAO_PROGRAM_ID = new PublicKey(
  "FXvTKSj5SXeRvaKqGxVc97pekvqN77btHBoZ4Qsn9iZX"
);

const keypairFile = "./wallet.json"
const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairFile)))
const keypair = anchor.web3.Keypair.fromSecretKey(secretKey)
const wallet = new anchor.Wallet(keypair)

const local = "http://127.0.0.1:8899"
const devnet = "https://api.devnet.solana.com"

const connection = new Connection(local)

const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "processed"
})

console.log("Verifying program exists...");
const programInfo = await connection.getAccountInfo(DAO_PROGRAM_ID);
if (programInfo) {
  console.log("Program found on devnet!");
  console.log(`Program is executable: ${programInfo.executable}`);
} else {
  console.log("Program NOT found on devnet!");
}


//const provider = new anchor.AnchorProvider(connection, wallet, anchor.AnchorProvider.defaultOptions());

export async function initDAO(daoName, registrationFee){
   // DAO
  console.log("daoName", daoName, "registrationFee", registrationFee);
  try{
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), keypair.publicKey.toBuffer()],
      DAO_PROGRAM_ID
    );

    // Prepend the discriminator
    const discriminator = Buffer.from([21, 20, 253, 138, 250, 160, 119, 87]);

    // 2. Encode the DAO name string
    //const daoName = daoName;
    const nameBuffer = Buffer.alloc(4 + daoName.length);
    nameBuffer.writeUInt32LE(daoName.length, 0); // Length prefix (4 bytes)
    Buffer.from(daoName).copy(nameBuffer, 4);    // String content

    // 3. Encode the member registration fee (1000 as a u64 / 8 bytes)
    const feeBuffer = Buffer.alloc(8);
    const fee = new BN(registrationFee * LAMPORTS_PER_SOL);
    fee.toArrayLike(Buffer, 'le', 8).copy(feeBuffer);

    // 4. Combine all parts
    const completeData = Buffer.concat([discriminator, nameBuffer, feeBuffer]);

    console.log("Creating initializeOrganization instruction...");
    const DAOinstruction = new TransactionInstruction({
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: daoAddress, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: DAO_PROGRAM_ID,
      data: completeData
    });

    // Create and send transaction
    console.log("Sending transaction...");
    const DAOtransaction = new Transaction().add(DAOinstruction);
    const DAOsignature = await sendAndConfirmTransaction(
      connection,
      DAOtransaction,
      [keypair] 
    );

    console.log("Transaction successful:", DAOsignature);
    console.log("Transaction URL:", `https://explorer.solana.com/tx/${DAOsignature}?cluster=devnet`);

    return daoAddress;
  } catch (err) {
    console.error("Error:", err.message);
    console.error("Stack:", err.stack);
  }
}

export async function emergencyPause(){
  try{
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), keypair.publicKey.toBuffer()],
      DAO_PROGRAM_ID
    );

    const discriminator = Buffer.from([
        21,
        143,
        27,
        142,
        200,
        181,
        210,
        255
      ]);


    const pauseTimestamp = Math.floor(Date.now() / 1000) + 3600;
    
    // 2. Encode the DAO name string
    const timestampBuffer = Buffer.alloc(8);
    const timestampBN = new BN(pauseTimestamp);
    timestampBN.toArrayLike(Buffer, 'le', 8).copy(timestampBuffer);

    // 4. Combine all parts
    const completeData = Buffer.concat([discriminator, timestampBuffer]);

    console.log("Creating emergencyPause instruction...");
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: creator.publicKey, isSigner: true, isWritable: false }, // Assuming creator is authorized to pause
        { pubkey: daoAddress, isSigner: false, isWritable: true }
      ],
      programId: DAO_PROGRAM_ID,
      data: completeData
    });

    // Create and send transaction
    console.log("Sending transaction...");
    const transaction = new Transaction().add(instruction);
     const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [creator]
      );

      console.log("Emergency pause transaction successful:", signature);
      console.log("Transaction URL:", `https://explorer.solana.com/tx/${signature}?cluster=devnet`);

    return signature;
  } catch (err) {
    console.error("Error:", err.message);
    console.error("Stack:", err.stack);
  }
}
