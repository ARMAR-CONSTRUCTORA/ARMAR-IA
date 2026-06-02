const STATUS = {
  activa:    { label: 'Activa',    color: '#059669', bg: '#D1FAE5' },
  terminada: { label: 'Terminada', color: '#2563EB', bg: '#DBEAFE' },
  atrasada:  { label: 'Atrasada',  color: '#DC2626', bg: '#FEE2E2' },
}

function KPICard({ label, value, icon, valueColor, bg, border }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 14,
      padding: '20px 22px',
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
      border: `1px solid ${border || 'var(--gray-200)'}`,
    }}>
      <div style={{
        width: 50, height: 50, borderRadius: 12,
        background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{
          fontSize: 30, fontWeight: 900, color: valueColor,
          lineHeight: 1, letterSpacing: '-1px',
        }}>
          {value}
        </div>
        <div style={{ color: 'var(--gray-500)', fontSize: 13, fontWeight: 500, marginTop: 5 }}>
          {label}
        </div>
      </div>
    </div>
  )
}

function MiniBar({ value }) {
  const color = value === 100 ? '#10B981' : value >= 70 ? '#F97316' : value >= 40 ? '#F59E0B' : '#9CA3AF'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        flex: 1, height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden',
      }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 34, textAlign: 'right' }}>
        {value}%
      </span>
    </div>
  )
}

