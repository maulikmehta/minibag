#!/bin/bash

# Deployment Configuration Verification Script
# Run this before deploying to production to catch misconfigurations

set -e

echo "==================================="
echo "Deployment Configuration Verification"
echo "==================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to check required variable
check_required() {
  local var_name=$1
  local var_value=$2
  local expected_pattern=$3

  if [ -z "$var_value" ]; then
    echo -e "${RED}❌ MISSING: $var_name${NC}"
    ERRORS=$((ERRORS + 1))
  elif [[ ! "$var_value" =~ $expected_pattern ]]; then
    echo -e "${RED}❌ INVALID: $var_name (expected pattern: $expected_pattern, got: $var_value)${NC}"
    ERRORS=$((ERRORS + 1))
  else
    echo -e "${GREEN}✓ $var_name: $var_value${NC}"
  fi
}

# Function to check optional variable
check_optional() {
  local var_name=$1
  local var_value=$2

  if [ -z "$var_value" ]; then
    echo -e "${YELLOW}⚠ OPTIONAL: $var_name (not set)${NC}"
    WARNINGS=$((WARNINGS + 1))
  else
    echo -e "${GREEN}✓ $var_name: $var_value${NC}"
  fi
}

echo "Checking .env.production file..."
echo ""

if [ ! -f ".env.production" ]; then
  echo -e "${RED}❌ CRITICAL: .env.production file not found${NC}"
  exit 1
fi

# Load production environment variables (in a subshell to avoid pollution)
PROD_VARS=$(cat .env.production | grep -v '^#' | grep -v '^$')

# Extract specific variables
VITE_API_URL=$(echo "$PROD_VARS" | grep "^VITE_API_URL=" | cut -d'=' -f2)
VITE_WS_URL=$(echo "$PROD_VARS" | grep "^VITE_WS_URL=" | cut -d'=' -f2)
VITE_SUPABASE_URL=$(echo "$PROD_VARS" | grep "^VITE_SUPABASE_URL=" | cut -d'=' -f2)
VITE_SUPABASE_ANON_KEY=$(echo "$PROD_VARS" | grep "^VITE_SUPABASE_ANON_KEY=" | cut -d'=' -f2)
PROD_NODE_ENV=$(echo "$PROD_VARS" | grep "^NODE_ENV=" | cut -d'=' -f2)
VITE_SENTRY_DSN=$(echo "$PROD_VARS" | grep "^VITE_SENTRY_DSN=" | cut -d'=' -f2)

echo "--- Frontend Configuration (Vercel) ---"
check_required "VITE_API_URL" "$VITE_API_URL" "^https://"
check_required "VITE_WS_URL" "$VITE_WS_URL" "^wss://"
check_required "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL" "^https://"
check_required "VITE_SUPABASE_ANON_KEY" "$VITE_SUPABASE_ANON_KEY" "^sb_"
check_required "NODE_ENV (in .env.production)" "$PROD_NODE_ENV" "^production$"
check_optional "VITE_SENTRY_DSN" "$VITE_SENTRY_DSN"

echo ""
echo "--- Backend Configuration (Render) ---"
echo -e "${YELLOW}NOTE: These must be set manually in Render dashboard${NC}"
echo ""

# Check local .env for reference
if [ -f ".env" ]; then
  source .env
  echo "Reference values from local .env (verify these are set on Render):"
  echo ""
  check_required "SUPABASE_URL" "$SUPABASE_URL" "^https://"
  check_required "SUPABASE_SERVICE_KEY" "$SUPABASE_SERVICE_KEY" "^sb_"
  check_required "DATABASE_URL" "$DATABASE_URL" "^postgresql://"
  check_optional "JWT_SECRET" "$JWT_SECRET"
  check_optional "ENCRYPTION_KEY" "$ENCRYPTION_KEY"
  check_optional "SENTRY_DSN" "$SENTRY_DSN"

  echo ""
  echo -e "${YELLOW}⚠ CRITICAL: Ensure these are set on Render:${NC}"
  echo "  - NODE_ENV=production"
  echo "  - FRONTEND_URL=https://minibag.cc"
  echo "  - USE_SESSIONS_SDK=true"
  echo "  - DUAL_WRITE_MODE=false"
  echo "  - ENABLE_GROUP_MODE=true"
fi

echo ""
echo "--- Validation Checks ---"

# Check API URL matches expected backend domain
if [[ "$VITE_API_URL" != "https://minibag.onrender.com" ]]; then
  echo -e "${YELLOW}⚠ WARNING: VITE_API_URL is not the standard production backend${NC}"
  echo "  Expected: https://minibag.onrender.com"
  echo "  Got: $VITE_API_URL"
  WARNINGS=$((WARNINGS + 1))
fi

# Check WebSocket URL matches API URL
API_DOMAIN=$(echo "$VITE_API_URL" | sed 's/https:\/\///')
WS_DOMAIN=$(echo "$VITE_WS_URL" | sed 's/wss:\/\///')
if [[ "$API_DOMAIN" != "$WS_DOMAIN" ]]; then
  echo -e "${RED}❌ ERROR: API and WebSocket domains don't match${NC}"
  echo "  API: $API_DOMAIN"
  echo "  WS: $WS_DOMAIN"
  ERRORS=$((ERRORS + 1))
fi

# Check NODE_ENV is production in .env.production file
if [[ "$PROD_NODE_ENV" != "production" ]]; then
  echo -e "${RED}❌ ERROR: NODE_ENV must be 'production' in .env.production${NC}"
  ERRORS=$((ERRORS + 1))
fi

echo ""
echo "==================================="
echo "Summary"
echo "==================================="
echo -e "Errors: ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}❌ Configuration has errors. Fix them before deploying.${NC}"
  exit 1
elif [ $WARNINGS -gt 0 ]; then
  echo -e "${YELLOW}⚠ Configuration has warnings. Review before deploying.${NC}"
  exit 0
else
  echo -e "${GREEN}✓ Configuration looks good!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Verify backend env vars are set on Render (especially FRONTEND_URL)"
  echo "2. Deploy backend first: git push origin master"
  echo "3. Check Render logs for: 'CORS Configuration'"
  echo "4. Test backend health: curl https://minibag.onrender.com/health"
  echo "5. Deploy frontend: Vercel auto-deploys or manual trigger"
  echo "6. Test in production: https://minibag.cc"
  exit 0
fi
