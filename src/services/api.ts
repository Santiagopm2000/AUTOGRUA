import { User, Integration } from "../types";

const API_BASE = "/api";

export const api = {
  getDrivers: async (): Promise<User[]> => {
    const res = await fetch(`${API_BASE}/drivers`);
    return res.json();
  },

  updateStatus: async (userId: string, status: string, lat?: number, lng?: number) => {
    await fetch(`${API_BASE}/update-status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, status, lat, lng }),
    });
  },

  // Admin User Management
  createUser: async (data: { name: string; email: string; role: string }) => {
    const res = await fetch(`${API_BASE}/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  deleteUser: async (id: string) => {
    await fetch(`${API_BASE}/admin/users/${id}`, { method: "DELETE" });
  },

  // Admin Integration Management
  getIntegrations: async (): Promise<Integration[]> => {
    const res = await fetch(`${API_BASE}/admin/integrations`);
    return res.json();
  },

  createIntegration: async (data: { name: string; url: string }) => {
    const res = await fetch(`${API_BASE}/admin/integrations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  updateIntegrationStatus: async (id: string, active: boolean) => {
    await fetch(`${API_BASE}/admin/integrations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
  },

  getAdminStats: async () => {
    const res = await fetch(`${API_BASE}/admin/stats`);
    return res.json();
  }
};
