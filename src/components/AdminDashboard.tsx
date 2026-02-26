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
  ToggleRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  
  // User creation state
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", phone: "", role: "driver" });
  
  // Integration creation state
  const [showIntModal, setShowIntModal] = useState(false);
  const [newInt, setNewInt] = useState({ name: "", url: "" });

  const fetchData = async () => {
    try {
      const [usersData, integrationsData] = await Promise.all([
        api.getAllUsers(),
        api.getIntegrations()
      ]);
      setUsers(usersData);
      setIntegrations(integrationsData);
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

  if (loading) return <div className="flex justify-center py-20">Cargando Panel Administrativo...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black flex items-center gap-2 text-slate-900 uppercase tracking-tighter">
          <Settings className="w-8 h-8 text-blue-600" /> Configuración <span className="text-blue-600">Axistcorp</span>
        </h1>
        <button 
          onClick={fetchData}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold p-3 rounded-xl transition-all shadow-sm"
        >
          <RefreshCcw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Management */}
        <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
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

          <div className="space-y-4">
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

        {/* Integrations Management */}
        <section className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
              <Globe className="w-6 h-6 text-blue-600" /> Integraciones (n8n)
            </h2>
            <button 
              onClick={() => setShowIntModal(true)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 shadow-lg shadow-slate-900/20"
            >
              <Plus className="w-4 h-4" /> AGREGAR
            </button>
          </div>

          <div className="space-y-4">
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
      </div>

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
