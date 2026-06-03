import { useState } from 'react'
import { useBreakpoint } from '../hooks/useBreakpoint'
import CronogramaTab from './CronogramaTab'

// ── Constantes de estado ──────────────────────────────────────────────────────
const STATUS = {
  activa:    { label: 'Activa',    color: '#059669', bg: '#D1FAE5', border: '#6EE7B7' },
  terminada: { label: 'Terminada', color: '#2563EB', bg: '#DBEAFE', border: '#93C5FD' },
  atrasada:  { label: 'Atrasada',  color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtShort(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}
function initials(name) {
  if (!name) return '?'
  return name.replace(/^(Ing\.|Arq\.)\s*/i, '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function progressColor(v) {
  return v === 100 ? '#10B981' : v >= 70 ? '#F97316' : v >= 40 ? '#F59E0B' : '#9CA3AF'
}

// ── Componentes pequeños ──────────────────────────────────────────────────────
function ProgressBar({ value, height = 7 }) {
  const color = progressColor(value)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden', minWidth: 50 }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.3s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 32, textAlign: 'right' }}>{value}%</span>
    </div>
  )
}

function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.activa
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700,
      color: s.color, background: s.bg, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap',
    }}>
      {s.label}
    </span>
  )
}

function Avatar({ name }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%',
      background: 'linear-gradient(135deg, #F97316, #EA580C)',
      color: 'white', fontSize: 12, fontWeight: 800,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, boxShadow: '0 2px 6px rgba(249,115,22,0.4)',
    }}>
      {initials(name)}
    </div>
  )
}

