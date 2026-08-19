#!/bin/bash

# ==============================================================================
# Wisuda Platform — Automated Dual-Mode Bulletproof Setup & Deploy Script
# Compatible with: Ubuntu 20.04/22.04/24.04 LTS, Debian 11/12, macOS
# ==============================================================================

# Set text styles
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo -e "${BLUE}${BOLD}==============================================================${NC}"
echo -e "${BLUE}${BOLD}   Wisuda Platform — Automated Bulletproof Setup & Deploy   ${NC}"
echo -e "${BLUE}${BOLD}==============================================================${NC}\n"

# ------------------------------------------------------------------------------
# 0. Git Safe Directory Configuration (Prevent Dubious Ownership Errors)
# ------------------------------------------------------------------------------
if command -v git &> /dev/null; then
    git config --global --add safe.directory "$PWD" 2>/dev/null || true
fi

# ------------------------------------------------------------------------------
# 1. Pre-flight Environment Preparation & OS Dependency Auto-Installer
# ------------------------------------------------------------------------------
echo -e "${BLUE}▶ 1. Memeriksa & Mempersiapkan Lingkungan Server (Pre-flight Checks)...${NC}"

# Detect if running as root or has sudo
IS_ROOT=false
if [ "$EUID" -eq 0 ]; then
    IS_ROOT=true
fi

# Helper function to run root/sudo commands safely
run_sudo() {
    if [ "$IS_ROOT" = true ]; then
        "$@"
    elif command -v sudo &> /dev/null; then
        sudo "$@"
    else
        echo -e "${YELLOW}Peringatan: Perintah membutuhkan akses root/sudo: $*${NC}"
        return 1
    fi
}

# Auto-install basic system tools on Debian/Ubuntu if missing
if command -v apt-get &> /dev/null && [ "$IS_ROOT" = true -o -x "$(command -v sudo)" ]; then
    PACKAGES_TO_INSTALL=""
    if ! command -v git &> /dev/null; then
        PACKAGES_TO_INSTALL="${PACKAGES_TO_INSTALL} git"
    fi
    if ! command -v curl &> /dev/null; then
        PACKAGES_TO_INSTALL="${PACKAGES_TO_INSTALL} curl"
    fi
    if ! command -v make &> /dev/null || ! command -v gcc &> /dev/null; then
        PACKAGES_TO_INSTALL="${PACKAGES_TO_INSTALL} build-essential"
    fi
    if ! command -v python3 &> /dev/null; then
        PACKAGES_TO_INSTALL="${PACKAGES_TO_INSTALL} python3"
    fi

    if [ -n "$PACKAGES_TO_INSTALL" ]; then
        echo -e "${YELLOW}Menginstal paket sistem yang dibutuhkan:${PACKAGES_TO_INSTALL}...${NC}"
        run_sudo apt-get update -y && run_sudo apt-get install -y $PACKAGES_TO_INSTALL
    fi
fi

# ------------------------------------------------------------------------------
# 2. Node.js & NPM Version Detection & Auto-Upgrade to Node.js 20.x LTS
# ------------------------------------------------------------------------------
echo -e "${BLUE}▶ 2. Memeriksa Node.js & NPM Runtime...${NC}"

MIN_NODE_VERSION=20
CURRENT_NODE_VERSION=0

if command -v node &> /dev/null; then
    CURRENT_NODE_VERSION=$(node -v 2>/dev/null | sed 's/v//' | cut -d'.' -f1)
fi

if [ -z "$CURRENT_NODE_VERSION" ] || [ "$CURRENT_NODE_VERSION" -lt "$MIN_NODE_VERSION" ]; then
    echo -e "${YELLOW}Node.js saat ini: $(node -v 2>/dev/null || echo 'Belum terinstal') (Dibutuhkan Node.js >= ${MIN_NODE_VERSION}.x LTS).${NC}"
    
    if command -v apt-get &> /dev/null && [ "$IS_ROOT" = true -o -x "$(command -v sudo)" ]; then
        echo -e "${BLUE}Mengunduh & Memasang Node.js 20.x LTS dari official NodeSource...${NC}"
        run_sudo curl -fsSL https://deb.nodesource.com/setup_20.x | run_sudo bash -
        run_sudo apt-get install -y nodejs
        echo -e "${GREEN}✓ Node.js $(node -v) & npm $(npm -v) berhasil dipasang!${NC}"
    else
        echo -e "${RED}Error: Node.js >= ${MIN_NODE_VERSION}.x LTS dibutuhkan untuk menjalankan Vite 6 & Express 5.${NC}"
        echo -e "Silakan pasang Node.js 20 LTS manual menggunakan nvm atau official installer."
        exit 1
    fi
