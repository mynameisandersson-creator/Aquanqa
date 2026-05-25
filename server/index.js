import express from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { pool } from './db.js'

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

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const folder = file.fieldname === 'video' ? 'videos' : 'faces'
    cb(null, path.join(uploadsDir, folder))
  },
  filename(req, file, cb) {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
  },
})

const upload = multer({ storage })

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(uploadsDir))

app.get('/api/health', (_, res) => res.json({ ok: true }))

app.post('/api/attendance/scan', upload.fields([{ name: 'faceImage', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  try {
    const { employeeCode, method = 'face', confidence = 97.3, biometricMatch = 'true' } = req.body
    if (!employeeCode) return res.status(400).json({ ok: false, message: 'employeeCode es requerido' })
    if (!['face', 'fingerprint'].includes(method)) return res.status(400).json({ ok: false, message: 'Método inválido' })

    const employeeResult = await pool.query(
      'SELECT id, full_name, area, id_photo_url FROM employees WHERE employee_code = $1 AND active = true LIMIT 1',
      [employeeCode],
    )

    if (!employeeResult.rowCount) {
      return res.status(404).json({ ok: false, message: 'Empleado no encontrado' })
    }

    const employee = employeeResult.rows[0]
    const punctuality = new Date().getHours() <= 8 ? 'Puntual' : 'Tardanza'

    const attendanceResult = await pool.query(
      `INSERT INTO attendance_records (employee_id, punctuality_status, confidence, method)
       VALUES ($1, $2, $3, $4)
       RETURNING id, scan_time`,
      [employee.id, punctuality, Number(confidence), method],
    )

    const attendance = attendanceResult.rows[0]
    const faceFile = req.files?.faceImage?.[0]
    const videoFile = req.files?.video?.[0]

    await pool.query(
      `INSERT INTO recognition_evidence
      (attendance_id, captured_face_url, captured_video_url, comparison_score, biometric_match)
      VALUES ($1, $2, $3, $4, $5)`,
      [
        attendance.id,
        faceFile ? `/uploads/faces/${faceFile.filename}` : null,
        videoFile ? `/uploads/videos/${videoFile.filename}` : null,
        Number(confidence),
        biometricMatch === 'true',
      ],
    )

    res.json({
      ok: true,
      message: 'Asistencia registrada correctamente',
      employee,
      attendance,
      comparedAgainstIdPhoto: employee.id_photo_url,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ ok: false, message: 'Error registrando asistencia' })
  }
})

app.get('/api/reports/attendance', async (_, res) => {
  const data = await pool.query('SELECT * FROM attendance_report ORDER BY scan_time DESC LIMIT 200')
  res.json({ ok: true, data: data.rows })
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
  app.get('/', (_, res) => {
    res.status(200).sendFile(path.join(publicDir, 'index.html'))
  })
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ ok: false, message: `Ruta no encontrada: ${req.path}` })
    }
    return res.redirect('/')
  })
}

app.listen(port, () => {
  console.log(`Aquanqa API listening on port ${port}`)
  console.log(hasDist ? 'Serving React frontend from /dist' : 'Serving API landing page from /public')
})
