const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard',    icon: '📊' },
      { id: 'obras',     label: 'Obras',         icon: '🏗️' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { id: 'cronogramas', label: 'Cronogramas', icon: '📅' },
      { id: 'equipo',      label: 'Equipo',       icon: '👥' },
      { id: 'documentos',  label: 'Documentos',   icon: '📁' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { id: 'configuracion', label: 'Configuración', icon: '⚙️' },
    ],
  },
]

function Sidebar({ activePage, onNavigate }) {
  return (
    <aside style={{
      width: 240,
      minHeight: '100vh',
      background: 'white',
      borderRight: '1px solid var(--gray-200)',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      left: 0, top: 0, bottom: 0,
      zIndex: 50,
      boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
    }}>
      {/* Logo */}
      <div style={{
        padding: '18px 20px',
        borderBottom: '1px solid var(--gray-200)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <img
          src="/LOGO CON BLANCO PERIMETRAL.jpg"
          alt="ARMAR"
          style={{ height: 44, width: 'auto', flexShrink: 0 }}
        />
        <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--gray-900)', letterSpacing: '-0.3px' }}>
          ARMAR
        </span>
      </div>

      {/* Nav groups */}
      <nav style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} style={{ marginBottom: gi < NAV_GROUPS.length - 1 ? 20 : 0 }}>
            <p style={{
              fontSize: 10, fontWeight: 700, color: 'var(--gray-400)',
              textTransform: 'uppercase', letterSpacing: '0.09em',
              padding: '0 10px', marginBottom: 6,
            }}>
              {group.label}
            </p>
            {group.items.map(item => {
              const active = activePage === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: active ? '#FFF7ED' : 'transparent',
                    color: active ? 'var(--orange)' : 'var(--gray-600)',
                    fontWeight: active ? 700 : 500,
                    fontSize: 14, cursor: 'pointer', marginBottom: 2,
                    textAlign: 'left', fontFamily: 'inherit',
                    transition: 'background 0.15s, color 0.15s',
                    borderLeft: `3px solid ${active ? 'var(--orange)' : 'transparent'}`,
                  }}
                >
                  <span style={{ fontSize: 15, lineHeight: 1 }}>{item.icon}</span>
                  {item.label}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '14px 20px', borderTop: '1px solid var(--gray-200)',
        fontSize: 11, color: 'var(--gray-400)', textAlign: 'center',
      }}>
        ARMAR · Sistema de Obras · {new Date().getFullYear()}
      </div>
    </aside>
  )
}

export default Sidebar
