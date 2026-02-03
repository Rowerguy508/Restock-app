#!/bin/bash
# Restocka Production Setup Script
# Run this to configure all integrations

set -e

echo "🦞 Restocka Production Setup"
echo "=============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Helper
log() { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[-]${NC} $1"; }

# Check for required tools
check_tools() {
  log "Checking tools..."
  command -v vercel >/dev/null 2>&1 || { err "vercel CLI not installed. Run: npm i -g vercel"; exit 1; }
  command -v jq >/dev/null 2>&1 || { warn "jq not installed - JSON parsing will be limited"; }
  log "Tools check complete"
}

# Setup Supabase
setup_supabase() {
  log "Setting up Supabase..."
  
  # Check if migration file exists
  if [ ! -f "supabase/migrations/002_subscription_monetization.sql" ]; then
    err "Migration file not found: supabase/migrations/002_subscription_monetization.sql"
    return 1
  fi
  
  echo ""
  echo "📋 Run this SQL in Supabase Dashboard (SQL Editor):"
  echo ""
  echo "--- COPY BELOW ---"
  cat supabase/migrations/002_subscription_monetization.sql
  echo "--- COPY ABOVE ---"
  echo ""
  
  read -p "Press Enter after running the SQL..."
  
  log "Supabase setup complete"
}

# Setup Stripe
setup_stripe() {
  log "Setting up Stripe..."
  
  echo ""
  echo "📋 Steps to configure Stripe:"
  echo ""
  echo "1. Go to https://dashboard.stripe.com/apikeys"
  echo "2. Copy your live keys"
  echo "3. Create products/prices in Stripe Dashboard"
  echo "4. Set up webhook: https://api-gilt-xi-28.vercel.app/api/webhook"
  echo ""
  
  # Interactive setup
  read -p "Enter STRIPE_SECRET_KEY (sk_live_...): " STRIPE_SECRET_KEY
  read -p "Enter STRIPE_WEBHOOK_SECRET (whsec_...): " STRIPE_WEBHOOK_SECRET
  read -p "Enter STRIPE_PRO_PRICE_ID (price_...): " STRIPE_PRO_PRICE_ID
  read -p "Enter STRIPE_BUSINESS_PRICE_ID (price_...): " STRIPE_BUSINESS_PRICE_ID
  
  # Add to Vercel
  log "Adding to Vercel environment..."
  vercel env add STRIPE_SECRET_KEY production --token ${VERCEL_TOKEN:-$(cat ~/.vercel-token 2>/dev/null || echo "")}
  vercel env add STRIPE_WEBHOOK_SECRET production
  vercel env add STRIPE_PRO_PRICE_ID production
  vercel env add STRIPE_BUSINESS_PRICE_ID production
  
  log "Stripe setup complete"
}

# Setup Supabase Keys in Vercel
setup_supabase_vercel() {
  log "Setting up Supabase in Vercel..."
  
  read -p "Enter SUPABASE_URL: " SUPABASE_URL
  read -p "Enter SUPABASE_SERVICE_KEY: " SUPABASE_SERVICE_KEY
  read -p "Enter SUPABASE_ANON_KEY: " SUPABASE_ANON_KEY
  
  log "Adding to Vercel..."
  vercel env add SUPABASE_URL production
  vercel env add SUPABASE_SERVICE_KEY production
  vercel env add SUPABASE_ANON_KEY production
  
  log "Supabase Vercel setup complete"
}

# Setup Environment File
setup_env_file() {
  log "Creating .env.example..."
  
  cat > .env.example << 'EOF'
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_BUSINESS_PRICE_ID=price_xxx

# URLs
STRIPE_SUCCESS_URL=https://login.restocka.app/success
STRIPE_CANCEL_URL=https://login.restocka.app/pricing
EOF
  
  log ".env.example created"
}

# Verify Setup
verify() {
  log "Verifying setup..."
  
  echo ""
  echo "Checking API debug endpoint..."
  DEBUG=$(curl -s https://api-gilt-xi-28.vercel.app/api/debug 2>/dev/null)
  
  SUPABASE=$(echo $DEBUG | jq -r '.supabase' 2>/dev/null || echo "unknown")
  STRIPE=$(echo $DEBUG | jq -r '.stripe' 2>/dev/null || echo "unknown")
  
  echo "Supabase configured: $SUPABASE"
  echo "Stripe configured: $STRIPE"
  
  if [ "$SUPABASE" = "true" ] && [ "$STRIPE" = "true" ]; then
    log "🎉 All integrations configured!"
  else
    warn "Some integrations still need configuration"
  fi
}

# Main Menu
main() {
  check_tools
  
  echo ""
  echo "Choose setup option:"
  echo "1) Setup everything (Supabase + Stripe)"
  echo "2) Setup Supabase only"
  echo "3) Setup Stripe only"
  echo "4) Generate .env.example"
  echo "5) Verify current setup"
  echo "6) Exit"
  
  read -p "Choice: " choice
  
  case $choice in
    1) setup_supabase; setup_supabase_vercel; setup_stripe; verify;;
    2) setup_supabase; setup_supabase_vercel; verify;;
    3) setup_stripe; verify;;
    4) setup_env_file;;
    5) verify;;
    6) exit 0;;
    *) err "Invalid choice"; exit 1;;
  esac
}

main "$@"
