#!/bin/bash

# Test script for reduce-rules with TEST_MODE enabled
# This uses haiku model and outputs to test.ruler for safety

echo "=================================="
echo "Starting Reduce Rules in TEST MODE"
echo "=================================="
echo ""
echo "This will:"
echo "• Use haiku model (faster but less accurate)"
echo "• Output to test.ruler/ directory"
echo "• Leave your .ruler/ files COMPLETELY UNTOUCHED"
echo ""

# Ensure test.ruler directory exists with sample files if empty
if [ ! -d "test.ruler" ] || [ -z "$(ls -A test.ruler)" ]; then
    echo "Creating test.ruler with sample rules..."
    mkdir -p test.ruler

    # Create minimal test rules
    cat > test.ruler/01-sample.md << 'EOF'
# Sample Test Rules

Priority: High

## Core Rules

**Rule**: Always test in isolation
- ✅ DO: Use test directories
- ❌ DON'T: Test on production
EOF

    cat > test.ruler/02-sample.md << 'EOF'
# Sample Type Safety

Priority: Critical

## Type Rules

**Rule**: Never use any type
- ✅ DO: Use unknown
- ❌ DON'T: Use any
EOF

    echo "✅ Created sample test rules"
fi

echo ""
echo "Running reduce-rules.ts in TEST_MODE..."
echo "=================================="

# Run with TEST_MODE enabled
export TEST_MODE=true
bun scripts/reduce-rules.ts

echo ""
echo "=================================="
echo "TEST MODE RUN COMPLETE"
echo "=================================="
echo ""
echo "Check the results in:"
echo "• test.ruler/ - Generated rule files"
echo "• logs/ - Processing logs"
echo ""
echo "Your original .ruler/ files remain untouched!"