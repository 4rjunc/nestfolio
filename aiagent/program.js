import * as anchor from "@coral-xyz/anchor";
import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  Transaction,
  sendAndConfirmTransaction,
  Connection,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as fs from "fs";
import { BN } from "bn.js";

const DAO_PROGRAM_ID = new PublicKey(
  "FmvHXQmUhsY1SYmQgysUC3wJjM4JQCsGHwHnsfw1YDUs"
);

const keypairFile = "./wallet.json";
const secretKey = Uint8Array.from(JSON.parse(fs.readFileSync(keypairFile)));
const keypair = anchor.web3.Keypair.fromSecretKey(secretKey);
const wallet = new anchor.Wallet(keypair);

const local = "http://127.0.0.1:8899";
const devnet = "https://api.devnet.solana.com";

const connection = new Connection(local);

const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "processed",
});

console.log("Verifying program exists...");
const programInfo = await connection.getAccountInfo(DAO_PROGRAM_ID);
if (programInfo) {
  console.log("Program found on devnet!");
  console.log(`Program is executable: ${programInfo.executable}`);
} else {
  console.log("Program NOT found on devnet!");
}

export async function initDAO(daoName, registrationFee) {
  console.log("daoName", daoName, "registrationFee", registrationFee);
  try {
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), keypair.publicKey.toBuffer()],
      DAO_PROGRAM_ID
    );

    const discriminator = Buffer.from([21, 20, 253, 138, 250, 160, 119, 87]);

    const nameBuffer = Buffer.alloc(4 + daoName.length);
    nameBuffer.writeUInt32LE(daoName.length, 0);
    Buffer.from(daoName).copy(nameBuffer, 4);

    const feeBuffer = Buffer.alloc(8);
    const fee = new BN(registrationFee * LAMPORTS_PER_SOL);
    fee.toArrayLike(Buffer, "le", 8).copy(feeBuffer);

    const completeData = Buffer.concat([discriminator, nameBuffer, feeBuffer]);

    console.log("Creating initializeOrganization instruction...");
    const DAOinstruction = new TransactionInstruction({
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: daoAddress, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: DAO_PROGRAM_ID,
      data: completeData,
    });

    console.log("Sending transaction...");
    const DAOtransaction = new Transaction().add(DAOinstruction);
    const DAOsignature = await sendAndConfirmTransaction(
      connection,
      DAOtransaction,
      [keypair]
    );

    console.log("Transaction successful:", DAOsignature);
    console.log(
      "Transaction URL:",
      `https://explorer.solana.com/tx/${DAOsignature}?cluster=devnet`
    );

    return daoAddress;
  } catch (err) {
    console.error("Error:", err.message);
    console.error("Stack:", err.stack);
  }
}

