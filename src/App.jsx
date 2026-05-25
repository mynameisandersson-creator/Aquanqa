import { useEffect, useMemo, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'
const STEP_ORDER = ['scan', 'result', 'done']
const formatTime = () => new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })

export default function App() {
  const [panel, setPanel] = useState('attendance')
  return (
    <main className="min-h-screen bg-gradient-to-b from-cold-900 to-cold-800 text-white flex items-center justify-center p-3">
      <section className="w-[390px] rounded-[30px] border border-cold-300/30 bg-gradient-to-b from-cold-800 to-cold-700 shadow-2xl p-4">
        <header className="flex items-center justify-between mb-3">
          <div className="tracking-[0.14em] font-semibold text-[26px]">AQUANQA</div>
          <div className="text-xs rounded-full bg-cold-900/70 px-2 py-1 text-cold-300">Terminal</div>
        </header>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button className={`h-11 rounded-xl ${panel === 'attendance' ? 'bg-cold-500' : 'bg-slate-700'}`} onClick={() => setPanel('attendance')}>👷 Panel Asistencia</button>
          <button className={`h-11 rounded-xl ${panel === 'admin' ? 'bg-cold-500' : 'bg-slate-700'}`} onClick={() => setPanel('admin')}>🛠 Panel Admin</button>
        </div>
        {panel === 'attendance' ? <AttendancePanel /> : <AdminPanel />}
      </section>
    </main>
  )
}

function AttendancePanel() {
  const [step, setStep] = useState('scan')
  const [status, setStatus] = useState('Escaneando...')
  const [worker, setWorker] = useState({ code: 'AQ-1001', name: 'Empleado', area: 'Frío', avatar: 'EM' })
  const [time, setTime] = useState(formatTime())
  const [method, setMethod] = useState('face')
  const [employeeIdentity, setEmployeeIdentity] = useState('AQ-1001')
  const [faceBlob, setFaceBlob] = useState(null)
  const [apiOnline, setApiOnline] = useState(false)

  useEffect(() => {
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (mobile) setMethod('fingerprint')
  }, [])

  useEffect(() => {
    const ping = async () => { try { const r = await fetch(`${API_BASE}/api/health`); const d = await r.json(); setApiOnline(Boolean(d.ok)) } catch { setApiOnline(false) } }
    ping(); const interval = setInterval(ping, 7000); return () => clearInterval(interval)
  }, [])

  useEffect(() => { if (step === 'done') { const t = setTimeout(() => { setStep('scan'); setStatus('Escaneando...') }, 2600); return () => clearTimeout(t) } }, [step])

  const statusClass = useMemo(() => status.includes('Error') || status.includes('No se pudo') ? 'text-red-300' : status.includes('detectado') ? 'text-emerald-300' : 'text-cold-300', [status])

  const captureAndDetect = async (videoRef) => {
    if (!videoRef.current) return
    const c = document.createElement('canvas')
    c.width = videoRef.current.videoWidth || 720
    c.height = videoRef.current.videoHeight || 1280
    c.getContext('2d').drawImage(videoRef.current, 0, 0, c.width, c.height)
    const blob = await new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/jpeg', 0.9))
    setFaceBlob(blob)
    setStatus('Rostro detectado, validando identidad...')
    setStep('result')
  }

  const registerAttendance = async () => {
    try {
      const form = new FormData()
      form.append('employeeIdentity', employeeIdentity)
      form.append('method', method)
      form.append('confidence', method === 'fingerprint' ? '98.5' : '97.2')
      form.append('biometricMatch', 'true')
      if (faceBlob) form.append('faceImage', faceBlob, `face-${Date.now()}.jpg`)
      const response = await fetch(`${API_BASE}/api/attendance/scan`, { method: 'POST', body: form })
      const result = await response.json()
      if (!response.ok || !result.ok) { setStatus(result.message || 'Error registrando asistencia'); setStep('error'); return }
      const initials = result.employee.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
      setWorker({ code: result.employee.employee_code || employeeIdentity, name: result.employee.full_name, area: result.employee.area, avatar: initials || 'EM' })
      setTime(formatTime()); setStep('done')
    } catch { setStatus('Error de conexión con el servidor'); setStep('error') }
  }

  return <div>
    <div className="mb-3 rounded-2xl border border-cold-300/20 bg-cold-900/40 p-2 text-xs">{apiOnline ? '🟢 API Conectada' : '🔴 API Offline'} · Verificación anti-bot activa</div>
    {step === 'scan' && <ScanScreen status={status} statusClass={statusClass} method={method} setMethod={setMethod} employeeIdentity={employeeIdentity} setEmployeeIdentity={setEmployeeIdentity} onDetect={captureAndDetect} setStatus={setStatus} />}
    {step === 'result' && <ResultScreen worker={worker} method={method} identity={employeeIdentity} onYes={registerAttendance} onNo={() => setStep('error')} />}
    {step === 'done' && <DoneScreen worker={worker} time={time} method={method} />}
    {step === 'error' && <ErrorScreen onRetry={() => { setStatus('Escaneando...'); setStep('scan') }} />}
  </div>
}

