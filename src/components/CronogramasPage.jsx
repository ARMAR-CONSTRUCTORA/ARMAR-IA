import { useState } from 'react'

const STATUS_COLORS = {
  activa:    { bar: '#F97316', light: '#FED7AA', border: '#FB923C' },
  terminada: { bar: '#3B82F6', light: '#DBEAFE', border: '#60A5FA' },
  atrasada:  { bar: '#EF4444', light: '#FEE2E2', border: '#F87171' },
}
const STATUS_LABELS = { activa: 'Activa', terminada: 'Terminada', atrasada: 'Atrasada' }

function generateMonths(start, end) {
  const months = []
  const cur = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cur <= last) {
    months.push(new Date(cur))
    cur.setMonth(cur.getMonth() + 1)
  }
  return months
}

function CronogramasPage({ projects }) {
  const [filter, setFilter] = useState('todas')

  const filtered = filter === 'todas' ? projects : projects.filter(p => p.status === filter)

  const parseDate = (d) => new Date(d + 'T00:00:00')

  const allProjects = filtered.length > 0 ? filtered : projects
  const minDate = new Date(Math.min(...allProjects.map(p => parseDate(p.startDate))))
  const maxDate = new Date(Math.max(...allProjects.map(p => parseDate(p.endDate))))
  minDate.setDate(1)
  maxDate.setMonth(maxDate.getMonth() + 1, 0)

  const totalMs = maxDate - minDate
  const months = generateMonths(minDate, maxDate)
  const today = new Date()
  const todayPct = Math.max(0, Math.min(100, ((today - minDate) / totalMs) * 100))

  const getLeft = (d) => Math.max(0, ((parseDate(d) - minDate) / totalMs) * 100)
  const getWidth = (s, e) => Math.max(0.5, ((parseDate(e) - parseDate(s)) / totalMs) * 100)
  const getMonthLeft = (m) => ((m - minDate) / totalMs) * 100

  const fmtMonth = (d) => d.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })
  const fmtDate = (d) => parseDate(d).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })

  const LABEL_WIDTH = 220

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 28, flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--gray-900)', letterSpacing: '-0.5px', marginBottom: 4 }}>
            Cronogramas
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
            Línea de tiempo · {filtered.length} {filtered.length === 1 ? 'obra' : 'obras'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['todas', 'activa', 'terminada', 'atrasada'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '7px 16px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                border: filter === f ? 'none' : '1px solid var(--gray-200)',
                background: filter === f ? 'var(--orange)' : 'white',
                color: filter === f ? 'white' : 'var(--gray-600)',
                boxShadow: filter === f ? '0 2px 8px rgba(249,115,22,0.35)' : '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              {f === 'todas' ? 'Todas' : STATUS_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Gantt card */}
      <div style={{
        background: 'white', borderRadius: 14,
        boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
        border: '1px solid var(--gray-200)', overflow: 'hidden',
      }}>
        {filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
            No hay obras para este filtro
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 800 }}>

              {/* Month header */}
              <div style={{
                display: 'flex', background: 'var(--gray-100)',
                borderBottom: '2px solid var(--gray-200)',
                height: 38,
              }}>
                {/* Label column header */}
                <div style={{
                  width: LABEL_WIDTH, minWidth: LABEL_WIDTH,
                  borderRight: '2px solid var(--gray-200)',
                  display: 'flex', alignItems: 'center',
                  padding: '0 16px', fontSize: 11, fontWeight: 700,
                  color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.07em',
                }}>
                  Obra
                </div>
                {/* Timeline header */}
                <div style={{ flex: 1, position: 'relative' }}>
                  {months.map((m, i) => {
                    const left = getMonthLeft(m)
                    if (left < 0 || left > 100) return null
                    return (
                      <div key={i} style={{
                        position: 'absolute', left: `${left}%`, top: 0, bottom: 0,
                        borderLeft: '1px solid var(--gray-200)',
                        display: 'flex', alignItems: 'center', paddingLeft: 7,
                        fontSize: 11, fontWeight: 700, color: 'var(--gray-500)',
                        textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap',
                      }}>
                        {fmtMonth(m)}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Project rows */}
              {filtered.map((p, i) => {
                const c = STATUS_COLORS[p.status]
                const left = getLeft(p.startDate)
                const width = getWidth(p.startDate, p.endDate)
                return (
                  <div key={p.id} style={{
                    display: 'flex',
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--gray-200)' : 'none',
                    background: i % 2 === 0 ? 'white' : '#FAFAFA',
                    minHeight: 62,
                  }}>
                    {/* Label */}
                    <div style={{
                      width: LABEL_WIDTH, minWidth: LABEL_WIDTH,
                      padding: '12px 16px',
                      borderRight: '2px solid var(--gray-200)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'center',
                    }}>
                      <div style={{
                        fontWeight: 700, color: 'var(--gray-800)', fontSize: 13,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {p.name}
                      </div>
                      <div style={{ color: 'var(--gray-400)', fontSize: 11, marginTop: 3 }}>
                        {p.responsible}
                      </div>
                      <div style={{ color: 'var(--gray-400)', fontSize: 10, marginTop: 2 }}>
                        {fmtDate(p.startDate)} → {fmtDate(p.endDate)}
                      </div>
                    </div>

                    {/* Bar area */}
                    <div style={{ flex: 1, position: 'relative', height: 62 }}>
                      {/* Month grid lines */}
                      {months.map((m, mi) => {
                        const ml = getMonthLeft(m)
                        if (ml <= 0 || ml >= 100) return null
                        return (
                          <div key={mi} style={{
                            position: 'absolute', left: `${ml}%`, top: 0, bottom: 0,
                            borderLeft: '1px dashed #E5E7EB', zIndex: 0,
                          }} />
                        )
                      })}

                      {/* Today line */}
                      {todayPct > 0 && todayPct < 100 && (
                        <div style={{
                          position: 'absolute', left: `${todayPct}%`,
                          top: 0, bottom: 0, zIndex: 3,
                          borderLeft: '2px solid var(--orange)',
                        }}>
                          <div style={{
                            position: 'absolute', top: 4, left: 4,
                            background: 'var(--orange)', color: 'white',
                            fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                            whiteSpace: 'nowrap',
                          }}>HOY</div>
                        </div>
                      )}

                      {/* Bar */}
                      <div style={{
                        position: 'absolute', zIndex: 2,
                        left: `${left}%`, width: `${width}%`,
                        top: '50%', transform: 'translateY(-50%)',
                        height: 32, borderRadius: 7,
                        background: c.light,
                        border: `1.5px solid ${c.border}`,
                        overflow: 'hidden',
                      }}>
                        {/* Progress fill */}
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0,
                          width: `${p.progress}%`,
                          background: c.bar, opacity: 0.9,
                          borderRadius: '6px 0 0 6px',
                        }} />
                        {/* Text */}
                        <div style={{
                          position: 'absolute', inset: 0, zIndex: 1,
                          display: 'flex', alignItems: 'center', paddingLeft: 10,
                          fontSize: 11, fontWeight: 700, color: 'white',
                          textShadow: '0 1px 3px rgba(0,0,0,0.4)',
                          whiteSpace: 'nowrap',
                        }}>
                          {p.progress}%
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div style={{
          padding: '12px 24px', borderTop: '1px solid var(--gray-200)',
          display: 'flex', gap: 20, alignItems: 'center',
          background: 'var(--gray-100)', flexWrap: 'wrap',
        }}>
          {Object.entries(STATUS_COLORS).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 14, height: 10, borderRadius: 3, background: val.bar }} />
              <span style={{ fontSize: 12, color: 'var(--gray-600)', fontWeight: 500 }}>
                {STATUS_LABELS[key]}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 2, height: 14, background: 'var(--orange)', borderRadius: 1 }} />
            <span style={{ fontSize: 12, color: 'var(--gray-600)', fontWeight: 500 }}>Hoy</span>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--gray-400)' }}>
            La barra rellena indica el % de avance
          </div>
        </div>
      </div>
    </div>
  )
}

export default CronogramasPage
