#!/bin/bash
# Seed the database with initial data for WCP Compliance Agent V5
# This script should be run from the project root

set -e

echo "Seeding database..."

# Activate virtual environment and run seed scripts
cd apps/data-platform

# Seed DBWD rates
echo "Seeding DBWD rates..."
poetry run python scripts/seed_dbwd.py

# Seed test user
echo "Seeding test user..."
poetry run python scripts/seed_user.py

echo "Database seeding complete!"
