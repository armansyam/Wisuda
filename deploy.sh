#!/bin/bash

# Set text styles
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Wisuda Platform Automated Dual-Mode Setup & Deploy ===${NC}\n"

# 1. Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: Git tidak terinstal di server ini.${NC}"
    exit 1
fi

# 2. Check and copy .env if missing
if [ ! -f .env ]; then
    echo -e "${YELLOW}File .env tidak ditemukan. Menyalin otomatis dari .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ File .env berhasil dibuat.${NC}"
fi

# 3. Auto-generate unique SESSION_SECRET, JWT_SECRET & WEBHOOK_SECRET if empty or placeholder
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
    echo -e "${YELLOW}Meng-generate SESSION_SECRET, JWT_SECRET & WEBHOOK_SECRET acak yang aman untuk server ini...${NC}"
    
    # Generate 64-character hex secrets
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

    # Update SESSION_SECRET in .env
    if [ -z "$S_VAL" ] || [ "$S_VAL" = "your-secure-random-session-secret-key-here" ]; then
        if grep -q "^SESSION_SECRET=" .env; then
            sed -i.bak "s|^SESSION_SECRET=.*|SESSION_SECRET=${NEW_SESSION_SECRET}|" .env && rm -f .env.bak
        else
            echo "SESSION_SECRET=${NEW_SESSION_SECRET}" >> .env
        fi
    fi

    # Update JWT_SECRET in .env
    if [ -z "$J_VAL" ] || [ "$J_VAL" = "your-secure-jwt-secret-key-here" ]; then
        if grep -q "^JWT_SECRET=" .env; then
            sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=${NEW_JWT_SECRET}|" .env && rm -f .env.bak
        else
            echo "JWT_SECRET=${NEW_JWT_SECRET}" >> .env
        fi
    fi

    # Update WEBHOOK_SECRET in .env
    if [ -z "$W_VAL" ] || [ "$W_VAL" = "wisuda_cron_secret_key_2026" ] || [ "$W_VAL" = "your-secure-webhook-secret-here" ]; then
        if grep -q "^WEBHOOK_SECRET=" .env; then
            sed -i.bak "s|^WEBHOOK_SECRET=.*|WEBHOOK_SECRET=${NEW_WEBHOOK_SECRET}|" .env && rm -f .env.bak
        else
            echo "WEBHOOK_SECRET=${NEW_WEBHOOK_SECRET}" >> .env
        fi
    fi

    echo -e "${GREEN}✓ Kunci keamanan (SESSION_SECRET, JWT_SECRET, WEBHOOK_SECRET) berhasil di-generate secara otomatis!${NC}"
fi

# Ensure CORS_ORIGINS default exists
if [ -z "$C_VAL" ]; then
    echo "CORS_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8081" >> .env
fi

# 4. Check & Auto-detect Timezone (TZ)
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

# 5. Pull latest changes from GitHub (only if it is already a repository)
if [ -d .git ]; then
    STASHED=false

    # Amankan perubahan lokal jika ada (agar git pull tidak konflik)
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
        echo -e "${YELLOW}Mengamankan perubahan lokal sementara (git stash)...${NC}"
        git stash
        STASHED=true
    fi

    echo -e "${BLUE}Menarik kode terbaru dari GitHub (git pull)...${NC}"
    if ! git pull origin main; then
        echo -e "${RED}Error: git pull gagal! Pastikan koneksi internet aktif dan remote 'origin main' sudah benar.${NC}"
        # Kembalikan stash jika gagal sebelum exit
        if [ "$STASHED" = true ]; then
            git stash pop
        fi
        exit 1
    fi

    # Kembalikan perubahan lokal — tangani konflik merge
    if [ "$STASHED" = true ]; then
        echo -e "${YELLOW}Mengembalikan kembali perubahan lokal...${NC}"
        if ! git stash pop; then
            echo -e "${RED}Peringatan: git stash pop mengalami konflik. Selesaikan konflik secara manual lalu jalankan ulang deploy.sh.${NC}"
            exit 1
        fi
    fi

    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    CURRENT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✓ Kode terbaru berhasil ditarik (branch: ${CURRENT_BRANCH}, commit: ${CURRENT_COMMIT}).${NC}"
