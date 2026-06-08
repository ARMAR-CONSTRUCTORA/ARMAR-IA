import { useState, useRef, useEffect } from 'react'

// ─── Constantes existentes ────────────────────────────────────────────────────

const STATUS_COLORS = {
  activa:    { color: '#059669', bg: '#D1FAE5' },
  terminada: { color: '#2563EB', bg: '#DBEAFE' },
  atrasada:  { color: '#DC2626', bg: '#FEE2E2' },
}
const STATUS_LABELS = { activa: 'Activa', terminada: 'Terminada', atrasada: 'Atrasada' }

const AVATAR_PALETTE = [
  '#F97316', '#3B82F6', '#10B981', '#8B5CF6',
  '#EC4899', '#F59E0B', '#14B8A6', '#6366F1',
]

const CATEGORIES = ['OBRA', 'PROYECTO', 'GREMIOS', 'ADMINISTRACIÓN']

const ROLE_META = {
  'Resp. Obra':     { color: '#F97316', bg: '#FFF7ED' },
  'Resp. Proyecto': { color: '#3B82F6', bg: '#EFF6FF' },
  'Contratista':    { color: '#8B5CF6', bg: '#F5F3FF' },
}

const CATEGORY_META = {
  OBRA:           { label: 'Obra',           color: '#F97316', bg: '#FFF7ED', border: '#FED7AA' },
  PROYECTO:       { label: 'Proyecto',       color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  GREMIOS:        { label: 'Gremios',        color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
  'ADMINISTRACIÓN': { label: 'Administración', color: '#10B981', bg: '#D1FAE5', border: '#6EE7B7' },
}

// ─── Constantes nuevas ────────────────────────────────────────────────────────

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

const TOTAL_CHECKLIST_ITEMS = CHECKLIST_SECTIONS.reduce((s, sec) => s + sec.items.length, 0)

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAY_LABELS  = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom']

// ─── Helpers persistencia proyectos ──────────────────────────────────────────

function loadProyectos() {
  try { return JSON.parse(localStorage.getItem('armar-proyectos') || '[]') } catch { return [] }
}
function saveProyectos(data) {
  localStorage.setItem('armar-proyectos', JSON.stringify(data))
}

// ─── Helpers existentes ───────────────────────────────────────────────────────

function avatarColor(name) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_PALETTE.length
  return AVATAR_PALETTE[h]
}

function initials(name) {
  const words = name.split(' ').filter(w => w.length > 2)
  return words.slice(-2).map(w => w[0].toUpperCase()).join('').slice(0, 2)
}

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

function DeleteConfirm({ name, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 380, width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 8 }}>Eliminar persona</h3>
        <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 24 }}>
          ¿Eliminar a <strong>{name}</strong>? Esta acción no se puede deshacer.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onCancel} style={{ padding: '10px 22px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-700)', cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'inherit' }}>Cancelar</button>
          <button onClick={onConfirm} style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: '#DC2626', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' }}>Sí, eliminar</button>
        </div>
      </div>
    </div>
  )
}