else
    echo -e "${GREEN}✓ Node.js aktif: $(node -v) (npm $(npm -v)) — Kompatibel & Siap!${NC}"
fi

# ------------------------------------------------------------------------------
# 3. Swap Memory Protection (Anti-OOM Killer for 1GB - 2GB RAM VPS)
# ------------------------------------------------------------------------------
if [ -f /proc/meminfo ] && [ "$IS_ROOT" = true -o -x "$(command -v sudo)" ]; then
    TOTAL_MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    TOTAL_SWAP_KB=$(grep SwapTotal /proc/meminfo | awk '{print $2}')
    
    # If RAM < 2.5GB and Swap < 500MB, auto-create 2GB swapfile
    if [ "$TOTAL_MEM_KB" -lt 2500000 ] && [ "$TOTAL_SWAP_KB" -lt 500000 ]; then
        echo -e "${YELLOW}RAM server terbatas (${TOTAL_MEM_KB} kB) tanpa Swap memory.${NC}"
        echo -e "${BLUE}Membuat 2GB Swapfile otomatis untuk mencegah OOM saat kompilasi Admin SPA...${NC}"
        
        if [ ! -f /swapfile ]; then
            run_sudo fallocate -l 2G /swapfile 2>/dev/null || run_sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
            run_sudo chmod 600 /swapfile
            run_sudo mkswap /swapfile
            run_sudo swapon /swapfile
            
            # Persist in fstab if not already present
            if ! grep -q "/swapfile" /etc/fstab 2>/dev/null; then
                echo "/swapfile none swap sw 0 0" | run_sudo tee -a /etc/fstab >/dev/null
            fi
            echo -e "${GREEN}✓ 2GB Swapfile berhasil diaktifkan.${NC}"
        fi
    fi
fi

# ------------------------------------------------------------------------------
# 4. Check and Copy / Update .env File
# ------------------------------------------------------------------------------
echo -e "${BLUE}▶ 3. Memeriksa Konfigurasi Environment (.env)...${NC}"
if [ ! -f .env ]; then
    echo -e "${YELLOW}File .env tidak ditemukan. Menyalin otomatis dari .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ File .env berhasil dibuat.${NC}"
fi

# Auto-generate unique SESSION_SECRET, JWT_SECRET & WEBHOOK_SECRET if empty or placeholder
S_VAL=$(grep -E "^SESSION_SECRET=" .env | cut -d'=' -f2- | tr -d '\r' | xargs)
J_VAL=$(grep -E "^JWT_SECRET=" .env | cut -d'=' -f2- | tr -d '\r' | xargs)
W_VAL=$(grep -E "^WEBHOOK_SECRET=" .env | cut -d'=' -f2- | tr -d '\r' | xargs)
C_VAL=$(grep -E "^CORS_ORIGINS=" .env | cut -d'=' -f2- | tr -d '\r' | xargs)
GENERATE_SECRETS=false

if [ -z "$S_VAL" ] || [ "$S_VAL" = "your-secure-random-session-secret-key-here" ]; then
    GENERATE_SECRETS=true
fi
if [ -z "$J_VAL" ] || [ "$J_VAL" = "your-secure-jwt-secret-key-here" ]; then
    GENERATE_SECRETS=true
fi
if [ -z "$W_VAL" ] || [ "$W_VAL" = "wisuda_cron_secret_key_2026" ] || [ "$W_VAL" = "your-secure-webhook-secret-here" ]; then
    GENERATE_SECRETS=true
fi

