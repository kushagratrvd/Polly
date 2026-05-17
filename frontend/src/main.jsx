import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Your standard Vite CSS import
import { LenisProvider } from './components/providers/lenis-provider.jsx'
import { AuthProvider } from './components/auth/AuthProvider.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <LenisProvider>
        <App />
      </LenisProvider>
    </AuthProvider>
  </React.StrictMode>
)