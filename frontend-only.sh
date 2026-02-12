#!/bin/bash

echo ""
echo "============================================"
echo "  Job Portal - Frontend Only Setup"
echo "  (No Docker, Database, or Redis needed)"
echo "============================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js ${NODE_VERSION}${NC}"

# Check npm
echo "Checking npm installation..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ npm ${NPM_VERSION}${NC}"

echo ""
echo "============================================"
echo "Installing Dependencies (First Time Only)"
echo "============================================"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install root dependencies${NC}"
        exit 1
    fi
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install --prefix=frontend
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install frontend dependencies${NC}"
        exit 1
    fi
fi

echo ""
echo "============================================"
echo "Starting Frontend (Next.js Development)"
echo "============================================"
echo ""
echo -e "${GREEN}✓ Frontend is starting...${NC}"
echo ""
echo "📍 Open in browser: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Start frontend
npm run frontend:dev
