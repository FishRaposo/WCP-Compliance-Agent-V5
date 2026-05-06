"""Base Connector ABC for enterprise data ingestion."""

import logging
from abc import ABC, abstractmethod
from typing import Any

logger = logging.getLogger(__name__)


class BaseConnector(ABC):
    name: str = "base"
    source_type: str = "generic"

    def __init__(self, config: dict[str, Any]) -> None:
        self.config = config

    @abstractmethod
    async def connect(self) -> None:
        raise NotImplementedError

    @abstractmethod
    async def disconnect(self) -> None:
        raise NotImplementedError

    @abstractmethod
    async def fetch(
        self, reference: str, **kwargs: Any
    ) -> list[dict[str, Any]]:
        raise NotImplementedError

    @abstractmethod
    async def list_files(self, prefix: str = "") -> list[dict[str, Any]]:
        raise NotImplementedError

    async def validate_config(self) -> list[str]:
        issues: list[str] = []
        required = getattr(self, "required_config", [])
        for key in required:
            if key not in self.config:
                issues.append(f"Missing required config key: {key}")
        return issues
