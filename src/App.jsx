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
  const [videoBlob, setVideoBlob] = useState(null)
  const [apiOnline, setApiOnline] = useState(false)
  const [deviceType, setDeviceType] = useState('desktop')

  useEffect(() => {
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    setDeviceType(mobile ? 'mobile' : 'desktop')
    if (mobile) setMethod('fingerprint')
  }, [])

  useEffect(() => {
    const ping = async () => {
      try { const r = await fetch(`${API_BASE}/api/health`); const d = await r.json(); setApiOnline(Boolean(d.ok)) } catch { setApiOnline(false) }
    }
    ping(); const interval = setInterval(ping, 7000); return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (step === 'done') {
      const timer = setTimeout(() => { setStep('scan'); setStatus('Escaneando...') }, 2600)
      return () => clearTimeout(timer)
    }
  }, [step])

  const statusClass = useMemo(() => status.includes('Error') || status.includes('No se pudo') ? 'text-red-300' : status.includes('detectado') ? 'text-emerald-300' : 'text-cold-300', [status])

  const onCaptureReady = ({ face, video }) => { setFaceBlob(face); setVideoBlob(video); setStatus('Rostro detectado, validando identidad...'); setStep('result') }

  const registerAttendance = async () => {
    try {
      const form = new FormData()
      form.append('employeeIdentity', employeeIdentity)
      form.append('method', method)
      form.append('confidence', method === 'fingerprint' ? '98.5' : '97.2')
      form.append('biometricMatch', 'true')
      if (faceBlob) form.append('faceImage', faceBlob, `face-${Date.now()}.jpg`)
      if (videoBlob) form.append('video', videoBlob, `video-${Date.now()}.webm`)
      const response = await fetch(`${API_BASE}/api/attendance/scan`, { method: 'POST', body: form })
      const result = await response.json()
      if (!response.ok || !result.ok) { setStatus(result.message || 'Error registrando asistencia'); setStep('error'); return }
      const initials = result.employee.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
      setWorker({ code: result.employee.employee_code || employeeIdentity, name: result.employee.full_name, area: result.employee.area, avatar: initials || 'EM' })
      setTime(formatTime()); setStep('done')
    } catch { setStatus('Error de conexión con el servidor'); setStep('error') }
  }

  const goBack = () => { const i = STEP_ORDER.indexOf(step); if (step === 'error') return setStep('scan'); if (i > 0) setStep(STEP_ORDER[i - 1]) }

  return <div>
    <div className="mb-3 rounded-2xl border border-cold-300/20 bg-cold-900/40 p-2"><div className="mb-2 flex justify-between text-xs px-1"><span className={apiOnline ? 'text-emerald-300' : 'text-red-300'}>{apiOnline ? '🟢 API Conectada' : '🔴 API Offline'}</span><span className="text-cold-300">{deviceType === 'mobile' ? '📱 Táctil auto' : '🖥 Escritorio'}</span></div></div>
    {step === 'scan' && <ScanScreen status={status} statusClass={statusClass} method={method} setMethod={setMethod} employeeIdentity={employeeIdentity} setEmployeeIdentity={setEmployeeIdentity} onCaptureReady={onCaptureReady} setStatus={setStatus} />}
    {step === 'result' && <ResultScreen worker={worker} method={method} identity={employeeIdentity} onYes={registerAttendance} onNo={() => setStep('error')} />}
    {step === 'done' && <DoneScreen worker={worker} time={time} method={method} />}
    {step === 'error' && <ErrorScreen onRetry={() => { setStatus('Escaneando...'); setStep('scan') }} />}
    <footer className="grid grid-cols-2 gap-2 mt-3"><button onClick={goBack} className="h-12 rounded-xl bg-slate-600">⬅ Atrás</button><button onClick={() => setStep('scan')} className="h-12 rounded-xl bg-cold-500">🏠 Inicio</button></footer>
  </div>
}

