import { useState, useEffect } from 'react'
import { useBreakpoint } from '../hooks/useBreakpoint'
import LocationAutocomplete from './LocationAutocomplete'

const CATEGORIES = ['OBRA', 'PROYECTO', 'GREMIOS']

const EMPTY = {
  name:                '',
  location:            '',
  startDate:           '',
  endDate:             '',
  responsible:         '',
  responsableProyecto: '',
  contratista:         '',
  proyecto:            '',
  progress:            0,
  status:              'activa',
}

function calcEndDate(startDate, valor, unidad) {
  if (!startDate || !valor || Number(valor) <= 0) return ''
  const d = new Date(startDate + 'T00:00:00')
  const n = Number(valor)
  if (unidad === 'Días')    d.setDate(d.getDate() + n)
  if (unidad === 'Semanas') d.setDate(d.getDate() + n * 7)
  if (unidad === 'Meses')   d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}

function fmtDate(str) {
  if (!str) return '—'
  const [y, m, d] = str.split('-')
  return `${d}/${m}/${y}`
}

function Field({ label, required, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', fontSize: 13, fontWeight: 600,
        color: 'var(--gray-700)', marginBottom: 6,
      }}>
        {label}{required && <span style={{ color: 'var(--orange)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && <p style={{ color: 'var(--red)', fontSize: 12, marginTop: 5 }}>{error}</p>}
    </div>
  )
}

function TeamSelect({ value, onChange, teamMembers, hasError, placeholder }) {
  const members = teamMembers || []
  const inputStyle = {
    width: '100%', padding: '10px 13px', borderRadius: 8,
    border: `1.5px solid ${hasError ? 'var(--red)' : 'var(--gray-200)'}`,
    fontSize: 14, color: value ? 'var(--gray-800)' : 'var(--gray-400)',
    fontFamily: 'inherit', background: 'white', boxSizing: 'border-box', cursor: 'pointer',
  }
  return (
    <select style={inputStyle} value={value} onChange={onChange}>
      <option value="">{placeholder || 'Seleccionar…'}</option>
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

export default function ProjectModal({ project, teamMembers, onSave, onClose }) {
  const { isMobile } = useBreakpoint()
  const [form, setForm]             = useState(EMPTY)
  const [errors, setErrors]         = useState({})
  const [duracionValor, setDurVal]  = useState('')
  const [duracionUnidad, setDurUnd] = useState('Días')

  useEffect(() => {
    if (project) {
      setForm({
        name:                project.name                ?? '',
        location:            project.location            ?? '',
        startDate:           project.startDate           ?? '',
        endDate:             project.endDate             ?? '',
        responsible:         project.responsible         ?? '',
        responsableProyecto: project.responsableProyecto ?? '',
        contratista:         project.contratista         ?? '',
        proyecto:            project.proyecto            ?? '',
        progress:            project.progress            ?? 0,
        status:              project.status              ?? 'activa',
      })
      setDurVal('')
      setDurUnd('Días')
    } else {
      setForm(EMPTY)
      setDurVal('')
      setDurUnd('Días')
    }
    setErrors({})
  }, [project])

  const set = (key, value) => {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: '' }))
  }

  const handleDurValChange = (val) => {
    setDurVal(val)
    const end = calcEndDate(form.startDate, val, duracionUnidad)
    if (end) set('endDate', end)
  }

  const handleDurUndChange = (und) => {
    setDurUnd(und)
    const end = calcEndDate(form.startDate, duracionValor, und)
    if (end) set('endDate', end)
  }

  const handleStartDateChange = (val) => {
    set('startDate', val)
    if (duracionValor) {
      const end = calcEndDate(val, duracionValor, duracionUnidad)
      if (end) set('endDate', end)
    }
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim())        e.name        = 'El nombre es requerido'
    if (!form.location.trim())    e.location    = 'La ubicación es requerida'
    if (!form.startDate)          e.startDate   = 'La fecha de inicio es requerida'
    if (!form.endDate)            e.endDate     = 'La fecha de finalización es requerida'
    if (!form.responsible.trim()) e.responsible = 'El responsable en obra es requerido'
    if (form.startDate && form.endDate && form.endDate < form.startDate)
      e.endDate = 'La fecha de finalización debe ser posterior al inicio'
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

  const col2 = isMobile ? '1fr' : '1fr 1fr'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        justifyContent: 'center',
        zIndex: 50, padding: isMobile ? 0 : 16, backdropFilter: 'blur(2px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'white',
        borderRadius: isMobile ? '20px 20px 0 0' : 16,
        padding: isMobile ? '20px 16px 32px' : '28px 32px',
        maxWidth: isMobile ? '100%' : 700,
        width: '100%',
        maxHeight: isMobile ? '96vh' : '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 80px rgba(0,0,0,0.3)',
      }}>
        {isMobile && (
          <div style={{
            width: 40, height: 4, background: 'var(--gray-300)',
            borderRadius: 99, margin: '0 auto 18px',
          }} />
        )}

        {/* Cabecera */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
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
              {project ? 'Modificá los datos de la obra' : 'Completá el formulario para registrar una nueva obra'}
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
          >✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Nombre */}
          <Field label="Nombre de la obra" required error={errors.name}>
            <input
              type="text" value={form.name}
              onChange={e => set('name', e.target.value)}
              style={inputStyle(errors.name)}
              placeholder="Ej: Torre Corporativa Norte"
            />
          </Field>

          {/* Ubicación */}
          <Field label="Ubicación" required error={errors.location}>
            <LocationAutocomplete
              value={form.location}
              onChange={v => set('location', v)}
              hasError={!!errors.location}
            />
          </Field>

          {/* Fecha inicio + Duración + Fecha fin */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Fecha de inicio" required error={errors.startDate}>
              <input
                type="date" value={form.startDate}
                onChange={e => handleStartDateChange(e.target.value)}
                style={inputStyle(errors.startDate)}
              />
            </Field>
            <Field label="Duración">
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="number" min={1} value={duracionValor}
                  onChange={e => handleDurValChange(e.target.value)}
                  placeholder="Ej: 8"
                  style={{ ...inputStyle(false), flex: 1, minWidth: 0 }}
                />
                <select
                  value={duracionUnidad}
                  onChange={e => handleDurUndChange(e.target.value)}
                  style={{ ...inputStyle(false), width: 'auto', minWidth: 80, padding: '10px 8px', cursor: 'pointer' }}
                >
                  <option>Días</option>
                  <option>Semanas</option>
                  <option>Meses</option>
                </select>
              </div>
            </Field>
            <Field label="Fecha de finalización" required error={errors.endDate}>
              <div style={{
                ...inputStyle(errors.endDate),
                background: form.endDate ? 'white' : '#F9FAFB',
                color: form.endDate ? 'var(--gray-800)' : 'var(--gray-400)',
                display: 'flex', alignItems: 'center',
                cursor: 'default', userSelect: 'none',
              }}>
                {form.endDate ? fmtDate(form.endDate) : 'Se calcula automático'}
              </div>
            </Field>
          </div>

          {/* Responsable en obra + Responsable de proyecto */}
          <div style={{ display: 'grid', gridTemplateColumns: col2, gap: 12 }}>
            <Field label="Responsable en obra" required error={errors.responsible}>
              <TeamSelect
                value={form.responsible}
                onChange={e => set('responsible', e.target.value)}
                teamMembers={teamMembers}
                hasError={!!errors.responsible}
                placeholder="Seleccionar responsable…"
              />
            </Field>
            <Field label="Responsable de proyecto">
              <TeamSelect
                value={form.responsableProyecto}
                onChange={e => set('responsableProyecto', e.target.value)}
                teamMembers={teamMembers}
                placeholder="Seleccionar responsable…"
              />
            </Field>
          </div>

          {/* Contratista + Proyecto */}
          <div style={{ display: 'grid', gridTemplateColumns: col2, gap: 12 }}>
            <Field label="Contratista principal">
              <TeamSelect
                value={form.contratista}
                onChange={e => set('contratista', e.target.value)}
                teamMembers={teamMembers}
                placeholder="Seleccionar contratista…"
              />
            </Field>
            <Field label="Proyecto">
              <input
                type="text" value={form.proyecto}
                onChange={e => set('proyecto', e.target.value)}
                style={inputStyle(false)}
                placeholder="Ej: Plan de Desarrollo Urbano 2024"
              />
            </Field>
          </div>

          {/* Estado */}
          <Field label="Estado">
            <select
              value={form.status}
              onChange={e => set('status', e.target.value)}
              style={{ ...inputStyle(false), cursor: 'pointer' }}
            >
              <option value="activa">Activa</option>
              <option value="terminada">Terminada</option>
              <option value="atrasada">Atrasada</option>
            </select>
          </Field>

          {/* Botones */}
          <div style={{
            display: 'flex', gap: 10,
            justifyContent: 'flex-end',
            paddingTop: 16, borderTop: '1px solid var(--gray-200)', marginTop: 8,
            flexDirection: isMobile ? 'column-reverse' : 'row',
          }}>
            <button
              type="button" onClick={onClose}
              style={{
                padding: '11px 24px', borderRadius: 8,
                border: '1px solid var(--gray-200)', background: 'white',
                color: 'var(--gray-700)', cursor: 'pointer',
                fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                padding: '11px 28px', borderRadius: 8, border: 'none',
                background: 'var(--orange)', color: 'white', cursor: 'pointer',
                fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(249,115,22,0.4)',
              }}
            >
              {project ? 'Guardar cambios' : 'Crear obra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
