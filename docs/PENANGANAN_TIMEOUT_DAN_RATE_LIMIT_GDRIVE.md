# 🛡️ Standar Penanganan Timeout & Rate Limit Google Drive — Wisuda Platform

**Versi:** 1.2  
**Tanggal Diperbarui:** 2026-07-25  
**Status:** ✅ Aktif & Diterapkan di Kode Produksi  
**Dokumen Utama:** Referensi lengkap tersedia di [`MEDIA_HANDLING.md`](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/docs/MEDIA_HANDLING.md)

---

## ⚙️ Ringkasan Sistem Ketahanan 4-Lapis

1. **Async Background Processing**: Endpoint API langsung merespon `HTTP 200` dalam `< 1s`. Bebas HTTP 504 Timeout.
2. **Hard Network Timeout**: `AbortSignal.timeout(30000)` membatasi 30s per pengunduhan berkas.
3. **Exponential Backoff Retry**: Auto-retry pada respon `429` / `500+` (jeda: 1.5s ➔ 3s ➔ 6s).
4. **Base Throttling**: Delay 250ms antar-foto meniru pola akses manusia (*human-like pattern*).
5. **Auto Stale Recovery**: Jobs tertahan > 30m di-recovery otomatis oleh maintenance cron.

---
*Wisuda Platform Google Drive Importer Specification v1.2*
