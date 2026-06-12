import { useState } from 'react'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { CalendarioTab } from './CalendarioPage'
import ModalDetalleHito, { semaforoHito } from './ModalDetalleHito'

const orange = '#E8641A', orangeLight = '#FFF3EB'
const dark = '#1A1A1A', mid = '#444', border = '#E0DDD8'
const green = '#2D7A4F', greenLight = '#EBF7F1'
const red = '#C0392B', redLight = '#FDECEA'
const blue = '#2563EB', blueLight = '#EFF6FF'

const TIPO_SHORT = {
  'proyecto_direccion_construccion_armar': 'Proy + Dir + Const',
  'obra_proyecto_externo':                 'Proyecto externo',
}

const ESTADO_GENERAL_META = {
  'En análisis': { color: blue,       bg: blueLight   },
  'En curso':    { color: green,      bg: greenLight  },
  'Pausado':     { color: '#F59E0B',  bg: '#FEF3C7'   },
  'Finalizado':  { color: mid,        bg: '#F3F4F6'   },
}

const PRESUP_META = {
  borrador: { label: 'Borrador', color: '#6B7280', bg: '#F3F4F6'   },
  enviado:  { label: 'Enviado',  color: orange,    bg: orangeLight },
  aprobado: { label: 'Aprobado', color: green,     bg: greenLight  },
}

function fmtCorta(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr.slice(0, 10) + 'T00:00:00').toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

const ESTADOS_CERT_VALIDOS = new Set(['borrador', 'emitido', 'aprobado_cliente', 'observado', 'facturado', 'pagado_parcial', 'pagado_total', 'anulado'])

function normalizarCertificado(cert) {
  if (!cert) return cert
  const montoCertificado = cert.montoCertificado ?? cert.totalCertificado ?? cert.total ?? 0
  const montoPagado = cert.montoPagado ?? 0
  const saldoPendiente = cert.saldoPendiente != null ? cert.saldoPendiente : (montoCertificado - montoPagado)
  let estado = cert.estado
  if (!estado || !ESTADOS_CERT_VALIDOS.has(estado)) {
    estado = estado === 'pagado' ? 'pagado_total' : 'emitido'
  }
  return { ...cert, montoCertificado, montoPagado, saldoPendiente, estado }
}

const cardBase = {
  background: 'white',
  border: `1px solid ${border}`,
  borderRadius: 12,
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
}

