"""SAM.gov WDOL API client for DBWD wage determination retrieval."""

import logging
import os
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)

DEFAULT_BASE_URL = "https://sam.gov/api/prod/wage-determinations/v1"


class SamGovError(Exception):
    pass


class SamGovClient:
    def __init__(self, api_key: str | None = None, base_url: str = DEFAULT_BASE_URL) -> None:
        self.api_key = api_key or os.environ.get("SAM_GOV_API_KEY")
        self.base_url = base_url.rstrip("/")
        if not self.api_key:
            logger.warning("SAM.gov API key not provided; API calls will fail")

    def _get_headers(self) -> dict[str, str]:
        return {
            "Accept": "application/json",
            "X-Api-Key": self.api_key or "",
        }

    async def search_wage_determinations(
        self,
        state: str | None = None,
        county: str | None = None,
        construction_type: str = "building",
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        try:
            import aiohttp

            params: dict[str, str | int] = {
                "limit": limit,
                "constructionType": construction_type,
            }
            if state:
                params["state"] = state
            if county:
                params["county"] = county

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/wage-determinations",
                    headers=self._get_headers(),
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        wds = data.get("wageDeterminations", [])
                        logger.info("Found %d wage determinations", len(wds))
                        return wds
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
        except SamGovError:
            raise
        except Exception as exc:
            logger.warning("SAM.gov search failed: %s", exc)
            return []

    async def get_wage_determination(self, wd_number: str) -> dict[str, Any] | None:
        try:
            import aiohttp

            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.base_url}/wage-determinations/{wd_number}",
                    headers=self._get_headers(),
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    if resp.status == 200:
                        return await resp.json()
                    elif resp.status == 404:
                        logger.warning("Wage determination %s not found", wd_number)
                        return None
                    else:
                        logger.warning("SAM.gov returned %d for WD %s", resp.status, wd_number)
                        return None
        except Exception as exc:
            logger.warning("Failed to get wage determination %s: %s", wd_number, exc)
            return None

    def extract_rates(self, wage_determination: dict[str, Any]) -> list[dict[str, Any]]:
        rates: list[dict[str, Any]] = []

        wd_number = wage_determination.get("wdNumber", "unknown")
        state = wage_determination.get("state", "")
        county = wage_determination.get("county", "")
        locality = f"{county}, {state}" if county else state
        effective_date = wage_determination.get("effectiveDate", "")

        classifications = wage_determination.get("classifications", [])
        for classification in classifications:
            trade_code = classification.get("code", "")
            title = classification.get("title", "")

            basic_rate = classification.get("basicHourlyRate", 0)
            fringe_rate = classification.get("fringeBenefits", 0)

            rate_key = f"{trade_code}-{state}-{effective_date[:4] if effective_date else 'unknown'}"

            rates.append({
                "rate_key": rate_key,
                "trade_code": trade_code,
                "trade_title": title,
                "locality_code": locality,
                "state": state,
                "county": county,
                "wage": float(basic_rate) if basic_rate else 0.0,
                "fringe": float(fringe_rate) if fringe_rate else 0.0,
                "effective_date": effective_date,
                "wage_determination_number": wd_number,
                "source": "sam_gov",
                "fetched_at": datetime.now(timezone.utc).isoformat(),
            })

        logger.info("Extracted %d rates from WD %s", len(rates), wd_number)
        return rates

    async def fetch_rates_for_locality(
        self,
        state: str,
        county: str | None = None,
    ) -> list[dict[str, Any]]:
        try:
            wds = await self.search_wage_determinations(state=state, county=county)
            all_rates: list[dict[str, Any]] = []

            for wd_summary in wds[:5]:
                wd_number = wd_summary.get("wdNumber")
                if not wd_number:
                    continue

                try:
                    wd_detail = await self.get_wage_determination(wd_number)
                    if wd_detail:
                        rates = self.extract_rates(wd_detail)
                        all_rates.extend(rates)
                except SamGovError as exc:
                    logger.warning("Failed to fetch WD %s: %s", wd_number, exc)
                    continue

            return all_rates

        except SamGovError:
            raise
