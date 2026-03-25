#!/bin/bash
# Cloudflare Pages build script - copies only frontend files to dist/
mkdir -p dist
cp index.html dist/
cp customer-dashboard.html dist/
cp worker-dashboard.html dist/
cp styles.css dist/
cp app.js dist/
cp customer.js dist/
cp worker.js dist/
cp config.js dist/
cp -r public dist/ 2>/dev/null || true
echo "Build complete"
