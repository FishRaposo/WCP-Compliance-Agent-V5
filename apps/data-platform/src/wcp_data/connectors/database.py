"""Database connector for direct SQL access to external databases."""

import logging
from typing import Any

from wcp_data.connectors.base import BaseConnector

logger = logging.getLogger(__name__)


class DatabaseConnector(BaseConnector):
    name = "database"
    source_type = "database"
    required_config = ["connection_string"]

    def __init__(self, config: dict[str, Any]) -> None:
        super().__init__(config)

    async def connect(self) -> None:
        pass

    async def disconnect(self) -> None:
        pass

    async def fetch(
        self, reference: str, **kwargs: Any
    ) -> list[dict[str, Any]]:
        return []

    async def list_files(self, prefix: str = "") -> list[dict[str, Any]]:
        return []
