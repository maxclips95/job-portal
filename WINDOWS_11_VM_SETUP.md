# Job Portal - Fresh Windows 11 VM Complete Setup Guide

**For**: Brand New Windows 11 VM (Clean Installation)  
**Last Updated**: February 5, 2026  
**Total Setup Time**: 30-45 minutes (first time)

---

## 🎯 Setup Overview

This guide assumes your Windows 11 VM is **completely fresh** with only Windows 11 installed.

### What You'll Install:
1. Docker Desktop (includes Docker Compose)
2. Node.js LTS
3. Git (optional but recommended)
4. Job Portal application

### Final Result:
- ✅ Job Portal running locally
- ✅ Frontend at `http://localhost:3000`
- ✅ Backend at `http://localhost:3001`
- ✅ Database at `localhost:5432`
- ✅ Redis at `localhost:6379`

---

## 📋 Step 0: Initial Windows 11 VM Setup

### Check System Information
Press `Win + Pause` or right-click "This PC" → Properties

Required:
- **OS**: Windows 11 (any edition: Home, Pro, Enterprise)
- **Version**: 22H2 or higher
- **System Type**: 64-bit
- **RAM**: Minimum 8GB (16GB+ recommended)
- **Disk Space**: Minimum 100GB free

### Update Windows 11
```
Settings → Update & Security → Windows Update
Click "Check for updates"
Install all available updates
Restart if prompted
```

### Enable Required Windows Features
**Important: Do this BEFORE installing Docker**

**Method 1: Using Control Panel (Easiest)**
```
1. Press Win + R
2. Type: optionalfeatures
3. Click OK
4. Check these boxes:
   ✅ Hyper-V
   ✅ Virtual Machine Platform
   ✅ Windows Subsystem for Linux
5. Click OK
6. Restart when prompted
```

