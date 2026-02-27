# Dockerfile para Axistcorp en Easypanel
FROM node:20-slim AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Compilar la aplicación (Genera la carpeta /dist)
RUN npm run build

# --- Etapa de Ejecución ---
FROM node:20-slim

WORKDIR /app

# Copiar solo lo necesario desde la etapa de construcción
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/node_modules ./node_modules

# Instalar tsx para ejecutar el server.ts (o podrías compilar el server a JS)
RUN npm install -g tsx

# Exponer el puerto 3000
EXPOSE 3000

# Forzar modo producción
ENV NODE_ENV=production

# Comando para iniciar el servidor
CMD ["tsx", "server.ts"]
