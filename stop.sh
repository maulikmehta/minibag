#!/bin/bash

##############################################################################
# LocalLoops - Stop Script
# Cleanly stops all development servers
##############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                    LocalLoops - Minibag                            ║"
echo "║                    Stopping Development Servers                    ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Function to kill processes on a port
kill_port() {
    local port=$1
    local service=$2

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}Stopping $service on port $port...${NC}"
        lsof -ti:$port | xargs kill -9 2>/dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓${NC} $service stopped"
        else
            echo -e "${RED}✗${NC} Failed to stop $service"
        fi
    else
        echo -e "${BLUE}○${NC} $service not running on port $port"
    fi
}

# Kill all Node.js processes related to LocalLoops
echo -e "${YELLOW}Stopping all Node.js processes...${NC}"
pkill -f "node.*localloops" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "nodemon" 2>/dev/null

echo ""

# Kill specific ports
kill_port 3000 "Backend API"
kill_port 3001 "WebSocket Server"
kill_port 5173 "Frontend (Vite)"

echo ""
echo -e "${GREEN}✓ All servers stopped${NC}"
echo ""
