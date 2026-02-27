import React, { useState, useEffect } from "react";
import { User, Integration } from "../types";
import { api } from "../services/api";
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
  BarChart3,
  FileText,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'integrations' | 'reports'>('users');
  
  // User creation state
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", phone: "", role: "driver" });
  
  // Integration creation state
  const [showIntModal, setShowIntModal] = useState(false);
  const [newInt, setNewInt] = useState({ name: "", url: "" });

  const fetchData = async () => {
    try {
      const [usersData, integrationsData, historyData] = await Promise.all([
        api.getAllUsers(),
        api.getIntegrations(),
        api.getServiceHistory()
      ]);
      setUsers(usersData);
      setIntegrations(integrationsData);
      setHistory(historyData);
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
    await api.createUser(newUser);
    setShowUserModal(false);
    setNewUser({ name: "", email: "", phone: "", role: "driver" });
    fetchData();
  };

  const handleCreateInt = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createIntegration(newInt);
    setShowIntModal(false);
    setNewInt({ name: "", url: "" });
    fetchData();
  };

  const toggleIntegration = async (id: string, current: boolean) => {
    await api.updateIntegrationStatus(id, !current);
    fetchData();
  };

  const deleteUser = async (id: string) => {
    if (confirm("¿Eliminar usuario?")) {
      await api.deleteUser(id);
      fetchData();
    }
  };

  const shareAppLink = () => {
    const text = encodeURIComponent(`Hola! Descarga aquí la App de Axistcorp para conductores: ${window.location.origin}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  if (loading) return <div className="flex justify-center py-20">Cargando Panel Administrativo...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black flex items-center gap-2 text-slate-900 uppercase tracking-tighter">
          <Settings className="w-8 h-8 text-blue-600" /> Configuración <span className="text-blue-600">Axistcorp</span>
        </h1>
        <div className="flex gap-2">
          <div className="bg-white border border-slate-200 rounded-xl p-1 flex gap-1">
            <button 
              onClick={() => setActiveTab('users')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'users' ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Usuarios
            </button>
            <button 
              onClick={() => setActiveTab('integrations')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'integrations' ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
              )}
            >
              n8n / API
            </button>
            <button 
              onClick={() => setActiveTab('reports')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                activeTab === 'reports' ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
              )}
            >
              Reportes
            </button>
          </div>
          <button 
            onClick={fetchData}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold p-3 rounded-xl transition-all shadow-sm"
          >
            <RefreshCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {activeTab === 'reports' ? (
        <section className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Reporte de Servicios</h2>
              <p className="text-slate-500 font-medium">Historial de actividad y tiempos de respuesta</p>
            </div>
            <button className="bg-emerald-500 text-white font-black px-6 py-3 rounded-2xl flex items-center gap-2 shadow-xl shadow-emerald-500/20 active:scale-95 transition-all text-xs uppercase tracking-widest">
              <Download className="w-4 h-4" /> Exportar Excel
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Conductor</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Inicio</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Última Ubic.</th>
                  <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {history.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 font-bold text-slate-900">{item.driverName}</td>
                    <td className="py-4">
                      <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 text-xs font-mono text-slate-500">
                      {new Date(item.startTime).toLocaleString()}
                    </td>
                    <td className="py-4 text-xs font-mono text-slate-500">{item.location}</td>
                    <td className="py-4">
                      <button className="p-2 text-slate-300 hover:text-blue-600 transition-colors">
                        <FileText className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Share Section */}
          <section className="bg-blue-600 rounded-3xl p-8 shadow-xl shadow-blue-600/20 lg:col-span-2 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-white text-center md:text-left">
              <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Enviar App a Conductores</h2>
              <p className="text-blue-100 font-medium opacity-80">Usa este link para que los conductores instalen la App en sus celulares.</p>
            </div>
            <button 
              onClick={shareAppLink}
              className="bg-white text-blue-600 font-black px-8 py-4 rounded-2xl flex items-center gap-3 shadow-xl active:scale-95 transition-all uppercase tracking-widest text-sm"
            >
              <MessageSquare className="w-5 h-5" /> Compartir por WhatsApp
            </button>
          </section>

          {activeTab === 'users' ? (
            <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                  <Users className="w-6 h-6 text-blue-600" /> Gestión de Usuarios
                </h2>
                <button 
                  onClick={() => setShowUserModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  <Plus className="w-4 h-4" /> AGREGAR
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.isArray(users) && users.map(user => (
                  <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{user.email} • <span className="uppercase font-black text-blue-600">{user.role}</span></p>
                    </div>
                    <button 
                      onClick={() => deleteUser(user.id)}
                      className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
                  <Globe className="w-6 h-6 text-blue-600" /> Integraciones (n8n / AI Agents)
                </h2>
                <button 
                  onClick={() => setShowIntModal(true)}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-slate-900/20"
                >
                  <Plus className="w-4 h-4" /> AGREGAR
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.isArray(integrations) && integrations.map(int => (
                  <div key={int.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-slate-900">{int.name}</p>
                      <button onClick={() => toggleIntegration(int.id, int.active)}>
                        {int.active ? (
                          <ToggleRight className="w-8 h-8 text-blue-600" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-slate-300" />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 truncate">{int.url}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showUserModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white border border-slate-200 rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-black mb-6 text-slate-900 uppercase tracking-tighter">Nuevo Usuario</h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <input required placeholder="Nombre Completo" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-600 text-slate-900" />
                <input required type="email" placeholder="Correo Electrónico" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-600 text-slate-900" />
                <input required placeholder="Teléfono (Ej: +573001234567)" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-600 text-slate-900" />
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-blue-600 text-slate-900 font-bold">
                  <option value="driver">Conductor</option>
                  <option value="call_center">Call Center</option>
                  <option value="admin">Administrador</option>
                </select>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors">CANCELAR</button>
                  <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">CREAR</button>
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
