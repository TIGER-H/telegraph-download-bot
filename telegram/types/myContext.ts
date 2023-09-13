import { Context, SessionFlavor } from "../../deps.deno.ts";
import { sessionData } from "./sessionData.ts";

export type myContext = Context & SessionFlavor<sessionData>;
