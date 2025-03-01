import { Bot } from "grammy";
import 'dotenv/config'
import { initDAO } from './program.js'; 
import { analyzeDAOInit } from "./prompt.js"

const token = process.env.BOT_API_KEY;
const bot = new Bot(token); 

// Reply to any message with "Hi there!".
bot.command("createDAO", async (ctx) => {
  console.log("ctx", ctx)
  const message = ctx.message; 
  const daoInitMsg = ctx.match;
  console.log("daoInitMsg", daoInitMsg)
  const daoInitJSON = await analyzeDAOInit(daoInitMsg);
  console.log("daoInitJSON", daoInitJSON);
  const daoAddress = await initDAO(daoInitJSON.daoName, daoInitJSON.registrationFee)
  ctx.reply(`DAO initialized at address: ${daoAddress}`);
});

// Commands
//await bot.api.setMyCommands([
//  { command: "start", description: "Start the bot" },
//  { command: "createDAO", description: "To Create DAO" },
//]);

bot.start();
