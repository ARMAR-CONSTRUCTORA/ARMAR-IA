import { useState } from 'react'
import { useBreakpoint } from '../hooks/useBreakpoint'
import CronogramaTab from './CronogramaTab'
import ModalDetalleHito, { CHECKLIST_ITEMS, CHECKLIST_META, semaforoHito, estadoDesdeChecklist } from './ModalDetalleHito'

// ── Colores ───────────────────────────────────────────────────────────────────
const orange = '#E8641A', orangeLight = '#FFF3EB'
const dark = '#1A1A1A', mid = '#444', light = '#F7F7F5', border = '#E0DDD8'
const green = '#2D7A4F', greenLight = '#EBF7F1'
const red = '#C0392B', redLight = '#FDECEA'
const blue = '#2563EB', blueLight = '#EFF6FF'

// ── Estado obra ───────────────────────────────────────────────────────────────
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
function fmtFecha(d) {
  if (!d) return '—'
  return new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })
}
function initials(name) {
  if (!name) return '?'
  return name.replace(/^(Ing\.|Arq\.)\s*/i, '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}
function progressColor(v) {
  return v === 100 ? '#10B981' : v >= 70 ? '#F97316' : v >= 40 ? '#F59E0B' : '#9CA3AF'
}
function fmtPeso(n) {
  return `$${Math.round(n || 0).toLocaleString('es-AR')}`
}

// ── Estado certificado ────────────────────────────────────────────────────────
const ESTADO_CERT_META = {
  borrador:         { label: 'Borrador',         color: '#6B7280', bg: '#F3F4F6',  bd: '#D1D5DB' },
  emitido:          { label: 'Emitido',          color: blue,      bg: blueLight,  bd: '#BFDBFE' },
  aprobado_cliente: { label: 'Aprobado cliente', color: green,     bg: greenLight, bd: '#A7D7BC' },
  observado:        { label: 'Observado',        color: orange,    bg: orangeLight, bd: '#F3C19B' },
  facturado:        { label: 'Facturado',        color: blue,      bg: blueLight,  bd: '#BFDBFE' },
  pagado_parcial:   { label: 'Pagado parcial',   color: '#B45309', bg: '#FEF3C7',  bd: '#FDE68A' },
  pagado_total:     { label: 'Pagado total',     color: green,     bg: greenLight, bd: '#A7D7BC' },
  anulado:          { label: 'Anulado',          color: red,       bg: redLight,  bd: '#F5C6C0' },
}

function normalizarCertificado(cert) {
  if (!cert) return cert
  const montoCertificado = cert.montoCertificado ?? cert.totalCertificado ?? cert.total ?? 0
  const montoPagado = cert.montoPagado ?? 0
  const saldoPendiente = cert.saldoPendiente != null ? cert.saldoPendiente : (montoCertificado - montoPagado)
  let estado = cert.estado
  if (!estado || !ESTADO_CERT_META[estado]) {
    estado = estado === 'pagado' ? 'pagado_total' : 'emitido'
  }
  return { ...cert, fechaEmision: cert.fechaEmision ?? cert.fecha, montoCertificado, montoPagado, saldoPendiente, estado }
}

function EstadoCertBadge({ estado }) {
  const meta = ESTADO_CERT_META[estado] || ESTADO_CERT_META.emitido
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg, border: `1px solid ${meta.bd}`, padding: '2px 9px', borderRadius: 99, whiteSpace: 'nowrap', textDecoration: estado === 'anulado' ? 'line-through' : 'none' }}>
      {meta.label}
    </span>
  )
}

// ── Componentes base ──────────────────────────────────────────────────────────
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
    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  )
}

function Avatar({ name, size = 34 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg, #F97316, #EA580C)', color: 'white', fontSize: size > 30 ? 12 : 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 6px rgba(249,115,22,0.4)' }}>
      {initials(name)}
    </div>
  )
}

function Badge({ label, color, bg, borderColor }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, border: `1px solid ${borderColor || color + '33'}`, padding: '2px 9px', borderRadius: 99, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  )
}

function InfoRow({ label, value }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
      <span style={{ fontSize: 11, color: '#9CA3AF', minWidth: 90, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 11, color: mid, fontWeight: 500, flex: 1 }}>{value}</span>
    </div>
  )
}

const card = { background: 'white', border: `1px solid ${border}`, borderRadius: 10, padding: 16 }

