import { useState } from 'react'
import { calcFechaFin, addBusinessDays } from '../utils/calendarUtils'

function fmtLong(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--gray-200)', fontSize: 13,
  color: 'var(--gray-700)', fontFamily: 'inherit',
  background: 'white', boxSizing: 'border-box',
}

function Field({ label, children, hint }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 3 }}>{hint}</div>}
    </div>
  )
}

function fmtMiles(raw) {
  const num = String(raw).replace(/\D/g, '')
  if (!num) return ''
  return Number(num).toLocaleString('es-AR')
}

function parseMiles(str) {
  if (!str) return null
  const num = Number(String(str).replace(/\./g, '').replace(/,/g, ''))
  return isNaN(num) ? null : num
}

export default function ModalEditarEtapa({ tarea, tareas, onSave, onClose, onAgregarSubetapa }) {
  const isNueva    = !tarea?.id
  const isSubtarea = tarea?.parentId !== null && tarea?.parentId !== undefined

  const [form, setForm] = useState({
    nombre:         tarea?.nombre      || '',
    fechaInicio:    tarea?.fechaInicio || '',
    duracionDias:   String(tarea?.duracionDias ?? 5),
    pesoRelativo:   String(tarea?.pesoRelativo ?? 10),
    dependeDeId:    tarea?.dependeDeId  ?? null,
    tipoVinculo:    tarea?.tipoVinculo  || 'Fin a inicio',
    desfaseDias:    String(tarea?.desfaseDias ?? 0),
    presupuestoRaw: tarea?.presupuesto != null ? Number(tarea.presupuesto).toLocaleString('es-AR') : '',
  })

  const [adicionales, setAdicionales] = useState(
    (tarea?.adicionales || []).map(a => ({
      ...a,
      montoRaw: a.monto != null ? Number(a.monto).toLocaleString('es-AR') : '',
    }))
  )

  const calcFechaInicioDesde = (predId, desfase) => {
    const pred = tareas.find(t => t.id === Number(predId))
    if (!pred?.fechaFin) return form.fechaInicio
    return addBusinessDays(pred.fechaFin, 1 + Number(desfase || 0))
  }

  const fechaFin = form.fechaInicio && Number(form.duracionDias) > 0
    ? calcFechaFin(form.fechaInicio, Number(form.duracionDias))
    : ''

  const canSave = form.nombre.trim() && form.fechaInicio && Number(form.duracionDias) > 0

  const handleSave = () => {
    if (!canSave) return
    onSave({
      ...tarea,
      ...form,
      fechaFin,
      tipoVinculo:  'Fin a inicio',
      duracionDias: Number(form.duracionDias),
      pesoRelativo: Number(form.pesoRelativo),
      desfaseDias:  Number(form.desfaseDias),
      dependeDeId:  form.dependeDeId ? Number(form.dependeDeId) : null,
      presupuesto:  parseMiles(form.presupuestoRaw),
      adicionales:  adicionales.map(a => ({
        id:     a.id,
        motivo: a.motivo || '',
        monto:  parseMiles(a.montoRaw),
      })),
    })
  }

  const addAdicional = () => {
    setAdicionales(prev => [...prev, { id: Date.now(), montoRaw: '', motivo: '' }])
  }

  const removeAdicional = (id) => {
    setAdicionales(prev => prev.filter(a => a.id !== id))
  }

  const updateAdicional = (id, field, value) => {
    setAdicionales(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a))
  }

  const opcionesPredecesora = tareas.filter(t => t.id !== tarea?.id && t.parentId !== tarea?.id)

  const totalAdicionales = adicionales.reduce((s, a) => s + (parseMiles(a.montoRaw) || 0), 0)
  const presupuestoBase  = parseMiles(form.presupuestoRaw) || 0
  const totalGeneral     = presupuestoBase + totalAdicionales

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>

        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 2 }}>
              {isNueva ? (isSubtarea ? 'Nueva subetapa' : 'Nueva etapa') : (isSubtarea ? 'Editar subetapa' : 'Editar etapa')}
            </h3>
            {tarea?.nombre && !isNueva && <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{tarea.nombre}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)', lineHeight: 1, padding: '4px 8px' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1 }}>

          <Field label="Nombre de etapa">
            <input style={inputStyle} value={form.nombre} autoFocus
              placeholder={isSubtarea ? 'Ej: Excavación' : 'Ej: Fundaciones'}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          </Field>

          <Field label="Fecha de inicio" hint="Días hábiles (lun–vie, sin feriados)">
            <input type="date" style={inputStyle} value={form.fechaInicio}
              onChange={e => setForm(f => ({ ...f, fechaInicio: e.target.value }))} />
          </Field>

          <Field label="Duración (días hábiles)">
            <input type="number" min={1} style={inputStyle} value={form.duracionDias}
              onChange={e => setForm(f => ({ ...f, duracionDias: e.target.value }))} />
          </Field>

          <Field label="Fin estimado" hint="Calculado desde inicio + duración hábiles">
            <div style={{ ...inputStyle, background: '#F9FAFB', color: 'var(--gray-500)', cursor: 'default', userSelect: 'none' }}>
              {fechaFin ? fmtLong(fechaFin) : '—'}
            </div>
          </Field>

          <Field label="Incidencia %">
            <input type="number" min={0} max={100} style={inputStyle} value={form.pesoRelativo}
              onChange={e => setForm(f => ({ ...f, pesoRelativo: e.target.value }))} />
          </Field>

          {/* ── Presupuesto ── */}
          <Field label="Presupuesto base" hint="Monto original de contrato para esta etapa">
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: 'var(--gray-500)', fontWeight: 600, pointerEvents: 'none' }}>$</span>
              <input
                type="text" inputMode="numeric"
                style={{ ...inputStyle, paddingLeft: 26 }}
                placeholder="0"
                value={form.presupuestoRaw}
                onChange={e => {
                  const raw = e.target.value.replace(/\D/g, '')
                  setForm(f => ({ ...f, presupuestoRaw: raw ? Number(raw).toLocaleString('es-AR') : '' }))
                }}
              />
            </div>
          </Field>

          {/* ── Adicionales ── */}
          <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 14, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Adicionales {adicionales.length > 0 && `(${adicionales.length})`}
              </span>
              <button
                onClick={addAdicional}
                style={{ padding: '5px 12px', borderRadius: 6, border: '1px dashed var(--orange)', background: 'white', color: 'var(--orange)', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                + Agregar adicional
              </button>
            </div>

            {adicionales.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', padding: '10px 0' }}>
                Sin adicionales cargados
              </div>
            )}

            {adicionales.map((a, idx) => (
              <div key={a.id} style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange)' }}>Adicional #{idx + 1}</span>
                  <button onClick={() => removeAdicional(a.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 16, lineHeight: 1, padding: '2px 4px' }}>×</button>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 4 }}>Motivo</label>
                  <input
                    type="text"
                    style={{ ...inputStyle, fontSize: 12 }}
                    placeholder="Ej: Cambio de especificación, trabajo extra…"
                    value={a.motivo}
                    onChange={e => updateAdicional(a.id, 'motivo', e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', marginBottom: 4 }}>Monto</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'var(--gray-500)', fontWeight: 600, pointerEvents: 'none' }}>$</span>
                    <input
                      type="text" inputMode="numeric"
                      style={{ ...inputStyle, paddingLeft: 26, fontSize: 12 }}
                      placeholder="0"
                      value={a.montoRaw}
                      onChange={e => {
                        const raw = e.target.value.replace(/\D/g, '')
                        updateAdicional(a.id, 'montoRaw', raw ? Number(raw).toLocaleString('es-AR') : '')
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Resumen de totales */}
            {(presupuestoBase > 0 || totalAdicionales > 0) && (
              <div style={{ background: '#F9FAFB', border: '1px solid var(--gray-200)', borderRadius: 8, padding: '10px 14px', marginTop: 4 }}>
                {presupuestoBase > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--gray-600)', marginBottom: 4 }}>
                    <span>Presupuesto base</span>
                    <span>${presupuestoBase.toLocaleString('es-AR')}</span>
                  </div>
                )}
                {totalAdicionales > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--orange)', marginBottom: 4 }}>
                    <span>Adicionales</span>
                    <span>+${totalAdicionales.toLocaleString('es-AR')}</span>
                  </div>
                )}
                {presupuestoBase > 0 && totalAdicionales > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800, color: 'var(--gray-800)', borderTop: '1px solid var(--gray-200)', paddingTop: 6, marginTop: 2 }}>
                    <span>Total</span>
                    <span>${totalGeneral.toLocaleString('es-AR')}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Dependencias ── */}
          <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              Dependencia
            </div>
            <Field label="Predecesora">
              <select style={inputStyle}
                value={form.dependeDeId ?? ''}
                onChange={e => {
                  const predId = e.target.value ? Number(e.target.value) : null
                  const newFI = predId ? calcFechaInicioDesde(predId, form.desfaseDias) : form.fechaInicio
                  setForm(f => ({ ...f, dependeDeId: predId, fechaInicio: newFI }))
                }}>
                <option value="">Ninguna</option>
                {opcionesPredecesora.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.parentId !== null ? '    └ ' : ''}{t.nombre}
                  </option>
                ))}
              </select>
            </Field>
            {form.dependeDeId && (
              <Field label="Días de desfase" hint="Días hábiles — se suman al fin de la predecesora">
                <input type="number" min={0} style={inputStyle} value={form.desfaseDias}
                  onChange={e => {
                    const desfase = e.target.value
                    const newFI = calcFechaInicioDesde(form.dependeDeId, desfase)
                    setForm(f => ({ ...f, desfaseDias: desfase, fechaInicio: newFI }))
                  }} />
              </Field>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          {!isSubtarea && onAgregarSubetapa && !isNueva ? (
            <button onClick={() => onAgregarSubetapa(tarea)}
              style={{ padding: '8px 14px', borderRadius: 7, border: '1px dashed var(--orange)', background: 'white', color: 'var(--orange)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Nueva subetapa
            </button>
          ) : <div />}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose}
              style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-700)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={!canSave}
              style={{
                padding: '9px 18px', borderRadius: 8, border: 'none',
                background: canSave ? 'var(--orange)' : 'var(--gray-200)',
                color: canSave ? 'white' : 'var(--gray-400)',
                cursor: canSave ? 'pointer' : 'default',
                fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
                boxShadow: canSave ? '0 2px 8px rgba(249,115,22,0.4)' : 'none',
              }}>
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
