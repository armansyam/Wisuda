# Panduan Arsitektur Integrasi iPaymu: Hybrid Self-Hosted + Cloudflare Tunnel + VPS Egress

Dokumen ini menjelaskan arsitektur integrasi payment gateway **iPaymu** untuk sistem self-hosted (server lokal studio) yang menggunakan **Cloudflare Tunnel** untuk akses domain publik dan **VPS Murah sebagai Egress Proxy** untuk memenuhi syarat *Outbound Static IP Whitelist* dari iPaymu.

---

## 1. Latar Belakang & Masalah

| Kondisi Sistem Kita | Syarat Teknis iPaymu | Masalah yang Timbul |
| :--- | :--- | :--- |
| **Self-Hosted (Server Lokal):** Menggunakan internet ISP kantor/studio dengan IP Publik Dinamis / CGNAT. | **Strict Outbound IP Whitelist:** iPaymu mencocokkan IP pengirim setiap kali backend memanggil API `my.ipaymu.com`. | Jika modem restart / IP ISP berubah, request API gagal (`403 Unauthorized / IP not whitelisted`). |
| **Cloudflare Tunnel (cloudflared):** Bertindak sebagai *Reverse Proxy* (Hanya menangani trafik MASUK). | **Validasi Header & Domain:** Membutuhkan domain ber-SSL resmi untuk verifikasi bisnis & webhook callback. | Cloudflare Tunnel tidak menyediakan IP Egress statis keluar pada paket gratis. |

---

## 2. Solusi Arsitektur: Hybrid Egress Proxy

Kita membagi lalu lintas data menjadi dua jalur:
1. **Jalur Masuk (Inbound):** Ditangani oleh **Cloudflare Tunnel** (Domain, SSL, CDN Cache, Webhook Callback).
2. **Jalur Keluar Khusus iPaymu (Outbound):** Dititipkan lewat **VPS Murah (IP Publik Statis)** menggunakan forward proxy ringan.
3. **Jalur Keluar Lainnya (Google Drive, dll):** Langsung melalui koneksi internet server lokal tanpa membebani VPS.

---

## 3. Diagram Alur Visual

```mermaid
flowchart TD
    %% Entitas Luar
    subgraph Internet ["🌐 DUNIA LUAR / INTERNET"]
        User["📱 Pengunjung / Klien"]
        iPaymu["🏦 Server iPaymu (my.ipaymu.com)"]
        GDrive["☁️ Google Drive API"]
    end

    %% Cloudflare Layer
    subgraph CF_Layer ["🛡️ CLOUDFLARE (JALUR MASUK / INBOUND)"]
        CF_Edge["Domain: wisuda.domainanda.com\n(CDN Cache, SSL Gratis, Proteksi DDoS)"]
        CF_Tunnel["Cloudflare Tunnel (cloudflared)\n(Meneruskan ke Port Server Lokal)"]
    end

    %% VPS Egress Layer
    subgraph VPS_Layer ["🖥️ VPS MURAH (JALUR KELUAR / OUTBOUND IPAYMU)"]
        VPS_Proxy["Proxy Server (Tinyproxy / Squid)\n👉 IP Publik Statis: 103.xxx.xxx.xxx 👈\n(Port Terproteksi Password)"]
    end

    %% Server Lokal
    subgraph Local_Server ["🏠 SERVER LOKAL STUDIO (SELF-HOSTED)"]
        direction TB
        AppBackend["⚙️ Backend Node.js / Express\n- Logika Transaksi\n- Generate Signature & Header iPaymu\n- Direct Stream ke GDrive"]
        AppDB[("🗄️ Database Lokal")]
    end

    %% Hubungan Alur Masuk
    User -->|"1. Buka Web / Pilih Paket"| CF_Edge
    CF_Edge -->|"2. Forward via Tunnel"| CF_Tunnel
    CF_Tunnel -->|"3. Diterima Backend Lokal"| AppBackend

    %% Hubungan Alur Keluar iPaymu
    AppBackend -->|"4. Kirim Request Tagihan\n(Melalui HttpsProxyAgent)"| VPS_Proxy
    VPS_Proxy -->|"5. Teruskan ke iPaymu\n(Terdeteksi dari IP Statis VPS)"| iPaymu

    %% Hubungan Webhook
    iPaymu -->|"6. Notifikasi Pembayaran Sukses (Webhook)"| CF_Edge

    %% Hubungan Alur Google Drive
    AppBackend -->|"7. Upload Master Foto Wisuda (Direct Stream)"| GDrive

    %% Styling
    classDef cf fill:#f6821f,stroke:#fff,stroke-width:2px,color:#fff;
    classDef vps fill:#2b5797,stroke:#fff,stroke-width:2px,color:#fff;
    classDef local fill:#107c41,stroke:#fff,stroke-width:2px,color:#fff;
    classDef ext fill:#5c2d91,stroke:#fff,stroke-width:2px,color:#fff;

    class CF_Edge,CF_Tunnel cf;
    class VPS_Proxy vps;
    class AppBackend,AppDB local;
    class User,iPaymu,GDrive ext;
```

