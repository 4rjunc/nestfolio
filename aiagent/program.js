import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram, TransactionInstruction, Transaction, sendAndConfirmTransaction, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
//import { Nestfolio } from "./nestfolio.json";
import { expect } from "chai";
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress,
  getAccount
} from '@solana/spl-token';
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system.js";
import * as fs from "fs"
import {BN} from "bn.js"

// Rent program ID
const RENT_PROGRAM_ID = new PublicKey('SysvarRent111111111111111111111111111111111');

//const IDL = JSON.parse(fs.readFileSync("./nestfolio.json", "utf-8"))

const DAO_PROGRAM_ID = new PublicKey(
  "FXvTKSj5SXeRvaKqGxVc97pekvqN77btHBoZ4Qsn9iZX"
);

const keypairFile = "./wallet.json"
const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairFile)))
const keypair = anchor.web3.Keypair.fromSecretKey(secretKey)
const wallet = new anchor.Wallet(keypair)

const member = "./wallet2.json"
const memberSecretKey = Uint8Array.from(JSON.parse(fs.readFileSync(member)))
const memberKeypair = anchor.web3.Keypair.fromSecretKey(memberSecretKey)
const memberWallet = new anchor.Wallet(memberKeypair)

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
  try {
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), keypair.publicKey.toBuffer()],
      DAO_PROGRAM_ID
    );
    
    // Check if the DAO account exists and is initialized
    const accountInfo = await connection.getAccountInfo(daoAddress);

    console.log("emergencyPause: ", daoAddress);
    
    const pauseDiscriminator = Buffer.from([21, 143, 27, 142, 200, 181, 210, 255]);
    const pauseTimestamp = Math.floor(Date.now() / 1000) + 3600;

    const timestampBuffer = Buffer.alloc(8);
    const timestampBN = new BN(pauseTimestamp);
    timestampBN.toArrayLike(Buffer, 'le', 8).copy(timestampBuffer);
    
    const pauseData = Buffer.concat([pauseDiscriminator, timestampBuffer]);
    
    console.log("Creating emergencyPause instruction...");
    const pauseInstruction = new TransactionInstruction({
      keys: [
        { pubkey: daoAddress, isSigner: false, isWritable: true }
      ],
      programId: DAO_PROGRAM_ID,
      data: pauseData
    });
    
    console.log("Sending emergency pause transaction...");
    const pauseTx = new Transaction().add(pauseInstruction);
    
    const signature = await sendAndConfirmTransaction(
      connection,
      pauseTx,
      [keypair]
    );
    
    console.log("Emergency pause transaction successful:", signature);
    console.log("Pause Transaction URL:", `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    return signature;
  } catch (err) {
    console.error("Error:", err.message);
    if (err.logs) {
      console.error("Logs:", err.logs);
    } else if (err.getLogs) {
      try {
        const logs = await err.getLogs();
        console.error("Logs:", logs);
      } catch (logErr) {
        console.error("Failed to retrieve logs");
      }
    }
    console.error("Stack:", err.stack);
    throw err;
  }
}

export async function resumeOperations(){
  try {
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), keypair.publicKey.toBuffer()],
      DAO_PROGRAM_ID
    );
    
    // Check if the DAO account exists and is initialized
    const accountInfo = await connection.getAccountInfo(daoAddress);

    console.log("resumeOperations: ", daoAddress);
    
    const pauseDiscriminator = Buffer.from([
        240,
        141,
        133,
        154,
        232,
        15,
        166,
        157
      ]);
    
    const resumeData = Buffer.concat([pauseDiscriminator]);
    
    console.log("Creating resume instruction...");
    const pauseInstruction = new TransactionInstruction({
      keys: [
        { pubkey: daoAddress, isSigner: false, isWritable: true }
      ],
      programId: DAO_PROGRAM_ID,
      data: resumeData
    });
    
    console.log("Sending emergency pause transaction...");
    const pauseTx = new Transaction().add(pauseInstruction);
    
    const signature = await sendAndConfirmTransaction(
      connection,
      pauseTx,
      [keypair]
    );
    
    console.log("Emergency resume transaction successful:", signature);
    console.log("Pause Transaction URL:", `https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    
    return signature;
  } catch (err) {
    console.error("Error:", err.message);
    if (err.logs) {
      console.error("Logs:", err.logs);
    } else if (err.getLogs) {
      try {
        const logs = await err.getLogs();
        console.error("Logs:", logs);
      } catch (logErr) {
        console.error("Failed to retrieve logs");
      }
    }
    console.error("Stack:", err.stack);
    throw err;
  }
}

export async function createProposal(title, description, expiryTime) {
  console.log("title", title, "description", description, "expiryTime", expiryTime);

  try {

    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), keypair.publicKey.toBuffer()],
      DAO_PROGRAM_ID
    );

    const daoAccountInfo = await connection.getAccountInfo(daoAddress);
    if (!daoAccountInfo) {
      throw new Error(`DAO account ${daoAddress.toString()} does not exist. Initialize the DAO first.`);
    }

    const [proposalAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        keypair.publicKey.toBuffer(),
        daoAddress.toBuffer(),
        Buffer.from(title),
      ],
      DAO_PROGRAM_ID
    );
    
    // Prepend the discriminator
    const instructionDiscriminator = Buffer.from([
        132,
        116,
        68,
        174,
        216,
        160,
        198,
        22
      ]); 
    // This would be your proposal's discriminator
    
    // Encode the title
    const titleData = Buffer.alloc(4 + title.length);
    titleData.writeUInt32LE(title.length, 0);
    Buffer.from(title).copy(titleData, 4);
    
    // Encode the description
    const descriptionData = Buffer.alloc(4 + description.length);
    descriptionData.writeUInt32LE(description.length, 0);
    Buffer.from(description).copy(descriptionData, 4);
    
    // Encode the expiry time (i64)
    const expiryData = Buffer.alloc(8);
    new BN(expiryTime).toArrayLike(Buffer, 'le', 8).copy(expiryData);
    
    // Combine all the data
    const data = Buffer.concat([
      instructionDiscriminator,
      titleData,
      descriptionData,
      expiryData
    ]);    

    console.log("Creating createProposal instruction...", daoAddress, proposalAddress);

    const proposalInstruction = new TransactionInstruction({
      keys: [
        { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: proposalAddress, isSigner: false, isWritable: true },
        { pubkey: daoAddress, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: DAO_PROGRAM_ID,
      data
    });    

    // Create and send transaction
    console.log("Sending transaction...");
    const proposalTransaction = new Transaction().add(proposalInstruction);
    const proposalSignature = await sendAndConfirmTransaction(
      connection,
      proposalTransaction,
      [keypair],
      { commitment: 'confirmed' }
    );
    
    console.log("Transaction successful:", proposalSignature);
    console.log("Transaction URL:", `https://explorer.solana.com/tx/${proposalSignature}?cluster=devnet`);
    
    return proposalAddress;
  } catch (err) {
    console.error("Error:", err.message);
    console.error("Stack:", err.stack);
  }
}
