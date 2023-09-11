import { NextFunction } from "../deps.deno.ts";

export const taskQueue: Array<NextFunction> = [];
let isProcessing = false;

export async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  while (taskQueue.length > 0) {
    const task = taskQueue.shift();
    if (task) {
      try {
        console.log("Processing a new task");
        await task();
      } catch (error) {
        console.error("Error processing task:", error);
      }
    }
  }

  console.log("Finished processing tasks");
  isProcessing = false;
}
