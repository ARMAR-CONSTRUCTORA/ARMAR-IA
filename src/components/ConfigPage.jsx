import { useState } from 'react'
import { loadTemplates, saveTemplates } from '../data/templateStorage'

const cardStyle = {
  background: 'white', borderRadius: 14,
  boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
  border: '1px solid var(--gray-200)',
  padding: '24px 28px',
}

const inputSt = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--gray-200)', fontSize: 13,
  color: 'var(--gray-700)', fontFamily: 'inherit',
  background: 'white', boxSizing: 'border-box',
}

const btnPrimary = (enabled) => ({
  padding: '8px 16px', borderRadius: 7, border: 'none',
  background: enabled ? 'var(--orange)' : 'var(--gray-200)',
  color: enabled ? 'white' : 'var(--gray-400)',
  fontWeight: 700, fontSize: 13,
  cursor: enabled ? 'pointer' : 'default', fontFamily: 'inherit',
})

const btnSecondary = {
  padding: '8px 16px', borderRadius: 7,
  border: '1px solid var(--gray-200)', background: 'white',
  color: 'var(--gray-700)', fontWeight: 600, fontSize: 13,
  cursor: 'pointer', fontFamily: 'inherit',
}

function EtapaRow({ nombre, onRemove, onRename }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(nombre)

  const commit = () => {
    if (val.trim()) onRename(val.trim())
    setEditing(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 7, background: 'white', border: editing ? '1px solid var(--orange)' : '1px solid #FED7AA' }}>
      {editing ? (
        <input autoFocus value={val} onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          style={{ flex: 1, padding: '2px 4px', border: 'none', outline: 'none', fontSize: 13, fontFamily: 'inherit', background: 'transparent' }} />
      ) : (
        <span onClick={() => { setVal(nombre); setEditing(true) }} title="Clic para renombrar"
          style={{ flex: 1, fontSize: 13, color: 'var(--gray-700)', cursor: 'text' }}>{nombre}</span>
      )}
      <button onClick={onRemove}
        style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
    </div>
  )
}

function EditPanel({ tmpl, onSave, onCancel }) {
  const [nombre, setNombre] = useState(tmpl.nombre)
  const [etapas, setEtapas] = useState(tmpl.etapas.map(e => ({ ...e })))
  const [newEtapa, setNewEtapa] = useState('')

  const addEtapa = () => {
    if (!newEtapa.trim()) return
    setEtapas(p => [...p, { nombre: newEtapa.trim(), duracionDias: 5, pesoRelativo: 10, esCritica: false, tareas: [] }])
    setNewEtapa('')
  }

  const removeEtapa = (i) => setEtapas(p => p.filter((_, j) => j !== i))
  const renameEtapa = (i, val) => setEtapas(p => p.map((e, j) => j === i ? { ...e, nombre: val } : e))

  return (
    <div style={{ padding: 20, borderRadius: 12, border: '2px solid var(--orange)', background: '#FFF7ED' }}>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Nombre de plantilla</label>
        <input value={nombre} onChange={e => setNombre(e.target.value)} style={inputSt} />
      </div>

      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Etapas</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10, maxHeight: 280, overflowY: 'auto' }}>
        {etapas.map((et, i) => (
          <EtapaRow key={i} nombre={et.nombre}
            onRemove={() => removeEtapa(i)}
            onRename={(val) => renameEtapa(i, val)} />
        ))}
        {etapas.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--gray-400)', padding: '6px 0' }}>Sin etapas</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <input value={newEtapa} onChange={e => setNewEtapa(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addEtapa()}
          placeholder="Nueva etapa…"
          style={{ flex: 1, padding: '8px 12px', borderRadius: 7, border: '1px solid var(--gray-200)', fontSize: 13, fontFamily: 'inherit' }} />
        <button onClick={addEtapa} disabled={!newEtapa.trim()} style={btnPrimary(!!newEtapa.trim())}>
          Agregar
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={btnSecondary}>Cancelar</button>
        <button onClick={() => onSave({ nombre: nombre.trim(), etapas })} disabled={!nombre.trim()} style={btnPrimary(!!nombre.trim())}>
          Guardar cambios
        </button>
      </div>
    </div>
  )
}

