import React, { useEffect, useState } from 'react'
import { Routes, Route, NavLink } from 'react-router-dom'
import Setup from './pages/Setup'
import Analyze from './pages/Analyze'
import './App.css'

const API = 'http://localhost:8000'

export default function App() {
  const [systemStatus, setSystemStatus] = useState({ initialized: false, has_document: false, status: 'checking' })

  const refreshStatus = async () => {
    try {
      const res = await fetch(`${API}/api/status`)
      if (res.ok) {
        const data = await res.json()
        setSystemStatus(data)
      }
    } catch {
      setSystemStatus(prev => ({ ...prev, status: 'offline' }))
    }
  }

  useEffect(() => {
    refreshStatus()
    const interval = setInterval(refreshStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const dotClass =
    systemStatus.status === 'offline' ? 'status-dot' :
    systemStatus.initialized && systemStatus.has_document ? 'status-dot ready' :
    systemStatus.status === 'online' ? 'status-dot online' :
    'status-dot'

  const statusLabel =
    systemStatus.status === 'offline' ? 'Backend offline' :
    systemStatus.initialized && systemStatus.has_document ? 'Ready to analyze' :
    systemStatus.initialized ? 'Document needed' :
    'API key needed'

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="nav-brand">
          <div className="nav-brand-icon">FA</div>
          <span className="nav-brand-text">Financial Analyzer</span>
        </div>

        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Setup
          </NavLink>
          <NavLink to="/analyze" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
            Analyze
          </NavLink>
        </div>

        <div className="nav-status">
          <span className={dotClass}></span>
          <span>{statusLabel}</span>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Setup onStatusChange={refreshStatus} systemStatus={systemStatus} />} />
        <Route path="/analyze" element={<Analyze systemStatus={systemStatus} />} />
      </Routes>
    </div>
  )
}
