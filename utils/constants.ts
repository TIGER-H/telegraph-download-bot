import { getEnvOrThrow } from "./misc.ts";

export const IS_PRODUCTION = Deno.env.get("IS_PRODUCTION") === "true" ||
    typeof Deno.env.get("DENO_DEPLOYMENT_ID") !== "undefined"
  ? true
  : false;
export const IS_DEVELOPMENT = !IS_PRODUCTION;

export const TELEGRAM_BOT_TOKEN = getEnvOrThrow("TOKEN");

export const TELEGRAPH_URL = new URL("https://telegra.ph");
