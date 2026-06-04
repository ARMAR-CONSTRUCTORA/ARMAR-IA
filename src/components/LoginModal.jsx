import { useState, useRef, useEffect } from 'react'
import { loginUsuario } from '../lib/supabase'

export default function LoginModal({ onLogin, onClose }) {
  const [nombre, setNombre]     = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const nombreRef = useRef(null)

  useEffect(() => { nombreRef.current?.focus() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nombre.trim() || !password) return
    setLoading(true)
    setError('')
    const user = await loginUsuario(nombre.trim(), password)
    setLoading(false)
    if (!user) {
      setError('Usuario o contraseña incorrectos')
    } else {
      onLogin(user)
    }
  }

  const inputStyle = {
    width: '100%', padding: '10px 13px', borderRadius: 8,
    border: '1.5px solid var(--gray-200)', fontSize: 14,
    fontFamily: 'inherit', boxSizing: 'border-box', color: 'var(--gray-800)',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, backdropFilter: 'blur(2px)', padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'white', borderRadius: 18, padding: '32px 36px',
        maxWidth: 400, width: '100%',
        boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔐</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 4 }}>
            Iniciar sesión
          </h2>
          <p style={{ fontSize: 13, color: 'var(--gray-500)' }}>
            Ingresá tus credenciales para editar
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 700,
              color: 'var(--gray-600)', marginBottom: 6,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Nombre
            </label>
            <input
              ref={nombreRef}
              type="text"
              value={nombre}
              onChange={e => { setNombre(e.target.value); setError('') }}
              placeholder="Tu nombre de usuario"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 700,
              color: 'var(--gray-600)', marginBottom: 6,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          {error && (
            <div style={{
              background: '#FFF5F5', border: '1px solid #FECACA',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              fontSize: 13, color: '#DC2626', fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', borderRadius: 9, border: 'none',
              background: loading ? 'var(--gray-300)' : 'var(--orange)',
              color: 'white', cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 700, fontSize: 15, fontFamily: 'inherit',
              boxShadow: loading ? 'none' : '0 3px 10px rgba(249,115,22,0.4)',
            }}
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <button
          onClick={onClose}
          style={{
            display: 'block', width: '100%', marginTop: 12, padding: '10px',
            background: 'none', border: 'none', color: 'var(--gray-400)',
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
