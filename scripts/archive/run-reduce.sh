#!/bin/bash

# Production script for reduce-rules
# This uses sonnet model and modifies your actual .ruler files

echo "=================================="
echo "⚠️  PRODUCTION MODE - REDUCE RULES"
echo "=================================="
echo ""
echo "WARNING: This will:"
echo "• Use sonnet model (higher quality)"
echo "• MODIFY your actual .ruler/ directory"
echo "• Create backups in backups/"
echo ""

# Prompt for confirmation
read -p "Are you sure you want to run in PRODUCTION mode? [y/N]: " response

if [[ "$response" != "y" && "$response" != "Y" ]]; then
    echo "Aborted. Use scripts/test-reduce.sh for safe testing."
    exit 1
fi

echo ""
echo "Running reduce-rules.ts in PRODUCTION MODE..."
echo "=================================="

# Run WITHOUT TEST_MODE (production)
unset TEST_MODE
bun scripts/reduce-rules.ts

echo ""
echo "=================================="
echo "PRODUCTION RUN COMPLETE"
echo "=================================="
echo ""
echo "Check the results in:"
echo "• .ruler/ - Your ACTUAL rule files (modified)"
echo "• backups/ - Backup of original files"
echo "• logs/ - Processing logs"