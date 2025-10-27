#!/bin/bash

# Render build script for frontend
echo "🏗️  Building F1 Race Engineer Frontend..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build Vite production bundle
echo "🔨 Building production bundle..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Frontend build completed successfully"
    echo "📁 Build output: dist/"
else
    echo "❌ Frontend build failed"
    exit 1
fi