// ── Fila expandible ───────────────────────────────────────────────────────────
function ProjectRow({ p, cronograma, onEdit, onDelete, onUpdateTasks, onCreateCronograma, onSaveCronograma, onCargarAvance, onDeleteCronograma, onEditarInforme, isDesktop }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{
      borderBottom: '1px solid var(--gray-200)',
      background: open ? '#FFFBF7' : 'white',
      transition: 'background 0.15s',
    }}>
      {/* ── Fila principal (clickeable) ── */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: isDesktop ? 16 : 12,
          padding: isDesktop ? '14px 20px' : '14px 16px',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = '#FFF7ED' }}
        onMouseLeave={e => { e.currentTarget.style.background = open ? '#FFFBF7' : 'white' }}
      >
        {/* Chevron */}
        <div style={{
          fontSize: 12, color: 'var(--gray-400)', transition: 'transform 0.2s',
          transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
          flexShrink: 0, width: 14,
        }}>▶</div>

        {/* Nombre + ubicación */}
        <div style={{ flex: isDesktop ? '0 0 220px' : 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {p.name}
          </div>
          {p.location && (
            <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ opacity: 0.5 }}>📍</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.location}</span>
            </div>
          )}
        </div>

        {/* Período — solo desktop */}
        {isDesktop && (
          <div style={{ flex: '0 0 160px', fontSize: 11, color: 'var(--gray-500)' }}>
            <div>{fmtShort(p.startDate)}</div>
            <div style={{ color: 'var(--gray-400)' }}>→ {fmtShort(p.endDate)}</div>
          </div>
        )}

        {/* Barra avance */}
        <div style={{ flex: isDesktop ? '0 0 160px' : '0 0 120px', minWidth: 80 }}>
          <ProgressBar value={p.progress} />
        </div>

        {/* Avatar + responsable — solo desktop */}
        {isDesktop && (
          <div style={{ flex: '0 0 180px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name={p.responsible} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--gray-700)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {p.responsible || '—'}
              </div>
              {p.contratista && (
                <div style={{ fontSize: 10, color: 'var(--gray-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.contratista}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Badge estado */}
        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <StatusBadge status={p.status} />
        </div>
      </div>

      {/* ── Panel expandido ── */}
      {open && (
        <div style={{
          borderTop: '1px solid #FED7AA',
          background: '#FFFBF7',
          padding: isDesktop ? '20px 28px 24px' : '16px 16px 20px',
        }}>
          {/* Responsable en mobile */}
          {!isDesktop && p.responsible && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Avatar name={p.responsible} />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-700)' }}>{p.responsible}</div>
                {p.contratista && <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{p.contratista}</div>}
              </div>
              <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--gray-400)' }}>
                {fmtShort(p.startDate)} → {fmtShort(p.endDate)}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(p) }}
              style={{
                padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                border: '1px solid var(--gray-200)', background: 'white',
                color: 'var(--gray-700)', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ✏️ Editar
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(p.id) }}
              style={{
                padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                border: '1px solid #FECACA', background: '#FFF5F5',
                color: 'var(--red)', cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              🗑 Eliminar
            </button>
          </div>

          {/* Cronograma */}
          <CronogramaTab
            project={p}
            cronogramas={cronograma || []}
            onCreateCronograma={onCreateCronograma}
            onSaveCronograma={onSaveCronograma}
            onCargarAvance={onCargarAvance}
            onDeleteCronograma={onDeleteCronograma}
            onEditarInforme={onEditarInforme}
          />
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ProjectList({ projects, cronogramas, onAdd, onEdit, onDelete, onUpdateTasks, onCreateCronograma, onSaveCronograma, onCargarAvance, onDeleteCronograma, onEditarInforme }) {
  const { isMobile, isDesktop } = useBreakpoint()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('todas')

  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    return (
      (p.name?.toLowerCase().includes(q) ||
       p.location?.toLowerCase().includes(q) ||
       p.responsible?.toLowerCase().includes(q) ||
       p.contratista?.toLowerCase().includes(q) ||
       p.proyecto?.toLowerCase().includes(q)) &&
      (filter === 'todas' || p.status === filter)
    )
  })

  return (
    <div>
      {/* Encabezado */}
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
        border: '1px solid var(--gray-200)', overflow: 'hidden',
      }}>
        {/* Barra de herramientas */}
        <div style={{
          padding: isMobile ? '14px 16px' : '16px 20px',
          borderBottom: '1px solid var(--gray-200)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
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
                cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
                boxShadow: '0 2px 6px rgba(249,115,22,0.4)',
              }}
            >
              + Nueva Obra
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Buscar por nombre, ubicación, responsable…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                flex: 1, minWidth: 180, padding: '8px 12px',
                borderRadius: 8, border: '1px solid var(--gray-200)',
                fontSize: 13, color: 'var(--gray-700)', background: 'var(--gray-100)',
                fontFamily: 'inherit',
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
              <option value="todas">Todos los estados</option>
              <option value="activa">Activas</option>
              <option value="terminada">Terminadas</option>
              <option value="atrasada">Atrasadas</option>
            </select>
          </div>
        </div>

        {/* Cabecera de columnas (desktop) */}
        {isDesktop && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16,
            padding: '9px 20px',
            background: 'var(--gray-100)',
            borderBottom: '1px solid var(--gray-200)',
          }}>
            <div style={{ width: 14 }} />
            <div style={{ flex: '0 0 220px', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nombre de obra</div>
            <div style={{ flex: '0 0 160px', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Período</div>
            <div style={{ flex: '0 0 160px', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Avance</div>
            <div style={{ flex: '0 0 180px', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Responsable</div>
            <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estado</div>
          </div>
        )}

        {/* Lista de filas */}
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--gray-400)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏗️</div>
            <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-500)' }}>No se encontraron obras</p>
          </div>
        ) : filtered.map(p => (
          <ProjectRow
            key={p.id}
            p={p}
            cronograma={cronogramas?.[p.id] || []}
            onEdit={onEdit}
            onDelete={onDelete}
            onUpdateTasks={onUpdateTasks}
            onCreateCronograma={onCreateCronograma}
            onSaveCronograma={onSaveCronograma}
            onCargarAvance={onCargarAvance}
            onDeleteCronograma={onDeleteCronograma}
            onEditarInforme={onEditarInforme}
            isDesktop={isDesktop}
          />
        ))}
      </div>
    </div>
  )
}
