import { useState } from 'react'

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAY_LABELS  = ['L','M','M','J','V','S','D']

export function CalendarioTab({ compact = false }) {
  const todayDate = new Date()
  const [current, setCurrent] = useState(() => new Date(todayDate.getFullYear(), todayDate.getMonth(), 1))

  const year          = current.getFullYear()
  const month         = current.getMonth()
  const daysInMonth   = new Date(year, month + 1, 0).getDate()
  const firstWeekday  = (new Date(year, month, 1).getDay() + 6) % 7  // Lun=0 … Dom=6
  const prevMonthDays = new Date(year, month, 0).getDate()

  const cells = []
  for (let i = firstWeekday - 1; i >= 0; i--) cells.push({ day: prevMonthDays - i, type: 'prev' })
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = todayDate.getFullYear() === year && todayDate.getMonth() === month && todayDate.getDate() === d
    cells.push({ day: d, type: 'current', isToday })
  }
  const trailing = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7)
  for (let d = 1; d <= trailing; d++) cells.push({ day: d, type: 'next' })

  const weeks      = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  const isWeekend  = (di) => di >= 5

  const cellH    = compact ? 34 : 68
  const navSize  = compact ? 28 : 36
  const navRad   = compact ? 7  : 9
  const navFs    = compact ? 14 : 18
  const hdrPad   = compact ? '10px 14px' : '18px 24px'
  const titleFs  = compact ? 13 : 17
  const dayHdrH  = compact ? '6px 0' : '9px 0'
  const dayHdrFs = compact ? 10 : 11
  const dotSize  = compact ? 24 : 30
  const dotFs    = compact ? 11 : 13

  return (
    <div style={{ background: 'white', borderRadius: compact ? 12 : 14, border: '1px solid var(--gray-200)', overflow: 'hidden', boxShadow: compact ? 'none' : '0 1px 6px rgba(0,0,0,0.05)' }}>
      {/* Navegación */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: hdrPad, borderBottom: '1px solid var(--gray-200)' }}>
        <button
          onClick={() => setCurrent(new Date(year, month - 1, 1))}
          style={{ width: navSize, height: navSize, borderRadius: navRad, border: '1px solid var(--gray-200)', background: 'white', cursor: 'pointer', fontSize: navFs, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)', lineHeight: 1 }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = 'var(--gray-300)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'var(--gray-200)' }}>
          ‹
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: titleFs, fontWeight: 800, color: 'var(--gray-800)' }}>{MONTH_NAMES[month]} {year}</div>
          {!compact && todayDate.getFullYear() === year && todayDate.getMonth() === month && (
            <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 1 }}>Mes actual</div>
          )}
        </div>
        <button
          onClick={() => setCurrent(new Date(year, month + 1, 1))}
          style={{ width: navSize, height: navSize, borderRadius: navRad, border: '1px solid var(--gray-200)', background: 'white', cursor: 'pointer', fontSize: navFs, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)', lineHeight: 1 }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = 'var(--gray-300)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'var(--gray-200)' }}>
          ›
        </button>
      </div>

      {/* Cabecera días */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#F9FAFB', borderBottom: '1px solid var(--gray-200)' }}>
        {DAY_LABELS.map((d, i) => (
          <div key={i} style={{ padding: dayHdrH, textAlign: 'center', fontSize: dayHdrFs, fontWeight: 700, color: isWeekend(i) ? '#9CA3AF' : 'var(--gray-500)', letterSpacing: '0.06em' }}>
            {d}
          </div>
        ))}
      </div>

      {/* Semanas */}
      {weeks.map((week, wi) => (
        <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < weeks.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
          {week.map((cell, di) => (
            <div key={di} style={{
              minHeight: cellH,
              padding: compact ? '5px 2px' : '8px 6px',
              background: cell.type !== 'current' ? '#F9FAFB' : 'white',
              borderRight: di < 6 ? '1px solid #F3F4F6' : 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              <span style={{
                width: dotSize, height: dotSize, borderRadius: '50%',
                background: cell.isToday ? '#E8641A' : 'transparent',
                color: cell.isToday ? 'white' : cell.type !== 'current' ? '#D1D5DB' : isWeekend(di) ? '#9CA3AF' : 'var(--gray-700)',
                fontSize: dotFs,
                fontWeight: cell.isToday ? 800 : 400,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: cell.isToday ? '0 2px 8px rgba(232,100,26,0.35)' : 'none',
              }}>
                {cell.day}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function CalendarioPage() {
  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--gray-900)', letterSpacing: '-0.5px', marginBottom: 4 }}>Calendario</h1>
        <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>Vista mensual · Próximamente: hitos de cronograma y fechas de proyectos</p>
      </div>
      <CalendarioTab />
    </div>
  )
}

export default CalendarioPage
