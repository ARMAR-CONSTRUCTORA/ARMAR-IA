import { useState, useRef, useEffect, useMemo } from 'react'
import { calcAvanceEtapa, calcAvanceGeneral, estadoFromAvance } from '../data/cronogramaTemplates'
import { calcDuracionHabil, computeCascade } from '../utils/calendarUtils'
import ModalCrearCronograma from './ModalCrearCronograma'
import ModalCargarAvance from './ModalCargarAvance'
import ModalEditarEtapa from './ModalEditarEtapa'
import { loadChecklistItems, upsertChecklistItem } from '../lib/supabase'

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
function fmtPesos(v) {
  if (v == null || v === '') return '—'
  return '$' + Number(v).toLocaleString('es-AR')
}
function parseMiles(str) {
  if (!str) return 0
  const num = Number(String(str).replace(/\./g, '').replace(/,/g, ''))
  return isNaN(num) ? 0 : num
}
function calcTotalEtapa(tarea) {
  const base = tarea?.presupuesto || 0
  const adic = (tarea?.adicionales || []).reduce((s, a) => s + (a.monto || 0), 0)
  return base + adic
}
function calcTotalAdicionales(tarea) {
  return (tarea?.adicionales || []).reduce((s, a) => s + (a.monto || 0), 0)
}
function calcPagadoAcumulado(tareaId, certificados) {
  return (certificados || []).reduce((s, cert) => {
    const e = (cert.etapas || []).find(e => e.tareaId === tareaId)
    return s + (e?.montoPagado || 0)
  }, 0)
}

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
    <span style={{ padding: '2px 6px', borderRadius: 99, fontSize: 9, fontWeight: 700, color: s.color, background: s.bg, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {estado}
    </span>
  )
}

function ProgressCell({ value }) {
  const color = progressColor(value)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ flex: 1, height: 5, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden', minWidth: 30 }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color, minWidth: 22 }}>{value}%</span>
    </div>
  )
}

