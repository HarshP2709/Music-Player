# 🎵 Harmony Music Player

A full-stack music streaming application with a **Vanilla JS + Vite** frontend and a **Node.js + Express** backend, both powered by **Supabase**.

---

## 📁 Project Structure

```
Harmony Music Player/
├── frontend/                   ← Browser app (Vite + Vanilla JS)
│   ├── index.html              # Landing page
│   ├── login.html              # Sign-in page
│   ├── register.html           # Registration page
│   ├── forgot-password.html    # Password reset page
│   ├── dashboard.html          # Main app dashboard
│   ├── playlist.html           # Playlist management
│   ├── favorites.html          # Favourites page
│   ├── profile.html            # User profile & settings
│   ├── vite.config.js          # Vite build config
│   ├── package.json
│   ├── .env.example            # Copy to .env and fill in Supabase keys
│   ├── js/
│   │   ├── supabase.js         # Supabase browser client
│   │   ├── auth.js             # Login / register / session helpers
│   │   ├── player.js           # Audio engine (queue, shuffle, repeat)
│   │   ├── ui.js               # Bottom player bar, modals, cards
│   │   ├── search.js           # Live search overlay
│   │   ├── playlist.js         # Playlist CRUD + drag-and-drop
│   │   ├── favorites.js        # Toggle & fetch favorites
│   │   ├── profile.js          # Profile update, avatar, stats
│   │   ├── storage.js          # Drag-drop upload zone helpers
│   │   ├── notifications.js    # Toast notification system
│   │   └── utils.js            # Pure helpers (format, debounce, etc.)
│   ├── css/
│   │   ├── style.css           # Base styles, design tokens, components
│   │   ├── dashboard.css       # Dashboard layout
│   │   ├── music-player.css    # Bottom player bar
│   │   ├── auth.css            # Login/register forms
│   │   ├── playlist.css        # Playlist page
│   │   ├── profile.css         # Profile page
│   │   ├── animations.css      # Keyframe animations
│   │   └── responsive.css      # Media queries
│   └── assets/
│       ├── images/             # Default cover, avatar
│       ├── icons/
│       ├── covers/             # User-uploaded covers (local dev only)
│       └── songs/              # Local audio files (dev only)
│
├── backend/                    ← REST API server (Express)
│   ├── package.json
│   ├── .env.example            # Copy to .env and fill in Supabase service role key
│   ├── sql/
│   │   └── schema.sql          # Full Supabase PostgreSQL schema + RLS
│   └── src/
│       ├── server.js           # Express entry point
│       ├── config/
│       │   └── supabase.js     # Admin Supabase client (service role)
│       ├── middleware/
│       │   ├── auth.js         # JWT verification middleware
│       │   └── validate.js     # Field validation + sanitization helpers
│       └── routes/
│           ├── auth.js         # GET /api/auth/me, DELETE /api/auth/account
│           ├── songs.js        # GET/POST  /api/songs
│           ├── artists.js      # GET       /api/artists
│           ├── albums.js       # GET       /api/albums
│           ├── playlists.js    # CRUD      /api/playlists
│           ├── profile.js      # GET/PATCH /api/profile  + favorites + settings
│           └── storage.js      # POST      /api/storage/upload/*
│
└── .gitignore
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18
- A [Supabase](https://supabase.com) project with the schema applied

### 1. Apply the database schema
Run [`backend/sql/schema.sql`](backend/sql/schema.sql) in your Supabase SQL editor.

### 2. Frontend
```bash
cd frontend
cp .env.example .env       # Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev                # http://localhost:3000
```

### 3. Backend
```bash
cd backend
cp .env.example .env       # Add SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY
npm install
npm run dev                # http://localhost:5000
```

---

## 🌐 API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET    | `/health`                         | —    | Health check |
| GET    | `/api/auth/me`                    | ✅   | Current user + profile |
| DELETE | `/api/auth/account`               | ✅   | Delete account |
| GET    | `/api/songs`                      | —    | List songs (filter, paginate) |
| GET    | `/api/songs/:id`                  | —    | Single song |
| POST   | `/api/songs/:id/play`             | ✅   | Log play |
| GET    | `/api/artists`                    | —    | List artists |
| GET    | `/api/artists/:id`                | —    | Single artist + albums |
| GET    | `/api/artists/:id/songs`          | —    | Artist's songs |
| GET    | `/api/albums`                     | —    | List albums |
| GET    | `/api/albums/:id`                 | —    | Single album + songs |
| GET    | `/api/playlists`                  | ✅   | My playlists |
| POST   | `/api/playlists`                  | ✅   | Create playlist |
| GET    | `/api/playlists/:id`              | —    | Playlist detail |
| PATCH  | `/api/playlists/:id`              | ✅   | Update playlist |
| DELETE | `/api/playlists/:id`              | ✅   | Delete playlist |
| POST   | `/api/playlists/:id/songs`        | ✅   | Add song to playlist |
| DELETE | `/api/playlists/:id/songs/:songId`| ✅   | Remove song |
| PATCH  | `/api/playlists/:id/reorder`      | ✅   | Reorder songs |
| GET    | `/api/profile`                    | ✅   | My profile |
| PATCH  | `/api/profile`                    | ✅   | Update profile |
| GET    | `/api/profile/stats`              | ✅   | Listening stats |
| GET    | `/api/profile/settings`           | ✅   | User settings |
| PATCH  | `/api/profile/settings`           | ✅   | Update settings |
| GET    | `/api/profile/favorites`          | ✅   | Favorites list |
| POST   | `/api/profile/favorites/:songId`  | ✅   | Toggle favorite |
| POST   | `/api/storage/upload/song`        | ✅   | Upload audio file |
| POST   | `/api/storage/upload/cover`       | ✅   | Upload cover image |
| POST   | `/api/storage/upload/avatar`      | ✅   | Upload avatar |
| DELETE | `/api/storage`                    | ✅   | Delete file |

---

## 🔑 Environment Variables

### `frontend/.env`
| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous / public key |
| `VITE_SUPABASE_STORAGE_BUCKET` | — | Override default `songs` bucket name |

### `backend/.env`
| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service role key (server-only!) |
| `SUPABASE_ANON_KEY` | ✅ | Anon key for user-scoped clients |
| `PORT` | — | Server port (default: 5000) |
| `ALLOWED_ORIGINS` | — | Comma-separated frontend origins |
| `RATE_LIMIT_MAX` | — | Max requests per window (default: 200) |

---

## 🛡️ Security Notes
- The `SUPABASE_SERVICE_ROLE_KEY` is **only** used server-side and bypasses Row Level Security. Never expose it in the browser.
- Row Level Security (RLS) policies are defined in [`backend/sql/schema.sql`](backend/sql/schema.sql).
- All user-facing inputs are sanitized before writing to the database.

---

## 📄 License
MIT
