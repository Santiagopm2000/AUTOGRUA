export type UserRole = 'driver' | 'admin' | 'call_center';
export type UserStatus = 'DISPONIBLE' | 'EN SERVICIO' | 'MANTENIMIENTO' | 'TERMINE TURNO';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
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