if [ "$GENERATE_SECRETS" = true ]; then
    echo -e "${YELLOW}Meng-generate SESSION_SECRET, JWT_SECRET & WEBHOOK_SECRET acak yang aman...${NC}"
    
    if command -v openssl &> /dev/null; then
        NEW_SESSION_SECRET=$(openssl rand -hex 32)
        NEW_JWT_SECRET=$(openssl rand -hex 32)
        NEW_WEBHOOK_SECRET=$(openssl rand -hex 32)
    elif command -v node &> /dev/null; then
        NEW_SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        NEW_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        NEW_WEBHOOK_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    else
        NEW_SESSION_SECRET=$(date +%s | shasum -a 256 | head -c 64)
        NEW_JWT_SECRET=$(date +%s | shasum -a 256 | head -c 64)
        NEW_WEBHOOK_SECRET=$(date +%s | shasum -a 256 | head -c 64)
    fi

    # Update SESSION_SECRET
    if [ -z "$S_VAL" ] || [ "$S_VAL" = "your-secure-random-session-secret-key-here" ]; then
        if grep -q "^SESSION_SECRET=" .env; then
            sed -i.bak "s|^SESSION_SECRET=.*|SESSION_SECRET=${NEW_SESSION_SECRET}|" .env && rm -f .env.bak
        else
            echo "SESSION_SECRET=${NEW_SESSION_SECRET}" >> .env
        fi
    fi

    # Update JWT_SECRET
    if [ -z "$J_VAL" ] || [ "$J_VAL" = "your-secure-jwt-secret-key-here" ]; then
        if grep -q "^JWT_SECRET=" .env; then
            sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=${NEW_JWT_SECRET}|" .env && rm -f .env.bak
        else
            echo "JWT_SECRET=${NEW_JWT_SECRET}" >> .env
        fi
    fi

    # Update WEBHOOK_SECRET
    if [ -z "$W_VAL" ] || [ "$W_VAL" = "wisuda_cron_secret_key_2026" ] || [ "$W_VAL" = "your-secure-webhook-secret-here" ]; then
        if grep -q "^WEBHOOK_SECRET=" .env; then
            sed -i.bak "s|^WEBHOOK_SECRET=.*|WEBHOOK_SECRET=${NEW_WEBHOOK_SECRET}|" .env && rm -f .env.bak
        else
            echo "WEBHOOK_SECRET=${NEW_WEBHOOK_SECRET}" >> .env
        fi
    fi

    echo -e "${GREEN}✓ Kunci keamanan berhasil di-generate secara otomatis!${NC}"
fi

# Ensure CORS_ORIGINS default exists
if [ -z "$C_VAL" ]; then
    echo "CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8081" >> .env
fi

# Check & Auto-detect Timezone (TZ)
TZ_ENV=$(grep -E "^TZ=" .env | cut -d'=' -f2- | tr -d '\r' | xargs)
if [ -z "$TZ_ENV" ]; then
    HOST_TZ=""
    if [ -f /etc/timezone ]; then
        HOST_TZ=$(cat /etc/timezone | tr -d '\r' | xargs)
    elif [ -l /etc/localtime ]; then
        HOST_TZ=$(readlink /etc/localtime | sed 's|.*/zoneinfo/||')
    fi
    
    if [ -z "$HOST_TZ" ]; then
        HOST_TZ="Asia/Makassar"
    fi

    echo -e "${YELLOW}Variabel TZ belum diatur di .env. Mendeteksi zona waktu sistem (${HOST_TZ})...${NC}"
    echo "TZ=${HOST_TZ}" >> .env
    export TZ="${HOST_TZ}"
else
    export TZ="${TZ_ENV}"
fi
echo -e "${GREEN}✓ Zona Waktu (TZ) diaktifkan: ${TZ}${NC}"

# ------------------------------------------------------------------------------
# 5. Pull Latest Changes from GitHub (if Git repository)
# ------------------------------------------------------------------------------
echo -e "${BLUE}▶ 4. Memeriksa Sinkronisasi Repositori Git...${NC}"
if [ -d .git ]; then
    STASHED=false

    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo -e "${YELLOW}Mengamankan perubahan lokal sementara (git stash)...${NC}"
        git stash
        STASHED=true
    fi

    echo -e "${BLUE}Menarik kode terbaru dari GitHub (git pull origin main)...${NC}"
    if ! git pull origin main; then
        echo -e "${RED}Error: git pull gagal! Pastikan remote origin main valid.${NC}"
        if [ "$STASHED" = true ]; then
            git stash pop
        fi
        exit 1
    fi

    if [ "$STASHED" = true ]; then
        echo -e "${YELLOW}Mengembalikan kembali perubahan lokal...${NC}"
        if ! git stash pop; then
            echo -e "${RED}Peringatan: git stash pop mengalami konflik. Selesaikan konflik lalu jalankan ulang deploy.sh.${NC}"
            exit 1
        fi
    fi

    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
    CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "HEAD")
    echo -e "${GREEN}✓ Repositori sinkron (branch: ${CURRENT_BRANCH}, commit: ${CURRENT_COMMIT}).${NC}"
