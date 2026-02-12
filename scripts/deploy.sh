#!/bin/bash

# Deployment Script for Job Portal
# Handles database migrations, build, and service startup

set -e

echo "================================"
echo "Job Portal Deployment Script"
echo "================================"

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-job_portal}
DB_USER=${DB_USER:-postgres}
ENVIRONMENT=${NODE_ENV:-development}
BACKEND_PORT=${BACKEND_PORT:-5000}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

echo "Environment: $ENVIRONMENT"
echo "Database: $DB_NAME on $DB_HOST:$DB_PORT"

# Function: Check database connectivity
check_database() {
  echo "Checking database connectivity..."
  
  until PGPASSWORD=$DB_PASSWORD psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; do
    echo "Database is unavailable - sleeping"
    sleep 2
  done
  
  echo "Database is up!"
}

# Function: Run database migrations
run_migrations() {
  echo "Running database migrations..."
  
  cd backend
  npm run migrate
  cd ..
  
  echo "Migrations completed!"
}

# Function: Seed database (development only)
seed_database() {
  if [ "$ENVIRONMENT" = "development" ]; then
    echo "Seeding database with sample data..."
    
    cd backend
    npm run seed
    cd ..
    
    echo "Seeding completed!"
  fi
}

# Function: Build application
build_application() {
  echo "Building application..."
  
  # Backend build
  echo "Building backend..."
  cd backend
  npm install
  npm run build
  cd ..
  
  # Frontend build
  echo "Building frontend..."
  cd frontend
  npm install
  npm run build
  cd ..
  
  echo "Build completed!"
}

# Function: Start services
start_services() {
  echo "Starting services..."
  
  if [ "$ENVIRONMENT" = "production" ]; then
    echo "Starting in production mode..."
    
    # Use PM2 for process management
    cd backend
    pm2 start npm --name "job-portal-backend" -- start
    cd ..
    
    cd frontend
    pm2 start npm --name "job-portal-frontend" -- start
    cd ..
    
    echo "Services started with PM2"
  else
    echo "Starting in development mode..."
    
    # Start backend
    cd backend
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    # Start frontend
    cd frontend
    npm run dev &
    FRONTEND_PID=$!
    cd ..
    
    echo "Backend PID: $BACKEND_PID"
    echo "Frontend PID: $FRONTEND_PID"
  fi
}

# Function: Health check
health_check() {
  echo "Performing health checks..."
  
  # Backend health check
  for i in {1..30}; do
    if curl -f "http://localhost:${BACKEND_PORT}/health" > /dev/null 2>&1; then
      echo "Backend is healthy"
      break
    fi
    
    if [ $i -eq 30 ]; then
      echo "Backend health check failed"
      exit 1
    fi
    
    sleep 1
  done
  
  # Frontend health check
  for i in {1..30}; do
    if curl -f "http://localhost:${FRONTEND_PORT}" > /dev/null 2>&1; then
      echo "Frontend is healthy"
      break
    fi
    
    if [ $i -eq 30 ]; then
      echo "Frontend health check failed"
      exit 1
    fi
    
    sleep 1
  done
  
  echo "All health checks passed!"
}

# Main execution
main() {
  echo "Starting deployment..."
  
  check_database
  run_migrations
  seed_database
  
  if [ "$ENVIRONMENT" = "production" ]; then
    build_application
  fi
  
  start_services
  health_check
  
  echo "================================"
  echo "Deployment completed successfully!"
  echo "================================"
  
  if [ "$ENVIRONMENT" = "development" ]; then
    echo "Frontend: http://localhost:${FRONTEND_PORT}"
    echo "Backend: http://localhost:${BACKEND_PORT}"
    echo "Press Ctrl+C to stop"
    wait
  fi
}

main "$@"
