import { getGatewayBot } from "./helpers/misc/get_gateway_bot.ts";
import { checkRateLimits } from "./rest/check_rate_limits.ts";
import { cleanupQueues } from "./rest/cleanup_queues.ts";
import { createRequestBody } from "./rest/create_request_body.ts";
import { processRateLimitedPaths } from "./rest/process_rate_limited_paths.ts";
import { processRequest } from "./rest/process_request.ts";
import { processRequestHeaders } from "./rest/process_request_headers.ts";
import { RestPayload, RestRateLimitedPath, RestRequest } from "./rest/rest.ts";
import { runMethod } from "./rest/run_method.ts";
import { simplifyUrl } from "./rest/simplify_url.ts";
import { DiscordGatewayIntents } from "./types/gateway/gateway_intents.ts";
import { GetGatewayBot } from "./types/gateway/get_gateway_bot.ts";
import { dispatchRequirements } from "./util/dispatch_requirements.ts";
import { processQueue } from "./rest/process_queue.ts";
import { snowflakeToBigint } from "./util/bigint.ts";
import { Collection } from "./util/collection.ts";
import { DiscordenoUser, transformMember, transformUser } from "./transformers/member.ts";
import { SnakeCasedPropertiesDeep } from "./types/util.ts";
import { Channel } from "./types/channels/channel.ts";

export async function createBot(options: CreateBotOptions) {
  return {
    id: options.botId,
    applicationId: options.applicationId || options.botId,
    token: `Bot ${options.token}`,
    events: { dispatchRequirements: dispatchRequirements, ...options.events },
    intents: options.intents.reduce((bits, next) => (bits |= DiscordGatewayIntents[next]), 0),
    botGatewayData: options.botGatewayData || (await getGatewayBot()),
    isReady: false,
  };
}

const bot = await createBot({
  token: "",
  botId: 0n,
  events: createEventHandlers(),
  intents: [],
});

export function createEventHandlers(options?: Partial<EventHandlers>) {
  return {
    debug: () => undefined,
    // PROVIDED OPTIONS OVERRIDE EVERYTHING ABOVE
    ...options,
  };
}

export interface CreateRestManagerOptions {
  token: string;
  maxRetryCount?: number;
  version?: number;
  secretKey?: string;
  debug?: (text: string) => unknown;
  checkRateLimits?: typeof checkRateLimits;
  cleanupQueues?: typeof cleanupQueues;
  processQueue?: typeof processQueue;
  processRateLimitedPaths?: typeof processRateLimitedPaths;
  processRequestHeaders?: typeof processRequestHeaders;
  processRequest?: typeof processRequest;
  createRequestBody?: typeof createRequestBody;
  runMethod?: typeof runMethod;
  simplifyUrl?: typeof simplifyUrl;
}

export function createRestManager(options: CreateRestManagerOptions) {
  return {
    token: `${options.token.startsWith("Bot ") ? "" : "Bot "}${options.token}`,
    maxRetryCount: options.maxRetryCount || 10,
    version: options.version || "9",
    secretKey: options.secretKey || "discordeno_best_lib_ever",
    pathQueues: new Map<
      string,
      {
        request: RestRequest;
        payload: RestPayload;
      }[]
    >(),
    processingQueue: false,
    processingRateLimitedPaths: false,
    globallyRateLimited: false,
    ratelimitedPaths: new Map<string, RestRateLimitedPath>(),
    debug: options.debug || function (_text: string) {},
    checkRateLimits: options.checkRateLimits || checkRateLimits,
    cleanupQueues: options.cleanupQueues || cleanupQueues,
    processQueue: options.processQueue || processQueue,
    processRateLimitedPaths: options.processRateLimitedPaths || processRateLimitedPaths,
    processRequestHeaders: options.processRequestHeaders || processRequestHeaders,
    processRequest: options.processRequest || processRequest,
    createRequestBody: options.createRequestBody || createRequestBody,
    runMethod: options.runMethod || runMethod,
    simplifyUrl: options.simplifyUrl || simplifyUrl,
  };
}

export async function startBot(bot: Bot) {
  const transformers = createTransformers(bot.transformers);

  // SETUP CACHE
  bot.users = new Collection();

  // START REST
  bot.rest = createRestManager({ token: bot.token });

  // START WS
  bot.gateway = createGatewayManager();


}

export interface CreateGatewayManagerOptions {
  transformers: Partial<Transformers>;
}

export function createGatewayManager(options: CreateGatewayManagerOptions) {

}

export function stopBot(bot: Bot) {
  // STOP REST
  // STOP WS
}

export interface CreateBotOptions {
  token: string;
  botId: bigint;
  applicationId?: bigint;
  events: EventHandlers;
  intents: (keyof typeof DiscordGatewayIntents)[];
  botGatewayData?: GetGatewayBot;
  rest?: Omit<CreateRestManagerOptions, "token">;
}

export type UnPromise<T extends Promise<unknown>> = T extends Promise<infer K> ? K : never;

export type CreatedBot = UnPromise<ReturnType<typeof createBot>>;

export type Bot = CreatedBot & {
  rest: RestManager;
  gateway: GatewayManager;
  transformers: Transformers;
  // TODO: Support async cache
  users: Collection<bigint, DiscordenoUser>;
  channels: Collection<bigint, SnakeCasedPropertiesDeep<Channel>>;
};

export interface Transformers {
  snowflake: typeof snowflakeToBigint;
  user: typeof transformUser;
  member: typeof transformMember;
  channel: typeof transformChannel;
}

export function createTransformers(options: Partial<Transformers>) {
  return {
    snowflake: options.snowflake || snowflakeToBigint,
  };
}

export type RestManager = ReturnType<typeof createRestManager>;

export interface GatewayManager {}

export interface EventHandlers {
  debug: (text: string) => unknown;
  channelCreate: (bot: Bot, channel: DiscordenoChannel);
}