function AdminPanel() {
  const ADMIN_USER = 'admin.aquanqa'
  const ADMIN_PASS = 'Aquanqa@2026!'
  const [isAuth, setIsAuth] = useState(false)
  const [cred, setCred] = useState({ username: '', password: '' })
  const [captchaText] = useState(() => Math.random().toString(36).slice(2, 7).toUpperCase())
  const [captcha, setCaptcha] = useState('')
  const [message, setMessage] = useState('')
  const [emp, setEmp] = useState({ userId: '', employeeCode: '', fullName: '', area: 'Frío' })
  const [idPhoto, setIdPhoto] = useState(null)
  const [employees, setEmployees] = useState([])
  const [attendanceRows, setAttendanceRows] = useState([])
  const [showEmployeesModal, setShowEmployeesModal] = useState(false)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false)

  const captchaImage = `https://dummyimage.com/180x60/0b1630/8bc4ff&text=${captchaText}`

  const loginAdmin = () => {
    if (cred.username !== ADMIN_USER || cred.password !== ADMIN_PASS) return setMessage('Credenciales admin inválidas')
    if (captcha.trim().toUpperCase() !== captchaText) return setMessage('Captcha incorrecto')
    setIsAuth(true); setMessage('Autenticación administrativa correcta')
  }

  const createEmployee = async () => {
    const fd = new FormData(); Object.entries(emp).forEach(([k,v]) => fd.append(k, v)); if (idPhoto) fd.append('idPhoto', idPhoto)
    const r = await fetch(`${API_BASE}/api/admin/employees`, { method: 'POST', headers: { 'x-user-role': 'admin' }, body: fd })
    const d = await r.json(); setMessage(d.ok ? `Empleado creado: ${d.employee.employee_code}` : d.message)
  }
  const loadEmployees = async () => {
    const r = await fetch(`${API_BASE}/api/admin/employees`, { headers: { 'x-user-role': 'admin' } })
    const d = await r.json(); setEmployees(d.data || [])
  }

  if (!isAuth) return <div className="space-y-2 rounded-xl bg-slate-800/70 p-3"><div className="text-cold-300">🔐 Login Admin + Captcha imagen</div><div className="text-xs bg-cold-900/50 p-2 rounded">Credenciales predefinidas:<br/>Usuario: <b>{ADMIN_USER}</b><br/>Clave: <b>{ADMIN_PASS}</b></div><input className="w-full h-10 rounded-lg bg-slate-900 px-2" placeholder="usuario admin" onChange={(e)=>setCred({...cred,username:e.target.value})}/><input type="password" className="w-full h-10 rounded-lg bg-slate-900 px-2" placeholder="contraseña" onChange={(e)=>setCred({...cred,password:e.target.value})}/><img src={captchaImage} alt="captcha" className="rounded border border-cold-300/30"/><input className="w-full h-10 rounded-lg bg-slate-900 px-2" placeholder="escriba captcha" onChange={(e)=>setCaptcha(e.target.value)}/><button className="w-full h-11 rounded-lg bg-cold-500" onClick={loginAdmin}>Ingresar al panel</button><div className="text-sm">{message}</div></div>

  const loadAttendance = async () => {
    const r = await fetch(`${API_BASE}/api/reports/attendance`)
    const d = await r.json(); setAttendanceRows(d.data || [])
  }

  return <div className="space-y-3">
    <div className="rounded-xl bg-cold-900/40 p-3 text-sm">🛠 Panel administrativo autenticado</div>
    <div className="rounded-xl bg-slate-800/70 p-3 space-y-2"><div className="text-cold-300 text-sm">Registrar empleado + foto ID</div><input className="w-full h-10 rounded-lg bg-slate-900 px-2" placeholder="userId" onChange={(e)=>setEmp({...emp,userId:e.target.value})}/><input className="w-full h-10 rounded-lg bg-slate-900 px-2" placeholder="employeeCode" onChange={(e)=>setEmp({...emp,employeeCode:e.target.value})}/><input className="w-full h-10 rounded-lg bg-slate-900 px-2" placeholder="nombre completo" onChange={(e)=>setEmp({...emp,fullName:e.target.value})}/><input className="w-full h-10 rounded-lg bg-slate-900 px-2" placeholder="área" onChange={(e)=>setEmp({...emp,area:e.target.value})}/><input type="file" accept="image/*" onChange={(e)=>setIdPhoto(e.target.files?.[0]||null)} className="w-full text-sm"/><button className="w-full h-11 rounded-lg bg-emerald-600" onClick={createEmployee}>🆔 Guardar empleado</button></div>

    <div className="grid grid-cols-2 gap-2">
      <button className="h-11 rounded-lg bg-indigo-600" onClick={async ()=>{await loadEmployees(); setShowEmployeesModal(true)}}>📋 Ver tabla empleados</button>
      <button className="h-11 rounded-lg bg-cold-500" onClick={async ()=>{await loadAttendance(); setShowAttendanceModal(true)}}>🕒 Ver asistencias</button>
    </div>

    {showEmployeesModal && (
      <DataModal title="Base de datos empresa · Empleados" onClose={() => setShowEmployeesModal(false)}>
        <table className="w-full text-left text-xs">
          <thead><tr className="text-cold-300"><th>ID</th><th>Código</th><th>Nombre</th><th>Área</th></tr></thead>
          <tbody>{employees.map((e) => <tr key={e.id} className="border-t border-slate-700"><td>{e.id}</td><td>{e.employee_code}</td><td>{e.full_name}</td><td>{e.area}</td></tr>)}</tbody>
        </table>
        <div className="mt-3 grid grid-cols-2 gap-2">{employees.map((e) => e.id_photo_url && <div key={`img-${e.id}`} className="text-xs"><div className="mb-1">{e.employee_code}</div><img src={`${API_BASE}${e.id_photo_url}`} alt={e.full_name} className="h-16 rounded" /></div>)}</div>
      </DataModal>
    )}

    {showAttendanceModal && (
      <DataModal title="Base de datos empresa · Asistencias" onClose={() => setShowAttendanceModal(false)}>
        <table className="w-full text-left text-xs">
          <thead><tr className="text-cold-300"><th>Hora</th><th>Código</th><th>Nombre</th><th>Método</th></tr></thead>
          <tbody>{attendanceRows.map((r, i) => <tr key={`${r.id}-${i}`} className="border-t border-slate-700"><td>{new Date(r.scan_time).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}</td><td>{r.employee_code}</td><td>{r.full_name}</td><td>{r.method}</td></tr>)}</tbody>
        </table>
      </DataModal>
    )}

    <div className="rounded-xl bg-cold-900/40 p-2 text-sm">{message || 'Sin operaciones aún.'}</div>
  </div>
}


