import React, { useState, useEffect } from "react";
import { User } from "../types";
import { api } from "../services/api";
import { 
  Users, 
  Truck, 
  Map as MapIcon, 
  RefreshCcw,
  Clock
} from "lucide-react";
import { motion } from "motion/react";

export default function CallCenterDashboard() {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [stats, setStats] = useState({ activeDrivers: 0, inService: 0 });
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [driversData, statsData] = await Promise.all([
        api.getDrivers(),
        api.getAdminStats()
      ]);
      setDrivers(driversData);
      setStats(statsData);
    } catch (error) {
      console.error("Error fetching monitoring data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

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

  if (loading) return <div className="flex justify-center py-20">Cargando Monitoreo...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MapIcon className="w-8 h-8 text-emerald-500" /> Monitoreo Call Center
        </h1>
        <button 
          onClick={fetchData}
          className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold p-3 rounded-xl transition-all"
        >
          <RefreshCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
  );
}
