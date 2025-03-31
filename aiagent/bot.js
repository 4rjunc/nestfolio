// 1. Streamline command handlers : DONE 80%
// 2. Add supabase to store the wallet keys : telegram username , So when a user starts to interact with the Nestfolio bot. The wallet linked to the user name will be loaded and used for actions
// 2.1 DAO - Create Wallet✅, Create DAO✅ (Store DAO data in DB ❌), pause-dao ✅. resume-dao ✅, Check balance ✅
// 2.2 User - Create Wallet✅, Register as Member on a DAO ✅, Create Proposal✅ 
// 3.Rewrite the client code, since the code rn is shit and unable to understand. 

import { Bot, GrammyError, HttpError } from "grammy";
import { InlineKeyboard, Keyboard } from "grammy";
import { Keypair } from "@solana/web3.js";
import { createClient } from "@supabase/supabase-js";
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
  registerMember
} from "./program.js";
import { analyzeDAOInit, analyzeProposal } from "./prompt.js";


// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function saveDAODetails(username, daoName, daoAddress, registrationFee) {
  const { data, error } = await supabase
    .from('nestfolio-dao')
    .insert({
      dao_name: daoName,
      dao_address: daoAddress,
      registration_fee: registrationFee,
      telegram_username: username
    });

  if (error) {
    console.error('Failed to save DAO details:', error);
    throw new Error(`Failed to save DAO: ${error.message}`);
  }
  return data;
}

// Helper functions for wallet management
async function saveWallet(username, publicKey, privateKey) {
  const { data, error } = await supabase
    .from('nestfolio')
    .upsert({
      telegram_username: username,
      public_key: publicKey,
      private_key: privateKey,
      created_at: new Date()
    });

  if (error) throw new Error(`Failed to save wallet: ${error.message}`);
  return data;
}

async function getWallet(username) {
  const { data, error } = await supabase
    .from('nestfolio')
    .select('*')
    .eq('telegram_username', username)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { // No rows returned
      return null;
    }
    throw new Error(`Failed to fetch wallet: ${error.message}`);
  }
  return data;
}

async function loadKeypairFromPrivateKey(privateKeyHex) {
  const secretKey = Buffer.from(privateKeyHex, 'hex');

  //These lines are used for loading dummywallet during development
  //const dummyPrivateKey = Buffer.from(dummyKeypair).toString('hex');
  //const secretKey2 = Buffer.from(dummyPrivateKey, 'hex');

  return Keypair.fromSecretKey(secretKey);
}

async function getUserKeypair(username) {
  const walletData = await getWallet(username);
  if (!walletData) return null;
  return loadKeypairFromPrivateKey(walletData.private_key);
}

