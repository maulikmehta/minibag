#!/bin/bash

##############################################################################
# LocalLoops - Tunnel Script
# Create a public URL for field testing on mobile devices
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
echo "║                    Creating Public Tunnel                          ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check if frontend is running
if ! lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${RED}❌ Error: Frontend not running on port 5173${NC}"
    echo ""
    echo "Please start the servers first:"
    echo -e "${YELLOW}  ./start.sh${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓${NC} Frontend is running on port 5173"
echo ""

# Check which tunnel tool is available
if [ -f "./cloudflared" ] || [ -f "./cloudflared.new" ]; then
    TUNNEL_CMD="cloudflared"
    TUNNEL_FILE="./cloudflared"

    # Use the newer version if it exists
    if [ -f "./cloudflared.new" ]; then
        TUNNEL_FILE="./cloudflared.new"
    fi

    echo -e "${BLUE}Using Cloudflare Tunnel...${NC}"
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}📱 Your app will be accessible via a public URL${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}⚡ Starting tunnel... (This may take a few seconds)${NC}"
    echo ""
    echo -e "${YELLOW}Look for the line that says:${NC}"
    echo -e "${CYAN}  https://your-unique-url.trycloudflare.com${NC}"
    echo ""
    echo -e "${GREEN}📲 Share that URL with your mobile device or testers!${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop the tunnel${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════════${NC}"
    echo ""

    # Start the tunnel
    $TUNNEL_FILE tunnel --url http://localhost:5173

elif command -v ngrok &> /dev/null; then
    echo -e "${BLUE}Using ngrok tunnel...${NC}"
    echo ""
    echo -e "${CYAN}════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}📱 Your app will be accessible via a public URL${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${YELLOW}Look for the 'Forwarding' line with the https URL${NC}"
    echo ""
    echo -e "${GREEN}📲 Share that URL with your mobile device or testers!${NC}"
    echo ""
    echo -e "${YELLOW}Press Ctrl+C to stop the tunnel${NC}"
    echo -e "${CYAN}════════════════════════════════════════════════════════════════════${NC}"
    echo ""

    # Start ngrok
    ngrok http 5173

else
    echo -e "${RED}❌ No tunnel tool found${NC}"
    echo ""
    echo "Please install one of the following:"
    echo ""
    echo "Option 1: Cloudflare Tunnel (Recommended)"
    echo -e "${YELLOW}  brew install cloudflare/cloudflare/cloudflared${NC}"
    echo ""
    echo "Option 2: ngrok"
    echo -e "${YELLOW}  brew install ngrok${NC}"
    echo ""
    echo "Or use local network access:"
    echo -e "${YELLOW}  http://$(ipconfig getifaddr en0):5173${NC}"
    echo ""
    exit 1
fi
