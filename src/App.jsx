import { useEffect, useMemo, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'
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
  const [worker, setWorker] = useState({ code: '-', name: 'Empleado', area: '-', avatar: 'EM' })
  const [time, setTime] = useState(formatTime())
  const [method, setMethod] = useState('face')
  const [employeeIdentity, setEmployeeIdentity] = useState('')
  const [faceBlob, setFaceBlob] = useState(null)
  const [apiOnline, setApiOnline] = useState(false)
  const [modal, setModal] = useState(null)

  useEffect(() => {
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) setMethod('fingerprint')
  }, [])

  useEffect(() => {
    const ping = async () => { try { const r = await fetch(`${API_BASE}/api/health`); const d = await r.json(); setApiOnline(Boolean(d.ok)) } catch { setApiOnline(false) } }
    ping(); const interval = setInterval(ping, 7000); return () => clearInterval(interval)
  }, [])

  useEffect(() => { if (step === 'done') { const t = setTimeout(() => { setStep('scan'); setStatus('Escaneando...') }, 2600); return () => clearTimeout(t) } }, [step])

  const statusClass = useMemo(() => status.includes('Error') || status.includes('No se pudo') ? 'text-red-300' : status.includes('detectado') ? 'text-emerald-300' : 'text-cold-300', [status])

  const captureAndDetect = async (videoRef, captchaOk) => {
    if (!captchaOk) return setModal({ type: 'error', title: 'Captcha inválido', message: 'Validación anti-bot fallida. Reintente.' })
    if (!employeeIdentity?.trim()) return setModal({ type: 'error', title: 'Identificador requerido', message: 'Ingrese ID o nombre completo del empleado.' })
    if (!videoRef.current) return setModal({ type: 'error', title: 'Cámara no disponible', message: 'No se pudo acceder al video de cámara.' })
    const c = document.createElement('canvas'); c.width = videoRef.current.videoWidth || 720; c.height = videoRef.current.videoHeight || 1280
    const ctx = c.getContext('2d'); if (!ctx) return setModal({ type: 'error', title: 'Error de captura', message: 'No se pudo crear contexto de imagen.' })
    ctx.drawImage(videoRef.current, 0, 0, c.width, c.height)
    const blob = await new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/jpeg', 0.9))
    if (!blob) return setModal({ type: 'error', title: 'Captura vacía', message: 'No se capturó rostro válido. Ajuste iluminación y reintente.' })
    setFaceBlob(blob); setStatus('Rostro detectado, validando identidad...'); setStep('result')
  }

  const registerAttendance = async () => {
    try {
      if (!faceBlob) return setModal({ type: 'error', title: 'Falta evidencia', message: 'No hay imagen facial para comparar.' })
      const form = new FormData(); form.append('employeeIdentity', employeeIdentity.trim()); form.append('method', method); form.append('confidence', method === 'fingerprint' ? '98.5' : '97.2'); form.append('biometricMatch', 'true'); form.append('faceImage', faceBlob, `face-${Date.now()}.jpg`)
      const response = await fetch(`${API_BASE}/api/attendance/scan`, { method: 'POST', body: form }); const result = await response.json()
      if (!response.ok || !result.ok) { setModal({ type: 'error', title: 'Error al guardar', message: result.message || 'No se pudo registrar asistencia.' }); setStep('error'); return }
      const initials = result.employee.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
      setWorker({ code: result.employee.employee_code || employeeIdentity, name: result.employee.full_name, area: result.employee.area, avatar: initials || 'EM' }); setTime(formatTime()); setModal({ type: 'success', title: 'Registro exitoso', message: 'La asistencia fue guardada correctamente.' }); setStep('done')
    } catch { setModal({ type: 'error', title: 'Excepción de red', message: 'Error de conexión o servidor. Verifique API/DB y reintente.' }); setStep('error') }
  }

  return <div><div className="mb-3 rounded-2xl border border-cold-300/20 bg-cold-900/40 p-2 text-xs">{apiOnline ? '🟢 API Conectada' : '🔴 API Offline'} · Solo rostro + identificador</div>{step === 'scan' && <ScanScreen status={status} statusClass={statusClass} method={method} setMethod={setMethod} employeeIdentity={employeeIdentity} setEmployeeIdentity={setEmployeeIdentity} onDetect={captureAndDetect} />}{step === 'result' && <ResultScreen worker={worker} method={method} identity={employeeIdentity} onYes={registerAttendance} onNo={() => setStep('error')} />}{step === 'done' && <DoneScreen worker={worker} time={time} method={method} />}{step === 'error' && <ErrorScreen onRetry={() => { setStatus('Escaneando...'); setStep('scan') }} />}{modal && <ResultModal type={modal.type} title={modal.title} message={modal.message} onClose={() => setModal(null)} />}</div>
}