function NewTemplatePanel({ onSave, onCancel }) {
  const [nombre, setNombre] = useState('')
  const [etapas, setEtapas] = useState([])
  const [input, setInput] = useState('')

  const add = () => {
    if (!input.trim()) return
    setEtapas(p => [...p, { nombre: input.trim(), duracionDias: 5, pesoRelativo: 10, esCritica: false, tareas: [] }])
    setInput('')
  }

  const canCreate = nombre.trim() && etapas.length > 0

  return (
    <div style={{ marginBottom: 20, padding: 20, borderRadius: 12, border: '2px solid var(--orange)', background: '#FFF7ED' }}>
      <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-800)', marginBottom: 16 }}>Nueva plantilla</div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Nombre</label>
        <input autoFocus value={nombre} onChange={e => setNombre(e.target.value)}
          placeholder="Ej: Galpón industrial"
          style={inputSt} />
      </div>

      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Etapas</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
        {etapas.map((et, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 7, background: 'white', border: '1px solid #FED7AA' }}>
            <span style={{ flex: 1, fontSize: 13, color: 'var(--gray-700)' }}>{et.nombre}</span>
            <button onClick={() => setEtapas(p => p.filter((_, j) => j !== i))}
              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
          </div>
        ))}
        {etapas.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--gray-400)', padding: '6px 0' }}>Agregá al menos una etapa.</div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Nombre de etapa…"
          style={{ flex: 1, padding: '8px 12px', borderRadius: 7, border: '1px solid var(--gray-200)', fontSize: 13, fontFamily: 'inherit' }} />
        <button onClick={add} disabled={!input.trim()} style={btnPrimary(!!input.trim())}>
          Agregar
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={btnSecondary}>Cancelar</button>
        <button onClick={() => onSave({ nombre: nombre.trim(), etapas })} disabled={!canCreate} style={btnPrimary(canCreate)}>
          Crear plantilla
        </button>
      </div>
    </div>
  )
}

function ConfigPage() {
  const [templates, setTemplates] = useState(() => loadTemplates())
  const [editingId, setEditingId] = useState(null)
  const [creando, setCreando] = useState(false)

  const persist = (updated) => {
    setTemplates(updated)
    saveTemplates(updated)
  }

  const handleSaveEdit = (id, { nombre, etapas }) => {
    persist(templates.map(t => t.id === id ? { ...t, nombre, etapas } : t))
    setEditingId(null)
  }

  const handleCreate = ({ nombre, etapas }) => {
    persist([...templates, {
      id: `custom_${Date.now()}`,
      nombre,
      icono: '📋',
      descripcion: '',
      duracionEstimada: '',
      etapas,
    }])
    setCreando(false)
  }

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: 'var(--gray-900)', letterSpacing: '-0.5px', marginBottom: 4 }}>
          Configuración
        </h1>
        <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
          Ajusta las preferencias de tu cuenta y la aplicación
        </p>
      </div>

      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 4 }}>Plantillas de cronograma</h2>
            <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>
              Los cambios aquí solo afectan cronogramas nuevos. Los cronogramas ya creados no se modifican.
            </p>
          </div>
          {!creando && !editingId && (
            <button onClick={() => setCreando(true)}
              style={{ ...btnPrimary(true), padding: '9px 18px', flexShrink: 0, boxShadow: '0 2px 8px rgba(249,115,22,0.3)' }}>
              + Nueva plantilla
            </button>
          )}
        </div>

        {creando && (
          <NewTemplatePanel
            onSave={handleCreate}
            onCancel={() => setCreando(false)} />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {templates.map(tmpl => (
            <div key={tmpl.id}>
              {editingId === tmpl.id ? (
                <EditPanel
                  tmpl={tmpl}
                  onSave={(data) => handleSaveEdit(tmpl.id, data)}
                  onCancel={() => setEditingId(null)} />
              ) : (
                <div style={{ padding: '16px 18px', borderRadius: 12, border: '1px solid var(--gray-200)', background: 'white', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 26, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{tmpl.icono || '📋'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-800)' }}>{tmpl.nombre}</span>
                      {tmpl.duracionEstimada && (
                        <span style={{ fontSize: 11, color: 'var(--gray-400)', background: 'var(--gray-100)', padding: '1px 8px', borderRadius: 99 }}>{tmpl.duracionEstimada}</span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--gray-400)', background: 'var(--gray-100)', padding: '1px 8px', borderRadius: 99 }}>
                        {tmpl.etapas.length} etapa{tmpl.etapas.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {tmpl.etapas.map((et, i) => (
                        <span key={i} style={{ fontSize: 11, color: 'var(--gray-600)', background: 'var(--gray-100)', padding: '2px 9px', borderRadius: 99 }}>{et.nombre}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => { setEditingId(tmpl.id); setCreando(false) }}
                    style={{ ...btnSecondary, fontSize: 12, padding: '6px 12px', flexShrink: 0 }}>
                    Editar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ConfigPage
