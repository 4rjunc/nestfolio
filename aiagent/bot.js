import { Bot } from "grammy";
import 'dotenv/config'
import { initializeDAO } from './program.js'; 

const token = process.env.BOT_API_KEY;
const bot = new Bot(token); 

// Reply to any message with "Hi there!".
bot.on("message", async (ctx) => {
  const { daoAddress, daoProgram, creator, member, voter } = await initializeDAO();
  ctx.reply(`DAO initialized at address: ${daoAddress.toString()}`);
});

bot.start();
