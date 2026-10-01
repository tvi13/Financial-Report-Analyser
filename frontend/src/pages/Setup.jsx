import React, { useState } from 'react'

const API = 'http://localhost:8000'

const INITIAL_MODELS = [
  { value: 'openai/gpt-oss-20b', label: 'GPT-OSS-20B (Groq Free)' },
  { value: 'openai/gpt-oss-120b', label: 'GPT-OSS-120B (Groq Free)' },
  { value: 'llama3-8b-8192', label: 'Llama 3 8B' },
]

export default function Setup({ onStatusChange, systemStatus }) {
  const [apiKey, setApiKey] = useState('')
  const [selectedModel, setSelectedModel] = useState('openai/gpt-oss-20b')
  const [models, setModels] = useState(INITIAL_MODELS)
  const [docText, setDocText] = useState('')
  const [docTitle, setDocTitle] = useState('')
  const [setupLoading, setSetupLoading] = useState(false)
  const [docLoading, setDocLoading] = useState(false)
  const [sampleLoading, setSampleLoading] = useState(false)
  const [setupMsg, setSetupMsg] = useState(null)
  const [docMsg, setDocMsg] = useState(null)

  const handleSetup = async (e) => {
    e.preventDefault()
    setSetupLoading(true)
    setSetupMsg(null)
    try {
      const res = await fetch(`${API}/api/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, model: selectedModel })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Failed to configure API key.')
      setSetupMsg({ type: 'success', text: data.message })
      onStatusChange()
      
      // Fetch dynamic models
      fetchModels(apiKey)
    } catch (err) {
      setSetupMsg({ type: 'error', text: err.message })
    }
    setSetupLoading(false)
  }

  const fetchModels = async (key) => {
    try {
      const res = await fetch(`${API}/api/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: key })
      })
      if (res.ok) {
        const data = await res.json()
        const dynamicModels = data.models.map(m => ({ value: m, label: m }))
        if (dynamicModels.length > 0) {
           setModels(dynamicModels)
           if (!dynamicModels.find(m => m.value === selectedModel)) {
             setSelectedModel(dynamicModels[0].value)
           }
        }
      }
    } catch (err) {
       console.error("Failed to fetch dynamic models", err)
    }
  }

  const handleLoadDocument = async (e) => {
    e.preventDefault()
    if (!docText.trim()) return
    setDocLoading(true)
    setDocMsg(null)
    try {
      const res = await fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_text: docText, title: docTitle || 'Financial Report' })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Upload failed.')
      setDocMsg({ type: 'success', text: `${data.message}` })
      onStatusChange()
    } catch (err) {
      setDocMsg({ type: 'error', text: err.message })
    }
    setDocLoading(false)
  }

  const loadSample = async () => {
    setSampleLoading(true)
    try {
      const res = await fetch(`${API}/api/sample`)
      const data = await res.json()
      setDocText(data.content)
      setDocTitle(data.title)
    } catch {
      setDocMsg({ type: 'error', text: 'Could not load sample. Is the backend running?' })
    }
    setSampleLoading(false)
  }

  const isConfigured = systemStatus?.initialized
  const hasDocument = systemStatus?.has_document

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <h1 className="page-title">System Setup</h1>
        <p className="page-description">Configure the RAG engine with your Groq API key, then load a financial document to analyze.</p>
      </div>

      {/* Step 1 — API Key */}
      <div className="card">
        <div className="card-title">
          <span className="step-badge">1</span>
          Configure Groq API Key
          {isConfigured && <span className="chip chip-green" style={{ marginLeft: 'auto', fontWeight: 500 }}>● Configured</span>}
        </div>
        <form onSubmit={handleSetup}>
          <div className="form-group">
            <label className="form-label" htmlFor="model">Model</label>
            <select
              id="model"
              className="form-input"
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
            >
              {models.map(m => (
                <option key={m.value} value={m.value}>{m.label || m.value}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="apiKey">Groq API Key</label>
            <input
              id="apiKey"
              type="password"
              className="form-input"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="gsk_..."
              required
            />
            <div className="form-helper">
              Get an API key from <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">console.groq.com/keys</a>.
            </div>
          </div>
          {setupMsg && (
            <div className={`callout callout-${setupMsg.type}`} style={{ marginBottom: '0.875rem' }}>
              {setupMsg.text}
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={setupLoading || !apiKey.trim()}>
            {setupLoading && <span className="spinner"></span>}
            {setupLoading ? 'Initializing...' : 'Initialize Engine'}
          </button>
        </form>
      </div>

      {/* Step 2 — Document */}
      <div className="card">
        <div className="card-title">
          <span className="step-badge">2</span>
          Load Financial Document
          {hasDocument && (
            <span className="chip chip-blue" style={{ marginLeft: 'auto' }}>
              ● {systemStatus.document_info?.chunk_count} chunks indexed
            </span>
          )}
        </div>

        {!isConfigured && (
          <div className="callout callout-warning" style={{ marginBottom: '1rem' }}>
            Complete Step 1 before loading a document.
          </div>
        )}

        <form onSubmit={handleLoadDocument}>
          <div className="form-group">
            <label className="form-label" htmlFor="docTitle">Document Title <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
            <input
              id="docTitle"
              type="text"
              className="form-input"
              value={docTitle}
              onChange={e => setDocTitle(e.target.value)}
              placeholder="e.g. Acme Corp Q3 2026 10-Q"
              disabled={!isConfigured}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="docText">Document Text</label>
            <textarea
              id="docText"
              className="form-textarea"
              value={docText}
              onChange={e => setDocText(e.target.value)}
              placeholder="Paste your financial report text here..."
              disabled={!isConfigured}
              required
            />
            <div className="form-helper">
              Paste raw text from a 10-Q, earnings report, or any financial document.
            </div>
          </div>

          {docMsg && (
            <div className={`callout callout-${docMsg.type}`} style={{ marginBottom: '0.875rem' }}>
              {docMsg.text}
            </div>
          )}

          <div className="btn-row">
            <button type="submit" className="btn btn-primary" disabled={docLoading || !isConfigured || !docText.trim()}>
              {docLoading && <span className="spinner"></span>}
              {docLoading ? 'Processing...' : 'Index Document'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={loadSample} disabled={!isConfigured || sampleLoading}>
              {sampleLoading && <span className="spinner dark"></span>}
              Load Sample Report
            </button>
          </div>
        </form>
      </div>

      {/* Step 3 — System Info */}
      {isConfigured && (
        <div className="card">
          <div className="card-title">
            <span className="step-badge">3</span>
            System Info
          </div>
          <div className="info-grid">
            <div className="info-item">
              <div className="info-label">LLM</div>
              <div className="info-value mono">{systemStatus.model || 'openai/gpt-oss-20b'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Embeddings</div>
              <div className="info-value mono">{systemStatus.embeddings || 'all-MiniLM-L6-v2'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Vector Store</div>
              <div className="info-value">{systemStatus.vector_store || 'FAISS'}</div>
            </div>
            <div className="info-item">
              <div className="info-label">Document</div>
              <div className="info-value">{systemStatus.document_info?.title || '—'}</div>
            </div>
          </div>
          {hasDocument && (
            <div style={{ marginTop: '1rem' }}>
              <div className="callout callout-success">
                <div className="callout-title">Ready to analyze</div>
                Go to the <strong>Analyze</strong> tab to start querying your document.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