export async function emergencyPause() {
  try {
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), keypair.publicKey.toBuffer()],
      DAO_PROGRAM_ID
    );

    console.log("emergencyPause: ", daoAddress);

    const pauseDiscriminator = Buffer.from([
      21, 143, 27, 142, 200, 181, 210, 255,
    ]);
    const pauseTimestamp = Math.floor(Date.now() / 1000) + 3600;

    const timestampBuffer = Buffer.alloc(8);
    const timestampBN = new BN(pauseTimestamp);
    timestampBN.toArrayLike(Buffer, "le", 8).copy(timestampBuffer);

    const pauseData = Buffer.concat([pauseDiscriminator, timestampBuffer]);

    console.log("Creating emergencyPause instruction...");
    const pauseInstruction = new TransactionInstruction({
      keys: [{ pubkey: daoAddress, isSigner: false, isWritable: true }],
      programId: DAO_PROGRAM_ID,
      data: pauseData,
    });

    console.log("Sending emergency pause transaction...");
    const pauseTx = new Transaction().add(pauseInstruction);

    const signature = await sendAndConfirmTransaction(connection, pauseTx, [
      keypair,
    ]);

    console.log("Emergency pause transaction successful:", signature);
    console.log(
      "Pause Transaction URL:",
      `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    );

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

export async function resumeOperations() {
  try {
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), keypair.publicKey.toBuffer()],
      DAO_PROGRAM_ID
    );

    console.log("resumeOperations: ", daoAddress);

    const pauseDiscriminator = Buffer.from([
      240, 141, 133, 154, 232, 15, 166, 157,
    ]);

    const resumeData = Buffer.concat([pauseDiscriminator]);

    console.log("Creating resume instruction...");
    const pauseInstruction = new TransactionInstruction({
      keys: [{ pubkey: daoAddress, isSigner: false, isWritable: true }],
      programId: DAO_PROGRAM_ID,
      data: resumeData,
    });

    console.log("Sending resume operation transaction...");
    const pauseTx = new Transaction().add(pauseInstruction);

    const signature = await sendAndConfirmTransaction(connection, pauseTx, [
      keypair,
    ]);

    console.log("Emergency resume transaction successful:", signature);
    console.log(
      "Pause Transaction URL:",
      `https://explorer.solana.com/tx/${signature}?cluster=devnet`
    );

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
  console.log(
    "title",
    title,
    "description",
    description,
    "expiryTime",
    expiryTime
  );

  try {
    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), keypair.publicKey.toBuffer()],
      DAO_PROGRAM_ID
    );

    const daoAccountInfo = await connection.getAccountInfo(daoAddress);
    if (!daoAccountInfo) {
      throw new Error(
        `DAO account ${daoAddress.toString()} does not exist. Initialize the DAO first.`
      );
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

    const instructionDiscriminator = Buffer.from([
      132, 116, 68, 174, 216, 160, 198, 22,
    ]);

    const titleData = Buffer.alloc(4 + title.length);
    titleData.writeUInt32LE(title.length, 0);
    Buffer.from(title).copy(titleData, 4);

    const descriptionData = Buffer.alloc(4 + description.length);
    descriptionData.writeUInt32LE(description.length, 0);
    Buffer.from(description).copy(descriptionData, 4);

    const expiryData = Buffer.alloc(8);
    new BN(expiryTime).toArrayLike(Buffer, "le", 8).copy(expiryData);

    const data = Buffer.concat([
      instructionDiscriminator,
      titleData,
      descriptionData,
      expiryData,
    ]);

    console.log(
      "Creating createProposal instruction...",
      daoAddress,
      proposalAddress
    );

    const proposalInstruction = new TransactionInstruction({
      keys: [
        { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
        { pubkey: proposalAddress, isSigner: false, isWritable: true },
        { pubkey: daoAddress, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: DAO_PROGRAM_ID,
      data,
    });

    console.log("Sending transaction...");
    const proposalTransaction = new Transaction().add(proposalInstruction);
    const proposalSignature = await sendAndConfirmTransaction(
      connection,
      proposalTransaction,
      [keypair],
      { commitment: "confirmed" }
    );

    console.log("Transaction successful:", proposalSignature);
    console.log(
      "Transaction URL:",
      `https://explorer.solana.com/tx/${proposalSignature}?cluster=devnet`
    );

    return proposalAddress;
  } catch (err) {
    console.error("Error:", err.message);
    console.error("Stack:", err.stack);
  }
}

export async function depositFund() {
  const [daoAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("organization"), wallet.publicKey.toBuffer()],
    DAO_PROGRAM_ID
  );

  const [treasuryAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury"), daoAddress.toBuffer()],
    DAO_PROGRAM_ID
  );

  return treasuryAddress;
}

export async function airdrop() {
  const [daoAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("organization"), wallet.publicKey.toBuffer()],
    DAO_PROGRAM_ID
  );

  const [treasuryAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury"), daoAddress.toBuffer()],
    DAO_PROGRAM_ID
  );

  await provider.connection.confirmTransaction(
    await provider.connection.requestAirdrop(
      treasuryAddress,
      5 * anchor.web3.LAMPORTS_PER_SOL
    ),
    "confirmed"
  );

  const balance = await provider.connection.getBalance(treasuryAddress);

  const balanceInSol = Number(balance) / anchor.web3.LAMPORTS_PER_SOL;
  console.log(`Balance: ${balanceInSol} SOL`);
}

export async function getBalance() {
  const [daoAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("organization"), wallet.publicKey.toBuffer()],
    DAO_PROGRAM_ID
  );

  const [treasuryAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury"), daoAddress.toBuffer()],
    DAO_PROGRAM_ID
  );

  const balance = await provider.connection.getBalance(treasuryAddress);

  const balanceInSol = Number(balance) / anchor.web3.LAMPORTS_PER_SOL;
  return `Balance: ${balanceInSol} SOL`;
}

