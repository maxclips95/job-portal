#!/bin/bash

echo "🚀 Job Portal Development Setup"
echo "📊 51,480 LOC | 150+ Features | Production Ready"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Docker
echo "Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker from https://www.docker.com/products/docker-desktop"
    exit 1
fi
echo -e "${GREEN}✓ Docker is installed${NC}"

# Check Docker Compose
echo "Checking Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please update Docker or install Docker Compose separately"
    exit 1
fi
echo -e "${GREEN}✓ Docker Compose is installed${NC}"

# Check Node.js
echo "Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠ Warning: Node.js is not installed${NC}"
    echo "Download from https://nodejs.org/ (v18 or higher)"
else
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✓ Node.js $NODE_VERSION${NC}"
fi

echo ""
echo "Creating environment files..."

# Create root .env file
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✓ Created: .env"
else
    echo "✓ .env exists (skipped)"
fi

# Create backend .env
if [ ! -f backend/.env ]; then
    cat > backend/.env << EOF
NODE_ENV=development
BACKEND_PORT=3001
BACKEND_HOST=0.0.0.0
DB_HOST=localhost
DB_PORT=5432
DB_NAME=job_portal
DB_USER=postgres
DB_PASSWORD=postgres_password
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=dev-secret-key-change-in-production
GROQ_API_KEY=add-your-groq-key-here
HUGGINGFACE_API_KEY=add-your-hf-token-here
EOF
    echo "✓ Created: backend/.env"
else
    echo "✓ backend/.env exists (skipped)"
fi

# Create frontend .env.local
if [ ! -f frontend/.env.local ]; then
    cat > frontend/.env.local << EOF
NODE_ENV=development
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF
    echo "✓ Created: frontend/.env.local"
else
    echo "✓ frontend/.env.local exists (skipped)"
fi

echo ""
echo "Starting Docker containers..."
docker-compose -f docker/docker-compose.yml up -d

# Wait for services to be ready
echo "Waiting for services to start (15 seconds)..."
sleep 15

echo ""
echo "Running health checks..."

# Check PostgreSQL
if docker exec job-portal-postgres pg_isready -U postgres &> /dev/null; then
    echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
else
    echo -e "${YELLOW}⚠ PostgreSQL is starting... (may take a moment)${NC}"
fi

# Check Redis
if docker exec job-portal-redis redis-cli ping &> /dev/null; then
    echo -e "${GREEN}✓ Redis is ready${NC}"
else
    echo -e "${YELLOW}⚠ Redis is starting... (may take a moment)${NC}"
fi

echo ""
echo "============================================"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "============================================"
echo ""
echo "📍 Access Points:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:3001"
echo "   Database:  postgresql://postgres:postgres_password@localhost:5432/job_portal"
echo "   Redis:     localhost:6379"
echo ""
echo "🚀 Next Steps:"
echo "   1. npm install              (install root + workspace dependencies)"
echo "   2. npm run dev              (start frontend + backend in parallel)"
echo "   3. Visit http://localhost:3000"
echo ""
echo "📚 Documentation:"
echo "   - QUICK_START_GUIDE.md       (Getting started)"
echo "   - DEPLOYMENT_GUIDE.md        (Production deployment)"
echo "   - PRODUCTION_DOCUMENTATION.md (API reference)"
echo ""
echo "🛑 To stop all services:"
echo "   docker-compose -f docker/docker-compose.yml down"
echo ""
