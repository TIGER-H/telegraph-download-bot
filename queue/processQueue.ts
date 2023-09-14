export const taskQueue: Array<() => Promise<void>> = [];
let currentProcesses = 0;
const MAX_CONCURRENT_PROCESS = 5;

export function processQueue() {
  if (currentProcesses > MAX_CONCURRENT_PROCESS) return;

  while (taskQueue.length > 0 && currentProcesses < MAX_CONCURRENT_PROCESS) {
    const task = taskQueue.shift();
    if (task) {
      task()
        .then(() => {
          console.log("Finished processing task:", task);
        })
        .catch((error) => {
          console.error("Error processing task:", error);
        })
        .finally(() => {
          currentProcesses -= 1;
          processQueue();
        });
    }
  }
}
