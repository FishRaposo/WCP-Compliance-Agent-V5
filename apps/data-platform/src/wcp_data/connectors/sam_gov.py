"""SAM.gov WDOL API client for DBWD wage determination retrieval."""

import logging
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://api.sam.gov/wage-determinations/v1"


class SamGovError(Exception):
    pass


class SamGovClient:
    def __init__(self, api_key: str, base_url: str = DEFAULT_BASE_URL) -> None:
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    async def search_wage_determinations(
        self, trade: str, locality: str, limit: int = 10
    ) -> list[dict[str, Any]]:
        try:
            import aiohttp

            params = {
                "q": f"{trade} {locality}",
                "type": "wage_determination",
                "limit": str(limit),
            }
            headers = {"X-Api-Key": self.api_key}

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/search",
                    params=params,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=15),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        return data.get("results", [])
                    elif resp.status == 401:
                        raise SamGovError("Invalid SAM.gov API key")
                    elif resp.status == 429:
                        raise SamGovError("SAM.gov rate limit exceeded")
                    else:
                        logger.warning("SAM.gov returned %d", resp.status)
                        return []
        except ImportError:
            logger.warning("aiohttp not available for SAM.gov client")
            return []

    async def get_wage_determination(self, wd_number: str) -> dict[str, Any] | None:
        try:
            import aiohttp

            headers = {"X-Api-Key": self.api_key}
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/{wd_number}",
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=15),
                ) as resp:
                    if resp.status == 200:
                        return await resp.json()
        except Exception:
            pass
        return None

    def extract_rates(self, wd_data: dict[str, Any]) -> list[dict[str, Any]]:
        rates: list[dict[str, Any]] = []
        for classification in wd_data.get("classifications", []):
            rate = {
                "trade": classification.get("title", ""),
                "rate": float(classification.get("basicHourlyRate", 0)),
                "fringe": float(classification.get("fringeBenefitsHourly", 0)),
                "effective_date": wd_data.get("effectiveDate", ""),
                "wage_determination_number": wd_data.get("wageDeterminationNumber", ""),
            }
            if rate["trade"] and rate["rate"] > 0:
                rates.append(rate)
        return rates

    async def fetch_rates_for_locality(
        self, locality: str, trades: list[str] | None = None
    ) -> list[dict[str, Any]]:
        all_rates: list[dict[str, Any]] = []
        search_trades = trades or [
            "Electrician", "Plumber", "Carpenter", "Laborer", "Ironworker",
            "Equipment Operator", "Painter", "Sheet Metal Worker",
            "HVAC Technician", "Welder", "Mason", "Roofer", "Glazier",
            "Insulation Worker", "Tile Setter", "Drywall Installer",
            "Concrete Finisher", "Surveyor", "Flagger", "Truck Driver",
        ]

        for trade in search_trades:
            try:
                results = await self.search_wage_determinations(trade, locality, limit=3)
                for r in results:
                    wd_number = r.get("wageDeterminationNumber") or r.get("id")
                    if wd_number:
                        details = await self.get_wage_determination(wd_number)
                        if details:
                            rates = self.extract_rates(details)
                            for rate in rates:
                                rate["locality"] = locality
                            all_rates.extend(rates)
            except SamGovError:
                raise
            except Exception:
                logger.debug("SAM.gov fetch failed for %s in %s", trade, locality)

        return all_rates
