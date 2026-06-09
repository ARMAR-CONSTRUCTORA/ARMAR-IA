import { useState, useEffect } from 'react'
import { useBreakpoint } from '../hooks/useBreakpoint'
import LocationAutocomplete from './LocationAutocomplete'

const CATEGORIES = ['OBRA', 'PROYECTO', 'GREMIOS']

const TIPOS_OBRA = [
  'Proyecto + Dirección + Construcción ARMAR',
  'Dirección + Construcción sobre proyecto externo',
  'Construcción sobre proyecto externo',
]

const STATUS_LABELS = { activa: 'Activa', terminada: 'Terminada', atrasada: 'Atrasada' }
const STATUS_COLORS = {
  activa:    { bg: '#DCFCE7', color: '#166534' },
  terminada: { bg: '#DBEAFE', color: '#1E40AF' },
  atrasada:  { bg: '#FEE2E2', color: '#991B1B' },
}

const EMPTY = {
  name:                '',
  tipoObra:            '',
  location:            '',
  startDate:           '',
  endDate:             '',
  responsible:         '',
  responsableProyecto: '',
  contratista:         '',
  proyecto:            '',
  progress:            0,
  status:              'activa',
  arquitectoProyecto:  '',
  contactoArquitecto:  '',
  linkDocumentacion:   '',
  proyectoArmarId:     null,
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

function InfoRow({ label, value, link }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 3 }}>{label}</p>
      {link && value ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 14, color: 'var(--orange)', fontWeight: 600,
            textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
          }}
        >
          Abrir carpeta ↗
        </a>
      ) : (
        <p style={{ fontSize: 14, color: value ? 'var(--gray-800)' : 'var(--gray-400)', fontWeight: value ? 500 : 400 }}>
          {value || '—'}
        </p>
      )}
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

