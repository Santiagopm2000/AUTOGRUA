import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const distPath = path.join(__dirname, "dist");

  console.log("Iniciando Servidor de Producción Axistcorp...");
  console.log(`Buscando carpeta dist en: ${distPath}`);

  // Logging para ver qué llega del celular
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Agent: ${req.headers['user-agent']}`);
    next();
  });

  // Health check simple
  app.get("/ping", (req, res) => res.send("Axistcorp: pong"));

  // Servir el index.html explícitamente en la raíz
  app.get("/", (req, res) => {
    if (fs.existsSync(path.join(distPath, "index.html"))) {
      res.sendFile(path.join(distPath, "index.html"));
    } else {
      res.status(404).send("Axistcorp: Error - No se encontró index.html. Contacte soporte.");
    }
  });

  // Servir archivos estáticos de la carpeta dist
  if (fs.existsSync(distPath)) {
    console.log("Carpeta dist encontrada. Sirviendo archivos estáticos...");
    app.use(express.static(distPath));
    
    // SPA fallback: Todas las rutas no encontradas sirven el index.html
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    console.error("ERROR CRÍTICO: No se encontró la carpeta dist. Por favor, ejecuta 'npm run build' primero.");
    app.get("*", (req, res) => {
      res.status(500).send("Error: La aplicación no ha sido compilada. Por favor, contacta al administrador.");
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Axistcorp listo en puerto ${PORT}`);
    console.log(`📱 Intenta acceder desde tu celular ahora.`);
  });
}

startServer().catch(err => {
  console.error("Error al iniciar el servidor:", err);
});