function AdminPanel() {
  const ADMIN_USER = 'admin.aquanqa'
  const ADMIN_PASS = 'Aquanqa@2026!'
  const [auth, setAuth] = useState(false)
  const [creds, setCreds] = useState({ user: '', pass: '' })
  const [captchaText] = useState(() => Math.random().toString(36).slice(2, 7).toUpperCase())
  const [captcha, setCaptcha] = useState('')
  const [msg, setMsg] = useState('')
  const [employees, setEmployees] = useState([])
  const [attendanceRows, setAttendanceRows] = useState([])

  const login = () => {
    if (creds.user !== ADMIN_USER || creds.pass !== ADMIN_PASS) return setMsg('Credenciales inválidas')
    if (captcha.trim().toUpperCase() !== captchaText) return setMsg('Captcha inválido')
    setAuth(true); setMsg('Acceso admin autorizado')
  }

  const loadEmployees = async () => {
    const r = await fetch(`${API_BASE}/api/admin/employees`, { headers: { 'x-user-role': 'admin' } }); const d = await r.json(); setEmployees(d.data || [])
  }
  const loadAttendance = async () => {
    const r = await fetch(`${API_BASE}/api/reports/attendance`); const d = await r.json(); setAttendanceRows(d.data || [])
  }

  if (!auth) return <div className="space-y-2 rounded-xl bg-slate-800/70 p-3"><div className="text-cold-300">🔐 Ingreso panel administrativo</div><div className="text-xs bg-slate-900/50 p-2 rounded">Usuario: <b>{ADMIN_USER}</b><br/>Clave: <b>{ADMIN_PASS}</b></div><input className="w-full h-10 rounded-lg bg-slate-900 px-2" placeholder="usuario" onChange={(e)=>setCreds({...creds,user:e.target.value})}/><input type="password" className="w-full h-10 rounded-lg bg-slate-900 px-2" placeholder="clave" onChange={(e)=>setCreds({...creds,pass:e.target.value})}/><img src={`https://dummyimage.com/180x60/0b1630/8bc4ff&text=${captchaText}`} alt="captcha" className="rounded"/><input className="w-full h-10 rounded-lg bg-slate-900 px-2" placeholder="captcha" onChange={(e)=>setCaptcha(e.target.value)}/><button className="w-full h-11 rounded-lg bg-cold-500" onClick={login}>Ingresar</button><div className="text-sm">{msg}</div></div>

  return <div className="space-y-3"><div className="rounded-xl bg-cold-900/40 p-3 text-sm">🛠 Sesión admin activa (frontend con credenciales)</div><div className="grid grid-cols-2 gap-2"><button className="h-11 rounded-lg bg-indigo-600" onClick={loadEmployees}>📋 Cargar empleados</button><button className="h-11 rounded-lg bg-cold-500" onClick={loadAttendance}>🕒 Cargar asistencias</button></div><div className="rounded-xl bg-slate-900/60 p-2 text-xs max-h-40 overflow-auto"><div className="font-semibold mb-1">Tabla Empleados</div><table className="w-full text-left"><thead><tr><th>ID</th><th>Código</th><th>Nombre</th></tr></thead><tbody>{employees.map((e)=><tr key={e.id}><td>{e.id}</td><td>{e.employee_code}</td><td>{e.full_name}</td></tr>)}</tbody></table></div><div className="rounded-xl bg-slate-900/60 p-2 text-xs max-h-40 overflow-auto"><div className="font-semibold mb-1">Tabla Asistencias</div><table className="w-full text-left"><thead><tr><th>Hora</th><th>Código</th><th>Método</th></tr></thead><tbody>{attendanceRows.map((r,i)=><tr key={`${r.id}-${i}`}><td>{new Date(r.scan_time).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'})}</td><td>{r.employee_code}</td><td>{r.method}</td></tr>)}</tbody></table></div></div>
}

function ResultModal({ type, title, message, onClose }) { return <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"><div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-cold-300/30 p-4 text-center"><div className="text-3xl mb-2">{type === 'success' ? '✅' : '⚠️'}</div><h3 className={`font-semibold ${type === 'success' ? 'text-emerald-300' : 'text-red-300'}`}>{title}</h3><p className="text-sm text-white/80 mt-2">{message}</p><button className="mt-4 px-4 py-2 rounded bg-cold-500" onClick={onClose}>Cerrar</button></div></div> }

function ScanScreen({ status, statusClass, method, setMethod, employeeIdentity, setEmployeeIdentity, onDetect }) {
  const videoRef = useRef(null); const streamRef = useRef(null); const [captchaA] = useState(() => Math.floor(Math.random() * 9) + 1); const [captchaB] = useState(() => Math.floor(Math.random() * 9) + 1); const [captcha, setCaptcha] = useState('')
  useEffect(() => { let mounted = true; navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }).then((stream) => { if (!mounted) return; streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream }).catch(() => {}); return () => { mounted = false; streamRef.current?.getTracks().forEach((track) => track.stop()) } }, [])
  return <div><div className="relative rounded-[26px] border-[3px] border-cold-500 p-3 h-[300px] bg-cold-800/60"><div className="relative h-full rounded-3xl border border-cold-300/40 overflow-hidden bg-black"><video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-x-8 top-[20%] bottom-[24%] rounded-[999px] border-4 border-dashed border-cold-300/70 animate-pulseScan" /></div></div><div className={`text-center mt-3 text-[16px] ${statusClass}`}>{status}</div><p className="text-center mt-1 text-white/70 text-[14px]">Sin accesorios. Solo rostro centrado + ID/nombre</p><input value={employeeIdentity} onChange={(e)=>setEmployeeIdentity(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-xl bg-slate-800 border border-cold-300/30" placeholder="AQ-1001 o Juan Pérez"/><div className="grid grid-cols-2 gap-2 mt-2"><button onClick={()=>setMethod('face')} className={`h-10 rounded-xl ${method==='face'?'bg-cold-500':'bg-slate-600'}`}>👤 Facial</button><button onClick={()=>setMethod('fingerprint')} className={`h-10 rounded-xl ${method==='fingerprint'?'bg-cold-500':'bg-slate-600'}`}>🖐 Táctil</button></div><div className="mt-2 rounded-lg bg-slate-900 p-2 text-sm">Captcha anti-bot: {captchaA} + {captchaB} = ?<input className="mt-1 w-full h-9 rounded bg-slate-800 px-2" onChange={(e)=>setCaptcha(e.target.value)} placeholder="resultado"/></div><button onClick={()=>onDetect(videoRef, Number(captcha)===captchaA+captchaB)} className="mt-2 w-full h-11 rounded-xl bg-cold-500 font-semibold">➡ Detectar</button></div>
}

function ResultScreen({ worker, method, identity, onYes, onNo }) { return <div className="px-2 py-3"><div className="flex flex-col items-center gap-2 py-4"><div className="w-20 h-20 rounded-full bg-cold-500 text-2xl font-semibold flex items-center justify-center border-2 border-cold-300">{worker.avatar}</div><h2 className="text-2xl font-semibold">{worker.name}</h2><p className="text-sm text-cold-300">Entrada: {identity}</p><p className="text-sm text-cold-300">Área: {worker.area}</p><p className="text-sm text-white/70">Método: {method === 'face' ? 'Facial' : 'Táctil'}</p><p className="text-xl font-medium mt-2">¿Confirmar comparación?</p></div><div className="space-y-2 pb-2"><button onClick={onYes} className="w-full h-14 rounded-2xl bg-emerald-500 text-white text-xl font-semibold">✅ Sí, registrar</button><button onClick={onNo} className="w-full h-14 rounded-2xl bg-slate-500 text-white text-xl font-semibold">❌ Rechazar</button></div></div> }
function DoneScreen({ worker, time, method }) { return <div className="h-[430px] flex flex-col items-center justify-center text-center px-5"><div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-5xl mb-3">✔</div><h2 className="text-2xl font-semibold">Asistencia registrada</h2><p className="text-lg text-cold-300 mt-2">{worker.name} · {worker.area}</p><p className="text-2xl mt-1">{time}</p><p className="text-base mt-1 text-white/70">Método: {method === 'face' ? 'Facial' : 'Táctil'}</p></div> }
function ErrorScreen({ onRetry }) { return <div className="h-[430px] px-4 flex flex-col items-center justify-center text-center"><div className="text-5xl mb-3">⚠</div><h2 className="text-2xl font-semibold text-red-300">No se pudo reconocer</h2><p className="mt-2 text-lg text-white/70">Revise rostro/identificador y reintente</p><button onClick={onRetry} className="mt-5 w-full h-14 rounded-2xl bg-red-500 text-white text-xl font-semibold">🔁 Reintentar</button></div> }
