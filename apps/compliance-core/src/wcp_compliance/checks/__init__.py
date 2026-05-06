from __future__ import annotations

__all__ = ["_slugify"]


def _slugify(name: str) -> str:
    return name.lower().replace(" ", "_").replace("-", "_")
