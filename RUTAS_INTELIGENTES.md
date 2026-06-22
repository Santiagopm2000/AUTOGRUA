# Diseño y Documentación de Rutas Inteligentes y Logs Operativos
## TowAssist Enterprise

Este documento establece la arquitectura técnica, estructuras de datos, optimizaciones de bases de datos relacionales y estrategias de integración con APIs de mapas para el despacho inteligente y el seguimiento en tiempo real de unidades de grúa y asistencia vial.

---

## 1. Arquitectura de Datos y Registro de Movimiento (Logs de GPS)

Para registrar las coordenadas, rutas trazadas y auditoría de velocidades o tiempos de viaje, se utiliza un modelo relacional de alta resolución en PostgreSQL/Supabase.

### 1.1 Tabla Histórica de Coordenadas (`gps_logs`)

Esta tabla graba de forma secuencial la posición emitida por el dispositivo móvil del conductor cuando está activo:

```sql
CREATE TABLE gps_logs (
    id BIGSERIAL PRIMARY KEY,                        -- Identificador secuencial indexado
    driver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- ID del conductor
    lat DOUBLE PRECISION NOT NULL,                   -- Latitud (WGS84)
    lng DOUBLE PRECISION NOT NULL,                   -- Longitud (WGS84)
    recorded_at TIMESTAMPTZ DEFAULT NOW()            -- Marca de tiempo en UTC
);

-- Índice compuesto para consultas instantáneas ordenadas cronológicamente
CREATE INDEX idx_gps_logs_driver_time 
ON gps_logs(driver_id, recorded_at DESC);
```

### 1.2 Cálculo SQL de Distancias Recorridas por Conductor

Para calcular cuántos kilómetros recorrió un conductor en un periodo determinado basándose en sus trazas históricas consecutivas, se puede usar la siguiente consulta analítica utilizando funciones de ventana en PostgreSQL:

```sql
WITH posiciones_secuenciales AS (
    SELECT 
        driver_id,
        lat,
        lng,
        recorded_at,
        LAG(lat) OVER (PARTITION BY driver_id ORDER BY recorded_at) AS prev_lat,
        LAG(lng) OVER (PARTITION BY driver_id ORDER BY recorded_at) AS prev_lng
    FROM gps_logs
    WHERE recorded_at >= NOW() - INTERVAL '24 hours'
),
distancias AS (
    SELECT 
        driver_id,
        recorded_at,
        -- Fórmula de Haversine para calcular distancia en kilómetros entre posiciones consecutivas
        (6371 * acos(
            least(1.0, cos(radians(lat)) * cos(radians(prev_lat)) * 
            cos(radians(prev_lng) - radians(lng)) + 
            sin(radians(lat)) * sin(radians(prev_lat)))
        )) AS segmento_distancia_km
    FROM posiciones_secuenciales
    WHERE prev_lat IS NOT NULL AND prev_lng IS NOT NULL
)
SELECT 
    driver_id,
    ROUND(SUM(segmento_distancia_km)::numeric, 2) AS kilometros_totales_24h,
    COUNT(*) AS puntos_reportados
FROM distancias
GROUP BY driver_id;
```

---

## 2. Despacho Inteligente por Proximidad Geográfica

El primer pilar de un "despacho inteligente" es saber quién es el conductor disponible que llegará más rápido.

### 2.1 Función de Proximidad Lineal (Haversine)

Cuando se crea un servicio de emergencia, enviamos la latitud y longitud del lugar del incidente para obtener inmediatamente el Top de conductores disponibles más cercanos ordenados por cercanía exacta:

```sql
CREATE OR REPLACE FUNCTION find_closest_drivers(
    client_lat DOUBLE PRECISION, 
    client_lng DOUBLE PRECISION, 
    limit_count INT DEFAULT 5
)
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
        -- Haversine formula (6371km es el radio promedio de la Tierra)
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
```

---

## 3. Optimización Espacial Avanzada: PostGIS

Si la flota escala a más de 500 unidades concurrentes y miles de despachos diarios, la fórmula Haversine calculada en tiempo de ejecución de CPU puede ralentizar la consulta. Para mitigar esto, se utiliza la extensión **PostGIS** nativa de PostgreSQL.

### 3.1 Transición del Schema a PostGIS

1. **Habilitar la extensión espacial:**
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

2. **Agregar una columna geográfica indexada a los usuarios:**
   ```sql
   -- Crear columna para almacenar coordenadas esféricas del satélite
   ALTER TABLE users ADD COLUMN geom_last_loc GEOGRAPHY(Point, 4326);

   -- Crear un índice espacial tipo GIST para queries en microsegundos
   CREATE INDEX idx_users_spatial_geom ON users USING GIST(geom_last_loc);
   ```

3. **Trigger para sincronizar la columna de lat/lng clásica con la espacial:**
   ```sql
   CREATE OR REPLACE FUNCTION update_user_gis_geom()
   RETURNS TRIGGER AS $$
   BEGIN
       IF (NEW.last_lat IS NOT NULL AND NEW.last_lng IS NOT NULL) THEN
           NEW.geom_last_loc := ST_SetSRID(ST_MakePoint(NEW.last_lng, NEW.last_lat), 4326)::geography;
       END IF;
       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   CREATE TRIGGER trigger_user_gis_sync
   BEFORE INSERT OR UPDATE ON users
   FOR EACH ROW
   EXECUTE FUNCTION update_user_gis_geom();
   ```

