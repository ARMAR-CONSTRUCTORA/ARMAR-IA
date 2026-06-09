import { useState, useRef, useEffect } from 'react'
import { useBreakpoint } from '../hooks/useBreakpoint'

// ── Colores y etiquetas ────────────────────────────────────────────────────
const STATUS_COLORS = {
  activa:    { bar: '#F97316', light: '#FED7AA', border: '#FB923C' },
  terminada: { bar: '#3B82F6', light: '#DBEAFE', border: '#60A5FA' },
  atrasada:  { bar: '#EF4444', light: '#FEE2E2', border: '#F87171' },
}
const STATUS_LABELS = { activa: 'Activa', terminada: 'Terminada', atrasada: 'Atrasada' }

// ── Zoom ───────────────────────────────────────────────────────────────────
const MIN_PPD     = 0.35  // píxeles por día mínimo  → trimestres
const MAX_PPD     = 20    // píxeles por día máximo  → semanas detalladas
const DEFAULT_PPD = 2.5   // inicio                  → meses (~76px/mes)

// Qué escala mostrar según ppd
const getMode = (ppd) => ppd >= 5 ? 'weeks' : ppd >= 1.2 ? 'months' : 'quarters'
const MODE_LABEL = { weeks: 'Semanas', months: 'Meses', quarters: 'Trimestres' }

// ── Generadores de períodos ────────────────────────────────────────────────
function generateWeeks(start, end) {
  const weeks = [], cur = new Date(start)
  const dow = cur.getDay() || 7          // lunes = 1 … domingo = 7
  cur.setDate(cur.getDate() - dow + 1)  // retroceder al lunes
  while (cur <= end) { weeks.push(new Date(cur)); cur.setDate(cur.getDate() + 7) }
  return weeks
}
function generateMonths(start, end) {
  const months = [], cur = new Date(start.getFullYear(), start.getMonth(), 1)
  const last   = new Date(end.getFullYear(), end.getMonth(), 1)
  while (cur <= last) { months.push(new Date(cur)); cur.setMonth(cur.getMonth() + 1) }
  return months
}
function generateQuarters(start, end) {
  const quarters = [], cur = new Date(start.getFullYear(), Math.floor(start.getMonth() / 3) * 3, 1)
  while (cur <= end) { quarters.push(new Date(cur)); cur.setMonth(cur.getMonth() + 3) }
  return quarters
}

