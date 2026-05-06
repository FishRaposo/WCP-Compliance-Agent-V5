/** SSE Bridge for Redis Streams.
 *
 * Bridges Redis Stream events to HTTP Server-Sent Events (SSE).
 * Allows clients to subscribe to real-time events via SSE endpoint.
 */

import type { StreamConfig, StreamMessageHandler, ensureConsumerGroup, readStreamMessages } from "./redis-streams.js";

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
}

const MAX_SSE_CONNECTIONS = 100;

/** Active SSE connections registry */
const activeConnections = new Map<string, SSEConnection>();

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
      } catch (err) {
        logger.error("Failed to enqueue SSE event", { connectionId: id, err });
        conn.isActive = false;
      }
    }
  }
};

/**
 * Creates a handler that bridges Redis Stream events to SSE.
 * Returns a ReadableStream that can be used as SSE response body.
 */
export const createSSEBridge = (
  connectionId: string,
  streamConfig: StreamConfig,
  redisUrl: string
): ReadableStream<Uint8Array> => {
  if (activeConnections.size >= MAX_SSE_CONNECTIONS) {
    throw new Error("Maximum SSE connections exceeded");
  }
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const { ensureConsumerGroup: ensureGroup } = await import("./redis-streams.js");
        await ensureGroup(streamConfig, redisUrl);
      } catch (err) {
        logger.warn("Redis consumer group unavailable at SSE start", { connectionId, err });
      }
      activeConnections.set(connectionId, {
        controller,
        streamName: streamConfig.streamName,
        isActive: true,
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
    },
    async pull(controller) {
      const handler: StreamMessageHandler = async (messageId, fields) => {
        const data = parseStreamFields(fields);
        const payload: SSEEventPayload = {
          type: inferEventType(streamConfig.streamName, fields),
          data,
          timestamp: new Date().toISOString(),
          streamId: messageId,
        };
        const eventData = formatSSEEvent(payload);
        controller.enqueue(encodeToStream(eventData));
      };

      try {
        const { readStreamMessages: readMessages } = await import("./redis-streams.js");
        await readMessages(streamConfig, handler, 1000, redisUrl);
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