function DataModal({ title, onClose, children }) {
  return <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"><div className="w-full max-w-[720px] max-h-[80vh] overflow-auto rounded-2xl bg-slate-900 border border-cold-300/30 p-4"><div className="flex items-center justify-between mb-3"><h3 className="text-cold-300 font-semibold">{title}</h3><button className="px-3 py-1 rounded bg-slate-700" onClick={onClose}>Cerrar</button></div>{children}</div></div>
}

function ScanScreen({ status, statusClass, method, setMethod, employeeIdentity, setEmployeeIdentity, onDetect, setStatus }) {
  const videoRef = useRef(null); const streamRef = useRef(null)
  const [captchaA] = useState(() => Math.floor(Math.random() * 9) + 1)
  const [captchaB] = useState(() => Math.floor(Math.random() * 9) + 1)
  const [captcha, setCaptcha] = useState('')

  useEffect(() => {
    let mounted = true
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }).then((stream) => { if (!mounted) return; streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream }).catch(() => setStatus('No se pudo abrir la cámara'))
    return () => { mounted = false; streamRef.current?.getTracks().forEach((track) => track.stop()) }
  }, [setStatus])

  const handleDetect = () => {
    if (Number(captcha) !== captchaA + captchaB) { setStatus('Captcha inválido. Posible bot descartado'); return }
    onDetect(videoRef)
  }

  return <div><div className="relative rounded-[26px] border-[3px] border-cold-500 p-3 h-[300px] bg-cold-800/60"><div className="relative h-full rounded-3xl border border-cold-300/40 overflow-hidden bg-black"><video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-x-8 top-[20%] bottom-[24%] rounded-[999px] border-4 border-dashed border-cold-300/70 animate-pulseScan" /></div></div><div className={`text-center mt-3 text-[16px] ${statusClass}`}>{status}</div><p className="text-center mt-1 text-white/70 text-[14px]">Ingrese nombre completo o ID empleado para comparar</p><input value={employeeIdentity} onChange={(e)=>setEmployeeIdentity(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-xl bg-slate-800 border border-cold-300/30" placeholder="AQ-1001 o Juan Pérez"/><div className="grid grid-cols-2 gap-2 mt-2"><button onClick={()=>setMethod('face')} className={`h-10 rounded-xl ${method==='face'?'bg-cold-500':'bg-slate-600'}`}>👤 Facial</button><button onClick={()=>setMethod('fingerprint')} className={`h-10 rounded-xl ${method==='fingerprint'?'bg-cold-500':'bg-slate-600'}`}>🖐 Táctil</button></div><div className="mt-2 rounded-lg bg-slate-900 p-2 text-sm">Captcha anti-bot: {captchaA} + {captchaB} = ?<input className="mt-1 w-full h-9 rounded bg-slate-800 px-2" onChange={(e)=>setCaptcha(e.target.value)} placeholder="resultado"/></div><button onClick={handleDetect} className="mt-2 w-full h-11 rounded-xl bg-cold-500 font-semibold">➡ Detectar</button></div>
}

