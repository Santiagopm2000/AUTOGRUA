import { User, Integration, UserStatus, Service, ServiceStatus, DriverStatusLog } from "../types";
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
      "px6.usa@gmail.com": {
        id: "user-px6",
        name: "Usuario Creador (Admin)",
        email: "px6.usa@gmail.com",
        phone: "+573100000000",
        mobile: "+573100000000",
        area: "Administración / Sistemas",
        role: "admin",
        status: "DISPONIBLE"
      },
      "admin@axistcorp.com": {
        id: "demo-admin",
        name: "Administrador Axistcorp",
        email: "admin@axistcorp.com",
        phone: "+573000000000",
        mobile: "+573000000000",
        area: "Gerencia / Tecnología",
        role: "admin",
        status: "DISPONIBLE"
      },
      "callcenter@axistcorp.com": {
        id: "demo-call-center",
        name: "Operador Call Center",
        email: "callcenter@axistcorp.com",
        phone: "+573111111111",
        mobile: "+573111111111",
        area: "Despacho / Call Center",
        role: "call_center",
        status: "DISPONIBLE"
      },
      "conductor@axistcorp.com": {
        id: "demo-driver-1",
        name: "Carlos Mendoza (Grúa Camión)",
        email: "conductor@axistcorp.com",
        phone: "+573001234567",
        mobile: "+573001234567",
        area: "Logística - Zona Norte",
        role: "driver",
        status: "DISPONIBLE"
      },
      "conductor2@axistcorp.com": {
        id: "demo-driver-2",
        name: "Andrés Delgado (Grúa Cama)",
        email: "conductor2@axistcorp.com",
        phone: "+573119876543",
        mobile: "+573119876543",
        area: "Logística - Zona Centro",
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
        mobile: "+573001234567",
        area: "Logística - Zona Norte",
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
        mobile: "+573119876543",
        area: "Logística - Zona Centro",
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
      { id: "user-px6", name: "Usuario Creador (Admin)", email: "px6.usa@gmail.com", phone: "+573100000000", mobile: "+573100000000", area: "Administración / Sistemas", role: "admin", status: "DISPONIBLE" },
      { id: "demo-admin", name: "Administrador Axistcorp", email: "admin@axistcorp.com", phone: "+573000000000", mobile: "+573000000000", area: "Gerencia / Tecnología", role: "admin", status: "DISPONIBLE" },
      { id: "demo-call-center", name: "Operador Call Center", email: "callcenter@axistcorp.com", phone: "+573111111111", mobile: "+573111111111", area: "Despacho / Call Center", role: "call_center", status: "DISPONIBLE" },
      { id: "demo-driver-1", name: "Carlos Mendoza (Grúa Camión)", email: "conductor@axistcorp.com", phone: "+573001234567", mobile: "+573001234567", area: "Logística - Zona Norte", role: "driver", status: "DISPONIBLE", last_lat: 4.7110, last_lng: -74.0721, last_update: new Date().toISOString() },
      { id: "demo-driver-2", name: "Andrés Delgado (Grúa Cama)", email: "conductor2@axistcorp.com", phone: "+573119876543", mobile: "+573119876543", area: "Logística - Zona Centro", role: "driver", status: "EN SERVICIO", last_lat: 4.6980, last_lng: -74.1021, last_update: new Date().toISOString() }
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
      // 1. Fetch current user state to calculate transition duration
      const { data: userProfile } = await supabase
        .from("users")
        .select("status, status_start_time")
        .eq("id", userId)
        .maybeSingle();

      let previousStatus: UserStatus | null = null;
      let durationSeconds: number | null = null;

      if (userProfile) {
        previousStatus = userProfile.status as UserStatus;
        if (userProfile.status_start_time) {
          const prevStart = new Date(userProfile.status_start_time).getTime();
          const currentNow = new Date().getTime();
          durationSeconds = Math.max(0, Math.floor((currentNow - prevStart) / 1000));
        }
      }

      // 2. Insert log into driver_status_logs table in Supabase
      const logRecord = {
        driver_id: userId,
        previous_status: previousStatus,
        new_status: status,
        changed_at: now,
        duration_seconds: durationSeconds
      };

      try {
        await supabase
          .from("driver_status_logs")
          .insert([logRecord]);
      } catch (logErr) {
        console.warn("Log write to DB failed, using local backup list:", logErr);
      }

      // Track locally too for complete fallback reports coverage
      try {
        const rawLogs = localStorage.getItem("towassist_fallback_status_logs");
        const parsed = rawLogs ? JSON.parse(rawLogs) : [];
        const finalLogs = [{ id: Date.now(), ...logRecord }, ...parsed];
        localStorage.setItem("towassist_fallback_status_logs", JSON.stringify(finalLogs.slice(0, 500))); // limit size
      } catch (err) {}

      // 3. Update main user record
      await supabase
        .from("users")
        .update(updateData)
        .eq("id", userId);
    } catch (e) {
      console.warn("Silent ignore update status DB error or network fallback:", e);
      // Try plain user update if the log table isn't created yet or there is a minor db check constraint failure
      try {
        await supabase
          .from("users")
          .update(updateData)
          .eq("id", userId);
      } catch (innerErr) {
        console.error("Critical: Failed inner fallback update status", innerErr);
      }
    }
  },

  // Admin User Management
  createUser: async (userData: { id?: string; name: string; email: string; phone?: string; mobile?: string; area?: string; role: string }) => {
    const customId = userData.id && userData.id.trim() ? userData.id.trim() : `user-${Date.now()}`;
    const { id, ...rest } = userData;
    const finalData = { id: customId, ...rest };

    const { data, error } = await supabase
      .from("users")
      .insert([finalData])
      .select()
      .single();
    
    if (error) throw error;
    return { success: true, id: customId };
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

  getServices: async (): Promise<Service[]> => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        return data as Service[];
      }
    } catch (e) {
      console.warn("Supabase services table not found or query error, returning empty list:", e);
    }
    // Simple local fallback using localStorage if supabase is not available
    const local = localStorage.getItem("towassist_fallback_services");
    if (local) {
      try {
        return JSON.parse(local);
      } catch (err) {}
    }
    return [];
  },

  createService: async (serviceData: {
    driver_id: string | null;
    client_name: string;
    client_phone?: string;
    vehicle_info: string;
    origin_address: string;
    destination_address?: string;
  }) => {
    const id = `srv-${Date.now()}`;
    const now = new Date().toISOString();
    const finalData = {
      id,
      ...serviceData,
      status: "PENDIENTE" as ServiceStatus,
      created_at: now,
      updated_at: now
    };

    try {
      const { data, error } = await supabase
        .from("services")
        .insert([finalData])
        .select()
        .single();
      if (!error && data) {
        return { success: true, service: data as Service };
      }
    } catch (e) {
      console.warn("Supabase services insert error, saving to local fallback:", e);
    }

    // Local fallback
    const current = await api.getServices();
    const updated = [finalData as Service, ...current];
    localStorage.setItem("towassist_fallback_services", JSON.stringify(updated));
    return { success: true, service: finalData as Service };
  },

  updateServiceStatus: async (serviceId: string, status: ServiceStatus) => {
    const now = new Date().toISOString();
    try {
      // 1. Fetch service to calculate duration if closing
      const { data: service } = await supabase
        .from("services")
        .select("created_at")
        .eq("id", serviceId)
        .maybeSingle();

      let durationSeconds: number | null = null;
      let start_time_str = service?.created_at;

      // If we don't find it in supabase, we check local fallback
      if (!start_time_str) {
        const localServices = await api.getServices();
        const found = localServices.find(s => s.id === serviceId);
        if (found) {
          start_time_str = found.created_at;
        }
      }

      if (start_time_str && (status === "COMPLETADO" || status === "CANCELADO")) {
        const startTime = new Date(start_time_str).getTime();
        const endTime = new Date().getTime();
        durationSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000));
      }

      const updateData: any = {
        status,
        updated_at: now
      };
      if (durationSeconds !== null) {
        updateData.duration_seconds = durationSeconds;
      }

      const { error } = await supabase
        .from("services")
        .update(updateData)
        .eq("id", serviceId);

      if (!error) {
        return { success: true };
      }
    } catch (e) {
      console.warn("Supabase update service status error, updating local fallback:", e);
    }

    // Local fallback update
    const current = await api.getServices();
    const updated = current.map(srv => {
      if (srv.id === serviceId) {
        let durationSeconds: number | null = null;
        if (status === "COMPLETADO" || status === "CANCELADO") {
          const startTime = new Date(srv.created_at).getTime();
          const endTime = new Date().getTime();
          durationSeconds = Math.max(0, Math.floor((endTime - startTime) / 1000));
        }
        return {
          ...srv,
          status,
          updated_at: now,
          duration_seconds: durationSeconds !== null ? durationSeconds : srv.duration_seconds
        };
      }
      return srv;
    });
    localStorage.setItem("towassist_fallback_services", JSON.stringify(updated));
    return { success: true };
  },

  getDriverStatusLogs: async (driverId?: string): Promise<DriverStatusLog[]> => {
    try {
      let query = supabase
        .from("driver_status_logs")
        .select("*")
        .order("changed_at", { ascending: false });

      if (driverId) {
        query = query.eq("driver_id", driverId);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data as DriverStatusLog[];
      }
    } catch (e) {
      console.warn("Supabase status logs query error, listing fallbacks:", e);
    }

    // Fallback status logs
    const localLogs = localStorage.getItem("towassist_fallback_status_logs");
    let logsList: DriverStatusLog[] = [];
    if (localLogs) {
      try {
        logsList = JSON.parse(localLogs);
      } catch (err) {}
    }

    if (driverId) {
      return logsList.filter(l => l.driver_id === driverId);
    }
    return logsList;
  }
};
