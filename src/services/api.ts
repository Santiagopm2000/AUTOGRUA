import { User, Integration, UserStatus } from "../types";
import { supabase } from "./supabase";

export const api = {
  login: async (email: string): Promise<User> => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();
    
    if (error || !data) {
      throw new Error("Usuario no encontrado en la base de datos de Axistcorp.");
    }
    return data;
  },

  getDrivers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "driver");
    
    if (error) return [];
    return Array.isArray(data) ? data : [];
  },

  getAllUsers: async (): Promise<User[]> => {
    const { data, error } = await supabase
      .from("users")
      .select("*");
    
    if (error) return [];
    return Array.isArray(data) ? data : [];
  },

  updateStatus: async (userId: string, status: UserStatus, lat?: number, lng?: number, shiftStartTime?: string) => {
    const now = new Date().toISOString();
    const updateData: any = { 
      status, 
      status_start_time: now, 
      last_lat: lat, 
      last_lng: lng, 
      last_update: now 
    };

    if (shiftStartTime) {
      updateData.shift_start_time = shiftStartTime;
    }

    const { data: user } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", userId)
      .select()
      .single();

    // Trigger n8n integrations on status change
    if (user) {
      const { data: integrations } = await supabase.from("integrations").select("*").eq("active", true);
      if (integrations) {
        const n8nIntegrations = integrations.filter(i => i.name.toLowerCase().includes('n8n') || i.url.includes('n8n'));
        for (const integration of n8nIntegrations) {
          fetch(integration.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'status_change',
              user_id: user.id,
              user_name: user.name,
              new_status: status,
              lat,
              lng,
              timestamp: now
            })
          }).catch(e => console.error("Integration trigger failed", e));
        }
      }
    }
  },

  // Admin User Management
  createUser: async (userData: { name: string; email: string; phone: string; role: string }) => {
    const id = `user-${Date.now()}`;
    const { data, error } = await supabase
      .from("users")
      .insert([{ id, ...userData }])
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, id };
  },

  deleteUser: async (id: string) => {
    await supabase
      .from("users")
      .delete()
      .eq("id", id);
  },

  // Admin Integration Management
  getIntegrations: async (): Promise<Integration[]> => {
    const { data, error } = await supabase
      .from("integrations")
      .select("*");
    
    if (error) return [];
    return Array.isArray(data) ? data : [];
  },

  createIntegration: async (intData: { name: string; url: string }) => {
    const id = `int-${Date.now()}`;
    const { error } = await supabase
      .from("integrations")
      .insert([{ id, ...intData, active: true }]);
    
    if (error) throw error;
    return { success: true, id };
  },

  updateIntegrationStatus: async (id: string, active: boolean) => {
    await supabase
      .from("integrations")
      .update({ active })
      .eq("id", id);
  },

  getAdminStats: async () => {
    const { count: activeCount } = await supabase
      .from("users")
      .select("*", { count: 'exact', head: true })
      .eq("role", "driver")
      .eq("status", "DISPONIBLE");

    const { count: inServiceCount } = await supabase
      .from("users")
      .select("*", { count: 'exact', head: true })
      .eq("role", "driver")
      .eq("status", "EN SERVICIO");

    return {
      activeDrivers: activeCount || 0,
      inService: inServiceCount || 0
    };
  },

  getServiceHistory: async (): Promise<any[]> => {
    // In a real app, we'd have a 'services' table. 
    // For this demo, we'll return mock history based on drivers' current stats
    // but in a real scenario, this would query a dedicated history table.
    const { data: drivers } = await supabase.from("users").select("*").eq("role", "driver");
    if (!drivers) return [];
    
    return drivers.map(d => ({
      id: `svc-${d.id}`,
      driverName: d.name,
      status: d.status,
      startTime: d.status_start_time,
      lastUpdate: d.last_update,
      location: d.last_lat ? `${d.last_lat.toFixed(4)}, ${d.last_lng?.toFixed(4)}` : 'N/A'
    }));
  }
};
