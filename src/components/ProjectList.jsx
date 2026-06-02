import { useState } from 'react'
import { useBreakpoint } from '../hooks/useBreakpoint'

const STATUS = {
  activa:    { label: 'Activa',    color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
  terminada: { label: 'Terminada', color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD' },
  atrasada:  { label: 'Atrasada',  color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
}

function ProgressBar({ value }) {
  const color = value === 100 ? '#10B981' : value >= 70 ? '#F97316' : value >= 40 ? '#F59E0B' : '#9CA3AF'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 7, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden', minWidth: 60 }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 34, textAlign: 'right' }}>{value}%</span>
    </div>
  )
}

/* Mobile card view for a single project */
function ProjectCard({ p, onEdit, onDelete }) {
  const s = STATUS[p.status]
  const formatDate = (d) =>
    new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div style={{
      background: 'white', borderRadius: 12,
      border: '1px solid var(--gray-200)',
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      padding: '16px',
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
          <div style={{ fontWeight: 700, color: 'var(--gray-800)', fontSize: 14, marginBottom: 3 }}>
            {p.name}
          </div>
          <div style={{ color: 'var(--gray-500)', fontSize: 12 }}>📍 {p.location}</div>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99,
          color: s.color, background: s.bg, border: `1px solid ${s.border}`,
          flexShrink: 0,
        }}>
          {s.label}
        </span>
      </div>

      <div style={{ marginBottom: 10 }}>
        <ProgressBar value={p.progress} />
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6,
        fontSize: 12, color: 'var(--gray-500)', marginBottom: 12,
      }}>
        <div><span style={{ fontWeight: 600 }}>Inicio:</span> {formatDate(p.startDate)}</div>
        <div><span style={{ fontWeight: 600 }}>Término:</span> {formatDate(p.endDate)}</div>
        <div style={{ gridColumn: '1 / -1' }}>
          <span style={{ fontWeight: 600 }}>Responsable:</span> {p.responsible}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onEdit(p)}
          style={{
            flex: 1, padding: '8px', borderRadius: 7,
            border: '1px solid var(--gray-200)', background: 'white',
            color: 'var(--gray-700)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          Editar
        </button>
        <button
          onClick={() => onDelete(p.id)}
          style={{
            flex: 1, padding: '8px', borderRadius: 7,
            border: '1px solid #FECACA', background: '#FFF5F5',
            color: 'var(--red)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            fontFamily: 'inherit',
          }}
        >
          Eliminar
        </button>
      </div>
    </div>
  )
}

function ProjectList({ projects, onAdd, onEdit, onDelete }) {
  const { isMobile } = useBreakpoint()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todas')

  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    return (
      (p.name.toLowerCase().includes(q) ||
       p.location.toLowerCase().includes(q) ||
       p.responsible.toLowerCase().includes(q)) &&
      (filter === 'todas' || p.status === filter)
    )
  })

  const formatDate = (d) =>
    new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, color: 'var(--gray-900)', letterSpacing: '-0.5px', marginBottom: 4 }}>
          Obras
        </h1>
        <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
          {filtered.length} {filtered.length === 1 ? 'obra encontrada' : 'obras encontradas'}
        </p>
      </div>

      <div style={{
        background: 'white', borderRadius: 14,
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        border: '1px solid var(--gray-200)',
        overflow: 'hidden',
      }}>
        {/* Toolbar */}
        <div style={{
          padding: isMobile ? '14px 16px' : '16px 24px',
          borderBottom: '1px solid var(--gray-200)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* Top row: title + add button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-800)' }}>Lista de Obras</span>
              <span style={{
                background: 'var(--gray-100)', color: 'var(--gray-500)',
                borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 700,
              }}>
                {filtered.length}
              </span>
            </div>
            <button
              onClick={onAdd}
              style={{
                background: 'var(--orange)', color: 'white', border: 'none',
                borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                boxShadow: '0 2px 6px rgba(249,115,22,0.4)', whiteSpace: 'nowrap',
                fontFamily: 'inherit',
              }}
            >
              + Nueva Obra
            </button>
          </div>
          {/* Search + filter */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Buscar obra, ubicación…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, minWidth: 160, padding: '8px 12px',
                borderRadius: 8, border: '1px solid var(--gray-200)',
                fontSize: 13, color: 'var(--gray-700)', background: 'var(--gray-100)',
              }}
            />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{
                padding: '8px 12px', borderRadius: 8, border: '1px solid var(--gray-200)',
                fontSize: 13, color: 'var(--gray-700)', background: 'var(--gray-100)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <option value="todas">Todos</option>
              <option value="activa">Activas</option>
              <option value="terminada">Terminadas</option>
              <option value="atrasada">Atrasadas</option>
            </select>
          </div>
        </div>

        {/* Mobile: card list */}
        {isMobile ? (
          <div style={{ padding: filtered.length ? '16px' : 0 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--gray-400)' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🏗️</div>
                <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-500)' }}>No se encontraron obras</p>
              </div>
            ) : filtered.map(p => (
              <ProjectCard key={p.id} p={p} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        ) : (
          /* Desktop/tablet: table */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
              <thead>
                <tr style={{ background: 'var(--gray-100)' }}>
                  {['Nombre de Obra', 'Ubicación', 'Inicio', 'Término Est.', 'Avance', 'Responsable', 'Estado', 'Acciones'].map(h => (
                    <th key={h} style={{
                      padding: '11px 16px', textAlign: 'left', fontSize: 11,
                      fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase',
                      letterSpacing: '0.06em', whiteSpace: 'nowrap',
                      borderBottom: '1px solid var(--gray-200)',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
                      No se encontraron obras
                    </td>
                  </tr>
                ) : filtered.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: i < filtered.length - 1 ? '1px solid var(--gray-200)' : 'none',
                      background: i % 2 === 0 ? 'white' : '#FAFAFA',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FFF7ED'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#FAFAFA'}
                  >
                    <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--gray-800)', fontSize: 14 }}>
                      {p.name}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--gray-600)', fontSize: 13 }}>
                      📍 {p.location}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--gray-500)', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {formatDate(p.startDate)}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--gray-500)', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {formatDate(p.endDate)}
                    </td>
                    <td style={{ padding: '14px 16px', minWidth: 140 }}>
                      <ProgressBar value={p.progress} />
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--gray-600)', fontSize: 13, whiteSpace: 'nowrap' }}>
                      {p.responsible}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700,
                        color: STATUS[p.status].color, background: STATUS[p.status].bg,
                        border: `1px solid ${STATUS[p.status].border}`, whiteSpace: 'nowrap',
                      }}>
                        {STATUS[p.status].label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => onEdit(p)}
                          style={{
                            padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            border: '1px solid var(--gray-200)', background: 'white',
                            color: 'var(--gray-700)', cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => onDelete(p.id)}
                          style={{
                            padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            border: '1px solid #FECACA', background: '#FFF5F5',
                            color: 'var(--red)', cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProjectList
