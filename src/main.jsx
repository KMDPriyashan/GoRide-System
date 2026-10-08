import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { initializeGoRideSeed } from './seed/seedData.js'
import './index.css'
import './shared/components/common/common.css'

try {
  initializeGoRideSeed()
} catch (error) {
  console.error('GoRide seed initialization failed.', error)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
)