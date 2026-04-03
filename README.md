# 🎬 SEEN POINT — Free Movie Streaming Platform

> A production-ready, full-stack movie streaming platform featuring **Email OTP authentication**, multi-source video streaming (OneDrive / YouTube / Public Domain), PostgreSQL-powered analytics, real-time WebSocket features, and a premium mobile-first dark UI with electric cyan branding.

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4.18-000000?style=for-the-badge&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/Nodemailer-OTP_Auth-EA4335?style=for-the-badge&logo=gmail&logoColor=white" />
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
- **Multi-Source Streaming** — YouTube embeds, OneDrive videos, public domain content
- **Login-Gated Playback** — Guests see trailers, logged-in users watch full movies
- **Watchlist** — Save content to personal "My List"
- **User Profiles** — Account management, playback preferences
- **Real-Time** — Live viewer count via WebSocket
- **Mobile-First UI** — Hamburger menu, touch-friendly controls, responsive breakpoints

### 🔐 Authentication (Dual-Mode)

| Method | Flow | Details |
|--------|------|---------|
| **Email OTP** (Primary) | Enter email → Receive 6-digit code → Verify → JWT issued | Auto-creates account on first login |
| **Password** (Fallback) | Email + password → bcrypt verify → JWT issued | For existing password-based accounts |

- OTP valid for **5 minutes** with **60-second** resend cooldown
- Branded HTML email via **Nodemailer + Gmail SMTP**
- 6-box OTP input with paste support
- JWT-based stateless auth with refresh tokens
- Role-based access (User / Admin)

### 🎬 Content Source Types

| Source Type | How It Works | Storage |
|-------------|-------------|---------|
| `youtube` | Embedded iframe player (no redirect) | YouTube video ID |
| `onedrive` | Backend proxy stream via Microsoft Graph API | OneDrive file ID |
| `public_domain` | Direct HTML5 video playback | URL to video file |

### ☁️ OneDrive Integration
- Microsoft Graph API for secure video file hosting
- OAuth2 flow with admin-only connection
- Admin file browser to navigate OneDrive folders
- Proxied streaming with cache headers

### 📊 Admin Dashboard
- **KPI Cards** — Total users, content, views (24h/7d)
- **Charts** — Daily views bar chart, genre popularity
- **Content Management** — Add, edit, publish, unpublish, delete (with source type selection)
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
# Edit .env — set your DB_PASSWORD, JWT_SECRET, and SMTP credentials

# 4. Set up the database (creates DB + schema + seed data)
npm run fresh

# 5. Start the development server
npm run dev
```

The server starts at **http://localhost:5000** with the frontend served automatically.

### 📧 Email OTP Setup (Gmail)

To enable OTP email delivery:

1. Enable **2-Step Verification** on your Gmail: [myaccount.google.com/security](https://myaccount.google.com/security)
2. Generate an **App Password**: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Add to `backend/.env`:
   ```env
   SMTP_EMAIL=your_gmail@gmail.com
   SMTP_PASSWORD=your_16char_app_password
   ```

---

## 🔑 Demo Accounts

| Role  | Email                 | Password     | Notes |
|-------|-----------------------|--------------|-------|
| Admin | `admin@seenpoint.com` | `Admin@123`  | Full dashboard access |
| User  | `alice@example.com`   | `User@1234`  | Premium plan |
| User  | `bob@example.com`     | `User@1234`  | Standard plan |
| User  | `carol@example.com`   | `User@1234`  | Basic plan |

> **Note:** You can also login via OTP with any email address — a new account is auto-created on first verification.

---

## 📁 Project Structure

```
SEEN POINT/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js              # PostgreSQL pool + health checks
│   │   ├── controllers/
│   │   │   ├── authController.js        # Register, login, OTP send/verify, JWT
│   │   │   ├── contentController.js     # Browse, search, trending, detail
│   │   │   ├── userController.js        # Watchlist, ratings, history, profile
│   │   │   └── adminController.js       # Dashboard analytics, CRUD, users
│   │   ├── middleware/
│   │   │   ├── auth.js                  # JWT verification + admin guard
│   │   │   └── errorHandler.js          # Global error handling
│   │   ├── routes/
│   │   │   ├── auth.js                  # /api/auth/* (login, OTP, register)
│   │   │   ├── content.js               # /api/content/*
│   │   │   ├── user.js                  # /api/user/*
│   │   │   ├── admin.js                 # /api/admin/*
│   │   │   └── onedrive.js              # /api/onedrive/*
│   │   ├── services/
│   │   │   ├── email.js                 # Nodemailer OTP email service
│   │   │   └── onedrive.js              # Microsoft Graph API integration
│   │   └── server.js                    # Express + WebSocket + compression + cron
│   ├── database/
│   │   ├── schema.sql                   # Tables, constraints, OTP, partitioning
│   │   ├── indexes.sql                  # B-Tree, GIN, partial, composite
│   │   ├── triggers.sql                 # Auto-update functions + triggers
│   │   ├── views.sql                    # Materialized views (trending, stats)
│   │   ├── seed.sql                     # 13 movies/series with source_type, users
│   │   └── setup.js                     # Automated DB setup orchestrator
│   ├── .env.example                     # Environment variable template
│   ├── Procfile                         # Render.com process definition
│   └── package.json
├── frontend/
│   ├── index.html                       # Home page — hero + content rows
│   ├── pages/
│   │   ├── login.html                   # OTP login + password fallback
│   │   ├── register.html                # Sign up + plan selection
│   │   ├── browse.html                  # Browse all with filters
│   │   ├── search.html                  # Full-text search + autocomplete
│   │   ├── detail.html                  # Movie/show detail + metadata
│   │   ├── player.html                  # Full video player (16+ features)
│   │   ├── profile.html                 # User account management
│   │   ├── watchlist.html               # Personal saved list
│   │   └── admin.html                   # Admin dashboard (6 panels)
│   ├── css/
│   │   └── styles.css                   # Design system (1340+ lines, responsive)
│   └── js/
│       └── api.js                       # API client + auth + hamburger menu
├── render.yaml                          # One-click Render.com deployment
└── README.md
```

---

## 🗄️ Database Design

### Entity-Relationship Overview

```
users ──< profiles ──< watch_history >── content ──< content_genres >── genres
  │                        │                │
  │──< watchlists ─────────┘                ├──< content_cast >── people
  │──< user_ratings ───────────────────────┘├──< episodes
  │──< notifications                        └──< content_tags
  │──< otp_codes (NEW)
  └──< subscription_plans