else
    echo -e "${YELLOW}Info: Bukan repositori git — langkah git pull dilewati.${NC}"
fi

# 6. Ensure required data directories exist
mkdir -p DATA DATA/uploads DATA/backups DATA/tmp logs
echo -e "${GREEN}✓ Direktori runtime (DATA, logs) siap.${NC}"

# 7. Install production dependencies
echo -e "${BLUE}Menginstal dependensi Node.js backend...${NC}"
if ! npm install --omit=dev; then
    echo -e "${RED}Error: Gagal menginstal dependensi Node.js backend!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Dependensi backend berhasil diinstal.${NC}"

# 8. Build Admin SPA if admin-app directory exists
if [ -d "admin-app" ]; then
    echo -e "${BLUE}Meng-compile Admin SPA Dashboard (admin-app)...${NC}"
    if (cd admin-app && NODE_ENV=development npm install --include=dev && npm run build); then
        echo -e "${GREEN}✓ Admin SPA berhasil di-build ke public/admin.${NC}"
    else
        echo -e "${RED}Error: Build Admin SPA (admin-app) gagal! Deployment dibatalkan.${NC}"
        exit 1
    fi
fi

# 9. Check if database is fresh (needs seeding)
DB_PATH=$(grep -E "^DB_PATH=" .env | cut -d'=' -f2- | tr -d '\r' | xargs)
if [ -z "$DB_PATH" ]; then
    DB_PATH="./DATA/wisuda.db"
fi

if [ ! -f "$DB_PATH" ]; then
    echo -e "${YELLOW}Database baru terdeteksi. Menjalankan data awal (npm run seed)...${NC}"
    if ! npm run seed; then
        echo -e "${RED}Error: Seeding database gagal! Deployment dibatalkan.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Database berhasil di-seed.${NC}"
else
    echo -e "${GREEN}Database terdeteksi. Migrasi otomatis akan berjalan saat server start.${NC}"
fi

# 10. Start or restart service in PM2
echo -e "${BLUE}Menjalankan/Mereset service platform di PM2...${NC}"
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q 'wisuda-api'; then
        # reload = zero-downtime restart (menghormati ecosystem.config.js terbaru)
        pm2 reload ecosystem.config.js --env production
        echo -e "${GREEN}✓ Service wisuda-api & wisuda-cron berhasil di-reload (zero-downtime) di PM2.${NC}"
    else
        echo -e "${YELLOW}Mendaftarkan service baru ke PM2...${NC}"
        pm2 start ecosystem.config.js --env production
        pm2 save
        echo -e "${GREEN}✓ Platform berhasil terdaftar dan aktif di PM2.${NC}"
    fi
else
    echo -e "${RED}Peringatan: PM2 tidak terinstal secara global.${NC}"
    echo -e "Silakan jalankan secara manual menggunakan perintah: ${GREEN}npm start${NC}"
fi

# 11. Health check verification (dengan auto-retry untuk mengakomodasi warm-up server)
echo -e "${BLUE}Memverifikasi kesehatan API Engine...${NC}"
if command -v curl &> /dev/null; then
    # Beri waktu server warm-up sebelum retry pertama
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
        echo -e "${YELLOW}⚠️  Catatan: Health check tidak mengembalikan status OK setelah ${MAX_RETRIES} percobaan.${NC}"
        echo -e "${YELLOW}   Response terakhir: ${HEALTH_RESP}${NC}"
        echo -e "${YELLOW}   Cek log server: pm2 logs wisuda-api --lines 30${NC}"
    fi
fi

echo -e "\n${GREEN}=== Selesai! Wisuda Platform Aktif & Siap Digunakan! ===${NC}"
echo -e "${BLUE}💡 Catatan: Konfigurasi Google Drive (Service Account & Master Folder) diatur melalui Admin Panel > Settings > Google Drive.${NC}\n"
