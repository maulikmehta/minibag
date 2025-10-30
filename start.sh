#!/bin/bash

##############################################################################
# LocalLoops - Start Script
# Quick start script for development and field testing
##############################################################################

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║                    LocalLoops - Minibag                            ║"
echo "║                    Starting Development Servers                    ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Error: Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✓${NC} Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓${NC} npm version: $(npm -v)"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Warning: .env file not found${NC}"
    if [ -f .env.example ]; then
        echo "Creating .env from .env.example..."
        cp .env.example .env
        echo -e "${YELLOW}⚠️  Please update .env with your Supabase credentials${NC}"
    else
        echo -e "${RED}❌ Error: .env.example not found${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓${NC} Environment file found"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  node_modules not found. Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✓${NC} Dependencies installed"

# Check if ports are available
check_port() {
    local port=$1
    local service=$2

    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Warning: Port $port ($service) is already in use${NC}"
        echo "Kill the process? (y/n)"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            lsof -ti:$port | xargs kill -9 2>/dev/null
            echo -e "${GREEN}✓${NC} Port $port freed"
        else
            echo -e "${RED}❌ Cannot start - port $port is in use${NC}"
            exit 1
        fi
    fi
}

echo ""
echo -e "${BLUE}Checking ports...${NC}"
check_port 3000 "Backend API & WebSocket"
check_port 5173 "Frontend"

# Start the servers
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 Starting development servers...${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Frontend:${NC}    http://localhost:5173"
echo -e "${GREEN}Backend API:${NC} http://localhost:3000"
echo -e "${GREEN}WebSocket:${NC}   http://localhost:3000"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the servers${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}"
echo ""

# Start the development servers
npm run dev
