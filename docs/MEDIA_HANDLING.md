# 📸 Media Handling, Sharp Engine & Google Drive Integration

**Version:** 1.4.4  
**Last Updated:** 2026-07-30  
**Engine:** Sharp Image Processing + Smart Hybrid Google Drive Engine (3-Step OAuth + Service Account Bot)  
**Status:** ✅ Active & Production-Ready

---

## 1. Overview & Strategi Penyimpanan Media

Sistem memisahkan penyimpanan berkas ke dalam 2 kategori utama:

1. **Master High-Res Files (10MB - 25MB+)**:
   - Disimpan 100% di **Google Drive / Cloud Storage** vendor.
   - Dikelola melalui teknologi **Smart Hybrid** (Otorisasi 3-Step OAuth Gmail Studio & Service Account Bot 24/7).
   - Digunakan khusus untuk keperluan cetak foto fisik resolusi tinggi oleh klien.
2. **Web-Optimized Assets (~40KB - 60KB WebP)**:
   - Diproses secara otomatis oleh **Sharp Engine** saat diunggah / diimpor.
   - Digunakan untuk tampilan publik (Landing Page, Portfolio Masonry Gallery, HP View, dan Fullscreen Lightbox Modal).

---

## 2. Sharp Image Processing Standard (No-Crop WebP)

Setiap foto portofolio yang diimpor dari Google Drive atau diunggah via admin diproses oleh backend (`src/services/drive-importer.service.js`) menggunakan konfigurasi standar berikut:

```javascript
await sharp(inputBuffer)
  .rotate()                                                            // 1. Auto-rotate berdasarkan EXIF orientation
  .resize(1000, undefined, { fit: 'inside', withoutEnlargement: true }) // 2. Width max 1000px, preserve aspect ratio
  .webp({ quality: 85, effort: 4 })                                   // 3. Convert ke WebP 85% Quality
  .toFile(outputPath);
```

### 🛡️ Kebijakan No Visual Cropping
Pengaturan `fit: 'inside'` menjamin rasio aspek foto (*aspect ratio* 3:2, 4:3, atau *portrait* 2:3) **100% utuh**. Komposisi foto wisudawan dari kepala hingga ujung kaki dijamin tidak pernah terpotong (*no cropping*).

### 📊 Perbandingan Efisiensi WebP
| Parameter | Sebelum (JPG Uncompressed) | Sesudah (Sharp WebP) | Efisiensi |
|---|---|---|---|
| Format | `.jpg` / `.png` | **`.webp`** | Modern Web Standard |
| Ukuran Foto | ~850 KB | **~40 KB – 60 KB** | 🚀 **Hemat 93% Data** |
| Load 10 Foto | ~8.5 MB | **~400 KB** | ⚡ **20x Lebih Cepat** |
| Crop Status | Sering Terpotong | **NO CROPPING (`fit: inside`)** | 🛡️ 100% Aspect Ratio Utuh |

---

## 3. Resilient Google Drive Importer Engine (4-Tier Protection)

Impor foto portofolio dari Google Drive berjalan secara **Asynchronous Background Job** via `src/services/drive-importer.service.js`.

```
[ Admin Dashboard ]
       │  (1. Submit Link Drive -> HTTP 200 Instant Response < 1s)
       ▼
[ POST /api/admin/portfolio/import-drive ]
       │
       ▼
[ Background Worker (Event Loop) ]
       ├─► 1. Hard Network Timeout: AbortSignal.timeout(30000) per file
       ├─► 2. Exponential Backoff Retry: (1.5s -> 3.0s -> 6.0s) pada HTTP 429/500
       ├─► 3. Base Throttling Delay: 250ms per foto (human-like rate)
       ├─► 4. Sharp WebP Converter Engine
       └─► 5. Auto Recovery: Stale jobs (>30m) diset 'error' oleh Cron
```

### Key Resilience Factors:
1. **Async Background Processing**: Endpoint API merespon `HTTP 200` dalam `< 1s`. Bebas dari kecemasan HTTP 504 Timeout saat mengimpor puluhan foto sekaligus.
2. **Hard Network Timeout**: `AbortSignal.timeout(30000)` membatasi maksimal 30s per pengunduhan berkas.
3. **Exponential Backoff Retry**: Otomatis mengulang saat menemui error HTTP `429 Too Many Requests` atau `500 Server Error` dengan jeda berkala (1.5s ➔ 3.0s ➔ 6.0s).
4. **Base Throttling Delay**: Delay 250ms antar-foto meniru pola akses manusia (*human-like rate limit prevention*).
5. **Auto Stale Job Recovery**: Status impor yang tertahan > 30 menit otomatis dibersihkan dan dipulihkan oleh daily maintenance cron (`cleanStaleImportingBookings()`).

---

## 4. Staging Uploads & File Lifecycle Retention Rules

| Direktori Storage | Jenis File | Aturan Retensi Cleanup |
|---|---|---|
| `DATA/uploads/portfolio/` | WebP Portfolio Published | Permanen (sampai dihapus admin) |
| `DATA/uploads/gallery_cache/` | Cache Thumbnail Proxy Lightbox (`w400`/`w800`) | Otomatis dibersihkan saat highlight diupload, delivered, atau client konfirmasi terima. Max TTL 7 hari. |
| `DATA/uploads/staging_uploads/` | Foto mentah sementara dari FG | Otomatis dihapus saat admin konfirmasi delivery hasil foto ke client. |
| `DATA/uploads/payment-proofs/` | Bukti Transfer DP / Pelunasan | Otomatis dihapus oleh Maintenance Cron setelah 90 hari booking completed. |
| `DATA/uploads/invoices-client/` | PDF Kontrak & Invoice Client | Otomatis dihapus oleh Maintenance Cron setelah 30 hari booking completed. |

---

*Wisuda Platform Media Handling Specification v1.4.3 — Updated 2026-07-29*
