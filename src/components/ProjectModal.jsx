import { useState, useEffect } from 'react'
import { useBreakpoint } from '../hooks/useBreakpoint'

const EMPTY = {
  name: '', location: '', startDate: '', endDate: '',
  progress: 0, responsible: '', status: 'activa',
}

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{
        display: 'block', fontSize: 13, fontWeight: 600,
        color: 'var(--gray-700)', marginBottom: 6,
      }}>
        {label}
      </label>
      {children}
      {error && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 5 }}>{error}</p>}
    </div>
  )
}

function ProjectModal({ project, onSave, onClose }) {
  const { isMobile } = useBreakpoint()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setForm(project ? {
      name: project.name, location: project.location,
      startDate: project.startDate, endDate: project.endDate,
      progress: project.progress, responsible: project.responsible,
      status: project.status,
    } : EMPTY)
    setErrors({})
  }, [project])

  const set = (key, value) => {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())        e.name        = 'El nombre es requerido'
    if (!form.location.trim())    e.location    = 'La ubicación es requerida'
    if (!form.startDate)          e.startDate   = 'La fecha de inicio es requerida'
    if (!form.endDate)            e.endDate     = 'La fecha de término es requerida'
    if (!form.responsible.trim()) e.responsible = 'El responsable es requerido'
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      e.endDate = 'La fecha de término debe ser posterior al inicio'
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    onSave({ ...form, progress: Number(form.progress) })
  }

  const inputStyle = (hasError) => ({
    width: '100%', padding: '10px 13px', borderRadius: 8,
    border: `1.5px solid ${hasError ? 'var(--red)' : 'var(--gray-200)'}`,
    fontSize: 14, color: 'var(--gray-800)', fontFamily: 'inherit',
    background: 'white', boxSizing: 'border-box',
  })

  const progressColor =
    form.progress === 100 ? '#10B981' : form.progress >= 70 ? '#F97316' :
    form.progress >= 40 ? '#F59E0B' : '#9CA3AF'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center', zIndex: 50,
        padding: isMobile ? 0 : 16, backdropFilter: 'blur(2px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'white',
        borderRadius: isMobile ? '20px 20px 0 0' : 16,
        padding: isMobile ? '24px 16px' : '32px',
        maxWidth: isMobile ? '100%' : 660,
        width: '100%',
        maxHeight: isMobile ? '95vh' : '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 80px rgba(0,0,0,0.3)',
      }}>
        {/* Handle bar (mobile) */}
        {isMobile && (
          <div style={{
            width: 40, height: 4, background: 'var(--gray-300)',
            borderRadius: 99, margin: '0 auto 20px',
          }} />
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 34, height: 34, background: 'var(--orange-light)',
                borderRadius: 8, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 17,
              }}>
                {project ? '✏️' : '🏗️'}
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--gray-900)' }}>
                {project ? 'Editar Obra' : 'Nueva Obra'}
              </h2>
            </div>
            <p style={{ color: 'var(--gray-400)', fontSize: 12, marginLeft: 44 }}>
              {project ? 'Modifica los datos de la obra' : 'Completa el formulario para registrar una nueva obra'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--gray-100)', border: 'none', borderRadius: 8,
              width: 32, height: 32, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', fontSize: 15,
              color: 'var(--gray-500)', flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <Field label="Nombre de la Obra *" error={errors.name}>
            <input type="text" value={form.name}
              onChange={e => set('name', e.target.value)}
              style={inputStyle(errors.name)}
              placeholder="Ej: Torre Corporativa Norte"
            />
          </Field>

          <Field label="Ubicación *" error={errors.location}>
            <input type="text" value={form.location}
              onChange={e => set('location', e.target.value)}
              style={inputStyle(errors.location)}
              placeholder="Ej: Santiago Centro, RM"
            />
          </Field>

          {/* Dates — stack on mobile */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? 0 : 16,
          }}>
            <Field label="Fecha de Inicio *" error={errors.startDate}>
              <input type="date" value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
                style={inputStyle(errors.startDate)}
              />
            </Field>
            <Field label="Fecha Estimada de Término *" error={errors.endDate}>
              <input type="date" value={form.endDate}
                onChange={e => set('endDate', e.target.value)}
                style={inputStyle(errors.endDate)}
              />
            </Field>
          </div>

          <Field label="Responsable *" error={errors.responsible}>
            <input type="text" value={form.responsible}
              onChange={e => set('responsible', e.target.value)}
              style={inputStyle(errors.responsible)}
              placeholder="Ej: Ing. Carlos Méndez"
            />
          </Field>

          {/* Progress + status — stack on mobile */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? 0 : 16,
          }}>
            <Field label={`Porcentaje de Avance: ${form.progress}%`}>
              <input type="range" min="0" max="100" value={form.progress}
                onChange={e => set('progress', e.target.value)}
                style={{ width: '100%', accentColor: progressColor, marginTop: 8 }}
              />
              <div style={{
                height: 8, background: 'var(--gray-200)', borderRadius: 99,
                overflow: 'hidden', marginTop: 8,
              }}>
                <div style={{
                  width: `${form.progress}%`, height: '100%',
                  background: progressColor, borderRadius: 99, transition: 'width 0.2s',
                }} />
              </div>
            </Field>

            <Field label="Estado *">
              <select value={form.status} onChange={e => set('status', e.target.value)}
                style={{ ...inputStyle(false), cursor: 'pointer' }}
              >
                <option value="activa">Activa</option>
                <option value="terminada">Terminada</option>
                <option value="atrasada">Atrasada</option>
              </select>
            </Field>
          </div>

          {/* Buttons */}
          <div style={{
            display: 'flex', gap: 10, justifyContent: 'flex-end',
            paddingTop: 16, borderTop: '1px solid var(--gray-200)', marginTop: 8,
            flexDirection: isMobile ? 'column-reverse' : 'row',
          }}>
            <button type="button" onClick={onClose} style={{
              padding: '11px 24px', borderRadius: 8, border: '1px solid var(--gray-200)',
              background: 'white', color: 'var(--gray-700)', cursor: 'pointer',
              fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
            }}>
              Cancelar
            </button>
            <button type="submit" style={{
              padding: '11px 28px', borderRadius: 8, border: 'none',
              background: 'var(--orange)', color: 'white', cursor: 'pointer',
              fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
              boxShadow: '0 2px 8px rgba(249,115,22,0.4)',
            }}>
              {project ? 'Guardar Cambios' : 'Crear Obra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProjectModal
