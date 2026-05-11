import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

import './css/reset.css'
import './css/variables.css'
import './css/globals.css'
import './css/layout.css'
import './css/jobs.css'
import './css/daily-entries.css'
import './css/field-notes.css'
import './css/photos.css'
import './css/survey.css'

function FatalError({ message }) {
  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: 20, marginBottom: 12 }}>App failed to start</h1>
      <p style={{ color: '#b91c1c' }}>{message}</p>
    </div>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root'))

try {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
} catch (error) {
  console.error('Fatal startup error:', error)
  root.render(<FatalError message={error.message} />)
}
