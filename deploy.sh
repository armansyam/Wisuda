#!/bin/bash

# Set text styles
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Wisuda Platform Automated Update & Deploy ===${NC}\n"

# 1. Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}Error: Git is tidak terinstal di server ini.${NC}"
    exit 1
fi

# 2. Check for local modifications
STASHED=false
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}Peringatan: Ada perubahan lokal yang belum di-commit.${NC}"
    echo -e "Mengamankan perubahan lokal sementara (git stash)..."
    git stash
    STASHED=true
fi

# 3. Pull latest changes
echo -e "${BLUE}Menarik kode terbaru dari GitHub (git pull)...${NC}"
git pull origin main

# Restore stashed changes if we stashed them
if [ "$STASHED" = true ]; then
    echo -e "${YELLOW}Mengembalikan kembali perubahan lokal yang diamankan...${NC}"
    git stash pop
fi

# 4. Check if package.json has changed
echo -e "${BLUE}Memeriksa pembaruan package.json...${NC}"
# Compare HEAD with HEAD@{1} to see if package.json was modified in the pull
if git diff --name-only HEAD@{1} HEAD | grep -q 'package.json'; then
    echo -e "${YELLOW}Ada pembaruan package.json. Menginstal dependensi baru (npm install)...${NC}"
    npm install --omit=dev
else
    echo -e "${GREEN}Dependensi aman. Melewati npm install.${NC}"
fi

# 5. Restart server processes via PM2
echo -e "${BLUE}Membangunkan ulang service platform di PM2...${NC}"
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q 'wisuda-api'; then
        pm2 restart ecosystem.config.js --env production
        echo -e "${GREEN}✓ Service wisuda-api & wisuda-cron berhasil di-restart di PM2.${NC}"
    else
        echo -e "${YELLOW}Platform belum terdaftar di PM2. Mendaftarkan service sekarang...${NC}"
        pm2 start ecosystem.config.js --env production
        pm2 save
        echo -e "${GREEN}✓ Platform berhasil terdaftar dan aktif di PM2.${NC}"
    fi
else
    echo -e "${RED}Peringatan: PM2 tidak terinstal secara global. Silakan jalankan manual: npm start${NC}"
fi

echo -e "\n${GREEN}=== Pembaruan Selesai & Berhasil Diterapkan! ===${NC}"
