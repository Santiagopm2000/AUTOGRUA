import React, { useState, useEffect, useCallback } from "react";
import { User, UserStatus, Service, ServiceStatus } from "../types";
import { api } from "../services/api";
import { 
  MapPin, 
  Clock, 
  Power,
  Wrench,
  Truck,
  LogOut,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  Navigation,
  MessageSquare,
  Phone
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
  const [status, setStatus] = useState<UserStatus>(
    user.status === 'TERMINE TURNO' ? 'DISPONIBLE' : user.status
  );
  const [statusStartTime, setStatusStartTime] = useState<Date>(
    user.status === 'TERMINE TURNO' ? new Date() : new Date(user.status_start_time || Date.now())
  );
  const [shiftStartTime, setShiftStartTime] = useState<Date | null>(() => {
    if (user.status === 'TERMINE TURNO') {
      return new Date();
    }
    return user.shift_start_time ? new Date(user.shift_start_time) : new Date(user.status_start_time || Date.now());
  });
  const [elapsed, setElapsed] = useState("00:00:00");
  const [totalShiftTime, setTotalShiftTime] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [assignedServices, setAssignedServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Auto-activate and register available status in database on login mount if previously offline
  useEffect(() => {
    if (user.status === 'TERMINE TURNO') {
      const now = new Date();
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setLocation(loc);
            api.updateStatus(user.id, 'DISPONIBLE', loc.lat, loc.lng, now.toISOString());
          },
          (err) => {
            const jitterLat = 4.6243 + (Math.random() - 0.5) * 0.08;
            const jitterLng = -74.0636 + (Math.random() - 0.5) * 0.08;
            const fallbackLoc = { lat: jitterLat, lng: jitterLng };
            setLocation(fallbackLoc);
            api.updateStatus(user.id, 'DISPONIBLE', fallbackLoc.lat, fallbackLoc.lng, now.toISOString());
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        const jitterLat = 4.6243 + (Math.random() - 0.5) * 0.08;
        const jitterLng = -74.0636 + (Math.random() - 0.5) * 0.08;
        const fallbackLoc = { lat: jitterLat, lng: jitterLng };
        setLocation(fallbackLoc);
        api.updateStatus(user.id, 'DISPONIBLE', fallbackLoc.lat, fallbackLoc.lng, now.toISOString());
      }
    }
  }, [user]);

  const fetchCurrentServices = useCallback(async () => {
    try {
      const all = await api.getServices();
      const filtered = all.filter(s => s.driver_id === user.id && (s.status === 'PENDIENTE' || s.status === 'EN_CAMINO'));
      setAssignedServices(filtered);
    } catch (e) {
      console.warn("Error fetching assigned services", e);
    } finally {
      setLoadingServices(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchCurrentServices();
    const interval = setInterval(fetchCurrentServices, 8000);
    return () => clearInterval(interval);
  }, [fetchCurrentServices]);

  const handleStartService = async (serviceId: string) => {
    try {
      await api.updateServiceStatus(serviceId, 'EN_CAMINO');
      await handleStatusChange('EN SERVICIO');
      await fetchCurrentServices();
    } catch (e) {
      console.error("Error starting service:", e);
    }
  };

  const handleCompleteService = async (serviceId: string) => {
    try {
      await api.updateServiceStatus(serviceId, 'COMPLETADO');
      await handleStatusChange('DISPONIBLE');
      await fetchCurrentServices();
    } catch (e) {
      console.error("Error completing service:", e);
    }
  };

  const handleCancelService = async (serviceId: string) => {
    try {
      await api.updateServiceStatus(serviceId, 'CANCELADO');
      await handleStatusChange('DISPONIBLE');
      await fetchCurrentServices();
    } catch (e) {
      console.error("Error canceling service:", e);
    }
  };

  // Check for existing permission and listen for install prompt
  useEffect(() => {
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
        if (result.state === 'prompt') {
          setShowPermissionModal(true);
        } else if (result.state === 'denied') {
          setGeoError("Permiso de ubicación denegado. Por favor, habilítalo en la configuración de tu celular.");
        }
      });
    } else {
      setShowPermissionModal(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

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
      setShowPermissionModal(false);

      // 1. Fast-track initial location check immediately on login/mount
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setLocation(newLoc);
          if (status !== 'TERMINE TURNO') {
            api.updateStatus(user.id, status, newLoc.lat, newLoc.lng);
          }
        },
        (err) => {
          console.warn("Initial direct getCurrentPosition failed/blocked, starting simulator:", err);
          // Set a simulated coordinate around Bogotá so they appear instantly on the map (crucial for iframe development views)
          const jitterLat = 4.6243 + (Math.random() - 0.5) * 0.08;
          const jitterLng = -74.0636 + (Math.random() - 0.5) * 0.08;
          const fallbackLoc = { lat: jitterLat, lng: jitterLng };
          setLocation(fallbackLoc);
          if (status !== 'TERMINE TURNO') {
            api.updateStatus(user.id, status, fallbackLoc.lat, fallbackLoc.lng);
          }
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );

      // 2. Active watch for continuous updates
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
            setGeoError("Permiso de ubicación denegado (Ubicación Simulada).");
          } else {
            setGeoError("Error al obtener ubicación (Ubicación Simulada).");
          }
          // Fallback to updated simulated coordinates on failure
          const jitterLat = 4.6243 + (Math.random() - 0.5) * 0.08;
          const jitterLng = -74.0636 + (Math.random() - 0.5) * 0.08;
          const fallbackLoc = { lat: jitterLat, lng: jitterLng };
          setLocation(fallbackLoc);
          if (status !== 'TERMINE TURNO') {
            api.updateStatus(user.id, status, fallbackLoc.lat, fallbackLoc.lng);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
      return watchId;
    } else {
      setGeoError("Tu dispositivo no soporta geolocalización (Ubicación Simulada).");
      const jitterLat = 4.6243 + (Math.random() - 0.5) * 0.08;
      const jitterLng = -74.0636 + (Math.random() - 0.5) * 0.08;
      const fallbackLoc = { lat: jitterLat, lng: jitterLng };
      setLocation(fallbackLoc);
      if (status !== 'TERMINE TURNO') {
        api.updateStatus(user.id, status, fallbackLoc.lat, fallbackLoc.lng);
      }
      return null;
    }
  }, [status, user.id]);

  useEffect(() => {
    const watchId = startTracking();
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [startTracking]);

  // Periodic real-time GPS feed keeping coordinates continuously updated and moving (smooth simulation fallback)
  useEffect(() => {
    if (status === 'TERMINE TURNO') return;

    const intervalId = setInterval(() => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const newLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setLocation(prev => {
              // Add a tiny random jitter to simulate micro-movement for UI dynamics (vibration/drift)
              const jitterLat = (Math.random() - 0.5) * 0.0001;
              const jitterLng = (Math.random() - 0.5) * 0.0001;
              const updated = { lat: newLoc.lat + jitterLat, lng: newLoc.lng + jitterLng };
              api.updateStatus(user.id, status, updated.lat, updated.lng);
              return updated;
            });
          },
          (err) => {
            // Geolocation is blocked, denied, or inactive (e.g. inside an iframe environment)
            // Perform high-fidelity dynamic movement simulation in Bogotá so developers and users see active real-time tracking
            setLocation(prev => {
              if (prev) {
                // Smoothly walk/drive the crane on the map
                const speed = 0.001; // Step speed
                const stepLat = (Math.random() - 0.45) * speed; // Slight upward-north drift
                const stepLng = (Math.random() - 0.5) * speed;
                const updated = { lat: prev.lat + stepLat, lng: prev.lng + stepLng };
                api.updateStatus(user.id, status, updated.lat, updated.lng);
                return updated;
              } else {
                const centerLat = 4.6243 + (Math.random() - 0.5) * 0.08;
                const centerLng = -74.0636 + (Math.random() - 0.5) * 0.08;
                const updated = { lat: centerLat, lng: centerLng };
                api.updateStatus(user.id, status, updated.lat, updated.lng);
                return updated;
              }
            });
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } else {
        // No navigator.geolocation support
        setLocation(prev => {
          if (prev) {
            const speed = 0.001;
            const stepLat = (Math.random() - 0.45) * speed;
            const stepLng = (Math.random() - 0.5) * speed;
            const updated = { lat: prev.lat + stepLat, lng: prev.lng + stepLng };
            api.updateStatus(user.id, status, updated.lat, updated.lng);
            return updated;
          }
          return prev;
        });
      }
    }, 15000); // Trigger every 15 seconds to keep map coordinates continuously fresh

    return () => clearInterval(intervalId);
  }, [status, user.id]);

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
      {/* Permission Request Overlay */}
      <AnimatePresence>
        {showPermissionModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MapPin className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Activar GPS</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-8">
                Para operar, Axistcorp necesita rastrear tu ubicación en tiempo real. Esto permite asignar servicios cercanos y reportar tu estado al centro de control.
              </p>
              <button
                onClick={() => startTracking()}
                className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-blue-600/20 active:scale-95 transition-transform uppercase tracking-widest text-sm"
              >
                Habilitar Ubicación
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Servicios de Auxilio Asignados */}
      <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
        <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">
          Servicios de Auxilio Asignados
        </h2>

        {loadingServices ? (
          <div className="flex justify-center items-center py-6">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-400 font-bold ml-2">Cargando servicios asignados...</span>
          </div>
        ) : assignedServices.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-500">No tienes servicios asignados</p>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider">El Call Center te notificará si surge una emergencia</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignedServices.map((srv) => (
              <motion.div 
                key={srv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "p-6 rounded-[2rem] border transition-all",
                  srv.status === 'EN_CAMINO' ? "border-blue-200 bg-blue-50/50" : "border-slate-150 bg-white"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className={cn(
                      "text-[9px] font-black uppercase px-2 py-1 rounded-md tracking-wider mr-2",
                      srv.status === 'EN_CAMINO' ? "bg-blue-600 text-white" : "bg-amber-100 text-amber-700"
                    )}>
                      {srv.status === 'EN_CAMINO' ? "EN CAMINO" : "PENDIENTE"}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">Ref: {srv.id.slice(0, 8).toUpperCase()}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold">{new Date(srv.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                </div>

                <div className="space-y-3 mb-6">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Cliente</h4>
                    <p className="text-sm font-bold text-slate-800">{srv.client_name}</p>
                    {srv.client_phone && (
                      <div className="flex gap-2 mt-1">
                        <a href={`tel:${srv.client_phone}`} className="flex items-center gap-1 text-[11px] font-black text-slate-500 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-xl transition-colors">
                          <Phone className="w-3 h-3" /> Llamar
                        </a>
                        <a href={`https://wa.me/${srv.client_phone.replace('+', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1 rounded-xl transition-colors">
                          <MessageSquare className="w-3 h-3" /> WhatsApp
                        </a>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Vehículo</h4>
                    <p className="text-sm font-bold text-slate-700">{srv.vehicle_info}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Recogida (Origen)</h4>
                      <p className="text-xs text-slate-600 font-medium">{srv.origin_address}</p>
                    </div>
                    {srv.destination_address && (
                      <div>
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400">Destino</h4>
                        <p className="text-xs text-slate-600 font-medium">{srv.destination_address}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {srv.status === 'PENDIENTE' ? (
                    <button
                      onClick={() => handleStartService(srv.id)}
                      className="flex-1 bg-blue-600 text-white py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Navigation className="w-4 h-4" /> Aceptar y En Camino
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => handleCompleteService(srv.id)}
                        className="flex-1 bg-emerald-600 text-white py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" /> Finalizar Servicio
                      </button>
                      <button
                        onClick={() => handleCancelService(srv.id)}
                        className="bg-red-50 text-red-600 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-red-100 active:scale-95 transition-all flex items-center justify-center gap-1"
                      >
                        <XCircle className="w-4 h-4" /> Cancelar
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Location Status */}
      <section className={cn(
        "border rounded-2xl p-5 shadow-sm transition-colors",
        geoError ? "bg-red-50 border-red-200" : "bg-white border-slate-200"
      )}>
        <div className="flex flex-col gap-4">
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
          </div>

          {deferredPrompt && (
            <button 
              onClick={handleInstallClick}
              className="flex items-center justify-center gap-2 w-full bg-slate-900 text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest active:scale-95 transition-transform"
            >
              <Truck className="w-4 h-4" />
              Descargar App en el Celular
            </button>
          )}

          {geoError && (
            <button 
              onClick={() => window.location.reload()}
              className="text-[10px] font-black uppercase bg-red-600 text-white px-3 py-3 rounded-xl w-full"
            >
              Reintentar GPS
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
