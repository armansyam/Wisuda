# 📸 Media Handling & Google Drive Import System — Wisuda Platform

**Version:** 1.2  
**Last Updated:** 2026-07-25  
**Engine:** Sharp (Image Processing) + Resilient GDrive Background Importer  
**Status:** ✅ Active & Production-Ready

---

## 🎯 1. Overview & Media Strategy

Sistem memisahkan penyimpanan berkas ke dalam 2 kategori:

1. **Master High-Res Files (10MB - 25MB+)**:
   - Disimpan 100% di **Google Drive / Cloud Storage** vendor.
   - Digunakan khusus untuk pencetakan cetak foto fisik oleh klien.
2. **Web-Optimized Assets (~40KB - 60KB WebP)**:
   - Diproses secara otomatis oleh **Sharp Engine** saat diunggah / diimpor.
   - Digunakan untuk tampilan publik (Landing Page, Portfolio Masonry Gallery, HP View, dan Fullscreen Lightbox Modal).

---

## ⚙️ 2. Sharp Image Processing Standard

Setiap foto yang diproses oleh backend backend (`src/routes/admin.js` dan `src/services/drive-importer.service.js`) menggunakan konfigurasi standar berikut:

```javascript
await sharp(inputBuffer)
  .rotate()                                                  // 1. Auto-rotate dari EXIF orientation
  .resize(1000, undefined, { fit: 'inside', withoutEnlargement: true }) // 2. Width max 1000px, preserve aspect ratio
  .webp({ quality: 85, effort: 4 })                         // 3. Convert ke WebP 85% Quality
  .toFile(outputPath);
```

### 🛡️ Kebijakan No Visual Cropping
Pengaturan `fit: 'inside'` menjamin rasio aspek foto (*aspect ratio* 3:2, 4:3, atau *portrait* 2:3) **100% utuh**. Komposisi foto wisudawan dari kepala hingga kaki dijamin tidak terpotong.

---

## 🛡️ 3. Resilient Google Drive Importer Engine

Impor foto dari Google Drive berjalan secara **Asynchronous Background Job** via `src/services/drive-importer.service.js`.

```
[ Admin Dashboard ]
       │  (1. Submit Link Drive -> HTTP 200 Instant Response < 1s)
       ▼
[ POST /api/admin/portfolio/import-drive ]
       │
       ▼
[ Background Worker (Event Loop) ]
       ├─► 1. Hard Timeout: AbortSignal.timeout(30000) per file
       ├─► 2. Exponential Backoff Retry: (1.5s -> 3.0s -> 6.0s) pada HTTP 429/500
       ├─► 3. Base Throttling Delay: 250ms per foto (human-like rate)
       ├─► 4. Sharp WebP Converter Engine
       └─► 5. Auto Recovery: Stale jobs (>30m) diset 'error' oleh Cron
```

### Keunggulan Resilience:
- **Anti 504 Timeout**: HTTP request langsung merespon `< 1s`, admin dapat menutup tab browser tanpa menggagalkan impor.
- **Anti Rate Limiting (HTTP 429)**: Menggunakan delay 250ms & exponential backoff retry.
- **Resumable Recovery**: Jika server terestart, cron membersihkan status stale (`cleanStaleImportingBookings()`).

---

## 🧹 4. Staging Uploads & File Lifecycle

| Direktori Storage | Jenis File | Aturan Cleanup |
|---|---|---|
| `DATA/uploads/portfolio/` | WebP Portfolio Published | Permanen (sampai portfolio dihapus admin) |
| `DATA/uploads/staging_uploads/` | Foto mentah sementara yang disetor FG | **Otomatis dihapus** dari disk saat admin mengonfirmasi delivery hasil foto ke client. |
| `DATA/uploads/payment_proofs/` | Gambar Bukti Transfer DP/Pelunasan | **Otomatis dihapus** dari disk oleh Maintenance Cron setelah 90 hari booking completed. |
| `DATA/uploads/invoices-client/` | PDF Kontrak & Invoice Client | **Otomatis dihapus** dari disk oleh Maintenance Cron setelah 30 hari booking completed. |

---

*Wisuda Platform Media Handling Specification v1.2*
