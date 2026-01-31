#!/bin/bash
# Execute SQL against Supabase by creating a temporary migration

set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/exec-sql.sh 'SELECT * FROM users;'"
  echo "   OR: ./scripts/exec-sql.sh -f path/to/file.sql"
  exit 1
fi

# Load environment
export SUPABASE_ACCESS_TOKEN="${SUPABASE_ACCESS_TOKEN:-sbp_64461167f0d83d422e2eb2dbb0f726485faaae11}"

# Create temp migration file
TEMP_MIGRATION="supabase/migrations/_temp_$(date +%s).sql"

if [ "$1" == "-f" ]; then
  # Read from file
  cp "$2" "$TEMP_MIGRATION"
else
  # Direct SQL
  echo "$1" > "$TEMP_MIGRATION"
fi

echo "Executing SQL..."
cat "$TEMP_MIGRATION"
echo ""

# Push the migration
supabase db push --no-verify

# Clean up
rm "$TEMP_MIGRATION"

echo "✅ SQL executed successfully"
