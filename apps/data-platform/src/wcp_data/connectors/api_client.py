"""REST API connector for external data sources."""

import logging
from typing import Any

from wcp_data.connectors.base import BaseConnector

logger = logging.getLogger(__name__)


class APIConnector(BaseConnector):
    name = "api"
    source_type = "api"
    required_config = ["base_url"]

    def __init__(self, config: dict[str, Any]) -> None:
        super().__init__(config)

    async def connect(self) -> None:
        """Validate API connectivity."""
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.config['base_url']}/health",
                    timeout=aiohttp.ClientTimeout(total=5),
                ):
                    logger.info("API connector validated: %s", self.config["base_url"])
        except Exception:
            logger.warning("API connector unreachable: %s", self.config.get("base_url"))

    async def disconnect(self) -> None:
        pass

    async def fetch(
        self, reference: str, **kwargs: Any
    ) -> list[dict[str, Any]]:
        try:
            import aiohttp
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.config['base_url']}{reference}",
                    headers=self.config.get("headers", {}),
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return data if isinstance(data, list) else [data]
        except Exception:
            logger.warning("API fetch failed: %s", reference, exc_info=True)
        return []

    async def list_files(self, prefix: str = "") -> list[dict[str, Any]]:
        return await self.fetch(prefix)
