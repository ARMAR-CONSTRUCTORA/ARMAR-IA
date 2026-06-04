import { useState } from 'react'
import { calcFechaFin, calcDuracionHabil } from '../utils/calendarUtils'

const TIPOS_VINCULO = ['Fin a inicio', 'Inicio a inicio']

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

export default function ModalEditarEtapa({ tarea, tareas, onSave, onClose, onAgregarSubetapa }) {
  const isNueva    = !tarea?.id
  const isSubtarea = tarea?.parentId !== null && tarea?.parentId !== undefined

  const [form, setForm] = useState({
    nombre:       tarea?.nombre      || '',
    fechaInicio:  tarea?.fechaInicio || '',
    duracionDias: String(tarea?.duracionDias ?? 5),
    pesoRelativo: String(tarea?.pesoRelativo ?? 10),
    dependeDeId:  tarea?.dependeDeId  ?? null,
    tipoVinculo:  tarea?.tipoVinculo  || 'Fin a inicio',
    desfaseDias:  String(tarea?.desfaseDias ?? 0),
  })

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
      duracionDias:  Number(form.duracionDias),
      pesoRelativo:  Number(form.pesoRelativo),
      desfaseDias:   Number(form.desfaseDias),
      dependeDeId:   form.dependeDeId ? Number(form.dependeDeId) : null,
    })
  }

  // Excluir la tarea actual y sus hijos del selector de predecesoras
  const opcionesPredecesora = tareas.filter(t => t.id !== tarea?.id && t.parentId !== tarea?.id)

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', display: 'flex', flexDirection: 'column', maxHeight: '92vh' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--gray-900)', marginBottom: 2 }}>
              {isNueva ? (isSubtarea ? 'Nueva subetapa' : 'Nueva etapa') : (isSubtarea ? 'Editar subetapa' : 'Editar etapa')}
            </h3>
            {tarea?.nombre && !isNueva && (
              <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{tarea.nombre}</div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)', lineHeight: 1, padding: '4px 8px' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          <Field label="Nombre de etapa">
            <input style={inputStyle} value={form.nombre} autoFocus
              placeholder={isSubtarea ? 'Ej: Excavación' : 'Ej: Fundaciones'}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Inicio" hint="Días hábiles (lun–vie, sin feriados)">
              <input type="date" style={inputStyle} value={form.fechaInicio}
                onChange={e => setForm(f => ({ ...f, fechaInicio: e.target.value }))} />
            </Field>
            <Field label="Duración (días hábiles)">
              <input type="number" min={1} style={inputStyle} value={form.duracionDias}
                onChange={e => setForm(f => ({ ...f, duracionDias: e.target.value }))} />
            </Field>
          </div>

          <Field label="Fin estimado" hint="Calculado desde inicio + duración hábiles">
            <div style={{ ...inputStyle, background: '#F9FAFB', color: 'var(--gray-500)', cursor: 'default', userSelect: 'none' }}>
              {fechaFin ? fmtLong(fechaFin) : '—'}
            </div>
          </Field>

          <Field label="Incidencia %">
            <input type="number" min={0} max={100} style={inputStyle} value={form.pesoRelativo}
              onChange={e => setForm(f => ({ ...f, pesoRelativo: e.target.value }))} />
          </Field>

          {/* Dependencias */}
          <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 16, marginBottom: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              Dependencia
            </div>

            <Field label="Predecesora">
              <select style={inputStyle}
                value={form.dependeDeId ?? ''}
                onChange={e => setForm(f => ({ ...f, dependeDeId: e.target.value ? Number(e.target.value) : null }))}>
                <option value="">Ninguna</option>
                {opcionesPredecesora.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.parentId !== null ? '    └ ' : ''}{t.nombre}
                  </option>
                ))}
              </select>
            </Field>

            {form.dependeDeId && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Tipo de vínculo">
                  <select style={inputStyle} value={form.tipoVinculo}
                    onChange={e => setForm(f => ({ ...f, tipoVinculo: e.target.value }))}>
                    {TIPOS_VINCULO.map(tv => <option key={tv} value={tv}>{tv}</option>)}
                  </select>
                </Field>
                <Field label="Días de desfase" hint="Días hábiles de lag">
                  <input type="number" min={0} style={inputStyle} value={form.desfaseDias}
                    onChange={e => setForm(f => ({ ...f, desfaseDias: e.target.value }))} />
                </Field>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          {!isSubtarea && onAgregarSubetapa && !isNueva ? (
            <button
              onClick={() => onAgregarSubetapa(tarea)}
              style={{ padding: '8px 14px', borderRadius: 7, border: '1px dashed var(--orange)', background: 'white', color: 'var(--orange)', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
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
