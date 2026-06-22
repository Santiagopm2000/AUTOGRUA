# Dockerfile para TowAssist (Axistcorp) en Easypanel
FROM node:20-slim AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código de la app
COPY . .

# Compilar el frontend (Genera la carpeta dist/)
RUN npm run build

# --- Etapa de Ejecución de Producción ---
FROM node:20-slim

WORKDIR /app

# Copiar archivos compilados y dependencias necesarias
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Exponer el puerto de la aplicación (usualmente 3000, o por variable PORT)
EXPOSE 3000

# Definir variables de entorno
ENV NODE_ENV=production

# Iniciar la aplicación usando Node.js nativo (muy rápido, sin overhead de TS en runtime)
CMD ["node", "dist/server.cjs"]
