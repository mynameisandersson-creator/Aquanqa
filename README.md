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