**Method 2: Using PowerShell (If above doesn't work)**
```powershell
# Right-click Start Menu
# Select "Windows Terminal (Admin)" or "Windows PowerShell (Admin)"

# Run these commands:
Enable-WindowsOptionalFeature -Online -FeatureName Hyper-V -All
Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -All
Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -All

# Restart
Restart-Computer
```

**Verify it worked:**
```powershell
Get-WindowsOptionalFeature -Online | Where-Object {$_.FeatureName -like "*Hyper-V*" -or $_.FeatureName -like "*VirtualMachine*"} | Select-Object FeatureName, State
```
Should show: `State : Enabled`

---

## 📦 Step 1: Install Docker Desktop for Windows 11

**Time**: 10-15 minutes

### Download Docker
1. Visit: https://www.docker.com/products/docker-desktop
2. Click "Download for Windows"
3. Choose **Intel Chip** or **Apple Silicon** (based on your host machine)
4. Save to `Downloads` folder

### Install Docker
1. Double-click `Docker Desktop Installer.exe`
2. Click "OK" when prompted for permission
3. **Configuration Screen - Important!**
   - ✅ Check: "Use WSL 2 instead of Hyper-V"
   - ✅ Check: "Add shortcut to taskbar"
   - Click "Install"
4. Wait for installation (5-10 minutes)
5. **Restart Windows** when installation completes

### Verify Docker Installation
After restart:
```powershell
# Open PowerShell (Win + R, type powershell, Enter)

docker --version
# Expected: Docker version 24.0.0 (or newer)

docker-compose --version
# Expected: Docker Compose version 2.20.0 (or newer)

docker run hello-world
# Should show success message
```

✅ **If all three commands work, Docker is ready!**

❌ **If "docker: command not found":**
- Wait 5 minutes (Docker Desktop is still starting)
- Check System Tray (bottom right) - Docker icon should be running
- Right-click Docker icon → "Open Docker Desktop"
- Wait until it says "Docker Desktop is running"
- Try commands again

---

## 🟢 Step 2: Install Node.js LTS

**Time**: 5 minutes

### Download Node.js
1. Visit: https://nodejs.org/
2. Click the **green LTS button** (Long Term Support)
3. Download will start (`.msi` file, ~150MB)

### Install Node.js
1. Double-click the downloaded `.msi` file
2. Click "Next" on each screen (default settings are fine)
3. **Important**: Ensure these are checked:
   - ✅ "Add to PATH"
   - ✅ "Install as Windows native modules"
4. Click "Install"
5. Click "Finish"
6. **Restart Windows** OR restart PowerShell

### Verify Node.js Installation
```powershell
# Open NEW PowerShell window (or restart existing one)

node --version
# Expected: v18.x.x or v20.x.x

npm --version
# Expected: 9.x.x or 10.x.x
```

✅ **If both commands show versions, you're good!**

❌ **If "node: command not found":**
- Restart PowerShell completely (close and reopen)
- If still doesn't work, restart your entire Windows 11 VM

---

## 📂 Step 3: Prepare Job Portal Folder

**Time**: 2 minutes

### Option A: Copy Existing Project (If you have it)
```powershell
# Navigate to a good location
cd C:\Users\YourUsername\Documents

# Copy the Job Portal folder here
# (Or use File Explorer to copy the folder)
```

### Option B: Create New Folder Structure
```powershell
# Create a projects folder
New-Item -ItemType Directory -Path "C:\Projects" -Force

# Navigate into it
cd C:\Projects

# You'll add Job Portal files here later
```

✅ **Recommended location**: `C:\Users\YourUsername\Documents\Job Portal`  
❌ **Avoid**: `C:\Program Files` (permission issues)

---

## 🚀 Step 4: Clone or Copy Job Portal Repository

### If You Have Git Installed:
```powershell
cd C:\Users\YourUsername\Documents

git clone https://github.com/yourname/job-portal.git

cd job-portal
```

### If You Don't Have Git:
1. Download the project ZIP file
2. Extract to: `C:\Users\YourUsername\Documents\Job Portal`
3. Open PowerShell and navigate:
```powershell
cd "C:\Users\YourUsername\Documents\Job Portal"
```

### Verify Project Structure:
```powershell
# You should see these folders/files:
dir

# Expected output:
# Mode                 LastWriteTime         Length Name
# ----                 -------------         ------ ----
# d-----                            backend
# d-----                            frontend
# d-----                            docker
# d-----                            kubernetes
# d-----                            scripts
# -a----        .gitignore
# -a----        package.json
# -a----        setup.bat
# -a----        setup.sh
# (and more files)
```

✅ **If you see all these folders, you're in the right place!**

---

## ⚙️ Step 5: Run setup.bat (The Easy Part!)

**Time**: 5-10 minutes

### Run Setup
```powershell
# You're already in: C:\Users\YourUsername\Documents\Job Portal

# Run the setup script:
.\setup.bat

# Or if that doesn't work:
cmd /c setup.bat
```

### What setup.bat Does:
```
✓ Checks Docker is installed
✓ Checks Docker Compose is installed  
✓ Checks Node.js is installed
✓ Creates .env files automatically
✓ Starts PostgreSQL container
✓ Starts Redis container
✓ Runs health checks
✓ Shows access URLs
```

### Expected Output:
```
============================================
Job Portal Development Setup
51,480 LOC | 150+ Features | Production Ready
============================================

Checking Docker installation...
✓ Docker is installed

Checking Docker Compose...
✓ Docker Compose is installed

Checking Node.js...
✓ Node.js v18.x.x

Creating environment files...
✓ Created: .env
✓ Created: backend\.env
✓ Created: frontend\.env.local

Starting Docker containers...
Waiting for services to start (15 seconds)...

Running health checks...
✓ PostgreSQL is ready
✓ Redis is ready

============================================
✅ Setup Complete!
============================================

📍 Access Points:
   Frontend:  http://localhost:3000
   Backend:   http://localhost:3001
   Database:  postgresql://postgres:postgres_password@localhost:5432/job_portal
   Redis:     localhost:6379

🚀 Next Steps:
   1. npm install              (install dependencies)
   2. npm run dev              (start servers)
   3. Visit http://localhost:3000

🛑 To stop all services:
   docker-compose -f docker/docker-compose.yml down
```

✅ **If you see "Setup Complete!", everything is working!**

---

## 📦 Step 6: Install Dependencies

**Time**: 3-5 minutes (first time only)

```powershell
# You should still be in: C:\Users\YourUsername\Documents\Job Portal

# Install all dependencies (root + backend + frontend)
npm install

# This will take a few minutes...
# You'll see lots of package installation messages
```

✅ **If it finishes without errors, you're ready to go!**

❌ **If you see errors:**
- Error about Python? Install Python (needed for node-gyp)
- Error about node-pre-gyp? Usually safe to ignore
- Many npm warnings? Also safe to ignore

---

## 🌐 Step 7: Start Development Servers

### Option A: Start Everything (Recommended for beginners)
```powershell
npm run dev

# This starts:
# ✓ Backend at http://localhost:3001
# ✓ Frontend at http://localhost:3000
```

### Option B: Start Separately (Advanced)
```powershell
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend (open NEW PowerShell)
cd frontend
npm run dev
```

### Expected Output:
```
Backend:
> job-portal-backend@1.0.0 dev
> nodemon --exec ts-node src/index.ts

[nodemon] restarting due to changes in [...files...]
[nodemon] starting ts-node [.../src/index.ts]
✓ Backend server running at http://localhost:3001

Frontend:
> job-portal-frontend@1.0.0 dev
> next dev

  ▲ Next.js 14.0.4
  - Local:        http://localhost:3000
  ▲ Ready in 3.2s
```

✅ **If you see both running, you're done!**

---

## 🌍 Step 8: Access Your Application

### Open Browser
```
Type in address bar: http://localhost:3000
```

### You Should See:
- Job Portal homepage
- Login/Signup buttons
- Job listings (if database has data)
- Navigation menu

### Test Backend API
```powershell
# In PowerShell, test the API:
curl http://localhost:3001/health

# Expected response:
{"status":"ok"}
```

✅ **If you see the frontend and API is responding, everything works!**

---

## 🛑 Stop the Application

```powershell
# To stop backend + frontend:
# Press Ctrl + C in the terminal where npm run dev is running

# To stop Docker containers (database, redis):
docker-compose -f docker/docker-compose.yml down

# To start them again later:
docker-compose -f docker/docker-compose.yml up -d
```

---

## 🆘 Troubleshooting for Fresh Windows 11 VM

### Issue: "Docker is not installed"
```
✗ You skipped Step 0 (Enable Hyper-V)
✓ Solution: Enable Hyper-V features, restart, reinstall Docker
```

### Issue: "Docker Desktop is starting..."
```
✗ Docker hasn't finished starting yet
✓ Solution: Wait 5 minutes, check system tray for Docker icon
```

### Issue: "npm: command not found"
```
✗ Node.js wasn't installed properly or PATH not updated
✓ Solution: Restart PowerShell or restart Windows
```

### Issue: "Port 3000 already in use"
```
✗ Another application is using that port
✓ Solution:
   netstat -ano | findstr :3000
   taskkill /PID <number> /F
```

### Issue: "Cannot find module 'express'"
```
✗ Dependencies weren't installed
✓ Solution:
   npm install
   npm run dev
```

### Issue: "PostgreSQL connection refused"
```
✗ Database container isn't running
✓ Solution:
   docker ps
   docker-compose -f docker/docker-compose.yml up -d
   Wait 10 seconds
   npm run dev
```

### Issue: "setup.bat not found"
```
✗ You're in the wrong folder
✓ Solution:
   # Check you're in Job Portal folder
   dir /s setup.bat
```

---

## ✅ Complete Checklist

- [ ] **Step 0**: Windows 11 features enabled (Hyper-V, WSL)
- [ ] **Step 1**: Docker Desktop installed and working
- [ ] **Step 2**: Node.js installed and working
- [ ] **Step 3**: Job Portal folder created
- [ ] **Step 4**: Job Portal files in the folder
- [ ] **Step 5**: setup.bat ran successfully
- [ ] **Step 6**: npm install completed
- [ ] **Step 7**: npm run dev started both servers
- [ ] **Step 8**: http://localhost:3000 opens in browser
- [ ] **Bonus**: Backend health check works: http://localhost:3001/health

✅ **All checked? Congratulations! Your Job Portal is running!** 🎉

---

## 📚 Next Steps After Setup

1. **Explore the Application**
   - Create an account
   - Post a job
   - Apply to a job
   - Test all features

2. **Review Documentation**
   - [QUICK_START_GUIDE.md](QUICK_START_GUIDE.md) - Quick reference
   - [PRODUCTION_DOCUMENTATION.md](PRODUCTION_DOCUMENTATION.md) - API docs
   - [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Deploy to production

3. **Run Tests** (Optional)
   ```powershell
   npm test                 # Run all tests
   npm run test:coverage    # With coverage report
   ```

4. **Make Changes**
   - Edit files in `backend/src/` or `frontend/`
   - Changes reload automatically (thanks to nodemon + next dev)

---

## 🚀 Ready to Deploy?

When you're ready to deploy to production:

```powershell
# Build production versions
npm run build:prod

# Follow: DEPLOYMENT_GUIDE.md
# Deploy to: Docker, Kubernetes, AWS, Azure, etc.
```

---

## 📞 Quick Command Reference

```powershell
# Start everything
npm run dev

# Stop everything
Ctrl + C

# Stop database/redis
docker-compose -f docker/docker-compose.yml down

# Start database/redis again
docker-compose -f docker/docker-compose.yml up -d

# View logs
docker-compose logs

# Check running services
docker ps

# Install missing packages
npm install

# Run tests
npm test

# Build for production
npm run build:prod
```

---

**You're all set! Your fresh Windows 11 VM now has Job Portal running. 🎉**

**Frontend**: http://localhost:3000  
**Backend**: http://localhost:3001  
**Questions?** Check the documentation files or troubleshooting above.

