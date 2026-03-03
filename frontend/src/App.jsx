import { useState } from 'react'

function App() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [url, setUrl] = useState('')

  const checkHealth = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:3001/health')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      setStatus({ error: 'Backend não está rodando' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Bag of Words - Análise de Site</h1>
        <p>Análise de palavras de qualquer site usando PLN</p>
      </header>

      <main className="main">
      </main>
    </div>
  )
}

export default App

