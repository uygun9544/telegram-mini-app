import "dotenv/config";
import { Telegraf, Markup } from "telegraf";

const botToken = process.env.BOT_TOKEN;
const miniAppUrl = process.env.MINI_APP_URL;

if (!botToken) {
  throw new Error("BOT_TOKEN is missing. Set BOT_TOKEN in environment variables.");
}

if (!miniAppUrl) {
  throw new Error("MINI_APP_URL is missing. Set MINI_APP_URL in environment variables.");
}

const bot = new Telegraf(botToken);

bot.start(async (ctx) => {
  await ctx.reply(
    "Готов потапать? Запускай игру 👇",
    Markup.inlineKeyboard([
      Markup.button.webApp("Играть", miniAppUrl),
    ])
  );
});

bot.command("play", async (ctx) => {
  await ctx.reply(
    "Готов потапать? Запускай игру 👇",
    Markup.inlineKeyboard([
      Markup.button.webApp("Играть", miniAppUrl),
    ])
  );
});

bot.launch();

const shutdown = async () => {
  await bot.stop();
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
