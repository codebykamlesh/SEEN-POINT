# 🎬 SEEN POINT — Free Movie Streaming Platform

> A production-ready, full-stack movie streaming platform featuring Microsoft OneDrive video hosting, PostgreSQL-powered analytics, JWT authentication, real-time WebSocket features, and a premium dark UI with electric cyan branding.

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4.18-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/OneDrive-Graph%20API-0078D4?style=for-the-badge&logo=microsoftonedrive&logoColor=white" />
  <img src="https://img.shields.io/badge/License-MIT-F5C518?style=for-the-badge" />
</p>

---

## ✨ Features

### 🎥 User-Facing
- **Browse & Discover** — Content grid with type/genre/year/rating filters
- **Full-Text Search** — Instant results powered by PostgreSQL GIN indexes
- **Movie Detail Pages** — Poster, backdrop, synopsis, cast, ratings, similar content
- **Video Player** — 16+ features: speed control, PiP, theater mode, subtitles, skip intro, progress memory
- **Watchlist** — Save content to personal "My List"
- **User Profiles** — Account management, password change, playback preferences
- **Real-Time** — Live viewer count via WebSocket

### 🔐 Authentication
- JWT-based stateless auth with refresh tokens
- Bcrypt password hashing (cost factor 12)
- Role-based access (User / Admin)
- Subscription plan management (Basic / Standard / Premium)

### ☁️ OneDrive Integration
- Microsoft Graph API for secure video file hosting
- OAuth2 flow with admin-only connection
- Admin file browser to navigate OneDrive folders
- Stream redirect (302) for native HTML5 video playback

