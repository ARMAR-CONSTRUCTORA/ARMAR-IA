import { useState, useRef, useEffect, useMemo } from 'react'
import { calcAvanceEtapa, calcAvanceGeneral, estadoFromAvance } from '../data/cronogramaTemplates'
import { calcDuracionHabil, computeCascade } from '../utils/calendarUtils'
import ModalCrearCronograma from './ModalCrearCronograma'
import ModalCargarAvance from './ModalCargarAvance'
import ModalEditarEtapa from './ModalEditarEtapa'

// ── Constantes ────────────────────────────────────────────────────────────────
const ESTADO_STYLE = {
  'Pendiente':   { color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' },
  'En curso':    { color: '#F97316', bg: '#FFF7ED', border: '#FED7AA' },
  'Finalizada':  { color: '#10B981', bg: '#D1FAE5', border: '#6EE7B7' },
  'Con desvíos': { color: '#DC2626', bg: '#FEE2E2', border: '#FCA5A5' },
  'Pausada':     { color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
}

const PPD_LEVELS = [
  { val: 0.65, label: 'Trimestral' },
  { val: 2.6,  label: 'Mensual'    },
  { val: 5.5,  label: 'Semanal'    },
  { val: 12,   label: 'Diario'     },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtShort(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}
function fmtLong(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}
function progressColor(v) {
  return v === 100 ? '#10B981' : v >= 70 ? '#F97316' : v >= 40 ? '#F59E0B' : '#9CA3AF'
}
function toDate(s) { return new Date(s + 'T00:00:00') }
function generateMonths(start, end) {
  const months = [], cur = new Date(start.getFullYear(), start.getMonth(), 1)
  const last   = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cur <= last) { months.push(new Date(cur)); cur.setMonth(cur.getMonth() + 1) }
  return months
}
function diffCalDias(a, b) {
  if (!a || !b) return 0
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000)
}

// ── Donut SVG ─────────────────────────────────────────────────────────────────
function DonutChart({ value, size = 110 }) {
  const r = 36, c = 2 * Math.PI * r
  const filled = (value / 100) * c
  const color  = progressColor(value)
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="#E5E7EB" strokeWidth="14" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="14"
        strokeDasharray={`${filled} ${c - filled}`} strokeLinecap="round"
        transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
      <text x="50" y="45" textAnchor="middle" fontSize="20" fontWeight="800" fill={color}>{value}%</text>
      <text x="50" y="60" textAnchor="middle" fontSize="9" fill="#9CA3AF" fontWeight="600">AVANCE</text>
    </svg>
  )
}

function EstadoBadge({ estado }) {
  const s = ESTADO_STYLE[estado] || ESTADO_STYLE['Pendiente']
  return (
    <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, color: s.color, background: s.bg, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {estado}
    </span>
  )
}

function ProgressCell({ value }) {
  const color = progressColor(value)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden', minWidth: 40 }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color, minWidth: 24 }}>{value}%</span>
    </div>
  )
}

