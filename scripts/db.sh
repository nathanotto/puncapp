#!/bin/bash
# Helper script to run SQL queries against Supabase

# Load environment variables
source .env.local 2>/dev/null || true

# Supabase connection details
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-dlq7vgnkQUFfIMqS}"
PROJECT_REF="krfbavajdsgehhfngpcs"

# Try different connection formats
# Format 1: Direct connection
CONNECTION_STRING="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

# Run psql with the connection string
export PGPASSWORD="$DB_PASSWORD"
/opt/homebrew/opt/postgresql@16/bin/psql "$CONNECTION_STRING" "$@"
