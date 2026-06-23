import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

// [EASYPANEL REINCARNATION FIX] Version 1.0.3 - Removed URL-to-path ESM dependency for pure CommonJS compatibility

async function startServer() {
  const app = express();
  const PORT = 3000;
  const distPath = path.join(process.cwd(), "dist");
  
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

  // Helper to sanitize environment variables (removes quotes, undefined strings, trims whitespace)
  const cleanEnvValue = (val: string | undefined): string => {
    if (!val) return "";
    let clean = val.trim();
    if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
      clean = clean.slice(1, -1).trim();
    }
    if (clean === "undefined" || clean === "null") {
      return "";
    }
    return clean;
  };

  // API Config check to serve runtime credentials for Easypanel
  app.get("/api/config", (req, res) => {
    const rawUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const rawKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
    
    const cleanUrl = cleanEnvValue(rawUrl);
    const cleanKey = cleanEnvValue(rawKey);

    res.json({
      supabaseUrl: cleanUrl && (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")) 
        ? cleanUrl 
        : "https://yyuiyllbskobykruzkjj.supabase.co",
      supabaseAnonKey: cleanKey ? cleanKey : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5dWl5bGxic2tvYnlrcnV6a2pqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjUwMDAsImV4cCI6MjA4NzcwMTAwMH0.khms5lVmJA3KBCsIx87FJ2uTO9-DKA2Oa6AM_FGsBkc"
    });
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