function StatsPanel({ tareas, avanceGeneral, informes, certificados }) {
  const total       = tareas.length
  const finalizadas = tareas.filter(t => t.avanceActual === 100).length
  const criticas    = tareas.filter(t => t.esCritica).length
  const today       = new Date()
  const proximoHito = tareas.filter(t => t.parentId === null && t.avanceActual < 100).sort((a, b) => new Date(a.fechaFin) - new Date(b.fechaFin))[0]
  const ultimoInforme = informes?.length > 0 ? informes[informes.length - 1] : null
  const etapas = (tareas || []).filter(t => t.parentId === null)
  const presupuestoTotal = etapas.reduce((s, t) => s + (t.presupuesto || 0), 0)
  const adicionalesTotal = etapas.reduce((s, t) => s + calcTotalAdicionales(t), 0)
  const contratoTotal    = presupuestoTotal + adicionalesTotal
  const pagadoTotal      = etapas.reduce((s, t) => s + calcPagadoAcumulado(t.id, certificados), 0)
  const saldoTotal       = contratoTotal - pagadoTotal

  return (
    <div style={{ width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: 12, padding: '16px', textAlign: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <DonutChart value={avanceGeneral} />
        <div style={{ fontSize: 12, color: 'var(--gray-500)', fontWeight: 600, marginTop: 6 }}>Avance general</div>
      </div>

      {contratoTotal > 0 && (
        <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 8 }}>Resumen financiero</div>
          {[
            { label: 'Contrato', value: contratoTotal, color: 'var(--gray-800)' },
            { label: 'Pagado',   value: pagadoTotal,   color: '#10B981' },
            { label: 'Saldo',    value: saldoTotal,    color: saldoTotal > 0 ? '#F97316' : '#10B981' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600 }}>{row.label}</span>
              <span style={{ fontSize: 12, fontWeight: 800, color: row.color }}>{fmtPesos(row.value)}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid var(--gray-200)', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { label: 'Completadas', value: `${finalizadas}/${total}`, color: '#10B981' },
            { label: 'Críticas',    value: criticas,                  color: '#DC2626' },
            { label: 'Informes',    value: (informes || []).length,   color: '#F97316' },
            { label: 'Certif.',     value: (certificados || []).length, color: '#3B82F6' },
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
          <div style={{ fontSize: 12, fontWeight: 800, color: progressColor(ultimoInforme.avanceGeneral ?? 0) }}>
            {ultimoInforme.avanceGeneralAnterior ?? 0}% → {ultimoInforme.avanceGeneral ?? 0}%
          </div>
        </div>
      )}
    </div>
  )
}

function TablaGantt({ tareas, structuralMode, onClickTarea, onDeleteTarea, onAddSubtarea, ppd, onZoomChange, certificados }) {
  const scrollRef = useRef()
  const [expandedEtapas, setExpandedEtapas] = useState(new Set(tareas.filter(t => t.parentId === null).map(t => t.id)))

  const etapas = tareas.filter(t => t.parentId === null)
  if (!etapas.length) return <div style={{ padding: '32px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>No hay etapas en este cronograma.</div>

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
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      onZoomChange(i => e.deltaY < 0 ? Math.min(3, i + 1) : Math.max(0, i - 1))
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [onZoomChange])

  const toggleExpand = (id) => setExpandedEtapas(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const COL_NOMBRE   = 160
  const COL_INICIO   = 65
  const COL_FIN      = 65
  const COL_DIAS     = 68
  const COL_AVANCE   = 85
  const COL_ESTADO   = 78
  const COL_PRESUP   = 82
  const COL_ADIC     = 75
  const COL_SUBTOTAL = 82
  const COL_PAGOS    = 82
  const COL_SALDO    = 82
  const TABLE_W = COL_NOMBRE + COL_INICIO + COL_FIN + COL_DIAS + COL_AVANCE + COL_ESTADO + COL_PRESUP + COL_ADIC + COL_SUBTOTAL + COL_PAGOS + COL_SALDO

  const cellStyle = (w, isSticky = false) => ({
    width: w, minWidth: w, maxWidth: w, flexShrink: 0,
    ...(isSticky ? { position: 'sticky', left: 0, zIndex: 3, boxShadow: '2px 0 4px rgba(0,0,0,0.04)' } : {}),
  })

  const numMap = {}
  etapas.forEach((etapa, i) => {
    numMap[etapa.id] = `${i + 1}.`
    tareas.filter(t => t.parentId === etapa.id).forEach((hijo, j) => {
      numMap[hijo.id] = `${i + 1}.${j + 1}`
    })
  })

  const renderRow = (tarea, isSubtarea = false) => {
    const indent      = isSubtarea ? 20 : 0
    const avance      = tarea.parentId === null ? calcAvanceEtapa(tareas, tarea.id) : tarea.avanceActual
    const barX        = toPx(tarea.fechaInicio)
    const barW        = Math.max(4, toPx(tarea.fechaFin) - barX + ppd)
    const etaColor    = tarea.esCritica ? '#DC2626' : '#F97316'
    const barBorder   = isSubtarea ? '#FDBA74' : tarea.esCritica ? '#EF4444' : '#FB923C'
    const estado      = tarea.estado || estadoFromAvance(avance)
    const dur         = calcDuracionHabil(tarea.fechaInicio, tarea.fechaFin)
    const adic        = calcTotalAdicionales(tarea)
    const subtotal    = calcTotalEtapa(tarea)
    const pagadoAcum  = calcPagadoAcumulado(tarea.id, certificados)
    const saldo       = subtotal - pagadoAcum

    return (
      <div key={tarea.id} style={{ display: 'flex', height: ROW_H, borderBottom: '1px solid var(--gray-200)' }}>
        <div onClick={() => onClickTarea(tarea)}
          style={{ ...cellStyle(COL_NOMBRE, true), background: isSubtarea ? 'white' : '#FAFAFA', display: 'flex', alignItems: 'center', paddingLeft: 10 + indent, paddingRight: 8, gap: 4, borderRight: '2px solid var(--gray-200)', cursor: 'pointer' }}
          onMouseEnter={e => e.currentTarget.style.background = '#FFF7ED'}
          onMouseLeave={e => e.currentTarget.style.background = isSubtarea ? 'white' : '#FAFAFA'}>
          {!isSubtarea && (
            <button onClick={ev => { ev.stopPropagation(); toggleExpand(tarea.id) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 10, padding: '2px', lineHeight: 1, flexShrink: 0, transition: 'transform 0.15s', transform: expandedEtapas.has(tarea.id) ? 'rotate(90deg)' : 'rotate(0deg)' }}>
              {tareas.some(t => t.parentId === tarea.id) ? '▶' : ' '}
            </button>
          )}
          <span style={{ fontSize: 11, fontWeight: isSubtarea ? 400 : 700, color: 'var(--gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {tarea.esCritica && <span style={{ color: '#DC2626', marginRight: 3 }}>●</span>}
            <span style={{ color: 'var(--gray-400)', fontWeight: 400, marginRight: 4 }}>{numMap[tarea.id]}</span>
            {tarea.nombre}
          </span>
        </div>
        <div style={{ ...cellStyle(COL_INICIO), display: 'flex', alignItems: 'center', padding: '0 4px', background: isSubtarea ? 'white' : '#FAFAFA' }}>
          <span style={{ fontSize: 10, color: 'var(--gray-600)' }}>{fmtShort(tarea.fechaInicio)}</span>
        </div>
        <div style={{ ...cellStyle(COL_FIN), display: 'flex', alignItems: 'center', padding: '0 4px', background: isSubtarea ? 'white' : '#FAFAFA' }}>
          <span style={{ fontSize: 10, color: 'var(--gray-600)' }}>{fmtShort(tarea.fechaFin)}</span>
        </div>
        <div style={{ ...cellStyle(COL_DIAS), display: 'flex', alignItems: 'center', padding: '0 4px', background: isSubtarea ? 'white' : '#FAFAFA' }}>
          <span style={{ fontSize: 10, color: 'var(--gray-500)' }}>{dur} días</span>
        </div>
        <div style={{ ...cellStyle(COL_AVANCE), display: 'flex', alignItems: 'center', padding: '0 5px', background: isSubtarea ? 'white' : '#FAFAFA' }}>
          <ProgressCell value={avance} />
        </div>
        <div style={{ ...cellStyle(COL_ESTADO), display: 'flex', alignItems: 'center', padding: '0 4px', background: isSubtarea ? 'white' : '#FAFAFA' }}>
          <EstadoBadge estado={estado} />
        </div>
        <div style={{ ...cellStyle(COL_PRESUP), display: 'flex', alignItems: 'center', padding: '0 5px', background: isSubtarea ? 'white' : '#FAFAFA' }}>
          <span style={{ fontSize: 10, color: tarea.presupuesto ? 'var(--gray-700)' : 'var(--gray-300)', fontWeight: tarea.presupuesto ? 600 : 400 }}>
            {tarea.presupuesto ? fmtPesos(tarea.presupuesto) : '—'}
          </span>
        </div>
        <div style={{ ...cellStyle(COL_ADIC), display: 'flex', alignItems: 'center', padding: '0 5px', background: isSubtarea ? 'white' : '#FAFAFA' }}>
          <span style={{ fontSize: 10, color: adic > 0 ? '#F97316' : 'var(--gray-300)', fontWeight: adic > 0 ? 600 : 400 }}>
            {adic > 0 ? fmtPesos(adic) : '—'}
          </span>
        </div>
        <div style={{ ...cellStyle(COL_SUBTOTAL), display: 'flex', alignItems: 'center', padding: '0 5px', background: isSubtarea ? 'white' : '#FAFAFA' }}>
          <span style={{ fontSize: 10, color: subtotal > 0 ? 'var(--gray-800)' : 'var(--gray-300)', fontWeight: subtotal > 0 ? 700 : 400 }}>
            {subtotal > 0 ? fmtPesos(subtotal) : '—'}
          </span>
        </div>
        <div style={{ ...cellStyle(COL_PAGOS), display: 'flex', alignItems: 'center', padding: '0 5px', background: isSubtarea ? 'white' : '#FAFAFA' }}>
          <span style={{ fontSize: 10, color: pagadoAcum > 0 ? '#10B981' : 'var(--gray-300)', fontWeight: pagadoAcum > 0 ? 600 : 400 }}>
            {pagadoAcum > 0 ? fmtPesos(pagadoAcum) : '—'}
          </span>
        </div>
        <div style={{ ...cellStyle(COL_SALDO), display: 'flex', alignItems: 'center', padding: '0 5px', background: isSubtarea ? 'white' : '#FAFAFA' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: subtotal === 0 ? 'var(--gray-300)' : saldo === 0 ? '#10B981' : saldo > 0 ? '#F97316' : '#DC2626' }}>
            {subtotal > 0 ? fmtPesos(saldo) : '—'}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: timelineW, position: 'relative', background: isSubtarea ? 'white' : '#FAFAFA', overflow: 'hidden' }}>
          {months.map((m, i) => (
            <div key={i} style={{ position: 'absolute', left: Math.max(0, (m - minDate) / 86400000 * ppd), top: 0, bottom: 0, borderLeft: '1px dashed #EBEBEB', pointerEvents: 'none' }} />
          ))}
          {todayX > 0 && todayX < timelineW && (
            <div style={{ position: 'absolute', left: todayX, top: 0, bottom: 0, borderLeft: '2px solid var(--orange)', pointerEvents: 'none', zIndex: 2 }} />
          )}
          <div style={{ position: 'absolute', left: barX, width: barW, top: '50%', transform: 'translateY(-50%)', height: isSubtarea ? 14 : 20, borderRadius: 4, overflow: 'hidden', background: isSubtarea ? '#FFF7ED' : '#FED7AA', border: `1.5px solid ${barBorder}` }}>
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
            <button
              onClick={(e) => { e.stopPropagation(); onDeleteTarea(tarea.id) }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 14, padding: '4px', lineHeight: 1 }}>×</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div ref={scrollRef} data-gantt-scroll style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', borderRadius: 12, border: '1px solid var(--gray-200)', background: 'white' }}>
      <div data-gantt-content style={{ minWidth: TABLE_W + timelineW + (structuralMode ? 32 : 0) }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ display: 'flex', height: HEADER_H, background: '#F3F4F6', borderBottom: ppd >= 5.5 ? '1px solid var(--gray-200)' : '2px solid var(--gray-200)' }}>
            {[
              { label: 'Etapa / Tarea', w: COL_NOMBRE, sticky: true },
              { label: 'Inicio',        w: COL_INICIO },
              { label: 'Fin Est.',      w: COL_FIN },
              { label: 'Duración',      w: COL_DIAS },
              { label: 'Avance',        w: COL_AVANCE },
              { label: 'Estado',        w: COL_ESTADO },
              { label: 'Presupuesto',   w: COL_PRESUP },
              { label: 'Adicionales',   w: COL_ADIC },
              { label: 'Subtotal',      w: COL_SUBTOTAL },
              { label: 'Pagos',         w: COL_PAGOS },
              { label: 'Saldo',         w: COL_SALDO },
            ].map(col => (
              <div key={col.label} style={{
                ...cellStyle(col.w, col.sticky),
                display: 'flex', alignItems: 'center', paddingLeft: col.sticky ? 14 : 5,
                fontSize: 9, fontWeight: 700, color: 'var(--gray-500)',
                textTransform: 'uppercase', letterSpacing: '0.06em', background: '#F3F4F6',
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
          {ppd >= 5.5 && (() => {
            const SUB_H = 20
            const dayInitials = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
            if (ppd >= 12) {
              const days = []
              const cur = new Date(minDate)
              while (cur <= maxDate) {
                days.push({ num: cur.getDate(), initial: dayInitials[cur.getDay()], left: (cur - minDate) / 86400000 * ppd, isWeekend: cur.getDay() === 0 || cur.getDay() === 6 })
                cur.setDate(cur.getDate() + 1)
              }
              return (
                <div style={{ display: 'flex', height: SUB_H, background: '#FAFAFA', borderBottom: '2px solid var(--gray-200)' }}>
                  <div style={{ ...cellStyle(COL_NOMBRE, true), background: '#FAFAFA', borderRight: '2px solid var(--gray-200)' }} />
                  <div style={{ width: TABLE_W - COL_NOMBRE, flexShrink: 0, background: '#FAFAFA' }} />
                  <div style={{ flex: 1, minWidth: timelineW, position: 'relative', background: '#FAFAFA', overflow: 'hidden' }}>
                    {days.map((d, i) => (
                      <div key={i} style={{ position: 'absolute', left: d.left, width: ppd, top: 0, bottom: 0, borderLeft: '1px solid var(--gray-200)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: d.isWeekend ? '#F3F4F6' : '#FAFAFA' }}>
                        {ppd > 14 && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--gray-400)', lineHeight: 1 }}>{d.num}</span>}
                        <span style={{ fontSize: 7, color: 'var(--gray-400)', lineHeight: 1 }}>{d.initial}</span>
                      </div>
                    ))}
                  </div>
                  {structuralMode && <div style={{ width: 32, background: '#FAFAFA' }} />}
                </div>
              )
            } else {
              const weekBlocks = []
              months.forEach(m => {
                const year = m.getFullYear(), month = m.getMonth()
                const daysInMonth = new Date(year, month + 1, 0).getDate()
                let weekNum = 1
                for (let d = 1; d <= daysInMonth; d += 7) {
                  const start = new Date(year, month, d)
                  const endDay = Math.min(d + 6, daysInMonth)
                  const left = Math.max(0, (start - minDate) / 86400000 * ppd)
                  const width = (endDay - d + 1) * ppd
                  weekBlocks.push({ label: `S${weekNum}`, left, width })
                  weekNum++
                }
              })
              return (
                <div style={{ display: 'flex', height: SUB_H, background: '#FAFAFA', borderBottom: '2px solid var(--gray-200)' }}>
                  <div style={{ ...cellStyle(COL_NOMBRE, true), background: '#FAFAFA', borderRight: '2px solid var(--gray-200)' }} />
                  <div style={{ width: TABLE_W - COL_NOMBRE, flexShrink: 0, background: '#FAFAFA' }} />
                  <div style={{ flex: 1, minWidth: timelineW, position: 'relative', background: '#FAFAFA', overflow: 'hidden' }}>
                    {weekBlocks.map((wb, i) => (
                      <div key={i} style={{ position: 'absolute', left: wb.left, width: wb.width, top: 0, bottom: 0, borderLeft: '1px solid var(--gray-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {wb.width > 12 && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--gray-400)' }}>{wb.label}</span>}
                      </div>
                    ))}
                  </div>
                  {structuralMode && <div style={{ width: 32, background: '#FAFAFA' }} />}
                </div>
              )
            }
          })()}
        </div>
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
                    <button onClick={() => onAddSubtarea(etapa)} style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>+ Nueva subetapa</button>
                  </div>
                )}
              </div>
            )
          })}
          {(() => {
            const visibleRows = []
            etapas.forEach(etapa => {
              visibleRows.push(etapa)
              if (expandedEtapas.has(etapa.id)) tareas.filter(t => t.parentId === etapa.id).forEach(h => visibleRows.push(h))
            })
            const rowIdx = {}
            visibleRows.forEach((t, i) => { rowIdx[t.id] = i })
            const arrows = tareas.filter(t => t.dependeDeId && rowIdx[t.id] !== undefined && rowIdx[t.dependeDeId] !== undefined)
            if (!arrows.length) return null
            const svgH = visibleRows.length * ROW_H
            return (
              <svg style={{ position: 'absolute', top: 0, left: TABLE_W, pointerEvents: 'none', overflow: 'visible', zIndex: 5 }} width={timelineW} height={svgH}>
                {arrows.map(dep => {
                  const pred = tareas.find(t => t.id === dep.dependeDeId)
                  if (!pred) return null
                  const x1 = toPx(pred.fechaFin) + ppd, x2 = toPx(dep.fechaInicio)
                  const y1 = rowIdx[pred.id] * ROW_H + ROW_H / 2, y2 = rowIdx[dep.id] * ROW_H + ROW_H / 2
                  const path = `M ${x1} ${y1} L ${x1 + 10} ${y1} L ${x1 + 10} ${y2} L ${x2} ${y2}`
                  return (
                    <g key={`${pred.id}-${dep.id}`}>
                      <path d={path} fill="none" stroke="#F97316" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.7} />
                      <polygon points={`${x2},${y2} ${x2 - 7},${y2 - 4} ${x2 - 7},${y2 + 4}`} fill="#F97316" opacity={0.7} />
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

function ModalCertificado({ tareas, certificados, numero, teamMembers, editCert, onClose, onGuardar }) {
  const etapas = tareas.filter(t => t.parentId === null && calcTotalEtapa(t) > 0)
  const [fecha,         setFecha]         = useState(editCert?.fecha ?? new Date().toISOString().slice(0, 10))
  const [responsable,   setResponsable]   = useState(editCert?.responsable ?? '')
  const [observaciones, setObservaciones] = useState(editCert?.observaciones ?? '')
  const [incluidas,     setIncluidas]     = useState(() => editCert
    ? new Set((editCert.etapas || []).map(e => e.tareaId))
    : new Set(etapas.map(t => t.id)))
  const [montos,        setMontos]        = useState(() => editCert
    ? Object.fromEntries((editCert.etapas || []).map(e => [e.tareaId, e.montoPagado ? Number(e.montoPagado).toLocaleString('es-AR') : '']))
    : {})
  const [errorModal,    setErrorModal]    = useState(null)

  const certsParaValidacion = editCert ? certificados.filter(c => c.id !== editCert.id) : certificados

  const toggleIncluida = (id) => setIncluidas(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })

  const setMonto = (id, raw) => {
    const num = raw.replace(/\D/g, '')
    setMontos(prev => ({ ...prev, [id]: num ? Number(num).toLocaleString('es-AR') : '' }))
  }

  const totalCertificado = [...incluidas].reduce((s, id) => s + parseMiles(montos[id] || ''), 0)
  const inputStyle = { width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--gray-200)', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }

  const handleGuardar = () => {
    const excedentes = [...incluidas].filter(id => {
      const etapa  = tareas.find(t => t.id === id)
      const total  = calcTotalEtapa(etapa)
      const pagado = calcPagadoAcumulado(id, certsParaValidacion)
      const saldo  = total - pagado
      const monto  = parseMiles(montos[id] || '')
      return monto > saldo
    })
    if (excedentes.length > 0) {
      setErrorModal(excedentes.map(id => tareas.find(t => t.id === id)?.nombre).join(', '))
      return
    }
    const etapasCert = [...incluidas].map(id => ({
      tareaId:     id,
      nombreTarea: tareas.find(t => t.id === id)?.nombre || '',
      montoPagado: parseMiles(montos[id] || ''),
      totalEtapa:  calcTotalEtapa(tareas.find(t => t.id === id)),
    }))
    if (editCert) {
      onGuardar({ ...editCert, fecha, responsable, observaciones, totalCertificado, etapas: etapasCert, editadoEn: Date.now() })
    } else {
      onGuardar({ id: `cert-${Date.now()}`, numero, fecha, responsable, observaciones, totalCertificado, etapas: etapasCert })
    }
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 680, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 900, color: 'var(--gray-900)', marginBottom: 2 }}>{editCert ? `Editar certificado #${editCert.numero ?? numero}` : `Certificado de pago #${numero}`}</h2>
            <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>{editCert ? 'Modificá los montos y datos del certificado' : 'Seleccioná las etapas e ingresá los montos abonados'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)', padding: '4px 8px' }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 5 }}>Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 5 }}>Responsable</label>
              <select value={responsable} onChange={e => setResponsable(e.target.value)} style={inputStyle}>
                <option value="">— Seleccionar —</option>
                {(teamMembers || []).map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ background: 'linear-gradient(135deg, #EFF6FF, #DBEAFE)', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', marginBottom: 2 }}>Total este certificado</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#1D4ED8' }}>{fmtPesos(totalCertificado)}</div>
            </div>
            <div style={{ fontSize: 32 }}>📋</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Etapas ({etapas.length})</div>
          {etapas.length === 0 && <div style={{ fontSize: 13, color: 'var(--gray-400)', textAlign: 'center', padding: '20px 0' }}>No hay etapas con presupuesto cargado</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {etapas.map(etapa => {
              const total     = calcTotalEtapa(etapa)
              const pagado    = calcPagadoAcumulado(etapa.id, certsParaValidacion)
              const saldo     = total - pagado
              const estaInc   = incluidas.has(etapa.id)
              const montoPag  = parseMiles(montos[etapa.id] || '')
              const saldoTras = saldo - montoPag
              return (
                <div key={etapa.id} style={{ border: `1.5px solid ${estaInc ? '#BFDBFE' : 'var(--gray-200)'}`, borderRadius: 10, overflow: 'hidden', background: estaInc ? '#F0F9FF' : '#FAFAFA' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
                    <input type="checkbox" checked={estaInc} onChange={() => toggleIncluida(etapa.id)} style={{ width: 16, height: 16, accentColor: '#3B82F6', flexShrink: 0, cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-800)' }}>{etapa.nombre}</div>
                      <div style={{ display: 'flex', gap: 12, marginTop: 3, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 10, color: 'var(--gray-500)' }}>Contrato: <strong>{fmtPesos(total)}</strong></span>
                        <span style={{ fontSize: 10, color: '#10B981' }}>Pagado: <strong>{fmtPesos(pagado)}</strong></span>
                        <span style={{ fontSize: 10, color: saldo > 0 ? '#F97316' : '#10B981', fontWeight: 700 }}>Saldo: {fmtPesos(saldo)}</span>
                      </div>
                    </div>
                  </div>
                  {estaInc && (
                    <div style={{ padding: '0 14px 12px', borderTop: '1px solid #DBEAFE' }}>
                      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', marginBottom: 5, marginTop: 10 }}>Monto a pagar en este certificado</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--gray-500)', fontWeight: 600, pointerEvents: 'none' }}>$</span>
                        <input type="text" inputMode="numeric" style={{ ...inputStyle, paddingLeft: 24 }} placeholder="0" value={montos[etapa.id] || ''} onChange={e => setMonto(etapa.id, e.target.value)} />
                      </div>
                      {montoPag > 0 && (
                        <div style={{ marginTop: 6, fontSize: 11, color: saldoTras >= 0 ? '#10B981' : '#DC2626', fontWeight: 700 }}>
                          {saldoTras >= 0 ? `Saldo restante tras este pago: ${fmtPesos(saldoTras)}` : `⚠ Excede el saldo disponible en ${fmtPesos(Math.abs(saldoTras))}`}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Observaciones</label>
              <span style={{ fontSize: 11, color: observaciones.length > 450 ? '#DC2626' : 'var(--gray-400)' }}>{observaciones.length}/500</span>
            </div>
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value.slice(0, 500))} rows={3}
              placeholder="Notas sobre el pago, condiciones, referencias…"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', color: 'var(--gray-700)' }} />
          </div>
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-700)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>Cancelar</button>
          <button onClick={handleGuardar} disabled={totalCertificado === 0}
            style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: totalCertificado > 0 ? (editCert ? '#E8641A' : '#3B82F6') : 'var(--gray-200)', color: totalCertificado > 0 ? 'white' : 'var(--gray-400)', cursor: totalCertificado > 0 ? 'pointer' : 'default', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', boxShadow: totalCertificado > 0 ? `0 2px 8px ${editCert ? 'rgba(232,100,26,0.4)' : 'rgba(59,130,246,0.4)'}` : 'none' }}>
            {editCert ? 'Guardar cambios' : 'Guardar certificado'}
          </button>
        </div>
      </div>
      {errorModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 16, maxWidth: 420, width: '100%', padding: 32, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>⚠️</div>
            <h3 style={{ fontSize: 17, fontWeight: 800, color: '#DC2626', marginBottom: 10 }}>Monto supera el presupuesto</h3>
            <p style={{ fontSize: 13, color: 'var(--gray-600)', lineHeight: 1.6, marginBottom: 24 }}>El monto a pagar supera el presupuesto total disponible en: <strong>{errorModal}</strong></p>
            <button onClick={() => setErrorModal(null)} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#DC2626', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' }}>Revisar montos</button>
          </div>
        </div>
      )}
    </div>
  )
}

function HistorialCertificados({ certificados, isEditor, onEditar, onEliminarCertificado }) {
  const [expandedIds,    setExpandedIds]    = useState(new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  if (!certificados || !certificados.length) return null
  const toggle = (id) => setExpandedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--gray-800)' }}>Certificados de pago</span>
        <span style={{ fontSize: 12, fontWeight: 700, background: '#EFF6FF', padding: '2px 10px', borderRadius: 99, color: '#3B82F6' }}>{certificados.length}</span>
      </div>
      {[...certificados].reverse().map((cert, revIdx) => {
        const isExpanded = expandedIds.has(cert.id)
        const num = cert.numero ?? (certificados.length - revIdx)
        return (
          <div key={cert.id} style={{ border: '1px solid #BFDBFE', borderRadius: 10, marginBottom: 8, overflow: 'hidden', background: 'white' }}>
            <div onClick={() => toggle(cert.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F0F9FF'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#3B82F6', color: 'white', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>#{num}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray-800)' }}>Certificado #{num}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmtLong(cert.fecha)} · {cert.responsable}</div>
              </div>
              <div style={{ textAlign: 'right', marginRight: 8, flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: '#1D4ED8' }}>{fmtPesos(cert.totalCertificado)}</div>
                  {cert.editadoEn && <span style={{ fontSize: 9, fontWeight: 700, color: '#E8641A', background: '#FFF3EB', border: '1px solid #F28C4E', borderRadius: 4, padding: '1px 5px' }}>editado</span>}
                </div>
                <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>{(cert.etapas || []).length} etapa{(cert.etapas || []).length !== 1 ? 's' : ''}</div>
              </div>
              {isEditor && onEditar && (
                <button onClick={e => { e.stopPropagation(); onEditar(cert) }}
                  style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid #E0DDD8', background: 'white', color: '#E8641A', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                  ✏ Editar
                </button>
              )}
              {isEditor && onEliminarCertificado && (
                <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(cert.id) }}
                  style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #FCA5A5', background: 'white', color: '#C0392B', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, lineHeight: 1 }}>
                  🗑
                </button>
              )}
              <span style={{ fontSize: 10, color: 'var(--gray-400)', transition: 'transform 0.15s', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>▶</span>
            </div>
            {isExpanded && (
              <div style={{ borderTop: '1px solid #DBEAFE', padding: '14px 16px', background: '#F0F9FF' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: cert.observaciones ? 14 : 0 }}>
                  {(cert.etapas || []).map(e => {
                    let avBefore = null
                    if (e.avanceCargado != null) {
                      const certIdx = certificados.findIndex(c => c.id === cert.id)
                      avBefore = 0
                      for (let j = 0; j < certIdx; j++) {
                        const prevE = (certificados[j].etapas || []).find(pe => pe.tareaId === e.tareaId)
                        if (prevE?.avanceCargado != null) avBefore = Math.min(100, avBefore + prevE.avanceCargado)
                      }
                    }
                    const avAfter = avBefore != null ? Math.min(100, avBefore + e.avanceCargado) : null
                    return (
                      <div key={e.tareaId} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'white', borderRadius: 7, border: '1px solid #DBEAFE' }}>
                        <span style={{ flex: 1, fontSize: 12, color: 'var(--gray-700)', fontWeight: 600 }}>{e.nombreTarea}</span>
                        {avBefore != null && (
                          <span style={{ fontSize: 11, color: '#3B82F6', fontWeight: 700, background: '#EFF6FF', borderRadius: 4, padding: '2px 7px', flexShrink: 0 }}>
                            {avBefore}% → {avAfter}%
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--gray-500)', flexShrink: 0 }}>Contrato: {fmtPesos(e.totalEtapa)}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#1D4ED8', flexShrink: 0 }}>{fmtPesos(e.montoPagado)}</span>
                      </div>
                    )
                  })}
                </div>
                {cert.observaciones && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase', marginBottom: 5 }}>Observaciones</div>
                    <p style={{ fontSize: 12, color: 'var(--gray-700)', lineHeight: 1.6, margin: 0 }}>{cert.observaciones}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 14, maxWidth: 380, width: '100%', padding: '28px 24px', boxShadow: '0 16px 48px rgba(0,0,0,0.2)', border: '1px solid #E0DDD8', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🗑</div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A', marginBottom: 8 }}>¿Eliminar certificado?</h3>
            <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6, marginBottom: 24 }}>Esta acción no se puede deshacer. El certificado se eliminará del historial.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDeleteId(null)}
                style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #E0DDD8', background: 'white', color: '#444', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={() => { onEliminarCertificado(confirmDeleteId); setConfirmDeleteId(null) }}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#C0392B', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function HistorialInformes({ informes, tareas, onEditar, onEliminarInforme, isEditor }) {
  const [expandedIds,     setExpandedIds]     = useState(new Set())
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  if (!informes || !informes.length) return null
  const toggle = (id) => setExpandedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
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
            <div onClick={() => toggle(informe.id)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
              onMouseLeave={e => e.currentTarget.style.background = 'white'}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--orange)', color: 'white', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>#{num}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray-800)' }}>Informe #{num}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmtLong(informe.fecha)} · {informe.responsable}</div>
              </div>
              <div style={{ textAlign: 'right', marginRight: 8, flexShrink: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: progressColor(avGen) }}>{avGen}%</div>
                <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>{avAnt}% → {avGen}%</div>
              </div>
              {isEditor && (
                <button onClick={e => { e.stopPropagation(); onEditar(informe) }}
                  style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-700)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
                  Editar
                </button>
              )}
              {isEditor && onEliminarInforme && (
                <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(informe.id) }}
                  style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #FCA5A5', background: 'white', color: '#C0392B', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, lineHeight: 1 }}>
                  🗑
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
                {informe.observaciones && (
                  <div style={{ marginTop: avancesTareas.length > 0 ? 12 : 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Observaciones</div>
                    <p style={{ fontSize: 12, color: 'var(--gray-700)', lineHeight: 1.6, margin: 0 }}>{informe.observaciones}</p>
                  </div>
                )}
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
      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 14, maxWidth: 380, width: '100%', padding: '28px 24px', boxShadow: '0 16px 48px rgba(0,0,0,0.2)', border: '1px solid #E0DDD8', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🗑</div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A', marginBottom: 8 }}>¿Eliminar informe?</h3>
            <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6, marginBottom: 24 }}>El informe se eliminará y el avance de las tareas se recalculará desde los informes restantes.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDeleteId(null)}
                style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #E0DDD8', background: 'white', color: '#444', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={() => { onEliminarInforme(confirmDeleteId); setConfirmDeleteId(null) }}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#C0392B', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

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
  const [fecha, setFecha]                 = useState(informe.fecha || '')
  const [responsable, setResponsable]     = useState(informe.responsable || '')
  const [observaciones, setObservaciones] = useState(informe.observaciones || '')
  const [fotos, setFotos] = useState(() => { const f = [...(informe.fotos || [])]; while (f.length < 3) f.push(null); return f })
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
  const setVal = (id, raw) => setEditValues(prev => ({ ...prev, [id]: Math.max(0, Math.min(100, Number(raw) || 0)) }))
  const handleFoto = (idx, e) => {
    const file = e.target.files[0]; if (!file) return
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
    const avancesTareas = tareas.filter(t => getVal(t.id) !== t.avanceActual).map(t => ({ tareaId: t.id, nombreTarea: t.nombre, avanceAnterior: t.avanceActual, avanceNuevo: getVal(t.id) }))
    onSave({ ...informe, fecha, responsable, observaciones, fotos: fotos.filter(Boolean), avanceGeneral, avancesTareas }, tareasActualizadas)
    onClose()
  }
  const avAntOriginal = informe.avanceGeneralAnterior ?? informe.avanceAnterior ?? 0
  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 700, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 900, color: 'var(--gray-900)', marginBottom: 2 }}>Editar informe #{informe.numero ?? '—'}</h2>
            <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>{fmtLong(informe.fecha)}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)', padding: '4px 8px' }}>×</button>
        </div>
        {!isLastInforme && (
          <div style={{ margin: '14px 24px 0', padding: '10px 14px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>⚠️</span>
            <span style={{ fontSize: 12, color: '#92400E', lineHeight: 1.5 }}>Este no es el informe más reciente. Al guardar, el avance actual se actualizará con estos valores.</span>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
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
          <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px', background: 'var(--gray-100)', borderBottom: '1px solid var(--gray-200)' }}>
              {['Tarea / Etapa', 'Avance actual', 'Nuevo %'].map(h => (
                <div key={h} style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
              ))}
            </div>
            {etapas.map(etapa => {
              const hijos    = tareas.filter(t => t.parentId === etapa.id)
              const hasHijos = hijos.length > 0
              const avEtapa  = getAvanceEtapa(etapa.id)
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
                        <input type="number" min={0} max={100} value={editValues[etapa.id] ?? etapa.avanceActual} onChange={e => setVal(etapa.id, e.target.value)}
                          style={{ width: 60, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--gray-200)', fontSize: 12, fontFamily: 'inherit', textAlign: 'center' }} />
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
                        <input type="number" min={0} max={100} value={editValues[hijo.id] ?? hijo.avanceActual} onChange={e => setVal(hijo.id, e.target.value)}
                          style={{ width: 60, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--gray-200)', fontSize: 12, fontFamily: 'inherit', textAlign: 'center' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Observaciones del informe</label>
              <span style={{ fontSize: 11, color: observaciones.length > 450 ? '#DC2626' : 'var(--gray-400)' }}>{observaciones.length}/500</span>
            </div>
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value.slice(0, 500))} rows={3}
              placeholder="Comentarios sobre el avance, novedades de obra, inconvenientes…"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', color: 'var(--gray-700)' }} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Adjuntar fotos (máx. 3)</label>
            <div style={{ display: 'flex', gap: 12 }}>
              {fotos.map((foto, idx) => (
                <div key={idx}>
                  <input ref={fileRefs[idx]} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => handleFoto(idx, e)} />
                  <div onClick={() => { if (!foto) fileRefs[idx].current?.click() }}
                    style={{ width: 100, height: 100, borderRadius: 10, border: foto ? 'none' : '2px dashed var(--gray-300)', background: foto ? 'transparent' : 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: foto ? 'default' : 'pointer', overflow: 'hidden', position: 'relative' }}>
                    {foto ? (
                      <>
                        <img src={foto.url} alt={foto.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button onClick={e => { e.stopPropagation(); setFotos(prev => { const arr = [...prev]; arr[idx] = null; return arr }) }}
                          style={{ position: 'absolute', top: 4, right: 4, width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, lineHeight: 1 }}>×</button>
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
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-700)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>Cancelar</button>
          <button onClick={handleSave} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--orange)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(249,115,22,0.4)' }}>Guardar cambios</button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onCrear, isEditor }) {
  return (
    <div style={{ padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 14 }}>📅</div>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--gray-800)', marginBottom: 8 }}>Esta obra no tiene cronograma</h3>
      <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 24, lineHeight: 1.6, maxWidth: 340, margin: '0 auto 24px' }}>
        {isEditor ? 'Creá el cronograma usando una plantilla prediseñada o desde cero.' : 'Aún no se ha creado un cronograma para esta obra.'}
      </p>
      {isEditor && (
        <button onClick={onCrear} style={{ padding: '11px 28px', borderRadius: 10, border: 'none', background: 'var(--orange)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 3px 10px rgba(249,115,22,0.4)' }}>
          📋 Crear cronograma
        </button>
      )}
    </div>
  )
}

function ModalEliminarCronograma({ nombre, onConfirm, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 16, maxWidth: 420, width: '100%', padding: 32, textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: 44, marginBottom: 14 }}>🗑️</div>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 10 }}>Eliminar cronograma</h3>
        <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 6 }}>¿Estás seguro que querés eliminar <strong>"{nombre}"</strong>?</p>
        <p style={{ color: 'var(--gray-400)', fontSize: 13, marginBottom: 28 }}>Esta acción no se puede deshacer.</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onClose} style={{ padding: '11px 24px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-700)', cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'inherit' }}>Cancelar</button>
          <button onClick={onConfirm} style={{ padding: '11px 24px', borderRadius: 8, border: 'none', background: 'var(--red)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' }}>Eliminar</button>
        </div>
      </div>
    </div>
  )
}

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
              <span style={{ marginLeft: 8, fontWeight: 700, color: delta > 0 ? '#DC2626' : '#10B981' }}>{delta > 0 ? `+${delta}` : delta} días</span>
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
          <button onClick={onDismiss} style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-700)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>No aplicar</button>
          <button onClick={onApply} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: 'var(--orange)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(249,115,22,0.4)' }}>Aplicar corrimiento automático</button>
        </div>
      </div>
    </div>
  )
}

export default function CronogramaTab({ project, cronogramas, teamMembers, onCreateCronograma, onSaveCronograma, onCargarAvance, onDeleteCronograma, onEditarInforme, isEditor, proyectosArmar }) {
  const [selectedId,      setSelectedId]      = useState(() => cronogramas[0]?.id || null)
  const [toast,           setToast]           = useState('')
  const [showCrearModal,  setShowCrearModal]   = useState(false)
  const [showAvanceModal, setShowAvanceModal]  = useState(false)
  const [showCertModal,   setShowCertModal]    = useState(false)
  const [structuralMode,  setStructuralMode]   = useState(false)
  const [editingTarea,    setEditingTarea]     = useState(null)
  const [editingInforme,  setEditingInforme]   = useState(null)
  const [editingCert,     setEditingCert]      = useState(null)
  const [showDeleteModal, setShowDeleteModal]  = useState(false)
  const [cascadeData,     setCascadeData]      = useState(null)
  const [zoomIdx,         setZoomIdx]          = useState(1)
  const [exportando,      setExportando]       = useState(false)
  const ganttRef = useRef(null)

  const ppd       = PPD_LEVELS[zoomIdx].val
  const zoomLabel = PPD_LEVELS[zoomIdx].label

  const prevLen = useRef(cronogramas.length)
  useEffect(() => {
    if (cronogramas.length > prevLen.current) setSelectedId(cronogramas[cronogramas.length - 1].id)
    else if (cronogramas.length > 0 && !cronogramas.find(c => c.id === selectedId)) setSelectedId(cronogramas[0].id)
    prevLen.current = cronogramas.length
  }, [cronogramas])

  const handleCreateCronogramaLocal = async (data) => {
    onCreateCronograma(project.id, data)
    setShowCrearModal(false)
    if (project.proyectoArmarId) {
      const items = await loadChecklistItems(project.proyectoArmarId)
      const targets = items.filter(it => it.titulo?.toLowerCase().includes('cronograma') && it.estado !== 'aprobado')
      if (targets.length > 0) await Promise.all(targets.map(it => upsertChecklistItem({ ...it, estado: 'aprobado' })))
      setToast('Checklist actualizado: ítems de Cronograma marcados como aprobados')
      setTimeout(() => setToast(''), 3500)
    }
  }

  const handleCargarAvanceLocal = async (pid, cronId, informe, tareasActualizadas, certData) => {
    onCargarAvance(pid, cronId, informe, tareasActualizadas, certData)
    setShowAvanceModal(false)
    if (project.proyectoArmarId) {
      const items = await loadChecklistItems(project.proyectoArmarId)
      const lc = s => s?.toLowerCase() || ''
      const targets = items.filter(it => (lc(it.titulo).includes('avance') || lc(it.titulo).includes('informe')) && it.estado !== 'aprobado')
      if (targets.length > 0) await Promise.all(targets.map(it => upsertChecklistItem({ ...it, estado: 'en_curso' })))
      setToast('Checklist actualizado: ítems de Avance/Informe marcados como en curso')
      setTimeout(() => setToast(''), 3500)
    }
  }

  if (!cronogramas.length) {
    return (
      <>
        <EmptyState onCrear={() => setShowCrearModal(true)} isEditor={isEditor} />
        {showCrearModal && <ModalCrearCronograma project={project} teamMembers={teamMembers} onClose={() => setShowCrearModal(false)} onCrear={handleCreateCronogramaLocal} />}
        {toast && <div style={{ position: 'fixed', bottom: 28, right: 28, background: '#1A1A1A', color: 'white', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>{toast}</div>}
      </>
    )
  }

  const cronograma    = cronogramas.find(c => c.id === selectedId) || cronogramas[0]
  const tareas        = cronograma?.tareas || []
  const informes      = cronograma?.informes || []
  const certificados  = cronograma?.certificados || []
  const avanceGeneral = calcAvanceGeneral(tareas)

  const handleSaveTareaFromModal = (updatedTarea) => {
    const oldTarea = tareas.find(t => t.id === updatedTarea.id)
    if (!oldTarea) {
      const newId = Math.max(...tareas.map(t => t.id), 0) + 1
      onSaveCronograma(project.id, cronograma.id, { tareas: [...tareas, { ...updatedTarea, id: newId, obraId: project.id }] })
      setEditingTarea(null); return
    }
    const datesChanged = oldTarea.fechaFin !== updatedTarea.fechaFin || oldTarea.fechaInicio !== updatedTarea.fechaInicio || oldTarea.duracionDias !== updatedTarea.duracionDias
    if (datesChanged) {
      const { impactados, updatedMap } = computeCascade(tareas, updatedTarea)
      if (impactados.length > 0) {
        const allForFin = tareas.map(t => updatedMap.has(t.id) ? updatedMap.get(t.id) : t)
        const nuevaFechaFinObra = allForFin.filter(t => t.fechaFin).reduce((max, t) => t.fechaFin > max ? t.fechaFin : max, '')
        setCascadeData({ originalEdit: updatedTarea, updatedTarea: { ...updatedTarea, fechaFinAnterior: oldTarea.fechaFin }, impactados, updatedMap, tieneCriticas: impactados.some(i => i.esCritica), nuevaFechaFinObra })
        setEditingTarea(null); return
      }
    }
    onSaveCronograma(project.id, cronograma.id, { tareas: tareas.map(t => t.id === updatedTarea.id ? updatedTarea : t) })
    setEditingTarea(null)
  }

  const handleApplyCascade = () => {
    const { originalEdit, updatedMap } = cascadeData
    onSaveCronograma(project.id, cronograma.id, { tareas: tareas.map(t => t.id === originalEdit.id ? originalEdit : updatedMap.has(t.id) ? updatedMap.get(t.id) : t) })
    setCascadeData(null)
  }

  const handleDismissCascade = () => {
    onSaveCronograma(project.id, cronograma.id, { tareas: tareas.map(t => t.id === cascadeData.originalEdit.id ? cascadeData.originalEdit : t) })
    setCascadeData(null)
  }

  const handleDeleteTarea = (id) => {
    const tareasRestantes = tareas.filter(t => t.id !== id && t.parentId !== id)
    const tareasFinales = tareasRestantes.map(t =>
      t.dependeDeId === id ? { ...t, dependeDeId: null } : t
    )
    onSaveCronograma(project.id, cronograma.id, { tareas: tareasFinales })
    setEditingTarea(null)
  }

  const handleAddSubtarea = (parentEtapa) => setEditingTarea({
    id: null, parentId: parentEtapa.id, obraId: project.id,
    nombre: '', tipo: 'subtarea', fechaInicio: parentEtapa.fechaInicio || '',
    duracionDias: 5, pesoRelativo: 10, avanceActual: 0, estado: 'Pendiente',
    dependeDeId: null, tipoVinculo: 'Fin a inicio', desfaseDias: 0, esCritica: false, adicionales: [],
  })

  const handleEditarInformeLocal = (updatedInforme, tareasActualizadas) =>
    onEditarInforme(project.id, cronograma.id, updatedInforme.id, updatedInforme, tareasActualizadas)

  const handleGuardarCertificado = (cert) =>
    onSaveCronograma(project.id, cronograma.id, { certificados: [...certificados, cert] })

  const handleEditarCertificado = (updatedCert) =>
    onSaveCronograma(project.id, cronograma.id, { certificados: certificados.map(c => c.id === updatedCert.id ? updatedCert : c) })

  const handleEliminarCertificado = (certId) => {
    const certsRestantes = certificados.filter(c => c.id !== certId)
    const deletedCert = certificados.find(c => c.id === certId)
    const anyHasAvance = (deletedCert?.etapas || []).some(e => e.avanceCargado != null) ||
                         certsRestantes.some(c => (c.etapas || []).some(e => e.avanceCargado != null))
    if (anyHasAvance) {
      const avanceMap = {}
      tareas.forEach(t => { avanceMap[t.id] = 0 })
      certsRestantes.forEach(cert => {
        (cert.etapas || []).forEach(e => {
          if (e.avanceCargado != null) avanceMap[e.tareaId] = Math.min(100, (avanceMap[e.tareaId] || 0) + e.avanceCargado)
        })
      })
      const tareasActualizadas = tareas.map(t => ({ ...t, avanceActual: avanceMap[t.id] ?? 0 }))
      onSaveCronograma(project.id, cronograma.id, { certificados: certsRestantes, tareas: tareasActualizadas })
    } else {
      onSaveCronograma(project.id, cronograma.id, { certificados: certsRestantes })
    }
  }

  const handleEliminarInforme = (informeId) => {
    const informesRestantes = informes.filter(i => i.id !== informeId)
    const avanceMap = {}
    tareas.forEach(t => { avanceMap[t.id] = 0 })
    informesRestantes.forEach(inf => {
      (inf.avancesTareas || []).forEach(at => { avanceMap[at.tareaId] = at.avanceNuevo })
    })
    const tareasActualizadas = tareas.map(t => ({ ...t, avanceActual: avanceMap[t.id] ?? 0 }))
    onSaveCronograma(project.id, cronograma.id, { informes: informesRestantes, tareas: tareasActualizadas })
  }

  const exportarPDF = async () => {
    setExportando(true)
    try {
      const { jsPDF } = await import('jspdf')
      const html2canvas = (await import('html2canvas')).default
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth(), pageH = pdf.internal.pageSize.getHeight(), mg = 14
      let y = mg
      pdf.setFontSize(15); pdf.setFont('helvetica', 'bold'); pdf.text(project.name || '—', mg, y); y += 7
      pdf.setFontSize(9); pdf.setFont('helvetica', 'normal')
      const col2 = pageW / 2
      pdf.text(`Ubicación: ${project.location || '—'}`, mg, y); pdf.text(`Responsable: ${project.responsible || '—'}`, col2, y); y += 5
      pdf.text(`Inicio: ${fmtLong(project.startDate)}`, mg, y); pdf.text(`Fin estimado: ${fmtLong(project.endDate)}`, col2, y); y += 5
      pdf.text(`Estado: ${project.status || '—'}`, mg, y); pdf.text(`Avance actual: ${avanceGeneral}%`, col2, y); y += 5
      pdf.setDrawColor(220, 220, 220); pdf.line(mg, y, pageW - mg, y); y += 5
      const scrollContainer = ganttRef.current?.querySelector('[data-gantt-scroll]')
      const contentEl = ganttRef.current?.querySelector('[data-gantt-content]')
      if (scrollContainer && contentEl) {
        scrollContainer.scrollLeft = 0
        await new Promise(r => setTimeout(r, 150))
        const fullWidth = scrollContainer.scrollWidth
        const prevOverflow = scrollContainer.style.overflowX
        scrollContainer.style.overflowX = 'visible'
        const hiddenEls = Array.from(contentEl.querySelectorAll('*')).filter(el => el.style.overflow === 'hidden' || el.style.overflowX === 'hidden' || el.style.overflowY === 'hidden')
        const saved = hiddenEls.map(el => ({ el, overflow: el.style.overflow, overflowX: el.style.overflowX, overflowY: el.style.overflowY }))
        hiddenEls.forEach(el => { if (el.style.overflow === 'hidden') el.style.overflow = 'visible'; if (el.style.overflowX === 'hidden') el.style.overflowX = 'visible'; if (el.style.overflowY === 'hidden') el.style.overflowY = 'visible' })
        const canvas = await html2canvas(contentEl, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, width: fullWidth, windowWidth: fullWidth })
        scrollContainer.style.overflowX = prevOverflow
        saved.forEach(({ el, overflow, overflowX, overflowY }) => { el.style.overflow = overflow; el.style.overflowX = overflowX; el.style.overflowY = overflowY })
        const imgW = pageW - mg * 2, imgH = Math.min(pageH - y - mg, (canvas.height * imgW) / canvas.width)
        pdf.addImage(canvas.toDataURL('image/jpeg', 0.85), 'JPEG', mg, y, imgW, imgH)
      }
      pdf.save(`Cronograma_${(project.name || 'obra').replace(/[^\w\s]/g, '').trim()}.pdf`)
    } catch (err) { console.error('Error exportando PDF:', err) }
    finally { setExportando(false) }
  }

  const btnStyle = (orange = false, danger = false, blue = false) => ({
    padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    border: orange ? 'none' : blue ? 'none' : danger ? '1px solid #FECACA' : '1px solid var(--gray-200)',
    background: orange ? 'var(--orange)' : blue ? '#3B82F6' : danger ? '#FFF5F5' : 'white',
    color: orange ? 'white' : blue ? 'white' : danger ? 'var(--red)' : 'var(--gray-700)',
    boxShadow: orange ? '0 2px 6px rgba(249,115,22,0.35)' : blue ? '0 2px 6px rgba(59,130,246,0.35)' : 'none',
  })

  const zoomBtnStyle = (disabled) => ({
    width: 26, height: 26, borderRadius: 6, border: '1px solid var(--gray-200)',
    background: disabled ? 'var(--gray-100)' : 'white', color: disabled ? 'var(--gray-300)' : 'var(--gray-600)',
    cursor: disabled ? 'default' : 'pointer', fontWeight: 700, fontSize: 14,
    fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
        {cronogramas.map(c => (
          <button key={c.id} onClick={() => setSelectedId(c.id)} style={{
            padding: '7px 16px', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0,
            border: c.id === cronograma.id ? 'none' : '1px solid var(--gray-200)',
            background: c.id === cronograma.id ? 'var(--orange)' : 'white',
            color: c.id === cronograma.id ? 'white' : 'var(--gray-600)',
            boxShadow: c.id === cronograma.id ? '0 2px 6px rgba(249,115,22,0.35)' : 'none',
          }}>{c.nombre}</button>
        ))}
        {isEditor && <button onClick={() => setShowCrearModal(true)} style={{ padding: '6px 12px', borderRadius: 7, border: '1px dashed var(--gray-300)', background: 'white', color: 'var(--gray-500)', fontSize: 16, cursor: 'pointer', fontWeight: 700, flexShrink: 0 }} title="Nuevo cronograma">+</button>}
      </div>

      {project.proyectoArmarId && (() => {
        const pa = (proyectosArmar || []).find(pa => pa.id === project.proyectoArmarId)
        if (!pa) return null
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '3px 10px', borderRadius: 99, border: '1px solid #BFDBFE' }}>
              Proyecto: {pa.nombre}
            </span>
          </div>
        )
      })()}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {isEditor && (structuralMode ? (
          <button onClick={() => setStructuralMode(false)} style={btnStyle(true)}>✓ Listo</button>
        ) : (
          <>
            <button onClick={() => setShowCrearModal(true)} style={btnStyle()}>📋 Usar plantilla</button>
            <button onClick={() => setStructuralMode(true)} style={btnStyle()}>✏️ Editar estructura</button>
            <button onClick={() => setShowAvanceModal(true)} style={btnStyle(true)}>+ Cargar avance</button>
            <button onClick={() => setShowCertModal(true)} style={btnStyle(false, false, true)}>💳 Certificado de pago</button>
            <button onClick={exportarPDF} disabled={exportando} style={{ ...btnStyle(), opacity: exportando ? 0.6 : 1 }}>{exportando ? 'Exportando…' : '⬇ Exportar PDF'}</button>
            <button onClick={() => setShowDeleteModal(true)} style={btnStyle(false, true)}>🗑 Eliminar cronograma</button>
          </>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--gray-500)', fontWeight: 600, marginRight: 2 }}>Vista: {zoomLabel}</span>
          <button onClick={() => setZoomIdx(i => Math.max(0, i - 1))} disabled={zoomIdx === 0} style={zoomBtnStyle(zoomIdx === 0)} title="Alejar">−</button>
          <button onClick={() => setZoomIdx(i => Math.min(3, i + 1))} disabled={zoomIdx === 3} style={zoomBtnStyle(zoomIdx === 3)} title="Acercar">+</button>
        </div>
      </div>

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
            certificados={certificados}
          />
        </div>
        <StatsPanel tareas={tareas} avanceGeneral={avanceGeneral} informes={informes} certificados={certificados} />
      </div>

      <HistorialInformes informes={informes} tareas={tareas} onEditar={setEditingInforme} onEliminarInforme={isEditor ? handleEliminarInforme : null} isEditor={isEditor} />
      <HistorialCertificados certificados={certificados} isEditor={isEditor} onEditar={isEditor ? setEditingCert : null} onEliminarCertificado={isEditor ? handleEliminarCertificado : null} />

      {showCrearModal && <ModalCrearCronograma project={project} teamMembers={teamMembers} onClose={() => setShowCrearModal(false)} onCrear={handleCreateCronogramaLocal} />}
      {showAvanceModal && <ModalCargarAvance project={project} cronograma={cronograma} numero={informes.length + 1} teamMembers={teamMembers} certificados={certificados} onGuardar={(pid, informe, tareasActualizadas, certData) => handleCargarAvanceLocal(pid, cronograma.id, informe, tareasActualizadas, certData)} onClose={() => setShowAvanceModal(false)} />}
      {toast && <div style={{ position: 'fixed', bottom: 28, right: 28, background: '#1A1A1A', color: 'white', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>{toast}</div>}
      {showCertModal && <ModalCertificado tareas={tareas} certificados={certificados} numero={certificados.length + 1} teamMembers={teamMembers} onClose={() => setShowCertModal(false)} onGuardar={handleGuardarCertificado} />}
      {editingCert && <ModalCertificado tareas={tareas} certificados={certificados} numero={editingCert.numero} teamMembers={teamMembers} editCert={editingCert} onClose={() => setEditingCert(null)} onGuardar={cert => { handleEditarCertificado(cert); setEditingCert(null) }} />}
      {editingTarea && (
        <ModalEditarEtapa
          tarea={editingTarea}
          tareas={tareas}
          onClose={() => setEditingTarea(null)}
          onSave={handleSaveTareaFromModal}
          onAgregarSubetapa={handleAddSubtarea}
          onDelete={handleDeleteTarea}
        />
      )}
      {editingInforme && <ModalEditarInforme informe={editingInforme} tareas={tareas} informes={informes} onClose={() => setEditingInforme(null)} onSave={handleEditarInformeLocal} />}
      {showDeleteModal && <ModalEliminarCronograma nombre={cronograma.nombre} onClose={() => setShowDeleteModal(false)} onConfirm={() => { onDeleteCronograma(project.id, cronograma.id); setShowDeleteModal(false) }} />}
      {cascadeData && <ModalImpacto data={cascadeData} onApply={handleApplyCascade} onDismiss={handleDismissCascade} />}
    </div>
  )
}