export async function getProposals() {
  const [daoAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("organization"), wallet.publicKey.toBuffer()],
    DAO_PROGRAM_ID
  );
  const dao = await daoProgram.account.organisation.fetchNullable(daoAddress);
  if (!dao) {
    throw new Error("DAO not found!");
  }

  let proposalText = `DAO Name: ${dao.name}\n\n`;

  if (!dao.proposalList || dao.proposalList.length === 0) {
    proposalText += "No proposals found.";
    return proposalText;
  }

  for (const proposalAddress of dao.proposalList) {
    const proposal = await daoProgram.account.proposal.fetchNullable(
      proposalAddress
    );
    if (!proposal) continue;

    proposalText += `Proposal: ${proposal.title}\n`;
    proposalText += `Description: ${proposal.description}\n`;
    proposalText += `Proposer: ${proposal.proposer.toBase58()}\n`;
    proposalText += `Up Votes: ${proposal.upVotes.toString()}\n`;
    proposalText += `Down Votes: ${proposal.downVotes.toString()}\n`;
    proposalText += `Status: ${proposal.status}\n`;
    proposalText += `Expiry: ${new Date(
      proposal.expiryTime.toNumber() * 1000
    ).toISOString()}\n\n`;
  }

  return proposalText;
}

export async function withdrawFund(amount) {
  try {
    const withdrawAmount = amount
      ? new BN(amount * LAMPORTS_PER_SOL)
      : new BN(0.1 * LAMPORTS_PER_SOL);

    console.log("withdrawFund, withdrawAmount:", withdrawAmount);

    const [daoAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("organization"), keypair.publicKey.toBuffer()],
      DAO_PROGRAM_ID
    );

    const [treasuryAddress, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury"), daoAddress.toBuffer()],
      DAO_PROGRAM_ID
    );

    const treasuryBalance = await connection.getBalance(treasuryAddress);
    const treasuryBalanceInSol = Number(treasuryBalance) / LAMPORTS_PER_SOL;

    console.log(`Treasury Balance: ${treasuryBalanceInSol} SOL`);

    if (treasuryBalance < withdrawAmount.toNumber()) {
      console.log("Insufficient funds in treasury");
      return `Error: Insufficient funds. Treasury only has ${treasuryBalanceInSol} SOL`;
    }

    const discriminator = Buffer.from([251, 169, 221, 19, 158, 53, 139, 10]);

    const amountBuffer = Buffer.alloc(8);
    withdrawAmount.toArrayLike(Buffer, "le", 8).copy(amountBuffer);

    const bumpBuffer = Buffer.alloc(1);
    bumpBuffer.writeUInt8(treasuryBump, 0);

    const completeData = Buffer.concat([
      discriminator,
      amountBuffer,
      bumpBuffer,
    ]);

    console.log("Creating withdrawFund instruction...");
    const withdrawInstruction = new TransactionInstruction({
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: daoAddress, isSigner: false, isWritable: true },
        { pubkey: treasuryAddress, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: DAO_PROGRAM_ID,
      data: completeData,
    });

    console.log(
      `Sending withdrawal transaction for ${
        withdrawAmount.toNumber() / LAMPORTS_PER_SOL
      } SOL...`
    );
    const withdrawTransaction = new Transaction().add(withdrawInstruction);
    const withdrawSignature = await sendAndConfirmTransaction(
      connection,
      withdrawTransaction,
      [keypair]
    );

    console.log("Withdrawal transaction successful:", withdrawSignature);
    console.log(
      "Transaction URL:",
      `https://explorer.solana.com/tx/${withdrawSignature}?cluster=devnet`
    );

    const treasuryBalanceAfter = await connection.getBalance(treasuryAddress);
    const treasuryBalanceAfterInSol =
      Number(treasuryBalanceAfter) / LAMPORTS_PER_SOL;
    console.log(
      `Treasury Balance After Withdrawal: ${treasuryBalanceAfterInSol} SOL`
    );

    return `Funds withdrawn successfully. Transaction: ${withdrawSignature}`;
  } catch (err) {
    console.error("Error:", err.message);

    if (err.message.includes("insufficient funds")) {
      return "Error: Insufficient funds in the treasury for this withdrawal.";
    }

    return `Error withdrawing funds: ${err.message}`;
  }
}
