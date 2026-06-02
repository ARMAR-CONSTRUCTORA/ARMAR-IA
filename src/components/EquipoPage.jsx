const STATUS_COLORS = {
  activa:    { color: '#059669', bg: '#D1FAE5' },
  terminada: { color: '#2563EB', bg: '#DBEAFE' },
  atrasada:  { color: '#DC2626', bg: '#FEE2E2' },
}
const STATUS_LABELS = { activa: 'Activa', terminada: 'Terminada', atrasada: 'Atrasada' }

const AVATAR_PALETTE = [
  '#F97316', '#3B82F6', '#10B981', '#8B5CF6',
  '#EC4899', '#F59E0B', '#14B8A6', '#6366F1',
]

function avatarColor(name) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_PALETTE.length
  return AVATAR_PALETTE[h]
}

function initials(name) {
  const words = name.split(' ').filter(w => w.length > 2)
  return words.slice(-2).map(w => w[0].toUpperCase()).join('').slice(0, 2)
}

function MiniProgressBar({ value }) {
  const color = value === 100 ? '#10B981' : value >= 70 ? '#F97316' : value >= 40 ? '#F59E0B' : '#9CA3AF'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ flex: 1, height: 5, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 30, textAlign: 'right' }}>{value}%</span>
    </div>
  )
}

function EquipoPage({ projects }) {
  const teamMap = {}
  projects.forEach(p => {
    if (!teamMap[p.responsible]) teamMap[p.responsible] = []
    teamMap[p.responsible].push(p)
  })

  const members = Object.entries(teamMap)
    .map(([name, obras]) => ({ name, obras }))
    .sort((a, b) => b.obras.length - a.obras.length)

  const totalPersonas = members.length
  const totalObras = projects.length

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--gray-900)', letterSpacing: '-0.5px', marginBottom: 4 }}>
          Equipo
        </h1>
        <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
          {totalPersonas} {totalPersonas === 1 ? 'persona responsable' : 'personas responsables'} ·{' '}
          {totalObras} obras en total
        </p>
      </div>

      {/* Summary bar */}
      <div style={{
        background: 'white', borderRadius: 14,
        boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
        border: '1px solid var(--gray-200)',
        padding: '18px 24px', marginBottom: 24,
        display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--gray-900)' }}>{totalPersonas}</div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 500 }}>Personas</div>
        </div>
        <div style={{ width: 1, height: 40, background: 'var(--gray-200)' }} />
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--green)' }}>
            {projects.filter(p => p.status === 'activa').length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 500 }}>Obras activas</div>
        </div>
        <div style={{ width: 1, height: 40, background: 'var(--gray-200)' }} />
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--red)' }}>
            {projects.filter(p => p.status === 'atrasada').length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 500 }}>Obras atrasadas</div>
        </div>
        <div style={{ width: 1, height: 40, background: 'var(--gray-200)' }} />
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--orange)' }}>
            {Math.round(projects.reduce((s, p) => s + p.progress, 0) / (totalObras || 1))}%
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 500 }}>Avance promedio</div>
        </div>
      </div>

      {/* Member cards grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
        gap: 20,
      }}>
        {members.map(({ name, obras }) => {
          const activas    = obras.filter(o => o.status === 'activa').length
          const terminadas = obras.filter(o => o.status === 'terminada').length
          const atrasadas  = obras.filter(o => o.status === 'atrasada').length
          const avgProg    = Math.round(obras.reduce((s, o) => s + o.progress, 0) / obras.length)
          const color      = avatarColor(name)
          const ini        = initials(name)

          return (
            <div key={name} style={{
              background: 'white', borderRadius: 14,
              boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
              border: '1px solid var(--gray-200)', overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{ padding: '20px 20px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: color, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, color: 'white', fontSize: 18,
                  flexShrink: 0, letterSpacing: '-0.5px',
                }}>
                  {ini}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: 700, color: 'var(--gray-800)', fontSize: 15,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {name}
                  </div>
                  <div style={{ color: 'var(--gray-400)', fontSize: 12, marginTop: 2 }}>
                    {obras.length} {obras.length === 1 ? 'obra asignada' : 'obras asignadas'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--orange)', lineHeight: 1 }}>
                    {avgProg}%
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 500, marginTop: 2 }}>
                    promedio
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div style={{
                display: 'flex',
                borderTop: '1px solid var(--gray-200)',
                borderBottom: '1px solid var(--gray-200)',
              }}>
                {[
                  { label: 'Activas',    value: activas,    color: '#059669' },
                  { label: 'Terminadas', value: terminadas, color: '#2563EB' },
                  { label: 'Atrasadas',  value: atrasadas,  color: '#DC2626' },
                ].map(({ label, value, color: c }, idx, arr) => (
                  <div key={label} style={{
                    flex: 1, padding: '10px 0', textAlign: 'center',
                    borderRight: idx < arr.length - 1 ? '1px solid var(--gray-200)' : 'none',
                  }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: c }}>{value}</div>
                    <div style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 600, marginTop: 1 }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Obras list */}
              <div style={{ padding: '10px 0' }}>
                {obras.map(o => (
                  <div key={o.id} style={{
                    display: 'flex', alignItems: 'center',
                    padding: '9px 18px', gap: 10,
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: STATUS_COLORS[o.status].color,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, color: 'var(--gray-700)', fontWeight: 600,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {o.name}
                      </div>
                      <MiniProgressBar value={o.progress} />
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, flexShrink: 0, marginLeft: 6,
                      color: STATUS_COLORS[o.status].color,
                      background: STATUS_COLORS[o.status].bg,
                      padding: '2px 9px', borderRadius: 99,
                    }}>
                      {STATUS_LABELS[o.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default EquipoPage
