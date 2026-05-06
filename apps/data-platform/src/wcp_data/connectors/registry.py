"""Connector registry for managing enterprise data connectors."""

import logging
from typing import Any

from wcp_data.connectors.base import BaseConnector

logger = logging.getLogger(__name__)

_registry: dict[str, BaseConnector] = {}


def register(name: str, connector: BaseConnector) -> None:
    _registry[name] = connector
    logger.info("Connector registered: %s (%s)", name, connector.source_type)


def get(name: str) -> BaseConnector | None:
    return _registry.get(name)


def list_registered() -> dict[str, str]:
    return {name: conn.source_type for name, conn in _registry.items()}


async def connect_all() -> None:
    for name, conn in _registry.items():
        try:
            await conn.connect()
        except Exception:
            logger.warning("Failed to connect: %s", name, exc_info=True)


async def disconnect_all() -> None:
    for name, conn in _registry.items():
        try:
            await conn.disconnect()
        except Exception:
            pass
