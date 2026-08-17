> [!WARNING]
> **HISTORICAL ARCHIVE / CATATAN HISTORIS (READ-ONLY)**
> Berkas ini adalah rekaman audit/laporan masa lalu yang disimpan semata-mata untuk riwayat historis.
> **DILARANG MENGANGGAP TEMUAN DI DALAM DOKUMEN INI SEBAGAI BUG ATAU KEBUTUHAN IMPLEMENTASI AKTIF.**
> Untuk melihat status fitur, bug yang sudah di-resolve, dan arsitektur aktif saat ini, seluruh AI Agent & Pengembang WAJIB merujuk ke **[master_docs/SYSTEM_STATE.md](../../SYSTEM_STATE.md)**.

---

# Bug Report — Wisuda Platform Tidak Jalan di Port 8084

## Ringkasan
Wisuda Platform terlihat offline karena proses `wisuda-api` crash saat startup. Port `8084` tidak sempat bind, sehingga health check gagal connect.

## Repo / Versi yang Dipull
- Branch: `main`
- Commit: `c67f21f`
- Commit message: `feat: implement Feature Toggle for Freelance Portal access and update status validators to v1.4.0`
- Package version: `1.4.0`
- Kondisi repo lokal saat diagnosis: `package-lock.json` termodifikasi setelah reinstall dependency

## Waktu Diagnosis
- Waktu cek utama: `2026-07-31T02:21:19+08:00`

## Kondisi Runtime Saat Dicek
- PM2:
  - `wisuda-api` status: `online`
  - restart count: `62`
  - uptime saat cek: `5s`
  - mem: `138.8mb`
  - CPU: `100%`
  - `wisuda-cron` status: `online`
  - restart count: `0`
- Port 8084:
  - `ss -tlnp | grep 8084` → **tidak ada listener**
- Health check:
  - `curl http://127.0.0.1:8084/api/health` → **gagal connect**

## Gejala
- Website terlihat offline
- PM2 menunjukkan restart berulang
- Akses ke port 8084 gagal
- Aplikasi mati sebelum server benar-benar jalan

## Root Cause
Crash terjadi pada inisialisasi session store di `src/main.js`:
js
store: new SQLiteStore({
  db: 'sessions',
  dir: path.dirname(config.dbPath),
}),
Log error utama:
text
TypeError: this.db.exec is not a function
at new SQLiteStore (.../connect-sqlite3/lib/connect-sqlite3.js:56:17)
at Object.<anonymous> (/DATA/AppData/wisuda-platform/src/main.js:92:10)
## Diagnosis Teknis
Ada mismatch antara:
- `express-session` + `connect-sqlite3`
- `better-sqlite3`

`connect-sqlite3` mengharapkan API SQLite yang kompatibel dengan implementasinya, tetapi project ini memakai `better-sqlite3`. Akibatnya, method yang dibutuhkan session store tidak tersedia / tidak cocok, lalu proses crash saat startup.

### Lokasi error yang terkonfirmasi
- File: `src/main.js`
- Baris:
 (1/3)
`92`
- Stack trace source: `node_modules/connect-sqlite3/lib/connect-sqlite3.js:56`

## Dampak
- App tidak bisa startup normal
- PM2 terus me-restart proses
- Port 8084 tidak aktif
- Website terlihat offline bagi user

## Bukti Tambahan
- `ss -tlnp | grep 8084` → tidak ada listener
- `pm2 logs wisuda-api --err` → error `this.db.exec is not a function`
- `pm2 list` → proses ada, tapi restart count naik
- `pm2 show wisuda-api` sebelumnya menunjukkan app sempat start, lalu crash berulang

## Cuplikan Log Error
text
TypeError: this.db.exec is not a function
at new SQLiteStore (/DATA/AppData/wisuda-platform/node_modules/connect-sqlite3/lib/connect-sqlite3.js:56:17)
at Object.<anonymous> (/DATA/AppData/wisuda-platform/src/main.js:92:10)
at Module._compile (node:internal/modules/cjs/loader:1871:14)
at Module._load (node:internal/modules/cjs/loader:1396:12)
at Object.<anonymous> (/usr/local/lib/node_modules/pm2/lib/ProcessContainerFork.js:32:23)
## Reproduksi
1. Start app via PM2
2. App crash saat inisialisasi session store
3. Port 8084 tidak bind
4. Health check gagal

## Expected Behavior
- App start normal
- PM2 status stabil
- Port 8084 listen
- `GET /api/health` mengembalikan status OK

## Actual Behavior
- App crash saat startup
- PM2 restart loop
- Port 8084 tidak aktif

## Catatan Penting
- Tidak ada perubahan code dilakukan di server
- Repo server harus tetap mengikuti GitHub
- Perbaikan harus dilakukan di repo upstream lalu dipull dan dideploy ulang
- Karena ada kebijakan sinkronisasi repo, diagnosis ini **hanya untuk tim dev**; tidak ada hotfix lokal di server

## Rekomendasi Perbaikan
1. Audit konfigurasi session store di `src/main.js`
2. Pastikan backend session storage kompatibel dengan driver SQLite yang dipakai
3. Hindari kombinasi library yang tidak cocok
4. Setelah perbaikan, verifikasi:
   - PM2 stabil
   - port 8084 listen
   - `/api/health` sukses
   - restart count tidak terus naik

## Catatan Operasional
 (2/3)
- Port target layanan: `8084`
- Package version repo: `1.4.0`
- Commit basis diagnosis: `c67f21f`
- Branch: `main`
