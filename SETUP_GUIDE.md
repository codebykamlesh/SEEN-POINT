# 🔧 SEEN POINT — First-Time Setup Guide

## Step 1: Install Node.js

1. Go to: **https://nodejs.org**
2. Download the **LTS version** (e.g., 20.x or 22.x)
3. Run the installer — keep all default options checked
4. **Restart VS Code** (important — so the terminal picks up the new PATH)

Verify in VS Code terminal:
```
node --version    → should show v20.x.x
npm --version     → should show 10.x.x
```

---

## Step 2: Install PostgreSQL

1. Go to: **https://www.postgresql.org/download/windows/**
2. Download and run the installer
3. During setup:
   - Set password (e.g., `postgres`) — remember this!
   - Keep port: `5432`
   - Check "pgAdmin 4" and "Command Line Tools"
4. Click through to finish

Verify:
```
psql --version    → should show psql 14.x or higher
```

---

## Step 3: Configure the project

Open `backend\.env` and set your PostgreSQL password:
```
DB_PASSWORD=your_postgres_password_here
```
*(If you used "postgres" as password during install, no change needed — it's already set)*

---

## Step 4: Install dependencies & setup DB

Open a terminal in VS Code → navigate to backend folder:

```bash
cd "c:\Users\Kamlesh\VS CODE\DBMS project\backend"

# Install all Node.js packages
npm install

# Create DB, tables, indexes, triggers, and materialized views + seed sample data
node database/setup.js --seed
```

Expected output:
```
🎬 SEEN POINT Database Setup
========================================
✅ Database 'seenpoint_db' created
✅ Schema created (tables, constraints, partitions)
✅ Indexes created (B-Tree, GIN, partial)
✅ Triggers created (auto-updates, notifications)
✅ Materialized views created (trending, stats)
✅ Sample data seeded

🎉 Database setup complete!
```

---

## Step 5: Start the backend server

```bash
npm run dev
```

You'll see:
```
🎬 SEEN POINT Backend Running
========================================
  API Server:  http://localhost:5000
  WebSocket:   ws://localhost:5000
  Health:      http://localhost:5000/api/health
  Environment: development
========================================
```

---

## Step 6: Open the frontend

**Option A — VS Code Live Server (Recommended)**:
1. Install "Live Server" extension in VS Code
2. Right-click `frontend/index.html` → **Open with Live Server**
3. Opens at: http://127.0.0.1:5500

**Option B — Direct file**:
Simply double-click `frontend/index.html`  
*(Note: Some API calls may fail due to browser CORS restrictions when opening as file://)*

---

## Demo Login Credentials

| Account | Email | Password |
|---------|-------|----------|
| Admin   | admin@seenpoint.com | Admin@123 |
| User 1  | alice@example.com | password |
| User 2  | bob@example.com | password |

---

## Troubleshooting

**"Cannot connect to database"**  
→ Make sure PostgreSQL service is running  
→ Open Services (Win+R → services.msc) → Find "postgresql-x64-14" → Start it  

**"DB_PASSWORD wrong"**  
→ Open pgAdmin, set a new password, update it in backend/.env  

**"Port 5000 already in use"**  
→ Change `PORT=5001` in backend/.env  

**Frontend shows "Network Error"**  
→ Make sure backend is running on port 5000  
→ For file:// protocol, you may need to disable CORS in Chrome (dev only)  
