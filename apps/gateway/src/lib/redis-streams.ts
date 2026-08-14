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
  xGroupCreate(
    stream: string,
    group: string,
    id: string,
    options: { MKSTREAM: boolean }
  ): Promise<string>;
  xReadGroup(
    group: string,
    consumer: string,
    stream: { key: string; id: string },
    options: { BLOCK: number; COUNT: number }
  ): Promise<RedisStreamsResult>;
  xRead(
    stream: { key: string; id: string },
    options: { BLOCK: number; COUNT: number }
  ): Promise<RedisStreamsResult>;
  xRange(stream: string, start: string, end: string): Promise<RedisStreamMessage[]>;
  xAck(stream: string, group: string, id: string): Promise<number>;
  xAdd(stream: string, id: string, fields: Record<string, string>): Promise<string>;
}

interface RedisStreamMessage {
  id: string;
  message: Record<string, string>;
}

type RedisStreamsResult = Array<{
  name: string;
  messages: RedisStreamMessage[];
}> | null;

const REDIS_CONNECT_TIMEOUT_MS = 1_000;

/** Redis client singleton - lazily initialized */
let redisClient: RedisClientInterface | null = null;

/**
 * Lazily initializes and returns the Redis client.
 */
const getRedisClient = async (redisUrl: string): Promise<RedisClientInterface> => {
  if (redisClient !== null) return redisClient;
  try {
    const { createClient } = await import("redis");
    const client = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: REDIS_CONNECT_TIMEOUT_MS,
        reconnectStrategy: false,
      },
    }) as RedisClientInterface;
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
    await client.xGroupCreate(config.streamName, config.consumerGroup, "0", { MKSTREAM: true });
    logger.info("Consumer group ensured", { stream: config.streamName, group: config.consumerGroup });
  } catch (err) {
    if (err instanceof Error && err.message.includes("BUSYGROUP")) {
      logger.debug("Consumer group already exists", { stream: config.streamName, group: config.consumerGroup });
    } else {
      throw err;
    }
  }
};

/**
 * Replays persisted stream entries strictly newer than an SSE Last-Event-ID.
 * Historical replay is intentionally independent of the consumer group; group
 * reads only expose pending entries for a consumer when passed an explicit ID.
 */
export const replayStreamMessages = async (
  config: StreamConfig,
  handler: StreamMessageHandler,
  lastEventId: string,
  redisUrl: string
): Promise<number> => {
  const client = await getRedisClient(redisUrl);
  const messages = await client.xRange(config.streamName, lastEventId, "+");

  let processed = 0;
  for (const { id: messageId, message: fields } of messages) {
    if (messageId === lastEventId) continue;
    try {
      await handler(messageId, fields);
      processed++;
    } catch (err) {
      logger.error("Failed to replay stream message", { messageId, err });
    }
  }
  return processed;
};

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
  const results = await client.xReadGroup(
    config.consumerGroup,
    config.consumerName,
    { key: config.streamName, id: ">" },
    { BLOCK: blockMs, COUNT: 100 }
  );
  if (!results) return 0;

  let processed = 0;
  for (const { messages } of results) {
    for (const { id: messageId, message: fields } of messages) {
      try {
        await handler(messageId, fields);
        await client.xAck(config.streamName, config.consumerGroup, messageId);
        processed++;
      } catch (err) {
        logger.error("Failed to process stream message", { messageId, err });
      }
    }
  }
  return processed;
};

export interface StreamReadResult {
  processed: number;
  cursor: string;
}

/**
 * Reads live entries after an explicit cursor without consumer-group sharing.
 * Each SSE connection owns its cursor, so every connected client can observe
 * the same stream entry and resume independently.
 */
export const readStreamMessagesAfter = async (
  config: StreamConfig,
  handler: StreamMessageHandler,
  cursor: string,
  blockMs = 5000,
  redisUrl: string
): Promise<StreamReadResult> => {
  const client = await getRedisClient(redisUrl);
  const results = await client.xRead(
    { key: config.streamName, id: cursor },
    { BLOCK: blockMs, COUNT: 100 }
  );
  if (!results) return { processed: 0, cursor };

  let processed = 0;
  let nextCursor = cursor;
  for (const { messages } of results) {
    for (const { id: messageId, message: fields } of messages) {
      if (messageId === nextCursor) continue;
      try {
        await handler(messageId, fields);
        nextCursor = messageId;
        processed++;
      } catch (err) {
        logger.error("Failed to process stream message", { messageId, err });
        return { processed, cursor: nextCursor };
      }
    }
  }
  return { processed, cursor: nextCursor };
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
  const messageId = await client.xAdd(streamName, "*", fields);
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
