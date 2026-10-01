import React, { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'

const API = 'http://localhost:8000'

const SUGGESTED_QUERIES = [
  'What was the total revenue and net income for Q3 2026?',
  'Which segment experienced the highest growth?',
  'What are the main risk factors mentioned?',
  'What is the Q4 2026 revenue guidance?',
  'Who is the CFO of Acme Technologies?'
]

export default function Analyze({ systemStatus }) {
  const [query, setQuery] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  const isReady = systemStatus?.initialized && systemStatus?.has_document

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendQuery = async (text) => {
    const q = (text || query).trim()
    if (!q || loading) return
    setQuery('')

    const userMsg = { id: Date.now(), role: 'user', content: q }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'An error occurred.')

      const botMsg = {
        id: Date.now() + 1,
        role: 'bot',
        content: data.data.analytical_answer,
        citations: data.data.source_citations || []
      }
      setMessages(prev => [...prev, botMsg])
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'bot',
        content: `Error: ${err.message}`,
        isError: true
      }])
    }
    setLoading(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    sendQuery()
  }

  const clearChat = () => setMessages([])

  return (
    <div className="page-wrapper">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Analysis</h1>
          <p className="page-description">
            {isReady
              ? `Querying: ${systemStatus.document_info?.title || 'Loaded document'}`
              : 'System not ready. Complete Setup first.'}
          </p>
        </div>
        {messages.length > 0 && (
          <button className="btn btn-secondary" onClick={clearChat} style={{ flexShrink: 0 }}>
            Clear
          </button>
        )}
      </div>

      {!isReady && (
        <div className="callout callout-warning" style={{ marginBottom: '1.5rem' }}>
          <div className="callout-title">Setup required</div>
          Please <Link to="/">configure your API key and load a document</Link> before analyzing.
        </div>
      )}

      {/* Suggested queries — only shown before any messages */}
      {isReady && messages.length === 0 && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <div className="card-title">Suggested Queries</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {SUGGESTED_QUERIES.map((q, i) => (
              <button
                key={i}
                className="btn btn-ghost"
                style={{ justifyContent: 'flex-start', textAlign: 'left', padding: '7px 10px', borderRadius: 'var(--radius-md)', fontSize: '13px' }}
                onClick={() => sendQuery(q)}
                disabled={!isReady || loading}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat messages */}
      <div className="chat-area">
        {messages.length === 0 && isReady && null}
        {messages.map(msg => (
          <div key={msg.id} className={`message-row ${msg.role}`}>
            <div className="message-label">{msg.role === 'user' ? 'You' : 'Analyzer'}</div>
            <div className={`message-bubble ${msg.isError ? 'callout-error' : ''}`}>
              <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
              {msg.citations && msg.citations.length > 0 && (
                <div className="citations-block">
                  <div className="citations-title">Source Citations</div>
                  {msg.citations.map((c, idx) => (
                    <div key={idx} className="citation-item">{c}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message-row thinking">
            <div className="message-label">Analyzer</div>
            <div className="message-bubble" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-tertiary)' }}>
              <span className="spinner dark"></span>
              Retrieving context and generating response...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="card" style={{ marginBottom: 0, position: 'sticky', bottom: '1.5rem' }}>
        <form onSubmit={handleSubmit}>
          <div className="chat-input-row">
            <input
              type="text"
              className="form-input"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={isReady ? 'Ask a question about the loaded document...' : 'Setup required before querying'}
              disabled={!isReady || loading}
              autoFocus={isReady}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!isReady || loading || !query.trim()}
              style={{ flexShrink: 0 }}
            >
              {loading ? <span className="spinner"></span> : 'Ask'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
