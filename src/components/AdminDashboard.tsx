import React, { useState, useEffect } from "react";
import { User, Integration, UserStatus } from "../types";
import { api } from "../services/api";
import { supabase } from "../services/supabase";
import { 
  Users, 
  Plus, 
  Settings,
  RefreshCcw,
  Trash2,
  Globe,
  ToggleLeft,
  ToggleRight,
  Share2,
  MessageSquare,
  Search,
  Database,
  AlertTriangle,
  Info,
  Clock,
  ClipboardList,
  PowerOff
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  
  // Real-time Database check
  const [dbStatus, setDbStatus] = useState<"connected" | "fallback" | "testing">("testing");
  const [dbDetails, setDbDetails] = useState<string>("");

  // Search and filters
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // User creation state
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ id: "", name: "", email: "", phone: "", mobile: "", area: "", role: "driver" });
  
  // Integration creation state
  const [showIntModal, setShowIntModal] = useState(false);
  const [newInt, setNewInt] = useState({ name: "", url: "" });

  // Reporting States
  const [driverLogs, setDriverLogs] = useState<any[]>([]);
  const [servicesReport, setServicesReport] = useState<any[]>([]);
  const [activeReportTab, setActiveReportTab] = useState<'status_logs' | 'closed_services'>('status_logs');

  // Dynamic feedback and alerts state
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" | "warning"; show: boolean }>({ message: "", type: "success", show: false });
  const [showSqlTroubleshooter, setShowSqlTroubleshooter] = useState(false);

  const showNotification = (message: string, type: "success" | "error" | "warning" = "success") => {
    setNotification({ message, type, show: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 8000);
  };

  const checkDbConnection = async () => {
    try {
      // Intentar una consulta directa súper rápida a Supabase
      const start = Date.now();
      const { data, error } = await supabase.from("users").select("id").limit(1);
      
      const isCustomDb = import.meta.env.VITE_SUPABASE_URL && !import.meta.env.VITE_SUPABASE_URL.includes("yyuiyllbskobykruzkjj");
      
      if (!error && data) {
         setDbStatus("connected");
         setDbDetails(isCustomDb ? "Base de datos Propia Conectada" : "Base de datos Demo Compartida");
      } else {
         setDbStatus("fallback");
         setDbDetails(error?.message || "No se pudo conectar");
      }
    } catch (err) {
      setDbStatus("fallback");
      setDbDetails("Error de conexión");
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    showNotification("Iniciando sincronización bidireccional de datos con Supabase...", "success");
    try {
      const result = await api.syncWithSupabase();
      if (result.success) {
        showNotification(
          `Sincronización Completa: Se unificaron ${result.syncedUsers} usuarios, ${result.syncedServices} servicios e ${result.syncedIntegrations} integraciones con la base de datos de Supabase de forma segura.`,
          "success"
        );
        await fetchData();
      } else {
        showNotification(
          `Sincronización Fallida: No se pudo conectar de manera estable con Supabase. Error: ${result.error || "Desconocido"}. La aplicación seguirá operando con los datos locales en el navegador de forma segura.`,
          "warning"
        );
      }
    } catch (err: any) {
      showNotification(`Error en el proceso de sincronización: ${err?.message || err}`, "warning");
    } finally {
      setSyncing(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await checkDbConnection();
    try {
      const [usersData, integrationsData, logsData, servicesData] = await Promise.all([
        api.getAllUsers(),
        api.getIntegrations(),
        api.getDriverStatusLogs(),
        api.getServices()
      ]);
      setUsers(usersData || []);
      setIntegrations(integrationsData || []);
      setDriverLogs(logsData || []);
      setServicesReport((servicesData || []).filter((s: any) => s.status === 'COMPLETADO' || s.status === 'CANCELADO'));
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await api.createUser(newUser);
    if (result.success) {
      showNotification(`Sincronización Exitosa: El usuario "${newUser.name}" se guardó correctamente en la base de datos de Supabase.`, "success");
    } else {
      showNotification(`Sincronización Fallida: Se guardó en el navegador (local), pero falló la conexión o estructura en Supabase. Error: ${result.error || "Desconocido"}`, "warning");
    }
    setShowUserModal(false);
    setNewUser({ id: "", name: "", email: "", phone: "", mobile: "", area: "", role: "driver" });
    fetchData();
  };

  const handleCreateInt = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await api.createIntegration(newInt);
    showNotification(`Integración "${newInt.name}" configurada y registrada con éxito.`, "success");
    setShowIntModal(false);
    setNewInt({ name: "", url: "" });
    fetchData();
  };

  const toggleIntegration = async (id: string, current: boolean) => {
    await api.updateIntegrationStatus(id, !current);
    showNotification(`Estado de automatización actualizado correctamente.`, "success");
    fetchData();
  };

  const deleteUser = async (id: string) => {
    if (confirm("¿Eliminar usuario?")) {
      await api.deleteUser(id);
      showNotification(`Usuario eliminado de los registros. Sincronizando...`, "success");
      fetchData();
    }
  };

  const forceEndShift = async (userId: string, userName: string) => {
    if (confirm(`¿Estás seguro de que deseas tumbar el turno de ${userName} y desconectarlo?`)) {
      try {
        await api.updateStatus(userId, "TERMINE TURNO");
        showNotification(`Turno de ${userName} finalizado por administración.`, "success");
        fetchData();
      } catch (err) {
        showNotification("No se pudo actualizar el estado del conductor.", "error");
      }
    }
  };

  const changeUserStatus = async (userId: string, newStatus: UserStatus, userName: string) => {
    try {
      await api.updateStatus(userId, newStatus);
      showNotification(`Estado de ${userName} cambiado a ${newStatus} por administración.`, "success");
      fetchData();
    } catch (err) {
      showNotification("No se pudo cambiar el estado del conductor.", "error");
    }
  };

  const shareAppLink = () => {
    const text = encodeURIComponent(`Hola! Descarga aquí la App de Axistcorp para conductores: ${window.location.origin}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <RefreshCcw className="w-10 h-10 text-blue-600 animate-spin" />
      <p className="text-sm font-bold text-slate-500 font-sans tracking-wide">Cargando Panel Administrativo y Conexión de Datos...</p>
    </div>
  );

  const filteredUsers = Array.isArray(users) ? users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (u.phone && u.phone.includes(searchTerm));
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  }) : [];

  return (
    <div className="space-y-8">
      {/* Floating high-contrast Toast Alert */}
      {notification.show && (
        <div className={`fixed bottom-6 right-6 z-50 max-w-md p-4 rounded-3xl shadow-2xl border flex items-start gap-3 transition-all duration-300 transform translate-y-0 ${
          notification.type === "success" 
            ? "bg-slate-900 border-slate-800 text-slate-100" 
            : "bg-amber-500 border-amber-400 text-slate-950"
        }`}>
          <div className="mt-0.5 bg-white/10 p-1.5 rounded-xl text-current">
            <Info className="w-5 h-5 flex-shrink-0" />
          </div>
          <div className="flex-1 space-y-0.5">
            <h5 className="font-black text-xs uppercase tracking-wider">
              {notification.type === "success" ? "Operación Exitosa" : "Alerta de Base de Datos"}
            </h5>
            <p className="text-[11px] font-bold leading-normal">
              {notification.message}
            </p>
          </div>
          <button 
            onClick={() => setNotification(prev => ({ ...prev, show: false }))}
            className="text-xs font-black cursor-pointer hover:opacity-85 p-1 bg-white/10 hover:bg-white/25 rounded-lg transition-all"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header and Live DB Status Checklist */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2 text-slate-900 uppercase tracking-tighter">
            <Settings className="w-8 h-8 text-blue-600" /> Configuración <span className="text-blue-600">Axistcorp</span>
          </h1>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Sincronización en Tiempo Real de Grúas & Despacho</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Connection Pill */}
          <div className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-xs font-black uppercase tracking-wider ${
            dbStatus === "connected" 
              ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
              : dbStatus === "testing"
                ? "bg-amber-50 border-amber-200 text-amber-800 animate-pulse"
                : "bg-rose-50 border-rose-200 text-rose-800"
          }`}>
            <Database className={`w-4 h-4 ${dbStatus === "testing" ? "animate-bounce" : ""}`} />
            <span>DB: {dbStatus === "connected" ? "CONECTADO" : dbStatus === "testing" ? "PROBANDO..." : "MOCK/FALLBACK"}</span>
          </div>

          {/* Sync Button */}
          <button 
            disabled={syncing}
            onClick={handleSync}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider uppercase transition-all shadow-sm active:scale-95 border ${
              syncing
                ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white border-blue-600 hover:shadow-lg hover:shadow-blue-600/10"
            }`}
            title="Sincronizar datos locales con Supabase de manera bidireccional"
          >
            <RefreshCcw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Sincronizando..." : "Sincronizar Supabase"}</span>
          </button>

          {/* Quick Refresh View Button */}
          <button 
            disabled={loading || syncing}
            onClick={fetchData}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold p-2.5 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
            title="Actualizar Vista Local"
          >
            <RefreshCcw className={`w-4 h-4 ${loading && !syncing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {dbStatus !== "connected" && (
        <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex flex-col md:flex-row items-start gap-4">
          <div className="bg-amber-100 text-amber-800 p-3 rounded-2xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-amber-900 text-sm uppercase tracking-wide">Base de datos en modo Fallback</h4>
            <p className="text-xs text-amber-800 font-medium leading-relaxed">
              La aplicación no ha detectado las variables de entorno de Supabase configuradas en Easypanel, por lo que está operando en <strong>modo demostrativo sin perder funcionalidad</strong>. 
              Para conectar tu base de datos definitiva en la nube, ve a <strong>Easypanel ➡️ Environment Variables</strong> y agrega las variables: <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px] font-bold">VITE_SUPABASE_URL</code> y <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-[11px] font-bold">VITE_SUPABASE_ANON_KEY</code>.
            </p>
          </div>
        </div>
      )}

      {dbStatus === "connected" && (
        <div className="bg-emerald-50/60 border border-emerald-100 rounded-3xl p-5 flex items-center gap-3">
          <div className="bg-emerald-100 text-emerald-800 p-2 rounded-xl">
            <Info className="w-5 h-5" />
          </div>
          <div className="text-xs text-emerald-800 font-semibold uppercase tracking-wider">
            Sincronización Activa exitosa: <span className="font-extrabold">{dbDetails}</span>
          </div>
        </div>
      )}

      {/* Guía Interactiva de Estructura de Tablas en Supabase */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="bg-blue-50 text-blue-600 p-2.5 rounded-2xl border border-blue-100 mt-0.5">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">🛠️ Guía de Estructura de Tablas en Supabase</h3>
              <p className="text-[11px] text-slate-500 font-semibold leading-snug">¿Falta alguna columna o hay errores de guardado? Restablece o crea tu tabla "users" correctamente.</p>
            </div>
          </div>
          <button
            onClick={() => setShowSqlTroubleshooter(!showSqlTroubleshooter)}
            className="text-[10px] bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold transition-all uppercase tracking-wider whitespace-nowrap active:scale-95 shadow-md"
          >
            {showSqlTroubleshooter ? "Ocultar Guía SQL" : "Ver Instrucciones SQL"}
          </button>
        </div>

        {showSqlTroubleshooter && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: "auto" }} 
            className="pt-4 border-t border-slate-200 space-y-4 text-xs"
          >
            <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl text-slate-700 leading-relaxed font-medium">
              Si creaste la tabla manually o no se están guardando los 5 registros iniciales, es probable que la base de datos no tenga las 13 columnas completas. Para solucionarlo de inmediato y asegurar el funcionamiento al 100%:
            </div>
            
            <ol className="list-decimal list-inside text-slate-600 font-semibold space-y-2">
              <li>Ingresa al Panel de <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">Supabase Dashboard</a>.</li>
              <li>Entra a tu proyecto ➡️ sección <strong>SQL Editor</strong> en el menú lateral izquierdo.</li>
              <li>Crea una consulta con <strong>New Query</strong>, pega el script de abajo y presiona <strong>Run</strong>.</li>
            </ol>

            <div className="relative mt-2">
              <div className="absolute right-3 top-3 z-10">
                <button
                  onClick={() => {
                    const sqlCode = `-- 1. Limpieza de tablas existentes en orden jerárquico\nDROP TABLE IF EXISTS gps_logs CASCADE;\nDROP TABLE IF EXISTS services CASCADE;\nDROP TABLE IF EXISTS integrations CASCADE;\nDROP TABLE IF EXISTS driver_status_logs CASCADE;\nDROP TABLE IF EXISTS users CASCADE;\n\n-- 2. Creación de la Tabla de Usuarios con las 13 columnas necesarias\nCREATE TABLE users (\n    id TEXT PRIMARY KEY,\n    name TEXT NOT NULL,\n    email TEXT NOT NULL UNIQUE,\n    phone TEXT,\n    mobile TEXT,\n    area TEXT,\n    role TEXT NOT NULL DEFAULT 'driver' CHECK (role IN ('admin', 'call_center', 'driver')),\n    status TEXT NOT NULL DEFAULT 'DISPONIBLE' CHECK (status IN ('DISPONIBLE', 'EN SERVICIO', 'MANTENIMIENTO', 'INACTIVO', 'TERMINE TURNO')),\n    status_start_time TIMESTAMPTZ DEFAULT NOW(),\n    shift_start_time TIMESTAMPTZ,\n    last_lat DOUBLE PRECISION,\n    last_lng DOUBLE PRECISION,\n    last_update TIMESTAMPTZ DEFAULT NOW()\n);\n\n-- 3. Deshabilitar RLS para permitir sincronización instantánea desde la app sin autenticación JWT\nALTER TABLE users DISABLE ROW LEVEL SECURITY;\n\n-- 4. Semillas iniciales (Los 5 registros vitales de administración y demostración)\nINSERT INTO users (id, name, email, phone, mobile, area, role, status)\nVALUES \n  ('user-px6', 'Usuario Creador (Admin)', 'px6.usa@gmail.com', '+573100000000', '+573100000000', 'Administración / Sistemas', 'admin', 'DISPONIBLE'),\n  ('demo-admin', 'Administrador Axistcorp', 'admin@axistcorp.com', '+573000000000', '+573000000000', 'Gerencia / Tecnología', 'admin', 'DISPONIBLE'),\n  ('demo-call-center', 'Operador Call Center', 'callcenter@axistcorp.com', '+573111111111', '+573111111111', 'Despacho / Call Center', 'call_center', 'DISPONIBLE'),\n  ('demo-driver-1', 'Carlos Mendoza (Grúa Camión)', 'conductor@axistcorp.com', '+573001234567', '+573001234567', 'Logística - Zona Norte', 'driver', 'DISPONIBLE'),\n  ('demo-driver-2', 'Andrés Delgado (Grúa Cama)', 'conductor2@axistcorp.com', '+573119876543', '+573119876543', 'Logística - Zona Centro', 'driver', 'EN SERVICIO')\nON CONFLICT (id) DO UPDATE SET\n  name = EXCLUDED.name,\n  email = EXCLUDED.email,\n  phone = EXCLUDED.phone,\n  mobile = EXCLUDED.mobile,\n  area = EXCLUDED.area,\n  role = EXCLUDED.role,\n  status = EXCLUDED.status;`;
                    navigator.clipboard.writeText(sqlCode);
                    showNotification("Script SQL copiado. ¡Pégalo en Supabase SQL Editor y ejecútalo!", "success");
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-md transition-all active:scale-95"
                >
                  Copiar Script SQL
                </button>
              </div>
              <pre className="bg-slate-950 text-slate-300 p-4 rounded-2xl overflow-x-auto text-[10px] font-mono leading-relaxed max-h-60 shadow-inner pt-12">
{`-- 1. Limpieza de tablas existentes en orden jerárquico
DROP TABLE IF EXISTS gps_logs CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS integrations CASCADE;
DROP TABLE IF EXISTS driver_status_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Creación de la Tabla de Usuarios con las 13 columnas necesarias
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    mobile TEXT,
    area TEXT,
    role TEXT NOT NULL DEFAULT 'driver' CHECK (role IN ('admin', 'call_center', 'driver')),
    status TEXT NOT NULL DEFAULT 'DISPONIBLE' CHECK (status IN ('DISPONIBLE', 'EN SERVICIO', 'MANTENIMIENTO', 'INACTIVO', 'TERMINE TURNO')),
    status_start_time TIMESTAMPTZ DEFAULT NOW(),
    shift_start_time TIMESTAMPTZ,
    last_lat DOUBLE PRECISION,
    last_lng DOUBLE PRECISION,
    last_update TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Deshabilitar RLS para permitir sincronización instantánea desde la app sin autenticación JWT
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 4. Semillas iniciales (Los 5 registros vitales de administración y demostración)
INSERT INTO users (id, name, email, phone, mobile, area, role, status)
VALUES 
  ('user-px6', 'Usuario Creador (Admin)', 'px6.usa@gmail.com', '+573100000000', '+573100000000', 'Administración / Sistemas', 'admin', 'DISPONIBLE'),
  ('demo-admin', 'Administrador Axistcorp', 'admin@axistcorp.com', '+573000000000', '+573000000000', 'Gerencia / Tecnología', 'admin', 'DISPONIBLE'),
  ('demo-call-center', 'Operador Call Center', 'callcenter@axistcorp.com', '+573111111111', '+573111111111', 'Despacho / Call Center', 'call_center', 'DISPONIBLE'),
  ('demo-driver-1', 'Carlos Mendoza (Grúa Camión)', 'conductor@axistcorp.com', '+573001234567', '+573001234567', 'Logística - Zona Norte', 'driver', 'DISPONIBLE'),
  ('demo-driver-2', 'Andrés Delgado (Grúa Cama)', 'conductor2@axistcorp.com', '+573119876543', '+573119876543', 'Logística - Zona Centro', 'driver', 'EN SERVICIO')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  mobile = EXCLUDED.mobile,
  area = EXCLUDED.area,
  role = EXCLUDED.role,
  status = EXCLUDED.status;`}
              </pre>
            </div>
            <p className="text-[10px] text-slate-400 font-bold italic leading-normal">
              * Nota Importante: La deshabilitación de Row Level Security (RLS) en Supabase es crucial para permitir que la aplicación se conecte de forma directa y sincronice usuarios en tiempo real sin obligarte a pasar por complejas autenticaciones JWT de correo.
            </p>
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Share Section */}
        <section className="bg-blue-600 rounded-3xl p-8 shadow-xl shadow-blue-600/20 lg:col-span-2 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-white text-center md:text-left">
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-1">Enviar App a Conductores</h2>
            <p className="text-blue-100 text-xs font-semibold uppercase tracking-wider opacity-90">Instalación Móvil Automática PWA / Capacitor</p>
          </div>
          <button 
            onClick={shareAppLink}
            className="bg-white text-blue-600 font-black px-6 py-3.5 rounded-2xl flex items-center gap-3 shadow-xl hover:shadow-2xl active:scale-95 transition-all uppercase tracking-widest text-xs"
          >
            <MessageSquare className="w-5 h-5 text-emerald-500 fill-emerald-500" /> Compartir por WhatsApp
          </button>
        </section>

        {/* User Management */}
        <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
              <Users className="w-6 h-6 text-blue-600" /> Gestión de Usuarios
            </h2>
            <button 
              onClick={() => setShowUserModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-blue-600/20 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" /> CREAR USUARIO
            </button>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por nombre, email o cel..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 focus:bg-white text-slate-900 font-medium"
              />
            </div>
            <select 
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-600 font-bold text-slate-700"
            >
              <option value="all">TODOS LOS ROLES</option>
              <option value="driver">CONDUCTORES</option>
              <option value="call_center">OPERADORES CALL CENTER</option>
              <option value="admin">ADMINISTRADORES</option>
            </select>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 font-bold uppercase tracking-wider">
                Ningún usuario coincide con los filtros
              </div>
            ) : (
              filteredUsers.map(user => (
                <div key={user.id} className="flex flex-col p-5 bg-slate-50 hover:bg-slate-100/40 rounded-2xl border border-slate-150 transition-all gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-extrabold text-slate-900 text-sm">{user.name}</p>
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          user.role === "admin" 
                            ? "bg-purple-100 text-purple-800" 
                            : user.role === "call_center"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-blue-100 text-blue-800"
                        }`}>
                          {user.role === 'admin' ? 'Administrador' : user.role === 'call_center' ? 'Call Center' : 'Conductor'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-semibold font-mono mt-1">{user.email}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {user.mobile && (
                        <button
                          onClick={() => {
                            const text = encodeURIComponent(`Hola ${user.name}, te contactamos desde administración de Axistcorp.`);
                            window.open(`https://wa.me/${user.mobile.replace(/\+/g, '')}?text=${text}`, '_blank');
                          }}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black p-2 rounded-xl transition-all active:scale-90 border border-emerald-100 flex items-center gap-1.5 text-[10px] uppercase tracking-wider shadow-sm"
                          title="Contactar por WhatsApp"
                        >
                          <MessageSquare className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" /> WhatsApp
                        </button>
                      )}
                      
                      <button 
                        onClick={() => deleteUser(user.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90 border border-transparent hover:border-red-100"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Detalle de Atributos: ID, Cargo, Teléfono, Móvil y Área */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[10px] font-bold text-slate-500 border-t border-slate-100 pt-3 bg-white/50 p-3 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[8px] uppercase font-black text-slate-400 block tracking-wider mb-0.5">ID de Usuario</span>
                      <span className="font-mono text-slate-850 font-bold bg-slate-100/80 px-1.5 py-0.5 rounded text-[11px] break-all">{user.id}</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-black text-slate-400 block tracking-wider mb-0.5">Área / Depto</span>
                      <span className="text-slate-800 font-extrabold uppercase">{user.area || "General"}</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-black text-slate-400 block tracking-wider mb-0.5">Cargo exacto</span>
                      <span className="text-slate-800 font-extrabold uppercase">{user.role === 'admin' ? 'Administrador' : user.role === 'call_center' ? 'Call Center' : 'Conductor'}</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-black text-slate-400 block tracking-wider mb-0.5">Teléfono Fijo</span>
                      <span className="font-mono text-slate-700">{user.phone || "No Registrado"}</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-black text-slate-400 block tracking-wider mb-0.5">Móvil / Celular</span>
                      <span className="font-mono text-slate-700">{user.mobile || "No Registrado"}</span>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-black text-slate-400 block tracking-wider mb-0.5">Estado App</span>
                      <span className={`inline-flex items-center gap-1 font-bold ${user.status === 'DISPONIBLE' ? 'text-emerald-600' : 'text-amber-500'}`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span> {user.status || "DISPONIBLE"}
                      </span>
                    </div>

                    {user.role === 'driver' && (
                      <div className="col-span-2 sm:col-span-3 border-t border-slate-100 pt-3 mt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-rose-50/20 p-2.5 rounded-lg border border-dashed border-rose-100/50">
                        <div>
                          <span className="text-[8px] uppercase font-black text-slate-400 block tracking-wider mb-0.5">Control de Conexión</span>
                          <span className="text-[10px] text-slate-600 font-bold leading-none">Forzar cambio de estado</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {user.status !== 'TERMINE TURNO' ? (
                            <button
                              onClick={() => forceEndShift(user.id, user.name)}
                              className="bg-rose-100 hover:bg-rose-200 text-rose-700 text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl border border-rose-200 transition-all active:scale-95 flex items-center gap-1.5 shadow-sm"
                              title="Forzar fin de turno (Desconectar)"
                            >
                              <PowerOff className="w-3.5 h-3.5" /> Desconectar / Fin Turno
                            </button>
                          ) : (
                            <span className="text-[9px] bg-slate-100 text-slate-400 font-black uppercase px-2.5 py-1.5 rounded-xl border border-slate-200">Turno Terminado</span>
                          )}
                          <select
                            value={user.status || "DISPONIBLE"}
                            onChange={(e) => changeUserStatus(user.id, e.target.value as UserStatus, user.name)}
                            className="bg-white border border-slate-200 text-slate-700 text-[10px] font-black uppercase px-2 py-1.5 rounded-xl outline-none focus:border-blue-600 cursor-pointer shadow-sm"
                          >
                            <option value="DISPONIBLE">🟢 DISPONIBLE</option>
                            <option value="EN SERVICIO">🟡 EN SERVICIO</option>
                            <option value="MANTENIMIENTO">🟠 MANTENIMIENTO</option>
                            <option value="TERMINE TURNO">🔴 TERMINE TURNO</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Integrations Management */}
        <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
              <Globe className="w-6 h-6 text-blue-600" /> Integraciones automatizadas (n8n Webhook)
            </h2>
            <button 
              onClick={() => setShowIntModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-slate-900/20"
            >
              <Plus className="w-3 h-3" /> AGREGAR WEBHOOK
            </button>
          </div>

          <div className="space-y-4 max-h-[464px] overflow-y-auto pr-1">
            {integrations.length === 0 ? (
              <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400 font-bold uppercase tracking-wider">
                No hay Webhooks de n8n configurados
              </div>
            ) : (
              integrations.map(int => (
                <div key={int.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-150 transition-all">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-extrabold text-slate-900 text-sm">{int.name}</p>
                    <button onClick={() => toggleIntegration(int.id, int.active)} className="cursor-pointer">
                      {int.active ? (
                        <ToggleRight className="w-8 h-8 text-blue-600" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-slate-300" />
                      )}
                    </button>
                  </div>
                  <p className="text-[10px] font-mono text-slate-400 truncate bg-white border border-slate-100 p-2 rounded-lg font-semibold">{int.url}</p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* SECCIÓN DE REPORTES DE RENDIMIENTO Y TIEMPOS */}
      <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 uppercase tracking-tight">
              <Clock className="w-6 h-6 text-blue-600" /> Reportes de Tiempos y Servicios Cerrados
            </h2>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Historial auditado de estados y rutas operativas</p>
          </div>

          {/* Report Tab Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl scroll-p-1 self-start sm:self-auto">
            <button
              onClick={() => setActiveReportTab('status_logs')}
              className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                activeReportTab === 'status_logs'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Control de Estados
            </button>
            <button
              onClick={() => setActiveReportTab('closed_services')}
              className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                activeReportTab === 'closed_services'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Servicios Cerrados
            </button>
          </div>
        </div>

        {activeReportTab === 'status_logs' ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-150">
            <table className="w-full text-left border-collapse bg-slate-50/50">
              <thead>
                <tr className="bg-slate-100/55 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="p-4">Conductor</th>
                  <th className="p-4">Estado Anterior</th>
                  <th className="p-4">Nuevo Estado</th>
                  <th className="p-4">Fecha Cambio</th>
                  <th className="p-4 text-right">Duración en Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {driverLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                      No hay registros de transiciones de estados todavía
                    </td>
                  </tr>
                ) : (
                  driverLogs.map((log) => {
                    const formatDurationSeconds = (seconds?: number | null) => {
                      if (seconds === undefined || seconds === null) return "--";
                      if (seconds < 60) return `${seconds}s`;
                      const mins = Math.floor(seconds / 60);
                      const secs = seconds % 60;
                      if (mins < 60) return `${mins}m ${secs}s`;
                      const hrs = Math.floor(mins / 60);
                      const remMins = mins % 60;
                      return `${hrs}h ${remMins}m ${secs}s`;
                    };

                    return (
                      <tr key={log.id} className="hover:bg-slate-100/20 transition-all">
                        <td className="p-4 font-bold text-slate-900">{log.driver_name || log.driver_id}</td>
                        <td className="p-4 text-slate-400 uppercase text-[10px] tracking-wider">{log.previous_status || "INICIAL"}</td>
                        <td className="p-4 text-blue-600 font-extrabold uppercase text-[10px] tracking-wider">{log.new_status}</td>
                        <td className="p-4 text-slate-400 font-mono font-bold">
                          {new Date(log.changed_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td className="p-4 text-right font-mono font-black text-slate-800">
                          {formatDurationSeconds(log.duration_seconds)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-150">
            <table className="w-full text-left border-collapse bg-slate-50/50">
              <thead>
                <tr className="bg-slate-100/55 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="p-4">Ref Servicio</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Vehículo</th>
                  <th className="p-4">Origen / Destino</th>
                  <th className="p-4">Resultado</th>
                  <th className="p-4 text-right">Tiempo de Resolución</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {servicesReport.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                      No hay servicios de emergencia cerrados registrados
                    </td>
                  </tr>
                ) : (
                  servicesReport.map((srv) => {
                    const formatDurationSeconds = (seconds?: number | null) => {
                      if (seconds === undefined || seconds === null) return "--";
                      if (seconds < 60) return `${seconds}s`;
                      const mins = Math.floor(seconds / 60);
                      const secs = seconds % 60;
                      if (mins < 60) return `${mins}m ${secs}s`;
                      const hrs = Math.floor(mins / 60);
                      const remMins = mins % 60;
                      return `${hrs}h ${remMins}m ${secs}s`;
                    };

                    return (
                      <tr key={srv.id} className="hover:bg-slate-100/20 transition-all">
                        <td className="p-4 font-mono font-bold text-slate-400">#{srv.id.slice(0, 8).toUpperCase()}</td>
                        <td className="p-4">
                          <p className="font-bold text-slate-900">{srv.client_name}</p>
                          {srv.driver_name && <p className="text-[10px] text-slate-400">Operario: {srv.driver_name}</p>}
                        </td>
                        <td className="p-4 text-slate-600 font-medium">{srv.vehicle_info}</td>
                        <td className="p-4">
                          <p className="text-slate-700 font-semibold text-xs">{srv.origin_address}</p>
                          {srv.destination_address && <p className="text-slate-400 text-[10px]">Destino: {srv.destination_address}</p>}
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                            srv.status === 'COMPLETADO' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {srv.status}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono font-black text-slate-800">
                          {formatDurationSeconds(srv.duration_seconds)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modals */}
      <AnimatePresence>
        {showUserModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white border border-slate-200 rounded-3xl p-8 w-full max-w-lg shadow-2xl my-8">
              <h2 className="text-2xl font-black mb-1 text-slate-900 uppercase tracking-tighter">Nuevo Registro</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Asigne los datos corporativos del usuario</p>
              
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">ID de Usuario (Opcional)</label>
                    <input placeholder="Ej: user-px6 o auto" value={newUser.id} onChange={e => setNewUser({...newUser, id: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-600 text-xs font-semibold text-slate-800" />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Nombre Completo</label>
                    <input required placeholder="Ej: Carlos Mendoza" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-600 text-xs font-semibold text-slate-800" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Correo de Acceso</label>
                    <input required type="email" placeholder="Ej: conductor@axistcorp.com" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-600 text-xs font-semibold text-slate-800" />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Área / Departamento</label>
                    <input placeholder="Ej: Logística, Finanzas, Sistemas" value={newUser.area} onChange={e => setNewUser({...newUser, area: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-600 text-xs font-semibold text-slate-800" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Teléfono Fijo / Oficina</label>
                    <input placeholder="Ej: +5716010000" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-600 text-xs font-semibold text-slate-800" />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Móvil / Celular (WhatsApp)</label>
                    <input placeholder="Ej: +573100000000" value={newUser.mobile} onChange={e => setNewUser({...newUser, mobile: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-600 text-xs font-semibold text-slate-800" />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-2">Cargo / Perfil</label>
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 outline-none focus:border-blue-600 text-xs font-bold text-slate-700">
                    <option value="driver">Conductor de Grúa</option>
                    <option value="call_center">Operador Call Center / Despacho</option>
                    <option value="admin">Administrador General</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 text-xs tracking-wider uppercase transition-colors">CANCELAR</button>
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 text-xs tracking-wider uppercase transition-colors shadow-lg shadow-blue-600/20">CREAR REGISTRO</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showIntModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white border border-slate-200 rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-black mb-6 text-slate-900 uppercase tracking-tighter">Nueva Integración</h2>
              <form onSubmit={handleCreateInt} className="space-y-4">
                <input required placeholder="Nombre (Ej: n8n WhatsApp)" value={newInt.name} onChange={e => setNewInt({...newInt, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-600 text-slate-900" />
                <input required placeholder="Webhook URL" value={newInt.url} onChange={e => setNewInt({...newInt, url: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-600 text-slate-900" />
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowIntModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">CANCELAR</button>
                  <button type="submit" className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20">GUARDAR</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