export function startBot() {
  const token = process.env.BOT_API_KEY;
  const bot = new Bot(token);

  // Define command handlers in one central object
  const commandHandlers = {

    // Balance command handler
    async balance(ctx) {
      const username = ctx.from.username;
      const secretKeyStr = await getUserKeypair(username);

      if (!secretKeyStr) {
        return ctx.reply("You don't have a wallet yet. Create one using /create-account");
      }
      const result = await getBalance(secretKeyStr);
      return ctx.reply(`${result}`);
    },

    // Create account command handler
    async "create-account"(ctx) {
      const username = ctx.from.username;
      console.log("username", username)
      const existingWallet = await getWallet(username);

      if (existingWallet) {
        return ctx.reply(
          `You already have a wallet!\n\n` +
          `📬 Public Address: ${existingWallet.public_key}\n\n` +
          `⚠️ If you need a new wallet, please contact support.`,
          {
            reply_markup: mainKeyboard
          }
        );
      }

      const keypair = Keypair.generate();
      const publicKey = keypair.publicKey.toString();
      const privateKey = Buffer.from(keypair.secretKey).toString('hex');

      // Save to Supabase
      await saveWallet(username, publicKey, privateKey);

      return ctx.reply(
        `🔑 New Solana Wallet Created and Linked to Your Account!\n\n` +
        `📬 Public Address: ${publicKey}\n\n` +
        //`🔐 Private Key: ${privateKey}\n\n` +
        //`⚠️ IMPORTANT: Save your private key securely and never share it with anyone!`,
        {
          reply_markup: mainKeyboard
        }
      );
    },

    // Deposit command handler
    async deposit(ctx) {
      const username = ctx.from.username;
      const keypair = await getUserKeypair(username);

      if (!keypair) {
        return ctx.reply("You don't have a wallet yet. Create one using /create-account");
      }

      const address = await depositFund(keypair);
      return ctx.reply(`Deposit Funds Here: ${address || walletData.public_key}`);
    },

    // Withdraw command handler // HOLD
    async withdraw(ctx) {
      try {
        const tx = await withdrawFund(0.1);
        return ctx.reply(`Withdraw hash: ${tx}`);
      } catch (error) {
        return ctx.reply(`Error withdrawFund: ${error.message}`);
      }
    },

    // Create DAO command handler (with parameters)
    async "create-dao"(ctx) {
      const username = ctx.from.username;
      const keypair = await getUserKeypair(username);

      if (!keypair) {
        return ctx.reply("You don't have a wallet yet. Create one using /create-account");
      }


      if (ctx.match) {
        const daoInitMsg = ctx.match;
        const daoInitJSON = await analyzeDAOInit(daoInitMsg);
        const daoAddress = await initDAO(
          keypair,
          daoInitJSON.daoName,
          daoInitJSON.registrationFee
        );

        // Save DAO details to Supabase
        //await saveDAODetails(
        //  username,
        //  daoInitJSON.daoName,
        //  daoAddress,
        //  daoInitJSON.registrationFee
        //);

        return ctx.reply(`DAO initialized at address: ${daoAddress}`);
      } else {
        return ctx.reply("Please use the command: /create-dao [name] [fee]");
      }
    },

    // Create proposal command handler (with parameters)
    async "create-proposal"(ctx) {

      const username = ctx.from.username;
      const keypair = await getUserKeypair(username);

      if (!keypair) {
        return ctx.reply("You don't have a wallet yet. Create one using /create-account");
      }

      console.log("create-proposal", username)

      if (ctx.match) {
        const message = ctx.match;
        const proposalJSON = await analyzeProposal(message);
        const tx = await createProposal(
          keypair,
          proposalJSON.title,
          proposalJSON.description,
          proposalJSON.deadline,
          proposalJSON.DAOaddress
        );
        return ctx.reply(`DAO create proposal: ${tx}`);
      } else {
        return ctx.reply("Please use the command: /create-proposal [details]");
      }
    },

    // Create proposal command handler (with parameters)
    async "register-member"(ctx) {

      const username = ctx.from.username;
      const keypair = await getUserKeypair(username);

      if (!keypair) {
        return ctx.reply("You don't have a wallet yet. Create one using /create-account");
      }

      console.log("register-member", username)

      if (username) {
        const message = ctx.match;
        const tx = await registerMember(keypair, message, username);
        return ctx.reply(`Member Registered: ${tx}`);
      } else {
        return ctx.reply("Please use the command: /create-proposal [details]");
      }
    },



    // Pause DAO command handler
    async "pause-dao"(ctx) {
      const username = ctx.from.username;
      const secretKeystr = await getUserKeypair(username);

      if (!secretKeystr) {
        return ctx.reply("You don't have a wallet yet. Create one using /create-account");
      }

      const tx = await emergencyPause(secretKeystr);
      return ctx.reply(`DAO emergency pause: ${tx}`);
    },

    // Resume DAO command handler
    async "resume-dao"(ctx) {
      const username = ctx.from.username;
      const secretKeystr = await getUserKeypair(username);

      if (!secretKeystr) {
        return ctx.reply("You don't have a wallet yet. Create one using /create-account");
      }

      console.log("resume-dao, username", username)

      const tx = await resumeOperations(secretKeystr);
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
    "🔑 Create Account": "create-account",
    "💸 Deposit": "deposit",
    "📤 Withdraw": "withdraw",
    "🚀 Create DAO": "create-dao",
    "📝 Create Proposal": "create-proposal",
    "⏸️ Pause DAO": "pause-dao",
    "▶️ Resume DAO": "resume-dao",
    //"🪂 Airdrop": "airdrop"
  };

  // Create inline keyboard for message buttons
  const mainInlineKeyboard = new InlineKeyboard()
    .text("💰 Check Balance", "balance")
    .text("🔑 Create Account", "create-account")
    .row()
    .text("💸 Deposit", "deposit")
    .text("📤 Withdraw", "withdraw")
    .row()
    .text("🚀 Create DAO", "create-dao")
    .text("📝 Create Proposal", "create-proposal")
    .row()
    .text("⏸️ Pause DAO", "pause-dao")
    .text("▶️ Resume DAO", "resume-dao")
  //.row()
  //.text("🪂 Airdrop", "airdrop");

  // Create regular keyboard for main reply keyboard
  const mainKeyboard = new Keyboard()
    .text("💰 Check Balance")
    .row()
    .text("💸 Deposit")
    .row()
    .text("⏸️ Pause DAO")
    .text("▶️ Resume DAO")
    .row()
    //.text("🪂 Airdrop")
    .resized();

  // Start command with both inline and reply keyboards
  bot.command("start", async (ctx) => {
    // First send welcome message with inline keyboard
    await ctx.reply(
      "🚀 *Welcome to Nestfolio!* 🚀\n\n" +
      "Your gateway to creating and managing DAOs on Solana.\n\n" +
      "🔹 *Available Commands:*\n\n" +
      "🏛️ */createDAO* - Launch your own DAO with custom name and fee\n" +
      "📝 */createProposal* - Submit new ideas to your community\n" +
      "⏸️ */pauseDAO* - Emergency pause all DAO operations\n" +
      "▶️ */resumeDAO* - Resume DAO functionality\n" +
      "💰 */deposit* - Fund your DAO treasury\n" +
      "🤝 */registerMember* - Join an existing DAO\n" +
      "💸 */withdraw* - Take funds from the treasury\n" +
      //"🪂 */airdrop* - Distribute tokens to members\n" +
      "💼 */balance* - Check current treasury balance\n" +
      "🔑 */createAccount* - Generate a new Solana wallet\n\n" +
      "✨ *Get started by creating your first DAO:*\n" +
      "*/createDAO [name] [fee]*",
      {
        parse_mode: "Markdown",
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
  bot.command("createDAO", (ctx) => commandHandlers["create-dao"](ctx));
  bot.command("createAccount", (ctx) => commandHandlers["create-account"](ctx));
  bot.command("createProposal", (ctx) => commandHandlers["create-proposal"](ctx));
  bot.command("pauseDAO", (ctx) => commandHandlers["pause-dao"](ctx));
  bot.command("resumeDAO", (ctx) => commandHandlers["resume-dao"](ctx));
  bot.command("DAOpause", (ctx) => commandHandlers["pause-dao"](ctx));
  bot.command("DAOresume", (ctx) => commandHandlers["resume-dao"](ctx));
  bot.command("registerMember", (ctx) => commandHandlers["register-member"](ctx));

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
