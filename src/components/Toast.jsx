import { useEffect, useState } from 'react'

const STYLES = {
  error:   { bg: '#FDECEA', border: '#C0392B', text: '#C0392B' },
  success: { bg: '#EBF7F1', border: '#2D7A4F', text: '#2D7A4F' },
}

export default function Toast({ message, type = 'error' }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setVisible(true), 10)
    return () => clearTimeout(id)
  }, [])

  const { bg, border, text } = STYLES[type] || STYLES.error

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      zIndex: 1000,
      maxWidth: 360,
      padding: '14px 18px',
      borderRadius: 10,
      background: bg,
      border: `1px solid ${border}`,
      color: text,
      fontSize: 13,
      fontWeight: 600,
      fontFamily: 'inherit',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(16px)',
      transition: 'opacity 0.25s ease, transform 0.25s ease',
    }}>
      {message}
    </div>
  )
}
