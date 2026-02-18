import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [status, setStatus] = useState('Checking backend...')

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('/api/health')

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = (await response.json()) as { status?: string; message?: string }
        setStatus(data.message ?? 'Backend is reachable')
      } catch {
        setStatus('Backend not reachable. Start backend with uv first.')
      }
    }

    void checkBackend()
  }, [])

  return (
    <main>
      <h1>Beyond Chat</h1>
      <p>Frontend ↔ Backend connectivity check:</p>
      <div className="card">
        <strong>{status}</strong>
      </div>
    </main>
  )
}

export default App
