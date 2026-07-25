# 📸 Standar Kompresi Gambar Sharp Engine — Wisuda Platform

**Versi:** 1.2  
**Tanggal Diperbarui:** 2026-07-25  
**Status:** ✅ Aktif & Diterapkan di Kode Produksi  
**Dokumen Utama:** Referensi lengkap tersedia di [`MEDIA_HANDLING.md`](file:///Users/armansyam/Documents/Project%20AmsDev/Wisuda/docs/MEDIA_HANDLING.md)

---

## 🎯 1. Ringkasan Fitur & Konsep

Sistem memisahkan **File Master Cetak (High-Res di Drive)** dan **Web Asset (~40KB - 60KB WebP)** untuk kecepatan akses publik maksimal.

```javascript
await sharp(buffer)
  .rotate()                                                  // Auto-rotate dari EXIF kamera
  .resize(1000, undefined, { fit: 'inside', withoutEnlargement: true }) // Width max 1000px, preserve ratio
  .webp({ quality: 85, effort: 4 })                         // Convert WebP 85%
  .toFile(targetPath);
```

## 📊 Perbandingan Efisiensi

| Parameter | Sebelum | Sesudah (Sharp WebP) | Efisiensi |
|---|---|---|---|
| Format | `.jpg` Uncompressed | **`.webp`** | Modern Web Standard |
| Ukuran Foto | ~850 KB | **~40 KB – 60 KB** | 🚀 **Hemat 93%** |
| Loading 10 Foto | ~8.5 MB | **~400 KB** | ⚡ **20x Lebih Cepat** |
| Crop Status | Sering Terpotong | **NO CROPPING (`fit: inside`)** | 🛡️ 100% Utuh |

---
*Wisuda Platform Sharp Engine Standard v1.2*
