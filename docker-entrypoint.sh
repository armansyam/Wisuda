#!/bin/sh

# 1. Jika file .env belum ada di dalam container, buat otomatis dari template
if [ ! -f .env ]; then
  echo "File .env tidak ditemukan. Menyalin otomatis dari .env.example..."
  cp .env.example .env
fi

# 2. Baca DB_PATH dari .env, default ke ./DATA/wisuda.db jika tidak diatur
DB_PATH=$(grep -E "^DB_PATH=" .env | cut -d'=' -f2-)
if [ -z "$DB_PATH" ]; then
  DB_PATH="./DATA/wisuda.db"
fi

# Bersihkan spasi atau karakter carriage return
DB_PATH=$(echo "$DB_PATH" | tr -d '\r' | xargs)

# 3. Jika file database belum ada di host volume, jalankan data awal (seeding) otomatis
if [ ! -f "$DB_PATH" ]; then
  echo "Database belum ada di $DB_PATH. Menjalankan data awal (npm run seed)..."
  mkdir -p "$(dirname "$DB_PATH")"
  node scripts/seed.js
else
  echo "Database ditemukan di $DB_PATH. Mengaktifkan migrasi otomatis saat start..."
fi

# 4. Jalankan perintah CMD Docker utama (Express server atau Cron service)
exec "$@"
