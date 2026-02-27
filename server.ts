import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const distPath = path.join(__dirname, "dist");
  
  // Prioridad: 
  // 1. Si NODE_ENV es production
  // 2. Si existe la carpeta dist (indicativo de que se hizo build para producción)
  // 3. Si NO estamos en el entorno de desarrollo de AI Studio
  const isProd = process.env.NODE_ENV === "production" || (fs.existsSync(distPath) && !process.env.VITE_DEV_SERVER);

  console.log(`[SERVER] Modo: ${isProd ? "PRODUCCIÓN" : "DESARROLLO"}`);
  console.log(`[SERVER] NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`[SERVER] Carpeta dist existe: ${fs.existsSync(distPath)}`);

  // Logging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // API Health check
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.get("/ping", (req, res) => res.send("Axistcorp: pong"));

  if (!isProd) {
    // MODO DESARROLLO: Usar Vite Middleware
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        allowedHosts: true // Permitir todos los hosts en desarrollo también
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite middleware cargado para desarrollo.");
  } else {
    // MODO PRODUCCIÓN: Servir archivos estáticos (Easypanel)
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
      console.log("Sirviendo archivos estáticos desde /dist.");
    } else {
      console.error("Carpeta /dist no encontrada. Ejecuta 'npm run build'.");
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Error fatal al iniciar el servidor:", err);
});
