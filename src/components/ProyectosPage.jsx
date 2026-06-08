import { useState } from 'react'

// ─── Constantes ───────────────────────────────────────────────────────────────

const ESTADO_COLORS = {
  'En curso':   { color: '#059669', bg: '#D1FAE5' },
  'Pausado':    { color: '#F59E0B', bg: '#FEF3C7' },
  'Finalizado': { color: '#2563EB', bg: '#EFF6FF' },
}

const CHECKLIST_SECTIONS = [
  { id: 'preliminares', label: 'PRELIMINARES', items: [
    'Análisis de necesidades del cliente',
    'Definición de programa arquitectónico',
    'Relevamiento del terreno / local',
    'Estudio de factibilidad',
    'Contrato de honorarios firmado',
  ]},
  { id: 'lote', label: 'DEL LOTE', items: [
    'Escritura / título de propiedad',
    'Informe de dominio',
    'Plano catastral',
    'Cédula catastral',
    'Certificado de aptitud hidráulica',
  ]},
  { id: 'municipales', label: 'MUNICIPALES', items: [
    'Certificado de uso del suelo',
    'Normativa urbanística aplicable',
    'Consulta previa al municipio',
    'Alineaciones y niveles',
    'Factibilidad de servicios (agua, gas, cloacas)',
  ]},
  { id: 'anteproyecto', label: 'ANTEPROYECTO', items: [
    'Plantas generales',
    'Cortes y vistas',
    'Memoria descriptiva',
    'Presupuesto preliminar',
    'Aprobación del cliente',
  ]},
  { id: 'proyecto', label: 'PROYECTO', items: [
    'Planos de arquitectura completos',
    'Planos de estructura',
    'Planos de instalaciones',
    'Planilla de locales',
    'Especificaciones técnicas',
    'Presupuesto de obra definitivo',
    'Documentación técnica completa',
  ]},
  { id: 'transferencia', label: 'TRANSFERENCIA A OBRA', items: [
    'Legajo de obra completo',
    'Cómputo métrico',
    'Planillas de detalle',
    'Pliego de condiciones',
    'Entrega al director de obra',
  ]},
]

const TOTAL_ITEMS = CHECKLIST_SECTIONS.reduce((s, sec) => s + sec.items.length, 0)

// ─── Persistencia ─────────────────────────────────────────────────────────────

function loadProyectos() {
  try { return JSON.parse(localStorage.getItem('armar-proyectos') || '[]') } catch { return [] }
}
function saveProyectos(data) {
  localStorage.setItem('armar-proyectos', JSON.stringify(data))
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function MiniProgressBar({ value }) {
  const color = value === 100 ? '#10B981' : value >= 70 ? '#F97316' : value >= 40 ? '#F59E0B' : '#9CA3AF'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ flex: 1, height: 5, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 30, textAlign: 'right' }}>{value}%</span>
    </div>
  )
}

// ─── Modal Proyecto ───────────────────────────────────────────────────────────

