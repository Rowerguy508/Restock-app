#!/bin/bash
# Apply Restocka subscription migration to Supabase
# Usage: ./apply-migration.sh [supabase-url] [service-role-key]

set -e

SUPABASE_URL="${1:-$SUPABASE_URL}"
SUPABASE_KEY="${2:-$SUPABASE_SERVICE_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_KEY" ]; then
    echo "Usage: ./apply-migration.sh <supabase-url> <service-role-key>"
    echo "Or set SUPABASE_URL and SUPABASE_SERVICE_KEY environment variables"
    exit 1
fi

echo "Applying subscription migration to Supabase..."
echo "URL: $SUPABASE_URL"

curl -X POST \
  "$SUPABASE_URL/functions/v1/pg-functions" \
  -H "Authorization: Bearer $SUPABASE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "function_name": "exec_sql",
    "args": {}
  }' 2>/dev/null || \

# Alternative: Use SQL directly if you have psql
echo "Migration file created at: supabase/migrations/002_subscription_monetization.sql"
echo ""
echo "To apply via Supabase Dashboard:"
echo "1. Go to https://supabase.com/dashboard"
echo "2. Select your project"
echo "3. Go to SQL Editor"
echo "4. Open supabase/migrations/002_subscription_monetization.sql"
echo "5. Run the SQL"