function Dashboard({ projects, onAdd, onNavigateToObras }) {
  const total      = projects.length
  const activas    = projects.filter(p => p.status === 'activa').length
  const terminadas = projects.filter(p => p.status === 'terminada').length
  const atrasadas  = projects.filter(p => p.status === 'atrasada').length
  const avgProgress = total > 0
    ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / total)
    : 0

  const activasList   = projects.filter(p => p.status === 'activa').slice(0, 5)
  const atrasadasList = projects.filter(p => p.status === 'atrasada')

  const formatDate = (d) =>
    new Date(d + 'T00:00:00').toLocaleDateString('es-CL', {
      day: '2-digit', month: 'short', year: 'numeric',
    })

  const today = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1)

  return (
    <div>
      {/* Greeting header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 32,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <h1 style={{
            fontSize: 30, fontWeight: 900, color: 'var(--gray-900)',
            letterSpacing: '-0.5px', marginBottom: 6,
          }}>
            Bienvenido 👋
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
            {todayCapitalized} · Panel de control de obras
          </p>
        </div>
        <button
          onClick={onAdd}
          style={{
            background: 'var(--orange)', color: 'white',
            border: 'none', borderRadius: 9,
            padding: '11px 22px', fontSize: 14, fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 3px 10px rgba(249,115,22,0.4)',
          }}
        >
          + Nueva Obra
        </button>
      </div>

      {/* KPI row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 28,
      }}>
        <KPICard label="Total de Obras"   value={total}      icon="🏗️" valueColor="var(--gray-800)" bg="var(--gray-100)"  border="var(--gray-200)" />
        <KPICard label="Obras Activas"    value={activas}    icon="🔨" valueColor="#059669"         bg="#D1FAE5"          border="#6EE7B7" />
        <KPICard label="Obras Terminadas" value={terminadas} icon="✅" valueColor="#2563EB"         bg="#DBEAFE"          border="#93C5FD" />
        <KPICard label="Obras Atrasadas"  value={atrasadas}  icon="⚠️" valueColor="#DC2626"         bg="#FEE2E2"          border="#FCA5A5" />
      </div>

      {/* Two-column content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

        {/* LEFT: Active projects */}
        <div style={{
          background: 'white', borderRadius: 14,
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
          border: '1px solid var(--gray-200)', overflow: 'hidden',
        }}>
          <div style={{
            padding: '18px 22px', borderBottom: '1px solid var(--gray-200)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-800)' }}>
                Obras Activas
              </h2>
              <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
                Avance de obras en ejecución
              </p>
            </div>
            <button
              onClick={onNavigateToObras}
              style={{
                background: 'none', border: '1px solid var(--gray-200)',
                borderRadius: 7, padding: '6px 14px',
                color: 'var(--gray-600)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Ver todas →
            </button>
          </div>

          {activasList.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
              No hay obras activas registradas
            </div>
          ) : activasList.map((p, i) => (
            <div
              key={p.id}
              style={{
                padding: '18px 22px',
                borderBottom: i < activasList.length - 1 ? '1px solid var(--gray-200)' : 'none',
              }}
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'flex-start', marginBottom: 10,
              }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                  <div style={{
                    fontWeight: 700, color: 'var(--gray-800)', fontSize: 14,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {p.name}
                  </div>
                  <div style={{ color: 'var(--gray-400)', fontSize: 12, marginTop: 3 }}>
                    📍 {p.location} · {p.responsible}
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                  color: STATUS[p.status].color, background: STATUS[p.status].bg,
                  flexShrink: 0,
                }}>
                  {STATUS[p.status].label}
                </span>
              </div>
              <MiniBar value={p.progress} />
              <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 6 }}>
                Término estimado: {formatDate(p.endDate)}
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Avance promedio hero card */}
          <div style={{
            background: 'var(--orange)',
            borderRadius: 14,
            padding: '24px 24px',
            color: 'white',
            boxShadow: '0 4px 20px rgba(249,115,22,0.4)',
          }}>
            <p style={{ fontSize: 13, fontWeight: 600, opacity: 0.85, marginBottom: 8 }}>
              Avance Promedio General
            </p>
            <div style={{
              fontSize: 52, fontWeight: 900,
              letterSpacing: '-2px', lineHeight: 1,
            }}>
              {avgProgress}%
            </div>
            <div style={{
              marginTop: 18, height: 8,
              background: 'rgba(255,255,255,0.25)',
              borderRadius: 99, overflow: 'hidden',
            }}>
              <div style={{
                width: `${avgProgress}%`, height: '100%',
                background: 'white', borderRadius: 99,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <p style={{ fontSize: 11, opacity: 0.7, marginTop: 10 }}>
              Basado en {total} obras registradas
            </p>
          </div>

          {/* Estado breakdown */}
          <div style={{
            background: 'white', borderRadius: 14,
            boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
            border: '1px solid var(--gray-200)',
            padding: '20px 22px',
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 18 }}>
              Distribución por Estado
            </h3>
            {[
              { label: 'Activas',    count: activas,    color: '#10B981', bg: '#D1FAE5' },
              { label: 'Terminadas', count: terminadas, color: '#3B82F6', bg: '#DBEAFE' },
              { label: 'Atrasadas',  count: atrasadas,  color: '#EF4444', bg: '#FEE2E2' },
            ].map(({ label, count, color, bg }) => (
              <div key={label} style={{ marginBottom: 16 }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 7,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: 13, color: 'var(--gray-600)', fontWeight: 500 }}>
                      {label}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color,
                    background: bg, padding: '2px 9px', borderRadius: 99,
                  }}>
                    {count}
                  </span>
                </div>
                <div style={{ height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    width: total > 0 ? `${(count / total) * 100}%` : '0%',
                    height: '100%', background: color, borderRadius: 99,
                    transition: 'width 0.4s ease',
                  }} />
                </div>
              </div>
            ))}
          </div>

          {/* Atrasadas alert */}
          {atrasadasList.length > 0 && (
            <div style={{
              background: 'white', borderRadius: 14,
              boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
              border: '1px solid #FECACA',
              padding: '20px 22px',
            }}>
              <h3 style={{
                fontSize: 14, fontWeight: 700, color: '#DC2626', marginBottom: 14,
              }}>
                ⚠️ Atrasadas ({atrasadasList.length})
              </h3>
              {atrasadasList.map((p, i) => (
                <div key={p.id} style={{
                  paddingBottom: i < atrasadasList.length - 1 ? 10 : 0,
                  marginBottom: i < atrasadasList.length - 1 ? 10 : 0,
                  borderBottom: i < atrasadasList.length - 1 ? '1px solid #FEE2E2' : 'none',
                }}>
                  <div style={{ fontWeight: 600, color: 'var(--gray-700)', fontSize: 13 }}>
                    {p.name}
                  </div>
                  <div style={{ color: 'var(--gray-400)', fontSize: 11, marginTop: 2 }}>
                    {p.responsible} · {p.progress}% completado
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
