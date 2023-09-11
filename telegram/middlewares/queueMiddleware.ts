import { NextFunction } from "../../deps.deno.ts";
import { eventEmitter } from "../../queue/eventEmitter.ts";
import { taskQueue } from "../../queue/processQueue.ts";
import { myContext } from "../types/myContext.ts";

export function queueMiddleware() {
  return async (ctx: myContext, next: NextFunction) => {
    console.log("before enqueue", ctx.session);
    const enqueue = (task: NextFunction) => {
      taskQueue.push(task);
      eventEmitter.emit("newTask");
    };
    ctx.enqueueTask = enqueue;
    await next();
    console.log("after enqueue", ctx.session);
  };
}
