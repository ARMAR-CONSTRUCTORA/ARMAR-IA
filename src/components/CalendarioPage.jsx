import { useState } from 'react'
import { upsertCalendarioEvento, deleteCalendarioEvento } from '../lib/supabase'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAY_LABELS  = ['L','M','M','J','V','S','D']

const ORIGEN_META = {
  proyecto:    { color: '#E8641A', bg: '#FFF3EB', label: 'Proyecto' },
  presupuesto: { color: '#2563EB', bg: '#EFF6FF', label: 'Presupuesto' },
  cronograma:  { color: '#2D7A4F', bg: '#EBF7F1', label: 'Cronograma' },
  manual:      { color: '#6B7280', bg: '#F3F4F6', label: 'Manual' },
}

const TIPO_OPTIONS = ['hito', 'vencimiento', 'reunión', 'entrega']

function buildCells(year, month) {
  const todayDate    = new Date()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  const prevDays     = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = firstWeekday - 1; i >= 0; i--) cells.push({ day: prevDays - i, type: 'prev' })
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      day: d, type: 'current',
      isToday: todayDate.getFullYear() === year && todayDate.getMonth() === month && todayDate.getDate() === d,
    })
  }
  const trailing = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7)
  for (let d = 1; d <= trailing; d++) cells.push({ day: d, type: 'next' })
  return cells
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function evDia(eventos, year, month, day) {
  const s = toDateStr(year, month, day)
  return eventos.filter(e => e.fecha === s)
}

// ─── Modal Nuevo Evento ───────────────────────────────────────────────────────

