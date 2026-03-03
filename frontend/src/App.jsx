import { useState } from 'react'

function App() {
  const [mode, setMode] = useState('url') // 'url' ou 'text'
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)

  const validateUrl = (urlString) => {
    try {
      const urlObj = new URL(urlString)
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:'
    } catch {
      return false
    }
  }

  const handleAnalyze = async () => {
    if (mode === 'url') {
      if (!url.trim()) {
        setError('Por favor, insira uma URL')
        return
      }
      
      if (!validateUrl(url.trim())) {
        setError('URL inválida. Use http:// ou https://')
        return
      }
    } else {
      if (!text.trim()) {
        setError('Por favor, insira um texto para análise')
        return
      }
    }

    setLoading(true)
    setError(null)
    setResults(null)

    try {
      const endpoint = mode === 'url' ? '/api/analyze-url' : '/api/analyze'
      const body = mode === 'url' 
        ? { url: url.trim() }
        : { text: text.trim() }

      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao analisar')
      }

      const data = await response.json()
      setResults(data.data)
    } catch (err) {
      setError(err.message || 'Erro ao conectar com o backend')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading && e.ctrlKey) {
      handleAnalyze()
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Bag of Words</h1>
          <p className="mt-2 text-sm text-gray-600">Análise de palavras de qualquer site usando PLN</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="space-y-4">
            <div>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => {
                    setMode('url')
                    setError(null)
                  }}
                  className={`px-4 py-2 rounded-md font-medium transition duration-200 ${
                    mode === 'url'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  URL do Site
                </button>
                <button
                  onClick={() => {
                    setMode('text')
                    setError(null)
                  }}
                  className={`px-4 py-2 rounded-md font-medium transition duration-200 ${
                    mode === 'text'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Texto Direto
                </button>
              </div>

              {mode === 'url' ? (
                <div>
                  <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                    URL do Site
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Digite a URL do site para fazer screenshot e análise
                  </p>
                  <div className="flex gap-2">
                    <input
                      id="url"
                      type="text"
                      value={url}
                      onChange={(e) => {
                        setUrl(e.target.value)
                        setError(null)
                      }}
                      onKeyPress={handleKeyPress}
                      placeholder="https://www.example.com"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={loading}
                    />
                    <button
                      onClick={handleAnalyze}
                      disabled={loading || !url.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                    >
                      {loading ? 'Analisando...' : 'Analisar'}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label htmlFor="text" className="block text-sm font-medium text-gray-700 mb-2">
                    Texto para Análise
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Cole o texto diretamente para análise
                  </p>
                  <div className="flex gap-2">
                    <textarea
                      id="text"
                      value={text}
                      onChange={(e) => {
                        setText(e.target.value)
                        setError(null)
                      }}
                      onKeyPress={handleKeyPress}
                      placeholder="Cole o texto aqui..."
                      rows="4"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      disabled={loading}
                    />
                    <button
                      onClick={handleAnalyze}
                      disabled={loading || !text.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 self-start"
                    >
                      {loading ? 'Analisando...' : 'Analisar'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Processando análise...</p>
          </div>
        )}

        {results && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Resultados</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Total de Palavras</p>
                <p className="text-2xl font-bold text-blue-600">{results.total_palavras || 0}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Palavras Únicas</p>
                <p className="text-2xl font-bold text-green-600">{results.palavras_unicas || 0}</p>
              </div>
            </div>

            {results.top_palavras && results.top_palavras.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Top Palavras</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Palavra
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Frequência
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.top_palavras.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.palavra}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.frequencia}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App