// ── Panel de estadísticas ─────────────────────────────────────────────────────
function StatsPanel({ tareas, avanceGeneral, informes }) {
  const total       = tareas.length
  const finalizadas = tareas.filter(t => t.avanceActual === 100).length
  const criticas    = tareas.filter(t => t.esCritica).length
  const today       = new Date()
  const proximoHito = tareas.filter(t => t.parentId === null && t.avanceActual < 100).sort((a, b) => new Date(a.fechaFin) - new Date(b.fechaFin))[0]
  const ultimoInforme = informes?.length > 0 ? informes[informes.length - 1] : null

  return (
    <div style={{ width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: 12, padding: '16px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <DonutChart value={avanceGeneral} />
        <div style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 600, marginTop: 6 }}>Avance general</div>
      </div>
      <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Completadas', value: `${finalizadas}/${total}`, color: '#10B981' },
            { label: 'Críticas',    value: criticas,                  color: '#DC2626' },
            { label: 'Informes',    value: (informes || []).length,   color: '#F97316' },
            { label: 'En curso',    value: tareas.filter(t => t.avanceActual > 0 && t.avanceActual < 100).length, color: '#F97316' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 900, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 600 }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
      {proximoHito && (
        <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 8 }}>Próximo hito</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 4, lineHeight: 1.4 }}>{proximoHito.nombre}</div>
          <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>Fin est.: {fmtLong(proximoHito.fechaFin)}</div>
          {new Date(proximoHito.fechaFin) < today && <div style={{ fontSize: 10, color: '#DC2626', fontWeight: 700, marginTop: 4 }}>⚠ Fecha vencida</div>}
        </div>
      )}
      {ultimoInforme && (
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 12, padding: '12px 14px', boxShadow: '0 1px 4px rgba(249,115,22,0.08)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', marginBottom: 6 }}>Último informe</div>
          <div style={{ fontSize: 11, color: 'var(--gray-700)', marginBottom: 2 }}>{fmtLong(ultimoInforme.fecha)}</div>
          <div style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 6 }}>{ultimoInforme.responsable}</div>
          <div style={{ fontSize: 12, fontWeight: 800, color: progressColor(ultimoInforme.avanceGeneral ?? ultimoInforme.avanceNuevo ?? 0) }}>
            {ultimoInforme.avanceGeneralAnterior ?? ultimoInforme.avanceAnterior ?? 0}% → {ultimoInforme.avanceGeneral ?? ultimoInforme.avanceNuevo ?? 0}%
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tabla + Gantt combinados ──────────────────────────────────────────────────
function TablaGantt({ tareas, structuralMode, onClickTarea, onDeleteTarea, onAddSubtarea, ppd, onZoomChange }) {
  const scrollRef = useRef()
  const [expandedEtapas, setExpandedEtapas] = useState(new Set(tareas.filter(t => t.parentId === null).map(t => t.id)))

  const etapas = tareas.filter(t => t.parentId === null)
  if (!etapas.length) return (
    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>No hay etapas en este cronograma.</div>
  )

  const validDates = tareas.filter(t => t.fechaInicio && t.fechaFin)
  if (!validDates.length) return null

  const minDate = new Date(Math.min(...validDates.map(t => toDate(t.fechaInicio))))
  const maxDate = new Date(Math.max(...validDates.map(t => toDate(t.fechaFin))))
  minDate.setDate(1); maxDate.setMonth(maxDate.getMonth() + 1, 0)

  const totalDays = Math.max(1, (maxDate - minDate) / 86400000)
  const timelineW = totalDays * ppd
  const months    = generateMonths(minDate, maxDate)
  const today     = new Date()
  const todayX    = Math.min(timelineW, Math.max(0, (today - minDate) / 86400000 * ppd))
  const toPx      = (d) => Math.max(0, (toDate(d) - minDate) / 86400000 * ppd)
  const HEADER_H  = 34, ROW_H = 40

  useEffect(() => {
    if (scrollRef.current && todayX > 100) scrollRef.current.scrollLeft = Math.max(0, todayX - 160)
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const handler = (e) => {
      e.preventDefault()
      onZoomChange(i => e.deltaY < 0 ? Math.min(3, i + 1) : Math.max(0, i - 1))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [onZoomChange])

  const toggleExpand = (id) => setExpandedEtapas(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const COL_NOMBRE  = 190
  const COL_INICIO  = 82
  const COL_FIN     = 82
  const COL_DIAS    = 52
  const COL_AVANCE  = 100
  const COL_ESTADO  = 90
  const COL_CRITICA = 52
  const TABLE_W = COL_NOMBRE + COL_INICIO + COL_FIN + COL_DIAS + COL_AVANCE + COL_ESTADO + COL_CRITICA

  const cellStyle = (w, isSticky = false) => ({
    width: w, minWidth: w, maxWidth: w, flexShrink: 0,
    ...(isSticky ? { position: 'sticky', left: 0, zIndex: 3, boxShadow: '2px 0 4px rgba(0,0,0,0.04)' } : {}),
  })

  const renderRow = (tarea, isSubtarea = false) => {
    const indent = isSubtarea ? 20 : 0
    const avance = tarea.parentId === null ? calcAvanceEtapa(tareas, tarea.id) : tarea.avanceActual
    const barX   = toPx(tarea.fechaInicio)
    const barW   = Math.max(4, toPx(tarea.fechaFin) - barX + ppd)
    const etaColor  = tarea.esCritica ? '#DC2626' : '#F97316'
    const barBorder = isSubtarea ? '#FDBA74' : tarea.esCritica ? '#EF4444' : '#FB923C'
    const estado    = tarea.estado || estadoFromAvance(avance)
    const dur       = calcDuracionHabil(tarea.fechaInicio, tarea.fechaFin)

    return (
      <div key={tarea.id} style={{ display: 'flex', height: ROW_H, borderBottom: '1px solid var(--gray-200)' }}>
        <div
          onClick={() => onClickTarea(tarea)}
          style={{
            ...cellStyle(COL_NOMBRE, true),
            background: isSubtarea ? 'white' : '#FAFAFA',
            display: 'flex', alignItems: 'center',
            paddingLeft: 10 + indent, paddingRight: 8, gap: 4,
            borderRight: '2px solid var(--gray-200)',
            cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#FFF7ED'}
          onMouseLeave={e => e.currentTarget.style.background = isSubtarea ? 'white' : '#FAFAFA'}
        >
          {!isSubtarea && (
            <button onClick={ev => { ev.stopPropagation(); toggleExpand(tarea.id) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 10, padding: '2px', lineHeight: 1, flexShrink: 0, transition: 'transform 0.15s', transform: expandedEtapas.has(tarea.id) ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              {tareas.some(t => t.parentId === tarea.id) ? '▶' : ' '}
            </button>
          )}
          <span style={{ fontSize: 11, fontWeight: isSubtarea ? 400 : 700, color: 'var(--gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tarea.esCritica && <span style={{ color: '#DC2626', marginRight: 3 }}>●</span>}
            {tarea.nombre}
          </span>
        </div>
        <div style={{ ...cellStyle(COL_INICIO), display: 'flex', alignItems: 'center', padding: '0 6px', background: isSubtarea ? 'white' : '#FAFAFA' }}>
          <span style={{ fontSize: 10, color: 'var(--gray-600)' }}>{fmtShort(tarea.fechaInicio)}</span>
        </div>
        <div style={{ ...cellStyle(COL_FIN), display: 'flex', alignItems: 'center', padding: '0 6px', background: isSubtarea ? 'white' : '#FAFAFA' }}>
          <span style={{ fontSize: 10, color: 'var(--gray-600)' }}>{fmtShort(tarea.fechaFin)}</span>
        </div>
        <div style={{ ...cellStyle(COL_DIAS), display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSubtarea ? 'white' : '#FAFAFA' }}>
          <span style={{ fontSize: 10, color: 'var(--gray-500)' }}>{dur}h</span>
        </div>
        <div style={{ ...cellStyle(COL_AVANCE), display: 'flex', alignItems: 'center', padding: '0 8px', background: isSubtarea ? 'white' : '#FAFAFA' }}>
          <ProgressCell value={avance} />
        </div>
        <div style={{ ...cellStyle(COL_ESTADO), display: 'flex', alignItems: 'center', padding: '0 6px', background: isSubtarea ? 'white' : '#FAFAFA' }}>
          <EstadoBadge estado={estado} />
        </div>
        <div style={{ ...cellStyle(COL_CRITICA), display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSubtarea ? 'white' : '#FAFAFA' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: tarea.esCritica ? '#DC2626' : 'var(--gray-300)' }}>{tarea.esCritica ? 'Sí' : 'No'}</span>
        </div>
        <div style={{ flex: 1, minWidth: timelineW, position: 'relative', background: isSubtarea ? 'white' : '#FAFAFA', overflow: 'hidden' }}>
          {months.map((m, i) => (
            <div key={i} style={{ position: 'absolute', left: Math.max(0, (m - minDate) / 86400000 * ppd), top: 0, bottom: 0, borderLeft: '1px dashed #EBEBEB', pointerEvents: 'none' }} />
          ))}
          {todayX > 0 && todayX < timelineW && (
            <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, borderLeft: '2px solid var(--orange)', pointerEvents: 'none', zIndex: 2 }} />
          )}
          <div style={{
            position: 'absolute', left: barX, width: barW,
            top: '50%', transform: 'translateY(-50%)',
            height: isSubtarea ? 14 : 20,
            borderRadius: 4, overflow: 'hidden',
            background: isSubtarea ? '#FFF7ED' : '#FED7AA',
            border: `1.5px solid ${barBorder}`,
          }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${avance}%`, background: isSubtarea ? '#FED7AA' : etaColor, opacity: 0.85, borderRadius: '3px 0 0 3px' }} />
            {barW > 30 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', paddingLeft: 4, fontSize: 9, fontWeight: 700, color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.4)', zIndex: 1 }}>
                {avance}%
              </div>
            )}
          </div>
        </div>
        {structuralMode && (
          <div style={{ width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSubtarea ? 'white' : '#FAFAFA' }}>
            <button onClick={() => onDeleteTarea(tarea.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 14, padding: '4px', lineHeight: 1 }}>×</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={scrollRef} data-gantt-scroll style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: 12, border: '1px solid var(--gray-200)', background: 'white' }}>
      <div data-gantt-content style={{ minWidth: TABLE_W + timelineW + (structuralMode ? 32 : 0) }}>
        <div style={{ display: 'flex', height: HEADER_H, background: '#F3F4F6', borderBottom: '2px solid var(--gray-200)', position: 'sticky', top: 0, zIndex: 10 }}>
          {[
            { label: 'Etapa / Tarea', w: COL_NOMBRE, sticky: true },
            { label: 'Inicio',   w: COL_INICIO },
            { label: 'Fin Est.', w: COL_FIN },
            { label: 'Háb.',     w: COL_DIAS },
            { label: 'Avance',   w: COL_AVANCE },
            { label: 'Estado',   w: COL_ESTADO },
            { label: 'Crítica',  w: COL_CRITICA },
          ].map(col => (
            <div key={col.label} style={{
              ...cellStyle(col.w, col.sticky),
              display: 'flex', alignItems: 'center', paddingLeft: col.sticky ? 14 : 8,
              fontSize: 9, fontWeight: 700, color: 'var(--gray-500)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              background: '#F3F4F6',
              ...(col.sticky ? { borderRight: '2px solid var(--gray-200)' } : {}),
            }}>
              {col.label}
            </div>
          ))}
          <div style={{ flex: 1, minWidth: timelineW, position: 'relative', background: '#F3F4F6' }}>
            {months.map((m, i) => {
              const next  = months[i + 1]
              const left  = Math.max(0, (m - minDate) / 86400000 * ppd)
              const width = next ? Math.max(0, (next - minDate) / 86400000 * ppd) - left : timelineW - left
              return (
                <div key={i} style={{ position: 'absolute', left, width, top: 0, bottom: 0, borderLeft: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', paddingLeft: 4, overflow: 'hidden' }}>
                  {width > 18 && <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{m.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })}</span>}
                </div>
              )
            })}
            {todayX > 0 && todayX < timelineW && (
              <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, zIndex: 4, borderLeft: '2px solid var(--orange)', pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', top: 3, left: 4, background: 'var(--orange)', color: 'white', fontSize: 7, fontWeight: 700, padding: '1px 4px', borderRadius: 3 }}>HOY</div>
              </div>
            )}
          </div>
          {structuralMode && <div style={{ width: 32, background: '#F3F4F6' }} />}
        </div>
        {/* Rows + SVG connector overlay */}
        <div style={{ position: 'relative' }}>
          {etapas.map(etapa => {
            const hijos = tareas.filter(t => t.parentId === etapa.id)
            const isExpanded = expandedEtapas.has(etapa.id)
            return (
              <div key={etapa.id}>
                {renderRow(etapa, false)}
                {isExpanded && hijos.map(hijo => renderRow(hijo, true))}
                {isExpanded && structuralMode && (
                  <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 44, height: 30, borderBottom: '1px solid var(--gray-200)', background: 'white' }}>
                    <button onClick={() => onAddSubtarea(etapa)}
                      style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
                      + Nueva subetapa
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* SVG dependency connectors */}
          {(() => {
            // Build flat ordered list of visible rows
            const visibleRows = []
            etapas.forEach(etapa => {
              visibleRows.push(etapa)
              if (expandedEtapas.has(etapa.id)) {
                tareas.filter(t => t.parentId === etapa.id).forEach(h => visibleRows.push(h))
              }
            })
            const rowIdx = {}
            visibleRows.forEach((t, i) => { rowIdx[t.id] = i })

            const arrows = tareas.filter(t => t.dependeDeId && rowIdx[t.id] !== undefined && rowIdx[t.dependeDeId] !== undefined)
            if (!arrows.length) return null

            const svgH = visibleRows.length * ROW_H
            return (
              <svg
                style={{ position: 'absolute', top: 0, left: TABLE_W, pointerEvents: 'none', overflow: 'visible', zIndex: 5 }}
                width={timelineW} height={svgH}
              >
                {arrows.map(dep => {
                  const pred = tareas.find(t => t.id === dep.dependeDeId)
                  if (!pred) return null
                  const predRow = rowIdx[pred.id]
                  const depRow  = rowIdx[dep.id]
                  const x1 = toPx(pred.fechaFin) + ppd          // right edge of pred bar
                  const x2 = toPx(dep.fechaInicio)              // left edge of dep bar
                  const y1 = predRow * ROW_H + ROW_H / 2
                  const y2 = depRow  * ROW_H + ROW_H / 2
                  const elbow = 10
                  // path: right → down/up → left → arrowhead
                  const path = `M ${x1} ${y1} L ${x1 + elbow} ${y1} L ${x1 + elbow} ${y2} L ${x2} ${y2}`
                  return (
                    <g key={`${pred.id}-${dep.id}`}>
                      <path d={path} fill="none" stroke="#F97316" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
                      {/* arrowhead */}
                      <polygon
                        points={`${x2},${y2} ${x2 - 7},${y2 - 4} ${x2 - 7},${y2 + 4}`}
                        fill="#F97316" opacity={0.7}
                      />
                    </g>
                  )
                })}
              </svg>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

// ── Historial de informes ─────────────────────────────────────────────────────
function HistorialInformes({ informes, tareas, onEditar, isEditor }) {
  const [expandedIds, setExpandedIds] = useState(new Set())
  if (!informes || !informes.length) return null

  const toggle = (id) => setExpandedIds(prev => {
    const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s
  })

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--gray-800)' }}>Historial de informes</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-500)', background: 'var(--gray-100)', padding: '2px 10px', borderRadius: 99 }}>{informes.length}</span>
      </div>
      {[...informes].reverse().map((informe, revIdx) => {
        const isExpanded = expandedIds.has(informe.id)
        const avGen = informe.avanceGeneral ?? informe.avanceNuevo ?? 0
        const avAnt = informe.avanceGeneralAnterior ?? informe.avanceAnterior ?? 0
        const avancesTareas = informe.avancesTareas || (informe.actualizaciones || []).map(a => {
          const t = tareas.find(ta => ta.id === a.tareaId)
          return { tareaId: a.tareaId, nombreTarea: t?.nombre || `Tarea #${a.tareaId}`, avanceAnterior: 0, avanceNuevo: a.cargarAhora }
        })
        const num = informe.numero ?? (informes.length - revIdx)

        return (
          <div key={informe.id} style={{ border: '1px solid var(--gray-200)', borderRadius: 10, marginBottom: 8, overflow: 'hidden', background: 'white' }}>
            <div
              onClick={() => toggle(informe.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', transition: 'background 0.1s' }}
              onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}
            >
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--orange)', color: 'white', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                #{num}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray-800)' }}>Informe #{num}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmtLong(informe.fecha)} · {informe.responsable}</div>
              </div>
              <div style={{ textAlign: 'right', marginRight: 8, flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: progressColor(avGen) }}>{avGen}%</div>
                <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>{avAnt}% → {avGen}%</div>
              </div>
              {isEditor && (
                <button
                  onClick={e => { e.stopPropagation(); onEditar(informe) }}
                  style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-700)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                >
                  Editar
                </button>
              )}
              <span style={{ fontSize: 10, color: 'var(--gray-400)', transition: 'transform 0.15s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>▶</span>
            </div>
            {isExpanded && (
              <div style={{ borderTop: '1px solid var(--gray-200)', padding: '14px 16px', background: '#FAFAFA' }}>
                {avancesTareas.length > 0 && (
                  <div style={{ marginBottom: informe.observaciones ? 14 : 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Cambios registrados</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {avancesTareas.map(at => (
                        <div key={at.tareaId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'white', borderRadius: 7, border: '1px solid var(--gray-200)' }}>
                          <span style={{ flex: 1, fontSize: 12, color: 'var(--gray-700)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{at.nombreTarea}</span>
                          <span style={{ fontSize: 12, color: 'var(--gray-500)', flexShrink: 0 }}>{at.avanceAnterior}%</span>
                          <span style={{ fontSize: 12, color: 'var(--gray-300)', flexShrink: 0 }}>→</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: progressColor(at.avanceNuevo), flexShrink: 0 }}>{at.avanceNuevo}%</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#10B981', minWidth: 34, textAlign: 'right', flexShrink: 0 }}>+{at.avanceNuevo - at.avanceAnterior}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {informe.observaciones ? (
                  <div style={{ marginTop: avancesTareas.length > 0 ? 12 : 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Observaciones</div>
                    <p style={{ fontSize: 12, color: 'var(--gray-700)', lineHeight: 1.6, margin: 0 }}>{informe.observaciones}</p>
                  </div>
                ) : null}
                {informe.fotos && informe.fotos.filter(Boolean).length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Fotos</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {informe.fotos.filter(Boolean).map((foto, i) => (
                        <img key={i} src={foto.url} alt={foto.name || ''} style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--gray-200)' }} />
                      ))}
                    </div>
                  </div>
                )}
                {!avancesTareas.length && !informe.observaciones && (
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', padding: '8px 0' }}>Sin detalle registrado</div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Modal editar informe ──────────────────────────────────────────────────────
function ModalEditarInforme({ informe, tareas, informes, onSave, onClose }) {
  const isLastInforme = informes.length > 0 && informes[informes.length - 1]?.id === informe.id

  const [editValues, setEditValues] = useState(() => {
    const map = {}
    tareas.forEach(t => {
      const inf = (informe.avancesTareas || []).find(a => a.tareaId === t.id)
      map[t.id] = inf != null ? inf.avanceNuevo : t.avanceActual
    })
    return map
  })
  const [fecha, setFecha]               = useState(informe.fecha || '')
  const [responsable, setResponsable]   = useState(informe.responsable || '')
  const [observaciones, setObservaciones] = useState(informe.observaciones || '')
  const [fotos, setFotos] = useState(() => {
    const f = [...(informe.fotos || [])]
    while (f.length < 3) f.push(null)
    return f
  })
  const fileRef0 = useRef(), fileRef1 = useRef(), fileRef2 = useRef()
  const fileRefs = [fileRef0, fileRef1, fileRef2]

  const etapas = tareas.filter(t => t.parentId === null)
  const getVal = (id) => Number(editValues[id] ?? 0)

  const getAvanceEtapa = (etapaId) => {
    const hijos = tareas.filter(t => t.parentId === etapaId)
    if (!hijos.length) return getVal(etapaId)
    const totalPeso = hijos.reduce((s, t) => s + (t.pesoRelativo || 1), 0)
    return Math.round(hijos.reduce((s, t) => s + getVal(t.id) * (t.pesoRelativo || 1), 0) / Math.max(1, totalPeso))
  }

  const avanceGeneral = useMemo(() => {
    if (!etapas.length) return 0
    const totalPeso = etapas.reduce((s, t) => s + (t.pesoRelativo || 1), 0)
    return Math.round(etapas.reduce((s, t) => s + getAvanceEtapa(t.id) * (t.pesoRelativo || 1), 0) / Math.max(1, totalPeso))
  }, [editValues, tareas])

  const setVal = (id, raw) => {
    const v = Math.max(0, Math.min(100, Number(raw) || 0))
    setEditValues(prev => ({ ...prev, [id]: v }))
  }

  const handleFoto = (idx, e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setFotos(prev => { const arr = [...prev]; arr[idx] = { name: file.name, url: ev.target.result }; return arr })
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    const tareasActualizadas = tareas.map(t => {
      const hijos = tareas.filter(h => h.parentId === t.id)
      const nuevoAvance = hijos.length
        ? Math.round(hijos.reduce((s, h) => s + getVal(h.id) * (h.pesoRelativo || 1), 0) / Math.max(1, hijos.reduce((s, h) => s + (h.pesoRelativo || 1), 0)))
        : getVal(t.id)
      return { ...t, avanceActual: nuevoAvance, estado: estadoFromAvance(nuevoAvance) }
    })

    const avancesTareas = tareas
      .filter(t => getVal(t.id) !== t.avanceActual)
      .map(t => ({ tareaId: t.id, nombreTarea: t.nombre, avanceAnterior: t.avanceActual, avanceNuevo: getVal(t.id) }))

    const updatedInforme = { ...informe, fecha, responsable, observaciones, fotos: fotos.filter(Boolean), avanceGeneral, avancesTareas }
    onSave(updatedInforme, tareasActualizadas)
    onClose()
  }

  const avAntOriginal = informe.avanceGeneralAnterior ?? informe.avanceAnterior ?? 0
  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 700, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 900, color: 'var(--gray-900)', marginBottom: 2 }}>Editar informe #{informe.numero ?? '—'}</h2>
            <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>{fmtLong(informe.fecha)}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)', padding: '4px 8px' }}>×</button>
        </div>

        {/* Advertencia informe no reciente */}
        {!isLastInforme && (
          <div style={{ margin: '14px 24px 0', padding: '10px 14px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
            <span style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>Este no es el informe más reciente. Al guardar, el avance actual de las tareas se actualizará con estos valores.</span>
          </div>
        )}

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Fecha + responsable */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 5 }}>Fecha de carga</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 5 }}>Responsable</label>
              <input value={responsable} onChange={e => setResponsable(e.target.value)} placeholder="Nombre…" style={inputStyle} />
            </div>
          </div>

          {/* Banner avance */}
          <div style={{ background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)', border: '1px solid #FED7AA', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', marginBottom: 2 }}>ANTERIOR</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: progressColor(avAntOriginal) }}>{avAntOriginal}%</div>
            </div>
            <div style={{ fontSize: 20, color: 'var(--gray-300)' }}>→</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--orange)', marginBottom: 2 }}>AL GUARDAR</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: progressColor(avanceGeneral), transition: 'color 0.3s' }}>{avanceGeneral}%</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 10, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${avanceGeneral}%`, height: '100%', background: progressColor(avanceGeneral), borderRadius: 99, transition: 'width 0.4s ease' }} />
              </div>
            </div>
          </div>

          {/* Tabla de tareas — valores absolutos */}
          <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px', background: 'var(--gray-100)', borderBottom: '1px solid var(--gray-200)' }}>
              {['Tarea / Etapa', 'Avance actual', 'Nuevo %'].map(h => (
                <div key={h} style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
              ))}
            </div>
            {etapas.map(etapa => {
              const hijos = tareas.filter(t => t.parentId === etapa.id)
              const hasHijos = hijos.length > 0
              const avEtapa = getAvanceEtapa(etapa.id)
              return (
                <div key={etapa.id}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px', borderBottom: '1px solid var(--gray-200)', background: '#FAFAFA' }}>
                    <div style={{ padding: '10px 12px', fontWeight: 700, fontSize: 12, color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      {etapa.esCritica && <span style={{ color: '#DC2626', fontSize: 10 }}>●</span>}
                      {etapa.nombre}
                      {hasHijos && <span style={{ fontSize: 10, color: 'var(--gray-400)' }}>({hijos.length} sub)</span>}
                    </div>
                    <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: progressColor(etapa.avanceActual) }}>{etapa.avanceActual}%</span>
                    </div>
                    <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
                      {!hasHijos ? (
                        <input type="number" min={0} max={100}
                          value={editValues[etapa.id] ?? etapa.avanceActual}
                          onChange={e => setVal(etapa.id, e.target.value)}
                          style={{ width: 60, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--gray-200)', fontSize: 12, fontFamily: 'inherit', textAlign: 'center' }}
                        />
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 800, color: progressColor(avEtapa) }}>{avEtapa}%</span>
                      )}
                    </div>
                  </div>
                  {hijos.map(hijo => (
                    <div key={hijo.id} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px', borderBottom: '1px solid var(--gray-200)', background: 'white' }}>
                      <div style={{ padding: '9px 12px 9px 28px', fontSize: 12, color: 'var(--gray-700)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ color: 'var(--gray-300)', fontSize: 10 }}>└</span>{hijo.nombre}
                      </div>
                      <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: progressColor(hijo.avanceActual) }}>{hijo.avanceActual}%</span>
                      </div>
                      <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center' }}>
                        <input type="number" min={0} max={100}
                          value={editValues[hijo.id] ?? hijo.avanceActual}
                          onChange={e => setVal(hijo.id, e.target.value)}
                          style={{ width: 60, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--gray-200)', fontSize: 12, fontFamily: 'inherit', textAlign: 'center' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>

          {/* Observaciones */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Observaciones del informe</label>
              <span style={{ fontSize: 11, color: observaciones.length > 450 ? '#DC2626' : 'var(--gray-400)' }}>{observaciones.length}/500</span>
            </div>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Comentarios sobre el avance, novedades de obra, inconvenientes…"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', color: 'var(--gray-700)' }}
            />
          </div>

          {/* Fotos */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Adjuntar fotos (máx. 3)</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {fotos.map((foto, idx) => (
                <div key={idx}>
                  <input ref={fileRefs[idx]} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFoto(idx, e)} />
                  <div
                    onClick={() => { if (!foto) fileRefs[idx].current?.click() }}
                    style={{ width: 100, height: 100, borderRadius: 10, border: foto ? 'none' : '2px dashed var(--gray-300)', background: foto ? 'transparent' : 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: foto ? 'default' : 'pointer', overflow: 'hidden', position: 'relative' }}
                  >
                    {foto ? (
                      <>
                        <img src={foto.url} alt={foto.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          onClick={e => { e.stopPropagation(); setFotos(prev => { const arr = [...prev]; arr[idx] = null; return arr }) }}
                          style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1 }}
                        >×</button>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--gray-400)' }}>
                        <div style={{ fontSize: 22, marginBottom: 2 }}>📷</div>
                        <div style={{ fontSize: 10, fontWeight: 600 }}>Agregar foto</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onClose}
            style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-700)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
            Cancelar
          </button>
          <button onClick={handleSave}
            style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--orange)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(249,115,22,0.4)' }}>
            Guardar cambios
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Estado vacío ──────────────────────────────────────────────────────────────
function EmptyState({ onCrear, isEditor }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>📅</div>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--gray-800)', marginBottom: 8 }}>Esta obra no tiene cronograma</h3>
      <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 24, lineHeight: 1.6, maxWidth: 340, margin: '0 auto 24px' }}>
        {isEditor
          ? 'Creá el cronograma usando una plantilla prediseñada o desde cero para hacer seguimiento de etapas y avance.'
          : 'Aún no se ha creado un cronograma para esta obra.'}
      </p>
      {isEditor && (
        <button onClick={onCrear} style={{ padding: '11px 28px', borderRadius: 10, border: 'none', background: 'var(--orange)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 10px rgba(249,115,22,0.4)' }}>
          📋 Crear cronograma
        </button>
      )}
    </div>
  )
}

// ── Modal de confirmación eliminar cronograma ─────────────────────────────────
function ModalEliminarCronograma({ nombre, onConfirm, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 16, maxWidth: 420, width: '100%', padding: 32, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>🗑️</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 10 }}>Eliminar cronograma</h3>
        <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 6 }}>
          ¿Estás seguro que querés eliminar <strong>"{nombre}"</strong>?
        </p>
        <p style={{ color: 'var(--gray-400)', fontSize: 13, marginBottom: 28 }}>Esta acción no se puede deshacer.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onClose}
            style={{ padding: '11px 24px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-700)', cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'inherit' }}>
            Cancelar
          </button>
          <button onClick={onConfirm}
            style={{ padding: '11px 24px', borderRadius: 8, border: 'none', background: 'var(--red)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' }}>
            Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de impacto en cronograma ────────────────────────────────────────────
function ModalImpacto({ data, onApply, onDismiss }) {
  const { updatedTarea, impactados, tieneCriticas, nuevaFechaFinObra } = data
  const delta = diffCalDias(updatedTarea.fechaFinAnterior, updatedTarea.fechaFin)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 350, padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onDismiss() }}>
      <div style={{ background: 'white', borderRadius: 16, maxWidth: 520, width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--gray-200)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 2 }}>Impacto en cronograma</h3>
              <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>Se detectaron tareas afectadas por este cambio</p>
            </div>
          </div>
        </div>
        <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ background: 'var(--gray-100)', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 6 }}>Tarea modificada</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray-800)', marginBottom: 4 }}>{updatedTarea.nombre}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-600)' }}>
              Fecha fin: {fmtShort(updatedTarea.fechaFinAnterior)} → {fmtShort(updatedTarea.fechaFin)}
              <span style={{ marginLeft: 8, fontWeight: 700, color: delta > 0 ? '#DC2626' : '#10B981' }}>
                {delta > 0 ? `+${delta}` : delta} días
              </span>
            </div>
          </div>
          {tieneCriticas && (
            <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>🔴</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>Este cambio afecta al camino crítico de la obra</span>
            </div>
          )}
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-600)', marginBottom: 10 }}>
            {impactados.length} tarea{impactados.length !== 1 ? 's' : ''} impactada{impactados.length !== 1 ? 's' : ''}:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {impactados.map(imp => {
              const d = diffCalDias(imp.fechaFinAnterior, imp.fechaFinNueva)
              return (
                <div key={imp.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 7, background: imp.esCritica ? '#FFF5F5' : '#F9FAFB', border: `1px solid ${imp.esCritica ? '#FCA5A5' : 'var(--gray-200)'}` }}>
                  {imp.esCritica && <span style={{ color: '#DC2626', fontSize: 10, fontWeight: 700 }}>●</span>}
                  <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--gray-800)' }}>{imp.nombre}</span>
                  <span style={{ fontSize: 11, color: 'var(--gray-500)' }}>Fin: {fmtShort(imp.fechaFinAnterior)} → {fmtShort(imp.fechaFinNueva)}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: d > 0 ? '#DC2626' : '#10B981', minWidth: 36, textAlign: 'right' }}>{d > 0 ? `+${d}` : d}d</span>
                </div>
              )
            })}
          </div>
          <div style={{ background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)', border: '1px solid #FED7AA', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange)', textTransform: 'uppercase', marginBottom: 4 }}>Nueva fecha estimada de fin de obra</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gray-800)' }}>{fmtLong(nuevaFechaFinObra)}</div>
          </div>
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--gray-200)', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={onDismiss}
            style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-700)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
            No aplicar
          </button>
          <button onClick={onApply}
            style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--orange)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(249,115,22,0.4)' }}>
            Aplicar corrimiento automático
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CronogramaTab({ project, cronogramas, teamMembers, onCreateCronograma, onSaveCronograma, onCargarAvance, onDeleteCronograma, onEditarInforme, isEditor }) {
  const [selectedId,      setSelectedId]      = useState(() => cronogramas[0]?.id || null)
  const [showCrearModal,  setShowCrearModal]   = useState(false)
  const [showAvanceModal, setShowAvanceModal]  = useState(false)
  const [structuralMode,  setStructuralMode]   = useState(false)
  const [editingTarea,    setEditingTarea]     = useState(null)
  const [editingInforme,  setEditingInforme]   = useState(null)
  const [showDeleteModal, setShowDeleteModal]  = useState(false)
  const [cascadeData,     setCascadeData]      = useState(null)
  const [zoomIdx,         setZoomIdx]          = useState(1)
  const [exportando,      setExportando]       = useState(false)
  const ganttRef = useRef(null)

  const ppd       = PPD_LEVELS[zoomIdx].val
  const zoomLabel = PPD_LEVELS[zoomIdx].label

  const prevLen = useRef(cronogramas.length)
  useEffect(() => {
    if (cronogramas.length > prevLen.current) {
      setSelectedId(cronogramas[cronogramas.length - 1].id)
    } else if (cronogramas.length > 0 && !cronogramas.find(c => c.id === selectedId)) {
      setSelectedId(cronogramas[0].id)
    }
    prevLen.current = cronogramas.length
  }, [cronogramas])

  if (!cronogramas.length) {
    return (
      <>
        <EmptyState onCrear={() => setShowCrearModal(true)} isEditor={isEditor} />
        {showCrearModal && (
          <ModalCrearCronograma project={project} teamMembers={teamMembers} onClose={() => setShowCrearModal(false)}
            onCrear={(data) => { onCreateCronograma(project.id, data); setShowCrearModal(false) }} />
        )}
      </>
    )
  }

  const cronograma    = cronogramas.find(c => c.id === selectedId) || cronogramas[0]
  const tareas        = cronograma?.tareas || []
  const informes      = cronograma?.informes || []
  const avanceGeneral = calcAvanceGeneral(tareas)

  const handleSaveTareaFromModal = (updatedTarea) => {
    const oldTarea = tareas.find(t => t.id === updatedTarea.id)

    if (!oldTarea) {
      const newId = Math.max(...tareas.map(t => t.id), 0) + 1
      const newT  = { ...updatedTarea, id: newId, obraId: project.id }
      onSaveCronograma(project.id, cronograma.id, { tareas: [...tareas, newT] })
      setEditingTarea(null)
      return
    }

    const datesChanged = oldTarea.fechaFin !== updatedTarea.fechaFin ||
                         oldTarea.fechaInicio !== updatedTarea.fechaInicio ||
                         oldTarea.duracionDias !== updatedTarea.duracionDias

    if (datesChanged) {
      const { impactados, updatedMap } = computeCascade(tareas, updatedTarea)
      if (impactados.length > 0) {
        const allForFin = tareas.map(t => updatedMap.has(t.id) ? updatedMap.get(t.id) : t)
        const nuevaFechaFinObra = allForFin.filter(t => t.fechaFin).reduce((max, t) => t.fechaFin > max ? t.fechaFin : max, '')
        setCascadeData({
          originalEdit: updatedTarea,
          updatedTarea: { ...updatedTarea, fechaFinAnterior: oldTarea.fechaFin },
          impactados,
          updatedMap,
          tieneCriticas: impactados.some(i => i.esCritica),
          nuevaFechaFinObra,
        })
        setEditingTarea(null)
        return
      }
    }

    const newTareas = tareas.map(t => t.id === updatedTarea.id ? updatedTarea : t)
    onSaveCronograma(project.id, cronograma.id, { tareas: newTareas })
    setEditingTarea(null)
  }

  const handleApplyCascade = () => {
    const { originalEdit, updatedMap } = cascadeData
    const newTareas = tareas.map(t => {
      if (t.id === originalEdit.id) return originalEdit
      return updatedMap.has(t.id) ? updatedMap.get(t.id) : t
    })
    onSaveCronograma(project.id, cronograma.id, { tareas: newTareas })
    setCascadeData(null)
  }

  const handleDismissCascade = () => {
    const { originalEdit } = cascadeData
    const newTareas = tareas.map(t => t.id === originalEdit.id ? originalEdit : t)
    onSaveCronograma(project.id, cronograma.id, { tareas: newTareas })
    setCascadeData(null)
  }

  const handleDeleteTarea = (id) => {
    onSaveCronograma(project.id, cronograma.id, { tareas: tareas.filter(t => t.id !== id && t.parentId !== id) })
  }

  const handleAddSubtarea = (parentEtapa) => {
    setEditingTarea({
      id: null, parentId: parentEtapa.id, obraId: project.id,
      nombre: '', tipo: 'subtarea',
      fechaInicio: parentEtapa.fechaInicio || '',
      duracionDias: 5, pesoRelativo: 10,
      avanceActual: 0, estado: 'Pendiente',
      dependeDeId: null, tipoVinculo: 'Fin a inicio', desfaseDias: 0, esCritica: false,
    })
  }

  const handleEditarInformeLocal = (updatedInforme, tareasActualizadas) => {
    onEditarInforme(project.id, cronograma.id, updatedInforme.id, updatedInforme, tareasActualizadas)
  }

  const exportarPDF = async () => {
    setExportando(true)
    try {
      const { jsPDF } = await import('jspdf')
      const html2canvas = (await import('html2canvas')).default

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const mg = 14
      let y = mg

      // ── Encabezado ──
      pdf.setFontSize(15)
      pdf.setFont('helvetica', 'bold')
      pdf.text(project.name || '—', mg, y)
      y += 7

      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      const col2 = pageW / 2
      pdf.text(`Ubicación: ${project.location || '—'}`, mg, y)
      pdf.text(`Responsable: ${project.responsible || '—'}`, col2, y)
      y += 5
      pdf.text(`Inicio: ${fmtLong(project.startDate)}`, mg, y)
      pdf.text(`Fin estimado: ${fmtLong(project.endDate)}`, col2, y)
      y += 5
      pdf.text(`Estado: ${project.status || '—'}`, mg, y)
      pdf.text(`Avance actual: ${avanceGeneral}%`, col2, y)
      y += 5

      pdf.setDrawColor(220, 220, 220)
      pdf.line(mg, y, pageW - mg, y)
      y += 5

      // ── Tabla Gantt ──
      const scrollContainer = ganttRef.current?.querySelector('[data-gantt-scroll]')
      const contentEl       = ganttRef.current?.querySelector('[data-gantt-content]')
      if (scrollContainer && contentEl) {
        // Ir al inicio y esperar que el DOM se actualice
        scrollContainer.scrollLeft = 0
        await new Promise(r => setTimeout(r, 150))

        // Quitar overflow temporalmente para que html2canvas capture el ancho completo
        const fullWidth = scrollContainer.scrollWidth
        const prevOverflow = scrollContainer.style.overflowX
        scrollContainer.style.overflowX = 'visible'

        const canvas = await html2canvas(contentEl, {
          scale: 1.5, useCORS: true, backgroundColor: '#ffffff', logging: false,
          width: fullWidth, windowWidth: fullWidth,
        })

        scrollContainer.style.overflowX = prevOverflow

        const imgW = pageW - mg * 2
        const imgH = Math.min(pageH - y - mg, (canvas.height * imgW) / canvas.width)
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', mg, y, imgW, imgH)
        y += imgH + 6
      }

      // ── Historial de informes ──
      if (informes.length > 0) {
        const sorted = [...informes].sort((a, b) => b.numero - a.numero)
        if (y + 14 > pageH - mg) { pdf.addPage(); y = mg }

        pdf.setFontSize(11)
        pdf.setFont('helvetica', 'bold')
        pdf.text('Historial de Informes', mg, y)
        y += 7

        const lh = 4.5
        sorted.forEach(inf => {
          const obsLines = inf.observaciones
            ? pdf.splitTextToSize(`Observaciones: ${inf.observaciones}`, pageW - mg * 2 - 8)
            : []
          const needed = lh * (2 + obsLines.length) + 4
          if (y + needed > pageH - mg) { pdf.addPage(); y = mg }

          pdf.setFontSize(9)
          pdf.setFont('helvetica', 'bold')
          pdf.text(
            `Informe #${inf.numero}  —  ${fmtLong(inf.fecha)}  |  Responsable: ${inf.responsable || '—'}`,
            mg, y
          )
          y += lh

          pdf.setFont('helvetica', 'normal')
          const avAnt = inf.avanceGeneralAnterior !== undefined ? `${inf.avanceGeneralAnterior}%` : '—'
          pdf.text(`Avance general: ${avAnt} → ${inf.avanceGeneral}%`, mg + 4, y)
          y += lh

          if (obsLines.length) {
            pdf.text(obsLines, mg + 4, y)
            y += obsLines.length * lh
          }
          y += 4
        })
      }

      const safeName = (project.name || 'obra').replace(/[^\w\s]/g, '').trim()
      pdf.save(`Cronograma_${safeName}.pdf`)
    } catch (err) {
      console.error('Error exportando PDF:', err)
    } finally {
      setExportando(false)
    }
  }

  const btnStyle = (orange = false, danger = false) => ({
    padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    border: orange ? 'none' : danger ? '1px solid #FECACA' : '1px solid var(--gray-200)',
    background: orange ? 'var(--orange)' : danger ? '#FFF5F5' : 'white',
    color: orange ? 'white' : danger ? 'var(--red)' : 'var(--gray-700)',
    boxShadow: orange ? '0 2px 6px rgba(249,115,22,0.35)' : 'none',
  })

  const zoomBtnStyle = (disabled) => ({
    width: 26, height: 26, borderRadius: 6, border: '1px solid var(--gray-200)',
    background: disabled ? 'var(--gray-100)' : 'white',
    color: disabled ? 'var(--gray-300)' : 'var(--gray-600)',
    cursor: disabled ? 'default' : 'pointer', fontWeight: 700, fontSize: 14,
    fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
  })

  return (
    <div>
      {/* ── Tabs de cronogramas ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
        {cronogramas.map(c => (
          <button key={c.id} onClick={() => setSelectedId(c.id)}
            style={{
              padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
              border: c.id === cronograma.id ? 'none' : '1px solid var(--gray-200)',
              background: c.id === cronograma.id ? 'var(--orange)' : 'white',
              color: c.id === cronograma.id ? 'white' : 'var(--gray-600)',
              boxShadow: c.id === cronograma.id ? '0 2px 6px rgba(249,115,22,0.35)' : 'none',
            }}>
            {c.nombre}
          </button>
        ))}
        {isEditor && (
          <button onClick={() => setShowCrearModal(true)}
            style={{ padding: '6px 12px', borderRadius: 7, border: '1px dashed var(--gray-300)', background: 'white', color: 'var(--gray-500)', fontSize: 16, cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}
            title="Nuevo cronograma">
            +
          </button>
        )}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {isEditor && (
          structuralMode ? (
            <button onClick={() => setStructuralMode(false)} style={btnStyle(true)}>✓ Listo</button>
          ) : (
            <>
              <button onClick={() => setShowCrearModal(true)} style={btnStyle()}>📋 Usar plantilla</button>
              <button onClick={() => setStructuralMode(true)} style={btnStyle()}>✏️ Editar estructura</button>
              <button onClick={() => setShowAvanceModal(true)} style={btnStyle(true)}>+ Cargar avance</button>
              <button onClick={exportarPDF} disabled={exportando} style={{ ...btnStyle(), opacity: exportando ? 0.6 : 1 }}>
                {exportando ? 'Exportando…' : '⬇ Exportar PDF'}
              </button>
              <button onClick={() => setShowDeleteModal(true)} style={btnStyle(false, true)}>🗑 Eliminar cronograma</button>
            </>
          )
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600, marginRight: 2 }}>Vista: {zoomLabel}</span>
          <button onClick={() => setZoomIdx(i => Math.max(0, i - 1))} disabled={zoomIdx === 0} style={zoomBtnStyle(zoomIdx === 0)} title="Alejar">−</button>
          <button onClick={() => setZoomIdx(i => Math.min(3, i + 1))} disabled={zoomIdx === 3} style={zoomBtnStyle(zoomIdx === 3)} title="Acercar">+</button>
        </div>
      </div>

      {/* ── Contenido principal ── */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div ref={ganttRef} style={{ flex: 1, minWidth: 0 }}>
          <TablaGantt
            tareas={tareas}
            structuralMode={structuralMode}
            onClickTarea={isEditor ? setEditingTarea : () => {}}
            onDeleteTarea={handleDeleteTarea}
            onAddSubtarea={handleAddSubtarea}
            ppd={ppd}
            onZoomChange={setZoomIdx}
          />
        </div>
        <StatsPanel tareas={tareas} avanceGeneral={avanceGeneral} informes={informes} />
      </div>

      {/* ── Historial de informes ── */}
      <HistorialInformes
        informes={informes}
        tareas={tareas}
        onEditar={setEditingInforme}
        isEditor={isEditor}
      />

      {/* ── Modales ── */}
      {showCrearModal && (
        <ModalCrearCronograma project={project} onClose={() => setShowCrearModal(false)}
          onCrear={(data) => { onCreateCronograma(project.id, data); setShowCrearModal(false) }} />
      )}
      {showAvanceModal && (
        <ModalCargarAvance project={project} cronograma={cronograma}
          numero={informes.length + 1}
          teamMembers={teamMembers}
          onClose={() => setShowAvanceModal(false)}
          onGuardar={(pid, informe, tareasActualizadas) => {
            onCargarAvance(pid, cronograma.id, informe, tareasActualizadas)
            setShowAvanceModal(false)
          }} />
      )}
      {editingTarea && (
        <ModalEditarEtapa
          tarea={editingTarea}
          tareas={tareas}
          onClose={() => setEditingTarea(null)}
          onSave={handleSaveTareaFromModal}
          onAgregarSubetapa={handleAddSubtarea}
        />
      )}
      {editingInforme && (
        <ModalEditarInforme
          informe={editingInforme}
          tareas={tareas}
          informes={informes}
          onClose={() => setEditingInforme(null)}
          onSave={handleEditarInformeLocal}
        />
      )}
      {showDeleteModal && (
        <ModalEliminarCronograma
          nombre={cronograma.nombre}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={() => {
            onDeleteCronograma(project.id, cronograma.id)
            setShowDeleteModal(false)
          }}
        />
      )}
      {cascadeData && (
        <ModalImpacto
          data={cascadeData}
          onApply={handleApplyCascade}
          onDismiss={handleDismissCascade}
        />
      )}
    </div>
  )
}
