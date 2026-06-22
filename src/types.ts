export type UserRole = 'driver' | 'admin' | 'call_center';
export type UserStatus = 'DISPONIBLE' | 'EN SERVICIO' | 'MANTENIMIENTO' | 'TERMINE TURNO';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  mobile?: string;
  area?: string;
  role: UserRole;
  status: UserStatus;
  status_start_time?: string;
  shift_start_time?: string;
  last_lat?: number;
  last_lng?: number;
  last_update?: string;
}

export interface Integration {
  id: string;
  name: string;
  url: string;
  active: boolean;
}

export interface DriverStatusLog {
  id: number;
  driver_id: string;
  driver_name?: string;
  previous_status?: UserStatus | null;
  new_status: UserStatus;
  changed_at: string;
  duration_seconds?: number | null;
}

export type ServiceStatus = 'PENDIENTE' | 'EN_CAMINO' | 'COMPLETADO' | 'CANCELADO';

export interface Service {
  id: string;
  driver_id: string | null;
  driver_name?: string;
  client_name: string;
  client_phone?: string;
  vehicle_info: string;
  origin_address: string;
  destination_address?: string;
  status: ServiceStatus;
  created_at: string;
  updated_at: string;
  duration_seconds?: number | null;
}
