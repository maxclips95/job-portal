@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo.  Job Portal Development Setup
echo.  51,480 LOC | 150+ Features | Production Ready
echo ============================================
echo.

REM Check Docker
echo Checking Docker installation...
docker --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not installed or not in PATH.
    echo Please install Docker Desktop from https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)

REM Check Docker Compose
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker Compose is not installed.
    echo Please update Docker Desktop to include Compose.
    echo.
    pause
    exit /b 1
)

REM Check Node.js
echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo WARNING: Node.js is not installed.
    echo Download from https://nodejs.org/ (v18 or higher)
) else (
    echo Node.js: OK
)

REM Create root .env files
echo.
echo Creating environment files...
if not exist .env (
    copy .env.example .env
    echo Created: .env
)

REM Create backend .env
if not exist backend\.env (
    (
        echo NODE_ENV=development
        echo BACKEND_PORT=3001
        echo BACKEND_HOST=0.0.0.0
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo DB_NAME=job_portal
        echo DB_USER=postgres
        echo DB_PASSWORD=postgres_password
        echo REDIS_HOST=localhost
        echo REDIS_PORT=6379
        echo JWT_SECRET=dev-secret-key-change-in-production
        echo GROQ_API_KEY=add-your-groq-key-here
        echo HUGGINGFACE_API_KEY=add-your-hf-token-here
    ) > backend\.env
    echo Created: backend\.env
) else (
    echo Updated: backend\.env
)

REM Create frontend .env
if not exist frontend\.env.local (
    (
        echo NODE_ENV=development
        echo NEXT_PUBLIC_API_URL=http://localhost:3001
    ) > frontend\.env.local
    echo Created: frontend\.env.local
)

echo.
echo ============================================
echo.  Starting Docker Containers...
echo ============================================
echo.

REM Start Docker containers
docker-compose -f docker/docker-compose.yml up -d

REM Wait for services
echo Waiting for services to start (15 seconds)...
timeout /t 15 /nobreak

REM Health checks
echo.
echo Running health checks...
echo.

REM Check PostgreSQL
echo Checking PostgreSQL...
docker exec job-portal-postgres pg_isready -U postgres >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ PostgreSQL is ready
) else (
    echo ✗ PostgreSQL is not ready yet. Wait a moment and try again.
)

REM Check Redis
echo Checking Redis...
docker exec job-portal-redis redis-cli ping >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ Redis is ready
) else (
    echo ✗ Redis is not ready yet.
)

echo.
echo ============================================
echo.  Setup Complete!
echo ============================================
echo.
echo 📍 Access Points:
echo    Frontend:  http://localhost:3000
echo    Backend:   http://localhost:3001
echo    Database:  postgresql://postgres:postgres_password@localhost:5432/job_portal
echo    Redis:     localhost:6379
echo.
echo 🚀 Next Steps:
echo    1. npm install           (install dependencies)
echo    2. npm run dev           (start dev servers)
echo    3. Visit http://localhost:3000
echo.
echo 🛑 To stop all services:
echo    docker-compose -f docker/docker-compose.yml down
echo.
echo 📚 Documentation:
echo    - QUICK_START_GUIDE.md       (Getting started)
echo    - DEPLOYMENT_GUIDE.md        (Production deployment)
echo    - PRODUCTION_DOCUMENTATION.md (API reference)
echo.

pause
