"""Prefect ETL pipeline utilities.

Import-safe decorators and retry/timeout helpers that degrade gracefully
when prefect is not installed.
"""

import asyncio
import functools
import logging
from typing import Any, Callable, TypeVar

logger = logging.getLogger(__name__)

T = TypeVar("T")


def import_safe_flow(name: str):
    """Decorator that makes a function callable both as a Prefect flow and a plain async function."""
    def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(fn)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            try:
                from prefect import flow as prefect_flow
                @prefect_flow(name=name)
                async def _inner():
                    return await fn(*args, **kwargs)
                return await _inner()
            except ImportError:
                return await fn(*args, **kwargs)
        return wrapper
    return decorator


def retry(max_attempts: int = 3, delay_seconds: float = 1.0):
    """Retry decorator with exponential backoff."""
    def decorator(fn: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(fn)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            last_error = None
            for attempt in range(1, max_attempts + 1):
                try:
                    return await fn(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    if attempt < max_attempts:
                        wait = delay_seconds * (2 ** (attempt - 1))
                        logger.warning("Retry %d/%d after %.1fs: %s", attempt, max_attempts, wait, e)
                        await asyncio.sleep(wait)
            raise last_error or RuntimeError("Retry exhausted")
        return wrapper
    return decorator
