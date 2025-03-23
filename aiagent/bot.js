import { Bot, GrammyError, HttpError } from "grammy";
import { InlineKeyboard, Keyboard } from "grammy";
import { Keypair } from "@solana/web3.js";
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

  // Define command handlers in one central object
  const commandHandlers = {

    // Balance command handler
    async balance(ctx) {
      const result = await getBalance();
      return ctx.reply(`${result}`);
    },

    // Create account command handler
    async createAccount(ctx) {
      const keypair = Keypair.generate();
      const publicKey = keypair.publicKey.toString();
      const privateKey = Buffer.from(keypair.secretKey).toString('hex');

      return ctx.reply(
        `🔑 New Solana Wallet Created!\n\n` +
        `📬 Public Address: ${publicKey}\n\n` +
        `🔐 Private Key: ${privateKey}\n\n` +
        `⚠️ IMPORTANT: Save your private key securely and never share it with anyone!`,
        {
          reply_markup: mainKeyboard
        }
      );
    },

    // Deposit command handler
    async deposit(ctx) {
      const address = await depositFund();
      return ctx.reply(`Deposit Funds Here: ${address}`);
    },

    // Withdraw command handler
    async withdraw(ctx) {
      try {
        const tx = await withdrawFund(0.1);
        return ctx.reply(`Withdraw hash: ${tx}`);
      } catch (error) {
        return ctx.reply(`Error withdrawFund: ${error.message}`);
      }
    },

    // Create DAO command handler (with parameters)
    async createDAO(ctx) {
      if (ctx.match) {
        const daoInitMsg = ctx.match;
        const daoInitJSON = await analyzeDAOInit(daoInitMsg);
        const daoAddress = await initDAO(
          daoInitJSON.daoName,
          daoInitJSON.registrationFee
        );
        return ctx.reply(`DAO initialized at address: ${daoAddress}`);
      } else {
        return ctx.reply("Please use the command: /createDAO [name] [fee]");
      }
    },

    // Create proposal command handler (with parameters)
    async createProposal(ctx) {
      if (ctx.match) {
        const message = ctx.match;
        const proposalJSON = await analyzeProposal(message);
        const tx = await createProposal(
          proposalJSON.title,
          proposalJSON.description,
          proposalJSON.deadline
        );
        return ctx.reply(`DAO create proposal: ${tx}`);
      } else {
        return ctx.reply("Please use the command: /createProposal [details]");
      }
    },

    // Pause DAO command handler
    async pauseDAO(ctx) {
      const tx = await emergencyPause();
      return ctx.reply(`DAO emergency pause: ${tx}`);
    },

    // Resume DAO command handler
    async resumeDAO(ctx) {
      const tx = await resumeOperations();
      return ctx.reply(`DAO operations resumed: ${tx}`);
    },

    // Airdrop command handler
    async airdrop(ctx) {
      await airdrop();
      return ctx.reply(`Airdropped!`);
    }
  };

  // Define mapping between button text and command handlers
  const textToCommandMap = {
    "💰 Check Balance": "balance",
    "🔑 Create Account": "createAccount",
    "💸 Deposit": "deposit",
    "📤 Withdraw": "withdraw",
    "🚀 Create DAO": "createDAO",
    "📝 Create Proposal": "createProposal",
    "⏸️ Pause DAO": "pauseDAO",
    "▶️ Resume DAO": "resumeDAO",
    "🪂 Airdrop": "airdrop"
  };

  // Create inline keyboard for message buttons
  const mainInlineKeyboard = new InlineKeyboard()
    .text("💰 Check Balance", "balance")
    .text("🔑 Create Account", "createAccount")
    .row()
    .text("💸 Deposit", "deposit")
    .text("📤 Withdraw", "withdraw")
    .row()
    .text("🚀 Create DAO", "createDAO")
    .text("📝 Create Proposal", "createProposal")
    .row()
    .text("⏸️ Pause DAO", "pauseDAO")
    .text("▶️ Resume DAO", "resumeDAO")
    .row()
    .text("🪂 Airdrop", "airdrop");

  // Create regular keyboard for main reply keyboard
  const mainKeyboard = new Keyboard()
    .text("💰 Check Balance")
    .row()
    .text("💸 Deposit")
    .row()
    .text("⏸️ Pause DAO")
    .text("▶️ Resume DAO")
    .row()
    .text("🪂 Airdrop")
    .resized();

  // Start command with both inline and reply keyboards
  bot.command("start", async (ctx) => {
    // First send welcome message with inline keyboard
    await ctx.reply(
      "Welcome to the Nestfolio Bot! You can use the buttons below or these commands:\n\n" +
      "/createDAO [parameters] - Initialize a new DAO with name and registration fee\n" +
      "/createProposal [details] - Create a new proposal with title, description and deadline\n" +
      "/pauseDAO - Emergency pause of DAO operations\n" +
      "/resumeDAO - Resume DAO operations after pause\n" +
      "/deposit - Get address to deposit funds\n" +
      "/withdraw - Withdraw funds from the DAO\n" +
      "/airdrop - Trigger token airdrop\n" +
      "/balance - Check current DAO balance\n" +
      "/createAccount - Create a new Solana wallet\n\n" +
      "To get started, try creating a DAO with /createDAO [name] [fee]",
      {
        reply_markup: mainInlineKeyboard
      }
    );

    // Then send a message with the main keyboard
    //await ctx.reply(
    //  "You can also use these persistent keyboard buttons:",
    //  {
    //    reply_markup: mainKeyboard
    //  }
    //);
  });

  // Setup callback query handlers for inline buttons
  Object.keys(commandHandlers).forEach(command => {
    // Register callback query handlers
    bot.callbackQuery(command, async (ctx) => {
      await ctx.answerCallbackQuery(); // Answer callback to remove loading state
      return commandHandlers[command](ctx);
    });

    // Register command handlers (/command)
    bot.command(command, (ctx) => commandHandlers[command](ctx));
  });

  // Register text handlers for keyboard buttons
  Object.keys(textToCommandMap).forEach(buttonText => {
    const command = textToCommandMap[buttonText];
    bot.hears(buttonText, (ctx) => commandHandlers[command](ctx));
  });

  // Backward compatibility for old command names
  bot.command("DAOpause", (ctx) => commandHandlers.pauseDAO(ctx));
  bot.command("DAOresume", (ctx) => commandHandlers.resumeDAO(ctx));

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
