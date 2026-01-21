#!/bin/bash

# Run TypeScript compiler and capture errors
echo "Checking for TypeScript errors..."
NODE_OPTIONS="--max-old-space-size=4096" ./node_modules/.bin/tsc --noEmit 2>&1 | grep -E "(error|Error)" | head -20

echo "Checking for overload errors specifically..."
NODE_OPTIONS="--max-old-space-size=4096" ./node_modules/.bin/tsc --noEmit 2>&1 | grep -E "overload" | head -10