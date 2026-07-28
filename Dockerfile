FROM node:20-alpine AS builder

# Instal tzdata & sqlite
RUN apk add --no-cache tzdata sqlite

WORKDIR /app

# Menyalin berkas package dan menginstal dependensi produksi
COPY package*.json ./
RUN npm install --omit=dev

# Menyalin seluruh kode sumber proyek
COPY . .

# Memastikan entrypoint script memiliki izin eksekusi
RUN chmod +x docker-entrypoint.sh

# Ekspos port Express.js API & Web
EXPOSE 8081

# Healthcheck otomatis container
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8081/api/health || exit 1

# Daftarkan entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]

# Perintah default (Start dual-mode server)
CMD ["npm", "start"]
