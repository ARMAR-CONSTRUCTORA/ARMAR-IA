import { useState, useRef } from 'react'

// Formatea la respuesta de Nominatim en texto legible
function formatAddress(item) {
  const a = item.address || {}
  const parts = [
    a.neighbourhood || a.suburb || a.quarter,
    a.city || a.town || a.village || a.municipality,
    a.state || a.province || a.county,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : item.display_name
}

// Título principal del resultado (primera línea del dropdown)
function resultTitle(item) {
  const a = item.address || {}
  return a.neighbourhood || a.suburb || a.quarter ||
         a.city || a.town || a.village || item.name || item.display_name
}

// Subtítulo del resultado (segunda línea del dropdown)
function resultSub(item) {
  const a = item.address || {}
  return [
    a.city || a.town || a.village,
    a.state || a.province,
    a.country,
  ].filter(Boolean).slice(0, 3).join(', ')
}

export default function LocationAutocomplete({ value, onChange, hasError }) {
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading]         = useState(false)
  const [open, setOpen]               = useState(false)
  const timerRef = useRef()
  const inputRef = useRef()

  const search = (q) => {
    clearTimeout(timerRef.current)
    if (q.length < 3) { setSuggestions([]); setOpen(false); return }

    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const url = `https://nominatim.openstreetmap.org/search` +
          `?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=6&accept-language=es`
        const res  = await fetch(url)
        const data = await res.json()
        setSuggestions(data)
        setOpen(data.length > 0)
      } catch {
        setSuggestions([])
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }, 380)
  }

  const handleChange = (e) => {
    onChange(e.target.value)
    search(e.target.value)
  }

  // mouseDown (no onClick) para que se dispare ANTES del onBlur del input
  const handleSelect = (item) => {
    onChange(formatAddress(item))
    setSuggestions([])
    setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Input */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 180)}
          placeholder="Escribí para buscar barrio, localidad o provincia…"
          style={{
            width: '100%',
            padding: '10px 38px 10px 13px',
            borderRadius: 8,
            border: `1.5px solid ${hasError ? 'var(--red)' : 'var(--gray-200)'}`,
            fontSize: 14, color: 'var(--gray-800)',
            fontFamily: 'inherit', background: 'white',
            boxSizing: 'border-box',
          }}
        />
        <span style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          fontSize: 15, opacity: loading ? 1 : 0.45,
          animation: loading ? 'spin 1s linear infinite' : 'none',
          pointerEvents: 'none',
        }}>
          {loading ? '⏳' : '📍'}
        </span>
      </div>

      {/* Dropdown de sugerencias */}
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)',
          zIndex: 999, background: 'white',
          borderRadius: 10, border: '1px solid var(--gray-200)',
          boxShadow: '0 8px 28px rgba(0,0,0,0.13)',
          overflow: 'hidden', maxHeight: 260, overflowY: 'auto',
        }}>
          {suggestions.map((item, i) => (
            <button
              key={item.place_id}
              onMouseDown={() => handleSelect(item)}
              style={{
                width: '100%', display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '10px 14px',
                border: 'none',
                borderBottom: i < suggestions.length - 1 ? '1px solid #F3F4F6' : 'none',
                background: 'white', cursor: 'pointer',
                textAlign: 'left', fontFamily: 'inherit',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#FFF7ED'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              <span style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }}>📍</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)', lineHeight: 1.3 }}>
                  {resultTitle(item)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2 }}>
                  {resultSub(item)}
                </div>
              </div>
            </button>
          ))}
          <div style={{
            padding: '6px 14px', fontSize: 10, color: 'var(--gray-400)',
            borderTop: '1px solid #F3F4F6', textAlign: 'right',
          }}>
            Datos © OpenStreetMap
          </div>
        </div>
      )}
    </div>
  )
}
