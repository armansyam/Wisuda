FROM node:20-alpine

# Mengatur timezone default server ke Asia/Makassar
ENV TZ=Asia/Makassar
RUN apk add --no-cache tzdata sqlite && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app

# Menyalin berkas package dan menginstal dependensi produksi
COPY package*.json ./
RUN npm install --omit=dev

# Menyalin seluruh kode sumber proyek
COPY . .

# Memastikan entrypoint script bisa dijalankan
RUN chmod +x docker-entrypoint.sh

# Ekspos port Express.js
EXPOSE 8081

# Daftarkan entrypoint script
ENTRYPOINT ["./docker-entrypoint.sh"]

# Perintah default (untuk API)
CMD ["npm", "start"]