```

### Key Schema Additions (v2)

```sql
-- OTP authentication codes
CREATE TABLE otp_codes (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email       VARCHAR(255) NOT NULL,
    otp_code    VARCHAR(6) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    is_used     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Content source types (added to content table)
ALTER TABLE content ADD COLUMN source_type     VARCHAR(20) DEFAULT 'youtube';
ALTER TABLE content ADD COLUMN full_video_url   TEXT;
ALTER TABLE content ADD COLUMN is_free          BOOLEAN DEFAULT TRUE;
-- password_hash is now nullable (supports OTP-only users)
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

-- OTP verification with expiry check
SELECT * FROM otp_codes
WHERE email = $1 AND otp_code = $2 AND is_used = FALSE
  AND expires_at > NOW()
ORDER BY created_at DESC LIMIT 1;
```

---

## 🔌 API Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Create account with password | ❌ |
| POST | `/api/auth/login` | Login with email + password | ❌ |
| POST | `/api/auth/send-otp` | Send 6-digit OTP to email | ❌ |
| POST | `/api/auth/verify-otp` | Verify OTP → get JWT (auto-creates user) | ❌ |
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
| GET | `/api/onedrive/stream/:fileId` | Proxied video stream | ❌ |

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

### Responsive Breakpoints

| Breakpoint | Target | Changes |
|-----------|--------|---------|
| `≤ 1024px` | Tablets | Adjusted grid columns, smaller hero |
| `≤ 768px` | Mobile | Hamburger menu, stacked layouts, full-width player |
| `≤ 480px` | Small mobile | Hidden hero description, compact cards, 16px inputs |

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

# 3. After deployment — set environment variables:
#    SMTP_EMAIL, SMTP_PASSWORD (Gmail App Password)
#    ONEDRIVE_CLIENT_ID, ONEDRIVE_CLIENT_SECRET (optional)
#    Update API_BASE in frontend/js/api.js with your Render URL
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
| **Gzip Compression** | All responses compressed via `compression` middleware |
| **Connection Pooling** | Single pg pool (20 connections), reused across requests |
| **GIN Indexes** | Full-text search in < 5ms across all content |
| **Partial Indexes** | Published-only index is 80% smaller than full scan |
| **Materialized Views** | Trending/stats queries cached, refreshed hourly via cron |
| **Table Partitioning** | `watch_history` scans only relevant month's partition |
| **DISTINCT ON** | Continue-watching query gets latest per content in one pass |
| **Lazy Loading** | Images load on scroll with CSS fade-in transitions |
| **Rate Limiting** | 200 req / 15 min per IP to prevent abuse |
| **Helmet** | Security headers in production mode |

---

## 🛡️ Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------  |
| Database | PostgreSQL 14+ | Primary data store with advanced features |
| Backend | Node.js + Express 4 | REST API server |
| Auth | JWT + bcryptjs + **Nodemailer OTP** | Dual-mode authentication |
| Email | Nodemailer + Gmail SMTP | OTP delivery with branded HTML |
| Real-time | WebSocket (ws) | Live viewer count, notifications |
| Scheduling | node-cron | Hourly materialized view refresh |
| Video | Microsoft Graph API + YouTube embed | Multi-source streaming |
| Compression | compression (gzip) | ~70% smaller responses |
| Frontend | Vanilla HTML/CSS/JS | Zero-framework overhead |
| Typography | Google Fonts (Inter, Bebas Neue) | Modern premium type |
| Security | Helmet + express-rate-limit | Production hardening |
| Deployment | Render.com | One-click blueprint |

---

## 🔄 Version History

### v2.0 — Platform Upgrade (Current)
- ✅ **Email OTP Authentication** — Passwordless login with 6-digit codes
- ✅ **Multi-Source Streaming** — YouTube / OneDrive / Public Domain
- ✅ **Mobile-First Responsive** — Hamburger menu, touch UI, breakpoints
- ✅ **Gzip Compression** — ~70% smaller HTTP responses
- ✅ **Lazy Image Loading** — CSS fade-in on scroll
- ✅ **Login-Gated Player** — Trailer for guests, full movie for users
- ✅ **Auto User Creation** — First OTP verify creates account
- ✅ **OTP Table** — `otp_codes` with expiry and cooldown

### v1.0 — Initial Build
- Full-stack streaming platform
- JWT password auth
- PostgreSQL with triggers, views, partitioning
- OneDrive video integration
- Admin dashboard with analytics
- 16-feature video player

---

## 📜 License

This project is licensed under the MIT License.

---

<p align="center">
  <strong>SEEN POINT</strong> — Built as a DBMS Final Year Project<br/>
  <em>Demonstrating normalized schema design, advanced indexing, triggers, partitioning, materialized views, OTP authentication, multi-source streaming, and full-stack integration.</em>
</p>
