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

# 3. Pull latest changes from GitHub (only if it is already a repository)
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

# 4. Install production dependencies
echo -e "${BLUE}Menginstal dependensi Node.js (npm install)...${NC}"
npm install --omit=dev

# 5. Check if database is fresh (needs seeding)
# We read the DB_PATH from .env. If not set, default to ./DATA/AppData/wisuda.db
DB_PATH=$(grep -E "^DB_PATH=" .env | cut -d'=' -f2-)
if [ -z "$DB_PATH" ]; then
    DB_PATH="./DATA/AppData/wisuda.db"
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

# 6. Start or restart service in PM2
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
