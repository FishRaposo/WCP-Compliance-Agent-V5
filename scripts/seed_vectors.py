#!/usr/bin/env python3
"""seed_vectors.py — POST regulation text chunks to compliance-core /internal/search index.

Usage:
    python scripts/seed_vectors.py
    python scripts/seed_vectors.py --url http://localhost:8000
"""
import argparse
import json
import sys
import urllib.error
import urllib.request

REGULATION_CHUNKS = [
    {
        "id": "reg-001",
        "text": "The Davis-Bacon Act requires contractors and subcontractors on Federal or federally assisted construction contracts to pay their laborers and mechanics wages and fringe benefits at least equal to the locally prevailing wages.",
        "source": "Davis-Bacon Act, 40 U.S.C. § 3141",
        "category": "wage_requirement",
    },
    {
        "id": "reg-002",
        "text": "No contractor or subcontractor contracting for any part of the contract work which may require or involve the employment of laborers or mechanics shall require or permit any such laborer or mechanic in any workweek in which he or she is employed on such work to work in excess of forty hours in such workweek unless such laborer or mechanic receives compensation at a rate not less than one and one-half times the basic rate of pay for all hours worked in excess of forty hours in such workweek.",
        "source": "Contract Work Hours and Safety Standards Act, 40 U.S.C. § 3702(a)",
        "category": "overtime",
    },
    {
        "id": "reg-003",
        "text": "Every contractor and subcontractor shall submit weekly certified payroll records to the federal agency. The payroll records shall contain the name, address, and Social Security number of each such employee, his or her correct classification, hourly rates of wages paid, daily and weekly number of hours worked, deductions made and actual wages paid.",
        "source": "29 C.F.R. § 5.5(a)(3)(ii)",
        "category": "payroll_reporting",
    },
    {
        "id": "reg-004",
        "text": "Fringe benefits means the amount of contributions irrevocably made to a trustee or third party pursuant to a bona fide fringe benefit fund, plan, or program; and the rate of costs to the contractor or subcontractor which may be reasonably anticipated in providing bona fide fringe benefits to laborers or mechanics pursuant to an enforceable commitment.",
        "source": "29 C.F.R. § 5.2(p)",
        "category": "fringe_benefits",
    },
    {
        "id": "reg-005",
        "text": "The prevailing wage determinations are based on surveys of wages paid to workers in a given locality for the same type of construction. If no applicable wage determination exists, the contractor must use the federal minimum wage rate under the Fair Labor Standards Act.",
        "source": "40 U.S.C. § 3142; 29 U.S.C. § 206(a)(1)",
        "category": "prevailing_wage",
    },
    {
        "id": "reg-006",
        "text": "A violation of the Davis-Bacon Act may result in the contractor or subcontractor being debarred from future Federal contracts for a period of up to three years. Underpayments must be remedied and all back wages must be paid to affected workers.",
        "source": "40 U.S.C. § 3144",
        "category": "enforcement",
    },
    {
        "id": "reg-007",
        "text": "Apprentices and trainees may be employed at less than the predetermined wage rate only when they are employed pursuant to and individually registered in a bona fide apprenticeship program registered with the U.S. Department of Labor.",
        "source": "29 C.F.R. § 5.5(a)(4)",
        "category": "apprentice_rates",
    },
    {
        "id": "reg-008",
        "text": "The wage determination shall be made a part of every contract for construction. The contracting agency shall require contractors to maintain payroll records for three years after completion of the contract and to make such records available for inspection.",
        "source": "29 C.F.R. § 5.5(a)(1)",
        "category": "record_keeping",
    },
]


def post_chunk(base_url: str, chunk: dict) -> bool:
    url = f"{base_url}/internal/search/index"
    data = json.dumps(chunk).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            ok = resp.status in (200, 201)
            if ok:
                print(f"  ✅ indexed: {chunk['id']} — {chunk['category']}")
            else:
                print(f"  ⚠️  {chunk['id']}: HTTP {resp.status}")
            return ok
    except urllib.error.HTTPError as exc:
        if exc.code == 404:
            print(f"  ⚠️  /internal/search/index not found — compliance-core search index may not be enabled")
        else:
            print(f"  ❌ {chunk['id']}: HTTP {exc.code}")
        return False
    except Exception as exc:
        print(f"  ❌ {chunk['id']}: {exc}")
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed regulation text into compliance-core vector index")
    parser.add_argument("--url", default="http://localhost:8000", help="Compliance-core base URL")
    args = parser.parse_args()
    base = args.url.rstrip("/")

    print(f"\n=== Seeding {len(REGULATION_CHUNKS)} regulation chunks to {base} ===\n")

    results = [post_chunk(base, chunk) for chunk in REGULATION_CHUNKS]
    passed = sum(results)

    print(f"\n  {passed}/{len(results)} chunks indexed successfully")
    return 0 if passed == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
