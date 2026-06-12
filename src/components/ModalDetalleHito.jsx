const orange = '#E8641A', orangeLight = '#FFF3EB'
const dark = '#1A1A1A', mid = '#444', light = '#F7F7F5'
const green = '#2D7A4F', greenLight = '#EBF7F1'
const red = '#C0392B', redLight = '#FDECEA'
const blue = '#2563EB'
const amber = '#D97706', amberLight = '#FEF3C7'

const sectionTitleStyle = {
  fontSize: 11, fontWeight: 700, color: '#9CA3AF',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  margin: 0,
}

export const CHECKLIST_ITEMS = [
  { key: 'checklistDocumentacion', label: 'Documentación / información asociada' },
  { key: 'checklistPresupuesto',   label: 'Presupuesto aprobado' },
  { key: 'checklistPago',          label: 'Pago' },
]

export const CHECKLIST_META = {
  listo:      { label: 'Listo',      color: green, bg: greenLight },
  en_proceso: { label: 'En proceso', color: amber, bg: amberLight },
  pendiente:  { label: 'Pendiente',  color: '#6B7280', bg: '#F3F4F6' },
}

const ESTADO_HITO_FALLBACK = {
  pendiente:    { label: 'Pendiente',    color: '#6B7280', bg: '#F3F4F6' },
  cumplido:     { label: 'Cumplido',     color: green,     bg: greenLight },
  demorado:     { label: 'Demorado',     color: red,       bg: redLight },
  reprogramado: { label: 'Reprogramado', color: orange,    bg: orangeLight },
  cancelado:    { label: 'Cancelado',    color: '#4B5563', bg: '#F3F4F6' },
}

function fmtFechaLarga(d) {
  if (!d) return '—'
  return new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function semaforoHito(hito) {
  const tieneChecklist = CHECKLIST_ITEMS.some(it => hito[it.key] !== undefined)
  if (!tieneChecklist) return ESTADO_HITO_FALLBACK[hito.estado] || ESTADO_HITO_FALLBACK.pendiente
  const listos = CHECKLIST_ITEMS.filter(it => hito[it.key] === 'listo').length
  if (listos === 3) return { label: 'Completo', color: green, bg: greenLight }
  if (listos >= 1) return { label: 'En proceso', color: amber, bg: amberLight }
  return { label: 'Pendiente', color: red, bg: redLight }
}

// Deriva el estado general del hito a partir del checklist (0 listo=pendiente, 1-2=en_proceso, 3=cumplido)
export function estadoDesdeChecklist(hito) {
  const listos = CHECKLIST_ITEMS.filter(it => hito[it.key] === 'listo').length
  if (listos === 3) return 'cumplido'
  if (listos >= 1) return 'en_proceso'
  return 'pendiente'
}

export default function ModalDetalleHito({ hito, obra, onClose }) {
  if (!hito) return null
  const tieneChecklist = CHECKLIST_ITEMS.some(it => hito[it.key] !== undefined)
  const semaforo = semaforoHito(hito)

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'white', borderRadius: 14, padding: 24, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 4 }}>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: dark, margin: 0 }}>{hito.nombre}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#9CA3AF', cursor: 'pointer', lineHeight: 1, padding: 2 }}>✕</button>
        </div>

        {obra?.name && (
          <div style={{ fontSize: 12, color: blue, fontWeight: 600, marginBottom: 12 }}>{obra.name}</div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: semaforo.color, background: semaforo.bg, padding: '3px 10px', borderRadius: 99 }}>{semaforo.label}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: mid, background: light, padding: '3px 10px', borderRadius: 99 }}>📅 {fmtFechaLarga(hito.fechaPrevista)}</span>
          {hito.fechaReal && (
            <span style={{ fontSize: 11, fontWeight: 700, color: green, background: greenLight, padding: '3px 10px', borderRadius: 99 }}>✓ Cumplido: {fmtFechaLarga(hito.fechaReal)}</span>
          )}
        </div>

        {hito.descripcion && (
          <div style={{ marginBottom: 14 }}>
            <p style={sectionTitleStyle}>Descripción</p>
            <p style={{ fontSize: 13, color: mid, marginTop: 6, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{hito.descripcion}</p>
          </div>
        )}

        {hito.proveedor && (
          <div style={{ marginBottom: 14 }}>
            <p style={sectionTitleStyle}>Proveedor</p>
            <p style={{ fontSize: 13, color: dark, fontWeight: 600, marginTop: 6 }}>{hito.proveedor}</p>
          </div>
        )}

        {tieneChecklist && (
          <div style={{ marginBottom: 14 }}>
            <p style={sectionTitleStyle}>Checklist</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {CHECKLIST_ITEMS.map(it => {
                const val = hito[it.key] || 'pendiente'
                const meta = CHECKLIST_META[val] || CHECKLIST_META.pendiente
                return (
                  <div key={it.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 12px', background: light, borderRadius: 8 }}>
                    <span style={{ fontSize: 12, color: dark, fontWeight: 500 }}>{it.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg, padding: '2px 9px', borderRadius: 99, flexShrink: 0 }}>{meta.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {hito.responsable && (
          <div style={{ marginBottom: 14 }}>
            <p style={sectionTitleStyle}>Responsable</p>
            <p style={{ fontSize: 13, color: dark, marginTop: 6 }}>{hito.responsable}</p>
          </div>
        )}

        {hito.impactoSiDemora && (
          <div style={{ marginBottom: 14 }}>
            <p style={sectionTitleStyle}>Impacto si demora</p>
            <p style={{ fontSize: 12, color: amber, background: amberLight, borderRadius: 6, padding: '6px 10px', marginTop: 6 }}>{hito.impactoSiDemora}</p>
          </div>
        )}

        {hito.observaciones && (
          <div>
            <p style={sectionTitleStyle}>Observaciones</p>
            <p style={{ fontSize: 12, color: mid, background: light, borderRadius: 6, padding: '6px 10px', marginTop: 6 }}>{hito.observaciones}</p>
          </div>
        )}
      </div>
    </div>
  )
}
