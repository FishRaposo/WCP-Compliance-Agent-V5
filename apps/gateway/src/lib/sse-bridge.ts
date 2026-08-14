/** SSE Bridge for Redis Streams.
 *
 * Bridges Redis Stream events to HTTP Server-Sent Events (SSE).
 * Allows clients to subscribe to real-time events via SSE endpoint.
 */

import type { StreamConfig, StreamMessageHandler } from "./redis-streams.js";

const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => console.log(`[SSE] ${msg}`, meta ? JSON.stringify(meta) : ""),
  warn: (msg: string, meta?: Record<string, unknown>) => console.warn(`[SSE] ${msg}`, meta ? JSON.stringify(meta) : ""),
  error: (msg: string, meta?: Record<string, unknown>) => console.error(`[SSE] ${msg}`, meta ? JSON.stringify(meta) : ""),
  debug: (msg: string, meta?: Record<string, unknown>) => console.debug(`[SSE] ${msg}`, meta ? JSON.stringify(meta) : ""),
};

/** SSE event types */
export type SSEEventType =
  | "decision.created"
  | "contract.created"
  | "contract.updated"
  | "payroll.created"
  | "job.completed"
  | "error";

/** SSE event payload */
export interface SSEEventPayload {
  type: SSEEventType;
  data: Record<string, unknown>;
  timestamp: string;
  streamId?: string;
}

/** SSE connection state */
interface SSEConnection {
  controller: ReadableStreamDefaultController<Uint8Array>;
  streamName: string;
  isActive: boolean;
  /** Stable key identifying the originating client (for per-client caps). */
  clientKey: string;
  /** Epoch ms of the last successful enqueue (event or heartbeat). */
  lastActivity: number;
  /** Per-connection heartbeat/idle timer. */
  heartbeatTimer: ReturnType<typeof setInterval> | null;
}

/** Global cap across all clients. */
const MAX_SSE_CONNECTIONS = 100;
/** Per-client cap so a single client cannot exhaust the global budget. */
const MAX_SSE_CONNECTIONS_PER_CLIENT = 5;
/** How often a heartbeat comment is sent to keep the connection warm. */
const SSE_HEARTBEAT_INTERVAL_MS = 30_000;
/** Connections with no activity beyond this window are closed as stale. */
const SSE_IDLE_TIMEOUT_MS = 120_000;

/** Active SSE connections registry */
const activeConnections = new Map<string, SSEConnection>();

const LOCAL_EVENT_LIMIT = 100;
const localEvents = new Map<string, SSEEventPayload[]>();
let localEventSequence = 0;

/** Counts active connections originating from a given client key. */
const countConnectionsForClient = (clientKey: string): number => {
  let count = 0;
  for (const conn of activeConnections.values()) {
    if (conn.clientKey === clientKey) count++;
  }
  return count;
};

/**
 * Formats data as SSE-compliant message
 */
export const formatSSEEvent = (payload: SSEEventPayload): string => {
  const lines = [
    `event: ${payload.type}`,
    `data: ${JSON.stringify(payload.data)}`,
    `id: ${payload.streamId ?? payload.timestamp}`,
    "",
    "",
  ];
  return lines.join("\r\n");
};

/**
 * Encodes string to Uint8Array for streaming
 */
const encodeToStream = (chunk: string): Uint8Array =>
  new TextEncoder().encode(chunk);

/**
 * Broadcasts an SSE event to all connected clients subscribed to a stream.
 */
export const broadcastSSEEvent = (streamName: string, payload: SSEEventPayload): void => {
  const eventData = formatSSEEvent(payload);
  const encoded = encodeToStream(eventData);

  for (const [id, conn] of activeConnections) {
    if (conn.isActive && conn.streamName === streamName) {
      try {
        conn.controller.enqueue(encoded);
        conn.lastActivity = Date.now();
      } catch (err) {
        logger.error("Failed to enqueue SSE event", { connectionId: id, err });
        conn.isActive = false;
      }
    }
  }
};

