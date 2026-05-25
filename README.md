# Aquanqa Attendance Terminal

Terminal de asistencia rápida para trabajadores de frío y despacho.

## Frontend
- React + Tailwind
- Flujo: escaneo -> confirmación -> registro -> auto-reset
- Opción de método: facial o táctil

## Backend (Node + Express + PostgreSQL)
- `POST /api/attendance/scan` registra asistencia, comparación biométrica y evidencia (imagen/video)
- `GET /api/reports/attendance` obtiene informe consolidado para empresa
- `db/schema.sql` contiene tablas de empleados, asistencias y evidencias

## Variables
- `DATABASE_URL=postgres://user:pass@host:5432/aquanqa`
- `PORT=4000`

## Ejecutar
```bash
npm install
npm run server
npm run dev
```
