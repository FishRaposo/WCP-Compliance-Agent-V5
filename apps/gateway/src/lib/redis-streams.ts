/** Redis Streams consumer for SSE bridging.
 *
 * Import-safe module that provides a Redis Streams consumer.
 * Redis client is lazily initialized to avoid requiring Redis at import time.
 */

const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => console.log(`[Redis] ${msg}`, meta ? JSON.stringify(meta) : ""),
  warn: (msg: string, meta?: Record<string, unknown>) => console.warn(`[Redis] ${msg}`, meta ? JSON.stringify(meta) : ""),
  error: (msg: string, meta?: Record<string, unknown>) => console.error(`[Redis] ${msg}`, meta ? JSON.stringify(meta) : ""),
  debug: (msg: string, meta?: Record<string, unknown>) => console.debug(`[Redis] ${msg}`, meta ? JSON.stringify(meta) : ""),
};

/** Stream and consumer group configuration */
export interface StreamConfig {
  streamName: string;
  consumerGroup: string;
  consumerName: string;
}

/** Message handler function type */
export type StreamMessageHandler = (messageId: string, fields: Record<string, string>) => Promise<void>;

/** Redis client interface */
interface RedisClientInterface {
  on(event: "error", listener: (err: Error) => void): void;
  connect(): Promise<void>;
  quit(): Promise<void>;
  xgroup(...args: string[]): Promise<unknown>;
  xreadgroup(...args: string[]): Promise<unknown>;
  xack(stream: string, group: string, id: string): Promise<number>;
  xadd(stream: string, ...args: string[]): Promise<string>;
}

/** Redis client singleton - lazily initialized */
let redisClient: RedisClientInterface | null = null;

/**
 * Lazily initializes and returns the Redis client.
 */
const getRedisClient = async (redisUrl: string): Promise<RedisClientInterface> => {
  if (redisClient !== null) return redisClient;
  try {
    const { createClient } = await import("redis");
    const client = createClient({ url: redisUrl }) as RedisClientInterface;
    client.on("error", (err: Error) => {
      logger.error("Redis client error", { err });
    });
    await client.connect();
    redisClient = client;
    return client;
  } catch (err) {
    logger.error("Failed to connect to Redis", { err });
    throw err;
  }
};

/**
 * Creates a consumer group for a stream if it doesn't exist.
 */
export const ensureConsumerGroup = async (config: StreamConfig, redisUrl: string): Promise<void> => {
  const client = await getRedisClient(redisUrl);
  try {
    await client.xgroup("CREATE", config.streamName, config.consumerGroup, "0", "MKSTREAM");
    logger.info("Consumer group ensured", { stream: config.streamName, group: config.consumerGroup });
  } catch (err) {
    if (err instanceof Error && err.message.includes("BUSYGROUP")) {
      logger.debug("Consumer group already exists", { stream: config.streamName, group: config.consumerGroup });
    } else {
      throw err;
    }
  }
};

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/** Internal type for XREADGROUP results */
type XReadGroupResult = [streamName: string, messages: [messageId: string, fields: string[]][]][];

/**
 * Reads new messages from a stream using consumer group pattern.
 */
export const readStreamMessages = async (
  config: StreamConfig,
  handler: StreamMessageHandler,
  blockMs = 5000,
  redisUrl: string
): Promise<number> => {
  const client = await getRedisClient(redisUrl);
  const results = (await client.xreadgroup(
    "GROUP",
    config.consumerGroup,
    config.consumerName,
    "BLOCK",
    String(blockMs),
    "COUNT",
    "100",
    "STREAMS",
    config.streamName,
    ">"
  )) as XReadGroupResult | null;
  if (!results) return 0;

  let processed = 0;
  for (const [, messages] of results) {
    for (const [messageId, rawFields] of messages) {
      try {
        const fields = Object.fromEntries(chunkArray(rawFields, 2));
        await handler(messageId, fields);
        await client.xack(config.streamName, config.consumerGroup, messageId);
        processed++;
      } catch (err) {
        logger.error("Failed to process stream message", { messageId, err });
      }
    }
  }
  return processed;
};

/**
 * Adds a message to a stream (producer side).
 */
export const addStreamMessage = async (
  streamName: string,
  fields: Record<string, string>,
  redisUrl: string
): Promise<string> => {
  const client = await getRedisClient(redisUrl);
  const flatArgs: string[] = [];
  for (const [k, v] of Object.entries(fields)) {
    flatArgs.push(k, v);
  }
  const messageId = await client.xadd(streamName, "*", ...flatArgs);
  logger.debug("Message added to stream", { streamName, messageId });
  return messageId;
};

/**
 * Gracefully closes the Redis connection.
 */
export const closeStreamConsumer = async (): Promise<void> => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info("Redis stream consumer connection closed");
  }
};