const publishLocalSSEEvent = (streamName: string, payload: SSEEventPayload): SSEEventPayload => {
  const event = { ...payload, streamId: payload.streamId ?? `local-${++localEventSequence}` };
  const history = localEvents.get(streamName) ?? [];
  history.push(event);
  if (history.length > LOCAL_EVENT_LIMIT) history.splice(0, history.length - LOCAL_EVENT_LIMIT);
  localEvents.set(streamName, history);
  broadcastSSEEvent(streamName, event);
  return event;
};

/** Publish to configured Redis, falling back to the process-local transport. */
export const publishSSEEvent = async (
  streamName: string,
  payload: SSEEventPayload,
  redisUrl: string | undefined = process.env.REDIS_URL
): Promise<SSEEventPayload> => {
  if (redisUrl) {
    try {
      const { addStreamMessage } = await import("./redis-streams.js");
      const streamId = await addStreamMessage(
        streamName,
        {
          type: payload.type,
          event: JSON.stringify(payload.data),
          timestamp: payload.timestamp,
        },
        redisUrl
      );
      return { ...payload, streamId };
    } catch (err) {
      logger.warn("Redis publish unavailable; using local SSE transport", { streamName, err });
    }
  }
  return publishLocalSSEEvent(streamName, payload);
};

/** Return ordered local events newer than an SSE Last-Event-ID value. */
export const getSSEEventsAfter = (streamName: string, lastEventId?: string): SSEEventPayload[] => {
  const history = localEvents.get(streamName) ?? [];
  if (!lastEventId) return [...history];
  const index = history.findIndex((event) => event.streamId === lastEventId);
  return index === -1 ? [...history] : history.slice(index + 1);
};

/** Test and shutdown helper; never affects Redis-backed stream persistence. */
export const clearSSEEventHistory = (): void => {
  localEvents.clear();
  localEventSequence = 0;
};

/**
 * Creates a handler that bridges Redis Stream events to SSE.
 * Returns a ReadableStream that can be used as SSE response body.
 */
export const createSSEBridge = (
  connectionId: string,
  streamConfig: StreamConfig,
  redisUrl: string | undefined,
  clientKey: string = connectionId,
  lastEventId?: string
): ReadableStream<Uint8Array> => {
  if (activeConnections.size >= MAX_SSE_CONNECTIONS) {
    throw new Error("Maximum SSE connections exceeded");
  }
  if (countConnectionsForClient(clientKey) >= MAX_SSE_CONNECTIONS_PER_CLIENT) {
    throw new Error("Maximum SSE connections per client exceeded");
  }
  const deliveredRedisIds = new Set<string>();
  const createStreamHandler = (
    controller: ReadableStreamDefaultController<Uint8Array>
  ): StreamMessageHandler => async (messageId, fields) => {
    if (deliveredRedisIds.has(messageId)) return;
    deliveredRedisIds.add(messageId);
    const data = parseStreamFields(fields);
    const payload: SSEEventPayload = {
      type: inferEventType(streamConfig.streamName, fields),
      data,
      timestamp: new Date().toISOString(),
      streamId: messageId,
    };
    controller.enqueue(encodeToStream(formatSSEEvent(payload)));
    const conn = activeConnections.get(connectionId);
    if (conn) conn.lastActivity = Date.now();
  };
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      if (redisUrl) {
        try {
          const { ensureConsumerGroup: ensureGroup } = await import("./redis-streams.js");
          await ensureGroup(streamConfig, redisUrl);
        } catch (err) {
          logger.warn("Redis consumer group unavailable at SSE start", { connectionId, err });
        }
      }
      activeConnections.set(connectionId, {
        controller,
        streamName: streamConfig.streamName,
        isActive: true,
        clientKey,
        lastActivity: Date.now(),
        heartbeatTimer: null,
      });
      logger.info("SSE bridge connected", { connectionId, stream: streamConfig.streamName });

      const heartbeat = encodeToStream(": heartbeat\n\n");
      try {
        controller.enqueue(heartbeat);
      } catch (err) {
        logger.debug("SSE heartbeat enqueue failed", { connectionId, err });
        const conn = activeConnections.get(connectionId);
        if (conn) conn.isActive = false;
      }

      for (const event of getSSEEventsAfter(streamConfig.streamName, lastEventId)) {
        controller.enqueue(encodeToStream(formatSSEEvent(event)));
      }

      if (redisUrl && lastEventId && /^\d+-\d+$/.test(lastEventId)) {
        try {
          const { replayStreamMessages } = await import("./redis-streams.js");
          await replayStreamMessages(
            streamConfig,
            createStreamHandler(controller),
            lastEventId,
            redisUrl
          );
        } catch (err) {
          logger.warn("Redis SSE replay unavailable", { connectionId, lastEventId, err });
        }
      }

      // Periodic heartbeat keeps the connection warm and reaps idle/stale ones.
      const timer = setInterval(() => {
        const conn = activeConnections.get(connectionId);
        if (!conn || !conn.isActive) {
          closeSSEConnection(connectionId);
          return;
        }
        if (Date.now() - conn.lastActivity > SSE_IDLE_TIMEOUT_MS) {
          logger.info("Closing idle SSE connection", { connectionId });
          closeSSEConnection(connectionId);
          return;
        }
        try {
          conn.controller.enqueue(heartbeat);
          conn.lastActivity = Date.now();
        } catch (err) {
          logger.debug("SSE heartbeat enqueue failed", { connectionId, err });
          closeSSEConnection(connectionId);
        }
      }, SSE_HEARTBEAT_INTERVAL_MS);
      // Don't let the heartbeat timer keep the process alive on its own.
      (timer as { unref?: () => void }).unref?.();
      const conn = activeConnections.get(connectionId);
      if (conn) conn.heartbeatTimer = timer;
    },
    async pull(controller) {
      if (!redisUrl) return;

      try {
        const { readStreamMessages: readMessages } = await import("./redis-streams.js");
        await readMessages(streamConfig, createStreamHandler(controller), 1000, redisUrl);
      } catch (err) {
        logger.error("SSE bridge pull error", { connectionId, err });
        const errorPayload: SSEEventPayload = {
          type: "error",
          data: { message: "Stream read error" },
          timestamp: new Date().toISOString(),
        };
        controller.enqueue(encodeToStream(formatSSEEvent(errorPayload)));
      }

      if (!activeConnections.get(connectionId)?.isActive) {
        controller.close();
      }
    },
    cancel() {
      const conn = activeConnections.get(connectionId);
      if (conn) {
        conn.isActive = false;
        if (conn.heartbeatTimer) clearInterval(conn.heartbeatTimer);
        activeConnections.delete(connectionId);
        logger.info("SSE bridge disconnected", { connectionId });
      }
    },
  });

  return stream;
};

