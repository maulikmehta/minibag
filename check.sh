#!/bin/bash

##############################################################################
# LocalLoops - Health Check Script
# Verify all systems are ready for testing
##############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                    LocalLoops - Health Check                       ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Track overall status
ALL_GOOD=true

# Check Node.js
echo -n "Checking Node.js... "
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓${NC} $NODE_VERSION"
else
    echo -e "${RED}✗ Not installed${NC}"
    ALL_GOOD=false
fi

# Check npm
echo -n "Checking npm... "
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓${NC} v$NPM_VERSION"
else
    echo -e "${RED}✗ Not installed${NC}"
    ALL_GOOD=false
fi

# Check .env file
echo -n "Checking .env file... "
if [ -f .env ]; then
    echo -e "${GREEN}✓${NC} Found"

    # Check for required env vars
    if grep -q "SUPABASE_URL=" .env && grep -q "SUPABASE_ANON_KEY=" .env; then
        echo -n "  Supabase config... "
        echo -e "${GREEN}✓${NC} Configured"
    else
        echo -n "  Supabase config... "
        echo -e "${YELLOW}⚠${NC}  May need updating"
    fi
else
    echo -e "${RED}✗ Not found${NC}"
    ALL_GOOD=false
fi

# Check node_modules
echo -n "Checking dependencies... "
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} Installed"
else
    echo -e "${YELLOW}⚠${NC}  Not installed (run: npm install)"
    ALL_GOOD=false
fi

# Check if servers are running
echo ""
echo -e "${BLUE}Server Status:${NC}"

echo -n "  Frontend (5173)... "
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Running"

    # Try to fetch
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -n "    Responding... "
        echo -e "${GREEN}✓${NC}"
    fi
else
    echo -e "${YELLOW}○${NC} Not running"
fi

echo -n "  Backend API (3000)... "
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Running"

    # Try to fetch
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -n "    Responding... "
        echo -e "${GREEN}✓${NC}"
    fi
else
    echo -e "${YELLOW}○${NC} Not running"
fi

echo -n "  WebSocket (3001)... "
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Running"
else
    echo -e "${YELLOW}○${NC} Not running"
fi

# Check tunnel tools
echo ""
echo -e "${BLUE}Tunnel Tools:${NC}"

echo -n "  Cloudflare... "
if [ -f "./cloudflared" ] || [ -f "./cloudflared.new" ]; then
    echo -e "${GREEN}✓${NC} Available"
elif command -v cloudflared &> /dev/null; then
    echo -e "${GREEN}✓${NC} Installed"
else
    echo -e "${YELLOW}○${NC} Not available"
fi

echo -n "  ngrok... "
if command -v ngrok &> /dev/null; then
    echo -e "${GREEN}✓${NC} Installed"
else
    echo -e "${YELLOW}○${NC} Not installed"
fi

# Network info
echo ""
echo -e "${BLUE}Network Info:${NC}"

# Get local IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "Not found")
echo "  Local IP: ${CYAN}$LOCAL_IP${NC}"
echo "  Local URL: ${CYAN}http://$LOCAL_IP:5173${NC}"

# Summary
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}"

if [ "$ALL_GOOD" = true ]; then
    echo -e "${GREEN}✓ All systems ready!${NC}"
    echo ""
    echo "To start testing:"
    echo -e "  ${YELLOW}./start.sh${NC}     Start servers"
    echo -e "  ${YELLOW}./tunnel.sh${NC}    Create public URL"
else
    echo -e "${YELLOW}⚠ Some issues found${NC}"
    echo ""
    echo "Fix the issues above and run this script again"
fi

echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}"
echo ""
