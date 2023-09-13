export const taskQueue: Array<() => Promise<void>> = [];
let isProcessing = false;

export async function processQueue() {
  if (isProcessing) return;
  isProcessing = true;

  while (taskQueue.length > 0) {
    const task = taskQueue.shift();
    if (task) {
      try {
        console.log("Processing a new task", task);
        await task();
        console.log("Finished processing task", task);
      } catch (error) {
        console.error("Error processing task:", error);
      }
    }
  }

  console.log("Finished processing tasks");
  isProcessing = false;
}
