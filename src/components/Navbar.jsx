function Navbar() {
  const today = new Date().toLocaleDateString('es-CL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const capitalized = today.charAt(0).toUpperCase() + today.slice(1)

  return (
    <nav style={{
      background: 'white',
      padding: '0 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: 64,
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      borderBottom: '1px solid var(--gray-200)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <img
          src="/LOGO CON BLANCO PERIMETRAL.jpg"
          alt="ARMAR logo"
          style={{ height: 56, width: 'auto', flexShrink: 0 }}
        />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
          <span style={{ color: 'var(--gray-900)', fontWeight: 800, fontSize: 20, letterSpacing: '-0.3px' }}>ARMAR</span>
        </div>
        <div style={{
          height: 22,
          width: 1,
          background: 'var(--gray-200)',
          marginLeft: 6,
          marginRight: 6,
        }} />
        <span style={{ color: 'var(--gray-600)', fontSize: 13, fontWeight: 500 }}>
          Gestión de Obras
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%', background: 'var(--green)',
        }} />
        <span style={{ color: 'var(--gray-600)', fontSize: 13 }}>{capitalized}</span>
      </div>
    </nav>
  )
}

export default Navbar
