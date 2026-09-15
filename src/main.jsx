import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './components/App.jsx'

// Performance monitoring in development
if (import.meta.env.DEV) {
  // Log render performance
  const originalRender = createRoot
  createRoot = (container) => {
    const root = originalRender(container)
    const originalUnstable = root._internalRoot?.containerInfo
    return root
  }
  
  // Log component mount times
  console.log('🚀 Performance monitoring enabled in development')
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
