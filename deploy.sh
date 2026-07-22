#!/bin/bash

# Set text styles
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Wisuda Platform Automated Setup & Deploy ===${NC}\n"

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

# 3. Auto-generate unique SESSION_SECRET & JWT_SECRET if empty or placeholder
S_VAL=$(grep -E "^SESSION_SECRET=" .env | cut -d'=' -f2- | tr -d '\r' | xargs)
J_VAL=$(grep -E "^JWT_SECRET=" .env | cut -d'=' -f2- | tr -d '\r' | xargs)
GENERATE_SECRETS=false

if [ -z "$S_VAL" ] || [ "$S_VAL" = "your-secure-random-session-secret-key-here" ]; then
    GENERATE_SECRETS=true
fi
if [ -z "$J_VAL" ] || [ "$J_VAL" = "your-secure-jwt-secret-key-here" ]; then
    GENERATE_SECRETS=true
fi

if [ "$GENERATE_SECRETS" = true ]; then
    echo -e "${YELLOW}Meng-generate SESSION_SECRET & JWT_SECRET acak yang aman untuk server ini...${NC}"
    
    # Generate 64-character hex secrets
    if command -v openssl &> /dev/null; then
        NEW_SESSION_SECRET=$(openssl rand -hex 32)
        NEW_JWT_SECRET=$(openssl rand -hex 32)
    elif command -v node &> /dev/null; then
        NEW_SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
        NEW_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    else
        NEW_SESSION_SECRET=$(date +%s | shasum -a 256 | head -c 64)
        NEW_JWT_SECRET=$(date +%s | shasum -a 256 | head -c 64)
    fi

    # Update SESSION_SECRET in .env
    if grep -q "^SESSION_SECRET=" .env; then
        sed -i.bak "s|^SESSION_SECRET=.*|SESSION_SECRET=${NEW_SESSION_SECRET}|" .env && rm -f .env.bak
    else
        echo "SESSION_SECRET=${NEW_SESSION_SECRET}" >> .env
    fi

    # Update JWT_SECRET in .env
    if grep -q "^JWT_SECRET=" .env; then
        sed -i.bak "s|^JWT_SECRET=.*|JWT_SECRET=${NEW_JWT_SECRET}|" .env && rm -f .env.bak
    else
        echo "JWT_SECRET=${NEW_JWT_SECRET}" >> .env
    fi

    echo -e "${GREEN}✓ Kunci keamanan SESSION_SECRET & JWT_SECRET berhasil di-generate secara otomatis!${NC}"
fi

# 4. Check & Auto-detect Timezone (TZ)
TZ_ENV=$(grep -E "^TZ=" .env | cut -d'=' -f2- | tr -d '\r' | xargs)
if [ -z "$TZ_ENV" ]; then
    # Detect system timezone or default to Asia/Makassar
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
    if ! git diff-index --quiet HEAD --; then
        echo -e "${YELLOW}Mengamankan perubahan lokal sementara (git stash)...${NC}"
        git stash
        STASHED=true
    fi

    echo -e "${BLUE}Menarik kode terbaru dari GitHub (git pull)...${NC}"
    git pull origin main

    if [ "$STASHED" = true ]; then
        echo -e "${YELLOW}Mengembalikan kembali perubahan lokal...${NC}"
        git stash pop
    fi
fi

# 6. Install production dependencies
echo -e "${BLUE}Menginstal dependensi Node.js (npm install)...${NC}"
npm install --omit=dev

# 7. Check if database is fresh (needs seeding)
# We read the DB_PATH from .env. If not set, default to ./DATA/wisuda.db
DB_PATH=$(grep -E "^DB_PATH=" .env | cut -d'=' -f2-)
if [ -z "$DB_PATH" ]; then
    DB_PATH="./DATA/wisuda.db"
fi

# Clean up any trailing space or carriage return from DB_PATH
DB_PATH=$(echo "$DB_PATH" | tr -d '\r' | xargs)

# If database file does not exist, run seeder automatically!
if [ ! -f "$DB_PATH" ]; then
    echo -e "${YELLOW}Database baru terdeteksi. Menjalankan data awal (npm run seed)...${NC}"
    npm run seed
else
    echo -e "${GREEN}Database lama terdeteksi. Migrasi otomatis akan berjalan saat server start.${NC}"
fi

# 8. Start or restart service in PM2
echo -e "${BLUE}Menjalankan/Mereset service platform di PM2...${NC}"
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q 'wisuda-api'; then
        pm2 restart ecosystem.config.js --env production
        echo -e "${GREEN}✓ Service wisuda-api & wisuda-cron berhasil di-restart di PM2.${NC}"
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

echo -e "\n${GREEN}=== Selesai! Platform Aktif & Siap Digunakan! ===${NC}"
