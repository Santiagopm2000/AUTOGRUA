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
  const isProd = process.env.NODE_ENV === "production";
  const distPath = path.join(__dirname, "dist");

  console.log(`Iniciando Servidor Axistcorp en modo ${isProd ? "PRODUCCIÓN" : "DESARROLLO"}...`);

  // Logging
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // API Health check
  app.get("/api/health", (req, res) => res.json({ status: "ok" }));
  app.get("/ping", (req, res) => res.send("Axistcorp: pong"));

  if (!isProd) {
    // MODO DESARROLLO: Usar Vite Middleware para el Preview de AI Studio
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
