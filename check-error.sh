#!/bin/bash
echo "Running TypeScript compiler to check for errors..."
NODE_OPTIONS="--max-old-space-size=4096" ./node_modules/.bin/tsc --noEmit