const parseStreamFields = (fields: Record<string, string>): Record<string, unknown> => {
  if (typeof fields.event === "string") {
    try {
      const parsed = JSON.parse(fields.event) as unknown;
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      logger.debug("SSE stream field parse fallback — passing raw fields", { fields });
      return fields;
    }
  }
  return fields;
};

const inferEventType = (streamName: string, fields: Record<string, string>): SSEEventType => {
  if (isSSEEventType(fields.type)) return fields.type;
  if (streamName.includes("decision")) return "decision.created";
  if (streamName.includes("contract")) return "contract.created";
  if (streamName.includes("payroll")) return "payroll.created";
  if (streamName.includes("ingestion")) return "job.completed";
  return "error";
};

const isSSEEventType = (value: string | undefined): value is SSEEventType =>
  value === "decision.created" ||
  value === "contract.created" ||
  value === "contract.updated" ||
  value === "payroll.created" ||
  value === "job.completed" ||
  value === "error";

/**
 * Closes a specific SSE connection by ID.
 */
export const closeSSEConnection = (connectionId: string): void => {
  const conn = activeConnections.get(connectionId);
  if (conn) {
    conn.isActive = false;
    if (conn.heartbeatTimer) clearInterval(conn.heartbeatTimer);
    try {
      conn.controller.close();
    } catch (err) {
      logger.debug("SSE controller close error (already closed)", { connectionId, err });
    }
    activeConnections.delete(connectionId);
    logger.info("SSE connection closed", { connectionId });
  }
};

/**
 * Closes all active SSE connections.
 */
export const closeAllSSEConnections = (): void => {
  for (const [id] of activeConnections) {
    closeSSEConnection(id);
  }
  logger.info("All SSE connections closed");
};

/**
 * Returns the count of active SSE connections.
 */
export const getActiveSSEConnectionCount = (): number => activeConnections.size;
