import React, { useState, useEffect, useRef } from "react";
import { User, Integration, Service, ServiceStatus } from "../types";
import { api } from "../services/api";
import { 
  Users, 
  Truck, 
  Map as MapIcon, 
  RefreshCcw,
  Clock,
  MessageSquare,
  ExternalLink,
  Plus,
  ClipboardList,
  CheckCircle,
  AlertCircle,
  Phone
} from "lucide-react";
import { motion } from "motion/react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for Leaflet default icon issues in Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Helper component to center map on drivers (centers once on initial load to prevent interrupting manual exploration)
function MapRecenter({ drivers }: { drivers: User[] }) {
  const map = useMap();
  const hasCentered = useRef(false);

  useEffect(() => {
    if (drivers.length > 0 && !hasCentered.current) {
      // Filter out drivers with inactive GPS or ended shifts (TERMINE TURNO)
      const validDrivers = drivers.filter(d => d.last_lat && d.last_lng && d.status !== 'TERMINE TURNO');
      if (validDrivers.length > 0) {
        const bounds = L.latLngBounds(validDrivers.map(d => [d.last_lat!, d.last_lng!] as [number, number]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        hasCentered.current = true;
      }
    }
  }, [drivers, map]);
  return null;
}

export default function CallCenterDashboard() {
  const [drivers, setDrivers] = useState<User[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [stats, setStats] = useState({ activeDrivers: 0, inService: 0 });
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [activeTab, setActiveTab] = useState<'drivers' | 'services'>('drivers');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [newService, setNewService] = useState({
    driver_id: '',
    client_name: '',
    client_phone: '',
    vehicle_info: '',
    origin_address: '',
    destination_address: ''
  });

  // State for logs, refresh feedback, and notifications
  const [driverLogs, setDriverLogs] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error"; show: boolean }>({
    message: "",
    type: "success",
    show: false
  });

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type, show: true });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 6000);
  };

  const formatDurationSeconds = (seconds?: number | null) => {
    if (seconds === undefined || seconds === null) return "--";
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m ${secs}s`;
  };

  const fetchData = async () => {
    try {
      const [driversData, statsData, integrationsData, servicesData, logsData] = await Promise.all([
        api.getDrivers(),
        api.getAdminStats(),
        api.getIntegrations(),
        api.getServices(),
        api.getDriverStatusLogs()
      ]);
      setDrivers(driversData || []);
      setStats(statsData || { activeDrivers: 0, inService: 0 });
      setIntegrations((integrationsData || []).filter(i => i.active));
      setServices(servicesData || []);
      setDriverLogs(logsData || []);
    } catch (error) {
      console.error("Error fetching monitoring data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchData();
    setTimeout(() => {
      setIsRefreshing(false);
      showNotification("¡Actualizado! Ubicaciones GPS, traza de estados y servicios de los conductores validados con éxito.", "success");
    }, 800);
  };

  const handleCreateServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.client_name || !newService.vehicle_info || !newService.origin_address) {
      alert("Por favor completa los campos obligatorios (Nombre, Vehículo, Origen)");
      return;
    }
    setSavingService(true);
    try {
      await api.createService({
        driver_id: newService.driver_id || null,
        client_name: newService.client_name,
        client_phone: newService.client_phone || undefined,
        vehicle_info: newService.vehicle_info,
        origin_address: newService.origin_address,
        destination_address: newService.destination_address || undefined
      });
      
      // Reset form
      setNewService({
        driver_id: '',
        client_name: '',
        client_phone: '',
        vehicle_info: '',
        origin_address: '',
        destination_address: ''
      });
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      console.error("Error creating service:", err);
    } finally {
      setSavingService(false);
    }
  };

  const handleOperatorCancelService = async (serviceId: string) => {
    try {
      await api.updateServiceStatus(serviceId, 'CANCELADO');
      fetchData();
    } catch (err) {
      console.error("Error canceling service:", err);
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

  const handleWhatsApp = async (driver: User) => {
    // 1. Open WhatsApp directly
    const phone = driver.phone?.replace(/\D/g, '');
    const message = encodeURIComponent(`Hola ${driver.name}, te contactamos de la central Axistcorp. ¿Cuál es tu estado actual?`);
    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
    
    // 2. Trigger n8n integrations if they exist
    const n8nIntegrations = integrations.filter(i => i.name.toLowerCase().includes('n8n') || i.url.includes('n8n'));
    
    for (const integration of n8nIntegrations) {
      try {
        await fetch(integration.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'whatsapp_contact',
            driver_id: driver.id,
            driver_name: driver.name,
            driver_phone: driver.phone,
            timestamp: new Date().toISOString()
          })
        });
      } catch (err) {
        console.error(`Error triggering integration ${integration.name}:`, err);
      }
    }

    window.open(whatsappUrl, '_blank');
  };

  if (loading) return <div className="flex justify-center py-20">Cargando Monitoreo...</div>;

  return (
    <div className="space-y-8 relative">
      {/* Toast Notification for manual refresh validation */}
      {notification.show && (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-md p-4 rounded-3xl shadow-2xl border flex items-start gap-3 bg-slate-900 border-slate-800 text-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="mt-0.5 bg-white/10 p-1.5 rounded-xl">
            <Clock className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 space-y-0.5">
            <h5 className="font-black text-xs uppercase tracking-wider text-white">Validación de Estado</h5>
            <p className="text-[11px] font-bold leading-normal text-slate-300">
              {notification.message}
            </p>
          </div>
          <button 
            onClick={() => setNotification(prev => ({ ...prev, show: false }))}
            className="text-xs font-black cursor-pointer hover:opacity-85 p-1 bg-white/10 hover:bg-white/25 rounded-lg transition-all"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black flex items-center gap-2 text-slate-900 uppercase tracking-tighter">
          <MapIcon className="w-8 h-8 text-blue-600" /> Monitoreo <span className="text-blue-600">Axistcorp</span>
        </h1>
        <button 
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold p-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          title="Actualizar pantalla y validar GPS"
        >
          <RefreshCcw className={`w-5 h-5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
          <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-emerald-500/10 rounded-2xl">
              <Truck className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-slate-400 font-bold uppercase text-xs tracking-widest">Disponibles</h3>
          </div>
          <p className="text-4xl font-black text-slate-900">{stats.activeDrivers}</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-600/10 rounded-2xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-slate-400 font-bold uppercase text-xs tracking-widest">En Servicio</h3>
          </div>
          <p className="text-4xl font-black text-slate-900">{stats.inService}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Real-time Map */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl overflow-hidden h-[500px] relative shadow-sm z-10">
          <MapContainer 
            center={[4.6243, -74.0636]} 
            zoom={13} 
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {Array.isArray(drivers) && drivers.filter(d => d.last_lat && d.last_lng && d.status !== 'TERMINE TURNO').map((driver) => (
              <Marker 
                key={driver.id} 
                position={[driver.last_lat!, driver.last_lng!]}
                icon={L.divIcon({
                  className: 'custom-div-icon',
                  html: `
                    <div class="relative">
                      <div class="w-10 h-10 rounded-full border-4 ${getStatusColor(driver.status).replace('bg-', 'border-')} bg-white flex items-center justify-center shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck ${getStatusColor(driver.status).replace('bg-', 'text-')}"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-2.18-2.725A1 1 0 0 0 18.82 9H15"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
                      </div>
                      <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-sm whitespace-nowrap">
                        <span class="text-[8px] font-black uppercase tracking-tighter">${driver.name.split(' ')[0]}</span>
                      </div>
                    </div>
                  `,
                  iconSize: [40, 40],
                  iconAnchor: [20, 20]
                })}
              >
                <Popup>
                  <div className="p-1">
                    <p className="font-bold text-slate-900">{driver.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase font-black mb-2">{driver.status}</p>
                    <button 
                      onClick={() => handleWhatsApp(driver)}
                      className="w-full bg-emerald-500 text-white text-[10px] font-black py-2 rounded-lg flex items-center justify-center gap-1 uppercase tracking-widest"
                    >
                      <MessageSquare className="w-3 h-3" /> WhatsApp
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
            <MapRecenter drivers={drivers} />
          </MapContainer>
        </div>

        {/* Right Sidebar: Controls & Dispatch */}
        <div className="flex flex-col gap-6">
          {/* Dispatch Button */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg shadow-blue-600/20 text-xs uppercase tracking-wider"
          >
            <Plus className="w-5 h-5" /> Despachar Servicio / Auxilio
          </button>

          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex-1 min-h-[500px] flex flex-col">
            {/* Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
              <button
                onClick={() => setActiveTab('drivers')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === 'drivers' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Users className="w-4 h-4" /> Unidades
              </button>
              <button
                onClick={() => setActiveTab('services')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all relative ${
                  activeTab === 'services' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <ClipboardList className="w-4 h-4" /> Servicios
                {services.filter(s => s.status === 'PENDIENTE' || s.status === 'EN_CAMINO').length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center text-[9px] font-black">
                    {services.filter(s => s.status === 'PENDIENTE' || s.status === 'EN_CAMINO').length}
                  </span>
                )}
              </button>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto max-h-[500px] pr-1">
              {activeTab === 'drivers' ? (
                <div className="space-y-4">
                  {drivers.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                      <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                      <p className="text-xs font-bold">No hay conductores registrados</p>
                    </div>
                  ) : (
                    drivers.map(driver => (
                      <div key={driver.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 hover:border-blue-200 transition-all group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor(driver.status)}`} />
                            <p className="font-extrabold text-sm text-slate-800 tracking-tight leading-none">{driver.name}</p>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-100 px-2 py-0.5 rounded-md font-bold font-mono">
                            {formatElapsed(driver.status_start_time)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-[10px] uppercase font-black text-slate-400 mb-3 tracking-wider">
                          <span>{driver.status}</span>
                          {driver.last_lat && (
                            <span className="flex items-center gap-1 text-emerald-500 font-bold">
                              <MapIcon className="w-3 h-3" /> GPS OK
                            </span>
                          )}
                        </div>

                        <button 
                          onClick={() => handleWhatsApp(driver)}
                          className="w-full bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-600 text-slate-600 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {services.filter(s => s.status === 'PENDIENTE' || s.status === 'EN_CAMINO').length === 0 ? (
                    <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold">No hay servicios en curso</p>
                      <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-wider">Despacha una emergencia para iniciar</p>
                    </div>
                  ) : (
                    services.filter(s => s.status === 'PENDIENTE' || s.status === 'EN_CAMINO').map(srv => {
                      const assignedDriver = drivers.find(d => d.id === srv.driver_id);
                      return (
                        <div key={srv.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 hover:border-blue-200 transition-all">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md mr-1.5 ${
                                srv.status === 'EN_CAMINO' ? "bg-blue-600 text-white" : "bg-amber-100 text-amber-700"
                              }`}>
                                {srv.status === 'EN_CAMINO' ? "EN CAMINO" : "PENDIENTE"}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 font-bold">Ref: {srv.id.slice(0, 6).toUpperCase()}</span>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-400">
                              {new Date(srv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="text-xs space-y-1 mb-3 text-slate-600 font-medium">
                            <p><span className="text-slate-400 font-bold uppercase text-[9px] block">Cliente</span> {srv.client_name}</p>
                            {srv.client_phone && <p><span className="text-slate-400 font-bold uppercase text-[9px] block">Teléfono</span> {srv.client_phone}</p>}
                            <p><span className="text-slate-400 font-bold uppercase text-[9px] block">Vehículo</span> {srv.vehicle_info}</p>
                            <p><span className="text-slate-400 font-bold uppercase text-[9px] block">Origen</span> {srv.origin_address}</p>
                            <p><span className="text-slate-400 font-bold uppercase text-[9px] block">Conductor</span> {assignedDriver ? assignedDriver.name : "Sin asignar"}</p>
                          </div>

                          <button
                            onClick={() => handleOperatorCancelService(srv.id)}
                            className="w-full bg-red-50 hover:bg-red-100 text-red-600 py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all font-black text-[10px] uppercase tracking-widest"
                          >
                            <AlertCircle className="w-3.5 h-3.5" /> Cancelar Servicio
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECCIÓN DE TRAZA HORARIA Y CONTROL DE ESTADOS */}
      <section className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 uppercase tracking-tight">
              <Clock className="w-6 h-6 text-blue-600" /> Control de Estados y Tiempos de la Jornada
            </h2>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">
              Monitoreo en tiempo real de la traza y horas de actividad de cada conductor
            </p>
          </div>
          
          <div className="flex gap-2">
            <div className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl flex items-center gap-1.5 text-xs font-black uppercase tracking-wider border border-blue-100">
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              Live Feed
            </div>
          </div>
        </div>

        {/* Resumen de Tiempos de Conexión por Conductor (Suma de Todos los Estados) */}
        <div className="mb-8 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Tiempos Totales Conectados por Conductor (Suma de Todos los Estados)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.filter(d => d.role === 'driver').map(drv => {
              const logs = driverLogs.filter(l => l.driver_id === drv.id);
              const totalSeconds = logs.reduce((sum, log) => sum + (log.duration_seconds || 0), 0);
              
              // Detailed breakdown
              const disponibleSecs = logs.filter(l => l.new_status === 'DISPONIBLE').reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
              const enServicioSecs = logs.filter(l => l.new_status === 'EN SERVICIO').reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
              const mantenimientoSecs = logs.filter(l => l.new_status === 'MANTENIMIENTO').reduce((sum, l) => sum + (l.duration_seconds || 0), 0);
              const termineTurnoSecs = logs.filter(l => l.new_status === 'TERMINE TURNO').reduce((sum, l) => sum + (l.duration_seconds || 0), 0);

              return (
                <div key={drv.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:border-blue-200 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 pb-3">
                      <div>
                        <p className="font-extrabold text-slate-900 text-sm">{drv.name}</p>
                        <p className="text-[10px] text-slate-450 font-black uppercase mt-0.5">ID: {drv.id}</p>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                        drv.status === 'DISPONIBLE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                        drv.status === 'EN SERVICIO' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        drv.status === 'MANTENIMIENTO' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 
                        'bg-slate-200 text-slate-750 border border-slate-300'
                      }`}>
                        {drv.status}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center bg-blue-50/70 p-2.5 rounded-xl border border-blue-100/50 mb-2">
                        <span className="text-xs font-extrabold text-blue-900 uppercase">Tiempo Total Conectado:</span>
                        <span className="font-black text-blue-800 text-sm font-mono">{formatDurationSeconds(totalSeconds)}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-semibold">
                        <div className="bg-white p-2 rounded-xl border border-slate-200/50">
                          <span className="block text-slate-400 text-[8px] font-black uppercase tracking-wider">Disponible</span>
                          <span className="font-black text-slate-700 font-mono text-[11px]">{formatDurationSeconds(disponibleSecs)}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-200/50">
                          <span className="block text-slate-400 text-[8px] font-black uppercase tracking-wider">En Servicio</span>
                          <span className="font-black text-slate-700 font-mono text-[11px]">{formatDurationSeconds(enServicioSecs)}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-200/50">
                          <span className="block text-slate-400 text-[8px] font-black uppercase tracking-wider">Mantenimiento</span>
                          <span className="font-black text-slate-700 font-mono text-[11px]">{formatDurationSeconds(mantenimientoSecs)}</span>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-200/50">
                          <span className="block text-slate-400 text-[8px] font-black uppercase tracking-wider">Fuera Turno</span>
                          <span className="font-black text-slate-700 font-mono text-[11px]">{formatDurationSeconds(termineTurnoSecs)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumen Visual por Conductor de su Traza de Hoy */}
        <div className="mb-8 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Línea de Tiempo de Actividad Reciente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {drivers.filter(d => d.role === 'driver').map(drv => {
              // Obtener logs de este conductor
              const logsForDrv = driverLogs.filter(l => l.driver_id === drv.id).slice(0, 4);
              return (
                <div key={drv.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:border-blue-200 transition-all">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-200/60 pb-3">
                    <div>
                      <p className="font-extrabold text-slate-900 text-sm">{drv.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{drv.area || "Logística General"}</p>
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                      drv.status === 'DISPONIBLE' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 
                      drv.status === 'EN SERVICIO' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      drv.status === 'MANTENIMIENTO' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 
                      'bg-slate-200 text-slate-750 border border-slate-300'
                    }`}>
                      {drv.status}
                    </span>
                  </div>
                  
                  {logsForDrv.length === 0 ? (
                    <div className="py-2 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                      <p className="text-[10px] text-slate-450 uppercase font-black tracking-wide">Inició su turno hoy. Sin cambios registrados.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200">
                      {logsForDrv.map((log, idx) => (
                        <div key={log.id || idx} className="flex items-start gap-4 pl-5 relative">
                          <span className={`absolute left-[5px] top-1.5 w-2 h-2 rounded-full border border-white shadow-sm ring-2 ${
                            log.new_status === 'DISPONIBLE' ? 'bg-emerald-500 ring-emerald-100' :
                            log.new_status === 'EN SERVICIO' ? 'bg-blue-500 ring-blue-100' :
                            log.new_status === 'MANTENIMIENTO' ? 'bg-amber-500 ring-amber-100' : 
                            'bg-red-500 ring-red-100'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-slate-700">
                                Cambio a <span className="font-extrabold uppercase text-slate-900">{log.new_status}</span>
                              </p>
                              <span className="text-[10px] font-mono font-bold text-slate-400">
                                {new Date(log.changed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {log.duration_seconds && (
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                Estuvo en <span className="font-bold">{log.previous_status || "INICIAL"}</span> por {formatDurationSeconds(log.duration_seconds)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabla Detallada de Transiciones */}
        <div className="overflow-x-auto rounded-2xl border border-slate-150">
          <table className="w-full text-left border-collapse bg-slate-50/50">
            <thead>
              <tr className="bg-slate-100/55 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="p-4">Conductor</th>
                <th className="p-4">Estado Anterior</th>
                <th className="p-4">Nuevo Estado</th>
                <th className="p-4">Fecha & Hora</th>
                <th className="p-4 text-right">Duración en Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {driverLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400 uppercase text-[10px] font-black tracking-wider">
                    No hay registros de transiciones de estados todavía
                  </td>
                </tr>
              ) : (
                driverLogs.map((log) => {
                  return (
                    <tr key={log.id} className="hover:bg-slate-100/20 transition-all">
                      <td className="p-4 font-bold text-slate-900">
                        {drivers.find(d => d.id === log.driver_id)?.name || log.driver_name || `Conductor ${log.driver_id}`}
                      </td>
                      <td className="p-4 text-slate-400 uppercase text-[10px] tracking-wider">{log.previous_status || "INICIAL"}</td>
                      <td className="p-4 text-blue-600 font-extrabold uppercase text-[10px] tracking-wider">{log.new_status}</td>
                      <td className="p-4 text-slate-400 font-mono font-bold">
                        {new Date(log.changed_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="p-4 text-right font-mono font-black text-slate-800">
                        {formatDurationSeconds(log.duration_seconds)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create Emergency Service Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[999] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full p-8 md:p-10 relative overflow-y-auto max-h-[90%] border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="mb-6">
              <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Despachar Grúa / Auxilio</h3>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-black mt-1">Registrar nueva emergencia en tiempo real</p>
            </div>

            <form onSubmit={handleCreateServiceSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Nombre del Cliente *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez"
                  value={newService.client_name}
                  onChange={(e) => setNewService({ ...newService, client_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Teléfono del Cliente</label>
                  <input
                    type="text"
                    placeholder="Ej: +57312345678"
                    value={newService.client_phone}
                    onChange={(e) => setNewService({ ...newService, client_phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Vehículo (Info Completa) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Chevrolet Sail Gris, Placa XYZ-456"
                    value={newService.vehicle_info}
                    onChange={(e) => setNewService({ ...newService, vehicle_info: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Dirección de Origen (Recogida) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cl 85 # 15-40, Bogotá"
                  value={newService.origin_address}
                  onChange={(e) => setNewService({ ...newService, origin_address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Dirección de Destino (Taller/Destino)</label>
                <input
                  type="text"
                  placeholder="Ej: Av Cl 100 # 22-10 (Taller Autorizado)"
                  value={newService.destination_address}
                  onChange={(e) => setNewService({ ...newService, destination_address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">Asignar Operario / Conductor *</label>
                <select
                  required
                  value={newService.driver_id}
                  onChange={(e) => setNewService({ ...newService, driver_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-600 transition-colors"
                >
                  <option value="">Selecciona un conductor disponible...</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border border-slate-200 text-slate-500 font-bold py-4 rounded-2xl text-xs uppercase tracking-wider hover:bg-slate-50 active:scale-95 transition-transform"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingService}
                  className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-wider hover:bg-blue-700 active:scale-95 transition-transform disabled:bg-blue-400 flex items-center justify-center gap-1"
                >
                  {savingService ? "Despachando..." : "Proceder Despacho"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
