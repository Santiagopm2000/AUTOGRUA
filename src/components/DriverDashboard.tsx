import React, { useState, useEffect, useCallback } from "react";
import { User, UserStatus } from "../types";
import { api } from "../services/api";
import { 
  MapPin, 
  Clock, 
  Power,
  Wrench,
  Truck,
  LogOut,
  Play
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DriverDashboardProps {
  user: User;
}

export default function DriverDashboard({ user }: DriverDashboardProps) {
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [statusStartTime, setStatusStartTime] = useState<Date>(new Date(user.status_start_time || Date.now()));
  const [shiftStartTime, setShiftStartTime] = useState<Date | null>(
    user.shift_start_time ? new Date(user.shift_start_time) : 
    (user.status !== 'TERMINE TURNO' ? new Date(user.status_start_time || Date.now()) : null)
  );
  const [elapsed, setElapsed] = useState("00:00:00");
  const [totalShiftTime, setTotalShiftTime] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Initialize total shift time if already finished
  useEffect(() => {
    if (user.status === 'TERMINE TURNO' && user.shift_start_time && user.status_start_time) {
      const start = new Date(user.shift_start_time);
      const end = new Date(user.status_start_time);
      const diff = end.getTime() - start.getTime();
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTotalShiftTime(`${hours}h ${minutes}m ${seconds}s`);
    }
  }, [user]);

  // Timer logic
  useEffect(() => {
    if (status === 'TERMINE TURNO') return;

    const interval = setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - statusStartTime.getTime();
      
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      setElapsed(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [statusStartTime, status]);

  const startTracking = useCallback(() => {
    if ("geolocation" in navigator) {
      setGeoError(null);
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(newLoc);
          setGeoError(null);
          // Update location on server periodically if not offline
          if (status !== 'TERMINE TURNO') {
            api.updateStatus(user.id, status, newLoc.lat, newLoc.lng);
          }
        },
        (err) => {
          console.error("Geolocation error:", err);
          if (err.code === 1) {
            setGeoError("Permiso de ubicación denegado. Es obligatorio para operar.");
          } else {
            setGeoError("Error al obtener ubicación. Revisa tu GPS.");
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      return watchId;
    } else {
      setGeoError("Tu dispositivo no soporta geolocalización.");
      return null;
    }
  }, [status, user.id]);

  useEffect(() => {
    const watchId = startTracking();
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [startTracking]);

  const handleStatusChange = async (newStatus: UserStatus) => {
    const now = new Date();
    let currentShiftStart = shiftStartTime;
    
    // If starting a shift
    if (status === 'TERMINE TURNO' && newStatus !== 'TERMINE TURNO') {
      currentShiftStart = now;
      setShiftStartTime(now);
      setTotalShiftTime(null);
    }
    
    // If ending a shift
    if (newStatus === 'TERMINE TURNO' && currentShiftStart) {
      const diff = now.getTime() - currentShiftStart.getTime();
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTotalShiftTime(`${hours}h ${minutes}m ${seconds}s`);
    }

    setStatus(newStatus);
    setStatusStartTime(now);
    await api.updateStatus(
      user.id, 
      newStatus, 
      location?.lat, 
      location?.lng, 
      currentShiftStart?.toISOString()
    );
  };

  const statusConfigs: Record<UserStatus, { icon: any, color: string, label: string, textColor: string }> = {
    'DISPONIBLE': { icon: Play, color: 'bg-emerald-500', label: 'Disponible', textColor: 'text-white' },
    'EN SERVICIO': { icon: Truck, color: 'bg-blue-600', label: 'En Servicio', textColor: 'text-white' },
    'MANTENIMIENTO': { icon: Wrench, color: 'bg-amber-500', label: 'Mantenimiento', textColor: 'text-white' },
    'TERMINE TURNO': { icon: LogOut, color: 'bg-slate-400', label: 'Turno Terminado', textColor: 'text-white' }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Current State Timer - High Contrast */}
      <section className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm text-center">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">
          {status === 'TERMINE TURNO' ? 'Resumen de Turno' : 'Tiempo en Estado Actual'}
        </h2>
        
        {status === 'TERMINE TURNO' && totalShiftTime ? (
          <div className="space-y-2 mb-6">
            <div className="text-5xl font-black text-emerald-600 tracking-tighter">
              {totalShiftTime}
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total de jornada hoy</p>
          </div>
        ) : (
          <div className="text-7xl font-black text-slate-900 tabular-nums tracking-tighter mb-6">
            {elapsed}
          </div>
        )}

        <div className={cn(
          "inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg",
          statusConfigs[status].color,
          statusConfigs[status].textColor
        )}>
          {statusConfigs[status].label}
        </div>
      </section>

      {/* State Selection Grid */}
      <section>
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-4">Cambiar Estado Operativo</h2>
        <div className="grid grid-cols-2 gap-4">
          {(Object.keys(statusConfigs) as UserStatus[]).map((s) => {
            const config = statusConfigs[s];
            const Icon = config.icon;
            const isActive = status === s;
            
            return (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={cn(
                  "flex flex-col items-center justify-center p-8 rounded-[2rem] border-2 transition-all active:scale-95 shadow-sm",
                  isActive 
                    ? cn("border-blue-600 bg-blue-600 text-white shadow-xl shadow-blue-600/20")
                    : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                )}
              >
                <Icon className={cn("w-12 h-12 mb-4", isActive ? "text-white" : "text-slate-300")} />
                <span className="font-black text-xs uppercase tracking-tight leading-tight text-center">
                  {config.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Location Status */}
      <section className={cn(
        "border rounded-2xl p-5 shadow-sm transition-colors",
        geoError ? "bg-red-50 border-red-200" : "bg-white border-slate-200"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-3 h-3 rounded-full animate-pulse",
              location ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
            )} />
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              geoError ? "text-red-600" : "text-slate-400"
            )}>
              {geoError || (location ? "GPS Activo" : "Buscando GPS...")}
            </span>
          </div>
          {location && !geoError && (
            <span className="text-[10px] font-mono text-slate-300 font-bold">
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </span>
          )}
          {geoError && (
            <button 
              onClick={() => window.location.reload()}
              className="text-[10px] font-black uppercase bg-red-600 text-white px-3 py-1 rounded-lg"
            >
              Reintentar
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
