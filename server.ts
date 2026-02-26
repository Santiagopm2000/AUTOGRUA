import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("towassist.db");

// Initialize local database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT,
    phone TEXT,
    role TEXT,
    status TEXT DEFAULT 'TERMINE TURNO',
    status_start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_lat REAL,
    last_lng REAL,
    last_update DATETIME
  );

  CREATE TABLE IF NOT EXISTS integrations (
    id TEXT PRIMARY KEY,
    name TEXT,
    url TEXT,
    active INTEGER DEFAULT 1
  );
`);

// Migration: Add phone column if it doesn't exist
try {
  db.prepare("ALTER TABLE users ADD COLUMN phone TEXT").run();
} catch (e) {
  // Column already exists or other error
}

// Seed some data if empty
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  db.prepare("INSERT INTO users (id, name, email, phone, role, status) VALUES (?, ?, ?, ?, ?, ?)").run(
    "driver-1", "Juan Perez", "juan@towassist.com", "+573001234567", "driver", "TERMINE TURNO"
  );
  db.prepare("INSERT INTO users (id, name, email, phone, role, status) VALUES (?, ?, ?, ?, ?, ?)").run(
    "admin-1", "Admin Central", "admin@towassist.com", "+573007654321", "admin", "DISPONIBLE"
  );
  db.prepare("INSERT INTO users (id, name, email, phone, role, status) VALUES (?, ?, ?, ?, ?, ?)").run(
    "call-1", "Operador Call Center", "call@towassist.com", "+573009998877", "call_center", "DISPONIBLE"
  );
  
  db.prepare("INSERT INTO integrations (id, name, url, active) VALUES (?, ?, ?, ?)").run(
    "int-1", "n8n WhatsApp Hook", "https://n8n.example.com/webhook/tow", 1
  );
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/drivers", (req, res) => {
    const drivers = db.prepare("SELECT * FROM users WHERE role = 'driver'").all();
    res.json(drivers);
  });

  app.post("/api/update-status", (req, res) => {
    const { userId, status, lat, lng } = req.body;
    db.prepare("UPDATE users SET status = ?, status_start_time = CURRENT_TIMESTAMP, last_lat = ?, last_lng = ?, last_update = CURRENT_TIMESTAMP WHERE id = ?")
      .run(status, lat, lng, userId);
    
    // Trigger integrations if active
    const integrations = db.prepare("SELECT * FROM integrations WHERE active = 1").all() as any[];
    integrations.forEach(integration => {
      console.log(`[Integration] Triggering ${integration.name} for user ${userId} status ${status}`);
      // fetch(integration.url, { method: 'POST', body: JSON.stringify({ userId, status, lat, lng }) }).catch(e => {});
    });

    res.json({ success: true });
  });

  // User Management
  app.get("/api/admin/users", (req, res) => {
    const users = db.prepare("SELECT * FROM users").all();
    res.json(users);
  });

  app.post("/api/admin/users", (req, res) => {
    const { name, email, phone, role } = req.body;
    const id = `user-${Date.now()}`;
    db.prepare("INSERT INTO users (id, name, email, phone, role) VALUES (?, ?, ?, ?, ?)")
      .run(id, name, email, phone, role);
    res.json({ success: true, id });
  });

  app.delete("/api/admin/users/:id", (req, res) => {
    db.prepare("DELETE FROM users WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Integration Management
  app.get("/api/admin/integrations", (req, res) => {
    const integrations = db.prepare("SELECT * FROM integrations").all();
    res.json(integrations);
  });

  app.post("/api/admin/integrations", (req, res) => {
    const { name, url } = req.body;
    const id = `int-${Date.now()}`;
    db.prepare("INSERT INTO integrations (id, name, url) VALUES (?, ?, ?, 1)")
      .run(id, name, url);
    res.json({ success: true, id });
  });

  app.patch("/api/admin/integrations/:id", (req, res) => {
    const { active } = req.body;
    db.prepare("UPDATE integrations SET active = ? WHERE id = ?").run(active ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  app.get("/api/admin/stats", (req, res) => {
    const activeDrivers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'driver' AND status = 'DISPONIBLE'").get() as any;
    const inService = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'driver' AND status = 'EN SERVICIO'").get() as any;
    res.json({
      activeDrivers: activeDrivers.count,
      inService: inService.count
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
