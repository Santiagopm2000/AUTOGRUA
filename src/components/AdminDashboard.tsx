import React, { useState, useEffect } from "react";
import { User, Integration } from "../types";
import { api } from "../services/api";
import { 
  Users, 
  Truck, 
  Map as MapIcon, 
  Plus, 
  Settings,
  RefreshCcw,
  Trash2,
  Globe,
  ToggleLeft,
  ToggleRight,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function AdminDashboard() {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [stats, setStats] = useState({ activeDrivers: 0, inService: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'monitor' | 'config'>('monitor');
  
  // User creation state
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", role: "driver" });
  
  // Integration creation state
  const [showIntModal, setShowIntModal] = useState(false);
  const [newInt, setNewInt] = useState({ name: "", url: "" });

  const fetchData = async () => {
    try {
      const [driversData, statsData, integrationsData] = await Promise.all([
        api.getDrivers(),
        api.getAdminStats(),
        api.getIntegrations()
      ]);
      setDrivers(driversData);
      setStats(statsData);
      setIntegrations(integrationsData);
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.createUser(newUser);
    setShowUserModal(false);
    setNewUser({ name: "", email: "", role: "driver" });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DISPONIBLE': return 'bg-emerald-500';
      case 'EN SERVICIO': return 'bg-blue-500';
      case 'MANTENIMIENTO': return 'bg-amber-500';
      default: return 'bg-zinc-600';
    }
  };

  const formatElapsed = (startTime?: string) => {
    if (!startTime) return "00:00";
    const start = new Date(startTime);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  if (loading) return <div className="flex justify-center py-20">Cargando Panel...</div>;

  return (
    <div className="space-y-8">
      {/* Tab Navigation */}
      <div className="flex gap-2 bg-zinc-900 p-1 rounded-2xl w-fit border border-zinc-800">
        <button 
          onClick={() => setActiveTab('monitor')}
          className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'monitor' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          MONITOREO
        </button>
        <button 
          onClick={() => setActiveTab('config')}
          className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${activeTab === 'config' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          CONFIGURACIÓN
        </button>
      </div>

      {activeTab === 'monitor' ? (
        <div className="space-y-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-emerald-500/10 rounded-2xl">
                  <Truck className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="text-zinc-400 font-bold uppercase text-xs tracking-widest">Disponibles</h3>
              </div>
              <p className="text-4xl font-black text-white">{stats.activeDrivers}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-blue-500/10 rounded-2xl">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-zinc-400 font-bold uppercase text-xs tracking-widest">En Servicio</h3>
              </div>
              <p className="text-4xl font-black text-white">{stats.inService}</p>
            </div>

            <div className="flex items-end justify-end">
              <button 
                onClick={fetchData}
                className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold p-4 rounded-2xl transition-all"
              >
                <RefreshCcw className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Real-time Map Simulation */}
            <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden min-h-[500px] relative">
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="w-full h-full bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:40px_40px]" />
              </div>

              <div className="relative w-full h-full flex items-center justify-center">
                {drivers.map((driver, idx) => (
                  <motion.div
                    key={driver.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute"
                    style={{
                      left: `${20 + (idx * 15)}%`,
                      top: `${30 + (idx * 12)}%`
                    }}
                  >
                    <div className="group relative">
                      <div className={`w-12 h-12 rounded-full border-4 ${getStatusColor(driver.status).replace('bg-', 'border-')} bg-zinc-900 flex items-center justify-center shadow-lg`}>
                        <Truck className={`w-6 h-6 ${getStatusColor(driver.status).replace('bg-', 'text-')}`} />
                      </div>
                      
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 shadow-2xl min-w-[150px]">
                          <p className="font-bold text-sm">{driver.name}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{driver.status}</p>
                          <p className="text-[10px] text-zinc-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatElapsed(driver.status_start_time)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Driver List with Timers */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 overflow-y-auto max-h-[500px]">
              <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-500 mb-6 flex items-center gap-2">
                <Users className="w-4 h-4" /> Conductores
              </h3>
              <div className="space-y-4">
                {drivers.map(driver => (
                  <div key={driver.id} className="bg-zinc-800/50 border border-zinc-700/50 rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(driver.status)}`} />
                        <p className="font-bold text-sm">{driver.name}</p>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-2 py-1 rounded-md">
                        {formatElapsed(driver.status_start_time)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                      <span>{driver.status}</span>
                      {driver.last_lat && (
                        <span className="flex items-center gap-1 text-emerald-500">
                          <MapIcon className="w-3 h-3" /> GPS OK
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Management */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-6 h-6 text-emerald-500" /> Usuarios
              </h2>
              <button 
                onClick={() => setShowUserModal(true)}
                className="bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> AGREGAR
              </button>
            </div>

            <div className="space-y-4">
              {drivers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/30">
                  <div>
                    <p className="font-bold">{user.name}</p>
                    <p className="text-xs text-zinc-500">{user.email}</p>
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
      )}

      {/* Modals */}
      <AnimatePresence>
        {showUserModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-bold mb-6">Nuevo Usuario</h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <input required placeholder="Nombre Completo" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
                <input required type="email" placeholder="Correo Electrónico" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500" />
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-emerald-500">
                  <option value="driver">Conductor</option>
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
