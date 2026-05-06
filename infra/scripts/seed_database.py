"""Seed script for database initialization.

This script can be run to populate the database with initial data including
DBWD rates, test users, and sample contracts.
"""

import asyncio
import sys
from pathlib import Path

# Add the data-platform src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "apps" / "data-platform" / "src"))

from wcp_data.scripts.seed_dbwd import seed_dbwd_rates
from wcp_data.scripts.seed_user import seed_test_user


async def main():
    """Run all seed operations."""
    print("Starting database seeding...")
    
    # Seed DBWD rates
    print("Seeding DBWD rates...")
    await seed_dbwd_rates()
    
    # Seed test user
    print("Seeding test user...")
    await seed_test_user()
    
    print("Database seeding complete!")


if __name__ == "__main__":
    asyncio.run(main())
