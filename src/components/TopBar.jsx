function TopBar({ onMenuOpen, pageTitle }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 30,
      background: 'white',
      borderBottom: '1px solid var(--gray-200)',
      padding: '0 16px',
      height: 56,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img
          src="/LOGO CON BLANCO PERIMETRAL.jpg"
          alt="ARMAR"
          style={{ height: 36, width: 'auto' }}
        />
        <span style={{ fontWeight: 800, fontSize: 18, color: 'var(--gray-900)' }}>
          ARMAR
        </span>
        {pageTitle && (
          <>
            <span style={{ color: 'var(--gray-300)', fontSize: 16 }}>›</span>
            <span style={{ fontSize: 14, color: 'var(--gray-500)', fontWeight: 500 }}>
              {pageTitle}
            </span>
          </>
        )}
      </div>

      <button
        onClick={onMenuOpen}
        aria-label="Abrir menú"
        style={{
          background: 'var(--gray-100)',
          border: 'none',
          borderRadius: 8,
          width: 38,
          height: 38,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <span style={{ display: 'block', width: 18, height: 2, background: 'var(--gray-600)', borderRadius: 2 }} />
        <span style={{ display: 'block', width: 18, height: 2, background: 'var(--gray-600)', borderRadius: 2 }} />
        <span style={{ display: 'block', width: 18, height: 2, background: 'var(--gray-600)', borderRadius: 2 }} />
      </button>
    </div>
  )
}

export default TopBar
