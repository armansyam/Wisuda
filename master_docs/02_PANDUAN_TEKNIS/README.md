# 📖 02 — Panduan Teknis Arsitektur, Deployment & Operasional
## Wisuda Photography Platform — Developer & Operational Manuals

Direktori ini berisi seluruh panduan teknis mendalam (*Technical Specifications*), pedoman arsitektur basis data, panduan deployment server VPS produksi, spesifikasi API Swagger, serta panduan operasional studio.

---

## 📑 Indeks Panduan Teknis

| Berkas Panduan | Topik & Cakupan Utama |
| :--- | :--- |
| **[DOKUMENTASI_UTAMA_PLATFORM_WISUDA.md](./DOKUMENTASI_UTAMA_PLATFORM_WISUDA.md)** | 🏛️ **Arsitektur Utama Sistem**: Skema database SQLite3, struktur folder backend & frontend, otentikasi multi-tier, dan panduan modifikasi aman. |
| **[TECHNICAL_GUIDE.md](./TECHNICAL_GUIDE.md)** | 🚀 **Panduan Deployment Server VPS**: Panduan instalasi Ubuntu 20.04/22.04 LTS, konfigurasi PM2 Process Manager, Nginx Reverse Proxy, SSL HTTPS Certbot, dan Docker Compose. |
| **[WORKFLOW_OPERASIONAL_STUDIO_WISUDA.md](./WORKFLOW_OPERASIONAL_STUDIO_WISUDA.md)** | 🏢 **SOP Operasional Harian Studio**: Alur kerja praktis tim Admin Studio, Fotografer Freelance, dan interaksi dengan Klien. |
| **[CHANGELOG.md](./CHANGELOG.md)** | 📜 **Riwayat Perubahan Versi**: Catatan rilis per versi (fitur baru, bug fixes, optimasi keamanan, dan breaking changes). |
| **[swagger.json](./swagger.json)** | 🌐 **Spesifikasi OpenAPI 3.0**: Definisi endpoint RESTful Headless API Engine (`/api/v1/*`) untuk integrasi client external / mobile app. |
| **[Proposal_Teknis_DTC_Upload.md](./Proposal_Teknis_DTC_Upload.md)** | ⚡ **Spesifikasi Direct-to-Drive (Zero Disk Transit)**: Desain arsitektur pengunggahan berkas master foto langsung ke Google Drive API. |
| **[ALUR_KERJA_PORTOFOLIO.md](./ALUR_KERJA_PORTOFOLIO.md)** | 🖼️ **Spesifikasi Teknis Modul Portofolio**: Sinkronisasi cover foto, kompresi Sharp, dan import Google Drive. |
| **[ARSITEKTUR_PAYMENT_IPAYMU_HYBRID.md](./ARSITEKTUR_PAYMENT_IPAYMU_HYBRID.md)** | 💳 **Arsitektur Integrasi iPaymu (Hybrid)**: Integrasi Cloudflare Tunnel (Inbound) + VPS Egress Proxy (Static Outbound IP Whitelist). |
| **[PROPOSAL_ARSITEKTUR_HYBRID_HA_SERVER.md](./PROPOSAL_ARSITEKTUR_HYBRID_HA_SERVER.md)** | ⚖️ **Proposal Arsitektur Hybrid Multi-Server (HA & Load Balancer)**: Skema Active-Active Load Balancing & Failover antara Cloud VPS & Self-Hosted Lokal. |
| **[Pengenalan.md](./Pengenalan.md)** | 💡 **Pengenalan Konsep Platform**: Gambaran umum visi platform dan modularitas sistem. |

---
*Kembali ke [Master Documentation Hub](../README.md)*