else
    echo -e "${YELLOW}Info: Bukan repositori git — langkah git pull dilewati.${NC}"
fi

# ------------------------------------------------------------------------------
# 6. Ensure Runtime Directories & Permissions
# ------------------------------------------------------------------------------
echo -e "${BLUE}▶ 5. Mempersiapkan Direktori Runtime & Izin File...${NC}"
mkdir -p DATA DATA/uploads DATA/backups DATA/tmp logs public/admin
chmod -R 755 DATA logs 2>/dev/null || true
echo -e "${GREEN}✓ Direktori runtime (DATA, logs, uploads) siap.${NC}"

# ------------------------------------------------------------------------------
# 7. Install Dependencies & Rebuild Native Modules
# ------------------------------------------------------------------------------
echo -e "${BLUE}▶ 6. Menginstal Dependensi Backend & Rebuild Native Addons...${NC}"
if ! npm install --omit=dev; then
    echo -e "${RED}Error: Gagal menginstal dependensi backend!${NC}"
    exit 1
fi

# Rebuild native modules for the current active Node.js version
echo -e "${BLUE}Memverifikasi binary native modules (better-sqlite3, sharp, bcrypt)...${NC}"
npm rebuild better-sqlite3 sharp bcrypt 2>/dev/null || true
echo -e "${GREEN}✓ Dependensi backend & native bindings siap.${NC}"

# ------------------------------------------------------------------------------
# 8. Build Admin SPA (Vue 3 + Vite)
# ------------------------------------------------------------------------------
if [ -d "admin-app" ]; then
    echo -e "${BLUE}▶ 7. Meng-compile Admin SPA Dashboard (admin-app)...${NC}"
    export NODE_OPTIONS="--max-old-space-size=1536"
    if (cd admin-app && npm install && npm run build); then
        echo -e "${GREEN}✓ Admin SPA berhasil dikompilasi ke public/admin.${NC}"
    else
        echo -e "${RED}Error: Build Admin SPA gagal! Deployment dibatalkan.${NC}"
        exit 1
    fi
fi

# ------------------------------------------------------------------------------
# 9. Database Seeding / Migration Check
# ------------------------------------------------------------------------------
echo -e "${BLUE}▶ 8. Memeriksa Database & Menjalankan Migrasi...${NC}"
DB_PATH=$(grep -E "^DB_PATH=" .env | cut -d'=' -f2- | tr -d '\r' | xargs)
if [ -z "$DB_PATH" ]; then
    DB_PATH="./DATA/wisuda.db"
fi

NEED_SEED=false

if [ ! -f "$DB_PATH" ]; then
    NEED_SEED=true
