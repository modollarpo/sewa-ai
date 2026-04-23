#!/bin/bash
# SEWA AI — Create Prisma Migration Baseline
# For production safety. Run once before first deploy.

set -e

# Navigate to backend directory
cd "$(dirname "$0")/.."
cd backend

echo "🚀 Creating Prisma migration baseline (init)..."

# Ensure migrations directory starts fresh
rm -rf prisma/migrations

# We use migrate dev --create-only to generate the files.
# This requires a database connection string in the environment.
# We skip the actually application to the DB during this generation phase.
npx prisma migrate dev --name init --create-only

echo "✅ Baseline created successfully in backend/prisma/migrations/"
echo "To finish:"
echo "  git add prisma/migrations/"
echo "  git commit -m \"chore: prisma migration baseline\""
