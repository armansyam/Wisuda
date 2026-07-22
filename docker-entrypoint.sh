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

# 3. Auto-generate SESSION_SECRET & JWT_SECRET jika masih kosong atau placeholder
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