function AddMemberModal({ category, onAdd, onClose }) {
  const [name, setName] = useState('')
  const [cat, setCat]   = useState(category)
  const inputRef = useRef(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed, cat)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 32, maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 20 }}>Agregar persona</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre</label>
            <input ref={inputRef} value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Ing. Juan García"
              style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
              onFocus={e => { e.target.style.borderColor = '#F97316' }}
              onBlur={e => { e.target.style.borderColor = 'var(--gray-200)' }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Categoría</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => {
                const meta   = CATEGORY_META[c]
                const active = cat === c
                return (
                  <button key={c} type="button" onClick={() => setCat(c)}
                    style={{ padding: '8px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', border: `2px solid ${active ? meta.color : 'var(--gray-200)'}`, background: active ? meta.bg : 'white', color: active ? meta.color : 'var(--gray-400)', transition: 'all 0.15s' }}>
                    {c}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 22px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-700)', cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'inherit' }}>Cancelar</button>
            <button type="submit" style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: '#F97316', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' }}>Agregar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MemberCard({ member, obras, onEdit, onDelete, isEditor }) {
  const [editing, setEditing]   = useState(false)
  const [editName, setEditName] = useState(member.name)
  const inputRef = useRef(null)
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const confirmEdit = () => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== member.name) onEdit(member.id, trimmed)
    else setEditName(member.name)
    setEditing(false)
  }

  const activas    = obras.filter(o => o.status === 'activa').length
  const terminadas = obras.filter(o => o.status === 'terminada').length
  const atrasadas  = obras.filter(o => o.status === 'atrasada').length
  const avgProg    = obras.length ? Math.round(obras.reduce((s, o) => s + o.progress, 0) / obras.length) : 0
  const color      = avatarColor(member.name)
  const ini        = initials(member.name)

  return (
    <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid var(--gray-200)', overflow: 'hidden' }}>
      <div style={{ padding: '18px 18px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'white', fontSize: 17, flexShrink: 0, letterSpacing: '-0.5px' }}>
          {ini}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input ref={inputRef} value={editName} onChange={e => setEditName(e.target.value)}
              onBlur={confirmEdit}
              onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') { setEditName(member.name); setEditing(false) } }}
              style={{ width: '100%', fontSize: 14, fontWeight: 700, border: '1px solid #F97316', borderRadius: 6, padding: '3px 8px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: 'var(--gray-800)' }} />
          ) : (
            <div style={{ fontWeight: 700, color: 'var(--gray-800)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{member.name}</div>
          )}
          <div style={{ color: 'var(--gray-400)', fontSize: 11, marginTop: 2 }}>
            {obras.length} {obras.length === 1 ? 'obra asignada' : 'obras asignadas'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--orange)', lineHeight: 1 }}>{avgProg}%</div>
            <div style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 500, marginTop: 1 }}>promedio</div>
          </div>
          {isEditor && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => { setEditName(member.name); setEditing(true) }} title="Editar nombre"
                style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--gray-200)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', fontSize: 13 }}
                onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#3B82F6'; e.currentTarget.style.borderColor = '#BFDBFE' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--gray-400)'; e.currentTarget.style.borderColor = 'var(--gray-200)' }}>✏️</button>
              <button onClick={() => onDelete(member.id, member.name)} title="Eliminar"
                style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid var(--gray-200)', background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', fontSize: 13 }}
                onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = '#FCA5A5' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--gray-400)'; e.currentTarget.style.borderColor = 'var(--gray-200)' }}>🗑️</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', borderTop: '1px solid var(--gray-200)', borderBottom: obras.length > 0 ? '1px solid var(--gray-200)' : 'none' }}>
        {[
          { label: 'Activas',    value: activas,    color: '#059669' },
          { label: 'Terminadas', value: terminadas, color: '#2563EB' },
          { label: 'Atrasadas',  value: atrasadas,  color: '#DC2626' },
        ].map(({ label, value, color: c }, idx, arr) => (
          <div key={label} style={{ flex: 1, padding: '9px 0', textAlign: 'center', borderRight: idx < arr.length - 1 ? '1px solid var(--gray-200)' : 'none' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: c }}>{value}</div>
            <div style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 600, marginTop: 1 }}>{label}</div>
          </div>
        ))}
      </div>

      {obras.length > 0 && (
        <div style={{ padding: '8px 0' }}>
          {obras.map(o => (
            <div key={o.id} style={{ padding: '8px 16px 6px', display: 'flex', gap: 10 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 4, background: STATUS_COLORS[o.status].color }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--gray-700)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>{o.name}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 5 }}>
                  {o.roles.map(role => (
                    <span key={role} style={{ fontSize: 10, fontWeight: 700, color: ROLE_META[role].color, background: ROLE_META[role].bg, padding: '1px 7px', borderRadius: 99 }}>{role}</span>
                  ))}
                </div>
                <MiniProgressBar value={o.progress} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, flexShrink: 0, marginLeft: 4, alignSelf: 'flex-start', color: STATUS_COLORS[o.status].color, background: STATUS_COLORS[o.status].bg, padding: '2px 8px', borderRadius: 99 }}>
                {STATUS_LABELS[o.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Modal Proyecto ───────────────────────────────────────────────────────────

function ModalProyecto({ proy, onSave, onClose }) {
  const [nombre,     setNombre]     = useState(proy?.nombre     || '')
  const [comitente,  setComitente]  = useState(proy?.comitente  || '')
  const [direccion,  setDireccion]  = useState(proy?.direccion  || '')
  const [fechaInicio,setFechaInicio]= useState(proy?.fechaInicio|| '')
  const [estado,     setEstado]     = useState(proy?.estado     || 'En curso')

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

// ─── Tab Proyectos ────────────────────────────────────────────────────────────

function ProyectosTab({ isEditor }) {
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
    const updated = proyectos.map(p => p.id === proyId
      ? { ...p, checklist: { ...(p.checklist || {}), [key]: !(p.checklist || {})[key] } }
      : p
    )
    persist(updated)
  }

  const toggleSection = (proyId, secId) => {
    const key = `${proyId}-${secId}`
    setExpandedSections(prev => ({ ...prev, [key]: prev[key] === false ? true : false }))
  }

  const getProgress = (p) => {
    const checked = Object.values(p.checklist || {}).filter(Boolean).length
    return Math.round((checked / TOTAL_CHECKLIST_ITEMS) * 100)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--gray-800)', marginBottom: 2 }}>Proyectos de arquitectura</h2>
          <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>
            {proyectos.length} {proyectos.length === 1 ? 'proyecto' : 'proyectos'}
            {proyectos.length > 0 && (
              <span> · {Math.round(proyectos.reduce((s, p) => s + getProgress(p), 0) / proyectos.length)}% promedio documentado</span>
            )}
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

                {/* Checklist expandido */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--gray-200)', padding: '16px', background: '#FAFAFA' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                      Documentación — {Object.values(p.checklist || {}).filter(Boolean).length} / {TOTAL_CHECKLIST_ITEMS} ítems completados
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
                              onMouseEnter={e => !allDone && (e.currentTarget.style.background = '#F9FAFB')}
                              onMouseLeave={e => !allDone && (e.currentTarget.style.background = 'white')}
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
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleCheck(p.id, key)}
                                        style={{ width: 15, height: 15, accentColor: '#E8641A', cursor: 'pointer', flexShrink: 0 }}
                                      />
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

// ─── Tab Calendario ───────────────────────────────────────────────────────────

function CalendarioTab() {
  const todayDate = new Date()
  const [current, setCurrent] = useState(() => new Date(todayDate.getFullYear(), todayDate.getMonth(), 1))

  const year         = current.getFullYear()
  const month        = current.getMonth()
  const daysInMonth  = new Date(year, month + 1, 0).getDate()
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7  // Lun=0 … Dom=6
  const prevMonthDays = new Date(year, month, 0).getDate()

  const cells = []
  for (let i = firstWeekday - 1; i >= 0; i--) cells.push({ day: prevMonthDays - i, type: 'prev' })
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = todayDate.getFullYear() === year && todayDate.getMonth() === month && todayDate.getDate() === d
    cells.push({ day: d, type: 'current', isToday })
  }
  const trailing = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7)
  for (let d = 1; d <= trailing; d++) cells.push({ day: d, type: 'next' })

  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))

  const isWeekend = (dayIndex) => dayIndex >= 5  // Sáb=5, Dom=6

  return (
    <div>
      <div style={{ background: 'white', borderRadius: 14, border: '1px solid var(--gray-200)', overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        {/* Navegación */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--gray-200)' }}>
          <button
            onClick={() => setCurrent(new Date(year, month - 1, 1))}
            style={{ width: 36, height: 36, borderRadius: 9, border: '1px solid var(--gray-200)', background: 'white', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)', lineHeight: 1 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = 'var(--gray-300)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'var(--gray-200)' }}>
            ‹
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--gray-800)' }}>{MONTH_NAMES[month]} {year}</div>
            <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 1 }}>
              {todayDate.getFullYear() === year && todayDate.getMonth() === month ? 'Mes actual' : ''}
            </div>
          </div>
          <button
            onClick={() => setCurrent(new Date(year, month + 1, 1))}
            style={{ width: 36, height: 36, borderRadius: 9, border: '1px solid var(--gray-200)', background: 'white', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-500)', lineHeight: 1 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB'; e.currentTarget.style.borderColor = 'var(--gray-300)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = 'var(--gray-200)' }}>
            ›
          </button>
        </div>

        {/* Cabecera días */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#F9FAFB', borderBottom: '1px solid var(--gray-200)' }}>
          {DAY_LABELS.map((d, i) => (
            <div key={d} style={{ padding: '9px 0', textAlign: 'center', fontSize: 11, fontWeight: 700, color: isWeekend(i) ? '#9CA3AF' : 'var(--gray-500)', letterSpacing: '0.06em' }}>{d}</div>
          ))}
        </div>

        {/* Semanas */}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: wi < weeks.length - 1 ? '1px solid #F3F4F6' : 'none' }}>
            {week.map((cell, di) => (
              <div key={di} style={{
                minHeight: 68,
                padding: '8px 6px',
                background: cell.type !== 'current' ? '#F9FAFB' : 'white',
                borderRight: di < 6 ? '1px solid #F3F4F6' : 'none',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}>
                <span style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: cell.isToday ? '#E8641A' : 'transparent',
                  color: cell.isToday
                    ? 'white'
                    : cell.type !== 'current'
                      ? '#D1D5DB'
                      : isWeekend(di) ? '#9CA3AF' : 'var(--gray-700)',
                  fontSize: 13,
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
      <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 12, textAlign: 'center' }}>
        Próximamente: hitos de cronograma y fechas de proyectos
      </p>
    </div>
  )
}

