import {
  Bot,
  Context,
  DenoKVAdapter,
  DOMParser,
  Element,
  InputMediaPhoto,
  session,
  SessionFlavor,
} from "./deps.deno.ts";

const BASE_URL = new URL("https://telegra.ph");

interface sessionData {
  history: Array<
    { link: string; timestamp: number; fromId: number; title: string }
  >;
}
type myContext = Context & SessionFlavor<sessionData>;

const kv = await Deno.openKv();

export const bot = new Bot<myContext>(Deno.env.get("TOKEN") || "");

bot.use(session({
  initial: () => ({ history: [] }),
  storage: new DenoKVAdapter(kv),
}));

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

  if (inputText.startsWith("https://telegra.ph/")) {
    try {
      const response = await fetch(inputText);
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
    } catch (error) {
      await ctx.reply(`Error fetching or parsing the page: ${error.message}`);
    }
  } else {
    await ctx.reply("Please send a valid telegra.ph link.");
  }
});

// utils
function chunk<T>(array: T[], size: number): T[][] {
  return array.reduce((chunks, item, idx) => {
    if (idx % size === 0) {
      chunks.push([]);
    }
    chunks[chunks.length - 1].push(item);
    return chunks;
  }, [] as T[][]);
}
