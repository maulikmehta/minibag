#!/bin/bash

##############################################################################
# LocalLoops - Production Tunnel Script
# Starts named Cloudflare tunnel for minibag.cc field testing
##############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                    LocalLoops - Minibag                            ║"
echo "║              Production Tunnel (minibag.cc)                        ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if backend is running
if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: Backend not running on port 3000${NC}"
    echo ""
    echo "Please start the backend server first:"
    echo -e "${YELLOW}  cd /Users/maulik/llcode/localloops${NC}"
    echo -e "${YELLOW}  node packages/shared/server.js${NC}"
    echo ""
    echo "Or use the start script:"
    echo -e "${YELLOW}  ./start.sh${NC}"
    echo ""
    exit 1
fi

# Check if frontend is running
if ! lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: Frontend not running on port 5173${NC}"
    echo ""
    echo "Please start the frontend server first:"
    echo -e "${YELLOW}  cd /Users/maulik/llcode/localloops/packages/minibag${NC}"
    echo -e "${YELLOW}  npm run dev${NC}"
    echo ""
    echo "Or use the start script:"
    echo -e "${YELLOW}  ./start.sh${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} Backend is running on port 3000"
echo -e "${GREEN}✓${NC} Frontend is running on port 5173"
echo ""

# Check if cloudflared binary exists
if [ ! -f "./cloudflared" ]; then
    echo -e "${RED}❌ Error: cloudflared binary not found${NC}"
    echo ""
    echo "Expected location: ./cloudflared"
    echo ""
    exit 1
fi

echo -e "${BLUE}Starting Cloudflare Tunnel (minibag-production)...${NC}"
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}📱 Your app will be accessible at:${NC}"
echo ""
echo -e "   ${CYAN}Frontend:${NC}  https://minibag.cc"
echo -e "   ${CYAN}Backend API:${NC}  https://api.minibag.cc"
echo -e "   ${CYAN}WebSocket:${NC}  wss://api.minibag.cc"
echo ""
echo -e "${CYAN}════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Routes configured:${NC}"
echo -e "  minibag.cc → localhost:5173 (Frontend)"
echo -e "  api.minibag.cc → localhost:3000 (Backend + WebSocket)"
echo ""
echo -e "${YELLOW}⚡ Starting tunnel...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop the tunnel${NC}"
echo -e "${CYAN}════════════════════════════════════════════════════════════════════${NC}"
echo ""

# Start the tunnel with the token (--no-autoupdate to keep macOS 10.15.7 compatible version)
./cloudflared tunnel --no-autoupdate run --token eyJhIjoiMmMyNmNjNjdkZGU3YWFjMDBmZDdkMWQ2NmU4NGJmN2MiLCJ0IjoiMDZmNThhZmYtMDk4My00N2ZjLTg3MjctYjZkZDE2ODFlNjM5IiwicyI6Ik16ZzJNek0yTURJdE56VTBaUzAwTWpBM0xXRTRNREF0TXpRek5tVXlOR1ZoWVROaiJ9
