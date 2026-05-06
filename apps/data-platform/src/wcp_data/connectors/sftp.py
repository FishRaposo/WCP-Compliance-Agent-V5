"""SFTP connector for ingesting payroll/contract files."""

import logging
from typing import Any

from wcp_data.connectors.base import BaseConnector

logger = logging.getLogger(__name__)


class SFTPConnector(BaseConnector):
    name = "sftp"
    source_type = "sftp"
    required_config = ["host", "user"]

    def __init__(self, config: dict[str, Any]) -> None:
        super().__init__(config)
        self._client = None

    async def connect(self) -> None:
        try:
            import paramiko
            host = self.config["host"]
            port = self.config.get("port", 22)
            user = self.config["user"]
            password = self.config.get("password")
            key_file = self.config.get("key_file")

            transport = paramiko.Transport((host, port))
            transport.connect(username=user, password=password, pkey=None)
            self._client = paramiko.SFTPClient.from_transport(transport)
            self._transport = transport
            logger.info("SFTP connected to %s", host)
        except ImportError:
            logger.warning("paramiko not installed, SFTP unavailable")
        except Exception:
            logger.warning("SFTP connection failed", exc_info=True)

    async def disconnect(self) -> None:
        if self._client:
            self._client.close()
        if hasattr(self, "_transport") and self._transport:
            self._transport.close()
        logger.info("SFTP disconnected")

    async def fetch(
        self, reference: str, **kwargs: Any
    ) -> list[dict[str, Any]]:
        if not self._client:
            return []
        try:
            import io
            with self._client.open(reference, "r") as f:
                content = f.read()
            return [{"reference": reference, "content": content.decode("utf-8", errors="replace")}]
        except Exception:
            logger.warning("SFTP fetch failed: %s", reference, exc_info=True)
            return []

    async def list_files(self, prefix: str = "") -> list[dict[str, Any]]:
        if not self._client:
            return []
        try:
            files = self._client.listdir_attr(prefix or ".")
            return [
                {
                    "name": f.filename,
                    "size": f.st_size,
                    "modified": str(f.st_mtime) if f.st_mtime else "",
                }
                for f in files
            ]
        except Exception:
            return []