4. **Query de búsqueda espacial instantánea con PostGIS:**
   ```sql
   SELECT 
       id, 
       name,
       -- Calcula la distancia geodésica exacta en metros y la convierte en kilómetros
       (ST_Distance(geom_last_loc, ST_SetSRID(ST_MakePoint(:client_lng, :client_lat), 4326)::geography) / 1000) AS distance_km
   FROM users
   WHERE role = 'driver' AND status = 'DISPONIBLE'
   ORDER BY geom_last_loc <-> ST_SetSRID(ST_MakePoint(:client_lng, :client_lat), 4326)::geography -- Index-assisted Distance Order
   LIMIT 5;
   ```

---

## 4. Integración con APIs de Enrutamiento Inteligente (OSRM & Google Maps)

La distancia geométrica o lineal no considera el tráfico, puentes, sentidos viales ni el tiempo estimado de arribo (ETA) real. Por ello, la ruta óptima se calcula cruzando los puntos geográficos utilizando APIs profesionales.

```
                     ┌───────────────────────────┐
                     │                           │
  [Coordenadas] ────>│  find_closest_drivers()   │ ──(Filtra Top 3 más cercanos)──┐
                     │                           │                                │
                     └───────────────────────────┘                                │
                                                                                  v
 ┌───────────────────────────┐      ┌───────────────────────────┐      ┌───────────────────────────┐
 │                           │      │                           │      │                           │
 │      Google Maps API      │<─────│   Lógica de Negocio API   │<─────│    OSRM Engine (Libre)    │
 │ (Rutas Premium + Tráfico) │      │  (Filtra el mejor por ETA)│      │    (Ruta y Geometría)     │
 │                           │      │                           │      │                           │
 └───────────────────────────┘      └───────────────────────────┘      └───────────────────────────┘
```

### 4.1 Utilizando OSRM (Open Source Routing Machine) - Alternativa Libre y Gratuita

OSRM es un motor de enrutamiento libre que calcula rutas óptimas basadas en redes reales de calles de OpenStreetMap. Es ideal debido a su nulo costo de API.

**Ejemplo de llamada API Rest desde Node.js backend:**
```typescript
import axios from 'axios';

interface RouteResponse {
  distance: number; // en metros
  duration: number; // en segundos (ETA)
  geometry: string; // Codificada en formato polyline para dibujar en el mapa
}

export async function getOptimalRoute(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<RouteResponse> {
  // OSRM espera coordenadas en formato: lng,lat;lng,lat
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
  
  const response = await axios.get(url);
  const route = response.data.routes[0];
  
  return {
    distance: route.distance, // Metros directos de conducción viales
    duration: route.duration, // Segundos reales estimados de viaje
    geometry: route.geometry  // GeoJSON con la línea para renderizar en Leaflet/Google Maps
  };
}
```

### 4.2 Utilizando Google Maps Routes API (Premium con Tráfico en Tiempo Real)

Para una precisión absoluta en ciudades congestionadas, se utiliza Google Maps Routes API que estima el tiempo de llegada incorporando patrones históricos e incidentes de tráfico en tiempo real.

**Estructura del Payload para calcular la Matriz de Distancia:**
```bash
POST https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix
Headers:
  Content-Type: application/json
  X-Goog-Api-Key: TU_API_KEY
  X-Goog-FieldMask: originIndex,destinationIndex,distanceMeters,duration,travelAdvisory.speedReadingIntervals
```
**Body:**
```json
{
  "origins": [
    { "waypoint": { "location": { "latLng": { "latitude": 4.7110, "longitude": -74.0721 } } } }
  ],
  "destinations": [
    { "waypoint": { "location": { "latLng": { "latitude": 4.6980, "longitude": -74.1021 } } } }
  ],
  "travelMode": "DRIVE",
  "routingPreference": "TRAFFIC_AWARE"
}
```

---

## 5. Visualización de Rutas en la Consola Web

El sistema actual TowAssist incluye integraciones de mapas robustas mediante **Leaflet**. Para pintar la ruta inteligente óptima en el mapa del operador, se sigue este flujo en React:

```tsx
import React, { useEffect, useState } from 'react';
import { Polyline, Marker, Popup } from 'react-leaflet';

export function SmartRouteMap({ driverLoc, clientLoc }) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>([]);

  useEffect(() => {
    if (driverLoc && clientLoc) {
      // Solicitar el enrutamiento más corto vial a OSRM
      fetch(`https://router.project-osrm.org/route/v1/driving/${driverLoc.lng},${driverLoc.lat};${clientLoc.lng},${clientLoc.lat}?overview=full&geometries=geojson`)
        .then(res => res.json())
        .then(data => {
          if (data.routes && data.routes[0]) {
            const coords = data.routes[0].geometry.coordinates.map(
              ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
            );
            setRouteCoords(coords);
          }
        });
    }
  }, [driverLoc, clientLoc]);

  return (
    <>
      {/* Ubicaciones clave */}
      <Marker position={[driverLoc.lat, driverLoc.lng]}>
        <Popup>Unidad de Auxilio Vial Dispachada</Popup>
      </Marker>
      <Marker position={[clientLoc.lat, clientLoc.lng]}>
        <Popup>Locación del Cliente Afectado</Popup>
      </Marker>

      {/* Dibujar la ruta inteligente calculada por OSRM */}
      {routeCoords.length > 0 && (
        <Polyline 
          positions={routeCoords} 
          pathOptions={{ color: '#2563eb', weight: 4, opacity: 0.8 }} 
        />
      )}
    </>
  );
}
```

---

## 6. Resumen de Ventajas Operativas

1. **Eficiencia en Despachos:** Reducción de llamadas innecesarias pidiendo ubicaciones; el sistema calcula al instante quién está disponible y cerca.
2. **Auditoría Clara:** Los triggers registran cronometrajes sin depender de la red del celular del conductor.
3. **Optimización de Costos:** Al usar algoritmos libres de OSRM, las consultas complejas no generan costos directos de API, escalando de manera indefinida.
