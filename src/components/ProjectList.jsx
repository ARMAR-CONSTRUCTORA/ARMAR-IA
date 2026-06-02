import { useState } from 'react'

const STATUS = {
  activa:    { label: 'Activa',     color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
  terminada: { label: 'Terminada',  color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD' },
  atrasada:  { label: 'Atrasada',   color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
}

function ProgressBar({ value }) {
  const color =
    value === 100 ? '#10B981' :
    value >= 70   ? '#F97316' :
    value >= 40   ? '#F59E0B' : '#9CA3AF'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        flex: 1,
        height: 7,
        background: '#E5E7EB',
        borderRadius: 99,
        overflow: 'hidden',
        minWidth: 80,
      }}>
        <div style={{
          width: `${value}%`,
          height: '100%',
          background: color,
          borderRadius: 99,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{
        fontSize: 13,
        fontWeight: 700,
        color,
        minWidth: 38,
        textAlign: 'right',
      }}>
        {value}%
      </span>
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <tr>
      <td colSpan={8}>
        <div style={{
          padding: '56px 24px',
          textAlign: 'center',
          color: 'var(--gray-400)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏗️</div>
          <p style={{ fontWeight: 600, fontSize: 16, color: 'var(--gray-500)', marginBottom: 6 }}>
            No se encontraron obras
          </p>
          <p style={{ fontSize: 13 }}>
            Prueba con otros filtros o{' '}
            <button
              onClick={onAdd}
              style={{
                background: 'none', border: 'none', color: 'var(--orange)',
                cursor: 'pointer', fontWeight: 600, fontSize: 13, padding: 0,
              }}
            >
              agrega una nueva obra
            </button>
          </p>
        </div>
      </td>
    </tr>
  )
}

function ProjectList({ projects, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todas')

  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    const matchSearch =
      p.name.toLowerCase().includes(q) ||
      p.location.toLowerCase().includes(q) ||
      p.responsible.toLowerCase().includes(q)
    const matchFilter = filter === 'todas' || p.status === filter
    return matchSearch && matchFilter
  })

  const formatDate = (d) =>
    new Date(d + 'T00:00:00').toLocaleDateString('es-CL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

  const btnBase = {
    padding: '6px 14px',
    borderRadius: 7,
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: 14,
      boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
      border: '1px solid var(--gray-200)',
      overflow: 'hidden',
    }}>
      {/* Toolbar */}
      <div style={{
        padding: '18px 24px',
        borderBottom: '1px solid var(--gray-200)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        background: 'white',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: 'var(--gray-800)' }}>
            Lista de Obras
          </h2>
          <span style={{
            background: 'var(--gray-100)',
            color: 'var(--gray-500)',
            borderRadius: 99,
            padding: '2px 10px',
            fontSize: 13,
            fontWeight: 600,
          }}>
            {filtered.length}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--gray-400)', fontSize: 15, pointerEvents: 'none',
            }}>🔍</span>
            <input
              type="text"
              placeholder="Buscar obra, ubicación, responsable…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: '8px 12px 8px 34px',
                borderRadius: 8,
                border: '1px solid var(--gray-200)',
                fontSize: 13,
                color: 'var(--gray-700)',
                width: 280,
                background: 'var(--gray-100)',
              }}
            />
          </div>

          <select
            value={filter}
            onChange={e => setFilter(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--gray-200)',
              fontSize: 13,
              color: 'var(--gray-700)',
              background: 'var(--gray-100)',
              cursor: 'pointer',
            }}
          >
            <option value="todas">Todos los estados</option>
            <option value="activa">Activas</option>
            <option value="terminada">Terminadas</option>
            <option value="atrasada">Atrasadas</option>
          </select>

          <button
            onClick={onAdd}
            style={{
              background: 'var(--orange)',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 2px 6px rgba(249,115,22,0.4)',
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
            Nueva Obra
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ background: 'var(--gray-100)' }}>
              {['Nombre de Obra', 'Ubicación', 'Inicio', 'Término Est.', 'Avance', 'Responsable', 'Estado', 'Acciones'].map(h => (
                <th key={h} style={{
                  padding: '11px 16px',
                  textAlign: 'left',
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--gray-500)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  whiteSpace: 'nowrap',
                  borderBottom: '1px solid var(--gray-200)',
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <EmptyState onAdd={onAdd} />
            ) : (
              filtered.map((p, i) => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--gray-200)' : 'none',
                    background: i % 2 === 0 ? 'white' : '#FAFAFA',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FFF7ED'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'white' : '#FAFAFA'}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{
                      fontWeight: 700,
                      color: 'var(--gray-900)',
                      fontSize: 14,
                    }}>
                      {p.name}
                    </div>
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
                  <td style={{ padding: '14px 16px', minWidth: 160 }}>
                    <ProgressBar value={p.progress} />
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--gray-600)', fontSize: 13, whiteSpace: 'nowrap' }}>
                    {p.responsible}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 99,
                      fontSize: 12,
                      fontWeight: 700,
                      color: STATUS[p.status].color,
                      background: STATUS[p.status].bg,
                      border: `1px solid ${STATUS[p.status].border}`,
                      whiteSpace: 'nowrap',
                    }}>
                      {STATUS[p.status].label}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => onEdit(p)}
                        style={{
                          ...btnBase,
                          border: '1px solid var(--gray-200)',
                          background: 'white',
                          color: 'var(--gray-700)',
                        }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onDelete(p.id)}
                        style={{
                          ...btnBase,
                          border: '1px solid #FECACA',
                          background: '#FFF5F5',
                          color: 'var(--red)',
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ProjectList
