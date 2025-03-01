import { Bot } from "grammy";
import 'dotenv/config'
import { initDAO } from './program.js'; 
import { analyzeDAOInit, emergencyPause } from "./prompt.js"

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



// Commands
//await bot.api.setMyCommands([
//  { command: "start", description: "Start the bot" },
//  { command: "createDAO", description: "To Create DAO" },
//]);

bot.start();
