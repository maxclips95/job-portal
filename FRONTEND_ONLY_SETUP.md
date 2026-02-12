# Run Job Portal Frontend Only (No Docker, No Database)

**Purpose**: Quick testing of the frontend without any backend infrastructure  
**Time to Start**: 5-10 minutes  
**Requirements**: Node.js only

---

## 🚀 Quick Start (Frontend Only)

### Step 1: Install Dependencies
```powershell
# Navigate to project root
cd "C:\Users\YourUsername\Documents\Job Portal"

# Install all dependencies (one-time only)
npm install

# This may take 3-5 minutes
# You'll see lots of package installation messages
```

### Step 2: Start Frontend
```powershell
# Start Next.js frontend server
npm run frontend:dev
```

### Step 3: Open in Browser
```
http://localhost:3000
```

✅ **That's it! Frontend is running.**

---

## 📋 What Works (Frontend Only)

✅ **Fully Functional**:
- Home page
- Navigation menu
- UI/Layout
- Static pages
- Form displays
- Styling (Tailwind CSS)
- Images
- Responsive design

❌ **Won't Work** (No Backend):
- Login/Signup (needs API)
- Job listings (needs database)
- Search/Filter (needs API)
- Applying to jobs (needs API)
- User profiles (needs API)
- Any API calls will fail

---

## 🛠️ How to Navigate Without Backend

### Pages You Can View:
1. Home page - `http://localhost:3000`
2. Static pages (if any)
3. Navigation structure
4. UI components

### Try This:
```powershell
# In browser console (F12), you'll see errors like:
# "Cannot reach backend at http://localhost:3001"

# This is expected - backend isn't running
# But the frontend UI still loads
```

---

## 📦 Alternative: Start Backend Only (No Database)

If you want backend too but without Docker:

### Prerequisites:
- Node.js installed
- PostgreSQL running (or configure to skip)

### Start Backend:
```powershell
cd backend
npm run dev

# Backend will start at http://localhost:3001
# But will fail to connect to database (that's OK)
```

---

## 🔄 Switch Between Modes

### Frontend Only:
```powershell
npm run frontend:dev
```

### Backend Only:
```powershell
cd backend
npm run dev
```

### Both (Requires Docker for DB):
```powershell
# First start Docker containers
docker-compose -f docker/docker-compose.yml up -d

# Then start both
npm run dev
```

---

## 📝 Troubleshooting

### Issue: "Module not found"
```
✗ Dependencies not installed
✓ Run: npm install
```

### Issue: "Port 3000 already in use"
```
✗ Another app is using port 3000
✓ Solution:
   netstat -ano | findstr :3000
   taskkill /PID <number> /F
```

### Issue: "Cannot find next"
```
✗ Frontend dependencies missing
✓ Run: cd frontend && npm install
```

### Issue: "npm: command not found"
```
✗ Node.js not installed or PATH not updated
✓ Restart PowerShell or Windows
```

---

## ✅ Verify Frontend is Running

```powershell
# After npm run frontend:dev is running:
curl http://localhost:3000

# Should return HTML (the page)
# Not a 404 or connection error
```

---

## 📚 Project Structure (Frontend Only)

```
frontend/
├── app/
│   ├── page.tsx          (Home page)
│   ├── layout.tsx        (Main layout)
│   └── globals.css       (Global styles)
├── components/           (Reusable UI)
├── public/              (Images, icons)
├── package.json
└── next.config.ts
```

All these load and work without backend! 🎉

---

## 🎯 What to Test (Frontend Only)

1. **Page Load**: http://localhost:3000
2. **Responsive Design**: Resize browser window
3. **Styling**: Check colors, fonts, layout
4. **Navigation**: Click menu items (may show 404 if not static)
5. **Components**: Check all UI components render
6. **Images**: Verify images load

---

## 💡 When Backend Comes Online

Once you start backend + database:
```powershell
# Stop frontend first (Ctrl+C)

# Start Docker containers
docker-compose -f docker/docker-compose.yml up -d

# Start both frontend + backend
npm run dev

# Now http://localhost:3000 will have full functionality!
```

---

## 🚀 Summary

**Just Frontend (What You're Doing Now)**:
```powershell
npm install
npm run frontend:dev
# Visit: http://localhost:3000
```

**Full Stack (Later, if needed)**:
```powershell
docker-compose -f docker/docker-compose.yml up -d
npm install
npm run dev
# Waits for DB to be ready
# Starts both frontend + backend
```

---

**Ready? Run these commands:**
```powershell
cd "C:\Users\YourUsername\Documents\Job Portal"
npm install
npm run frontend:dev
```

**Then open**: http://localhost:3000 ✅