---

## 4. Rincian Pengisian Data di Dashboard iPaymu

Saat melakukan verifikasi atau pengaturan di Dashboard iPaymu:

| Formulir / Menu iPaymu | Nilai yang Diisikan | Keterangan |
| :--- | :--- | :--- |
| **URL Website / Toko Online** | `https://wisuda.domainanda.com` | Mengarah ke Subdomain Cloudflare Tunnel Anda. |
| **IP Website (IP Outbound Back-End)** | `IP_PUBLIK_STATIS_VPS` (misal: `103.187.xxx.xxx`) | Diisi IP statis milik VPS Anda (atau IP `curl ifconfig.me` untuk verifikasi awal). |
| **URL Notifikasi / Webhook** | `https://wisuda.domainanda.com/api/payment/ipaymu/notify` | Endpoint backend lokal untuk menerima status bayar lunas. |
| **URL Pengembalian / Return URL** | `https://wisuda.domainanda.com/payment/success` | Halaman redirect saat klien selesai membayar di iPaymu. |

---

## 5. Panduan Implementasi Teknis

### Langkah 1: Setup Proxy Ringan di VPS (Hanya butuh 3 menit)
Gunakan VPS Linux termurah (1 vCPU, 512MB RAM). Install `tinyproxy`:

```bash
# 1. Update dan install tinyproxy
sudo apt update && sudo apt install -y tinyproxy

# 2. Edit konfigurasi
sudo nano /etc/tinyproxy/tinyproxy.conf

# Sesuaikan pengaturan berikut:
# Port 8888
# BasicAuth user_ipaymu PasswordRahasia123!
# Allow 0.0.0.0/0

# 3. Restart tinyproxy
sudo systemctl restart tinyproxy
sudo systemctl enable tinyproxy
```

---

### Langkah 2: Integrasi di Backend Node.js (Express)

Gunakan library resmi Node.js `https-proxy-agent` dan `axios`:

```bash
npm install axios https-proxy-agent
```

Contoh snippet service pembayaran (`src/services/ipaymuService.js`):

```javascript
import axios from 'axios';
import crypto from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';

// Konfigurasi Proxy Egress VPS
const proxyUrl = process.env.PAYMENT_PROXY_URL; // misal: "http://user_ipaymu:PasswordRahasia123!@103.187.xxx.xxx:8888"
const httpsAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

export async function createIpaymuTransaction(orderData) {
  const body = {
    name: orderData.customerName,
    phone: orderData.customerPhone,
    email: orderData.customerEmail,
    amount: orderData.totalAmount,
    notifyUrl: 'https://wisuda.domainanda.com/api/payment/ipaymu/notify',
    returnUrl: 'https://wisuda.domainanda.com/payment/success',
    cancelUrl: 'https://wisuda.domainanda.com/payment/cancel',
    referenceId: orderData.invoiceNumber,
  };

  const bodyString = JSON.stringify(body);
  const bodyHash = crypto.createHash('sha256').update(bodyString).digest('hex').toLowerCase();
  
  // Format signature resmi iPaymu
  const stringToSign = `POST:${process.env.IPAYMU_VA}:${bodyHash}:${process.env.IPAYMU_API_KEY}`;
  const signature = crypto.createHmac('sha256', process.env.IPAYMU_API_KEY).update(stringToSign).digest('hex');

  // Request ke API iPaymu (Keluar via IP VPS Proxy)
  const response = await axios.post(
    'https://my.ipaymu.com/api/v2/payment',
    body,
    {
      headers: {
        'Content-Type': 'application/json',
        va: process.env.IPAYMU_VA,
        signature: signature,
        timestamp: new Date().toISOString(),
      },
      httpsAgent: httpsAgent, // Mengarahkan request keluar lewat VPS
    }
  );

  return response.data;
}
```

---

## 6. Keuntungan Utama Pendekatan Ini

1. **Biaya Super Hemat:**
   - Server utama, database, dan pemrosesan foto tetap di komputer lokal studio (gratis resource besar).
   - VPS hanya butuh spek terendah (Rp 25.000 – Rp 35.000 / bulan).
2. **Keamanan Maksimal:**
   - Server lokal tidak perlu membuka port router (*Zero Open Port* berkat Cloudflare Tunnel).
   - Jalur proxy VPS dilindungi kredensial `BasicAuth`.
3. **Bebas Masalah Dynamic IP:**
   - iPaymu selalu mendeteksi IP Statis VPS yang stabil, sehingga transaksi tidak akan pernah terputus meskipun modem internet studio mati-hidup.
4. **Bandwidth Efisien:**
   - File foto besar ke Google Drive tetap keluar langsung lewat jaringan lokal tanpa membebani bandwidth VPS.
