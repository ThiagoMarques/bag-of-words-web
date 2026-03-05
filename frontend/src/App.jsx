import { useState } from 'react'

function App() {
  const [mode, setMode] = useState('url') // 'url' ou 'text'
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [saveScreenshot, setSaveScreenshot] = useState(false)
  const [ignoreHeaderFooter, setIgnoreHeaderFooter] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [results, setResults] = useState(null)
  const [screenshot, setScreenshot] = useState(null)

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
    setScreenshot(null)

    try {
      const endpoint = mode === 'url' ? '/api/analyze-url' : '/api/analyze'
      const body = mode === 'url' 
        ? { url: url.trim(), saveScreenshot, ignoreHeaderFooter }
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
      if (data.screenshot) {
        setScreenshot(data.screenshot)
      }
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

  const downloadScreenshot = () => {
    if (!screenshot) return
    
    const link = document.createElement('a')
    link.href = screenshot
    link.download = `screenshot-${url.replace(/[^a-z0-9]/gi, '-')}-${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
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
                    setScreenshot(null)
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
                    setScreenshot(null)
                    setSaveScreenshot(false)
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
                  <div className="flex gap-2 mb-3">
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
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        id="saveScreenshot"
                        type="checkbox"
                        checked={saveScreenshot}
                        onChange={(e) => setSaveScreenshot(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={loading}
                      />
                      <label htmlFor="saveScreenshot" className="ml-2 text-sm text-gray-700">
                        Salvar e exibir screenshot
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="ignoreHeaderFooter"
                        type="checkbox"
                        checked={ignoreHeaderFooter}
                        onChange={(e) => setIgnoreHeaderFooter(e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        disabled={loading}
                      />
                      <label htmlFor="ignoreHeaderFooter" className="ml-2 text-sm text-gray-700">
                        Ignorar header e footer na análise
                      </label>
                    </div>
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
            
            {screenshot && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">Screenshot</h3>
                  <button
                    onClick={downloadScreenshot}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200"
                  >
                    Download
                  </button>
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={screenshot} 
                    alt="Screenshot do site" 
                    className="w-full h-auto max-h-96 object-contain"
                  />
                </div>
              </div>
            )}

            {results.wordcloud && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Nuvem de Palavras</h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-center">
                    <img 
                      src={results.wordcloud} 
                      alt="Nuvem de palavras" 
                      className="max-w-full h-auto rounded-lg shadow-sm"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    As palavras maiores aparecem com mais frequência no texto analisado
                  </p>
                </div>
              </div>
            )}
            
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

            {results.preprocessing && results.preprocessing.estatisticas && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Estatísticas de Pré-processamento</h3>
                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Palavras Originais</p>
                      <p className="text-lg font-semibold text-purple-700">
                        {results.preprocessing.estatisticas.total_palavras_original || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Após Processamento</p>
                      <p className="text-lg font-semibold text-purple-700">
                        {results.preprocessing.estatisticas.total_palavras_processadas || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Stop Words Removidas</p>
                      <p className="text-lg font-semibold text-red-600">
                        {results.preprocessing.estatisticas.stopwords_removidas || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Redução</p>
                      <p className="text-lg font-semibold text-orange-600">
                        {results.preprocessing.estatisticas.reducao_percentual || 0}%
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Pré-processamento sempre ativo: tokenização, remoção de stop words, pontuação e acentos
                  </p>
                </div>
              </div>
            )}

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

