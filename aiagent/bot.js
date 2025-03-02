import { Bot, GrammyError, HttpError } from "grammy";
import 'dotenv/config'
import { initDAO, emergencyPause, resumeOperations, createProposal } from './program.js'; 
import { analyzeDAOInit, analyzeProposal } from "./prompt.js"

const token = process.env.BOT_API_KEY;
const bot = new Bot(token); 

// Reply to any message with "Hi there!".
bot.command("createDAO", async (ctx) => {
  console.log("ctx", ctx)
  const message = ctx.message; 
  const daoInitMsg = ctx.match;
  const daoInitJSON = await analyzeDAOInit(daoInitMsg);
  const daoAddress = await initDAO(daoInitJSON.daoName, daoInitJSON.registrationFee)
  ctx.reply(`DAO initialized at address: ${daoAddress}`);
});

bot.command("DAOpause", async (ctx) => {
  console.log("ctx", ctx)
  const message = ctx.message; 
  const tx = await emergencyPause();
  ctx.reply(`DAO emergency pause: ${tx}`);
});

bot.command("DAOresume", async (ctx) => {
  console.log("ctx", ctx)
  const message = ctx.message; 
  const tx = await resumeOperations();
  ctx.reply(`DAO emergency pause: ${tx}`);
});

bot.command("createProposal", async (ctx) => {
  console.log("ctx", ctx)
  const message = ctx.match; 
  const proposalJSON = await analyzeProposal(message)
  console.log("proposalJSON", proposalJSON)
  const tx = await createProposal(proposalJSON.title, proposalJSON.description, proposalJSON.deadline);
  ctx.reply(`DAO create proposal: ${tx}`);
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

bot.start();
