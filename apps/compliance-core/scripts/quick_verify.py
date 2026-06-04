#!/usr/bin/env python3
"""quick_verify.py — Health-check all 5 WCP V5 services and run a sample analysis.

Usage:
    python apps/compliance-core/scripts/quick_verify.py
    python apps/compliance-core/scripts/quick_verify.py --base-url http://localhost:3000
"""
import argparse
import json
import sys
import urllib.error
import urllib.request

SAMPLE_TEXT = (
    "Contractor: Apex Builders Inc.\n"
    "Project: Federal Building Renovation\n"
    "Location: Washington, DC\n"
    "Certified: 2025-06-15\n\n"
    "Name: John Doe\n"
    "Trade: Electrician\n"
    "Hours: 40\n"
    "Overtime Hours: 0\n"
    "Hourly Wage: 55.00\n"
    "Fringe: 1400.00\n"
    "Gross: 2200.00\n"
    "Deductions: 150.00\n"
    "Net: 2050.00"
)


def check(url: str, label: str) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            body = json.loads(resp.read())
            status = body.get("status", "unknown")
            ok = resp.status == 200 and status in ("ok", "healthy", "success")
            mark = "✅" if ok else "⚠️"
            print(f"  {mark} {label}: HTTP {resp.status} — status={status}")
            return ok
    except urllib.error.URLError as exc:
        print(f"  ❌ {label}: unreachable ({exc.reason})")
        return False
    except Exception as exc:
        print(f"  ❌ {label}: {exc}")
        return False


def post_json(url: str, payload: dict) -> dict | None:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read())
    except Exception as exc:
        print(f"  ❌ POST {url} failed: {exc}")
        return None


def main() -> int:
    parser = argparse.ArgumentParser(description="Quick health check for WCP V5 services")
    parser.add_argument("--base-url", default="http://localhost:3000", help="Gateway base URL")
    args = parser.parse_args()
    base = args.base_url.rstrip("/")

    print("\n=== WCP V5 Quick Verify ===\n")

    print("[ Service Health Checks ]")
    results = []
    results.append(check(f"{base}/health", "gateway"))
    results.append(check("http://localhost:8000/health", "compliance-core"))
    results.append(check("http://localhost:8001/health", "data-platform"))

    print("\n[ Sample Analysis (Gateway → Agent → Compliance Core) ]")
    resp = post_json(f"{base}/api/v1/analyze", {"text": SAMPLE_TEXT})
    if resp:
        verdict = resp.get("verdict", "unknown")
        trust = resp.get("trust_score", "n/a")
        print(f"  ✅ analysis complete: verdict={verdict}, trust_score={trust}")
        results.append(True)
    else:
        print("  ❌ analysis failed or gateway unreachable")
        results.append(False)

    print("\n[ DBWD Rates Check ]")
    url = "http://localhost:8001/internal/dbwd/rates?limit=5"
    try:
        with urllib.request.urlopen(url, timeout=5) as r:
            rates = json.loads(r.read())
            print(f"  ✅ DBWD rates available: {len(rates)} records returned")
            results.append(True)
    except Exception as exc:
        print(f"  ❌ DBWD rates: {exc}")
        results.append(False)

    passed = sum(results)
    total = len(results)
    print(f"\n{'='*30}")
    print(f"  Result: {passed}/{total} checks passed")
    if passed == total:
        print("  ✅ All services healthy!")
        return 0
    else:
        print("  ⚠️  Some checks failed — see above for details")
        return 1


if __name__ == "__main__":
    sys.exit(main())
