# --- Etapa de Construcción ---
FROM node:20-slim AS builder

WORKDIR /app

# Instalar dependencias necesarias para compilar (especialmente si usas better-sqlite3 o similares)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .
# Esto genera la carpeta /app/dist
RUN npm run build

# --- Etapa de Ejecución ---
FROM node:20-slim

WORKDIR /app

# Copiamos TODOS los archivos necesarios
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./

# Instalamos tsx globalmente para ejecutar el server.ts
RUN npm install -g tsx

# Variable de entorno para asegurar que Node sepa que estamos en producción
ENV NODE_ENV=production

# Exponer el puerto que configuramos en Easypanel
EXPOSE 3000

# Comando de inicio
CMD ["tsx", "server.ts"]
