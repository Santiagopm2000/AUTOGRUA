# --- Etapa de Construcción ---
FROM node:20-slim AS builder

# Instalar dependencias del sistema necesarias para compilar módulos nativos
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# --- Etapa de Ejecución ---
FROM node:20-slim

WORKDIR /app

# Copiar archivos esenciales desde el builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/node_modules ./node_modules

# Instalar tsx globalmente para ejecutar el server.ts en TS
RUN npm install -g tsx

# Configurar entorno
ENV NODE_ENV=production
EXPOSE 3000

# Comando de inicio
CMD ["tsx", "server.ts"]