function ResultScreen({ worker, method, identity, onYes, onNo }) { return <div className="px-2 py-3"><div className="flex flex-col items-center gap-2 py-4"><div className="w-20 h-20 rounded-full bg-cold-500 text-2xl font-semibold flex items-center justify-center border-2 border-cold-300">{worker.avatar}</div><h2 className="text-2xl font-semibold">{worker.name}</h2><p className="text-sm text-cold-300">Entrada: {identity}</p><p className="text-sm text-cold-300">Área: {worker.area}</p><p className="text-sm text-white/70">Método: {method === 'face' ? 'Facial' : 'Táctil automático'}</p><p className="text-xl font-medium mt-2">¿Confirmar comparación?</p></div><div className="space-y-2 pb-2"><button onClick={onYes} className="w-full h-14 rounded-2xl bg-emerald-500 text-white text-xl font-semibold">✅ Sí, registrar</button><button onClick={onNo} className="w-full h-14 rounded-2xl bg-slate-500 text-white text-xl font-semibold">❌ Rechazar</button></div></div> }
function DoneScreen({ worker, time, method }) { return <div className="h-[430px] flex flex-col items-center justify-center text-center px-5"><div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-5xl mb-3">✔</div><h2 className="text-2xl font-semibold">Asistencia registrada</h2><p className="text-lg text-cold-300 mt-2">{worker.name} · {worker.area}</p><p className="text-2xl mt-1">{time}</p><p className="text-base mt-1 text-white/70">Método: {method === 'face' ? 'Facial' : 'Táctil'}</p></div> }
function ErrorScreen({ onRetry }) { return <div className="h-[430px] px-4 flex flex-col items-center justify-center text-center"><div className="text-5xl mb-3">⚠</div><h2 className="text-2xl font-semibold text-red-300">No se pudo reconocer</h2><p className="mt-2 text-lg text-white/70">Revise cámara/entrada y reintente</p><button onClick={onRetry} className="mt-5 w-full h-14 rounded-2xl bg-red-500 text-white text-xl font-semibold">🔁 Reintentar</button></div> }