// ─── Tab Equipo (contenido existente extraído) ────────────────────────────────

function EquipoTab({ projects, teamMembers, onAddMember, onEditMember, onDeleteMember, isEditor }) {
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [addModal,     setAddModal]     = useState(null)

  const totalPersonas = teamMembers.length
  const totalObras    = projects.length

  const obrasByMember = (memberName) => {
    const result = []
    for (const p of projects) {
      const roles = []
      if (p.responsible         === memberName) roles.push('Resp. Obra')
      if (p.responsableProyecto === memberName) roles.push('Resp. Proyecto')
      if (p.contratista         === memberName) roles.push('Contratista')
      if (roles.length > 0) result.push({ ...p, roles })
    }
    return result
  }

  const handleDeleteClick   = (id, name) => setDeleteTarget({ id, name })
  const handleDeleteConfirm = () => { onDeleteMember(deleteTarget.id); setDeleteTarget(null) }

  return (
    <div>
      {/* Summary bar */}
      <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', border: '1px solid var(--gray-200)', padding: '18px 24px', marginBottom: 32, display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--gray-900)' }}>{totalPersonas}</div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 500 }}>Personas</div>
        </div>
        <div style={{ width: 1, height: 40, background: 'var(--gray-200)' }} />
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#059669' }}>{projects.filter(p => p.status === 'activa').length}</div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 500 }}>Obras activas</div>
        </div>
        <div style={{ width: 1, height: 40, background: 'var(--gray-200)' }} />
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#DC2626' }}>{projects.filter(p => p.status === 'atrasada').length}</div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 500 }}>Obras atrasadas</div>
        </div>
        <div style={{ width: 1, height: 40, background: 'var(--gray-200)' }} />
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--orange)' }}>{Math.round(projects.reduce((s, p) => s + p.progress, 0) / (totalObras || 1))}%</div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 500 }}>Avance promedio</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => {
            const meta  = CATEGORY_META[cat]
            const count = teamMembers.filter(m => m.category === cat).length
            return (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: meta.bg, border: `1px solid ${meta.border}` }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: meta.color }}>{cat}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'white', background: meta.color, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Botón agregar global */}
      {isEditor && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <button onClick={() => setAddModal('OBRA')}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 9, border: 'none', background: '#F97316', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(249,115,22,0.3)' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
            <span style={{ fontSize: 17, lineHeight: 1 }}>+</span> Agregar persona
          </button>
        </div>
      )}

      {/* Secciones por categoría */}
      {CATEGORIES.map(cat => {
        const meta    = CATEGORY_META[cat]
        const members = teamMembers.filter(m => m.category === cat)
        return (
          <div key={cat} style={{ marginBottom: 40 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ padding: '4px 14px', borderRadius: 99, background: meta.bg, border: `1px solid ${meta.border}`, fontSize: 12, fontWeight: 800, color: meta.color, letterSpacing: '0.06em' }}>
                  {cat}
                </div>
                <span style={{ fontSize: 13, color: 'var(--gray-400)', fontWeight: 500 }}>
                  {members.length} {members.length === 1 ? 'persona' : 'personas'}
                </span>
              </div>
              {isEditor && (
                <button onClick={() => setAddModal(cat)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: `1px solid ${meta.border}`, background: meta.bg, color: meta.color, cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '0.75' }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}>
                  + Agregar
                </button>
              )}
            </div>

            {members.length === 0 ? (
              <div style={{ border: `2px dashed ${meta.border}`, borderRadius: 14, padding: '28px 20px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
                No hay personas en esta categoría.
                {isEditor && <> <span style={{ color: meta.color, cursor: 'pointer', fontWeight: 600 }} onClick={() => setAddModal(cat)}>Agregar una</span></>}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
                {members.map(member => (
                  <MemberCard key={member.id} member={member} obras={obrasByMember(member.name)} onEdit={onEditMember} onDelete={handleDeleteClick} isEditor={isEditor} />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {addModal && <AddMemberModal category={addModal} onAdd={onAddMember} onClose={() => setAddModal(null)} />}
      {deleteTarget && <DeleteConfirm name={deleteTarget.name} onConfirm={handleDeleteConfirm} onCancel={() => setDeleteTarget(null)} />}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

const TABS = [
  { id: 'equipo',     label: 'Equipo',     group: 'PRINCIPAL' },
  { id: 'proyectos',  label: 'Proyectos',  group: 'PRINCIPAL' },
  { id: 'calendario', label: 'Calendario', group: 'GESTIÓN'   },
]

function EquipoPage({ projects, teamMembers, onAddMember, onEditMember, onDeleteMember, isEditor }) {
  const [activeTab, setActiveTab] = useState('equipo')

  const principal = TABS.filter(t => t.group === 'PRINCIPAL')
  const gestion   = TABS.filter(t => t.group === 'GESTIÓN')

  const tabBtn = (tab) => {
    const active = activeTab === tab.id
    return (
      <button key={tab.id} onClick={() => setActiveTab(tab.id)}
        style={{
          padding: '10px 16px',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          fontWeight: active ? 800 : 500,
          fontSize: 14,
          fontFamily: 'inherit',
          color: active ? '#E8641A' : 'var(--gray-500)',
          borderBottom: `2px solid ${active ? '#E8641A' : 'transparent'}`,
          marginBottom: -1,
          transition: 'color 0.15s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--gray-700)' }}
        onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--gray-500)' }}>
        {tab.label}
      </button>
    )
  }

  return (
    <div>
      {/* Header de página */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--gray-900)', letterSpacing: '-0.5px', marginBottom: 4 }}>Equipo</h1>
        <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
          {teamMembers.length} {teamMembers.length === 1 ? 'persona' : 'personas'} · {projects.length} obras en total
        </p>
      </div>

      {/* Tab bar con grupos */}
      <div style={{ display: 'flex', alignItems: 'flex-end', borderBottom: '1px solid var(--gray-200)', marginBottom: 28, gap: 0 }}>
        {/* Grupo PRINCIPAL */}
        <div style={{ display: 'flex', alignItems: 'flex-end', marginRight: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', letterSpacing: '0.07em', textTransform: 'uppercase', paddingBottom: 13, paddingRight: 6, paddingLeft: 2 }}>
            Principal
          </span>
          {principal.map(tabBtn)}
        </div>

        {/* Separador */}
        <div style={{ width: 1, height: 20, background: 'var(--gray-200)', margin: '0 12px', marginBottom: 8, flexShrink: 0 }} />

        {/* Grupo GESTIÓN */}
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', letterSpacing: '0.07em', textTransform: 'uppercase', paddingBottom: 13, paddingRight: 6 }}>
            Gestión
          </span>
          {gestion.map(tabBtn)}
        </div>
      </div>

      {/* Contenido */}
      {activeTab === 'equipo' && (
        <EquipoTab
          projects={projects}
          teamMembers={teamMembers}
          onAddMember={onAddMember}
          onEditMember={onEditMember}
          onDeleteMember={onDeleteMember}
          isEditor={isEditor}
        />
      )}
      {activeTab === 'proyectos'  && <ProyectosTab  isEditor={isEditor} />}
      {activeTab === 'calendario' && <CalendarioTab />}
    </div>
  )
}

export default EquipoPage