function ModalNuevoEvento({ fechaInicial, proyectosArmar, onSave, onClose }) {
  const [titulo,      setTitulo]      = useState('')
  const [fecha,       setFecha]       = useState(fechaInicial || new Date().toISOString().slice(0, 10))
  const [tipo,        setTipo]        = useState('hito')
  const [descripcion, setDescripcion] = useState('')
  const [proyArmarId, setProyArmarId] = useState('')
  const [saving,      setSaving]      = useState(false)

  const input = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #E0DDD8', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }
  const lbl   = { display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', marginBottom: 5 }

  const handleSave = async () => {
    if (!titulo.trim() || !fecha) return
    setSaving(true)
    await onSave({
      origen: 'manual', tipoEvento: tipo,
      titulo: titulo.trim(), descripcion, fecha,
      proyectoArmarId: proyArmarId || null,
      estado: 'pendiente',
    })
    setSaving(false)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 310, padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E0DDD8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: '#1A1A1A' }}>Nuevo evento</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9CA3AF', padding: '2px 8px' }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div>
            <label style={lbl}>Título *</label>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Nombre del evento…" style={input}
              onKeyDown={e => e.key === 'Enter' && handleSave()} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Fecha *</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} style={input} />
            </div>
            <div>
              <label style={lbl}>Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} style={input}>
                {TIPO_OPTIONS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={lbl}>Descripción</label>
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3}
              placeholder="Descripción opcional…" style={{ ...input, resize: 'vertical' }} />
          </div>
          {(proyectosArmar || []).length > 0 && (
            <div>
              <label style={lbl}>Proyecto vinculado (opcional)</label>
              <select value={proyArmarId} onChange={e => setProyArmarId(e.target.value)} style={input}>
                <option value="">— Sin vínculo —</option>
                {proyectosArmar.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          )}
        </div>
        <div style={{ padding: '14px 24px', borderTop: '1px solid #E0DDD8', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #E0DDD8', background: 'white', color: '#444', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
          <button onClick={handleSave} disabled={!titulo.trim() || !fecha || saving}
            style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: !titulo.trim() || !fecha ? '#E5E7EB' : '#E8641A', color: !titulo.trim() || !fecha ? '#9CA3AF' : 'white', fontWeight: 700, fontSize: 13, cursor: !titulo.trim() || !fecha ? 'default' : 'pointer', fontFamily: 'inherit' }}>
            {saving ? 'Guardando…' : 'Guardar evento'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Detalle del Día ────────────────────────────────────────────────────

function DayDetailModal({ year, month, day, eventos, isEditor, onAgregarEvento, onDelete, onClose }) {
  const dayEvs = evDia(eventos, year, month, day)
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 460, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #E0DDD8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 900, color: '#1A1A1A' }}>{day} de {MONTH_NAMES[month]} {year}</h3>
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{dayEvs.length} evento{dayEvs.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9CA3AF', padding: '2px 8px' }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {dayEvs.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '20px 0' }}>Sin eventos este día.</p>
          ) : dayEvs.map(ev => {
            const meta = ORIGEN_META[ev.origen] || ORIGEN_META.manual
            return (
              <div key={ev.id} style={{ border: `1px solid ${meta.color}30`, borderLeft: `4px solid ${meta.color}`, borderRadius: 10, padding: '12px 14px', background: meta.bg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1A1A1A', marginBottom: 5 }}>{ev.titulo}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, background: 'white', padding: '1px 7px', borderRadius: 99 }}>{meta.label}</span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', background: 'white', padding: '1px 7px', borderRadius: 99 }}>{ev.tipoEvento}</span>
                      {ev.estado && ev.estado !== 'pendiente' && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: ev.estado === 'completado' ? '#2D7A4F' : '#6B7280', background: 'white', padding: '1px 7px', borderRadius: 99 }}>{ev.estado}</span>
                      )}
                    </div>
                    {ev.descripcion && <p style={{ fontSize: 12, color: '#444', marginTop: 6, lineHeight: 1.5, margin: '6px 0 0' }}>{ev.descripcion}</p>}
                  </div>
                  {isEditor && ev.origen === 'manual' && (
                    <button onClick={() => onDelete(ev.id)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #FCA5A5', background: 'white', color: '#C0392B', fontSize: 11, cursor: 'pointer', flexShrink: 0 }}>🗑</button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {isEditor && (
          <div style={{ padding: '12px 20px', borderTop: '1px solid #E0DDD8' }}>
            <button onClick={onAgregarEvento} style={{ width: '100%', padding: '9px', borderRadius: 8, border: '1px dashed #E0DDD8', background: 'white', color: '#E8641A', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Agregar evento en este día
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CalendarioTab — versión compacta para Dashboard ─────────────────────────

export function CalendarioTab({ compact = false, eventos = [] }) {
  const todayDate = new Date()
  const [current, setCurrent] = useState(() => new Date(todayDate.getFullYear(), todayDate.getMonth(), 1))
  const year  = current.getFullYear()
  const month = current.getMonth()
  const cells = buildCells(year, month)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  const isWeekend = di => di >= 5

  const todayStr = todayDate.toISOString().slice(0, 10)
  const upcoming = [...eventos].filter(e => e.fecha >= todayStr).slice(0, 5)

  const navSize  = compact ? 28 : 36
  const navRad   = compact ? 7  : 9
  const navFs    = compact ? 14 : 18
  const hdrPad   = compact ? '10px 14px' : '18px 24px'
  const titleFs  = compact ? 13 : 17
  const cellH    = compact ? 34 : 68
  const dotSize  = compact ? 24 : 30
  const dotFs    = compact ? 11 : 13
  const dayHdrH  = compact ? '6px 0' : '9px 0'
  const dayHdrFs = compact ? 10 : 11

  return (
    <div style={{ background: 'white', borderRadius: compact ? 12 : 14, border: '1px solid var(--gray-200)', overflow: 'hidden', boxShadow: compact ? 'none' : '0 1px 6px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: hdrPad, borderBottom: '1px solid var(--gray-200)' }}>
        <button onClick={() => setCurrent(new Date(year, month - 1, 1))}
          style={{ width: navSize, height: navSize, borderRadius: navRad, border: '1px solid var(--gray-200)', background: 'white', cursor: 'pointer', fontSize: navFs, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)', lineHeight: 1 }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB' }} onMouseLeave={e => { e.currentTarget.style.background = 'white' }}>‹</button>
        <span style={{ fontSize: titleFs, fontWeight: 800, color: 'var(--gray-800)' }}>{MONTH_NAMES[month]} {year}</span>
        <button onClick={() => setCurrent(new Date(year, month + 1, 1))}
          style={{ width: navSize, height: navSize, borderRadius: navRad, border: '1px solid var(--gray-200)', background: 'white', cursor: 'pointer', fontSize: navFs, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)', lineHeight: 1 }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB' }} onMouseLeave={e => { e.currentTarget.style.background = 'white' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#F9FAFB', borderBottom: '1px solid var(--gray-200)' }}>
        {DAY_LABELS.map((d, i) => (
          <div key={i} style={{ padding: dayHdrH, textAlign: 'center', fontSize: dayHdrFs, fontWeight: 700, color: isWeekend(i) ? '#9CA3AF' : 'var(--gray-500)', letterSpacing: '0.06em' }}>{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < weeks.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
          {week.map((cell, di) => {
            const dayEvs = cell.type === 'current' ? evDia(eventos, year, month, cell.day) : []
            return (
              <div key={di} style={{ minHeight: cellH, padding: compact ? '5px 2px' : '8px 6px', background: cell.type !== 'current' ? '#F9FAFB' : 'white', borderRight: di < 6 ? '1px solid #F3F4F6' : 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ width: dotSize, height: dotSize, borderRadius: '50%', background: cell.isToday ? '#E8641A' : 'transparent', color: cell.isToday ? 'white' : cell.type !== 'current' ? '#D1D5DB' : isWeekend(di) ? '#9CA3AF' : 'var(--gray-700)', fontSize: dotFs, fontWeight: cell.isToday ? 800 : 400, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: cell.isToday ? '0 2px 8px rgba(232,100,26,0.35)' : 'none' }}>
                  {cell.day}
                </span>
                {dayEvs.length > 0 && (
                  <div style={{ display: 'flex', gap: 2, marginTop: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {dayEvs.slice(0, 4).map((ev, ei) => {
                      const meta = ORIGEN_META[ev.origen] || ORIGEN_META.manual
                      return <div key={ei} style={{ width: 5, height: 5, borderRadius: '50%', background: meta.color }} />
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
      {upcoming.length > 0 && (
        <div style={{ borderTop: '1px solid var(--gray-200)', padding: '10px 14px' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>Próximos eventos</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {upcoming.map((ev, i) => {
              const meta = ORIGEN_META[ev.origen] || ORIGEN_META.manual
              const fmtD = new Date(ev.fecha + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--gray-700)', fontWeight: 600, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.titulo}</span>
                  <span style={{ fontSize: 10, color: 'var(--gray-400)', flexShrink: 0 }}>{fmtD}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página completa ──────────────────────────────────────────────────────────

function CalendarioPage({ eventos: eventosProp = [], proyectosArmar = [], isEditor = false, onUpsertEvento, onDeleteEvento }) {
  const todayDate = new Date()
  const [current,      setCurrent]      = useState(() => new Date(todayDate.getFullYear(), todayDate.getMonth(), 1))
  const [selectedDay,  setSelectedDay]  = useState(null)
  const [showNewModal, setShowNewModal] = useState(false)
  const [newEventDate, setNewEventDate] = useState(null)

  const year  = current.getFullYear()
  const month = current.getMonth()
  const cells = buildCells(year, month)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  const isWeekend = di => di >= 5

  const mesPfx       = `${year}-${String(month + 1).padStart(2, '0')}`
  const eventosDelMes = eventosProp.filter(e => e.fecha?.startsWith(mesPfx))

  const handleClickDay = (cell) => {
    if (cell.type !== 'current') return
    setSelectedDay({ year, month, day: cell.day })
  }

  const handleUpsert = async (data) => {
    if (onUpsertEvento) await onUpsertEvento(data)
  }

  const handleDelete = async (id) => {
    if (onDeleteEvento) await onDeleteEvento(id)
    setSelectedDay(null)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#1A1A1A', letterSpacing: '-0.5px', marginBottom: 4 }}>Calendario</h1>
          <p style={{ color: '#6B7280', fontSize: 14 }}>
            {MONTH_NAMES[month]} {year} · {eventosDelMes.length} evento{eventosDelMes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Leyenda */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', background: 'white', borderRadius: 9, padding: '8px 14px', border: '1px solid #E0DDD8', flexWrap: 'wrap' }}>
            {Object.entries(ORIGEN_META).map(([key, m]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 9, height: 9, borderRadius: '50%', background: m.color }} />
                <span style={{ fontSize: 11, color: '#6B7280', fontWeight: 500 }}>{m.label}</span>
              </div>
            ))}
          </div>
          {isEditor && (
            <button onClick={() => { setNewEventDate(null); setShowNewModal(true) }}
              style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: '#E8641A', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(232,100,26,0.3)', whiteSpace: 'nowrap' }}>
              + Nuevo evento
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid #E0DDD8', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        {/* Navegación mes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #E0DDD8', background: '#F9FAFB' }}>
          <button onClick={() => { setCurrent(new Date(year, month - 1, 1)); setSelectedDay(null) }}
            style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #E0DDD8', background: 'white', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', lineHeight: 1 }}
            onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>‹</button>
          <span style={{ fontSize: 17, fontWeight: 800, color: '#1A1A1A' }}>{MONTH_NAMES[month]} {year}</span>
          <button onClick={() => { setCurrent(new Date(year, month + 1, 1)); setSelectedDay(null) }}
            style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid #E0DDD8', background: 'white', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', lineHeight: 1 }}
            onMouseEnter={e => e.currentTarget.style.background = '#F3F4F6'} onMouseLeave={e => e.currentTarget.style.background = 'white'}>›</button>
        </div>

        {/* Cabecera días */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #E0DDD8', background: '#F9FAFB' }}>
          {DAY_LABELS.map((d, i) => (
            <div key={i} style={{ padding: '10px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: isWeekend(i) ? '#9CA3AF' : '#6B7280', letterSpacing: '0.06em' }}>{d}</div>
          ))}
        </div>

        {/* Semanas */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < weeks.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
            {week.map((cell, di) => {
              const dayEvs   = cell.type === 'current' ? evDia(eventosProp, year, month, cell.day) : []
              const isSelected = selectedDay && cell.type === 'current' && selectedDay.day === cell.day && selectedDay.month === month && selectedDay.year === year
              return (
                <div key={di}
                  onClick={() => handleClickDay(cell)}
                  style={{
                    minHeight: 96, padding: '6px 6px 4px', display: 'flex', flexDirection: 'column',
                    background: isSelected ? '#FFF3EB' : cell.type !== 'current' ? '#FAFAFA' : 'white',
                    borderRight: di < 6 ? '1px solid #F3F4F6' : 'none',
                    cursor: cell.type === 'current' ? 'pointer' : 'default',
                    outline: isSelected ? '2px solid #E8641A' : 'none',
                    outlineOffset: '-2px',
                  }}
                  onMouseEnter={e => { if (cell.type === 'current' && !isSelected) e.currentTarget.style.background = '#FAFAF9' }}
                  onMouseLeave={e => { if (cell.type === 'current' && !isSelected) e.currentTarget.style.background = 'white' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 3 }}>
                    <span style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: cell.isToday ? '#E8641A' : 'transparent',
                      color: cell.isToday ? 'white' : cell.type !== 'current' ? '#D1D5DB' : isWeekend(di) ? '#9CA3AF' : '#1A1A1A',
                      fontSize: 13, fontWeight: cell.isToday ? 800 : 400,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: cell.isToday ? '0 2px 8px rgba(232,100,26,0.35)' : 'none',
                    }}>
                      {cell.day}
                    </span>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, overflow: 'hidden' }}>
                    {dayEvs.slice(0, 3).map((ev, ei) => {
                      const meta = ORIGEN_META[ev.origen] || ORIGEN_META.manual
                      return (
                        <div key={ei} style={{
                          fontSize: 10, fontWeight: 700, color: meta.color, background: meta.bg,
                          padding: '2px 5px', borderRadius: 3,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          borderLeft: `3px solid ${meta.color}`,
                        }}>
                          {ev.titulo}
                        </div>
                      )
                    })}
                    {dayEvs.length > 3 && (
                      <div style={{ fontSize: 10, color: '#9CA3AF', fontWeight: 600, paddingLeft: 5 }}>+{dayEvs.length - 3} más</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Modales */}
      {selectedDay && (
        <DayDetailModal
          year={selectedDay.year} month={selectedDay.month} day={selectedDay.day}
          eventos={eventosProp} isEditor={isEditor}
          onAgregarEvento={() => {
            setNewEventDate(toDateStr(selectedDay.year, selectedDay.month, selectedDay.day))
            setSelectedDay(null)
            setShowNewModal(true)
          }}
          onDelete={handleDelete}
          onClose={() => setSelectedDay(null)}
        />
      )}
      {showNewModal && (
        <ModalNuevoEvento
          fechaInicial={newEventDate}
          proyectosArmar={proyectosArmar}
          onSave={handleUpsert}
          onClose={() => setShowNewModal(false)}
        />
      )}
    </div>
  )
}

export default CalendarioPage
