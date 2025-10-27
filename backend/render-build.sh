#!/bin/bash

# Render build script for backend
echo "🏗️  Building F1 Race Engineer Backend..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build TypeScript
echo "🔨 Compiling TypeScript..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Backend build completed successfully"
else
    echo "❌ Backend build failed"
    exit 1
fi
