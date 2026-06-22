import { User, Integration, UserStatus } from "../types";
import { supabase } from "./supabase";

export const api = {
  login: async (email: string): Promise<User> => {
    const cleanEmail = email.toLowerCase().trim();
    
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", cleanEmail)
        .single();
      
      if (!error && data) {
        return data;
      }
    } catch (e) {
      console.warn("Supabase query error, relying on robust fallback:", e);
    }

    // Predefined corporate profiles
    const demoUsers: Record<string, User> = {
      "admin@axistcorp.com": {
        id: "demo-admin",
        name: "Administrador Axistcorp",
        email: "admin@axistcorp.com",
        role: "admin",
        status: "DISPONIBLE"
      },
      "callcenter@axistcorp.com": {
        id: "demo-call-center",
        name: "Operador Call Center",
        email: "callcenter@axistcorp.com",
        role: "call_center",
        status: "DISPONIBLE"
      },
      "conductor@axistcorp.com": {
        id: "demo-driver-1",
        name: "Carlos Mendoza (Grúa Camión)",
        email: "conductor@axistcorp.com",
        phone: "+573001234567",
        role: "driver",
        status: "DISPONIBLE"
      },
      "conductor2@axistcorp.com": {
        id: "demo-driver-2",
        name: "Andrés Delgado (Grúa Cama)",
        email: "conductor2@axistcorp.com",
        phone: "+573119876543",
        role: "driver",
        status: "EN SERVICIO"
      }
    };

    if (demoUsers[cleanEmail]) {
      return demoUsers[cleanEmail];
    }

    throw new Error("Usuario no encontrado. Prueba usar una cuenta demostrativa como: admin@axistcorp.com, callcenter@axistcorp.com o conductor@axistcorp.com");
  },

  getDrivers: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "driver");
      
      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (e) {
      console.warn("getDrivers empty, using fallback demo drivers:", e);
    }

    return [
      {
        id: "demo-driver-1",
        name: "Carlos Mendoza (Grúa Camión)",
        email: "conductor@axistcorp.com",
        phone: "+573001234567",
        role: "driver",
        status: "DISPONIBLE",
        last_lat: 4.7110,
        last_lng: -74.0721,
        last_update: new Date().toISOString()
      },
      {
        id: "demo-driver-2",
        name: "Andrés Delgado (Grúa Cama)",
        email: "conductor2@axistcorp.com",
        phone: "+573119876543",
        role: "driver",
        status: "EN SERVICIO",
        last_lat: 4.6980,
        last_lng: -74.1021,
        last_update: new Date().toISOString()
      }
    ];
  },

  getAllUsers: async (): Promise<User[]> => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*");
      
      if (!error && Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (e) {
      console.warn("getAllUsers empty, returning fallbacks:", e);
    }

    return [
      { id: "demo-admin", name: "Administrador Axistcorp", email: "admin@axistcorp.com", role: "admin", status: "DISPONIBLE" },
      { id: "demo-call-center", name: "Operador Call Center", email: "callcenter@axistcorp.com", role: "call_center", status: "DISPONIBLE" },
      { id: "demo-driver-1", name: "Carlos Mendoza (Grúa Camión)", email: "conductor@axistcorp.com", phone: "+573001234567", role: "driver", status: "DISPONIBLE", last_lat: 4.7110, last_lng: -74.0721, last_update: new Date().toISOString() },
      { id: "demo-driver-2", name: "Andrés Delgado (Grúa Cama)", email: "conductor2@axistcorp.com", phone: "+573119876543", role: "driver", status: "EN SERVICIO", last_lat: 4.6980, last_lng: -74.1021, last_update: new Date().toISOString() }
    ];
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

    try {
      await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId);
    } catch (e) {
      console.warn("Silent ignore update status DB error in fallback scenario");
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
  }
};
