#!/bin/bash
# restore.sh - Restore from a snapshot
# Usage: ./restore.sh [snapshot-name] or ./restore.sh (interactive)

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
RESTORE_DIR="RESTORE_POINTS"
MAIN_FILE="minibag-ui-prototype.tsx"

# Function to list available snapshots
list_snapshots() {
    echo -e "${BLUE}Available snapshots:${NC}"
    echo ""

    if [ ! -d "$RESTORE_DIR" ] || [ -z "$(ls -A $RESTORE_DIR/*.bak 2>/dev/null)" ]; then
        echo "No snapshots found."
        return 1
    fi

    local i=1
    for file in $RESTORE_DIR/*.tsx.bak; do
        if [ -f "$file" ]; then
            basename=$(basename "$file" .tsx.bak)
            size=$(du -h "$file" | cut -f1)
            echo "  [$i] $basename ($size)"

            # Show metadata if exists
            if [ -f "${RESTORE_DIR}/${basename}.meta.txt" ]; then
                desc=$(grep "Description:" "${RESTORE_DIR}/${basename}.meta.txt" | cut -d: -f2-)
                echo "      Description:$desc"
            fi
            echo ""
            i=$((i+1))
        fi
    done
}

# Function to restore a snapshot
restore_snapshot() {
    local snapshot_name=$1
    local backup_file="${RESTORE_DIR}/${snapshot_name}.tsx.bak"

    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}❌ Snapshot not found: ${snapshot_name}${NC}"
        exit 1
    fi

    echo -e "${YELLOW}⚠️  This will replace your current ${MAIN_FILE}${NC}"
    echo ""

    # Show what will be restored
    if [ -f "${RESTORE_DIR}/${snapshot_name}.meta.txt" ]; then
        echo "Restoring:"
        cat "${RESTORE_DIR}/${snapshot_name}.meta.txt"
        echo ""
    fi

    # Confirm
    read -p "Continue? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Restore cancelled."
        exit 0
    fi

    # Create backup of current file before restoring
    echo ""
    echo "📁 Creating safety backup of current file..."
    cp "$MAIN_FILE" "${RESTORE_DIR}/pre-restore-$(date +%Y%m%d-%H%M%S).tsx.bak"

    # Restore
    echo "🔄 Restoring snapshot..."
    cp "$backup_file" "$MAIN_FILE"

    echo ""
    echo -e "${GREEN}✅ Snapshot restored successfully!${NC}"
    echo ""
    echo "Restored: ${MAIN_FILE}"
    echo "From: ${snapshot_name}"
    echo ""
    echo "Next steps:"
    echo "  1. Restart your dev server if running"
    echo "  2. Test the application"
    echo "  3. Update VERSION_HISTORY.md if rolling back an experiment"
    echo ""
}

# Main logic
if [ -z "$1" ]; then
    # Interactive mode
    echo -e "${BLUE}=== Minibag Restore Tool ===${NC}"
    echo ""

    list_snapshots

    if [ $? -eq 1 ]; then
        exit 1
    fi

    echo ""
    read -p "Enter snapshot number or name (or 'q' to quit): " choice

    if [ "$choice" = "q" ]; then
        echo "Cancelled."
        exit 0
    fi

    # Check if numeric (selecting by number)
    if [[ "$choice" =~ ^[0-9]+$ ]]; then
        # Get the nth file
        snapshot_file=$(ls $RESTORE_DIR/*.tsx.bak 2>/dev/null | sed -n "${choice}p")
        if [ -z "$snapshot_file" ]; then
            echo -e "${RED}Invalid selection${NC}"
            exit 1
        fi
        snapshot_name=$(basename "$snapshot_file" .tsx.bak)
    else
        # Assume it's a snapshot name
        snapshot_name="$choice"
    fi

    restore_snapshot "$snapshot_name"
else
    # Direct mode - snapshot name provided
    restore_snapshot "$1"
fi
