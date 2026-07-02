# Wisuda Platform – Setup & Run Guide

This repository contains the **Graduation Photography Agency Platform** (based on Sorehari style). The goal is to automate inquiry‑to‑delivery workflows, manual verification, and curated social proof.

---

## Prerequisites

- Node.js 20+ (install via `nvm`)
- Terminal access to `192.168.100.254`
- Basic familiarity with `npm`, `bash`, and `sqlite3`

---

## Directory Structure

```
wisuda-platform/
├── docs/                # Documentation (PRD, spec)
├── scripts/             # Migration & utilities
├── src/                 # Application source (to be built later)
├── public/              # Static UI
│   ├── admin/          # Admin SPA (Vue/React later)
│   ├── portfolio.html # Public portfolio page
│   └── assets/         # Static assets
├── package.json        # npm configuration
└── .env.example        # Environment template
```

---

## Quick Start (Development)

### 1. Clone & Install

```bash
# If not already present, clone the repo to the server’s working directory
cd /root
# (If you already have the clone, just navigate)
cd wisuda-platform

# Install dependencies (first time only)
npm ci   # or: npm install
```

### 2. Initialize Database

Run the migration script to create `wisuda.db` in `/DATA/AppData/`:

```bash
node scripts/migrate.js
```

### 3. Run the Application

Start the Node.js server:

```bash
npm start
```

Alternatively, start in watch mode (auto‑restart on code change):

```bash
npm run dev
```

### 4. Access the Platform

- **Admin Interface:** `http://192.168.100.254:8081` (login defaults in `scripts/migrate.js`)
- **Public Portfolio:** `http://192.168.100.254:8081/portfolio.html`

### 5. Stop the Server

Press `Ctrl‑C` or run:

```bash
pkill -f "wisuda-platform"
```

---

## Relevant TUI Commands (for debugging)

### Database Commands

Inspect the SQLite database:

```bash
# Open interactive sqlite3
sqlite3 /DATA/AppData/wisuda.db "SELECT name FROM sqlite_master WHERE type='table';"
```

Query specific tables:

```bash
sqlite3 /DATA/AppData/wisuda.db "SELECT * FROM bookings LIMIT 5;"
```

### Backups

Create a timestamped copy of the database for safety:

```bash
mkdir -p /DATA/AppData/backups
sqlite3 /DATA/AppData/wisuda.db "VACUUM INTO '/DATA/AppData/backups/wisuda_$(date +%F_%H%M%S).db';"
```

### Logs

View Node.js logs (if using PM2 or console output directly):

```bash
# tail the output from the terminal where the server is running
```

---

## Important Notes

- The **admin credentials** printed during migration are only for development. Change them in a `.env` file for production.
- All **file uploads** (e.g., contract PDFs, payment proof) go into `/DATA/AppData/uploads/`. Ensure the directory is writable.
- The **WhatsApp gateway** (Baileys) runs on `192.168.100.83:3001`; ensure firewall allows traffic between 192.168.100.254 and 192.168.100.83.
- **Cloudflare Tunnel** is used for public access – ensure the tunnel is running and exposed correctly.

---

## Future Migration (when building)

- Extract `src/` (Express/Express‑Session, routes, middlewares, services).
- Add environment variables, authentication (JWT/BCrypt), and production‑grade logging.
- Integrate third‑party APIs (WhatsApp Business API, Meta Graph API for Instagram, payment gateways if needed).
- Use PM2 for process management (`npm install -g pm2 && pm2 start ecosystem.config.js`).
- Set up HTTPS, rate limiting, CSRF protection, and automated CI/CD pipelines.

---

## Troubleshooting

**If the application won’t start:**

- Ensure Node.js and all dependencies are installed.
- Check for syntax errors in `src/main.js`. Try running `node src/main.js` directly for error details.

**If SQLite reports errors:**

- Verify the `/DATA/AppData/` directory has read‑write permissions.
- Ensure there are no offline readonly layers (e.g., overlayfs) that prevent writing.

**If WhatsApp notifications are not sent:**

- Verify the Baileys server (`192.168.100.83:3001`) is running and accessible.
- Check `/DATA/AppData/hermes/.baileys` for session state.
- Ensure firewall rules allow HTTP requests from 192.168.100.254 to 192.168.100.83.

---

## Fin

Use `docs/PRD.md` as the single source of truth for requirements.
Use `scripts/migrate.js` to keep the database up‑to‑date.
Refer to `src/` (when developed) for implementation.

Happy automating!
