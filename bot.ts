import { Bot, DOMParser, Element, InputMediaPhoto } from "./deps.deno.ts";

const baseURL = new URL("https://telegra.ph");
export const bot = new Bot(Deno.env.get("TOKEN") || "");

bot.command("start", (ctx) => ctx.reply("Welcome! Send me a telegra.ph link!"));

bot.on("message:text", async (ctx) => {
  const inputText = ctx.message.text;

  if (inputText.startsWith("https://telegra.ph/")) {
    try {
      const response = await fetch(inputText);
      const text = await response.text();

      const doc = new DOMParser().parseFromString(text, "text/html")!;
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
              media: new URL(src!, baseURL).toString(),
            }) as InputMediaPhoto
          );
          await ctx.replyWithMediaGroup(mediaGroup);
        }
      }
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
