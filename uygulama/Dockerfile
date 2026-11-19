# Node.js 26 Alpine tabanlı imaj
FROM node:26-alpine

# Üretim ortamı
ENV NODE_ENV=production

# Çalışma klasörü
WORKDIR /app

# Paket dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları yükle
RUN npm ci --omit=dev

# Uygulama kaynak kodlarını kopyala
COPY src ./src

# API portu
EXPOSE 8000

# Sunucuyu başlat
CMD ["npm", "start"]