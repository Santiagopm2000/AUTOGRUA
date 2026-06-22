# Guía de Instalación y Compilación con CapacitorJS para Axistcorp

Esta guía contiene los pasos detallados para convertir tu aplicación web React (Vite) en una aplicación móvil nativa para **Android** e **iOS** usando **CapacitorJS**.

---

## 📋 Requisitos Previos en tu Computadora

Antes de empezar en tu máquina local, debes tener instalado:
1. **Node.js** (v18 o superior).
2. **Android Studio** (para compilar en Android / APK).
3. **Xcode** (solo si estás en macOS y deseas compilar para iPhone / iOS).

---

## 🚀 Pasos de Configuración Paso a Paso

### Paso 1: Instalar las dependencias de Capacitor
En la terminal del proyecto (en tu computadora local), ejecuta los siguientes comandos para instalar el SDK central de Capacitor:

```bash
npm install @capacitor/core @capacitor/cli
```

### Paso 2: Inicializar Capacitor (Ya preconfigurado ⚡)
Ya hemos creado en la raíz del proyecto el archivo `capacitor.config.json` inicializado para ti:
- **ID de la App**: `com.axistcorp.autogrua`
- **Nombre**: `Axistcorp`
- **Carpeta de distribución**: `dist`

### Paso 3: Instalar las plataformas móviles nativas
Instala las dependencias de plataformas para Android y/o iOS según tus necesidades:

```bash
# Para Android
npm install @capacitor/android
npx cap add android

# Para iOS (Requiere macOS)
npm install @capacitor/ios
npx cap add ios
```

---

## 📍 Configuración de Permisos de GPS (Crucial para el Tracking)

Para que el georreferenciador funcione correctamente en segundo plano y pida acceso al GPS nativo del dispositivo, debes configurar los permisos:

### 🤖 Configuración para Android
Abre el archivo de manifiesto de Android en tu editor de código o dentro de Android Studio:
📁 Ruta: `android/app/src/main/AndroidManifest.xml`

Asegúrate de agregar estas líneas de permisos dentro de la etiqueta `<manifest>` (antes de `<application>`):

```xml
<!-- Permisos de Ubicación -->
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
```

### 🍏 Configuración para iOS
Abre el archivo `Info.plist` en Xcode o directamente:
📁 Ruta: `ios/App/App/Info.plist`

Agrega las siguientes descripciones de permisos (llaves) para explicarle al sistema de Apple por qué necesitas usar el GPS en tiempo real:

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Axistcorp necesita acceso a tu ubicación en tiempo real para el seguimiento de la grúa mientras trabajas.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Axistcorp requiere ubicar tu grúa en tiempo real en segundo plano para el despacho eficiente de servicios del Call Center.</string>
```

---

## 🛠️ Compilación y Sincronización Diaria

Cada vez que hagas un cambio en la interfaz de React y quieras probarlo en los teléfonos, debes seguir este flujo de 3 comandos:

1. **Construye la App de React**:
   ```bash
   npm run build
   ```
2. **Copia los archivos modernos al proyecto nativo (Android/iOS)**:
   ```bash
   npx cap sync
   ```
3. **Abre el proyecto en la herramienta de desarrollo móvil**:
   ```bash
   # Para Android Studio (Generar tu APK)
   npx cap open android

   # Para Xcode (Generar tu App en iPhone)
   npx cap open ios
   ```

---

## 📱 ¿Cómo generar el APK final en Android Studio?

1. Tras ejecutar `npx cap open android`, se abrirá **Android Studio** cargando tu proyecto.
2. Espera a que termine la sincronización de Gradle (barra de progreso abajo a la derecha).
3. En el menú superior de Android Studio, haz clic en:
   **Build** ➡️ **Build Bundle(s) / APK(s)** ➡️ **Build APK(s)**.
4. Una vez compilado, aparecerá una burbuja de notificación en la esquina inferior derecha con un enlace que dice **"locate"**. Haz clic allí para abrir la carpeta donde está tu archivo **`app-debug.apk`** listo para instalar en cualquier celular flotante de tus conductores.
