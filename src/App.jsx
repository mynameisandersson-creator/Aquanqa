import { useEffect, useMemo, useState } from 'react'

const workers = [
  { name: 'Juan Pérez', area: 'Frío', punctuality: 'Puntual', avatar: 'JP' },
  { name: 'María Soto', area: 'Despacho', punctuality: 'Puntual', avatar: 'MS' },
  { name: 'Luis Rojas', area: 'Frío', punctuality: 'Tardanza', avatar: 'LR' },
]

const screenByState = {
  scanning: 'Escaneando...',
  detected: 'Rostro detectado',
  error: 'No se pudo reconocer el rostro',
}

function formatTime() {
  return new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
}

export default function App() {
  const [step, setStep] = useState('scan')
  const [status, setStatus] = useState('scanning')
  const [worker, setWorker] = useState(workers[0])
  const [time, setTime] = useState(formatTime())

  useEffect(() => {
    if (step === 'done') {
      const timer = setTimeout(() => {
        setStep('scan')
        setStatus('scanning')
      }, 2600)
      return () => clearTimeout(timer)
    }
  }, [step])

  const statusText = useMemo(() => screenByState[status], [status])

  const simulateDetect = () => {
    const random = Math.random()
    if (random < 0.2) {
      setStatus('error')
      setStep('error')
      return
    }

    const selected = workers[Math.floor(Math.random() * workers.length)]
    setWorker(selected)
    setStatus('detected')
    setStep('result')
  }

  const confirm = () => {
    setTime(formatTime())
    setStep('done')
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-cold-900 to-cold-800 text-white flex items-center justify-center p-3">
      <section className="w-[360px] rounded-[30px] border border-cold-300/30 bg-gradient-to-b from-cold-800 to-cold-700 shadow-2xl p-4">
        <div className="text-center tracking-[0.18em] font-semibold text-[34px] mb-3">AQUANQA</div>

        {step === 'scan' && (
          <ScanScreen statusText={statusText} onSimulate={simulateDetect} />
        )}

        {step === 'result' && (
          <ResultScreen worker={worker} onYes={confirm} onNo={() => setStep('error')} />
        )}

        {step === 'done' && <DoneScreen worker={worker} time={time} />}

        {step === 'error' && (
          <ErrorScreen onRetry={() => { setStatus('scanning'); setStep('scan') }} />
        )}
      </section>
    </main>
  )
}

function ScanScreen({ statusText, onSimulate }) {
  return (
    <div>
      <div className="relative rounded-[32px] border-[3px] border-cold-500 p-5 h-[500px] bg-cold-800/60">
        <div className="relative h-full rounded-3xl border border-cold-300/40 overflow-hidden bg-gradient-to-b from-cold-800 to-cold-700">
          <div className="absolute inset-x-8 top-[20%] bottom-[24%] rounded-[999px] border-4 border-dashed border-cold-300/70 animate-pulseScan" />
          <div className="absolute left-8 right-8 h-1 bg-cold-500/70 blur-[1px] animate-scanLine" />
        </div>
      </div>

      <div className="text-center mt-6 text-cold-300 text-[34px]">{statusText}</div>
      <p className="text-center mt-2 text-white/60 text-[32px]">Coloque su rostro dentro del marco</p>
      <button
        onClick={onSimulate}
        className="mt-5 w-full h-20 rounded-2xl bg-cold-500 hover:bg-[#2f80f7] active:scale-[0.98] transition font-medium text-[30px]"
      >
        Simular detección facial
      </button>
    </div>
  )
}

function ResultScreen({ worker, onYes, onNo }) {
  return (
    <div className="px-2 py-3">
      <div className="flex flex-col items-center gap-4 py-10">
        <div className="w-28 h-28 rounded-full bg-cold-500 text-3xl font-semibold flex items-center justify-center border-2 border-cold-300">
          {worker.avatar}
        </div>
        <h2 className="text-4xl font-semibold">{worker.name}</h2>
        <p className="text-2xl text-cold-300">Área: {worker.area}</p>
        <p className="text-4xl font-medium mt-2">¿Eres tú?</p>
      </div>

      <div className="space-y-3 pb-5">
        <button onClick={onYes} className="w-full h-20 rounded-2xl bg-emerald-500 text-white text-[30px] font-semibold">Sí, soy yo</button>
        <button onClick={onNo} className="w-full h-20 rounded-2xl bg-slate-500 text-white text-[30px] font-semibold">No soy yo</button>
      </div>
    </div>
  )
}

function DoneScreen({ worker, time }) {
  return (
    <div className="h-[650px] flex flex-col items-center justify-center text-center px-5">
      <div className="w-32 h-32 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-7xl mb-5">✔</div>
      <h2 className="text-4xl font-semibold">Asistencia registrada correctamente</h2>
      <p className="text-2xl text-cold-300 mt-4">{worker.name}</p>
      <p className="text-4xl mt-2">{time}</p>
      <span className={`mt-3 rounded-full px-4 py-2 text-xl ${worker.punctuality === 'Puntual' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
        {worker.punctuality}
      </span>
      <p className="text-xl text-white/60 mt-6">Regresando al escáner en 2-3 segundos...</p>
    </div>
  )
}

function ErrorScreen({ onRetry }) {
  return (
    <div className="h-[650px] px-4 flex flex-col items-center justify-center text-center">
      <div className="text-7xl mb-3">⚠</div>
      <h2 className="text-4xl font-semibold text-red-300">No se pudo reconocer el rostro</h2>
      <p className="mt-4 text-2xl text-white/70">Intente nuevamente</p>
      <button onClick={onRetry} className="mt-8 w-full h-20 rounded-2xl bg-red-500 text-white text-[30px] font-semibold">Reintentar</button>
    </div>
  )
}
