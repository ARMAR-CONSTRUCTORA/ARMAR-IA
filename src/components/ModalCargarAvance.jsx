import { useState, useRef, useMemo } from 'react'
import { calcAvanceGeneral, estadoFromAvance } from '../data/cronogramaTemplates'

function fmtDate(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}
function progressColor(v) {
  return v === 100 ? '#10B981' : v >= 70 ? '#F97316' : v >= 40 ? '#F59E0B' : '#9CA3AF'
}
function today() {
  return new Date().toISOString().split('T')[0]
}

function MiniBar({ value, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 6, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden', minWidth: 40 }}>
        <div style={{ width: `${value}%`, height: '100%', background: color || progressColor(value), borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: color || progressColor(value), minWidth: 28, textAlign: 'right' }}>{value}%</span>
    </div>
  )
}

const CATEGORIES = ['OBRA', 'PROYECTO', 'GREMIOS']

function TeamSelect({ value, onChange, teamMembers }) {
  const members = teamMembers || []
  return (
    <select
      value={value}
      onChange={onChange}
      style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', cursor: 'pointer', color: value ? 'var(--gray-800)' : 'var(--gray-400)' }}
    >
      <option value="">Seleccionar…</option>
      {CATEGORIES.map(cat => {
        const group = members.filter(m => m.category === cat)
        if (!group.length) return null
        return (
          <optgroup key={cat} label={cat}>
            {group.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
          </optgroup>
        )
      })}
    </select>
  )
}

export default function ModalCargarAvance({ project, cronograma, numero, teamMembers, onGuardar, onClose }) {
  const [fecha, setFecha] = useState(today)
  const [responsable, setResponsable] = useState(project.responsible || '')
  const [inputValues, setInputValues] = useState({})  // tareaId → cargar ahora %
  const [observaciones, setObservaciones] = useState('')
  const [fotos, setFotos] = useState([null, null, null])
  const fileRefs = [useRef(), useRef(), useRef()]

  const tareas = cronograma.tareas || []

  // Etapas raíz (parentId === null)
  const etapas = tareas.filter(t => t.parentId === null)

  // Calcular acumulado por tarea (previo + cargar)
  const getAcumulado = (tarea) => {
    const cargar = Number(inputValues[tarea.id] || 0)
    return Math.min(100, tarea.avanceActual + cargar)
  }

  // Calcular avance de una etapa dado acumulados de sus hijos
  const getAvanceEtapaConInputs = (etapaId) => {
    const hijos = tareas.filter(t => t.parentId === etapaId)
    if (!hijos.length) {
      const et = tareas.find(t => t.id === etapaId)
      return et ? getAcumulado(et) : 0
    }
    const totalPeso = hijos.reduce((s, t) => s + (t.pesoRelativo || 1), 0)
    return Math.round(
      hijos.reduce((s, t) => s + getAcumulado(t) * (t.pesoRelativo || 1), 0) / Math.max(1, totalPeso)
    )
  }

  // Avance general nuevo (calculado en tiempo real)
  const avanceNuevo = useMemo(() => {
    if (!etapas.length) return 0
    const totalPeso = etapas.reduce((s, t) => s + (t.pesoRelativo || 1), 0)
    return Math.round(
      etapas.reduce((s, t) => s + getAvanceEtapaConInputs(t.id) * (t.pesoRelativo || 1), 0) / Math.max(1, totalPeso)
    )
  }, [inputValues, tareas])

  const avanceAnterior = useMemo(() => calcAvanceGeneral(tareas), [tareas])

  const setInput = (id, val) => {
    const tarea = tareas.find(t => t.id === id)
    if (!tarea) return
    const maxCarga = 100 - tarea.avanceActual
    const clamped = Math.max(0, Math.min(maxCarga, Number(val) || 0))
    setInputValues(prev => ({ ...prev, [id]: clamped }))
  }

  const handleFoto = (idx, e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setFotos(prev => { const arr = [...prev]; arr[idx] = { name: file.name, url: ev.target.result }; return arr })
    }
    reader.readAsDataURL(file)
  }

  const handleGuardar = () => {
    // Build updated tareas
    const tareasActualizadas = tareas.map(t => {
      const hijos = tareas.filter(h => h.parentId === t.id)
      let nuevoAvance
      if (hijos.length) {
        // etapa con hijos: promedio ponderado automático
        const totalPeso = hijos.reduce((s, h) => s + (h.pesoRelativo || 1), 0)
        nuevoAvance = Math.round(
          hijos.reduce((s, h) => s + getAcumulado(h) * (h.pesoRelativo || 1), 0) / Math.max(1, totalPeso)
        )
      } else {
        nuevoAvance = getAcumulado(t)
      }
      return { ...t, avanceActual: nuevoAvance, estado: estadoFromAvance(nuevoAvance) }
    })

    const avancesTareas = tareas
      .filter(t => (Number(inputValues[t.id]) || 0) > 0)
      .map(t => ({
        tareaId: t.id,
        nombreTarea: t.nombre,
        avanceAnterior: t.avanceActual,
        avanceNuevo: Math.min(100, t.avanceActual + (Number(inputValues[t.id]) || 0)),
      }))

    const informe = {
      id: `inf-${Date.now()}`,
      numero,
      fecha,
      responsable,
      observaciones,
      fotos: fotos.filter(Boolean),
      avanceGeneralAnterior: avanceAnterior,
      avanceGeneral: avanceNuevo,
      avancesTareas,
    }

    onGuardar(project.id, informe, tareasActualizadas)
    onClose()
  }

  const hasChanges = Object.values(inputValues).some(v => v > 0)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: 16, backdropFilter: 'blur(2px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'white', borderRadius: 18, width: '100%', maxWidth: 700,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 900, color: 'var(--gray-900)', marginBottom: 2 }}>
              Cargar avance
            </h2>
            <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>{project.name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)', padding: '4px 8px' }}>×</button>
        </div>

        {/* Form */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* Fecha + responsable */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 5 }}>Fecha de carga</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--gray-200)', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 5 }}>Responsable</label>
              <TeamSelect value={responsable} onChange={e => setResponsable(e.target.value)} teamMembers={teamMembers} />
            </div>
          </div>

          {/* Banner avance antes → después */}
          <div style={{
            background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)',
            border: '1px solid #FED7AA', borderRadius: 12, padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', marginBottom: 2 }}>ANTERIOR</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: progressColor(avanceAnterior) }}>{avanceAnterior}%</div>
            </div>
            <div style={{ fontSize: 20, color: 'var(--gray-300)' }}>→</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--orange)', marginBottom: 2 }}>LUEGO DE ESTA CARGA</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: progressColor(avanceNuevo), transition: 'color 0.3s' }}>{avanceNuevo}%</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 10, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ width: `${avanceNuevo}%`, height: '100%', background: progressColor(avanceNuevo), borderRadius: 99, transition: 'width 0.4s ease' }} />
              </div>
              {avanceNuevo > avanceAnterior && (
                <div style={{ fontSize: 11, color: '#10B981', fontWeight: 700, marginTop: 4 }}>
                  +{avanceNuevo - avanceAnterior}% en esta carga
                </div>
              )}
            </div>
          </div>

          {/* Tabla de tareas */}
          {tareas.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
              Este cronograma no tiene tareas aún.
            </div>
          ) : (
            <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px 80px 80px', gap: 0, background: 'var(--gray-100)', borderBottom: '1px solid var(--gray-200)' }}>
                {['Tarea / Etapa', 'Avance actual', 'Cargar %', 'Acumulado'].map(h => (
                  <div key={h} style={{ padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</div>
                ))}
              </div>

              {etapas.map(etapa => {
                const hijos = tareas.filter(t => t.parentId === etapa.id)
                const avEtapa = getAvanceEtapaConInputs(etapa.id)
                const hasHijos = hijos.length > 0
                return (
                  <div key={etapa.id}>
                    {/* Fila etapa */}
                    <div style={{
                      display: 'grid', gridTemplateColumns: '1fr 110px 80px 80px',
                      borderBottom: '1px solid var(--gray-200)',
                      background: '#FAFAFA',
                    }}>
                      <div style={{ padding: '10px 12px', fontWeight: 700, fontSize: 12, color: 'var(--gray-800)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {etapa.esCritica && <span style={{ color: '#DC2626', fontSize: 10 }}>●</span>}
                        {etapa.nombre}
                        {hasHijos && <span style={{ fontSize: 10, color: 'var(--gray-400)' }}>({hijos.length} subtareas)</span>}
                      </div>
                      <div style={{ padding: '10px 12px' }}>
                        <MiniBar value={etapa.avanceActual} />
                      </div>
                      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
                        {!hasHijos ? (
                          <input type="number" min={0} max={100 - etapa.avanceActual}
                            value={inputValues[etapa.id] || ''}
                            onChange={e => setInput(etapa.id, e.target.value)}
                            placeholder="0"
                            style={{ width: 52, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--gray-200)', fontSize: 12, fontFamily: 'inherit', textAlign: 'center' }}
                          />
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--gray-400)', fontStyle: 'italic' }}>auto</span>
                        )}
                      </div>
                      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: progressColor(avEtapa) }}>{avEtapa}%</span>
                      </div>
                    </div>

                    {/* Subtareas */}
                    {hijos.map((hijo, hi) => {
                      const acum = getAcumulado(hijo)
                      return (
                        <div key={hijo.id} style={{
                          display: 'grid', gridTemplateColumns: '1fr 110px 80px 80px',
                          borderBottom: hi < hijos.length - 1 ? '1px solid var(--gray-200)' : '1px solid var(--gray-200)',
                          background: 'white',
                        }}>
                          <div style={{ padding: '9px 12px 9px 28px', fontSize: 12, color: 'var(--gray-700)', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ color: 'var(--gray-300)', fontSize: 10 }}>└</span>
                            {hijo.nombre}
                          </div>
                          <div style={{ padding: '9px 12px' }}>
                            <MiniBar value={hijo.avanceActual} />
                          </div>
                          <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center' }}>
                            <input type="number" min={0} max={100 - hijo.avanceActual}
                              value={inputValues[hijo.id] || ''}
                              onChange={e => setInput(hijo.id, e.target.value)}
                              placeholder="0"
                              style={{ width: 52, padding: '4px 6px', borderRadius: 6, border: '1px solid var(--gray-200)', fontSize: 12, fontFamily: 'inherit', textAlign: 'center' }}
                            />
                          </div>
                          <div style={{ padding: '9px 12px', display: 'flex', alignItems: 'center' }}>
                            <span style={{ fontSize: 13, fontWeight: 800, color: progressColor(acum) }}>{acum}%</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}

          {/* Observaciones */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Observaciones del informe
              </label>
              <span style={{ fontSize: 11, color: observaciones.length > 450 ? '#DC2626' : 'var(--gray-400)' }}>
                {observaciones.length}/500
              </span>
            </div>
            <textarea
              value={observaciones}
              onChange={e => setObservaciones(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Comentarios sobre el avance, novedades de obra, inconvenientes…"
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 8,
                border: '1px solid var(--gray-200)', fontSize: 13,
                fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box',
                color: 'var(--gray-700)',
              }}
            />
          </div>

          {/* Fotos */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
              Adjuntar fotos (máx. 3)
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              {fotos.map((foto, idx) => (
                <div key={idx}>
                  <input ref={fileRefs[idx]} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => handleFoto(idx, e)} />
                  <div
                    onClick={() => { if (!foto) fileRefs[idx].current?.click() }}
                    style={{
                      width: 100, height: 100, borderRadius: 10,
                      border: foto ? 'none' : '2px dashed var(--gray-300)',
                      background: foto ? 'transparent' : 'var(--gray-100)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: foto ? 'default' : 'pointer', overflow: 'hidden', position: 'relative',
                    }}
                  >
                    {foto ? (
                      <>
                        <img src={foto.url} alt={foto.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          onClick={(e) => { e.stopPropagation(); setFotos(prev => { const arr = [...prev]; arr[idx] = null; return arr }) }}
                          style={{
                            position: 'absolute', top: 4, right: 4,
                            width: 20, height: 20, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.6)', color: 'white',
                            border: 'none', cursor: 'pointer', fontSize: 12,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 700, lineHeight: 1,
                          }}
                        >×</button>
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

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onClose}
            style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-700)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={!hasChanges}
            style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: hasChanges ? 'var(--orange)' : 'var(--gray-200)',
              color: hasChanges ? 'white' : 'var(--gray-400)',
              cursor: hasChanges ? 'pointer' : 'default',
              fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
              boxShadow: hasChanges ? '0 2px 8px rgba(249,115,22,0.4)' : 'none',
            }}
          >
            Guardar avance
          </button>
        </div>
      </div>
    </div>
  )
}
