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
  const [elapsed, setElapsed] = useState("00:00:00");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Timer logic
  useEffect(() => {
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
  }, [statusStartTime]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(newLoc);
          // Update location on server periodically if not offline
          if (status !== 'TERMINE TURNO') {
            api.updateStatus(user.id, status, newLoc.lat, newLoc.lng);
          }
        },
        (err) => console.error("Geolocation error:", err),
        { enableHighAccuracy: true }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [status, user.id]);

  const handleStatusChange = async (newStatus: UserStatus) => {
    setStatus(newStatus);
    setStatusStartTime(new Date());
    await api.updateStatus(user.id, newStatus, location?.lat, location?.lng);
  };

  const statusConfigs: Record<UserStatus, { icon: any, color: string, label: string }> = {
    'DISPONIBLE': { icon: Play, color: 'bg-emerald-500', label: 'Disponible' },
    'EN SERVICIO': { icon: Truck, color: 'bg-blue-500', label: 'En Servicio' },
    'MANTENIMIENTO': { icon: Wrench, color: 'bg-amber-500', label: 'Mantenimiento' },
    'TERMINE TURNO': { icon: LogOut, color: 'bg-zinc-600', label: 'Turno Terminado' }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Current State Timer - High Contrast */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl text-center">
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">Tiempo en Estado Actual</h2>
        <div className="text-6xl font-black text-white tabular-nums tracking-tighter mb-4">
          {elapsed}
        </div>
        <div className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest",
          statusConfigs[status].color,
          "text-zinc-950"
        )}>
          {statusConfigs[status].label}
        </div>
      </section>

      {/* State Selection Grid */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-4 px-2">Cambiar Estado</h2>
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
                  "flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all active:scale-95",
                  isActive 
                    ? cn("border-white bg-white text-zinc-950 shadow-lg")
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
                )}
              >
                <Icon className={cn("w-10 h-10 mb-3", isActive ? "text-zinc-950" : "text-zinc-500")} />
                <span className="font-black text-sm uppercase tracking-tight leading-tight text-center">
                  {config.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Location Status */}
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-3 h-3 rounded-full animate-pulse",
            location ? "bg-emerald-500" : "bg-red-500"
          )} />
          <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
            {location ? "GPS Activo" : "Buscando GPS..."}
          </span>
        </div>
        {location && (
          <span className="text-[10px] font-mono text-zinc-600">
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </span>
        )}
      </section>
    </div>
  );
}
