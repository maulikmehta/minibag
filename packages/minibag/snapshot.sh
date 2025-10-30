#!/bin/bash
# snapshot.sh - Create a restore point before making experimental changes
# Usage: ./snapshot.sh "description of change"

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
RESTORE_DIR="RESTORE_POINTS"
MAIN_FILE="minibag-ui-prototype.tsx"
DATE=$(date +%Y-%m-%d)
TIME=$(date +%H%M%S)

# Check if description provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: ./snapshot.sh \"description of change\"${NC}"
    echo "Example: ./snapshot.sh \"add-dark-mode\""
    exit 1
fi

DESCRIPTION=$(echo "$1" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
SNAPSHOT_NAME="${DATE}_${DESCRIPTION}"

echo -e "${BLUE}Creating restore point: ${SNAPSHOT_NAME}${NC}"
echo ""

# Create restore directory if it doesn't exist
mkdir -p "$RESTORE_DIR"

# Backup main file
echo "📁 Backing up ${MAIN_FILE}..."
cp "$MAIN_FILE" "${RESTORE_DIR}/${SNAPSHOT_NAME}.tsx.bak"

# Create metadata file
echo "📝 Creating metadata..."
cat > "${RESTORE_DIR}/${SNAPSHOT_NAME}.meta.txt" <<EOF
Restore Point: ${SNAPSHOT_NAME}
Date: ${DATE}
Time: $(date +%H:%M:%S)
Description: $1

Files backed up:
- ${MAIN_FILE}

To restore:
  cp ${RESTORE_DIR}/${SNAPSHOT_NAME}.tsx.bak ${MAIN_FILE}

Or use:
  ./restore.sh ${SNAPSHOT_NAME}
EOF

# Calculate file size
FILE_SIZE=$(du -h "${RESTORE_DIR}/${SNAPSHOT_NAME}.tsx.bak" | cut -f1)

echo ""
echo -e "${GREEN}✅ Snapshot created successfully!${NC}"
echo ""
echo "Snapshot details:"
echo "  Name: ${SNAPSHOT_NAME}"
echo "  Size: ${FILE_SIZE}"
echo "  Location: ${RESTORE_DIR}/"
echo ""
echo "To restore this snapshot:"
echo "  ./restore.sh ${SNAPSHOT_NAME}"
echo ""
echo "Next steps:"
echo "  1. Update EXPERIMENTAL_FEATURES.md with experiment details"
echo "  2. Make your changes to ${MAIN_FILE}"
echo "  3. Test thoroughly"
echo ""
