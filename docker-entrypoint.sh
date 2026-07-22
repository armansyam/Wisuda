#!/bin/sh

# 1. Konfigurasi Zona Waktu (Timezone) Otomatis jika variabel TZ diset
if [ -n "$TZ" ] && [ -f "/usr/share/zoneinfo/$TZ" ]; then
  ln -snf "/usr/share/zoneinfo/$TZ" /etc/localtime && echo "$TZ" > /etc/timezone
fi

# 2. Jika file .env belum ada di dalam container, buat otomatis dari template
if [ ! -f .env ]; then
  echo "File .env tidak ditemukan. Menyalin otomatis dari .env.example..."
  cp .env.example .env
fi

# 3. Auto-generate SESSION_SECRET & JWT_SECRET jika masih placeholder/default
GENERATE_SECRETS=false

if grep -q "SESSION_SECRET=your-" .env || grep -q "SESSION_SECRET=e7b4a9c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9" .env || ! grep -q "^SESSION_SECRET=" .env; then
    GENERATE_SECRETS=true
fi
if grep -q "JWT_SECRET=your-" .env || grep -q "JWT_SECRET=f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8" .env || ! grep -q "^JWT_SECRET=" .env; then
    GENERATE_SECRETS=true
fi

if [ "$GENERATE_SECRETS" = true ]; then
  echo "Meng-generate SESSION_SECRET & JWT_SECRET acak yang aman untuk container ini..."
  
  NEW_SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  NEW_JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

  if grep -q "^SESSION_SECRET=" .env; then
    sed -i "s|^SESSION_SECRET=.*|SESSION_SECRET=${NEW_SESSION_SECRET}|" .env
  else
    echo "SESSION_SECRET=${NEW_SESSION_SECRET}" >> .env
  fi

  if grep -q "^JWT_SECRET=" .env; then
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${NEW_JWT_SECRET}|" .env
  else
    echo "JWT_SECRET=${NEW_JWT_SECRET}" >> .env
  fi

  echo "✓ Kunci keamanan SESSION_SECRET & JWT_SECRET berhasil di-generate secara otomatis."
fi

# 4. Baca DB_PATH dari .env, default ke ./DATA/wisuda.db jika tidak diatur
DB_PATH=$(grep -E "^DB_PATH=" .env | cut -d'=' -f2-)
if [ -z "$DB_PATH" ]; then
  DB_PATH="./DATA/wisuda.db"
fi

# Bersihkan spasi atau karakter carriage return
DB_PATH=$(echo "$DB_PATH" | tr -d '\r' | xargs)

# 5. Jika file database belum ada di host volume, jalankan data awal (seeding) otomatis
if [ ! -f "$DB_PATH" ]; then
  echo "Database belum ada di $DB_PATH. Menjalankan data awal (npm run seed)..."
  mkdir -p "$(dirname "$DB_PATH")"
  node scripts/seed.js
else
  echo "Database ditemukan di $DB_PATH. Mengaktifkan migrasi otomatis saat start..."
fi

# 6. Jalankan perintah CMD Docker utama (Express server atau Cron service)
exec "$@"
