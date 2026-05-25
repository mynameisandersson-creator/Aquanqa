import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { query } from './db.js'

const app = express()
const port = process.env.PORT || 4000

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.join(__dirname, '..')
const uploadsDir = path.join(rootDir, 'uploads')
const distDir = path.join(rootDir, 'dist')
const publicDir = path.join(rootDir, 'public')

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

ensureDir(path.join(uploadsDir, 'faces'))
ensureDir(path.join(uploadsDir, 'videos'))
ensureDir(path.join(uploadsDir, 'ids'))

const storage = multer.diskStorage({
  destination(req, file, cb) {
    if (file.fieldname === 'video') return cb(null, path.join(uploadsDir, 'videos'))
    if (file.fieldname === 'idPhoto') return cb(null, path.join(uploadsDir, 'ids'))
    return cb(null, path.join(uploadsDir, 'faces'))
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
  },
})

const upload = multer({ storage })

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(uploadsDir))

const requireAdmin = (req, res, next) => {
  const role = req.headers['x-user-role']
  if (role !== 'admin') return res.status(403).json({ ok: false, message: 'Acceso solo administrador' })
  return next()
}

app.get('/api/health', (_, res) => res.json({ ok: true }))

app.post('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { username, fullName, email, passwordHash, role } = req.body
    if (!username || !fullName || !passwordHash || !role) return res.status(400).json({ ok: false, message: 'Faltan campos obligatorios' })
    await query(
      `INSERT INTO app_users (username, full_name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
      [username, fullName, email || null, passwordHash, role],
    )
    const created = await query('SELECT id, username, full_name, email, role, active, created_at FROM app_users WHERE username = ? ORDER BY id DESC LIMIT 1', [username])
    return res.status(201).json({ ok: true, user: created[0] })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ ok: false, message: 'Error creando usuario' })
  }
})

app.post('/api/admin/employees', requireAdmin, upload.single('idPhoto'), async (req, res) => {
  try {
    const { userId, employeeCode, fullName, area, faceTemplateHash, fingerprintTemplateHash } = req.body
    if (!employeeCode || !fullName || !area) return res.status(400).json({ ok: false, message: 'Faltan datos de empleado' })

    const idPhotoPath = req.file ? `/uploads/ids/${req.file.filename}` : null
    if (!idPhotoPath) return res.status(400).json({ ok: false, message: 'Debe subir foto de identificación' })

    await query(
      `INSERT INTO employees
      (user_id, employee_code, full_name, area, id_photo_url, face_template_hash, fingerprint_template_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId || null, employeeCode, fullName, area, idPhotoPath, faceTemplateHash || null, fingerprintTemplateHash || null],
    )
    const result = await query('SELECT * FROM employees WHERE employee_code = ? ORDER BY id DESC LIMIT 1', [employeeCode])
    return res.status(201).json({ ok: true, employee: result[0] })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ ok: false, message: 'Error creando empleado' })
  }
})

app.get('/api/admin/employees', requireAdmin, async (_, res) => {
  const data = await query('SELECT * FROM employees ORDER BY created_at DESC LIMIT 300')
  return res.json({ ok: true, data })
})


app.get('/api/admin/photo-rules', async (_, res) => {
  const rules = await query('SELECT * FROM photo_rules WHERE active = 1 ORDER BY id DESC')
  return res.json({ ok: true, data: rules })
})

app.post('/api/attendance/scan', upload.fields([{ name: 'faceImage', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const { employeeCode, employeeIdentity, method = 'face', confidence = 97.3, biometricMatch = 'true', accessoriesDetected = 'false' } = req.body
    const identity = employeeCode || employeeIdentity
    if (!identity) return res.status(400).json({ ok: false, message: 'employeeCode o employeeIdentity es requerido' })
    if (!['face', 'fingerprint'].includes(method)) return res.status(400).json({ ok: false, message: 'Método inválido' })

    const employeeResult = await query(
      `SELECT id, employee_code, full_name, area, id_photo_url FROM employees
       WHERE (employee_code = ? OR LOWER(full_name) = LOWER(?)) AND active = true
       LIMIT 1`,
      [identity, identity],
    )

    if (!employeeResult.length) return res.status(404).json({ ok: false, message: 'Empleado no encontrado' })

    const employee = employeeResult[0]
    const punctuality = new Date().getHours() <= 8 ? 'Puntual' : 'Tardanza'

    await query(
      `INSERT INTO attendance_records (employee_id, punctuality_status, confidence, method) VALUES (?, ?, ?, ?)`,
      [employee.id, punctuality, Number(confidence), method],
    )
    const attendanceRows = await query('SELECT id, scan_time FROM attendance_records WHERE employee_id = ? ORDER BY id DESC LIMIT 1', [employee.id])
    const attendance = attendanceRows[0]
    const faceFile = req.files?.faceImage?.[0]
    const videoFile = req.files?.video?.[0]

    const rules = await query("SELECT id, allow_accessories FROM photo_rules WHERE rule_code = 'DEFAULT_NO_ACCESSORIES' LIMIT 1")
    const rule = rules[0] || null
    const accessories = accessoriesDetected === 'true'

    if (rule && !rule.allow_accessories && accessories) {
      return res.status(422).json({ ok: false, message: 'Regla de foto violada: no se permiten accesorios' })
    }

    await query(
      `INSERT INTO recognition_evidence
      (attendance_id, employee_id, rule_id, reference_id_photo_url, captured_face_url, captured_video_url, comparison_score, biometric_match, accessories_detected)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        attendance.id,
        employee.id,
        rule ? rule.id : null,
        employee.id_photo_url,
        faceFile ? `/uploads/faces/${faceFile.filename}` : null,
        videoFile ? `/uploads/videos/${videoFile.filename}` : null,
        Number(confidence),
        biometricMatch === 'true',
        accessories,
      ],
    )

    return res.json({ ok: true, message: 'Asistencia registrada correctamente', employee, attendance, comparedAgainstIdPhoto: employee.id_photo_url })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ ok: false, message: 'Error registrando asistencia' })
  }
})

app.get('/api/reports/attendance', async (_, res) => {
  const data = await query('SELECT * FROM attendance_report ORDER BY scan_time DESC LIMIT 200')
  return res.json({ ok: true, data })
})

const hasDist = fs.existsSync(path.join(distDir, 'index.html'))
if (hasDist) {
  app.use(express.static(distDir))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    return res.sendFile(path.join(distDir, 'index.html'))
  })
} else {
  app.use(express.static(publicDir))
  app.get('/', (_, res) => res.status(200).sendFile(path.join(publicDir, 'index.html')))
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ ok: false, message: `Ruta no encontrada: ${req.path}` })
    return res.redirect('/')
  })
}

app.listen(port, () => {
  console.log(`Aquanqa API listening on port ${port}`)
  console.log(hasDist ? 'Serving React frontend from /dist' : 'Serving API landing page from /public')
})
