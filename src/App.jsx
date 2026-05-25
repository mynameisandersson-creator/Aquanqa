import { useEffect, useMemo, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

const workers = [
  { code: 'AQ-1001', name: 'Juan Pérez', area: 'Frío', punctuality: 'Puntual', avatar: 'JP' },
  { code: 'AQ-1002', name: 'María Soto', area: 'Despacho', punctuality: 'Puntual', avatar: 'MS' },
  { code: 'AQ-1003', name: 'Luis Rojas', area: 'Frío', punctuality: 'Tardanza', avatar: 'LR' },
]

function formatTime() {
  return new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

export default function App() {
  const [step, setStep] = useState('scan')
  const [status, setStatus] = useState('Escaneando...')
  const [worker, setWorker] = useState(workers[0])
  const [time, setTime] = useState(formatTime())
  const [method, setMethod] = useState('face')
  const [employeeCode, setEmployeeCode] = useState('AQ-1001')
  const [faceBlob, setFaceBlob] = useState(null)
  const [videoBlob, setVideoBlob] = useState(null)

  const statusClass = useMemo(() => {
    if (status.includes('No se pudo') || status.includes('Error')) return 'text-red-300'
    if (status.includes('detectado')) return 'text-emerald-300'
    return 'text-cold-300'
  }, [status])

  useEffect(() => {
    if (step === 'done') {
      const timer = setTimeout(() => {
        setStep('scan')
        setStatus('Escaneando...')
      }, 2600)
      return () => clearTimeout(timer)
    }
  }, [step])

  const onCaptureReady = ({ face, video }) => {
    setFaceBlob(face)
    setVideoBlob(video)
    setStatus('Rostro detectado')
    const matched = workers.find((w) => w.code === employeeCode) || workers[0]
    setWorker(matched)
    setStep('result')
  }

  const registerAttendance = async () => {
    try {
      const form = new FormData()
      form.append('employeeCode', employeeCode)
      form.append('method', method)
      form.append('confidence', '97.2')
      form.append('biometricMatch', 'true')
      if (faceBlob) form.append('faceImage', faceBlob, `face-${Date.now()}.jpg`)
      if (videoBlob) form.append('video', videoBlob, `video-${Date.now()}.webm`)

      const response = await fetch(`${API_BASE}/api/attendance/scan`, {
        method: 'POST',
        body: form,
      })

      const result = await response.json()
      if (!response.ok || !result.ok) {
        setStatus(result.message || 'Error registrando asistencia')
        setStep('error')
        return
      }

      setWorker({
        ...worker,
        name: result.employee.full_name,
        area: result.employee.area,
      })
      setTime(formatTime())
      setStep('done')
    } catch (error) {
      setStatus('Error de conexión con el servidor')
      setStep('error')
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-cold-900 to-cold-800 text-white flex items-center justify-center p-3">
      <section className="w-[360px] rounded-[30px] border border-cold-300/30 bg-gradient-to-b from-cold-800 to-cold-700 shadow-2xl p-4">
        <div className="text-center tracking-[0.18em] font-semibold text-[34px] mb-3">AQUANQA</div>

        {step === 'scan' && (
          <ScanScreen
            status={status}
            statusClass={statusClass}
            method={method}
            setMethod={setMethod}
            employeeCode={employeeCode}
            setEmployeeCode={setEmployeeCode}
            onCaptureReady={onCaptureReady}
            setStatus={setStatus}
          />
        )}
        {step === 'result' && <ResultScreen worker={worker} method={method} onYes={registerAttendance} onNo={() => setStep('error')} />}
        {step === 'done' && <DoneScreen worker={worker} time={time} method={method} />}
        {step === 'error' && <ErrorScreen onRetry={() => { setStatus('Escaneando...'); setStep('scan') }} />}
      </section>
    </main>
  )
}

function ScanScreen({ status, statusClass, method, setMethod, employeeCode, setEmployeeCode, onCaptureReady, setStatus }) {
  const videoRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])

  useEffect(() => {
    let mounted = true

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((stream) => {
        if (!mounted) return
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      })
      .catch(() => setStatus('No se pudo abrir la cámara'))

    return () => {
      mounted = false
      if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop()
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [setStatus])

  const captureFrame = () => {
    if (!videoRef.current) return null
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth || 720
    canvas.height = videoRef.current.videoHeight || 1280
    const ctx = canvas.getContext('2d')
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height)
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9))
  }

  const startRecording = () => {
    if (!streamRef.current) return
    chunksRef.current = []
    const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' })
    mediaRecorderRef.current = recorder
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.start()
    setStatus('Grabando video de reconocimiento...')
  }

  const stopAndDetect = async () => {
    const face = await captureFrame()
    const recorder = mediaRecorderRef.current

    if (recorder?.state === 'recording') {
      recorder.onstop = () => {
        const video = new Blob(chunksRef.current, { type: 'video/webm' })
        onCaptureReady({ face, video })
      }
      recorder.stop()
    } else {
      onCaptureReady({ face, video: null })
    }
  }

  return (
    <div>
      <div className="relative rounded-[32px] border-[3px] border-cold-500 p-3 h-[450px] bg-cold-800/60">
        <div className="relative h-full rounded-3xl border border-cold-300/40 overflow-hidden bg-black">
          <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-x-8 top-[20%] bottom-[24%] rounded-[999px] border-4 border-dashed border-cold-300/70 animate-pulseScan" />
          <div className="absolute left-8 right-8 h-1 bg-cold-500/70 blur-[1px] animate-scanLine" />
        </div>
      </div>
      <div className={`text-center mt-3 text-[24px] ${statusClass}`}>{status}</div>
      <p className="text-center mt-1 text-white/70 text-[20px]">Coloque su rostro dentro del marco</p>

      <input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value.toUpperCase())} className="mt-3 w-full h-12 px-3 rounded-xl bg-slate-800 border border-cold-300/30" placeholder="Código empleado (AQ-1001)" />

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button onClick={() => setMethod('face')} className={`h-12 rounded-xl text-lg ${method === 'face' ? 'bg-cold-500' : 'bg-slate-600'}`}>Facial</button>
        <button onClick={() => setMethod('fingerprint')} className={`h-12 rounded-xl text-lg ${method === 'fingerprint' ? 'bg-cold-500' : 'bg-slate-600'}`}>Táctil</button>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3">
        <button onClick={startRecording} className="h-14 rounded-xl bg-amber-500 text-slate-900 font-semibold">Iniciar video</button>
        <button onClick={stopAndDetect} className="h-14 rounded-xl bg-cold-500 font-semibold">Capturar y detectar</button>
      </div>
    </div>
  )
}