function ModalProyecto({ proy, onSave, onClose }) {
  const [nombre,      setNombre]      = useState(proy?.nombre      || '')
  const [comitente,   setComitente]   = useState(proy?.comitente   || '')
  const [direccion,   setDireccion]   = useState(proy?.direccion   || '')
  const [fechaInicio, setFechaInicio] = useState(proy?.fechaInicio || '')
  const [estado,      setEstado]      = useState(proy?.estado      || 'En curso')

  const inputStyle = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }
  const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 5, letterSpacing: '0.05em' }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!nombre.trim()) return
    onSave({ nombre: nombre.trim(), comitente: comitente.trim(), direccion: direccion.trim(), fechaInicio, estado })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 520, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: 17, fontWeight: 900, color: 'var(--gray-900)' }}>
            {proy ? 'Editar proyecto' : 'Nuevo proyecto'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)', padding: '2px 8px' }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nombre del proyecto *</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Ej: Casa Rodríguez" style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#E8641A' }}
              onBlur={e => { e.target.style.borderColor = 'var(--gray-200)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Comitente</label>
              <input value={comitente} onChange={e => setComitente(e.target.value)} placeholder="Ej: Familia García" style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#E8641A' }}
                onBlur={e => { e.target.style.borderColor = 'var(--gray-200)' }} />
            </div>
            <div>
              <label style={labelStyle}>Fecha inicio</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={inputStyle}
                onFocus={e => { e.target.style.borderColor = '#E8641A' }}
                onBlur={e => { e.target.style.borderColor = 'var(--gray-200)' }} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Dirección</label>
            <input value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Ej: Av. Siempre Viva 742, CABA" style={inputStyle}
              onFocus={e => { e.target.style.borderColor = '#E8641A' }}
              onBlur={e => { e.target.style.borderColor = 'var(--gray-200)' }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Estado</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['En curso', 'Pausado', 'Finalizado'].map(est => {
                const col    = ESTADO_COLORS[est]
                const active = estado === est
                return (
                  <button key={est} type="button" onClick={() => setEstado(est)}
                    style={{ padding: '7px 14px', borderRadius: 8, border: `2px solid ${active ? col.color : 'var(--gray-200)'}`, background: active ? col.bg : 'white', color: active ? col.color : 'var(--gray-400)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                    {est}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-700)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>Cancelar</button>
            <button type="submit" style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: '#E8641A', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(232,100,26,0.3)' }}>
              {proy ? 'Guardar cambios' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

function ProyectosPage({ isEditor }) {
  const [proyectos,        setProyectos]        = useState(loadProyectos)
  const [expandedId,       setExpandedId]       = useState(null)
  const [expandedSections, setExpandedSections] = useState({})
  const [showModal,        setShowModal]        = useState(false)
  const [editingProy,      setEditingProy]      = useState(null)
  const [confirmDeleteId,  setConfirmDeleteId]  = useState(null)

  const persist = (data) => { setProyectos(data); saveProyectos(data) }

  const handleCreate = () => { setEditingProy(null); setShowModal(true) }
  const handleEdit   = (p) => { setEditingProy(p); setShowModal(true) }

  const handleSave = (data) => {
    if (editingProy) {
      persist(proyectos.map(p => p.id === editingProy.id ? { ...editingProy, ...data } : p))
    } else {
      persist([...proyectos, { id: `proy-${Date.now()}`, checklist: {}, ...data }])
    }
    setShowModal(false)
  }

  const handleDelete = (id) => {
    persist(proyectos.filter(p => p.id !== id))
    setConfirmDeleteId(null)
    if (expandedId === id) setExpandedId(null)
  }

  const toggleCheck = (proyId, key) => {
    persist(proyectos.map(p => p.id === proyId
      ? { ...p, checklist: { ...(p.checklist || {}), [key]: !(p.checklist || {})[key] } }
      : p
    ))
  }

  const toggleSection = (proyId, secId) => {
    const key = `${proyId}-${secId}`
    setExpandedSections(prev => ({ ...prev, [key]: prev[key] === false ? true : false }))
  }

  const getProgress = (p) => Math.round((Object.values(p.checklist || {}).filter(Boolean).length / TOTAL_ITEMS) * 100)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--gray-900)', letterSpacing: '-0.5px', marginBottom: 4 }}>Proyectos</h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
            {proyectos.length} {proyectos.length === 1 ? 'proyecto' : 'proyectos'}
            {proyectos.length > 0 && ` · ${Math.round(proyectos.reduce((s, p) => s + getProgress(p), 0) / proyectos.length)}% promedio documentado`}
          </p>
        </div>
        {isEditor && (
          <button onClick={handleCreate}
            style={{ padding: '10px 18px', borderRadius: 9, border: 'none', background: '#E8641A', color: 'white', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 2px 8px rgba(232,100,26,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
            + Nuevo proyecto
          </button>
        )}
      </div>

      {/* Lista */}
      {proyectos.length === 0 ? (
        <div style={{ border: '2px dashed var(--gray-200)', borderRadius: 14, padding: '48px 20px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
          No hay proyectos de arquitectura cargados.
          {isEditor && <> <span onClick={handleCreate} style={{ color: '#E8641A', cursor: 'pointer', fontWeight: 700 }}>Crear el primero</span></>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {proyectos.map(p => {
            const progress   = getProgress(p)
            const estadoMeta = ESTADO_COLORS[p.estado] || ESTADO_COLORS['En curso']
            const isExpanded = expandedId === p.id
            return (
              <div key={p.id} style={{ background: 'white', borderRadius: 12, border: '1px solid var(--gray-200)', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                {/* Fila */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer', background: 'white' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-800)', marginBottom: 2 }}>{p.nombre}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                      {[p.comitente, p.direccion, p.fechaInicio ? `desde ${p.fechaInicio}` : null].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <div style={{ minWidth: 130 }}>
                    <MiniProgressBar value={progress} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: estadoMeta.color, background: estadoMeta.bg, padding: '3px 10px', borderRadius: 99, flexShrink: 0 }}>
                    {p.estado}
                  </span>
                  {isEditor && (
                    <>
                      <button
                        onClick={e => { e.stopPropagation(); handleEdit(p) }}
                        style={{ padding: '5px 12px', borderRadius: 6, border: '1px solid var(--gray-200)', background: 'white', color: '#E8641A', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#FFF3EB'; e.currentTarget.style.borderColor = '#F28C4E' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'var(--gray-200)' }}>
                        Editar
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteId(p.id) }}
                        style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #FCA5A5', background: 'white', color: '#C0392B', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, lineHeight: 1 }}>
                        🗑
                      </button>
                    </>
                  )}
                  <span style={{ fontSize: 10, color: 'var(--gray-300)', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>▶</span>
                </div>

                {/* Checklist */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--gray-200)', padding: 16, background: '#FAFAFA' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                      Documentación — {Object.values(p.checklist || {}).filter(Boolean).length} / {TOTAL_ITEMS} ítems completados
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {CHECKLIST_SECTIONS.map(sec => {
                        const secKey        = `${p.id}-${sec.id}`
                        const isSectionOpen = expandedSections[secKey] !== false
                        const checkedCount  = sec.items.filter((_, i) => (p.checklist || {})[`${sec.id}-${i}`]).length
                        const allDone       = checkedCount === sec.items.length
                        return (
                          <div key={sec.id} style={{ border: '1px solid var(--gray-200)', borderRadius: 9, overflow: 'hidden', background: 'white' }}>
                            <div
                              onClick={() => toggleSection(p.id, sec.id)}
                              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', background: allDone ? '#F0FDF4' : 'white' }}
                              onMouseEnter={e => { if (!allDone) e.currentTarget.style.background = '#F9FAFB' }}
                              onMouseLeave={e => { if (!allDone) e.currentTarget.style.background = 'white' }}
                            >
                              {allDone && <span style={{ fontSize: 12 }}>✅</span>}
                              <span style={{ fontSize: 11, fontWeight: 800, color: allDone ? '#059669' : 'var(--gray-600)', flex: 1, letterSpacing: '0.05em' }}>{sec.label}</span>
                              <span style={{ fontSize: 11, fontWeight: 700, color: allDone ? '#059669' : checkedCount > 0 ? '#F59E0B' : 'var(--gray-300)' }}>
                                {checkedCount}/{sec.items.length}
                              </span>
                              <span style={{ fontSize: 9, color: 'var(--gray-300)', transform: isSectionOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', marginLeft: 4 }}>▶</span>
                            </div>
                            {isSectionOpen && (
                              <div style={{ borderTop: '1px solid var(--gray-100)', padding: '8px 14px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {sec.items.map((item, i) => {
                                  const key     = `${sec.id}-${i}`
                                  const checked = !!(p.checklist || {})[key]
                                  return (
                                    <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', padding: '4px 2px', borderRadius: 5 }}>
                                      <input type="checkbox" checked={checked} onChange={() => toggleCheck(p.id, key)}
                                        style={{ width: 15, height: 15, accentColor: '#E8641A', cursor: 'pointer', flexShrink: 0 }} />
                                      <span style={{ fontSize: 12, color: checked ? '#9CA3AF' : 'var(--gray-700)', textDecoration: checked ? 'line-through' : 'none' }}>
                                        {item}
                                      </span>
                                    </label>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modales */}
      {showModal && <ModalProyecto proy={editingProy} onSave={handleSave} onClose={() => setShowModal(false)} />}
      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 14, maxWidth: 380, width: '100%', padding: '28px 24px', boxShadow: '0 16px 48px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🗑</div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#1A1A1A', marginBottom: 8 }}>¿Eliminar proyecto?</h3>
            <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6, marginBottom: 24 }}>Se eliminará el proyecto y su checklist de documentación.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDeleteId(null)}
                style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #E0DDD8', background: 'white', color: '#444', fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)}
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

export default ProyectosPage
