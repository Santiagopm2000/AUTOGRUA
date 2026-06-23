-- ==========================================================================================
-- GUÍA DE RESOLUCIÓN PARA EL ERROR DE SINTAXIS "42601: near END"
-- ==========================================================================================
-- ¿POR QUÉ OCURRE ESTE ERROR?
-- Algunos clientes SQL (como DBeaver, pgAdmin, extensiones de VS Code o parsers intermedios)
-- dividen ciegamente el script en cada punto y coma (;) que encuentran. Esto corrompe las 
-- funciones en PL/pgSQL (delimitadas por $$) porque el punto y coma de sentencias como 
-- "END IF;" es interpretado como el fin de la consulta completa, dejando la función sin cerrar.
--
-- SOLUCIONES PARA EJECUTAR ESTE SCRIPT:
-- 1. EN SUPABASE SQL EDITOR (Recomendado): Copia todo el script, pégalo en "SQL Editor" -> 
--    "New Query" y haz clic en "Run". Supabase maneja bloques $$ de manera nativa sin dividirlos.
-- 2. EN DBeAVER / pgADMIN: Selecciona todo el texto y presiona "Ejecutar como Script" (F5 o Alt+X 
--    en DBeaver) en lugar de "Ejecutar Sentencia" (Ctrl+Enter).
-- 3. EJECUCIÓN POR PARTES: Si tu editor sigue dividiendo, ejecuta primero la PARTE 1, 
--    luego la PARTE 2 (bloque por bloque de funciones) y finalmente la PARTE 3.
-- ==========================================================================================

-- ====================================================================
-- PARTE 1: CREACIÓN DE TABLAS E ÍNDICES (Seguro contra cortes)
-- ====================================================================

-- 1. Limpieza de tablas existentes (eliminar en orden jerárquico por claves foráneas)
DROP TABLE IF EXISTS gps_logs CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS integrations CASCADE;
DROP TABLE IF EXISTS driver_status_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Creación de la Tabla de Usuarios (users)
-- Almacena administradores, despachadores del call center y conductores de grúa.
CREATE TABLE users (
    id TEXT PRIMARY KEY,                             -- ID de usuario (puede ser manual como user-px6 o auto)
    name TEXT NOT NULL,                              -- Nombre completo
    email TEXT NOT NULL UNIQUE,                      -- Correo de acceso corporativo (clave única de inicio de sesión)
    phone TEXT,                                      -- Teléfono fijo / de oficina
    mobile TEXT,                                     -- Móvil / celular (WhatsApp directo)
    area TEXT,                                       -- Área o departamento (ej: Logística, Sistemas, Despacho)
    role TEXT NOT NULL DEFAULT 'driver' CHECK (role IN ('admin', 'call_center', 'driver')),
    status TEXT NOT NULL DEFAULT 'DISPONIBLE' CHECK (status IN ('DISPONIBLE', 'EN SERVICIO', 'MANTENIMIENTO', 'INACTIVO', 'TERMINE TURNO')),
    status_start_time TIMESTAMPTZ DEFAULT NOW(),    -- Inicio del estado actual
    shift_start_time TIMESTAMPTZ,                   -- Inicio del turno de trabajo actual
    last_lat DOUBLE PRECISION,                       -- Última latitud GPS conocida
    last_lng DOUBLE PRECISION,                       -- Última longitud GPS conocida
    last_update TIMESTAMPTZ DEFAULT NOW()            -- Última actualización de posición o estado
);

