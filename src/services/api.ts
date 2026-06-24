import { User, Integration, UserStatus, Service, ServiceStatus, DriverStatusLog } from "../types";
import { supabase } from "./supabase";

const DEFAULT_DEMO_USERS: User[] = [
  { id: "user-px6", name: "Usuario Creador (Admin)", email: "px6.usa@gmail.com", phone: "+573100000000", mobile: "+573100000000", area: "Administración / Sistemas", role: "admin", status: "DISPONIBLE", status_start_time: new Date().toISOString(), last_update: new Date().toISOString() },
  { id: "demo-admin", name: "Administrador Axistcorp", email: "admin@axistcorp.com", phone: "+573000000000", mobile: "+573000000000", area: "Gerencia / Tecnología", role: "admin", status: "DISPONIBLE", status_start_time: new Date().toISOString(), last_update: new Date().toISOString() },
  { id: "demo-call-center", name: "Operador Call Center", email: "callcenter@axistcorp.com", phone: "+573111111111", mobile: "+573111111111", area: "Despacho / Call Center", role: "call_center", status: "DISPONIBLE", status_start_time: new Date().toISOString(), last_update: new Date().toISOString() },
  { id: "demo-driver-1", name: "Carlos Mendoza (Grúa Camión)", email: "conductor@axistcorp.com", phone: "+573001234567", mobile: "+573001234567", area: "Logística - Zona Norte", role: "driver", status: "DISPONIBLE", last_lat: 4.7110, last_lng: -74.0721, status_start_time: new Date().toISOString(), last_update: new Date().toISOString() },
  { id: "demo-driver-2", name: "Andrés Delgado (Grúa Cama)", email: "conductor2@axistcorp.com", phone: "+573119876543", mobile: "+573119876543", area: "Logística - Zona Centro", role: "driver", status: "EN SERVICIO", last_lat: 4.6980, last_lng: -74.1021, status_start_time: new Date().toISOString(), last_update: new Date().toISOString() }
];

