import {
  autoRetry,
  Bot,
  DenoKVAdapter,
  DOMParser,
  Element,
  InputMediaPhoto,
  session,
} from "../deps.deno.ts";
import { queueMiddleware } from "./middlewares/queueMiddleware.ts";
import { responseTime } from "./middlewares/responseTime.ts";
import { myContext } from "./types/myContext.ts";
import { chunk } from "./utilities/chunk.ts";

const BASE_URL = new URL("https://telegra.ph");

const kv = await Deno.openKv();
export const bot = new Bot<myContext>(Deno.env.get("TOKEN") || "");

bot.api.config.use(autoRetry());

bot.use(session({
  initial: () => ({ history: [] }),
  storage: new DenoKVAdapter(kv),
}));

bot.use(queueMiddleware());

bot.command("start", (ctx) => ctx.reply("Welcome! Send me a telegra.ph link!"));
bot.command("history", async (ctx) => {
  const history = ctx.session.history;
  const userHistory = history.filter((entry) =>
    entry.fromId === ctx.message?.from.id
  );

  if (userHistory.length === 0) {
    await ctx.reply("No history found.");
  } else {
    const historyMessages = userHistory.map((entry, index) => {
      // const date = new Date(entry.timestamp).toLocaleString();
      return `${index + 1}. - <a href="${entry.link}">${entry.title}</a>`;
    }).join("\n");

    await ctx.reply(historyMessages, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  }
});

bot.command("clear", async (ctx) => {
  const fromId = ctx.message?.from.id;

  if (fromId) {
    const userHistory = ctx.session.history.filter((entry) =>
      entry.fromId === fromId
    );
    if (userHistory.length > 0) {
      ctx.session.history = ctx.session.history.filter((entry) =>
        entry.fromId !== fromId
      );
      await ctx.reply("Your history has been cleared.");
    } else {
      await ctx.reply("You have no history to clear.");
    }
  } else {
    await ctx.reply("Error identifying user, cannot clear history.");
  }
});

bot.on("message:text", async (ctx) => {
  const inputText = ctx.message.text;
  const fromId = ctx.message.from.id;

  try {
    const url = new URL(inputText);

    if (url.hostname === "telegra.ph") {
      ctx.enqueueTask(async () => {
        const response = await fetch(url);
        const text = await response.text();

        const doc = new DOMParser().parseFromString(text, "text/html");
        if (!doc) {
          throw new Error("Failed to parse the page.");
        }

        const title = doc.title || "Untitled";

        const imgElements = doc.querySelectorAll("img");
        const imgSrcArray = [...imgElements].map((img) =>
          (img as Element).getAttribute("src")
        ).filter((src) => src !== null);

        await ctx.reply(`I found ${imgSrcArray.length} images on this page.`);

        if (imgSrcArray.length > 0) {
          const batches = chunk(imgSrcArray, 10);
          for (const batch of batches) {
            const mediaGroup = batch.map((src) =>
              ({
                type: "photo",
                media: new URL(src!, BASE_URL).toString(),
              }) as InputMediaPhoto
            );

            await ctx.replyWithMediaGroup(mediaGroup);
          }
        }

        ctx.session.history.push({
          link: inputText,
          timestamp: Date.now(),
          fromId,
          title,
        });
        await ctx.reply("saved to your history.");
      });
    } else {
      throw new TypeError("Invalid telegra.ph link.");
    }
  } catch (error) {
    if (error instanceof TypeError) {
      await ctx.reply(error.message);
    } else {
      await ctx.reply(`Error fetching or parsing the page: ${error.message}`);
    }
  }
});

bot.use(responseTime);
