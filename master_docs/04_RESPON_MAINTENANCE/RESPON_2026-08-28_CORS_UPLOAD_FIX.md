# Laporan Perbaikan Maintenance - 28 Agustus 2026

## Deskripsi Masalah (BUG-0828-01)
- **Komponen:** Storage / Direct Upload API
- **Gejala:** File berhasil diunggah ke Google Drive melalui browser (Direct-to-Drive Stream), tetapi UI admin menunjukkan pesan error "Koneksi ke Google Drive terputus saat upload" berlogo peringatan merah. Setelah direfresh, status kembali ke "Menunggu Upload Staging".
- **Akar Masalah:** `fetch` Node.js di backend tidak otomatis menyertakan header `Origin` saat membuat sesi Resumable Upload ke Google API. Akibatnya, Google tidak merespons dengan izin CORS (`Access-Control-Allow-Origin`). Browser memblokir respons sukses (200 OK) dari Google, sehingga Javascript (Vue) mengira koneksi gagal dan tidak pernah mengeksekusi endpoint `finalize` untuk mengubah status database.

## Tindakan Perbaikan
- **Modifikasi Kode:** `/src/routes/direct-upload.js`
- **Detail:** Menambahkan header `Origin: req.headers.origin || 'https://wisuda.sorehari.my.id'` pada request `POST` inisialisasi sesi (`initiate`).

## Status
🟢 **RESOLVED** - Menunggu deployment ke VPS (Produksi).
