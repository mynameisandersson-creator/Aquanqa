import { useEffect, useMemo, useState } from 'react'

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

  useEffect(() => {
    if (step === 'done') {
      const timer = setTimeout(() => {
        setStep('scan')
        setStatus('Escaneando...')
      }, 2600)
      return () => clearTimeout(timer)
    }
  }, [step])

  const statusClass = useMemo(() => {
    if (status.includes('No se pudo')) return 'text-red-300'
    if (status.includes('detectado')) return 'text-emerald-300'
    return 'text-cold-300'
  }, [status])

  const simulateDetect = () => {
    const random = Math.random()
    if (random < 0.2) {
      setStatus('No se pudo reconocer el rostro')
      setStep('error')
      return
    }
    setStatus('Rostro detectado')
    setWorker(workers[Math.floor(Math.random() * workers.length)])
    setStep('result')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-cold-900 to-cold-800 text-white flex items-center justify-center p-3">
      <section className="w-[360px] rounded-[30px] border border-cold-300/30 bg-gradient-to-b from-cold-800 to-cold-700 shadow-2xl p-4">
        <div className="text-center tracking-[0.18em] font-semibold text-[34px] mb-3">AQUANQA</div>

        {step === 'scan' && <ScanScreen status={status} statusClass={statusClass} method={method} setMethod={setMethod} onSimulate={simulateDetect} />}
        {step === 'result' && <ResultScreen worker={worker} method={method} onYes={() => { setTime(formatTime()); setStep('done') }} onNo={() => setStep('error')} />}
        {step === 'done' && <DoneScreen worker={worker} time={time} method={method} />}
        {step === 'error' && <ErrorScreen onRetry={() => { setStatus('Escaneando...'); setStep('scan') }} />}
      </section>
    </main>
  )
}

function ScanScreen({ status, statusClass, method, setMethod, onSimulate }) {
  return (
    <div>
      <div className="relative rounded-[32px] border-[3px] border-cold-500 p-5 h-[470px] bg-cold-800/60">
        <div className="relative h-full rounded-3xl border border-cold-300/40 overflow-hidden bg-gradient-to-b from-cold-800 to-cold-700">
          <div className="absolute inset-x-8 top-[20%] bottom-[24%] rounded-[999px] border-4 border-dashed border-cold-300/70 animate-pulseScan" />
          <div className="absolute left-8 right-8 h-1 bg-cold-500/70 blur-[1px] animate-scanLine" />
        </div>
      </div>
      <div className={`text-center mt-4 text-[30px] ${statusClass}`}>{status}</div>
      <p className="text-center mt-2 text-white/70 text-[26px]">Coloque su rostro dentro del marco</p>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <button onClick={() => setMethod('face')} className={`h-14 rounded-xl text-xl ${method === 'face' ? 'bg-cold-500' : 'bg-slate-600'}`}>Facial</button>
        <button onClick={() => setMethod('fingerprint')} className={`h-14 rounded-xl text-xl ${method === 'fingerprint' ? 'bg-cold-500' : 'bg-slate-600'}`}>Táctil</button>
      </div>

      <button onClick={onSimulate} className="mt-3 w-full h-20 rounded-2xl bg-cold-500 hover:bg-[#2f80f7] transition font-medium text-[30px]">
        Simular detección
      </button>
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
