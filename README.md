# Aquanqa Attendance Terminal

Aplicativo full-stack para marcación de asistencia en entorno de frío/dispatch con captura por webcam, validación biométrica (facial/táctil), evidencia de imagen/video y persistencia en PostgreSQL.

---

## 1) Arquitectura general

- **Frontend:** React + Vite + Tailwind (`src/`)
- **Backend:** Node.js + Express (`server/`)
- **Base de datos:** PostgreSQL (`db/schema.sql`)
- **Storage local:** `uploads/` (fotos ID, capturas faciales, videos)
- **Deploy:** Railway (`railway.json`, `.nvmrc`)

---

## 2) Credenciales administrativas (predefinidas en UI)

En el panel Admin del frontend:

- **Usuario admin:** `admin.aquanqa`
- **Clave admin:** `Aquanqa@2026!`

Además se exige captcha tipo imagen para ingresar al panel administrativo.

> Nota: estas credenciales están definidas para pruebas. En producción se recomienda moverlas a backend + variables seguras.

---

## 3) Funcionalidad principal

### Panel Asistencia (Empleado)

Flujo:
1. Selección de panel `👷 Panel Asistencia`.
2. Activación de cámara.
3. Ingreso de identidad: **ID empleado o nombre completo**.
4. Selección de método:
   - `👤 Facial`
   - `🖐 Táctil` (auto-seleccionado en móvil)
5. Resolución de captcha anti-bot.
6. Detección (`➡ Detectar`) y confirmación.
7. Registro de asistencia en BD.

### Panel Admin (Administrativo)

Flujo:
1. Selección de panel `🛠 Panel Admin`.
2. Login admin (usuario + clave + captcha imagen).
3. Registro de empleado con foto de identificación.
4. Consulta visual de datos:
   - tabla de empleados
   - tabla de asistencias
   - visualización de foto ID

---

## 4) Endpoints API

### Salud
- `GET /api/health`

### Asistencia
- `POST /api/attendance/scan`
  - Acepta `employeeCode` o `employeeIdentity`
  - Acepta `method` (`face` | `fingerprint`)
  - Acepta `faceImage` (multipart)
  - Guarda asistencia + evidencia + referencia foto ID

### Administración
- `POST /api/admin/users` *(si se usa backend admin completo)*
- `POST /api/admin/employees` *(multipart con `idPhoto`)*
- `GET /api/admin/employees`

### Reportes
- `GET /api/reports/attendance`

---

## 5) Base de datos (tablas)

Definidas en `db/schema.sql`:

- `app_users`
- `employees`
- `attendance_records`
- `recognition_evidence`
- `biometric_enrollments`
- vista: `attendance_report`

Relación clave:
- `employees` ↔ `attendance_records`
- `attendance_records` ↔ `recognition_evidence`
- `app_users` puede vincularse con `employees` y enrolamientos

---

## 6) Estructura del proyecto

- `src/App.jsx` → UI principal (Panel Asistencia + Panel Admin)
- `src/main.jsx` → entrada React
- `src/styles.css` → estilos base
- `server/index.js` → API Express + estáticos
- `server/db.js` → pool PostgreSQL
- `db/schema.sql` → esquema relacional
- `uploads/` → evidencia local
- `railway.json` → build/start deploy

---

## 7) Variables de entorno

- `DATABASE_URL=postgres://user:pass@host:5432/aquanqa`
- `PORT=4000`
- `VITE_API_BASE=http://localhost:4000`

---

## 8) Ejecución local

```bash
npm install
npm run build
npm run start
```

Para desarrollo frontend:

```bash
npm run dev
```

---

## 9) Deploy Railway

Configuración recomendada:
- **Build command:** `npm run build`
- **Start command:** `npm run start`

Verificación post deploy:
- `/` → frontend React
- `/api/health` → `{ "ok": true }`
- `/api/reports/attendance` → datos de asistencia

---

## 10) Proceso de registro biométrico (resumen)

1. Admin registra empleado y sube foto ID.
2. Empleado marca asistencia en terminal con cámara.
3. API registra coincidencia (score/match), evidencia capturada y hora.
4. Reportes consultables desde endpoint y panel admin visual.

---

## 11) Seguridad y mejoras recomendadas

- Mover credenciales admin del frontend al backend con JWT/sesiones.
- Reemplazar captcha mock por proveedor real (Cloudflare Turnstile / reCAPTCHA).
- Hashear contraseñas en backend (bcrypt/argon2).
- Agregar auditoría de accesos admin y rate limiting.
- Incorporar migraciones versionadas (Prisma/Knex/Flyway).


## 12) Módulos biométricos y reglas de foto (MySQL)
Se implementó soporte en base de datos para control de calidad biométrica:

- Tabla `photo_rules`:
  - reglas de validación de foto (área de rostro, brillo, blur, accesorios)
- Tabla `biometric_enrollments`:
  - enrolamiento facial/táctil con calidad y regla usada
- Tabla `recognition_evidence` (ampliada):
  - `employee_id`, `rule_id`, `comparison_score`, `biometric_match`, `accessories_detected`

### Regla por defecto cargada
- `DEFAULT_NO_ACCESSORIES`: no permite accesorios durante captura.

### Endpoint nuevo
- `GET /api/admin/photo-rules` -> lista reglas activas de foto.

### Validación en escaneo
En `POST /api/attendance/scan`:
- si `accessoriesDetected=true` y la regla no permite accesorios, retorna error `422`.


## 13) Inicializar MySQL en Railway
1. Crear servicio MySQL en Railway y copiar `DATABASE_URL`.
2. Configurar `DATABASE_URL` en servicio web.
3. Ejecutar `db/schema.sql` en la consola SQL de Railway (tab Database).
4. Verificar tablas creadas: `employees`, `photo_rules`, `biometric_enrollments`, `recognition_evidence`, `attendance_records`.
5. Probar endpoints:
   - `GET /api/health`
   - `GET /api/admin/photo-rules`
   - `POST /api/admin/employees` (con `idPhoto`)
   - `POST /api/attendance/scan` (con `employeeIdentity` + `faceImage`)


## 14) Inicio automático de schema en deploy
- `npm run railway:start` ahora ejecuta `init-db.js` antes del servidor.
- `init-db.js` aplica `db/schema.sql` en MySQL usando `DATABASE_URL`.
- Esto evita errores por tablas faltantes al iniciar el backend.
