import React, { useState, useEffect } from "react";
import { User } from "../types";
import { api } from "../services/api";
import { 
  Truck, 
  Clock, 
  MapPin, 
  AlertCircle,
  CheckCircle2,
  Wrench,
  Moon,
  MessageCircle,
  Phone
} from "lucide-react";
import { motion } from "motion/react";

export default function FleetDashboard() {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const data = await api.getDrivers();
      setDrivers(data);
    } catch (error) {
      console.error("Error fetching fleet data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const openWhatsApp = (phone?: string) => {
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'DISPONIBLE': 
        return { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 };
      case 'EN SERVICIO': 
        return { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: AlertCircle };
      case 'MANTENIMIENTO': 
        return { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Wrench };
      case 'TERMINE TURNO': 
        return { color: 'text-zinc-500', bg: 'bg-zinc-500/10', border: 'border-zinc-500/20', icon: Moon };
      default: 
        return { color: 'text-zinc-400', bg: 'bg-zinc-400/10', border: 'border-zinc-400/20', icon: Truck };
    }
  };

  const formatElapsed = (startTime?: string) => {
    if (!startTime) return "00:00:00";
    const start = new Date(startTime);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="flex justify-center py-20 text-zinc-500 font-bold tracking-widest uppercase">Cargando Flota...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase">Panel de Flota</h1>
          <p className="text-zinc-500 text-sm font-medium">Estado en tiempo real de todos los conductores</p>
        </div>
        <div className="flex gap-2">
          <div className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Live Sync</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {drivers.map((driver) => {
          const config = getStatusConfig(driver.status);
          const Icon = config.icon;

          return (
            <motion.div
              layout
              key={driver.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-zinc-900 border ${config.border} rounded-[2rem] p-6 shadow-xl transition-all hover:scale-[1.02]`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${config.bg}`}>
                  <Icon className={`w-8 h-8 ${config.color}`} />
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${config.color} mb-1 block`}>
                    {driver.status}
                  </span>
                  <div className="flex items-center gap-1 text-zinc-500 text-xs font-mono">
                    <Clock className="w-3 h-3" />
                    {formatElapsed(driver.status_start_time)}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-white leading-tight">{driver.name}</h3>
                  <p className="text-zinc-500 text-xs font-medium mb-4">{driver.email}</p>
                  
                  {driver.phone && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex-1 bg-zinc-800/50 border border-zinc-700/30 rounded-xl px-3 py-2 flex items-center gap-2">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        <span className="text-xs font-mono text-zinc-300">{driver.phone}</span>
                      </div>
                      <button 
                        onClick={() => openWhatsApp(driver.phone)}
                        className="p-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-xl transition-all shadow-lg shadow-emerald-500/20 group"
                        title="Contactar por WhatsApp"
                      >
                        <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <MapPin className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {driver.last_lat ? `${driver.last_lat.toFixed(4)}, ${driver.last_lng?.toFixed(4)}` : 'Sin Señal'}
                    </span>
                  </div>
                  {driver.last_lat && (
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {drivers.length === 0 && (
        <div className="text-center py-20 bg-zinc-900/50 border border-dashed border-zinc-800 rounded-[2rem]">
          <Truck className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest">No hay conductores registrados</p>
        </div>
      )}
    </div>
  );
}