### 📊 Admin Dashboard
- **KPI Cards** — Total users, content, views (24h/7d)
- **Charts** — Daily views bar chart, genre popularity
- **Content Management** — Add, edit, publish, unpublish, delete
- **User Management** — View all accounts with plans and status
- **OneDrive Panel** — Connection status, file browser, setup guide
- **Database Operations** — Materialized view refresh, index monitoring

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ — [download](https://nodejs.org)
- **PostgreSQL** 14+ — [download](https://www.postgresql.org/download/)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-username/seen-point.git
cd seen-point

# 2. Install backend dependencies
cd backend
npm install

# 3. Configure environment
copy .env.example .env
# Edit .env — set your DB_PASSWORD and JWT_SECRET

# 4. Set up the database (creates DB + schema + seed data)
npm run fresh

# 5. Start the development server
npm run dev
```

The server starts at **http://localhost:5000** with the frontend served automatically.

---

## 🔑 Demo Accounts

| Role  | Email                 | Password     |
|-------|-----------------------|--------------|
| Admin | `admin@seenpoint.com` | `Admin@123`  |
| User  | `alice@example.com`   | `User@1234`  |
| User  | `bob@example.com`     | `User@1234`  |
| User  | `carol@example.com`   | `User@1234`  |

---

## 📁 Project Structure

```
SEEN POINT/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js            # PostgreSQL pool + health checks
│   │   ├── controllers/
│   │   │   ├── authController.js      # Register, login, JWT tokens
│   │   │   ├── contentController.js   # Browse, search, trending, detail
│   │   │   ├── userController.js      # Watchlist, ratings, history, profile
│   │   │   └── adminController.js     # Dashboard analytics, CRUD, users
│   │   ├── middleware/
│   │   │   ├── auth.js                # JWT verification + admin guard
│   │   │   └── errorHandler.js        # Global error handling
│   │   ├── routes/
│   │   │   ├── auth.js                # /api/auth/*
│   │   │   ├── content.js             # /api/content/*
│   │   │   ├── user.js                # /api/user/*
│   │   │   ├── admin.js               # /api/admin/*
│   │   │   └── onedrive.js            # /api/onedrive/*
│   │   ├── services/
│   │   │   └── onedrive.js            # Microsoft Graph API integration
│   │   └── server.js                  # Express + WebSocket + cron entry
│   ├── database/
│   │   ├── schema.sql                 # Tables, constraints, partitioning
│   │   ├── indexes.sql                # B-Tree, GIN, partial, composite
│   │   ├── triggers.sql               # Auto-update functions + triggers
│   │   ├── views.sql                  # Materialized views (trending, stats)
│   │   ├── seed.sql                   # 13 movies/series, users, history
│   │   └── setup.js                   # Automated DB setup orchestrator
│   ├── .env.example                   # Environment variable template
│   ├── Procfile                       # Render.com process definition
│   └── package.json
├── frontend/
│   ├── index.html                     # Home page — hero + content rows
│   ├── pages/
│   │   ├── login.html                 # Sign in with demo accounts
│   │   ├── register.html              # Sign up + plan selection
│   │   ├── browse.html                # Browse all with filters
│   │   ├── search.html                # Full-text search + autocomplete
│   │   ├── detail.html                # Movie/show detail + metadata
│   │   ├── player.html                # Full video player (16+ features)
│   │   ├── profile.html               # User account management
│   │   ├── watchlist.html             # Personal saved list
│   │   └── admin.html                 # Admin dashboard (6 panels)
│   ├── css/
│   │   └── styles.css                 # Design system (1280+ lines)
│   └── js/
│       └── api.js                     # API client + auth utilities
├── render.yaml                        # One-click Render.com deployment
└── README.md
```

---

## 🗄️ Database Design

### Entity-Relationship Overview

```
users ──< profiles ──< watch_history >── content ──< content_genres >── genres
  │                        │                │
  │──< watchlists ─────────┘                ├──< content_cast >── cast_members
  │──< user_ratings ───────────────────────┘├──< episodes
  │──< notifications                        └──< content_tags
  └──< subscription_plans
```

### Advanced PostgreSQL Features

| Feature | Implementation | Benefit |
|---------|---------------|---------|
| **Full-Text Search** | GIN index on `tsvector` column | Sub-ms text search across titles and descriptions |
| **Table Partitioning** | `watch_history` partitioned by month | Queries only scan relevant month's data |
| **Materialized Views** | `mv_trending_content`, `mv_genre_stats`, `mv_platform_stats` | Complex aggregates cached, refreshed hourly |
| **Triggers** | 5 auto-fire triggers | Auto-update search vectors, ratings, slugs, view counts |
| **Indexes** | 25+ (B-Tree, GIN, partial, composite) | Optimized for every common query pattern |
| **CONCURRENTLY** | MV refresh without locking | Zero-downtime analytics updates |

### Key SQL Examples

```sql
-- Full-text search with ranking
SELECT *, ts_rank_cd(search_vector, plainto_tsquery('english', $1)) AS relevance
FROM content WHERE search_vector @@ plainto_tsquery('english', $1)
ORDER BY relevance DESC;

-- Continue watching with DISTINCT ON
SELECT DISTINCT ON (wh.content_id) wh.*, c.title, c.poster_url
FROM watch_history wh JOIN content c ON c.id = wh.content_id
WHERE wh.profile_id = $1 AND wh.progress_percent < 95
ORDER BY wh.content_id, wh.watched_at DESC;

-- Trending content (materialized view, <5ms response)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_trending_content;
```

---

## 🔌 API Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Create account | ❌ |
| POST | `/api/auth/login` | Get JWT token | ❌ |
| GET | `/api/auth/me` | Current user info | ✅ |
| GET | `/api/auth/profiles` | User profiles | ✅ |

### Content (`/api/content`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/content` | Browse with filters, sort, pagination | ❌ |
| GET | `/api/content/search?q=...` | Full-text search | ❌ |
| GET | `/api/content/trending` | Trending (materialized view) | ❌ |
| GET | `/api/content/featured` | Featured for hero banner | ❌ |
| GET | `/api/content/genres/all` | All genre list | ❌ |
| GET | `/api/content/:id` | Full detail + cast + genres | ❌ |
| GET | `/api/content/:id/episodes` | Series episodes | ❌ |

### User (`/api/user`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/user/continue-watching` | In-progress content | ✅ |
| POST | `/api/user/watch-history` | Update watch progress | ✅ |
| GET | `/api/user/watchlist` | Get saved list | ✅ |
| POST | `/api/user/watchlist` | Add to watchlist | ✅ |
| DELETE | `/api/user/watchlist/:contentId` | Remove from list | ✅ |
| POST | `/api/user/ratings` | Rate content (1–10) | ✅ |
| PUT | `/api/user/profile` | Update display name | ✅ |
| POST | `/api/user/change-password` | Change password | ✅ |
| GET | `/api/user/notifications` | Get notifications | ✅ |

### OneDrive (`/api/onedrive`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/onedrive/auth` | Start OAuth2 flow | Admin |
| GET | `/api/onedrive/callback` | Microsoft OAuth callback | — |
| GET | `/api/onedrive/status` | Connection status | Admin |
| GET | `/api/onedrive/files?folderId=...` | Browse files/folders | Admin |
| GET | `/api/onedrive/stream/:fileId` | Stream redirect (302) | ❌ |

### Admin (`/api/admin`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/analytics` | Dashboard KPIs + charts | Admin |
| GET | `/api/admin/content` | Content list with pagination | Admin |
| POST | `/api/admin/content` | Create new content | Admin |
| PUT | `/api/admin/content/:id` | Update content | Admin |
| DELETE | `/api/admin/content/:id` | Delete content | Admin |
| GET | `/api/admin/users` | User management list | Admin |
| POST | `/api/admin/refresh-views` | Refresh materialized views | Admin |

---

## 🎨 Design System

| Token | Value | Usage |
|-------|-------|-------|
| `--clr-primary` | `#00D4FF` | Buttons, links, active states |
| `--clr-primary-hover` | `#33ddff` | Hover states |
| `--clr-primary-dark` | `#0099BB` | Focus rings, pressed states |
| `--clr-accent` | `#F5C518` | Gold accent, featured badges |
| `--clr-bg` | `#0a0a0a` | Page background |
| `--clr-surface` | `rgba(20,20,20,0.85)` | Cards, modals (glassmorphism) |
| `--font-body` | Inter | Body text |
| `--font-display` | Bebas Neue | Headings, logo |

---

## ☁️ OneDrive Setup

To enable video streaming via Microsoft OneDrive:

1. Go to [portal.azure.com](https://portal.azure.com) → Azure AD → **App registrations** → New
2. Name: `SEEN POINT`, Redirect URI: `http://localhost:5000/api/onedrive/callback`
3. Copy **Application (Client) ID** → `.env` as `ONEDRIVE_CLIENT_ID`
4. **Certificates & secrets** → New client secret → `.env` as `ONEDRIVE_CLIENT_SECRET`
5. **API permissions** → Microsoft Graph → `Files.Read.All` (Delegated) → Grant admin consent
6. Set `ONEDRIVE_TENANT_ID=common` in `.env`
7. In the admin panel → **OneDrive** tab → Click **Connect OneDrive**

---

## 🌍 Deployment (Render.com)

This project includes a `render.yaml` blueprint for one-click deployment:

```bash
# 1. Push to GitHub
git add . && git commit -m "deploy" && git push

# 2. On Render.com
# → New → Blueprint → Connect your repo
# → It auto-creates: Web Service + PostgreSQL database

# 3. After deployment
# → Set OneDrive env vars in Render dashboard
# → Update API_BASE in frontend/js/api.js with your Render URL
```

**What `render.yaml` creates:**
- **seenpoint-backend** — Node.js web service (free tier)
- **seenpoint-db** — PostgreSQL database (free tier, 1GB)
- Auto-generated JWT secrets
- Health check endpoint at `/api/health`

---

## 🛠️ NPM Scripts

```bash
npm start          # Start production server
npm run dev        # Start with nodemon (auto-reload)
npm run fresh      # Setup DB + schema + seed (full reset)
npm run setup-db   # Setup DB + schema (no seed data)
npm run seed-db    # Seed data only
npm run reset-db   # Drop + recreate + seed
```

---

## ⚡ Performance

| Optimization | Details |
|-------------|---------|
| **Connection Pooling** | Single pg pool (20 connections), reused across requests |
| **GIN Indexes** | Full-text search in < 5ms across all content |
| **Partial Indexes** | Published-only index is 80% smaller than full scan |
| **Materialized Views** | Trending/stats queries cached, refreshed hourly via cron |
| **Table Partitioning** | `watch_history` scans only relevant month's partition |
| **DISTINCT ON** | Continue-watching query gets latest per content in one pass |
| **Rate Limiting** | 200 req / 15 min per IP to prevent abuse |
| **Helmet** | Security headers in production mode |

---

## 🛡️ Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Database | PostgreSQL 14+ | Primary data store with advanced features |
| Backend | Node.js + Express 4 | REST API server |
| Auth | JWT + bcryptjs | Stateless authentication |
| Real-time | WebSocket (ws) | Live viewer count, notifications |
| Scheduling | node-cron | Hourly materialized view refresh |
| Video | Microsoft Graph API | OneDrive streaming integration |
| Frontend | Vanilla HTML/CSS/JS | Zero-framework overhead |
| Typography | Google Fonts (Inter, Bebas Neue) | Modern premium type |
| Security | Helmet + express-rate-limit | Production hardening |
| Deployment | Render.com | One-click blueprint |

---

## 📜 License

This project is licensed under the MIT License.

---

<p align="center">
  <strong>SEEN POINT</strong> — Built as a DBMS Final Year Project<br/>
  <em>Demonstrating normalized schema design, advanced indexing, triggers, partitioning, materialized views, and full-stack integration.</em>
</p>
