import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import './index.css'
import App from './App.tsx'

// Pause CSS animations while the page is hidden (saves battery).
const syncHidden = () =>
  document.documentElement.setAttribute('data-page-hidden', String(document.hidden))
document.addEventListener('visibilitychange', syncHidden)
syncHidden()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
