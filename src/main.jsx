import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { crearUsuario } from './lib/supabase'

// Admin utility: desde consola del browser → await crearUsuario('nombre', 'contraseña')
window.crearUsuario = crearUsuario

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
