import React, { useState, useEffect } from "react";
import { User, Integration } from "../types";
import { api } from "../services/api";
import { 
  Users, 
  Truck, 
  Map as MapIcon, 
  RefreshCcw,
  Clock,
  MessageSquare,
  ExternalLink
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

// Helper component to center map on drivers
function MapRecenter({ drivers }: { drivers: User[] }) {
  const map = useMap();
  useEffect(() => {
    if (drivers.length > 0) {
      const validDrivers = drivers.filter(d => d.last_lat && d.last_lng);
      if (validDrivers.length > 0) {
        const bounds = L.latLngBounds(validDrivers.map(d => [d.last_lat!, d.last_lng!] as [number, number]));
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
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

  const fetchData = async () => {
    try {
      const [driversData, statsData, integrationsData] = await Promise.all([
        api.getDrivers(),
        api.getAdminStats(),
        api.getIntegrations()
      ]);
      setDrivers(driversData);
      setStats(statsData);
      setIntegrations(integrationsData.filter(i => i.active));
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
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black flex items-center gap-2 text-slate-900 uppercase tracking-tighter">
          <MapIcon className="w-8 h-8 text-blue-600" /> Monitoreo <span className="text-blue-600">Axistcorp</span>
        </h1>
        <button 
          onClick={fetchData}
          className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold p-3 rounded-xl transition-all shadow-sm"
        >
          <RefreshCcw className="w-5 h-5" />
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
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl overflow-hidden min-h-[500px] relative shadow-sm z-10">
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
            {Array.isArray(drivers) && drivers.filter(d => d.last_lat && d.last_lng).map((driver) => (
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

        {/* Driver List with Timers */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 overflow-y-auto max-h-[600px] shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
            <Users className="w-4 h-4" /> Unidades en Campo
          </h3>
          <div className="space-y-4">
            {Array.isArray(drivers) && drivers.map(driver => (
              <div key={driver.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 hover:border-blue-200 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(driver.status)}`} />
                    <p className="font-bold text-sm text-slate-900">{driver.name}</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 bg-white border border-slate-100 px-2 py-1 rounded-md">
                    {formatElapsed(driver.status_start_time)}
                  </span>
                </div>
                
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-black text-slate-400 mb-4">
                  <span>{driver.status}</span>
                  {driver.last_lat && (
                    <span className="flex items-center gap-1 text-emerald-500">
                      <MapIcon className="w-3 h-3" /> GPS OK
                    </span>
                  )}
                </div>

                <button 
                  onClick={() => handleWhatsApp(driver)}
                  className="w-full bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-600 text-slate-600 py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 font-black text-[10px] uppercase tracking-widest"
                >
                  <MessageSquare className="w-4 h-4" /> Contactar WhatsApp
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