function ResultScreen({ worker, method, onYes, onNo }) {
  return (
    <div className="px-2 py-3">
      <div className="flex flex-col items-center gap-3 py-8">
        <div className="w-28 h-28 rounded-full bg-cold-500 text-3xl font-semibold flex items-center justify-center border-2 border-cold-300">{worker.avatar}</div>
        <h2 className="text-4xl font-semibold">{worker.name}</h2>
        <p className="text-2xl text-cold-300">Código: {worker.code}</p>
        <p className="text-2xl text-cold-300">Área: {worker.area}</p>
        <p className="text-xl text-white/70">Método: {method === 'face' ? 'Facial' : 'Táctil'}</p>
        <p className="text-4xl font-medium mt-2">¿Eres tú?</p>
      </div>
      <div className="space-y-3 pb-5">
        <button onClick={onYes} className="w-full h-20 rounded-2xl bg-emerald-500 text-white text-[30px] font-semibold">Sí, soy yo</button>
        <button onClick={onNo} className="w-full h-20 rounded-2xl bg-slate-500 text-white text-[30px] font-semibold">No soy yo</button>
      </div>
    </div>
  )
}

function DoneScreen({ worker, time, method }) {
  return <div className="h-[640px] flex flex-col items-center justify-center text-center px-5"><div className="w-32 h-32 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-7xl mb-5">✔</div><h2 className="text-4xl font-semibold">Asistencia registrada correctamente</h2><p className="text-2xl text-cold-300 mt-4">{worker.name} · {worker.area}</p><p className="text-4xl mt-2">{time}</p><p className="text-xl mt-2 text-white/70">Método: {method === 'face' ? 'Facial' : 'Táctil'}</p><p className="text-xl text-white/60 mt-6">Regresando al escáner en 2-3 segundos...</p></div>
}

function ErrorScreen({ onRetry }) {
  return <div className="h-[640px] px-4 flex flex-col items-center justify-center text-center"><div className="text-7xl mb-3">⚠</div><h2 className="text-4xl font-semibold text-red-300">No se pudo reconocer el rostro</h2><p className="mt-4 text-2xl text-white/70">Intente nuevamente</p><button onClick={onRetry} className="mt-8 w-full h-20 rounded-2xl bg-red-500 text-white text-[30px] font-semibold">Reintentar</button></div>
}