function fmtPeriodLabel(date, mode) {
  if (mode === 'weeks')
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
  if (mode === 'months')
    return date.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' })
  return `T${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`
}
function fmtShortDate(str) {
  return new Date(str + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

// ── Componente principal ───────────────────────────────────────────────────
function CronogramasPage({ projects, proyectosArmar }) {
  const { isMobile } = useBreakpoint()
  const [filter, setFilter] = useState('todas')
  const [ppd, setPPD]       = useState(DEFAULT_PPD)

  const scrollRef   = useRef()
  const ppdRef      = useRef(ppd)
  const totalDayRef = useRef(0)
  const labelWRef   = useRef(0)
  ppdRef.current    = ppd                   // siempre actualizado, sin re-render

  // ── Rango de fechas ──────────────────────────────────────────────────────
  const filtered = filter === 'todas' ? projects : projects.filter(p => p.status === filter)
  const base     = filtered.length > 0 ? filtered : projects

  if (!base.length) return (
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--gray-400)' }}>
      No hay obras registradas
    </div>
  )

  const pd = (s) => new Date(s + 'T00:00:00')
  const minDate = new Date(Math.min(...base.map(p => pd(p.startDate))))
  const maxDate = new Date(Math.max(...base.map(p => pd(p.endDate))))
  minDate.setDate(1)
  maxDate.setMonth(maxDate.getMonth() + 1, 0)

  const totalDays      = (maxDate - minDate) / 86400000
  totalDayRef.current  = totalDays

  const today    = new Date()
  const mode     = getMode(ppd)
  const LABEL_W  = isMobile ? 110 : 200
  labelWRef.current = LABEL_W

  const timelineW = totalDays * ppd

  // px desde el inicio del timeline
  const toPx = (date) => Math.max(0, (date - minDate) / 86400000 * ppd)
  const todayX = Math.min(timelineW, Math.max(0, (today - minDate) / 86400000 * ppd))

  // Períodos del encabezado según modo
  const periods = mode === 'weeks'    ? generateWeeks(minDate, maxDate)
                : mode === 'months'   ? generateMonths(minDate, maxDate)
                : generateQuarters(minDate, maxDate)

  const periodLeft  = (p)    => toPx(p)
  const periodWidth = (p, i) => {
    const next = periods[i + 1]
    return Math.max(1, next ? toPx(next) - toPx(p) : timelineW - toPx(p))
  }

  // ── Zoom con rueda del mouse ─────────────────────────────────────────────
  // Ref-callback para evitar closures obsoletas con listeners passivos=false
  const wheelCbRef = useRef()
wheelCbRef.current = (e) => {
  if (!e.ctrlKey && !e.metaKey) return
  e.preventDefault()
  
    const el  = scrollRef.current
    if (!el)  return

    const curPPD   = ppdRef.current
    const curTW    = totalDayRef.current * curPPD
    const lw       = labelWRef.current
    const rect     = el.getBoundingClientRect()

    // Fracción de la línea de tiempo bajo el cursor
    const mouseInTL = e.clientX - rect.left - lw + el.scrollLeft
    const frac      = curTW > 0 ? mouseInTL / curTW : 0

    const factor   = e.deltaY > 0 ? 0.84 : 1.19        // out / in
    const newPPD   = Math.max(MIN_PPD, Math.min(MAX_PPD, curPPD * factor))
    const newTW    = totalDayRef.current * newPPD

    setPPD(newPPD)

    // Ajustar scroll para que el punto bajo el cursor no se mueva
    requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = Math.max(0, frac * newTW - (e.clientX - rect.left - lw))
      }
    })
  }

  // Adjuntar listener una sola vez (passive:false obligatorio para preventDefault)
  useEffect(() => {
    const el  = scrollRef.current
    if (!el)  return
    const fn  = (e) => wheelCbRef.current(e)
    el.addEventListener('wheel', fn, { passive: false })
    return () => el.removeEventListener('wheel', fn)
  }, [])

  const zoomBy = (f) => setPPD(p => Math.max(MIN_PPD, Math.min(MAX_PPD, p * f)))

  // ── Indicador de nivel de zoom (0-1 en escala log) ───────────────────────
  const zoomPct = ((Math.log(ppd) - Math.log(MIN_PPD)) / (Math.log(MAX_PPD) - Math.log(MIN_PPD))) * 100

  const ROW_H    = isMobile ? 48 : 58
  const HEADER_H = 40

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Encabezado de página */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, color: 'var(--gray-900)', letterSpacing: '-0.5px', marginBottom: 4 }}>
          Cronogramas
        </h1>
        <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 16 }}>
          Línea de tiempo · {filtered.length} {filtered.length === 1 ? 'obra' : 'obras'}
        </p>

        {/* Controles: filtros + zoom */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['todas', 'activa', 'terminada', 'atrasada'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '7px 14px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
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

          {/* Control de zoom */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'white', borderRadius: 10, padding: '8px 14px',
            border: '1px solid var(--gray-200)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            {/* Botón − */}
            <button
              onClick={() => zoomBy(0.72)}
              title="Reducir zoom (trimestres)"
              style={{
                width: 30, height: 30, borderRadius: 7, border: '1px solid var(--gray-200)',
                background: 'var(--gray-100)', color: 'var(--gray-700)',
                cursor: 'pointer', fontSize: 18, fontWeight: 700, lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              −
            </button>

            {/* Indicador de escala */}
            <div style={{ textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)', marginBottom: 4 }}>
                {MODE_LABEL[mode]}
              </div>
              {/* Barra de nivel */}
              <div style={{ height: 4, background: 'var(--gray-200)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 99, background: 'var(--orange)',
                  width: `${zoomPct}%`, transition: 'width 0.15s ease',
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3, fontSize: 9, color: 'var(--gray-400)', fontWeight: 500 }}>
                <span>trim.</span><span>meses</span><span>sem.</span>
              </div>
            </div>

            {/* Botón + */}
            <button
              onClick={() => zoomBy(1.38)}
              title="Aumentar zoom (semanas)"
              style={{
                width: 30, height: 30, borderRadius: 7, border: '1px solid var(--gray-200)',
                background: 'var(--gray-100)', color: 'var(--gray-700)',
                cursor: 'pointer', fontSize: 18, fontWeight: 700, lineHeight: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Diagrama Gantt */}
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
          <div
            ref={scrollRef}
            style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
          >
            {/* Ancho exacto = columna de nombres + timeline → activa el scroll */}
            <div style={{ width: LABEL_W + timelineW, minWidth: LABEL_W + timelineW }}>

              {/* ── Encabezado de períodos (sticky top) ─────────────────── */}
              <div style={{
                display: 'flex', height: HEADER_H,
                background: '#F9FAFB',
                borderBottom: '2px solid var(--gray-200)',
                position: 'sticky', top: 0, zIndex: 10,
              }}>
                {/* Celda esquina sticky */}
                <div style={{
                  width: LABEL_W, minWidth: LABEL_W,
                  position: 'sticky', left: 0, zIndex: 11,
                  background: '#F9FAFB',
                  borderRight: '2px solid var(--gray-200)',
                  display: 'flex', alignItems: 'center', paddingLeft: 14,
                  boxShadow: '2px 0 6px rgba(0,0,0,0.06)',
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    Obra
                  </span>
                </div>

                {/* Columnas de períodos — posición absoluta en px */}
                <div style={{ position: 'relative', width: timelineW, flexShrink: 0 }}>
                  {periods.map((p, i) => {
                    const pl = periodLeft(p)
                    const pw = periodWidth(p, i)
                    return (
                      <div key={i} style={{
                        position: 'absolute', left: pl, width: pw,
                        top: 0, bottom: 0,
                        borderLeft: '1px solid var(--gray-200)',
                        display: 'flex', alignItems: 'center',
                        paddingLeft: 5, overflow: 'hidden',
                      }}>
                        {/* Etiqueta aparece sola cuando hay espacio */}
                        {pw > 24 && (
                          <span style={{
                            fontSize: 10, fontWeight: 700, color: 'var(--gray-600)',
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                            whiteSpace: 'nowrap',
                          }}>
                            {fmtPeriodLabel(p, mode)}
                          </span>
                        )}
                      </div>
                    )
                  })}

                  {/* Línea de Hoy en el encabezado */}
                  {todayX > 0 && todayX < timelineW && (
                    <div style={{
                      position: 'absolute', left: todayX, top: 0, bottom: 0, zIndex: 4,
                      borderLeft: '2px solid var(--orange)', pointerEvents: 'none',
                    }} />
                  )}
                </div>
              </div>

              {/* ── Filas de obras ─────────────────────────────────────── */}
              {filtered.map((p, i) => {
                const c      = STATUS_COLORS[p.status]
                const barX   = toPx(pd(p.startDate))
                const barW   = Math.max(4, toPx(pd(p.endDate)) - barX)
                const rowBg  = i % 2 === 0 ? 'white' : '#FAFAFA'
                const proyArmar = p.proyectoArmarId ? (proyectosArmar || []).find(pa => pa.id === p.proyectoArmarId) : null

                return (
                  <div key={p.id} style={{
                    display: 'flex', height: ROW_H,
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--gray-200)' : 'none',
                  }}>
                    {/* Nombre (sticky izquierdo) */}
                    <div style={{
                      width: LABEL_W, minWidth: LABEL_W,
                      position: 'sticky', left: 0, zIndex: 3,
                      background: rowBg,
                      borderRight: '2px solid var(--gray-200)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'center',
                      padding: isMobile ? '8px 10px' : '10px 14px',
                      boxShadow: '2px 0 4px rgba(0,0,0,0.04)',
                    }}>
                      <div style={{
                        fontWeight: 700, color: 'var(--gray-800)', fontSize: isMobile ? 11 : 13,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {p.name}
                      </div>
                      {!isMobile && (
                        <div style={{ color: 'var(--gray-400)', fontSize: 10, marginTop: 3 }}>
                          {fmtShortDate(p.startDate)} → {fmtShortDate(p.endDate)}
                        </div>
                      )}
                      {!isMobile && proyArmar && (
                        <div style={{ fontSize: 9, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', padding: '1px 6px', borderRadius: 4, marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {proyArmar.nombre}
                        </div>
                      )}
                    </div>

                    {/* Área de timeline */}
                    <div style={{ position: 'relative', width: timelineW, flexShrink: 0, background: rowBg }}>

                      {/* Líneas de cuadrícula del período */}
                      {periods.map((period, pi) => (
                        <div key={pi} style={{
                          position: 'absolute', left: periodLeft(period), top: 0, bottom: 0,
                          borderLeft: '1px dashed #EBEBEB', pointerEvents: 'none',
                        }} />
                      ))}

                      {/* Línea de Hoy */}
                      {todayX > 0 && todayX < timelineW && (
                        <div style={{
                          position: 'absolute', left: todayX, top: 0, bottom: 0, zIndex: 3,
                          borderLeft: '2px solid var(--orange)', pointerEvents: 'none',
                        }}>
                          {!isMobile && i === 0 && (
                            <div style={{
                              position: 'absolute', top: 5, left: 5,
                              background: 'var(--orange)', color: 'white',
                              fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 4,
                              whiteSpace: 'nowrap',
                            }}>
                              HOY
                            </div>
                          )}
                        </div>
                      )}

                      {/* Barra Gantt */}
                      <div style={{
                        position: 'absolute', zIndex: 2,
                        left: barX, width: barW,
                        top: '50%', transform: 'translateY(-50%)',
                        height: isMobile ? 20 : 26,
                        borderRadius: 5, background: c.light,
                        border: `1.5px solid ${c.border}`, overflow: 'hidden',
                        transition: 'left 0.12s ease, width 0.12s ease', // suaviza el zoom
                      }}>
                        {/* Relleno de avance */}
                        <div style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0,
                          width: `${p.progress}%`, background: c.bar, opacity: 0.9,
                          borderRadius: '4px 0 0 4px',
                        }} />
                        {/* Texto de avance */}
                        {barW > 28 && (
                          <div style={{
                            position: 'absolute', inset: 0, zIndex: 1,
                            display: 'flex', alignItems: 'center', paddingLeft: 6,
                            fontSize: 10, fontWeight: 700, color: 'white',
                            textShadow: '0 1px 3px rgba(0,0,0,0.5)', whiteSpace: 'nowrap',
                          }}>
                            {p.progress}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Leyenda */}
        <div style={{
          padding: isMobile ? '10px 16px' : '12px 24px',
          borderTop: '1px solid var(--gray-200)',
          display: 'flex', gap: 16, alignItems: 'center',
          background: '#F9FAFB', flexWrap: 'wrap',
        }}>
          {Object.entries(STATUS_COLORS).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 12, height: 10, borderRadius: 3, background: val.bar }} />
              <span style={{ fontSize: 11, color: 'var(--gray-600)', fontWeight: 500 }}>
                {STATUS_LABELS[key]}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 2, height: 12, background: 'var(--orange)', borderRadius: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--gray-600)', fontWeight: 500 }}>Hoy</span>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--gray-400)', fontStyle: 'italic' }}>
            {isMobile ? '← deslizá para navegar →' : 'Ctrl + rueda para zoom · rueda para desplazar'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default CronogramasPage