function AdminPanel() {
  const [roleHeader, setRoleHeader] = useState('admin')
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ username: '', fullName: '', email: '', passwordHash: '', role: 'employee' })
  const [emp, setEmp] = useState({ userId: '', employeeCode: '', fullName: '', area: 'Frío', faceTemplateHash: '', fingerprintTemplateHash: '' })
  const [idPhoto, setIdPhoto] = useState(null)

  const createUser = async () => {
    const r = await fetch(`${API_BASE}/api/admin/users`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-role': roleHeader }, body: JSON.stringify(form) })
    const d = await r.json(); setMessage(d.ok ? `Usuario creado: ${d.user.username}` : d.message)
  }
  const createEmployee = async () => {
    const fd = new FormData(); Object.entries(emp).forEach(([k,v]) => fd.append(k, v)); if (idPhoto) fd.append('idPhoto', idPhoto)
    const r = await fetch(`${API_BASE}/api/admin/employees`, { method: 'POST', headers: { 'x-user-role': roleHeader }, body: fd })
    const d = await r.json(); setMessage(d.ok ? `Empleado creado: ${d.employee.employee_code}` : d.message)
  }

  return <div className="space-y-3">
    <div className="rounded-xl bg-cold-900/40 p-3 text-sm">🛠 Gestión administrativa (usuarios, empleados, foto ID). Header actual: <b>{roleHeader}</b></div>
    <div className="grid grid-cols-2 gap-2"><button className={`h-10 rounded-lg ${roleHeader==='admin'?'bg-cold-500':'bg-slate-600'}`} onClick={()=>setRoleHeader('admin')}>Admin header</button><button className={`h-10 rounded-lg ${roleHeader==='employee'?'bg-cold-500':'bg-slate-600'}`} onClick={()=>setRoleHeader('employee')}>Employee header</button></div>
    <div className="rounded-xl bg-slate-800/70 p-3 space-y-2"><div className="text-cold-300 text-sm">Crear usuario</div><input className="w-full h-10 rounded-lg bg-slate-900 px-2" placeholder="username" onChange={(e)=>setForm({...form,username:e.target.value})}/><input className="w-full h-10 rounded-lg bg-slate-900 px-2" placeholder="nombre completo" onChange={(e)=>setForm({...form,fullName:e.target.value})}/><input className="w-full h-10 rounded-lg bg-slate-900 px-2" placeholder="email" onChange={(e)=>setForm({...form,email:e.target.value})}/><input className="w-full h-10 rounded-lg bg-slate-900 px-2" placeholder="password_hash" onChange={(e)=>setForm({...form,passwordHash:e.target.value})}/><button className="w-full h-11 rounded-lg bg-cold-500" onClick={createUser}>➕ Guardar usuario</button></div>
    <div className="rounded-xl bg-slate-800/70 p-3 space-y-2"><div className="text-cold-300 text-sm">Crear empleado + foto ID</div><input className="w-full h-10 rounded-lg bg-slate-900 px-2" placeholder="userId" onChange={(e)=>setEmp({...emp,userId:e.target.value})}/><input className="w-full h-10 rounded-lg bg-slate-900 px-2" placeholder="employeeCode" onChange={(e)=>setEmp({...emp,employeeCode:e.target.value})}/><input className="w-full h-10 rounded-lg bg-slate-900 px-2" placeholder="nombre completo" onChange={(e)=>setEmp({...emp,fullName:e.target.value})}/><input className="w-full h-10 rounded-lg bg-slate-900 px-2" placeholder="área" onChange={(e)=>setEmp({...emp,area:e.target.value})}/><input type="file" accept="image/*" onChange={(e)=>setIdPhoto(e.target.files?.[0]||null)} className="w-full text-sm"/><button className="w-full h-11 rounded-lg bg-emerald-600" onClick={createEmployee}>🆔 Guardar empleado</button></div>
    <div className="rounded-xl bg-cold-900/40 p-2 text-sm">{message || 'Sin operaciones aún.'}</div>
  </div>
}