export default function ProjectModal({ project, teamMembers, proyectosArmar, prefillData, onSave, onClose }) {
  const { isMobile, isTablet } = useBreakpoint()
  const [form, setForm]             = useState(EMPTY)
  const [errors, setErrors]         = useState({})
  const [duracionValor, setDurVal]  = useState('')
  const [duracionUnidad, setDurUnd] = useState('Días')
  // Vista: 'info' (solo lectura) o 'edit' (formulario)
  const [mode, setMode] = useState('edit')

  useEffect(() => {
    if (project) {
      setForm({
        name:                project.name                ?? '',
        tipoObra:            project.tipoObra            ?? '',
        location:            project.location            ?? '',
        startDate:           project.startDate           ?? '',
        endDate:             project.endDate             ?? '',
        responsible:         project.responsible         ?? '',
        responsableProyecto: project.responsableProyecto ?? '',
        contratista:         project.contratista         ?? '',
        proyecto:            project.proyecto            ?? '',
        progress:            project.progress            ?? 0,
        status:              project.status              ?? 'activa',
        arquitectoProyecto:  project.arquitectoProyecto  ?? '',
        contactoArquitecto:  project.contactoArquitecto  ?? '',
        linkDocumentacion:   project.linkDocumentacion   ?? '',
        proyectoArmarId:     project.proyectoArmarId     ?? null,
      })
      if (project.startDate && project.endDate) {
        const start = new Date(project.startDate + 'T00:00:00')
        const end   = new Date(project.endDate   + 'T00:00:00')
        const dias  = Math.round((end - start) / (1000 * 60 * 60 * 24))
        setDurVal(dias > 0 ? String(dias) : '')
      } else {
        setDurVal('')
      }
      setDurUnd('Días')
      setMode('info')
    } else if (prefillData) {
      setForm({ ...EMPTY, ...prefillData })
      setDurVal('')
      setDurUnd('Días')
      setMode('edit')
    } else {
      setForm(EMPTY)
      setDurVal('')
      setDurUnd('Días')
      setMode('edit')
    }
    setErrors({})
  }, [project, prefillData])

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

  const handleSelectProyecto = (proyId) => {
    set('proyectoArmarId', proyId || null)
    if (!proyId) return
    const proy = proyectosArmar?.find(p => p.id === proyId)
    if (!proy) return
    if (!form.name)                set('name',                proy.nombre              || '')
    if (!form.location)            set('location',            proy.direccion            || '')
    if (!form.responsible)         set('responsible',         proy.responsableObra      || '')
    if (!form.responsableProyecto) set('responsableProyecto', proy.responsableProyecto  || '')
    if (!form.tipoObra)            set('tipoObra',            proy.tipoObra             || '')
    if (!form.linkDocumentacion)   set('linkDocumentacion',   proy.linkDocumentacion    || '')
  }

  const tieneProyectoExterno = form.tipoObra === 'Dirección + Construcción sobre proyecto externo' ||
    form.tipoObra === 'Construcción sobre proyecto externo'

  const validate = () => {
    const e = {}
    if (!form.name.trim())                  e.name     = 'El nombre es requerido'
    if (!project && !form.tipoObra)         e.tipoObra = 'El tipo de obra es requerido'
    if (!form.location.trim())              e.location = 'La ubicación es requerida'
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
    onSave({ ...form, progress: Number(form.progress), proyectoArmarId: form.proyectoArmarId || null })
  }

  const inputStyle = (hasError) => ({
    width: '100%', padding: '10px 13px', borderRadius: 8,
    border: `1.5px solid ${hasError ? 'var(--red)' : 'var(--gray-200)'}`,
    fontSize: 14, color: 'var(--gray-800)', fontFamily: 'inherit',
    background: 'white', boxSizing: 'border-box',
  })

  const col2 = (isMobile || isTablet) ? '1fr' : '1fr 1fr'
  const statusStyle = STATUS_COLORS[form.status] || STATUS_COLORS.activa

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
                {!project ? '🏗️' : mode === 'info' ? 'ℹ️' : '✏️'}
              </div>
              <h2 style={{ fontSize: 19, fontWeight: 800, color: 'var(--gray-900)' }}>
                {!project ? 'Nueva Obra' : mode === 'info' ? 'Información de la obra' : 'Editar Obra'}
              </h2>
            </div>
            <p style={{ color: 'var(--gray-400)', fontSize: 12, marginLeft: 44 }}>
              {!project
                ? 'Completá el formulario para registrar una nueva obra'
                : mode === 'info'
                  ? 'Datos registrados de la obra'
                  : 'Modificá los datos de la obra'}
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

        {/* ── MODO VISTA ─────────────────────────────────────────────────── */}
        {mode === 'info' && project && (
          <div>
            {/* Badge tipo obra */}
            {form.tipoObra && (
              <div style={{
                display: 'inline-block',
                background: '#FFF7ED', border: '1.5px solid #FED7AA',
                borderRadius: 20, padding: '4px 12px',
                fontSize: 12, fontWeight: 700, color: 'var(--orange)',
                marginBottom: 20,
              }}>
                {form.tipoObra}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: col2, gap: '0 24px' }}>
              <InfoRow label="Nombre" value={form.name} />
              <InfoRow label="Ubicación" value={form.location} />
              <InfoRow label="Fecha de inicio" value={fmtDate(form.startDate)} />
              <InfoRow label="Fecha de finalización" value={fmtDate(form.endDate)} />
              <InfoRow label="Responsable en obra" value={form.responsible} />
              <InfoRow label="Responsable de proyecto" value={form.responsableProyecto} />
              <InfoRow label="Contratista principal" value={form.contratista} />
              <InfoRow label="Proyecto" value={form.proyecto} />
            </div>

            {/* Proyecto ARMAR vinculado — info view */}
            {form.proyectoArmarId && proyectosArmar?.length > 0 && (() => {
              const proy = proyectosArmar.find(p => p.id === form.proyectoArmarId)
              return proy ? (
                <div style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6 }}>Proyecto ARMAR vinculado</p>
                  <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 700, color: '#2563EB', background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    {proy.nombre}{proy.comitente ? ` (${proy.comitente})` : ''}
                  </span>
                </div>
              ) : null
            })()}

            {/* Estado */}
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6 }}>Estado</p>
              <span style={{
                display: 'inline-block',
                background: statusStyle.bg, color: statusStyle.color,
                borderRadius: 20, padding: '4px 12px',
                fontSize: 13, fontWeight: 700,
              }}>
                {STATUS_LABELS[form.status] || form.status}
              </span>
            </div>

            {/* Proyecto externo */}
            {tieneProyectoExterno && (form.arquitectoProyecto || form.contactoArquitecto) && (
              <div style={{
                background: '#FFF7ED', border: '1.5px solid #FED7AA',
                borderRadius: 10, padding: '14px 16px', marginBottom: 16,
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)', marginBottom: 10, letterSpacing: 0.3 }}>
                  PROYECTO EXTERNO
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: col2, gap: '0 24px' }}>
                  <InfoRow label="Arquitecto/a del proyecto" value={form.arquitectoProyecto} />
                  <InfoRow label="Contacto" value={form.contactoArquitecto} />
                </div>
              </div>
            )}

            {/* Documentación */}
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6 }}>Documentación</p>
              {form.linkDocumentacion ? (
                <a
                  href={form.linkDocumentacion}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', borderRadius: 8,
                    background: 'var(--orange)', color: 'white',
                    fontWeight: 600, fontSize: 14, textDecoration: 'none',
                    boxShadow: '0 2px 8px rgba(249,115,22,0.3)',
                  }}
                >
                  Abrir carpeta ↗
                </a>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--gray-400)' }}>Sin enlace cargado</p>
              )}
            </div>

            {/* Botones modo info */}
            <div style={{
              display: 'flex', gap: 10, justifyContent: 'flex-end',
              paddingTop: 16, borderTop: '1px solid var(--gray-200)',
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
                Cerrar
              </button>
              <button
                type="button" onClick={() => setMode('edit')}
                style={{
                  padding: '11px 28px', borderRadius: 8, border: 'none',
                  background: 'var(--orange)', color: 'white', cursor: 'pointer',
                  fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
                  boxShadow: '0 2px 8px rgba(249,115,22,0.4)',
                }}
              >
                ✏️ Editar
              </button>
            </div>
          </div>
        )}

        {/* ── MODO EDICIÓN ───────────────────────────────────────────────── */}
        {mode === 'edit' && (
          <form onSubmit={handleSubmit}>
            {/* Proyecto ARMAR vinculado */}
            {proyectosArmar?.length > 0 && (
              <Field label="Proyecto ARMAR vinculado">
                <select
                  value={form.proyectoArmarId || ''}
                  onChange={e => handleSelectProyecto(e.target.value || null)}
                  style={{ ...inputStyle(false), color: form.proyectoArmarId ? 'var(--gray-800)' : 'var(--gray-400)', cursor: 'pointer' }}
                >
                  <option value="">Sin vincular</option>
                  {proyectosArmar.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}{p.comitente ? ` (${p.comitente})` : ''}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {/* Nombre */}
            <Field label="Nombre de la obra" required error={errors.name}>
              <input
                type="text" value={form.name}
                onChange={e => set('name', e.target.value)}
                style={inputStyle(errors.name)}
                placeholder="Ej: Torre Corporativa Norte"
              />
            </Field>

            {/* Tipo de obra */}
            <Field label="Tipo de obra / servicio ARMAR" required={!project} error={errors.tipoObra}>
              <select
                value={form.tipoObra}
                onChange={e => set('tipoObra', e.target.value)}
                style={{
                  ...inputStyle(errors.tipoObra),
                  color: form.tipoObra ? 'var(--gray-800)' : 'var(--gray-400)',
                  cursor: 'pointer',
                }}
              >
                <option value="">Seleccioná el tipo de encargo…</option>
                {TIPOS_OBRA.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>

            {/* Proyecto externo — aparece solo si aplica */}
            {tieneProyectoExterno && (
              <div style={{
                background: '#FFF7ED',
                border: '1.5px solid #FED7AA',
                borderRadius: 10,
                padding: '14px 16px',
                marginBottom: 16,
              }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--orange)', marginBottom: 12, letterSpacing: 0.3 }}>
                  PROYECTO EXTERNO
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: col2, gap: 12 }}>
                  <Field label="Arquitecto/a del proyecto">
                    <input
                      type="text"
                      value={form.arquitectoProyecto}
                      onChange={e => set('arquitectoProyecto', e.target.value)}
                      style={inputStyle(false)}
                      placeholder="Nombre del/la arquitecto/a"
                    />
                  </Field>
                  <Field label="Contacto">
                    <input
                      type="text"
                      value={form.contactoArquitecto}
                      onChange={e => set('contactoArquitecto', e.target.value)}
                      style={inputStyle(false)}
                      placeholder="Email o teléfono"
                    />
                  </Field>
                </div>
              </div>
            )}

            {/* Ubicación */}
            <Field label="Ubicación" required error={errors.location}>
              <LocationAutocomplete
                value={form.location}
                onChange={v => set('location', v)}
                hasError={!!errors.location}
              />
            </Field>

            {/* Fecha inicio + Duración + Fecha fin */}
            <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : '1fr 1fr 1fr', gap: 12 }}>
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

            {/* Documentación */}
            <Field label="Documentación">
              <div style={{ position: 'relative' }}>
                <input
                  type="url"
                  value={form.linkDocumentacion}
                  onChange={e => set('linkDocumentacion', e.target.value)}
                  style={{ ...inputStyle(false), paddingRight: 40 }}
                  placeholder="https://drive.google.com/…"
                />
                {form.linkDocumentacion && (
                  <a
                    href={form.linkDocumentacion}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir carpeta"
                    style={{
                      position: 'absolute', right: 10, top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--orange)', fontSize: 16, lineHeight: 1,
                      textDecoration: 'none',
                    }}
                  >
                    ↗
                  </a>
                )}
              </div>
            </Field>

            {/* Botones */}
            <div style={{
              display: 'flex', gap: 10,
              justifyContent: 'flex-end',
              paddingTop: 16, borderTop: '1px solid var(--gray-200)', marginTop: 8,
              flexDirection: isMobile ? 'column-reverse' : 'row',
            }}>
              <button
                type="button"
                onClick={() => project ? setMode('info') : onClose()}
                style={{
                  padding: '11px 24px', borderRadius: 8,
                  border: '1px solid var(--gray-200)', background: 'white',
                  color: 'var(--gray-700)', cursor: 'pointer',
                  fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
                }}
              >
                {project ? 'Volver' : 'Cancelar'}
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
        )}
      </div>
    </div>
  )
}