const sectionTitleStyle = {
  fontSize: 11, fontWeight: 700, color: '#9CA3AF',
  textTransform: 'uppercase', letterSpacing: '0.06em',
  margin: 0,
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function MiniBar({ value, color = orange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(100, value)}%`, height: '100%', background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 30, textAlign: 'right' }}>{value}%</span>
    </div>
  )
}

function MetricCard({ icon, value, label, color, bg, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        ...cardBase, padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.12s, box-shadow 0.12s',
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)' } }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div style={{ width: 42, height: 42, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 900, color, lineHeight: 1, letterSpacing: '-0.5px' }}>{value}</div>
        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  )
}

function SectionCard({ title, children, onVerTodas }) {
  return (
    <div style={{ ...cardBase, overflow: 'hidden' }}>
      <div style={{ padding: '13px 18px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={sectionTitleStyle}>{title}</p>
        {onVerTodas && (
          <button
            onClick={onVerTodas}
            style={{ background: 'none', border: `1px solid ${border}`, borderRadius: 6, padding: '4px 11px', color: mid, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            Ver todos →
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

function EmptyRow({ msg }) {
  return <div style={{ padding: '22px 18px', textAlign: 'center', color: '#D1D5DB', fontSize: 13 }}>{msg}</div>
}

function RowDivider() {
  return <div style={{ borderBottom: `1px solid #F7F7F5` }} />
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({
  projects        = [],
  cronogramas     = {},
  proyectosArmar  = [],
  calendarioEventos = [],
  presupuestos    = [],
  teamMembers     = [],
  obraHitos       = [],
  onGuardarHito,
  onEliminarHito,
  onAdd,
  onNavigate,
  isEditor,
}) {
  const { isMobile, isDesktop } = useBreakpoint()
  const [hitoDetalle, setHitoDetalle] = useState(null)

  const today = new Date().toISOString().slice(0, 10)
  const in7Days = new Date()
  in7Days.setDate(in7Days.getDate() + 7)
  const in7DaysStr = in7Days.toISOString().slice(0, 10)

  const nav = (page) => onNavigate && onNavigate(page)
  const gap = isMobile ? 12 : 16

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpiProyectos    = proyectosArmar.filter(p => p.estadoGeneral !== 'Finalizado').length
  const kpiObras        = projects.filter(p => p.status === 'activa').length
  const kpiPresupuestos = presupuestos.filter(p => p.estadoVersion === 'borrador' || p.estadoVersion === 'enviado').length
  const allCerts        = Object.values(cronogramas).flat().flatMap(c => c.certificados || []).map(normalizarCertificado)
  const kpiCerts        = allCerts.filter(c => c.saldoPendiente > 0 && c.estado !== 'anulado').length
  const kpiCertsVencidos = allCerts.filter(c => c.fechaVencimiento && c.fechaVencimiento < today && c.saldoPendiente > 0).length
  const kpiHitos        = calendarioEventos.filter(e => e.fecha >= today && e.fecha <= in7DaysStr).length

  // ── Listas ──────────────────────────────────────────────────────────────────
  const proyActivos     = proyectosArmar.filter(p => p.estadoGeneral !== 'Finalizado').slice(0, 5)
  const obrasActivas    = projects.filter(p => p.status === 'activa').slice(0, 5)
  const presupRecientes = presupuestos.slice(0, 5)

  const hitosUnificados = [
    ...obraHitos.map(h => ({
      id:         `obra-${h.id}`,
      nombre:     h.nombre,
      fecha:      h.fechaPrevista,
      esHitoObra: true,
      raw:        h,
    })),
    ...calendarioEventos
      .filter(e => e.tipoEvento === 'hito' && e.origen !== 'obra')
      .map(e => ({
        id:         `cal-${e.id}`,
        nombre:     e.titulo,
        fecha:      e.fecha,
        esHitoObra: false,
        raw:        e,
      })),
  ].sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))

  const handleClickHito = (item) => {
    if (item.esHitoObra) {
      setHitoDetalle({ hito: item.raw, obra: projects.find(p => String(p.id) === String(item.raw.obraId)) })
    } else {
      const e = item.raw
      const obra = e.obraId ? projects.find(p => String(p.id) === String(e.obraId)) : null
      const pa = !obra && e.proyectoArmarId ? proyectosArmar.find(x => String(x.id) === String(e.proyectoArmarId)) : null
      setHitoDetalle({
        hito: { nombre: e.titulo, fechaPrevista: e.fecha, estado: e.estado || 'pendiente' },
        obra: obra ? { name: obra.name } : pa ? { name: pa.nombre } : null,
      })
    }
  }

  // ── Layout ──────────────────────────────────────────────────────────────────
  const kpiCols  = isMobile ? 'repeat(2, 1fr)' : isDesktop ? 'repeat(6, 1fr)' : 'repeat(3, 1fr)'
  const midCols  = isDesktop ? 'repeat(2, 1fr)' : '1fr'
  const botCols  = isDesktop ? '1fr 340px' : '1fr'

  const todayLabel = new Date().toLocaleDateString('es-CL', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).replace(/^\w/, c => c.toUpperCase())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 22 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 900, color: dark, letterSpacing: '-0.5px', marginBottom: 3 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>{todayLabel}</p>
        </div>
        {isEditor && (
          <button
            onClick={onAdd}
            style={{ padding: '9px 18px', borderRadius: 9, border: 'none', background: orange, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(232,100,26,0.28)', whiteSpace: 'nowrap' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            + Nueva Obra
          </button>
        )}
      </div>

      {/* ── Fila superior — KPIs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: kpiCols, gap }}>
        <MetricCard icon="📋" value={kpiProyectos}    label="Proyectos activos"        color={blue}      bg={blueLight}   onClick={() => nav('proyectos')}   />
        <MetricCard icon="🏗️" value={kpiObras}         label="Obras activas"            color={orange}    bg={orangeLight} onClick={() => nav('obras')}       />
        <MetricCard icon="💰" value={kpiPresupuestos}  label="Presupuestos pendientes"  color={'#D97706'} bg={'#FEF3C7'}   onClick={() => nav('presupuestos')} />
        <MetricCard icon="📄" value={kpiCerts}         label="Certificados pendientes"  color={green}     bg={greenLight}  onClick={() => nav('cronogramas')} />
        <MetricCard icon="⚠️" value={kpiCertsVencidos} label="Certificados vencidos"    color={kpiCertsVencidos > 0 ? red : mid} bg={kpiCertsVencidos > 0 ? redLight : '#F3F4F6'} onClick={() => nav('cronogramas')} />
        <MetricCard icon="📅" value={kpiHitos}         label="Hitos próx. 7 días"       color={red}       bg={redLight}    onClick={() => nav('calendario')}  />
      </div>

      {/* ── Fila media — 2 columnas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: midCols, gap }}>

        {/* Proyectos en curso */}
        <SectionCard title="Proyectos en curso" onVerTodas={() => nav('proyectos')}>
          {proyActivos.length === 0
            ? <EmptyRow msg="Sin proyectos activos" />
            : proyActivos.map((p, i) => {
              const meta = ESTADO_GENERAL_META[p.estadoGeneral] || ESTADO_GENERAL_META['En análisis']
              const tipo = TIPO_SHORT[p.tipoEncargo] || p.tipoEncargo || '—'
              return (
                <div key={p.id}>
                  <div style={{ padding: '10px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: dark, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{tipo}</div>
                      </div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, background: meta.bg, padding: '2px 8px', borderRadius: 99, flexShrink: 0, whiteSpace: 'nowrap' }}>{p.estadoGeneral}</span>
                    </div>
                    <MiniBar value={p.avanceTotal ?? 0} color={meta.color} />
                  </div>
                  {i < proyActivos.length - 1 && <RowDivider />}
                </div>
              )
            })
          }
        </SectionCard>

        {/* Obras activas */}
        <SectionCard title="Obras activas" onVerTodas={() => nav('obras')}>
          {obrasActivas.length === 0
            ? <EmptyRow msg="Sin obras activas" />
            : obrasActivas.map((p, i) => {
              const proyVinc  = proyectosArmar.find(pa => String(pa.id) === String(p.proyectoArmarId))
              const progColor = p.progress >= 80 ? green : p.progress >= 40 ? orange : '#D97706'
              return (
                <div key={p.id}>
                  <div style={{ padding: '10px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: dark, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span>{p.responsible || '—'}</span>
                          {proyVinc && (
                            <>
                              <span style={{ color: '#D1D5DB' }}>·</span>
                              <span style={{ color: blue, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{proyVinc.nombre}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <MiniBar value={p.progress} color={progColor} />
                  </div>
                  {i < obrasActivas.length - 1 && <RowDivider />}
                </div>
              )
            })
          }
        </SectionCard>

      </div>

      {/* ── Fila inferior — 2 columnas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: botCols, gap, alignItems: 'start' }}>

        {/* Presupuestos recientes */}
        <SectionCard title="Presupuestos recientes" onVerTodas={() => nav('presupuestos')}>
          {presupRecientes.length === 0
            ? <EmptyRow msg="Sin presupuestos" />
            : presupRecientes.map((pr, i) => {
              const obra = projects.find(p => p.id === pr.proyectoId)
              const meta = PRESUP_META[pr.estadoVersion] || PRESUP_META.borrador
              const nombre = obra?.name || `Presupuesto ${typeof pr.id === 'string' ? pr.id.slice(0, 8) : pr.id}`
              return (
                <div key={pr.id}>
                  <div style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nombre}</div>
                      {pr.fechaCreacion && (
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{fmtCorta(pr.fechaCreacion)}</div>
                      )}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, background: meta.bg, padding: '3px 10px', borderRadius: 99, flexShrink: 0 }}>{meta.label}</span>
                  </div>
                  {i < presupRecientes.length - 1 && <RowDivider />}
                </div>
              )
            })
          }
        </SectionCard>

        {/* Mini calendario */}
        <CalendarioTab compact eventos={calendarioEventos} />
      </div>

      {/* ── Hitos (obra + proyecto) ── */}
      <SectionCard title="Hitos" onVerTodas={() => nav('calendario')}>
        {hitosUnificados.length === 0
          ? <EmptyRow msg="Sin hitos cargados" />
          : hitosUnificados.map((item, i) => {
            const semaforo = semaforoHito(item.raw)
            const e = item.raw
            const obraNombre = item.esHitoObra
              ? projects.find(p => String(p.id) === String(e.obraId))?.name
              : (e.obraId
                  ? projects.find(p => String(p.id) === String(e.obraId))?.name
                  : proyectosArmar.find(pa => String(pa.id) === String(e.proyectoArmarId))?.nombre)
            const isHoy = item.fecha === today
            return (
              <div key={item.id}>
                <div
                  onClick={() => handleClickHito(item)}
                  style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = '#FAFAFA'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: semaforo.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</div>
                    <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {obraNombre || (item.esHitoObra ? '—' : 'Proyecto')}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: semaforo.color, background: semaforo.bg, padding: '3px 10px', borderRadius: 99, flexShrink: 0 }}>{semaforo.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isHoy ? orange : mid, background: isHoy ? orangeLight : '#F3F4F6', padding: '3px 10px', borderRadius: 99, flexShrink: 0 }}>
                    {isHoy ? 'Hoy' : fmtCorta(item.fecha)}
                  </span>
                </div>
                {i < hitosUnificados.length - 1 && <RowDivider />}
              </div>
            )
          })
        }
      </SectionCard>

      {hitoDetalle && (
        <ModalDetalleHito
          hito={hitoDetalle.hito}
          obra={hitoDetalle.obra}
          onClose={() => setHitoDetalle(null)}
        />
      )}
    </div>
  )
}

export default Dashboard
