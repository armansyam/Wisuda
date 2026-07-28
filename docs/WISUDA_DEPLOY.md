# WISUDA Platform — Production Deployment Guide

Dokumen ini menjelaskan tata cara deployment platform **Wisuda (Luxenary.co)** di lingkungan server produksi (VPS / Dedicated Server / Cloud) menggunakan **PM2** maupun **Docker Compose**.

---

## 🚀 Opsi 1: Automated Deployment via PM2 Script (Rekomendasi)

Script [deploy.sh](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/deploy.sh) secara otomatis menangani `git pull`, instalasi dependensi, auto-generate `SESSION_SECRET` & `JWT_SECRET`, build Admin SPA, migrasi database SQLite, serta verifikasi `health check`.

### Perintah Jalankan Setup & Deploy:
```bash
chmod +x deploy.sh
./deploy.sh
```

---

## 🐳 Opsi 2: Containerization via Docker Compose

Platform Wisuda mendukung penuh deployment terisolasi berbasis Docker.

### 1. Build & Jalankan Container:
```bash
docker-compose up -d --build
```

### 2. Memeriksa Status Container:
```bash
docker-compose ps
```

Container `wisuda-api` dilengkapi dengan **Healthcheck** yang memverifikasi endpoint `http://localhost:8081/api/health` setiap 30 detik.

---

## 🔑 Variabel Environment Penting (`.env`)

| Variabel | Contoh Nilai | Deskripsi |
| :--- | :--- | :--- |
| `PORT` | `8081` | Port HTTP tempat Express listener berjalan. |
| `NODE_ENV` | `production` | Mode aplikasi (`production` / `development`). |
| `SESSION_SECRET` | *(Auto-generated)* | Key acak 64-char untuk pengamanan cookie session. |
| `JWT_SECRET` | *(Auto-generated)* | Key acak 64-char untuk pengamanan JWT Bearer Token. |
| `CORS_ORIGINS` | `https://wisuda.id,https://admin.wisuda.id` | Whitelist domain yang diizinkan mengakses REST API. |
| `DB_PATH` | `./DATA/wisuda.db` | Jalur simpan file database SQLite. |
| `UPLOAD_PATH` | `./DATA/uploads` | Jalur simpan foto portofolio, bukti transfer, & invoice. |
| `TZ` | `Asia/Makassar` | Zona waktu operasional server. |

---

## 🔍 Pemantauan & Verifikasi Kesehatan Service

### Verification via Health Endpoint:
```bash
curl -s http://localhost:8081/api/health
```
Respons sukses:
```json
{
  "status": "ok",
  "timestamp": "2026-07-27T15:48:19.528Z",
  "db": "connected"
}
```

### Log Monitoring (PM2):
```bash
pm2 logs wisuda-api
```

### Log Monitoring (Docker):
```bash
docker-compose logs -f wisuda-api
```