@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo Job Portal - Frontend Only
echo ============================================
echo.

echo Node.js version:
node --version

echo npm version:
npm --version

echo.
echo Installing dependencies...
echo.

npm install --prefix=frontend

echo.
echo ============================================
echo Starting Frontend...
echo ============================================
echo.

npm run frontend:dev