// ── Pestaña: Resumen ──────────────────────────────────────────────────────────
function TabResumen({ p, cronograma, proyectosArmar, isDesktop, obraHitos }) {
  const [hitoDetalle, setHitoDetalle] = useState(null)
  const proyVinc = proyectosArmar?.find(pa => String(pa.id) === String(p.proyectoArmarId))
  const today    = new Date().toISOString().slice(0, 10)
  const plazo    = !p.endDate ? 'sin_fechas' : p.endDate >= today ? 'en_plazo' : 'con_desvio'
  const plazoBadge = {
    en_plazo:   { label: 'En plazo',    color: green,         bg: greenLight   },
    con_desvio: { label: 'Con desvío',  color: '#D97706',     bg: '#FEF3C7'    },
    sin_fechas: { label: 'Sin fechas',  color: '#6B7280',     bg: '#F3F4F6'    },
  }[plazo]

  // Stats de cronograma
  const allInformes = cronograma.flatMap(c => c.informes || [])
  const lastInforme = allInformes.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0]
  const allCerts    = cronograma.flatMap(c => c.certificados || []).map(normalizarCertificado)
  const totalCert   = allCerts.reduce((s, c) => s + (c.montoCertificado || 0), 0)
  const certPend    = allCerts.filter(c => c.saldoPendiente > 0 && c.estado !== 'anulado').length

  const ultimoCron = cronograma.at(-1)

  const proximoHito = (obraHitos || [])
    .filter(h => h.obraId === p.id && h.estado !== 'cumplido')
    .sort((a, b) => (a.fechaPrevista || '').localeCompare(b.fechaPrevista || ''))[0]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr', gap: 14 }}>

      {/* Card 1 — Estado general */}
      <div style={card}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Estado general</p>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: dark, flex: 1 }}>{p.name}</div>
          <StatusBadge status={p.status} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Avatar name={p.responsible} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: dark }}>{p.responsible || '—'}</div>
            {p.contratista && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{p.contratista}</div>}
          </div>
        </div>
        <InfoRow label="Inicio"     value={fmtShort(p.startDate)} />
        <InfoRow label="Fin est."   value={fmtShort(p.endDate)} />
        <InfoRow label="Ubicación"  value={p.location} />
        {p.linkDocumentacion && (
          <a href={p.linkDocumentacion} target="_blank" rel="noreferrer"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 12, fontWeight: 600, color: orange, textDecoration: 'none', background: orangeLight, padding: '5px 12px', borderRadius: 7, border: `1px solid ${orange}44` }}>
            📁 Ver carpeta
          </a>
        )}
      </div>

      {/* Card 2 — Proyecto vinculado */}
      <div style={card}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Proyecto vinculado</p>
        {proyVinc ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Badge label={proyVinc.nombre} color={blue} bg={blueLight} />
            </div>
            <InfoRow label="Responsable" value={proyVinc.responsableProyecto} />
            <InfoRow label="Tipo de obra" value={proyVinc.tipoObra} />
            <InfoRow label="Estado"      value={proyVinc.estadoGeneral} />
          </>
        ) : (
          <div style={{ padding: '12px 0' }}>
            <Badge label="Sin proyecto vinculado" color="#D97706" bg="#FEF3C7" borderColor="#FDE68A" />
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 10 }}>Esta obra no está vinculada a ningún proyecto ARMAR.</p>
          </div>
        )}
      </div>

      {/* Card 3 — Avance físico */}
      <div style={card}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Avance físico</p>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: progressColor(p.progress), lineHeight: 1, marginBottom: 8 }}>{p.progress}%</div>
          <ProgressBar value={p.progress} height={10} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Badge label={plazoBadge.label} color={plazoBadge.color} bg={plazoBadge.bg} />
        </div>
        {ultimoCron && (
          <InfoRow label="Cronograma" value={ultimoCron.nombre || ultimoCron.id} />
        )}
      </div>

      {/* Card 4 — Cronograma y certificados */}
      <div style={card}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Cronograma y certificados</p>
        {cronograma.length === 0 ? (
          <p style={{ fontSize: 12, color: '#9CA3AF' }}>Sin cronograma vinculado.</p>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {[
                { label: 'Cronogramas',        value: cronograma.length },
                { label: 'Informes de avance', value: allInformes.length },
                { label: 'Certificados',        value: allCerts.length },
                { label: 'Cert. pendientes',   value: certPend },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: light, borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: dark }}>{value}</div>
                  <div style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
            {totalCert > 0 && (
              <div style={{ borderTop: `1px solid ${border}`, paddingTop: 10 }}>
                <InfoRow label="Total certificado" value={fmtPeso(totalCert)} />
                {lastInforme && <InfoRow label="Último informe" value={fmtFecha(lastInforme.fecha)} />}
              </div>
            )}
          </>
        )}
      </div>

      {/* Card 5 — Próximo hito */}
      <div style={card}>
        <p style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Próximo hito</p>
        {proximoHito ? (
          <div style={{ cursor: 'pointer' }} onClick={() => setHitoDetalle(proximoHito)}>
            <div style={{ fontSize: 14, fontWeight: 800, color: dark, marginBottom: 8 }}>{proximoHito.nombre}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <Badge label={fmtFecha(proximoHito.fechaPrevista)} color={orange} bg={orangeLight} />
            </div>
            <InfoRow label="Responsable" value={proximoHito.responsable} />
          </div>
        ) : (
          <p style={{ fontSize: 12, color: '#9CA3AF' }}>Sin hitos pendientes.</p>
        )}
      </div>

      {hitoDetalle && (
        <ModalDetalleHito hito={hitoDetalle} obra={p} onClose={() => setHitoDetalle(null)} />
      )}
    </div>
  )
}

