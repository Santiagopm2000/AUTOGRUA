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
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="w-8 h-8 text-emerald-500" /> Panel de Configuración
        </h1>
        <button 
          onClick={fetchData}
          className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold p-3 rounded-xl transition-all"
        >
          <RefreshCcw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* User Management */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-500" /> Gestión de Usuarios
            </h2>
            <button 
              onClick={() => setShowUserModal(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> AGREGAR
            </button>
          </div>

          <div className="space-y-4">
            {users.map(user => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/30">
                <div>
                  <p className="font-bold">{user.name}</p>
                  <p className="text-xs text-zinc-500">{user.email} • <span className="uppercase">{user.role}</span></p>
                </div>
                <button 
                  onClick={() => deleteUser(user.id)}
                  className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Integrations Management */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Globe className="w-6 h-6 text-blue-500" /> Integraciones (n8n)
            </h2>
            <button 
              onClick={() => setShowIntModal(true)}
              className="bg-blue-500 hover:bg-blue-400 text-zinc-950 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> AGREGAR
            </button>
          </div>

          <div className="space-y-4">
            {integrations.map(int => (
              <div key={int.id} className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold">{int.name}</p>
                  <button onClick={() => toggleIntegration(int.id, int.active)}>
                    {int.active ? (
                      <ToggleRight className="w-8 h-8 text-emerald-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-zinc-600" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] font-mono text-zinc-500 truncate">{int.url}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showUserModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-bold mb-6">Nuevo Usuario</h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <input required placeholder="Nombre Completo" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
                <input required type="email" placeholder="Correo Electrónico" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
                <input required placeholder="Teléfono (Ej: +573001234567)" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500">
                  <option value="driver">Conductor</option>
                  <option value="call_center">Call Center</option>
                  <option value="admin">Administrador</option>
                </select>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 bg-zinc-800 py-3 rounded-xl font-bold">CANCELAR</button>
                  <button type="submit" className="flex-1 bg-emerald-500 text-zinc-950 py-3 rounded-xl font-bold">CREAR</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showIntModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-bold mb-6">Nueva Integración</h2>
              <form onSubmit={handleCreateInt} className="space-y-4">
                <input required placeholder="Nombre (Ej: n8n WhatsApp)" value={newInt.name} onChange={e => setNewInt({...newInt, name: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
                <input required placeholder="Webhook URL" value={newInt.url} onChange={e => setNewInt({...newInt, url: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowIntModal(false)} className="flex-1 bg-zinc-800 py-3 rounded-xl font-bold">CANCELAR</button>
                  <button type="submit" className="flex-1 bg-blue-500 text-zinc-950 py-3 rounded-xl font-bold">GUARDAR</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