-- 3. Creación de la Tabla de Servicios de Grúa (services)
-- Gestiona las solicitudes e historial de servicios asignados a conductores.
CREATE TABLE services (
    id TEXT PRIMARY KEY,                             -- ID del servicio generado por el frontend (srv-...)
    driver_id TEXT REFERENCES users(id) ON DELETE SET NULL, -- Conductor asignado (Foreign Key)
    client_name TEXT NOT NULL,                       -- Nombre del cliente que requiere auxilio
    client_phone TEXT,                               -- Teléfono celular del cliente
    vehicle_info TEXT NOT NULL,                      -- Placas, marca, modelo y color del vehículo
    origin_address TEXT NOT NULL,                    -- Dirección de recogida (Origen)
    destination_address TEXT,                        -- Dirección de destino (Taller, parqueadero, etc.)
    status TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (status IN ('PENDIENTE', 'EN_CAMINO', 'COMPLETADO', 'CANCELADO')),
    duration_seconds INTEGER,                        -- Duración del servicio (en segundos, calculado al cerrar)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Creación de la Tabla de Histórico de Coordenadas GPS (gps_logs)
-- Almacena el histórico de posiciones de las grúas para trazar rutas.
CREATE TABLE gps_logs (
    id BIGSERIAL PRIMARY KEY,                        -- ID autoincremental
    driver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Conductor asociado (Foreign Key)
    lat DOUBLE PRECISION NOT NULL,                   -- Latitud registrada
    lng DOUBLE PRECISION NOT NULL,                   -- Longitud registrada
    recorded_at TIMESTAMPTZ DEFAULT NOW()            -- Fecha y hora del registro satelital
);

-- 5. Creación de la Tabla de Integraciones (integrations)
-- Permite configurar Webhooks salientes para enviar alertas en tiempo real a n8n, Make, etc.
CREATE TABLE integrations (
    id TEXT PRIMARY KEY,                             -- ID de integración generado (int-...)
    name TEXT NOT NULL,                              -- Nombre descriptivo de la automatización
    url TEXT NOT NULL,                               -- URL destino del Webhook
    active BOOLEAN NOT NULL DEFAULT TRUE,            -- Estado (Activa / Inactiva)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Creación de la Tabla de Historial de Cambios de Estado del Conductor (driver_status_logs)
-- Almacena cada cambio de estado de los conductores para calcular indicadores de rendimiento.
CREATE TABLE driver_status_logs (
    id BIGSERIAL PRIMARY KEY,
    driver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    duration_seconds INTEGER                         -- Duración en segundos transcurridos en el estado anterior
);

-- 7. Creación de Índices para Consultas de Alto Rendimiento
CREATE INDEX idx_users_role_status ON users(role, status);
CREATE INDEX idx_services_status ON services(status);
CREATE INDEX idx_services_driver ON services(driver_id);
CREATE INDEX idx_gps_logs_driver_time ON gps_logs(driver_id, recorded_at DESC);
CREATE INDEX idx_driver_status_logs_driver ON driver_status_logs(driver_id, changed_at DESC);


-- ====================================================================
-- PARTE 2: FUNCIONES Y TRIGGERS (Ejecutar de manera independiente o completa)
-- ====================================================================

-- Trigger para registrar automáticamente los cambios de estado y calcular tiempos de inactividad o servicio
CREATE OR REPLACE FUNCTION log_driver_status_change()
RETURNS TRIGGER AS $$
DECLARE
    prev_start TIMESTAMPTZ;
    duration_secs INT;
BEGIN
    -- Solo actuar cuando se altere el estado actual del conductor
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        prev_start := OLD.status_start_time;
        IF (prev_start IS NOT NULL) THEN
            duration_secs := EXTRACT(EPOCH FROM (NOW() - prev_start));
        ELSE
            duration_secs := NULL;
        END IF;

        -- Grabar la traza temporal calculada
        INSERT INTO driver_status_logs (driver_id, previous_status, new_status, changed_at, duration_seconds)
        VALUES (NEW.id, OLD.status, NEW.status, NOW(), duration_secs);

        -- Actualizar tiempos en la fila del conductor
        NEW.status_start_time := NOW();
        NEW.last_update := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asociación del Trigger a la tabla de usuarios
DROP TRIGGER IF EXISTS trigger_driver_status_change ON users;
CREATE TRIGGER trigger_driver_status_change
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION log_driver_status_change();


-- Función de geolocalización por fórmula Haversine para despachar grúas por proximidad
CREATE OR REPLACE FUNCTION find_closest_drivers(client_lat DOUBLE PRECISION, client_lng DOUBLE PRECISION, limit_count INT DEFAULT 5)
RETURNS TABLE (
    driver_id TEXT,
    driver_name TEXT,
    status TEXT,
    distance_km DOUBLE PRECISION,
    mobile TEXT,
    last_lat DOUBLE PRECISION,
    last_lng DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        id AS driver_id,
        name AS driver_name,
        users.status AS status,
        -- Haversine formula (6371km es el radio terrestre medio)
        (6371 * acos(
            least(1.0, cos(radians(client_lat)) * cos(radians(users.last_lat)) * 
            cos(radians(users.last_lng) - radians(client_lng)) + 
            sin(radians(client_lat)) * sin(radians(users.last_lat)))
        )) AS distance_km,
        users.mobile AS mobile,
        users.last_lat,
        users.last_lng
    FROM users
    WHERE role = 'driver' 
      AND users.status = 'DISPONIBLE'
      AND users.last_lat IS NOT NULL 
      AND users.last_lng IS NOT NULL
    ORDER BY distance_km ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;


-- ====================================================================
-- PARTE 3: SEGURIDAD (RLS) Y SEMILLAS DE DATOS INICIALES (Seeding)
-- ====================================================================

-- Deshabilitar RLS (Row Level Security) para desarrollo rápido y productivo con "Anon Key"
-- Esto te permite conectarte inmediatamente desde tu PWA de React/Capacitor sin configurar complejas políticas JWT.
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE gps_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE driver_status_logs DISABLE ROW LEVEL SECURITY;

-- Inserción de Cuentas Demostrativas Corporativas Iniciales (Seeding)
INSERT INTO users (id, name, email, phone, mobile, area, role, status, last_lat, last_lng, last_update)
VALUES 
  (
    'user-px6', 
    'Usuario Creador (Admin)', 
    'px6.usa@gmail.com', 
    '+573100000000', 
    '+573100000000', 
    'Administración / Sistemas',
    'admin', 
    'DISPONIBLE', 
    NULL, 
    NULL, 
    NOW()
  ),
  (
    'demo-admin', 
    'Administrador Axistcorp', 
    'admin@axistcorp.com', 
    '+573000000000',
    '+573000000000',
    'Gerencia / Tecnología',
    'admin', 
    'DISPONIBLE', 
    NULL, 
    NULL, 
    NOW()
  ),
  (
    'demo-call-center', 
    'Operador Call Center', 
    'callcenter@axistcorp.com', 
    '+573111111111',
    '+573111111111',
    'Despacho / Call Center',
    'call_center', 
    'DISPONIBLE', 
    NULL, 
    NULL, 
    NOW()
  ),
  (
    'demo-driver-1', 
    'Carlos Mendoza (Grúa Camión)', 
    'conductor@axistcorp.com', 
    '+573001234567',
    '+573001234567',
    'Logística - Zona Norte',
    'driver', 
    'DISPONIBLE', 
    4.7110, 
    -74.0721, 
    NOW()
  ),
  (
    'demo-driver-2', 
    'Andrés Delgado (Grúa Cama)', 
    'conductor2@axistcorp.com', 
    '+573119876543',
    '+573119876543',
    'Logística - Zona Centro',
    'driver', 
    'EN SERVICIO', 
    4.6980, 
    -74.1021, 
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  mobile = EXCLUDED.mobile,
  area = EXCLUDED.area,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  last_lat = EXCLUDED.last_lat,
  last_lng = EXCLUDED.last_lng,
  last_update = EXCLUDED.last_update;

-- Integración de Webhook de Demostración Inicial (hacia n8n)
INSERT INTO integrations (id, name, url, active, created_at)
VALUES (
  'demo-int-n8n',
  'WhatsApp Webhook n8n',
  'https://primary-production.up.railway.app/webhook/axistcorp-whatsapp',
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;