// ── Pestaña: Avances ──────────────────────────────────────────────────────────
function TabAvances({ cronograma }) {
  const allInformes = cronograma.flatMap(c =>
    (c.informes || []).map(inf => ({ ...inf, cronNombre: c.nombre || c.id }))
  ).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))

  if (allInformes.length === 0) {
    return <p style={{ fontSize: 13, color: '#9CA3AF', padding: '24px 0', textAlign: 'center' }}>No hay informes de avance cargados aún.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {allInformes.map((inf, i) => (
        <div key={inf.id || i} style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: 13, fontWeight: 800, color: dark }}>Informe #{inf.numero || i + 1}</span>
              <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 8 }}>{fmtFecha(inf.fecha)}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {inf.responsable && <Badge label={inf.responsable} color={mid} bg={light} />}
              <Badge label={inf.cronNombre} color={blue} bg={blueLight} />
            </div>
          </div>

          {/* Avance general */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '8px 12px', background: greenLight, borderRadius: 8 }}>
            <span style={{ fontSize: 11, color: green, fontWeight: 700 }}>Avance general</span>
            <span style={{ fontSize: 12, color: mid }}>{inf.avanceGeneralAnterior ?? '—'}% → {inf.avanceGeneral ?? '—'}%</span>
            {inf.avanceGeneral != null && inf.avanceGeneralAnterior != null && (
              <span style={{ fontSize: 11, fontWeight: 700, color: green, marginLeft: 'auto' }}>
                +{inf.avanceGeneral - inf.avanceGeneralAnterior}%
              </span>
            )}
          </div>

          {/* Avances por etapa */}
          {(inf.avancesTareas || []).length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Etapas actualizadas</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {inf.avancesTareas.map((t, ti) => (
                  <div key={ti} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: light, borderRadius: 6 }}>
                    <span style={{ flex: 1, fontSize: 12, color: dark, fontWeight: 500 }}>{t.nombreTarea}</span>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{t.avanceAnterior}%</span>
                    <span style={{ fontSize: 11, color: '#D1D5DB' }}>→</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: green }}>{t.avanceNuevo}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inf.observaciones && (
            <p style={{ fontSize: 12, color: mid, background: light, borderRadius: 7, padding: '8px 10px', marginTop: 4 }}>
              <span style={{ fontWeight: 700 }}>Obs.: </span>{inf.observaciones}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Pestaña: Certificados ─────────────────────────────────────────────────────
function TabCertificados({ p, cronograma }) {
  const today = new Date().toISOString().slice(0, 10)
  const allCerts = cronograma.flatMap(c =>
    (c.certificados || []).map(cert => normalizarCertificado({ ...cert, cronId: c.id, cronNombre: c.nombre || c.id }))
  ).sort((a, b) => (a.numero || 0) - (b.numero || 0))

  const totalCertificado       = allCerts.reduce((s, c) => s + (c.montoCertificado || 0), 0)
  const totalPagado            = allCerts.reduce((s, c) => s + (c.montoPagado || 0), 0)
  const saldoPendienteTotal    = allCerts.reduce((s, c) => s + (c.saldoPendiente || 0), 0)
  const certificadosVencidos   = allCerts.filter(c => c.fechaVencimiento && c.fechaVencimiento < today && c.saldoPendiente > 0).length
  const certificadosObservados = allCerts.filter(c => c.estado === 'observado').length

  if (allCerts.length === 0) {
    return <p style={{ fontSize: 13, color: '#9CA3AF', padding: '24px 0', textAlign: 'center' }}>No hay certificados generados aún.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {allCerts.map((cert, i) => {
        const vencido = !!(cert.fechaVencimiento && cert.fechaVencimiento < today && cert.saldoPendiente > 0)
        return (
          <div key={cert.id || i} style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 800, color: dark }}>Certificado #{cert.numero || i + 1}</span>
                <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 8 }}>{fmtFecha(cert.fechaEmision)}</span>
                {cert.fechaVencimiento && <span style={{ fontSize: 12, color: '#9CA3AF', marginLeft: 8 }}>· vence {fmtFecha(cert.fechaVencimiento)}</span>}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                <EstadoCertBadge estado={cert.estado} />
                {vencido && <Badge label="Vencido" color={red} bg={redLight} borderColor={red} />}
              </div>
            </div>

            {cert.responsable && (
              <div style={{ marginBottom: 8 }}>
                <Badge label={cert.responsable} color={mid} bg={light} />
              </div>
            )}

            {/* Montos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, borderTop: `1px solid ${border}`, paddingTop: 10, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Certificado</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: dark }}>{fmtPeso(cert.montoCertificado)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pagado</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: green }}>{fmtPeso(cert.montoPagado)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Saldo</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: cert.saldoPendiente > 0 ? orange : green }}>{fmtPeso(cert.saldoPendiente)}</div>
              </div>
            </div>

            {/* Etapas */}
            {(cert.etapas || []).length > 0 && (
              <div style={{ borderTop: `1px solid ${border}`, paddingTop: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Detalle por etapa</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {cert.etapas.map((e, ei) => (
                    <div key={ei} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: light, borderRadius: 6 }}>
                      <span style={{ flex: 1, fontSize: 12, color: dark }}>{e.nombreTarea}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: mid }}>{fmtPeso(e.montoPagado)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {cert.observaciones && (
              <p style={{ fontSize: 11, color: mid, background: light, borderRadius: 6, padding: '6px 10px', marginTop: 8 }}>{cert.observaciones}</p>
            )}
          </div>
        )
      })}

      {/* Totales */}
      <div style={{ ...card, background: dark, border: 'none' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Total certificado acumulado', value: fmtPeso(totalCertificado),    color: 'white' },
            { label: 'Total pagado acumulado',       value: fmtPeso(totalPagado),         color: greenLight },
            { label: 'Saldo pendiente total',        value: fmtPeso(saldoPendienteTotal), color: saldoPendienteTotal > 0 ? '#FDE68A' : greenLight },
            { label: 'Certificados vencidos',        value: certificadosVencidos,         color: certificadosVencidos > 0 ? '#FCA5A5' : 'rgba(255,255,255,0.7)' },
            { label: 'Certificados observados',      value: certificadosObservados,       color: certificadosObservados > 0 ? '#FDE68A' : 'rgba(255,255,255,0.7)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{label}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color }}>{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Pestaña: Equipo ───────────────────────────────────────────────────────────
const CATEGORIA_META = {
  'OBRA':             { color: '#7C3AED', bg: '#EDE9FE' },
  'PROYECTO':         { color: blue,     bg: blueLight  },
  'GREMIOS':          { color: green,    bg: greenLight  },
  'ADMINISTRACIÓN':   { color: '#0891B2', bg: '#CFFAFE' },
}

function TabEquipo({ p, teamMembers }) {
  const miembros = (teamMembers || []).filter(m => String(m.obraId) === String(p.id))

  if (miembros.length === 0) {
    return <p style={{ fontSize: 13, color: '#9CA3AF', padding: '24px 0', textAlign: 'center' }}>No hay miembros del equipo cargados.</p>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {miembros.map((m, i) => {
        const meta = CATEGORIA_META[m.category?.toUpperCase()] || { color: mid, bg: light }
        return (
          <div key={m.id || i} style={{ ...card, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={m.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: dark }}>{m.name}</div>
              {m.email && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{m.email}</div>}
              {m.phone && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{m.phone}</div>}
            </div>
            {m.category && (
              <Badge label={m.category} color={meta.color} bg={meta.bg} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Pestaña: Hitos ────────────────────────────────────────────────────────────
const inputStyle = { width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${border}`, fontSize: 13, color: dark, fontFamily: 'inherit', boxSizing: 'border-box' }

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

const selectStyle = { ...inputStyle, cursor: 'pointer', background: 'white' }

function ModalHito({ obraId, hito, onSave, onClose }) {
  const esEdicion = !!hito?.id
  const [nombre, setNombre]               = useState(hito?.nombre || '')
  const [descripcion, setDescripcion]     = useState(hito?.descripcion || '')
  const [fechaPrevista, setFechaPrevista] = useState(hito?.fechaPrevista || '')
  const [proveedor, setProveedor]         = useState(hito?.proveedor || '')
  const [checklistDocumentacion, setChecklistDocumentacion] = useState(hito?.checklistDocumentacion || 'pendiente')
  const [checklistPresupuesto, setChecklistPresupuesto]     = useState(hito?.checklistPresupuesto || 'pendiente')
  const [checklistPago, setChecklistPago]                   = useState(hito?.checklistPago || 'pendiente')

  const puedeGuardar = nombre.trim() && fechaPrevista

  const handleGuardar = () => {
    if (!puedeGuardar) return
    const checklist = { checklistDocumentacion, checklistPresupuesto, checklistPago }
    onSave({
      ...(esEdicion ? { id: hito.id } : {}),
      obraId,
      cronogramaId: hito?.cronogramaId || null,
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      fechaPrevista,
      proveedor: proveedor.trim(),
      ...checklist,
      estado: estadoDesdeChecklist(checklist),
      fechaReal: hito?.fechaReal || null,
      responsable: hito?.responsable || '',
      impactoSiDemora: hito?.impactoSiDemora || '',
      observaciones: hito?.observaciones || '',
      visibleCalendario: true,
    })
    onClose()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'white', borderRadius: 14, padding: 24, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: dark, marginBottom: 16 }}>{esEdicion ? 'Editar hito' : 'Nuevo hito'}</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Field label="Nombre del hito *">
            <input value={nombre} onChange={e => setNombre(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Descripción">
            <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />
          </Field>
          <Field label="Fecha del hito *">
            <input type="date" value={fechaPrevista} onChange={e => setFechaPrevista(e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Proveedor">
            <input value={proveedor} onChange={e => setProveedor(e.target.value)} placeholder="Nombre del proveedor o empresa" style={inputStyle} />
          </Field>

          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Checklist</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Documentación / información asociada', value: checklistDocumentacion, set: setChecklistDocumentacion },
                { label: 'Presupuesto aprobado',                  value: checklistPresupuesto,   set: setChecklistPresupuesto },
                { label: 'Pago',                                  value: checklistPago,          set: setChecklistPago },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, fontSize: 12, color: dark }}>{item.label}</span>
                  <select value={item.value} onChange={e => item.set(e.target.value)} style={{ ...selectStyle, width: 140, flexShrink: 0 }}>
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">En proceso</option>
                    <option value="listo">Listo</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${border}`, background: 'white', color: mid, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            disabled={!puedeGuardar}
            style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: puedeGuardar ? orange : '#FBC8AD', color: 'white', fontWeight: 700, fontSize: 13, cursor: puedeGuardar ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}
          >
            {esEdicion ? 'Guardar cambios' : 'Guardar hito'}
          </button>
        </div>
      </div>
    </div>
  )
}

function TabHitos({ p, obraHitos, onGuardarHito, onEliminarHito, isEditor }) {
  const [modalOpen, setModalOpen]     = useState(false)
  const [editingHito, setEditingHito] = useState(null)
  const [hitoDetalle, setHitoDetalle] = useState(null)

  const hitos = (obraHitos || [])
    .filter(h => h.obraId === p.id)
    .sort((a, b) => (a.fechaPrevista || '').localeCompare(b.fechaPrevista || ''))

  const handleNuevo = () => { setEditingHito(null); setModalOpen(true) }
  const handleEditar = (h) => { setEditingHito(h); setModalOpen(true) }

  return (
    <div>
      {isEditor && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button
            onClick={handleNuevo}
            style={{ background: orange, color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            + Nuevo hito
          </button>
        </div>
      )}

      {hitos.length === 0 ? (
        <p style={{ fontSize: 13, color: '#9CA3AF', padding: '24px 0', textAlign: 'center' }}>No hay hitos cargados para esta obra.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {hitos.map(h => {
            const semaforo = semaforoHito(h)
            return (
              <div key={h.id} style={{ ...card, borderLeft: `4px solid ${semaforo.color}`, background: semaforo.bg }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => setHitoDetalle(h)}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: dark }}>{h.nombre}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
                      Previsto: {fmtFecha(h.fechaPrevista)}
                      {h.fechaReal && ` · Real: ${fmtFecha(h.fechaReal)}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Badge label={semaforo.label} color={semaforo.color} bg="white" />
                    {isEditor && (
                      <button
                        onClick={() => handleEditar(h)}
                        style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid ${border}`, background: 'white', color: mid, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        ✏️
                      </button>
                    )}
                    {isEditor && (
                      <button
                        onClick={() => onEliminarHito(h.id)}
                        style={{ padding: '4px 8px', borderRadius: 6, border: `1px solid #FECACA`, background: 'white', color: red, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>

                {h.descripcion && <p style={{ fontSize: 12, color: mid, marginTop: 8 }}>{h.descripcion}</p>}

                {h.proveedor && (
                  <div style={{ marginTop: 8 }}>
                    <InfoRow label="Proveedor" value={h.proveedor} />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                  {CHECKLIST_ITEMS.map(it => {
                    const val = h[it.key] || 'pendiente'
                    const cm = CHECKLIST_META[val] || CHECKLIST_META.pendiente
                    return (
                      <span key={it.key} style={{ fontSize: 10, fontWeight: 700, color: cm.color, background: 'white', border: `1px solid ${cm.color}33`, padding: '2px 8px', borderRadius: 99 }}>
                        {it.label.split(' / ')[0]}: {cm.label}
                      </span>
                    )
                  })}
                </div>

                {h.responsable && (
                  <div style={{ marginTop: 8 }}>
                    <InfoRow label="Responsable" value={h.responsable} />
                  </div>
                )}

                {h.impactoSiDemora && (
                  <p style={{ fontSize: 11, color: '#D97706', background: '#FFFBEB', borderRadius: 6, padding: '6px 10px', marginTop: 8 }}>
                    <span style={{ fontWeight: 700 }}>Impacto si demora: </span>{h.impactoSiDemora}
                  </p>
                )}

                {h.observaciones && (
                  <p style={{ fontSize: 11, color: mid, background: light, borderRadius: 6, padding: '6px 10px', marginTop: 8 }}>{h.observaciones}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <ModalHito obraId={p.id} hito={editingHito} onSave={onGuardarHito} onClose={() => { setModalOpen(false); setEditingHito(null) }} />
      )}

      {hitoDetalle && (
        <ModalDetalleHito hito={hitoDetalle} obra={p} onClose={() => setHitoDetalle(null)} />
      )}
    </div>
  )
}

// ── Fila expandible ───────────────────────────────────────────────────────────
const TABS = [
  { key: 'resumen',      label: 'Resumen'      },
  { key: 'cronograma',   label: 'Cronograma'   },
  { key: 'avances',      label: 'Avances'      },
  { key: 'hitos',        label: 'Hitos'        },
  { key: 'certificados', label: 'Certificados' },
  { key: 'equipo',       label: 'Equipo'       },
]

function ProjectRow({
  p, cronograma, onEdit, onDelete, onUpdateTasks,
  onCreateCronograma, onSaveCronograma, onCargarAvance,
  onDeleteCronograma, onEditarInforme,
  isDesktop, teamMembers, isEditor, proyectosArmar,
  presupuestos, // reservado para uso futuro
  obraHitos, onGuardarHito, onEliminarHito,
}) {
  const [open,      setOpen]      = useState(false)
  const [activeTab, setActiveTab] = useState('resumen')

  const cronogramaArr = cronograma || []

  // Conteos para badges de pestaña
  const totalInformes = cronogramaArr.flatMap(c => c.informes || []).length
  const totalCerts    = cronogramaArr.flatMap(c => c.certificados || []).length
  const totalHitosPendientes = (obraHitos || []).filter(h => h.obraId === p.id && h.estado !== 'cumplido').length

  return (
    <div style={{ borderBottom: `1px solid ${border}`, background: open ? '#FFFBF7' : 'white', transition: 'background 0.15s' }}>

      {/* ── Fila principal (clickeable) ── */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: isDesktop ? 16 : 12, padding: isDesktop ? '14px 20px' : '14px 16px', cursor: 'pointer', userSelect: 'none' }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = '#FFF7ED' }}
        onMouseLeave={e => { e.currentTarget.style.background = open ? '#FFFBF7' : 'white' }}
      >
        <div style={{ fontSize: 12, color: '#9CA3AF', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0, width: 14 }}>▶</div>

        {/* Nombre + ubicación + badge proyecto */}
        <div style={{ flex: isDesktop ? '0 0 220px' : 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
          {p.location && (
            <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ opacity: 0.5 }}>📍</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.location}</span>
            </div>
          )}
          {(() => {
            const proy = proyectosArmar?.find(pa => pa.id === p.proyectoArmarId)
            if (proy) return (
              <span style={{ display: 'inline-block', marginTop: 3, fontSize: 10, fontWeight: 700, color: blue, background: blueLight, padding: '1px 7px', borderRadius: 99, border: '1px solid #BFDBFE', whiteSpace: 'nowrap', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {proy.nombre}
              </span>
            )
            return (
              <span style={{ display: 'inline-block', marginTop: 3, fontSize: 10, fontWeight: 600, color: '#D97706', background: '#FFFBEB', padding: '1px 7px', borderRadius: 99, border: '1px solid #FDE68A', whiteSpace: 'nowrap' }}>
                Sin proyecto vinculado
              </span>
            )
          })()}
        </div>

        {isDesktop && (
          <div style={{ flex: '0 0 160px', fontSize: 11, color: '#6B7280' }}>
            <div>{fmtShort(p.startDate)}</div>
            <div style={{ color: '#9CA3AF' }}>→ {fmtShort(p.endDate)}</div>
          </div>
        )}

        <div style={{ flex: isDesktop ? '0 0 160px' : '0 0 120px', minWidth: 80 }}>
          <ProgressBar value={p.progress} />
        </div>

        {isDesktop && (
          <div style={{ flex: '0 0 180px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Avatar name={p.responsible} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.responsible || '—'}</div>
              {p.contratista && <div style={{ fontSize: 10, color: '#9CA3AF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.contratista}</div>}
            </div>
          </div>
        )}

        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          <StatusBadge status={p.status} />
        </div>
      </div>

      {/* ── Panel expandido ── */}
      {open && (
        <div style={{ borderTop: `1px solid #FED7AA`, background: '#FFFBF7' }}>

          {/* Barra de pestañas + botones de acción */}
          <div style={{ padding: '12px 20px 0', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', borderBottom: `1px solid ${border}`, background: 'white' }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
              {TABS.map(tab => {
                const isActive = activeTab === tab.key
                const count = tab.key === 'avances' ? totalInformes : tab.key === 'certificados' ? totalCerts : tab.key === 'hitos' ? totalHitosPendientes : null
                return (
                  <button
                    key={tab.key}
                    onClick={(e) => { e.stopPropagation(); setActiveTab(tab.key) }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '7px 14px', marginBottom: 12,
                      borderRadius: 8, border: isActive ? 'none' : `1px solid ${border}`,
                      background: isActive ? orange : 'white',
                      color: isActive ? 'white' : mid,
                      fontWeight: isActive ? 700 : 500, fontSize: 12,
                      cursor: 'pointer', fontFamily: 'inherit',
                      transition: 'all 0.12s',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = light }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'white' }}
                  >
                    {tab.label}
                    {count != null && count > 0 && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: isActive ? 'rgba(255,255,255,0.3)' : '#F3F4F6', color: isActive ? 'white' : '#6B7280', borderRadius: 99, padding: '0px 5px', lineHeight: '16px' }}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Acciones */}
            {isEditor && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexShrink: 0 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(p) }}
                  style={{ padding: '7px 13px', borderRadius: 7, fontSize: 11, fontWeight: 600, border: `1px solid ${orange}`, background: 'white', color: orange, cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={e => e.currentTarget.style.background = orangeLight}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  ℹ️ Información
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(p.id) }}
                  style={{ padding: '7px 13px', borderRadius: 7, fontSize: 11, fontWeight: 600, border: `1px solid #FECACA`, background: '#FFF5F5', color: red, cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={e => e.currentTarget.style.background = redLight}
                  onMouseLeave={e => e.currentTarget.style.background = '#FFF5F5'}
                >
                  🗑 Eliminar
                </button>
              </div>
            )}
          </div>

          {/* Contenido de la pestaña */}
          <div style={{ padding: isDesktop ? '20px 24px 24px' : '16px 16px 20px' }}>
            {activeTab === 'resumen' && (
              <TabResumen p={p} cronograma={cronogramaArr} proyectosArmar={proyectosArmar} isDesktop={isDesktop} obraHitos={obraHitos} />
            )}
            {activeTab === 'cronograma' && (
              <CronogramaTab
                project={p}
                cronogramas={cronogramaArr}
                teamMembers={teamMembers}
                onCreateCronograma={onCreateCronograma}
                onSaveCronograma={onSaveCronograma}
                onCargarAvance={onCargarAvance}
                onDeleteCronograma={onDeleteCronograma}
                onEditarInforme={onEditarInforme}
                isEditor={isEditor}
                proyectosArmar={proyectosArmar}
                obraHitos={(obraHitos || []).filter(h => h.obraId === p.id)}
              />
            )}
            {activeTab === 'avances' && (
              <TabAvances cronograma={cronogramaArr} />
            )}
            {activeTab === 'hitos' && (
              <TabHitos
                p={p}
                obraHitos={obraHitos}
                onGuardarHito={onGuardarHito}
                onEliminarHito={onEliminarHito}
                isEditor={isEditor}
              />
            )}
            {activeTab === 'certificados' && (
              <TabCertificados p={p} cronograma={cronogramaArr} />
            )}
            {activeTab === 'equipo' && (
              <TabEquipo p={p} teamMembers={teamMembers} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ProjectList({
  projects, cronogramas, teamMembers, proyectosArmar, presupuestos = [],
  obraHitos = [], onGuardarHito, onEliminarHito,
  onAdd, onEdit, onDelete, onUpdateTasks,
  onCreateCronograma, onSaveCronograma, onCargarAvance,
  onDeleteCronograma, onEditarInforme, isEditor,
}) {
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
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, color: '#111827', letterSpacing: '-0.5px', marginBottom: 4 }}>Obras</h1>
        <p style={{ color: '#6B7280', fontSize: 14 }}>
          {filtered.length} {filtered.length === 1 ? 'obra encontrada' : 'obras encontradas'}
        </p>
      </div>

      <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: `1px solid ${border}`, overflow: 'hidden' }}>

        {/* Barra de herramientas */}
        <div style={{ padding: isMobile ? '14px 16px' : '16px 20px', borderBottom: `1px solid ${border}`, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>Lista de Obras</span>
              <span style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: 99, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{filtered.length}</span>
            </div>
            {isEditor && (
              <button
                onClick={onAdd}
                style={{ background: orange, color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit', boxShadow: '0 2px 6px rgba(232,100,26,0.4)' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                + Nueva Obra
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Buscar por nombre, ubicación, responsable…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ flex: 1, minWidth: 180, padding: '8px 12px', borderRadius: 8, border: `1px solid ${border}`, fontSize: 13, color: '#374151', background: light, fontFamily: 'inherit' }}
            />
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${border}`, fontSize: 13, color: '#374151', background: light, cursor: 'pointer', fontFamily: 'inherit' }}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '9px 20px', background: light, borderBottom: `1px solid ${border}` }}>
            <div style={{ width: 14 }} />
            <div style={{ flex: '0 0 220px', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nombre de obra</div>
            <div style={{ flex: '0 0 160px', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Período</div>
            <div style={{ flex: '0 0 160px', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Avance</div>
            <div style={{ flex: '0 0 180px', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Responsable</div>
            <div style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Estado</div>
          </div>
        )}

        {/* Lista */}
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#9CA3AF' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🏗️</div>
            <p style={{ fontWeight: 600, fontSize: 14, color: '#6B7280' }}>No se encontraron obras</p>
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
            teamMembers={teamMembers}
            isEditor={isEditor}
            proyectosArmar={proyectosArmar}
            presupuestos={presupuestos}
            obraHitos={obraHitos}
            onGuardarHito={onGuardarHito}
            onEliminarHito={onEliminarHito}
          />
        ))}
      </div>
    </div>
  )
}
