import { bot } from "./telegram/bot.ts";
import { webhookCallback } from "./deps.deno.ts";
import { eventEmitter } from "./queue/eventEmitter.ts";
import { processQueue } from "./queue/processQueue.ts";

const handleUpdate = webhookCallback(bot, "std/http");

Deno.serve(async (req) => {
  if (req.method === "POST") {
    const url = new URL(req.url);
    if (url.pathname.slice(1) === bot.token) {
      try {
        return await handleUpdate(req);
      } catch (err) {
        console.error(err);
      }
    }
  }
  return new Response();
});

eventEmitter.on(
  "newTask",
  processQueue,
);

processQueue().catch((error) => {
  console.error("Error in queue processor:", error);
});
