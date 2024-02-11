import {
  autoRetry,
  Bot,
  DenoKVAdapter,
  DOMParser,
  Element,
  InputMediaPhoto,
  Menu,
  session,
  InputMediaBuilder,
} from "../deps.deno.ts";
import { eventEmitter } from "../queue/eventEmitter.ts";
import { taskQueue } from "../queue/processQueue.ts";
import { TELEGRAPH_URL } from "../utils/constants.ts";
import { getEnvOrThrow } from "../utils/misc.ts";
import { responseTime } from "./middlewares/responseTime.ts";
import { myContext } from "./types/myContext.ts";
import { sessionData } from "./types/sessionData.ts";
import { chunk } from "./utilities/chunk.ts";

const kv = await Deno.openKv();

const BOT_TOKEN = getEnvOrThrow("TOKEN");
export const bot = new Bot<myContext>(BOT_TOKEN);

const clearHistoryMenu = new Menu<myContext>("clear_history")
  .text("Yes", async (ctx) => {
    ctx.menu.close();
    await ctx.editMessageText("Clearing your history...");

    const fromId = ctx.from.id;
    ctx.session.history = ctx.session.history.filter(
      (entry) => entry.fromId !== fromId
    );
    await ctx.editMessageText("Your history has been cleared.");
  })
  .row()
  .text("No", async (ctx) => {
    ctx.menu.close();
    await ctx.editMessageText("Your history has not been cleared.");
  });

bot.api.config.use(autoRetry());
bot.use(responseTime);
bot.use(
  session({
    initial: () => ({ history: [] }),
    storage: new DenoKVAdapter(kv),
  })
);
bot.use(clearHistoryMenu);

bot.command("start", (ctx) => ctx.reply("Welcome! Send me a telegra.ph link!"));
bot.command("history", async (ctx) => {
  const history = ctx.session.history;
  const userHistory = history.filter(
    (entry) => entry.fromId === ctx.message?.from.id
  );

  if (userHistory.length === 0) {
    await ctx.reply("No history found.");
  } else {
    const historyMessages = userHistory
      .map((entry, index) => {
        // const date = new Date(entry.timestamp).toLocaleString();
        return `${index + 1}. <a href="${entry.link}">${entry.title}</a>`;
      })
      .join("\n");

    await ctx.reply(historyMessages, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  }
});

bot.command("clear", async (ctx) => {
  const fromId = ctx.message?.from.id;

  if (fromId) {
    const userHistory = ctx.session.history.filter(
      (entry) => entry.fromId === fromId
    );
    if (userHistory.length > 0) {
      // ask user permission before clear
      await ctx.reply("Clear your history?", {
        reply_markup: clearHistoryMenu,
      });
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
      const sessionKey = ["sessions", ctx.chat.id.toString()];

      taskQueue.push(async () => {
        const response = await fetch(url);
        const text = await response.text();

        const doc = new DOMParser().parseFromString(text, "text/html");
        if (!doc) {
          throw new Error("Failed to parse the page.");
        }

        const title = doc.title || "Untitled";

        const imgElements = doc.querySelectorAll("img");
        const imgSrcArray = [...imgElements]
          .map((img) => (img as Element).getAttribute("src"))
          .filter((src) => src !== null);

        await ctx.reply(`${imgSrcArray.length} images on this page.`);

        if (imgSrcArray.length > 0) {
          const batches = chunk(imgSrcArray, 10);
          for (const batch of batches) {
            const mediaGroup: InputMediaPhoto[] = batch.map((src) =>
              InputMediaBuilder.photo(new URL(src!, TELEGRAPH_URL).toString())
            );

            await ctx.replyWithMediaGroup(mediaGroup);
          }
        }

        const currentHistory = await kv.get<sessionData>(sessionKey);

        const newHistoryEntry = {
          link: inputText,
          timestamp: Date.now(),
          fromId,
          title,
        };

        const updatedHistory = currentHistory.value
          ? [...currentHistory.value.history, newHistoryEntry]
          : [newHistoryEntry];

        await kv.set(sessionKey, { history: updatedHistory });

        await ctx.reply("Link saved to your history.");
      });
      eventEmitter.emit("newTask");
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
