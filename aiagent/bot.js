import { Bot, GrammyError, HttpError } from "grammy";
import "dotenv/config";
import {
  initDAO,
  emergencyPause,
  resumeOperations,
  createProposal,
  depositFund,
  airdrop,
  getBalance,
  withdrawFund,
} from "./program.js";
import { analyzeDAOInit, analyzeProposal } from "./prompt.js";

export function startBot() {
  const token = process.env.BOT_API_KEY;
  const bot = new Bot(token);

  bot.command("start", async (ctx) => {
    ctx.reply(
      "Welcome to the Nestfolio Bot! Here are the available commands:\n\n" +
      "/createDAO [parameters] - Initialize a new DAO with name and registration fee\n" +
      "/createProposal [details] - Create a new proposal with title, description and deadline\n" +
      "/DAOpause - Emergency pause of DAO operations\n" +
      "/DAOresume - Resume DAO operations after pause\n" +
      "/deposit - Get address to deposit funds\n" +
      "/withdraw - Withdraw funds from the DAO\n" +
      "/airdrop - Trigger token airdrop\n" +
      "/balance - Check current DAO balance\n\n" +
      "To get started, try creating a DAO with /createDAO [name] [fee]"
    );
  });

  bot.command("createDAO", async (ctx) => {
    const daoInitMsg = ctx.match;
    const daoInitJSON = await analyzeDAOInit(daoInitMsg);
    const daoAddress = await initDAO(
      daoInitJSON.daoName,
      daoInitJSON.registrationFee
    );
    ctx.reply(`DAO initialized at address: ${daoAddress}`);
  });

  bot.command("DAOpause", async (ctx) => {
    const tx = await emergencyPause();
    ctx.reply(`DAO emergency pause: ${tx}`);
  });

  bot.command("DAOresume", async (ctx) => {
    const tx = await resumeOperations();
    ctx.reply(`DAO emergency pause: ${tx}`);
  });

  bot.command("createProposal", async (ctx) => {
    const message = ctx.match;
    const proposalJSON = await analyzeProposal(message);
    const tx = await createProposal(
      proposalJSON.title,
      proposalJSON.description,
      proposalJSON.deadline
    );
    ctx.reply(`DAO create proposal: ${tx}`);
  });

  bot.command("deposit", async (ctx) => {
    const address = await depositFund();
    ctx.reply(`Deposit Funds Here: ${address}`);
  });

  bot.command("airdrop", async (ctx) => {
    await airdrop();
    ctx.reply(`Airdropped!`);
  });

  bot.command("balance", async (ctx) => {
    const result = await getBalance();
    ctx.reply(`${result}`);
  });

  bot.command("withdraw", async (ctx) => {
    try {
      const tx = await withdrawFund(0.1);
      ctx.reply(`Withdraw hash: ${tx}`);
    } catch (error) {
      ctx.reply(`Error withdrawFund: ${error.message}`);
    }
  });

  bot.catch((err) => {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error("Error in request:", e.description);
    } else if (e instanceof HttpError) {
      console.error("Could not contact Telegram:", e);
    } else {
      console.error("Unknown error:", e);
    }
  });

  // Start the bot
  bot.start();

  // Return bot with stop method for clean shutdown
  return {
    bot,
    stop: () => bot.stop()
  };
}
