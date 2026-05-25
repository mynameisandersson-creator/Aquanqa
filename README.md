# Aquanqa Attendance Terminal

Terminal móvil de asistencia para Aquanqa (frío y despacho), con captura por **cámara web** y registro en **PostgreSQL** usando **Node + Express (JavaScript)**.

## Frontend
- React + Tailwind
- Flujo rápido: escaneo -> confirmación -> registro -> auto-reset
- Cámara web en vivo
- Captura de foto facial
- Grabación corta de video de reconocimiento
- Método de marcación: facial o táctil

## Backend (Node + Express + PostgreSQL)
- `POST /api/attendance/scan`
  - valida `employeeCode`
  - recibe `faceImage` y `video`
  - registra asistencia y evidencia biométrica
- `GET /api/reports/attendance` devuelve informe empresarial
- `GET /api/health` estado del API

## Base de datos
- Archivo: `db/schema.sql`
- Tablas: `employees`, `attendance_records`, `recognition_evidence`
- Vista: `attendance_report`

## Variables de entorno
- `DATABASE_URL=postgres://user:pass@host:5432/aquanqa`
- `PORT=4000`
- `VITE_API_BASE=http://localhost:4000`

## Ejecutar
```bash
npm install
npm run server
npm run dev
```


## Deploy (Railway)
- Start command recomendado: `npm run start`
- Scripts incluidos:
  - `npm run start`
  - `npm run railway:start`


## Solución de crash en Railway (`Missing railway:start script`)
Si Railway muestra logs como **"npm ERR! missing script: railway:start"**, significa que el servicio intentó ejecutar un comando de inicio que no existía.

### Qué se corrigió
- Se agregó en `package.json`:
  - `"start": "node server/index.js"`
  - `"railway:start": "npm run build && node server/index.js"`
- Se agregó `railway.json` para forzar el start command correcto: `npm run railway:start`.

### Checklist de despliegue
1. Mergear el branch con estos cambios a `main`.
2. En Railway, confirmar variable `DATABASE_URL`.
3. Redeploy manual (o esperar auto-deploy).
4. Verificar:
   - `/api/health` -> `{ "ok": true }`
   - `/` -> página "Aquanqa Attendance API"

### Notas
- Si solo quieres backend sin build de Vite, usa start command: `npm run start`.
- Para evitar incompatibilidades de runtime, se incluye `.nvmrc` con Node `20`.


## Ver frontend (React) y backend (API)
### URLs del aplicativo desplegado
- Frontend (React): `https://TU-DOMINIO-RAILWAY/`
- Health API: `https://TU-DOMINIO-RAILWAY/api/health`
- Reporte API: `https://TU-DOMINIO-RAILWAY/api/reports/attendance`

### Importante
- Si en `/` solo ves "Aquanqa Attendance API", entonces Railway está corriendo backend pero **no encontró `dist/`**.
- Con `railway:start` (`npm run build && node server/index.js`) se genera `dist` y el servidor ahora sirve React en `/` automáticamente.


### Railway recomendado (más estable)
- Build command: `npm run build`
- Start command: `npm run start`
- Esto evita compilar en cada arranque del contenedor y reduce reinicios.


## Función principal del aplicativo
La función principal es registrar asistencia en segundos:
1. **Escanear** (📷): abre cámara, captura foto y video corto.
2. **Confirmar** (🪪): valida identidad del trabajador.
3. **Registrar** (✅): guarda asistencia y evidencia en PostgreSQL.

## Estructura React (direcciones)
- App principal: `src/App.jsx`
- Entrada React: `src/main.jsx`
- Estilos globales: `src/styles.css`
- Config Tailwind: `tailwind.config.js`

## Seguimiento visual (navbar de pasos)
Se implementó una barra de progreso con iconos en la parte superior del móvil:
- 📷 Escanear
- 🪪 Confirmar
- ✅ Registrar
