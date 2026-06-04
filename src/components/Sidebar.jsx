const NAV_GROUPS = [
  {
    label: 'Principal',
    items: [
      { id: 'dashboard', label: 'Dashboard',  icon: '📊' },
      { id: 'obras',     label: 'Obras',       icon: '🏗️' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { id: 'cronogramas', label: 'Cronogramas', icon: '📅' },
      { id: 'equipo',      label: 'Equipo',       icon: '👥' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { id: 'configuracion', label: 'Configuración', icon: '⚙️' },
    ],
  },
]

function NavItems({ activePage, onNavigate }) {
  return (
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
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 12px', borderRadius: 8, border: 'none',
                  background: active ? '#FFF7ED' : 'transparent',
                  color: active ? 'var(--orange)' : 'var(--gray-600)',
                  fontWeight: active ? 700 : 500, fontSize: 14,
                  cursor: 'pointer', marginBottom: 2, textAlign: 'left',
                  fontFamily: 'inherit', transition: 'background 0.15s, color 0.15s',
                  borderLeft: `3px solid ${active ? 'var(--orange)' : 'transparent'}`,
                }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

function SidebarContent({ activePage, onNavigate, onClose, showClose, currentUser, onLoginClick, onLogout }) {
  return (
    <>
      {/* Logo header */}
      <div style={{
        padding: '18px 20px', borderBottom: '1px solid var(--gray-200)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div
          onClick={() => onNavigate('dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderRadius: 10, padding: '4px 6px', transition: 'background 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FFF7ED' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <img
            src="/LOGO CON BLANCO PERIMETRAL.jpg"
            alt="ARMAR"
            style={{ height: 76, width: 'auto', flexShrink: 0 }}
          />
          <span style={{ fontWeight: 800, fontSize: 22, color: 'var(--gray-900)', letterSpacing: '-0.3px' }}>
            ARMAR
          </span>
        </div>
        {showClose && (
          <button
            onClick={onClose}
            style={{
              background: 'var(--gray-100)', border: 'none', borderRadius: 8,
              width: 34, height: 34, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', fontSize: 16,
              color: 'var(--gray-500)', flexShrink: 0,
            }}
          >
            ✕
          </button>
        )}
      </div>

      <NavItems activePage={activePage} onNavigate={onNavigate} />

      {/* Auth footer */}
      <div style={{
        padding: '14px 16px', borderTop: '1px solid var(--gray-200)',
        flexShrink: 0,
      }}>
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: 'var(--orange)', color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, flexShrink: 0,
            }}>
              {currentUser.nombre.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser.nombre}
              </div>
              <button
                onClick={onLogout}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 11, color: 'var(--gray-400)', cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onLoginClick}
            style={{
              width: '100%', padding: '9px 14px', borderRadius: 8,
              border: '1px solid var(--gray-200)', background: 'white',
              color: 'var(--gray-600)', cursor: 'pointer', fontWeight: 700,
              fontSize: 13, fontFamily: 'inherit', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: 6,
              marginBottom: 8,
            }}
          >
            🔐 Iniciar sesión
          </button>
        )}
        <div style={{ fontSize: 11, color: 'var(--gray-400)', textAlign: 'center' }}>
          ARMAR · Sistema de Obras · {new Date().getFullYear()}
        </div>
      </div>
    </>
  )
}

function Sidebar({ activePage, onNavigate, isOpen, onClose, isDesktop, currentUser, onLoginClick, onLogout }) {
  const authProps = { currentUser, onLoginClick, onLogout }

  /* ── Desktop: fixed sidebar ── */
  if (isDesktop) {
    return (
      <aside style={{
        width: 240, minHeight: '100vh', background: 'white',
        borderRight: '1px solid var(--gray-200)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50,
        boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
      }}>
        <SidebarContent activePage={activePage} onNavigate={onNavigate} {...authProps} />
      </aside>
    )
  }

  /* ── Mobile/Tablet: slide-in drawer ── */
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 49,
          background: 'rgba(0,0,0,0.5)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />
      {/* Drawer */}
      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0,
        width: 270, background: 'white', zIndex: 50,
        display: 'flex', flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
      }}>
        <SidebarContent
          activePage={activePage}
          onNavigate={onNavigate}
          onClose={onClose}
          showClose
          {...authProps}
        />
      </aside>
    </>
  )
}

export default Sidebar
