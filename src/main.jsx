import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

try {
  const theme = localStorage.getItem('barndos-theme')
  document.documentElement.classList.toggle('dark', theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches))
} catch { /* Use the default light theme if browser storage is unavailable. */ }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
