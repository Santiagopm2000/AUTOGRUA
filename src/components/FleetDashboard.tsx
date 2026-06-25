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
  Phone,
  RefreshCcw
} from "lucide-react";
import { motion } from "motion/react";

export default function FleetDashboard() {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDriver, setSelectedDriver] = useState<User | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
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
          <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900">Flota <span className="text-blue-600">Axistcorp</span></h1>
          <p className="text-slate-500 text-sm font-medium">Estado en tiempo real de todos los conductores</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-2 active:scale-95 disabled:opacity-50 text-xs"
            title="Actualizar datos de flota"
          >
            <RefreshCcw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            <span className="font-black uppercase tracking-wider">Actualizar</span>
          </button>

          <div className="px-4 py-2 bg-white border border-slate-200 rounded-xl flex items-center gap-2 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Live Sync</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.isArray(drivers) && drivers.map((driver) => {
          const config = getStatusConfig(driver.status);
          const Icon = config.icon;

          return (
            <motion.div
              layout
              key={driver.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white border ${config.border.replace('zinc', 'slate')} rounded-[2rem] p-6 shadow-sm transition-all hover:shadow-xl hover:scale-[1.02]`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${config.bg}`}>
                  <Icon className={`w-8 h-8 ${config.color}`} />
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${config.color} mb-1 block`}>
                    {driver.status}
                  </span>
                  <div className="flex items-center gap-1 text-slate-400 text-xs font-mono">
                    <Clock className="w-3 h-3" />
                    {formatElapsed(driver.status_start_time)}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 leading-tight">{driver.name}</h3>
                  <p className="text-slate-500 text-xs font-medium mb-4">{driver.email}</p>
                  
                  {driver.phone && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 flex items-center gap-2">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="text-xs font-mono text-slate-600">{driver.phone}</span>
                      </div>
                      <button 
                        onClick={() => openWhatsApp(driver.phone)}
                        className="p-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20 group"
                        title="Contactar por WhatsApp"
                      >
                        <MessageCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Botón ver Ficha Técnica / Datos Completo */}
                <button
                  onClick={() => setSelectedDriver(driver)}
                  className="w-full bg-slate-50 hover:bg-blue-50 hover:text-blue-600 text-slate-500 py-3 rounded-2xl flex items-center justify-center gap-1.5 transition-all text-[10px] font-black uppercase tracking-wider border border-slate-100 hover:border-blue-150"
                >
                  Ver Ficha de Datos
                </button>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <MapPin className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {driver.last_lat ? `${driver.last_lat.toFixed(4)}, ${driver.last_lng?.toFixed(4)}` : 'Sin Señal'}
                    </span>
                  </div>
                  {driver.last_lat && (
                    <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {drivers.length === 0 && (
        <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-[2rem]">
          <Truck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-400 font-bold uppercase tracking-widest">No hay conductores registrados</p>
        </div>
      )}

      {/* Modal de Detalles del Conductor */}
      {selectedDriver && (
        <div className="fixed inset-0 z-[500] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-md w-full p-8 md:p-10 relative border border-slate-100 animate-in fade-in zoom-in duration-200">
            
            {/* Icon & Title */}
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-100">
                <Truck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Ficha de Conductor</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black mt-0.5">Información Registrada del Colaborador</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Nombre Completo</span>
                <p className="text-sm font-bold text-slate-800">{selectedDriver.name}</p>
              </div>

              <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">ID Único Conductor</span>
                <p className="text-xs font-mono font-bold text-slate-600">{selectedDriver.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Cargo / Rol</span>
                  <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{selectedDriver.role === 'driver' ? 'Conductor' : selectedDriver.role.replace('_', ' ')}</p>
                </div>
                <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Área / Zona</span>
                  <p className="text-xs font-bold text-slate-700">{selectedDriver.area || 'N/A'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Teléfono Fijo</span>
                  <p className="text-xs font-mono font-bold text-slate-700">{selectedDriver.phone || 'No registrado'}</p>
                </div>
                <div className="bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">Móvil / Celular</span>
                  <p className="text-xs font-mono font-bold text-slate-700">{selectedDriver.mobile || 'No registrado'}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setSelectedDriver(null)}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-widest active:scale-95 transition-transform"
            >
              Cerrar Ficha
            </button>

          </div>
        </div>
      )}
    </div>
  );
}
