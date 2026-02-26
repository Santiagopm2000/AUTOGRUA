export type UserRole = 'driver' | 'admin';
export type UserStatus = 'DISPONIBLE' | 'EN SERVICIO' | 'MANTENIMIENTO' | 'TERMINE TURNO';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  status_start_time?: string;
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