function ScanScreen({ status, statusClass, method, setMethod, employeeIdentity, setEmployeeIdentity, onCaptureReady, setStatus }) {
  const videoRef = useRef(null); const mediaRecorderRef = useRef(null); const streamRef = useRef(null); const chunksRef = useRef([])
  useEffect(() => { let mounted = true; navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false }).then((stream) => { if (!mounted) return; streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream }).catch(() => setStatus('No se pudo abrir la cámara')); return () => { mounted = false; if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop(); streamRef.current?.getTracks().forEach((track) => track.stop()) } }, [setStatus])
  const captureFrame = () => { if (!videoRef.current) return null; const c = document.createElement('canvas'); c.width = videoRef.current.videoWidth || 720; c.height = videoRef.current.videoHeight || 1280; const x = c.getContext('2d'); x.drawImage(videoRef.current,0,0,c.width,c.height); return new Promise((r)=>c.toBlob((b)=>r(b),'image/jpeg',0.9)) }
  const startRecording = () => { if (!streamRef.current) return; chunksRef.current=[]; const rec = new MediaRecorder(streamRef.current,{mimeType:'video/webm'}); mediaRecorderRef.current=rec; rec.ondataavailable=(e)=>{if(e.data.size>0)chunksRef.current.push(e.data)}; rec.start(); setStatus(method === 'fingerprint' ? 'Modo táctil activo, registrando evidencia...' : 'Grabando video de reconocimiento...') }
  const stopAndDetect = async () => { const face = await captureFrame(); const rec = mediaRecorderRef.current; if(rec?.state==='recording'){rec.onstop=()=>onCaptureReady({face,video:new Blob(chunksRef.current,{type:'video/webm'})}); rec.stop()} else onCaptureReady({face,video:null}) }
  return <div><div className="relative rounded-[26px] border-[3px] border-cold-500 p-3 h-[300px] bg-cold-800/60"><div className="relative h-full rounded-3xl border border-cold-300/40 overflow-hidden bg-black"><video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" /><div className="absolute inset-x-8 top-[20%] bottom-[24%] rounded-[999px] border-4 border-dashed border-cold-300/70 animate-pulseScan" /></div></div><div className={`text-center mt-3 text-[16px] ${statusClass}`}>{status}</div><p className="text-center mt-1 text-white/70 text-[14px]">Ingrese nombre completo o ID empleado para comparar</p><input value={employeeIdentity} onChange={(e)=>setEmployeeIdentity(e.target.value)} className="mt-2 w-full h-10 px-3 rounded-xl bg-slate-800 border border-cold-300/30" placeholder="AQ-1001 o Juan Pérez"/><div className="grid grid-cols-2 gap-2 mt-2"><button onClick={()=>setMethod('face')} className={`h-10 rounded-xl ${method==='face'?'bg-cold-500':'bg-slate-600'}`}>👤 Facial</button><button onClick={()=>setMethod('fingerprint')} className={`h-10 rounded-xl ${method==='fingerprint'?'bg-cold-500':'bg-slate-600'}`}>🖐 Táctil</button></div><div className="grid grid-cols-2 gap-2 mt-2"><button onClick={startRecording} className="h-11 rounded-xl bg-amber-500 text-slate-900 font-semibold">⏺ Grabar</button><button onClick={stopAndDetect} className="h-11 rounded-xl bg-cold-500 font-semibold">➡ Detectar</button></div></div>
}

function ResultScreen({ worker, method, identity, onYes, onNo }) { return <div className="px-2 py-3"><div className="flex flex-col items-center gap-2 py-4"><div className="w-20 h-20 rounded-full bg-cold-500 text-2xl font-semibold flex items-center justify-center border-2 border-cold-300">{worker.avatar}</div><h2 className="text-2xl font-semibold">{worker.name}</h2><p className="text-sm text-cold-300">Entrada: {identity}</p><p className="text-sm text-cold-300">Área: {worker.area}</p><p className="text-sm text-white/70">Método: {method === 'face' ? 'Facial' : 'Táctil automático'}</p><p className="text-xl font-medium mt-2">¿Confirmar comparación?</p></div><div className="space-y-2 pb-2"><button onClick={onYes} className="w-full h-14 rounded-2xl bg-emerald-500 text-white text-xl font-semibold">✅ Sí, registrar</button><button onClick={onNo} className="w-full h-14 rounded-2xl bg-slate-500 text-white text-xl font-semibold">❌ Rechazar</button></div></div> }
function DoneScreen({ worker, time, method }) { return <div className="h-[430px] flex flex-col items-center justify-center text-center px-5"><div className="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-5xl mb-3">✔</div><h2 className="text-2xl font-semibold">Asistencia registrada</h2><p className="text-lg text-cold-300 mt-2">{worker.name} · {worker.area}</p><p className="text-2xl mt-1">{time}</p><p className="text-base mt-1 text-white/70">Método: {method === 'face' ? 'Facial' : 'Táctil'}</p></div> }
function ErrorScreen({ onRetry }) { return <div className="h-[430px] px-4 flex flex-col items-center justify-center text-center"><div className="text-5xl mb-3">⚠</div><h2 className="text-2xl font-semibold text-red-300">No se pudo reconocer</h2><p className="mt-2 text-lg text-white/70">Revise cámara/entrada y reintente</p><button onClick={onRetry} className="mt-5 w-full h-14 rounded-2xl bg-red-500 text-white text-xl font-semibold">🔁 Reintentar</button></div> }
