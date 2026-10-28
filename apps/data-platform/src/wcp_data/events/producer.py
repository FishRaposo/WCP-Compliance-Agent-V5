"""Redis Streams event producer."""

import json
import logging
from typing import Any

from wcp_data.config import settings
from wcp_data.events.schemas import DecisionEvent

logger = logging.getLogger(__name__)

STREAM_DECISIONS = "wcp.decisions"
STREAM_PAYROLLS = "wcp.payrolls"
STREAM_INGESTION = "wcp.ingestion"


class EventProducer:
    def __init__(self) -> None:
        self._redis: Any = None

    async def _get_redis(self) -> Any:
        if self._redis is None:
            try:
                import redis.asyncio as aioredis
                self._redis = aioredis.from_url(
                    settings.redis_url, decode_responses=True
                )
                await self._redis.ping()
            except Exception:
                logger.warning("Redis unavailable, events will be dropped")
                self._redis = None
                return None
        return self._redis

    async def publish_decision(self, event: DecisionEvent) -> None:
        try:
            r = await self._get_redis()
            if r is None:
                raise RuntimeError("Decision event backend unavailable")
            payload = event.model_dump()
            await r.xadd(
                STREAM_DECISIONS,
                {k: json.dumps(v) if not isinstance(v, str) else v for k, v in payload.items()},
                maxlen=10000,
            )
        except Exception as exc:
            logger.warning("Failed to publish decision event", exc_info=True)
            # The owning decision service records a durable failure audit after
            # its transaction commits. Never silently turn failed delivery into
            # success, and never expose connection strings in that audit.
            raise RuntimeError("Decision event delivery failed") from exc

    async def publish(
        self,
        stream: str,
        data: dict[str, Any],
        maxlen: int = 10000,
    ) -> None:
        try:
            r = await self._get_redis()
            if r is None:
                return
            await r.xadd(stream, data, maxlen=maxlen)
        except Exception:
            logger.warning("Failed to publish event to %s", stream, exc_info=True)

    async def close(self) -> None:
        if self._redis:
            await self._redis.close()
            self._redis = None


event_producer = EventProducer()