export const api = {
  login: async (email: string): Promise<User> => {
    const cleanEmail = email.toLowerCase().trim();
    
    // First try checking the merged list of all users
    try {
      const all = await api.getAllUsers();
      const found = all.find(u => u.email.toLowerCase().trim() === cleanEmail);
      if (found) {
        return found;
      }
    } catch (e) {
      console.warn("Error checking login on merged list:", e);
    }

    throw new Error("Usuario no encontrado. Prueba usar una cuenta demostrativa como: admin@axistcorp.com, callcenter@axistcorp.com, conductor@axistcorp.com o tu usuario creado.");
  },

  getDrivers: async (): Promise<User[]> => {
    try {
      const allUsers = await api.getAllUsers();
      return allUsers.filter(u => u.role === "driver");
    } catch (e) {
      console.warn("getDrivers empty, using fallback demo drivers:", e);
      return [];
    }
  },

  getAllUsers: async (): Promise<User[]> => {
    let dbUsers: User[] = [];
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*");
      
      if (!error && Array.isArray(data)) {
        dbUsers = data;
      }
    } catch (e) {
      console.warn("getAllUsers database lookup failed:", e);
    }

    let localUsers: User[] = [];
    try {
      const rawLocal = localStorage.getItem("towassist_fallback_users");
      if (rawLocal) {
        localUsers = JSON.parse(rawLocal);
      } else {
        // Initialize localStorage with default demo users so they are saved locally and ready for sync
        localStorage.setItem("towassist_fallback_users", JSON.stringify(DEFAULT_DEMO_USERS));
        localUsers = DEFAULT_DEMO_USERS;
      }
    } catch (err) {
      console.error("Local storage user list parsing error:", err);
    }

    // Load deleted users list to filter out permanently deleted accounts
    let deletedIds: string[] = [];
    try {
      const rawDeleted = localStorage.getItem("towassist_deleted_users");
      if (rawDeleted) {
        deletedIds = JSON.parse(rawDeleted);
      }
    } catch (e) {}

    // Auto-detect deleted demo users from Supabase if we successfully loaded dbUsers
    if (dbUsers.length > 0) {
      const dbUserIds = new Set(dbUsers.map(u => u.id));
      const missingDemoIds = DEFAULT_DEMO_USERS.filter(u => !dbUserIds.has(u.id)).map(u => u.id);
      if (missingDemoIds.length > 0) {
        let updated = false;
        missingDemoIds.forEach(id => {
          if (!deletedIds.includes(id)) {
            deletedIds.push(id);
            updated = true;
          }
        });
        if (updated) {
          try {
            localStorage.setItem("towassist_deleted_users", JSON.stringify(deletedIds));
          } catch (e) {}
        }
      }
    }

    const mergedMap = new Map<string, User>();
    
    // Helper to safely compare and merge users prioritizing the most recently updated data
    const mergeUserSmart = (user: User) => {
      if (deletedIds.includes(user.id)) return; // Do not merge deleted users

      const existing = mergedMap.get(user.id);
      if (!existing) {
        mergedMap.set(user.id, user);
        return;
      }
      
      const existingTime = existing.last_update ? new Date(existing.last_update).getTime() : 0;
      const newTime = user.last_update ? new Date(user.last_update).getTime() : 0;
      
      // If the incoming user record has a newer or equal update timestamp, merge into existing
      if (newTime >= existingTime) {
        mergedMap.set(user.id, { ...existing, ...user });
      } else {
        // Otherwise, merge existing (newer) on top of the old incoming user
        mergedMap.set(user.id, { ...user, ...existing });
      }
    };

    // 1. Add base defaults
    DEFAULT_DEMO_USERS.forEach(u => mergeUserSmart(u));
    
    // 2. Add custom local storage users (which might contain offline changes)
    localUsers.forEach(u => mergeUserSmart(u));

    // 3. Add database users (which contains real-time synced records from all devices)
    dbUsers.forEach(u => mergeUserSmart(u));

    return Array.from(mergedMap.values());
  },

  updateStatus: async (userId: string, status: UserStatus, lat?: number, lng?: number, shiftStartTime?: string) => {
    const now = new Date().toISOString();
    const updateData: any = { 
      status, 
      status_start_time: now, 
      last_update: now 
    };

    if (lat !== undefined && lat !== null) {
      updateData.last_lat = lat;
    }
    if (lng !== undefined && lng !== null) {
      updateData.last_lng = lng;
    }

    if (shiftStartTime) {
      updateData.shift_start_time = shiftStartTime;
    }

    // Synchronously update the fallback users and current session user in localStorage to keep maps, lists and panels synced instantly
    try {
      const rawLocal = localStorage.getItem("towassist_fallback_users");
      let localUsers: User[] = rawLocal ? JSON.parse(rawLocal) : [];
      let userIndex = localUsers.findIndex(u => u.id === userId);
      
      if (userIndex >= 0) {
        localUsers[userIndex] = { ...localUsers[userIndex], ...updateData };
      } else {
        // Look up from central DEFAULT_DEMO_USERS to extend them with locations safely
        const foundDemo = DEFAULT_DEMO_USERS.find(u => u.id === userId);
        if (foundDemo) {
          localUsers.push({ ...foundDemo, ...updateData });
        } else {
          localUsers.push({ id: userId, name: "Conductor", email: "", role: "driver", ...updateData });
        }
      }
      localStorage.setItem("towassist_fallback_users", JSON.stringify(localUsers));

      // Also update the active session user to keep the state of the logged-in user congruent
      const rawSession = localStorage.getItem("towassist_user");
      if (rawSession) {
        const sessionUser = JSON.parse(rawSession);
        if (sessionUser.id === userId) {
          localStorage.setItem("towassist_user", JSON.stringify({ ...sessionUser, ...updateData }));
        }
      }
    } catch (localErr) {
      console.warn("Failed to synchronize local storage fallback user state:", localErr);
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
  
  // Bi-directional Synchronization with Supabase database
  syncWithSupabase: async () => {
    try {
      // Test basic connection
      const { error: testError } = await supabase.from("users").select("id").limit(1);
      if (testError) {
        return { success: false, error: testError.message };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || "Error al conectar con la base de datos de Supabase" };
    }

    let syncedUsersCount = 0;
    let syncedServicesCount = 0;
    let syncedIntegrationsCount = 0;

    // 1. Sync local and default demo users to Supabase
    try {
      const rawLocal = localStorage.getItem("towassist_fallback_users");
      let localUsers: User[] = [];
      if (rawLocal) {
        localUsers = JSON.parse(rawLocal);
      }

      // Load deleted users list to filter out permanently deleted accounts during sync
      let deletedIds: string[] = [];
      try {
        const rawDeleted = localStorage.getItem("towassist_deleted_users");
        if (rawDeleted) {
          deletedIds = JSON.parse(rawDeleted);
        }
      } catch (e) {}

      // Purge deleted users from Supabase first
      for (const delId of deletedIds) {
        try {
          await supabase
            .from("users")
            .delete()
            .eq("id", delId);
        } catch (e) {
          console.warn(`[SYNC] Error purging deleted user ${delId} from Supabase:`, e);
        }
      }

      // Merge DEFAULT_DEMO_USERS with fallback local users to ensure the vital records are ALWAYS present unless deleted
      const mergedUsersMap = new Map<string, User>();
      DEFAULT_DEMO_USERS.forEach(u => {
        if (!deletedIds.includes(u.id)) {
          mergedUsersMap.set(u.id, u);
        }
      });
      if (Array.isArray(localUsers)) {
        localUsers.forEach(u => {
          if (!deletedIds.includes(u.id)) {
            mergedUsersMap.set(u.id, u);
          }
        });
      }

      const usersToSync = Array.from(mergedUsersMap.values());

      for (const user of usersToSync) {
        // Map all 13 columns to guarantee fully robust and correct insertions on Supabase
        const cleanUser = {
          id: user.id,
          name: user.name || "Usuario",
          email: user.email,
          phone: user.phone || null,
          mobile: user.mobile || null,
          area: user.area || null,
          role: ['admin', 'call_center', 'driver'].includes(user.role) ? user.role : 'driver',
          status: ['DISPONIBLE', 'EN SERVICIO', 'MANTENIMIENTO', 'INACTIVO', 'TERMINE TURNO'].includes(user.status) ? user.status : 'DISPONIBLE',
          status_start_time: user.status_start_time || new Date().toISOString(),
          shift_start_time: user.shift_start_time || null,
          last_lat: typeof user.last_lat === 'number' ? user.last_lat : null,
          last_lng: typeof user.last_lng === 'number' ? user.last_lng : null,
          last_update: user.last_update || new Date().toISOString()
        };

        const { data: existingUserById, error: idCheckError } = await supabase
          .from("users")
          .select("id")
          .eq("id", cleanUser.id)
          .maybeSingle();

        let error = null;
        if (!idCheckError && existingUserById) {
          const { error: updateErr } = await supabase
            .from("users")
            .update(cleanUser)
            .eq("id", cleanUser.id);
          error = updateErr;
        } else {
          const { error: insertErr } = await supabase
            .from("users")
            .insert([cleanUser]);
          error = insertErr;
        }

        if (!error) syncedUsersCount++;
        else console.warn("[SYNC] Error saving user to database:", cleanUser.id, error);
      }
    } catch (e) {
      console.warn("Users sync warning:", e);
    }

    // 2. Sync local services to Supabase
    try {
      const rawLocal = localStorage.getItem("towassist_fallback_services");
      if (rawLocal) {
        const localServices = JSON.parse(rawLocal);
        if (Array.isArray(localServices)) {
          for (const srv of localServices) {
            const { error } = await supabase.from("services").upsert([srv]);
            if (!error) syncedServicesCount++;
          }
        }
      }
    } catch (e) {
      console.warn("Services sync warning:", e);
    }

    // 3. Sync local integrations to Supabase
    try {
      const rawLocal = localStorage.getItem("towassist_fallback_integrations");
      if (rawLocal) {
        const localInts = JSON.parse(rawLocal);
        if (Array.isArray(localInts)) {
          for (const integration of localInts) {
            const { error } = await supabase.from("integrations").upsert([integration]);
            if (!error) syncedIntegrationsCount++;
          }
        }
      }
    } catch (e) {
      console.warn("Integrations sync warning:", e);
    }

    // 4. Download latest state from Supabase to fully align browser state
    try {
      const { data: dbUsers, error: usersErr } = await supabase.from("users").select("*");
      if (!usersErr && dbUsers && dbUsers.length > 0) {
        localStorage.setItem("towassist_fallback_users", JSON.stringify(dbUsers));
      }

      const { data: dbServices, error: srvErr } = await supabase.from("services").select("*");
      if (!srvErr && dbServices) {
        localStorage.setItem("towassist_fallback_services", JSON.stringify(dbServices));
      }

      const { data: dbIntegrations, error: intErr } = await supabase.from("integrations").select("*");
      if (!intErr && dbIntegrations) {
        localStorage.setItem("towassist_fallback_integrations", JSON.stringify(dbIntegrations));
      }
    } catch (e) {
      console.warn("Pull server data warning:", e);
    }

    return {
      success: true,
      syncedUsers: syncedUsersCount,
      syncedServices: syncedServicesCount,
      syncedIntegrations: syncedIntegrationsCount
    };
  },

  // Admin User Management
  createUser: async (userData: { id?: string; name: string; email: string; phone?: string; mobile?: string; area?: string; role: string }) => {
    const cleanId = userData.id && userData.id.trim() ? userData.id.trim() : `user-${Date.now()}`;
    const cleanEmail = userData.email ? userData.email.toLowerCase().trim() : "";
    const cleanName = userData.name ? userData.name.trim() : "";
    const cleanPhone = userData.phone && userData.phone.trim() ? userData.phone.trim() : null;
    const cleanMobile = userData.mobile && userData.mobile.trim() ? userData.mobile.trim() : null;
    const cleanArea = userData.area && userData.area.trim() ? userData.area.trim() : null;
    const cleanRole = userData.role ? userData.role.trim() : "driver";

    if (!cleanName || !cleanEmail) {
      return { success: false, id: "", error: "El Nombre y el Correo de Acceso son requeridos." };
    }

    // Explicitly define all 13 columns of the users table to prevent any constraint failure on Supabase
    const finalData = {
      id: cleanId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      mobile: cleanMobile,
      area: cleanArea,
      role: ['admin', 'call_center', 'driver'].includes(cleanRole) ? cleanRole : 'driver',
      status: "DISPONIBLE",
      status_start_time: new Date().toISOString(),
      shift_start_time: null,
      last_lat: null,
      last_lng: null,
      last_update: new Date().toISOString()
    };

    let dbSuccess = false;
    let dbErrorMessage = "";

    try {
      // 1. Evitar violación de restricción UNIQUE en email verificando antes en la base de datos
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id, name")
        .eq("email", cleanEmail)
        .maybeSingle();

      if (!checkError && existingUser && existingUser.id !== cleanId) {
        return {
          success: false,
          id: cleanId,
          error: `El correo electrónico "${cleanEmail}" ya está registrado a nombre de "${existingUser.name}" (ID de usuario registrado: ${existingUser.id}). Por favor ingrese un correo diferente.`
        };
      }

      // 2. Realizar inserción de datos limpios de manera altamente resiliente
      const { data: existingUserById, error: idCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("id", cleanId)
        .maybeSingle();

      let error = null;
      if (!idCheckError && existingUserById) {
        const { error: updateErr } = await supabase
          .from("users")
          .update(finalData)
          .eq("id", cleanId);
        error = updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from("users")
          .insert([finalData]);
        error = insertErr;
      }
      
      if (error) {
        console.warn("Supabase user insertion error:", error);
        dbErrorMessage = error.message;
      } else {
        dbSuccess = true;
      }
    } catch (e: any) {
      console.warn("Encountered exception inserting user onto Supabase:", e);
      dbErrorMessage = e?.message || String(e);
    }

    // 3. Mantener fallback de almacenamiento local sincronizado
    try {
      const rawLocal = localStorage.getItem("towassist_fallback_users");
      let localUsers: any[] = rawLocal ? JSON.parse(rawLocal) : [];
      const existingIdx = localUsers.findIndex(u => u.id === cleanId);
      if (existingIdx >= 0) {
        localUsers[existingIdx] = { ...localUsers[existingIdx], ...finalData };
      } else {
        localUsers.push(finalData);
      }
      localStorage.setItem("towassist_fallback_users", JSON.stringify(localUsers));
    } catch (e) {
      console.error("Local storage fallback user insert error:", e);
    }

    if (!dbSuccess && dbErrorMessage) {
      console.warn("Database save failed, but user was registered locally in browser fallback storage:", dbErrorMessage);
    }

    return { success: dbSuccess, id: cleanId, error: dbErrorMessage };
  },

  deleteUser: async (id: string) => {
    try {
      await supabase
        .from("users")
        .delete()
        .eq("id", id);
    } catch (e) {
      console.warn("deleteUser cloud error:", e);
    }

    // Add to deleted users registry to prevent defaults resurrection
    try {
      const rawDeleted = localStorage.getItem("towassist_deleted_users");
      const deletedIds = rawDeleted ? JSON.parse(rawDeleted) : [];
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem("towassist_deleted_users", JSON.stringify(deletedIds));
      }
    } catch (e) {
      console.error("Local storage deleted tracking error:", e);
    }

    try {
      const rawLocal = localStorage.getItem("towassist_fallback_users");
      if (rawLocal) {
        const localUsers = JSON.parse(rawLocal);
        const filtered = localUsers.filter((u: any) => u.id !== id);
        localStorage.setItem("towassist_fallback_users", JSON.stringify(filtered));
      }
    } catch (e) {
      console.error("Local storage user deletion error:", e);
    }
  },

  // Admin Integration Management
  getIntegrations: async (): Promise<Integration[]> => {
    let dbIntegrations: Integration[] = [];
    try {
      const { data, error } = await supabase
        .from("integrations")
        .select("*");
      if (!error && Array.isArray(data)) {
        dbIntegrations = data;
      }
    } catch (e) {
      console.warn("getIntegrations cloud lookup failed:", e);
    }

    let localInts: Integration[] = [];
    try {
      const rawLocal = localStorage.getItem("towassist_fallback_integrations");
      if (rawLocal) {
        localInts = JSON.parse(rawLocal);
      }
    } catch (e) {
      console.error("Local storage integrations parsing error:", e);
    }

    const merged = [...dbIntegrations];
    localInts.forEach(li => {
      if (!merged.some(mi => mi.id === li.id)) {
        merged.push(li);
      }
    });

    return merged;
  },

  createIntegration: async (intData: { name: string; url: string }) => {
    const id = `int-${Date.now()}`;
    const finalData = { id, ...intData, active: true };

    try {
      const { error } = await supabase
        .from("integrations")
        .insert([finalData]);
      if (error) {
        console.warn("createIntegration cloud insertion failed:", error);
      }
    } catch (e) {
      console.warn("Exception inserting integration on Supabase:", e);
    }

    try {
      const rawLocal = localStorage.getItem("towassist_fallback_integrations");
      const localInts = rawLocal ? JSON.parse(rawLocal) : [];
      localInts.push(finalData);
      localStorage.setItem("towassist_fallback_integrations", JSON.stringify(localInts));
    } catch (e) {
      console.error("local storage fallback integration write error:", e);
    }

    return { success: true, id };
  },

  updateIntegrationStatus: async (id: string, active: boolean) => {
    try {
      await supabase
        .from("integrations")
        .update({ active })
        .eq("id", id);
    } catch (e) {
      console.warn("updateIntegrationStatus cloud update failed:", e);
    }

    try {
      const rawLocal = localStorage.getItem("towassist_fallback_integrations");
      if (rawLocal) {
        const localInts: Integration[] = JSON.parse(rawLocal);
        const updated = localInts.map(li => li.id === id ? { ...li, active } : li);
        localStorage.setItem("towassist_fallback_integrations", JSON.stringify(updated));
      }
    } catch (e) {
      console.error("local storage fallback integration update error:", e);
    }
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