else
    # Cek apakah file kosong atau belum memiliki tabel users
    FILE_SIZE=$(wc -c < "$DB_PATH" 2>/dev/null | tr -d ' ' || echo 0)
    if [ -z "$FILE_SIZE" ] || [ "$FILE_SIZE" -le 4096 ]; then
        HAS_USERS=$(node -e "
            try {
                const db = require('better-sqlite3')('$DB_PATH');
                const row = db.prepare(\"SELECT count(*) as c FROM sqlite_master WHERE type='table' AND name='users'\").get();
                db.close();
                process.stdout.write(row && row.c > 0 ? 'yes' : 'no');
            } catch(e) {
                process.stdout.write('no');
            }
        " 2>/dev/null || echo "no")

        if [ "$HAS_USERS" != "yes" ]; then
            NEED_SEED=true
        fi
    fi
fi

if [ "$NEED_SEED" = true ]; then
    echo -e "${YELLOW}Database baru atau belum terinisialisasi. Menjalankan data awal (npm run seed)...${NC}"
    if ! npm run seed; then
        echo -e "${RED}Error: Seeding database gagal! Deployment dibatalkan.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Database berhasil di-seed & siap digunakan.${NC}"
else
    echo -e "${GREEN}✓ Database valid terdeteksi. Menjalankan auto-migration...${NC}"
    npm run migrate 2>/dev/null || true
fi

# ------------------------------------------------------------------------------
# 10. PM2 Process Management (Auto-Install & Zero-Downtime Reload)
# ------------------------------------------------------------------------------
echo -e "${BLUE}▶ 9. Menjalankan Service di PM2 Process Manager...${NC}"

if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 belum terpasang. Menginstal PM2 secara global (npm install -g pm2)...${NC}"
    if run_sudo npm install -g pm2; then
        echo -e "${GREEN}✓ PM2 berhasil dipasang secara global.${NC}"
    else
        npm install -g pm2 2>/dev/null || true
    fi
fi

if command -v pm2 &> /dev/null; then
    if pm2 list 2>/dev/null | grep -q 'wisuda-api'; then
        # Zero-downtime reload respecting updated ecosystem.config.js
        pm2 reload ecosystem.config.js --env production
        echo -e "${GREEN}✓ Service wisuda-api & wisuda-cron berhasil di-reload (zero-downtime) di PM2.${NC}"
    else
        echo -e "${YELLOW}Mendaftarkan service baru ke PM2...${NC}"
        pm2 start ecosystem.config.js --env production
        pm2 save
        echo -e "${GREEN}✓ Platform berhasil terdaftar dan aktif di PM2.${NC}"
    fi

    # Attempt to configure startup hook if root/sudo available
    if [ "$IS_ROOT" = true ]; then
        pm2 startup systemd -u "$(whoami)" --hp "$HOME" 2>/dev/null || true
    fi
else
    echo -e "${RED}Peringatan: PM2 tidak dapat dijalankan secara otomatis.${NC}"
    echo -e "Silakan jalankan secara manual menggunakan perintah: ${GREEN}npm start${NC}"
fi

# ------------------------------------------------------------------------------
# 11. Health Check Verification
# ------------------------------------------------------------------------------
echo -e "${BLUE}▶ 10. Memverifikasi Kesehatan API Engine...${NC}"
if command -v curl &> /dev/null; then
    echo -e "${YELLOW}Menunggu server warm-up (3 detik)...${NC}"
    sleep 3

    MAX_RETRIES=5
    RETRY_COUNT=0
    HEALTH_SUCCESS=false
    HEALTH_RESP=""

    while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
        HEALTH_RESP=$(curl -s --max-time 5 http://localhost:8081/api/health)
        if echo "$HEALTH_RESP" | grep -q '"status"'; then
            if echo "$HEALTH_RESP" | grep -q '"ok"'; then
                HEALTH_SUCCESS=true
                break
            fi
        fi
        RETRY_COUNT=$((RETRY_COUNT + 1))
        echo -e "${YELLOW}Menunggu server siap (percobaan ${RETRY_COUNT}/${MAX_RETRIES})...${NC}"
        sleep 3
    done

    if [ "$HEALTH_SUCCESS" = true ]; then
        echo -e "${GREEN}✓ Health check sukses: ${HEALTH_RESP}${NC}"
    else
        echo -e "${YELLOW}⚠️  Catatan: Health check belum mengembalikan status OK setelah ${MAX_RETRIES} percobaan.${NC}"
        echo -e "${YELLOW}   Response terakhir: ${HEALTH_RESP}${NC}"
        echo -e "${YELLOW}   Cek log server: pm2 logs wisuda-api --lines 30${NC}"
    fi
fi

echo -e "\n${GREEN}${BOLD}==============================================================${NC}"
echo -e "${GREEN}${BOLD}   ✓ Selesai! Wisuda Platform Aktif & Siap Digunakan!         ${NC}"
echo -e "${GREEN}${BOLD}==============================================================${NC}\n"
echo -e "${BLUE}💡 Akses Admin Dashboard: ${BOLD}http://localhost:8081/admin${NC}"
echo -e "${BLUE}💡 Log PM2: ${BOLD}pm2 logs wisuda-api${NC}\n"
