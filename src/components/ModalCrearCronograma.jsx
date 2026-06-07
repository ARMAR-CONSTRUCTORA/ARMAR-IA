import { useState, useMemo, useRef } from 'react'
import { useBreakpoint } from '../hooks/useBreakpoint'
import { generarTareasDesdeTemplate } from '../data/cronogramaTemplates'
import { loadTemplates } from '../data/templateStorage'
import { calcDuracionHabil, calcFechaFin, addBusinessDays, computeCascade } from '../utils/calendarUtils'
import ModalEditarEtapa from './ModalEditarEtapa'

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtShort(d) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}
function calcFechaFinDesde(fechaInicio, valor, unidad) {
  if (!fechaInicio || !valor || Number(valor) <= 0) return ''
  const n = Number(valor)
  const dias = unidad === 'Semanas' ? n * 5 : unidad === 'Meses' ? n * 22 : n
  return calcFechaFin(fechaInicio, dias)
}

const STEP_LABELS = ['Tipo de cronograma', 'Parámetros', 'Vista previa']

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid var(--gray-200)', fontSize: 13,
  color: 'var(--gray-700)', fontFamily: 'inherit',
  background: 'white', boxSizing: 'border-box',
}

function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

function SummaryField({ label, value }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)' }}>{value || '—'}</div>
    </div>
  )
}

function StepBar({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 28 }}>
      {STEP_LABELS.map((label, i) => {
        const num = i + 1
        const active = step === num
        const done   = step > num
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < 2 ? 1 : 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, background: done ? '#10B981' : active ? 'var(--orange)' : '#E5E7EB', color: done || active ? 'white' : 'var(--gray-500)', transition: 'background 0.2s' }}>
                {done ? '✓' : num}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: active ? 'var(--orange)' : done ? '#10B981' : 'var(--gray-400)', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
            {i < 2 && <div style={{ flex: 1, height: 2, background: done ? '#10B981' : '#E5E7EB', margin: '0 8px', marginBottom: 18, transition: 'background 0.2s' }} />}
          </div>
        )
      })}
    </div>
  )
}

// ── Importador PDF con Claude API ─────────────────────────────────────────────
function ImportadorPDF({ onEtapasImportadas }) {
  const fileRef = useRef()
  const [estado,   setEstado]   = useState('idle') // idle | leyendo | listo | error
  const [etapas,   setEtapas]   = useState([])
  const [mensaje,  setMensaje]  = useState('')

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setEstado('leyendo')
    setMensaje('Analizando el presupuesto…')

    try {
      // Convertir PDF a base64
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result.split(',')[1])
        r.onerror = () => rej(new Error('Error leyendo el archivo'))
        r.readAsDataURL(file)
      })

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'document',
                source: { type: 'base64', media_type: 'application/pdf', data: base64 }
              },
              {
                type: 'text',
                text: `Analizá este presupuesto de obra y extraé las etapas principales (ítems numerados de primer nivel) con sus montos.

Respondé SOLO con un JSON válido, sin texto adicional, sin backticks, con este formato exacto:
[
  { "nombre": "DEMOLICIÓN Y MOVIMIENTO DE SUELOS", "monto": 18564012 },
  { "nombre": "ESTRUCTURA DE HORMIGÓN ARMADO", "monto": 32487000 }
]

Reglas:
- Solo etapas de primer nivel (1, 2, 3... no 1.1, 1.2)
- Si el monto es $0 o dice "no se cotiza", incluila con monto 0
- El monto debe ser un número entero sin puntos ni comas
- Máximo 20 etapas`
              }
            ]
          }]
        })
      })

      const data = await response.json()
      const text = (data.content || []).map(b => b.text || '').join('')
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)

      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('No se encontraron etapas')

      setEtapas(parsed)
      setEstado('listo')
      setMensaje(`Se encontraron ${parsed.length} etapas`)
    } catch (err) {
      console.error(err)
      setEstado('error')
      setMensaje('No se pudo leer el presupuesto. Verificá que sea un PDF de ARMAR.')
    }
  }

  const handleConfirmar = () => {
    onEtapasImportadas(etapas)
  }

  const handleReintentar = () => {
    setEstado('idle')
    setEtapas([])
    setMensaje('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      {estado === 'idle' && (
        <div
          onClick={() => fileRef.current?.click()}
          style={{ border: '2px dashed #BFDBFE', borderRadius: 14, padding: '32px 24px', textAlign: 'center', cursor: 'pointer', background: '#F0F9FF', transition: 'background 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.background = '#DBEAFE'}
          onMouseLeave={e => e.currentTarget.style.background = '#F0F9FF'}
        >
          <div style={{ fontSize: 40, marginBottom: 10 }}>📄</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1D4ED8', marginBottom: 6 }}>Subir presupuesto PDF</div>
          <div style={{ fontSize: 12, color: '#3B82F6' }}>Claude va a leer el PDF y extraer las etapas y montos automáticamente</div>
          <div style={{ fontSize: 11, color: '#93C5FD', marginTop: 6 }}>Solo PDFs generados por ARMAR</div>
        </div>
      )}

      {estado === 'leyendo' && (
        <div style={{ border: '1px solid #BFDBFE', borderRadius: 14, padding: '32px 24px', textAlign: 'center', background: '#F0F9FF' }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1D4ED8', marginBottom: 4 }}>Analizando presupuesto…</div>
          <div style={{ fontSize: 12, color: '#3B82F6' }}>Claude está leyendo las etapas y montos</div>
        </div>
      )}

      {estado === 'error' && (
        <div style={{ border: '1px solid #FCA5A5', borderRadius: 14, padding: '24px', textAlign: 'center', background: '#FFF5F5' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', marginBottom: 12 }}>{mensaje}</div>
          <button onClick={handleReintentar}
            style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#DC2626', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}>
            Intentar de nuevo
          </button>
        </div>
      )}

      {estado === 'listo' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 16 }}>✅</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>{mensaje}</span>
            <button onClick={handleReintentar}
              style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 6, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-500)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              Cambiar PDF
            </button>
          </div>
          <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden', marginBottom: 14, maxHeight: 300, overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', background: 'var(--gray-100)', padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--gray-200)' }}>
              <span>Etapa</span><span>Monto</span>
            </div>
            {etapas.map((et, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto', padding: '10px 12px', borderBottom: i < etapas.length - 1 ? '1px solid var(--gray-200)' : 'none', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-800)' }}>{et.nombre}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: et.monto > 0 ? 'var(--orange)' : 'var(--gray-300)', textAlign: 'right' }}>
                  {et.monto > 0 ? '$' + et.monto.toLocaleString('es-AR') : '—'}
                </span>
              </div>
            ))}
          </div>
          <button onClick={handleConfirmar}
            style={{ width: '100%', padding: '11px', borderRadius: 9, border: 'none', background: '#3B82F6', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(59,130,246,0.4)' }}>
            Usar estas etapas →
          </button>
        </div>
      )}

      <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}

// ── Paso 1: Tipo ──────────────────────────────────────────────────────────────
function Step1({ mode, setMode, selectedTemplate, setSelectedTemplate, nombre, setNombre, templates, onEtapasImportadas }) {
  const inputStyleLocal = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--gray-200)', fontSize: 14,
    color: 'var(--gray-800)', fontFamily: 'inherit',
    background: 'white', boxSizing: 'border-box', fontWeight: 600,
  }

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Nombre del cronograma *
          </label>
          <input style={inputStyleLocal} placeholder='Ej: "Cronograma general", "Versión 2"…' value={nombre} autoFocus onChange={e => setNombre(e.target.value)} />
          {!nombre.trim() && <div style={{ fontSize: 10, color: '#F97316', marginTop: 3 }}>Campo obligatorio para continuar</div>}
        </div>

        <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>¿Cómo querés crear el cronograma?</p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { key: 'template', label: '📋 Usar plantilla' },
            { key: 'scratch',  label: '✏️ Desde cero' },
            { key: 'pdf',      label: '📄 Importar PDF' },
          ].map(({ key, label }) => (
            <button key={key}
              onClick={() => { setMode(key); if (key !== 'template') setSelectedTemplate(null) }}
              style={{
                flex: 1, minWidth: 120, padding: '10px 12px', borderRadius: 9, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                border: mode === key ? 'none' : '1px solid var(--gray-200)',
                background: mode === key ? (key === 'pdf' ? '#3B82F6' : 'var(--orange)') : 'white',
                color: mode === key ? 'white' : 'var(--gray-600)',
                boxShadow: mode === key ? (key === 'pdf' ? '0 2px 8px rgba(59,130,246,0.3)' : '0 2px 8px rgba(249,115,22,0.3)') : '0 1px 3px rgba(0,0,0,0.06)',
              }}>
              {label}
            </button>
          ))}
        </div>

        {mode === 'template' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {templates.map(tmpl => {
              const sel = selectedTemplate?.id === tmpl.id
              return (
                <div key={tmpl.id} onClick={() => setSelectedTemplate(tmpl)}
                  style={{ padding: '14px 16px', borderRadius: 10, cursor: 'pointer', border: sel ? '2px solid var(--orange)' : '1px solid var(--gray-200)', background: sel ? '#FFF7ED' : 'white', boxShadow: sel ? '0 2px 8px rgba(249,115,22,0.15)' : '0 1px 3px rgba(0,0,0,0.05)', transition: 'all 0.15s' }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{tmpl.icono}</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray-800)', marginBottom: 3 }}>{tmpl.nombre}</div>
                  <div style={{ fontSize: 11, color: 'var(--gray-500)' }}>{tmpl.duracionEstimada}</div>
                </div>
              )
            })}
          </div>
        )}

        {mode === 'scratch' && (
          <div style={{ padding: 24, borderRadius: 12, border: '1px dashed var(--gray-300)', background: 'var(--gray-100)', textAlign: 'center', color: 'var(--gray-500)', fontSize: 13 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🗂️</div>
            Vas a crear un cronograma vacío donde podés agregar etapas manualmente en el siguiente paso.
          </div>
        )}

        {mode === 'pdf' && (
          <ImportadorPDF onEtapasImportadas={onEtapasImportadas} />
        )}
      </div>

      {selectedTemplate && mode === 'template' && (
        <div style={{ width: 240, flexShrink: 0 }}>
          <div style={{ background: '#FFF7ED', borderRadius: 12, border: '1px solid #FED7AA', padding: '16px', height: '100%' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{selectedTemplate.icono}</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--gray-800)', marginBottom: 4 }}>{selectedTemplate.nombre}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 12, lineHeight: 1.5 }}>{selectedTemplate.descripcion}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--orange)', marginBottom: 8 }}>DURACIÓN EST.: {selectedTemplate.duracionEstimada}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-500)', marginBottom: 6 }}>{selectedTemplate.etapas.length} ETAPAS INCLUIDAS</div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {selectedTemplate.etapas.map((et, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--orange)', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: 'var(--gray-700)' }}>{et.nombre}</span>
                  {et.esCritica && <span style={{ fontSize: 9, color: '#DC2626', fontWeight: 700 }}>●</span>}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 9, color: 'var(--gray-400)', marginTop: 8 }}>● = tarea crítica</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Paso 2: Parámetros ────────────────────────────────────────────────────────
const CATEGORIES = ['OBRA', 'PROYECTO', 'GREMIOS', 'ADMINISTRACIÓN']

function TeamSelect({ value, onChange, teamMembers, style }) {
  const members = teamMembers || []
  return (
    <select style={style} value={value} onChange={onChange}>
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

function Step2({ params, setParams, etapasIncluidas, setEtapasIncluidas, template, mode, teamMembers,
                 scratchEtapas, setScratchEtapas, showMiniModal, setShowMiniModal, miniNombre, setMiniNombre,
                 pdfEtapas, setPdfEtapas }) {
  const { isMobile, isTablet } = useBreakpoint()
  const etapas = template?.etapas || []
  const allSelected = etapas.length > 0 && etapas.every(et => etapasIncluidas.includes(et.nombre))
  const toggleEtapa = (nombre) => setEtapasIncluidas(prev => prev.includes(nombre) ? prev.filter(n => n !== nombre) : [...prev, nombre])

  return (
    <div style={{ display: 'flex', gap: 24 }}>
      <div style={{ flex: 1 }}>
        <FormField label="Autor cronograma">
          <TeamSelect style={inputStyle} value={params.autorCronograma || ''} onChange={e => setParams(p => ({ ...p, autorCronograma: e.target.value }))} teamMembers={teamMembers} />
        </FormField>
        <FormField label="Fecha de inicio">
          <input type="date" style={inputStyle} value={params.fechaInicio}
            onChange={e => {
              const fi = e.target.value
              const ff = calcFechaFinDesde(fi, params.duracionValor, params.duracionUnidad)
              setParams(p => ({ ...p, fechaInicio: fi, fechaFin: ff }))
            }} />
        </FormField>
        <div style={{ display: 'grid', gridTemplateColumns: (isMobile || isTablet) ? '1fr' : '1fr 1fr', gap: 12 }}>
          <FormField label="Duración">
            <div style={{ display: 'flex', gap: 6 }}>
              <input type="number" min={1} style={{ ...inputStyle, flex: 1 }} value={params.duracionValor}
                onChange={e => {
                  const val = e.target.value
                  const ff = calcFechaFinDesde(params.fechaInicio, val, params.duracionUnidad)
                  setParams(p => ({ ...p, duracionValor: val, fechaFin: ff }))
                }} />
              <select style={{ ...inputStyle, width: 'auto', minWidth: 90 }} value={params.duracionUnidad}
                onChange={e => {
                  const unidad = e.target.value
                  const ff = calcFechaFinDesde(params.fechaInicio, params.duracionValor, unidad)
                  setParams(p => ({ ...p, duracionUnidad: unidad, fechaFin: ff }))
                }}>
                <option>Días</option><option>Semanas</option><option>Meses</option>
              </select>
            </div>
          </FormField>
          <FormField label="Fin estimado">
            <div style={{ ...inputStyle, background: '#F9FAFB', color: 'var(--gray-500)', cursor: 'default', userSelect: 'none', display: 'flex', alignItems: 'center' }}>
              {params.fechaFin ? fmtDate(params.fechaFin) : '—'}
            </div>
          </FormField>
        </div>
        <FormField label="Responsable de obra">
          <TeamSelect style={inputStyle} value={params.responsableObra} onChange={e => setParams(p => ({ ...p, responsableObra: e.target.value }))} teamMembers={teamMembers} />
        </FormField>
        <FormField label="Responsable de proyecto">
          <TeamSelect style={inputStyle} value={params.responsableProyecto} onChange={e => setParams(p => ({ ...p, responsableProyecto: e.target.value }))} teamMembers={teamMembers} />
        </FormField>
        <FormField label="Contratista principal">
          <TeamSelect style={inputStyle} value={params.contratistaPrincipal || ''} onChange={e => setParams(p => ({ ...p, contratistaPrincipal: e.target.value }))} teamMembers={teamMembers} />
        </FormField>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--gray-100)', borderRadius: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)' }}>Aplicar incidencia automática</div>
            <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Distribuye el porcentaje de cada etapa según su duración</div>
          </div>
          <button onClick={() => setParams(p => ({ ...p, pesosAuto: !p.pesosAuto }))}
            style={{ width: 44, height: 24, borderRadius: 99, border: 'none', cursor: 'pointer', background: params.pesosAuto ? 'var(--orange)' : '#D1D5DB', position: 'relative', transition: 'background 0.2s', flexShrink: 0, padding: 0 }}>
            <div style={{ position: 'absolute', top: 3, width: 18, height: 18, borderRadius: '50%', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s', left: params.pesosAuto ? 23 : 3 }} />
          </button>
        </div>
      </div>

      {/* Panel derecho según modo */}
      {mode === 'template' && etapas.length > 0 && (
        <div style={{ width: 240, flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-700)' }}>Etapas a incluir</span>
            <button onClick={() => setEtapasIncluidas(allSelected ? [] : etapas.map(et => et.nombre))}
              style={{ fontSize: 11, color: 'var(--orange)', fontWeight: 700, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}>
              {allSelected ? 'Deseleccionar todo' : 'Seleccionar todo'}
            </button>
          </div>
          <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {etapas.map((et, i) => {
              const checked = etapasIncluidas.includes(et.nombre)
              return (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 7, cursor: 'pointer', background: checked ? '#FFF7ED' : 'white', border: checked ? '1px solid #FED7AA' : '1px solid var(--gray-200)' }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleEtapa(et.nombre)} style={{ accentColor: 'var(--orange)', width: 14, height: 14 }} />
                  <span style={{ fontSize: 12, color: 'var(--gray-700)', flex: 1 }}>{et.nombre}</span>
                  <span style={{ fontSize: 10, color: 'var(--gray-400)' }}>{et.duracionDias}d</span>
                  {et.esCritica && <span style={{ fontSize: 9, color: '#DC2626', fontWeight: 700 }}>●</span>}
                </label>
              )
            })}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--gray-400)' }}>{etapasIncluidas.length} / {etapas.length} etapas seleccionadas</div>
        </div>
      )}

      {mode === 'scratch' && (
        <div style={{ width: 240, flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 10 }}>Etapas del cronograma</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10, maxHeight: 280, overflowY: 'auto' }}>
            {scratchEtapas.length === 0 && <div style={{ textAlign: 'center', color: 'var(--gray-400)', fontSize: 12, padding: '16px 0' }}>Sin etapas aún</div>}
            {scratchEtapas.map((nombre, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 7, background: '#FFF7ED', border: '1px solid #FED7AA' }}>
                <span style={{ flex: 1, fontSize: 12, color: 'var(--gray-700)' }}>{nombre}</span>
                <button onClick={() => setScratchEtapas(prev => prev.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>
          <button onClick={() => { setShowMiniModal(true) }}
            style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px dashed var(--orange)', background: 'white', color: 'var(--orange)', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            + Nueva etapa
          </button>
          {showMiniModal && (
            <div style={{ marginTop: 10, background: 'white', border: '1px solid var(--gray-200)', borderRadius: 10, padding: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>Nombre de etapa</div>
              <input autoFocus value={miniNombre} onChange={e => setMiniNombre(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && miniNombre.trim()) { setScratchEtapas(p => [...p, miniNombre.trim()]); setMiniNombre(''); setShowMiniModal(false) }
                  if (e.key === 'Escape') { setShowMiniModal(false); setMiniNombre('') }
                }}
                placeholder="Ej: Obra gruesa"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--gray-200)', fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 8, outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => { setShowMiniModal(false); setMiniNombre('') }}
                  style={{ flex: 1, padding: '7px', borderRadius: 7, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-600)', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
                <button onClick={() => { if (!miniNombre.trim()) return; setScratchEtapas(p => [...p, miniNombre.trim()]); setMiniNombre(''); setShowMiniModal(false) }}
                  disabled={!miniNombre.trim()}
                  style={{ flex: 1, padding: '7px', borderRadius: 7, border: 'none', background: miniNombre.trim() ? 'var(--orange)' : 'var(--gray-200)', color: miniNombre.trim() ? 'white' : 'var(--gray-400)', fontSize: 11, fontWeight: 700, cursor: miniNombre.trim() ? 'pointer' : 'default', fontFamily: 'inherit' }}>Aceptar</button>
              </div>
            </div>
          )}
          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--gray-400)' }}>{scratchEtapas.length} etapa{scratchEtapas.length !== 1 ? 's' : ''} agregada{scratchEtapas.length !== 1 ? 's' : ''}</div>
        </div>
      )}

      {mode === 'pdf' && pdfEtapas.length > 0 && (
        <div style={{ width: 240, flexShrink: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1D4ED8', marginBottom: 10 }}>Etapas importadas del PDF</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 340, overflowY: 'auto' }}>
            {pdfEtapas.map((et, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderRadius: 7, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <span style={{ flex: 1, fontSize: 11, color: 'var(--gray-700)', fontWeight: 600 }}>{et.nombre}</span>
                {et.monto > 0 && <span style={{ fontSize: 10, color: '#3B82F6', fontWeight: 700, whiteSpace: 'nowrap' }}>${et.monto.toLocaleString('es-AR')}</span>}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, color: '#3B82F6' }}>{pdfEtapas.length} etapas con montos importados</div>
        </div>
      )}
    </div>
  )
}

// ── Paso 3: Vista previa ──────────────────────────────────────────────────────
function Step3({ previewEtapas, setPreviewEtapas, totalTareas, params }) {
  const [editingEtapa, setEditingEtapa] = useState(null)

  const handleSaveEtapa = (updated) => {
    let newEtapas = previewEtapas.map(et => et.id === updated.id ? { ...et, ...updated } : et)
    const { impactados, updatedMap } = computeCascade(newEtapas, updated)
    if (impactados.length > 0) newEtapas = newEtapas.map(t => updatedMap.has(t.id) ? updatedMap.get(t.id) : t)
    if (params.pesosAuto) {
      const totalDur = newEtapas.reduce((s, r) => s + calcDuracionHabil(r.fechaInicio, r.fechaFin), 0)
      if (totalDur > 0) newEtapas = newEtapas.map(r => ({ ...r, pesoRelativo: Math.round(calcDuracionHabil(r.fechaInicio, r.fechaFin) / totalDur * 100) }))
    }
    setPreviewEtapas(newEtapas)
    setEditingEtapa(null)
  }

  const handleAgregarSubetapa = (parentEtapa) => {
    setEditingEtapa({ id: null, parentId: parentEtapa.id, nombre: '', fechaInicio: parentEtapa.fechaInicio || '', duracionDias: 5, pesoRelativo: 10, dependeDeId: null, tipoVinculo: 'Fin a inicio', desfaseDias: 0 })
  }

  const handleSaveSubetapa = (sub) => {
    const newId = Math.max(...previewEtapas.map(e => e.id || 0), 0) + 1
    setPreviewEtapas(prev => [...prev, { ...sub, id: newId }])
    setEditingEtapa(null)
  }

  const rootEtapas = previewEtapas.filter(e => !e.parentId)

  return (
    <div style={{ display: 'flex', gap: 20 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 12 }}>
          Hacé clic en una etapa para editarla. Los corrimientos se aplican automáticamente según las dependencias.
        </p>
        <div style={{ border: '1px solid var(--gray-200)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--gray-100)' }}>
                {['Etapa', 'Inicio', 'Fin Est.', 'Duración', 'Incidencia %', 'Presupuesto'].map(h => (
                  <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--gray-200)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rootEtapas.map((et) => {
                const hijos = previewEtapas.filter(s => s.parentId === et.id)
                const dur = calcDuracionHabil(et.fechaInicio, et.fechaFin)
                return (
                  <>
                    <tr key={et.id} onClick={() => setEditingEtapa(et)}
                      style={{ borderBottom: '1px solid var(--gray-200)', cursor: 'pointer', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FFF7ED'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: 'var(--gray-800)' }}>
                        {et.esCritica && <span style={{ color: '#DC2626', marginRight: 4 }}>●</span>}
                        {et.nombre}
                      </td>
                      <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--gray-600)' }}>{fmtShort(et.fechaInicio)}</td>
                      <td style={{ padding: '9px 12px', fontSize: 12, color: 'var(--gray-600)' }}>{fmtShort(et.fechaFin || calcFechaFin(et.fechaInicio, et.duracionDias))}</td>
                      <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', background: 'var(--gray-100)', padding: '2px 8px', borderRadius: 4 }}>{dur}d</span>
                      </td>
                      <td style={{ padding: '9px 12px', textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'var(--orange)' }}>{et.pesoRelativo}%</td>
                      <td style={{ padding: '9px 12px', fontSize: 11, fontWeight: 700, color: et.presupuesto ? '#3B82F6' : 'var(--gray-300)' }}>
                        {et.presupuesto ? '$' + et.presupuesto.toLocaleString('es-AR') : '—'}
                      </td>
                    </tr>
                    {hijos.map(hijo => (
                      <tr key={hijo.id} onClick={() => setEditingEtapa(hijo)}
                        style={{ borderBottom: '1px solid var(--gray-200)', cursor: 'pointer', background: '#FAFAFA' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FFF7ED'}
                        onMouseLeave={e => e.currentTarget.style.background = '#FAFAFA'}>
                        <td style={{ padding: '7px 12px 7px 28px', fontSize: 12, color: 'var(--gray-700)' }}>└ {hijo.nombre}</td>
                        <td style={{ padding: '7px 12px', fontSize: 11, color: 'var(--gray-500)' }}>{fmtShort(hijo.fechaInicio)}</td>
                        <td style={{ padding: '7px 12px', fontSize: 11, color: 'var(--gray-500)' }}>{fmtShort(hijo.fechaFin)}</td>
                        <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                          <span style={{ fontSize: 11, color: 'var(--gray-500)', background: 'var(--gray-100)', padding: '1px 6px', borderRadius: 4 }}>{calcDuracionHabil(hijo.fechaInicio, hijo.fechaFin)}d</span>
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'center', fontSize: 11, color: 'var(--gray-500)' }}>{hijo.pesoRelativo}%</td>
                        <td style={{ padding: '7px 12px', fontSize: 11, color: 'var(--gray-300)' }}>—</td>
                      </tr>
                    ))}
                  </>
                )
              })}
              {rootEtapas.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 13 }}>No hay etapas para previsualizar</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--gray-400)' }}>Hacé clic en cualquier etapa para editar sus detalles, fechas y dependencias.</div>
      </div>

      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ background: 'linear-gradient(135deg, #FFF7ED, #FEF3C7)', border: '1px solid #FED7AA', borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--orange)', marginBottom: 14 }}>RESUMEN</div>
          <SummaryField label="Fecha inicio" value={fmtDate(params.fechaInicio)} />
          <SummaryField label="Fin estimado" value={fmtDate(params.fechaFin)} />
          <SummaryField label="Total etapas" value={rootEtapas.length} />
          <SummaryField label="Total tareas" value={totalTareas} />
          {rootEtapas.some(e => e.presupuesto) && (
            <SummaryField label="Presupuesto total" value={'$' + rootEtapas.reduce((s, e) => s + (e.presupuesto || 0), 0).toLocaleString('es-AR')} />
          )}
          <div style={{ borderTop: '1px solid #FED7AA', paddingTop: 10, marginTop: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gray-400)', textTransform: 'uppercase', marginBottom: 4 }}>Avance inicial</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--gray-300)' }}>0%</div>
          </div>
        </div>
      </div>

      {editingEtapa && (
        <ModalEditarEtapa
          tarea={editingEtapa}
          tareas={previewEtapas}
          onClose={() => setEditingEtapa(null)}
          onSave={editingEtapa.id ? handleSaveEtapa : handleSaveSubetapa}
          onAgregarSubetapa={handleAgregarSubetapa}
        />
      )}
    </div>
  )
}

// ── Modal principal ───────────────────────────────────────────────────────────
export default function ModalCrearCronograma({ project, teamMembers, onClose, onCrear }) {
  const [step, setStep]         = useState(1)
  const [nombre, setNombre]     = useState('')
  const [mode, setMode]         = useState('template')
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [templates]             = useState(() => loadTemplates())
  const [params, setParams]     = useState({
    autorCronograma: '',
    fechaInicio: project.startDate || '',
    fechaFin: '',
    duracionValor: '',
    duracionUnidad: 'Días',
    responsableObra: project.responsible || '',
    responsableProyecto: '',
    contratistaPrincipal: '',
    pesosAuto: true,
  })
  const [etapasIncluidas, setEtapasIncluidas] = useState([])
  const [previewEtapas, setPreviewEtapas]     = useState([])
  const [scratchEtapas, setScratchEtapas]     = useState([])
  const [pdfEtapas, setPdfEtapas]             = useState([])
  const [showMiniModal, setShowMiniModal]     = useState(false)
  const [miniNombre, setMiniNombre]           = useState('')

  const handleSelectTemplate = (tmpl) => {
    setSelectedTemplate(tmpl)
    setEtapasIncluidas(tmpl.etapas.map(et => et.nombre))
  }

  const handleEtapasImportadas = (etapas) => {
    setPdfEtapas(etapas)
  }

  const totalTareas = useMemo(() => {
    if (mode === 'scratch') return scratchEtapas.length
    if (mode === 'pdf') return pdfEtapas.length
    if (!selectedTemplate) return 0
    return selectedTemplate.etapas.filter(et => etapasIncluidas.includes(et.nombre)).reduce((s, et) => s + et.tareas.length + 1, 0)
  }, [selectedTemplate, etapasIncluidas, scratchEtapas, pdfEtapas, mode])

  const buildPreview = () => {
    if (mode === 'pdf') {
      if (!pdfEtapas.length || !params.fechaInicio || !params.fechaFin) { setPreviewEtapas([]); return }
      const total = pdfEtapas.length
      const totalHabil = Math.max(1, calcDuracionHabil(params.fechaInicio, params.fechaFin))
      const perEtapa = Math.floor(totalHabil / total)
      let cursor = params.fechaInicio
      const etapas = pdfEtapas.map((et, i) => {
        const dur = i === total - 1 ? Math.max(1, calcDuracionHabil(cursor, params.fechaFin)) : perEtapa
        const fi = cursor
        const ff = i === total - 1 ? params.fechaFin : calcFechaFin(cursor, dur)
        cursor = addBusinessDays(ff, 1)
        return {
          id: i + 1, nombre: et.nombre,
          fechaInicio: fi, fechaFin: ff,
          duracionDias: dur,
          pesoRelativo: params.pesosAuto ? Math.round(100 / total) : 10,
          presupuesto: et.monto > 0 ? et.monto : null,
          parentId: null, dependeDeId: null,
          tipoVinculo: 'Fin a inicio', desfaseDias: 0,
          avanceActual: 0, estado: 'Pendiente', esCritica: false,
          adicionales: [],
        }
      })
      setPreviewEtapas(etapas)
      return
    }

    if (mode === 'scratch') {
      if (!scratchEtapas.length || !params.fechaInicio || !params.fechaFin) { setPreviewEtapas([]); return }
      const total = scratchEtapas.length
      const totalHabil = Math.max(1, calcDuracionHabil(params.fechaInicio, params.fechaFin))
      const perEtapa = Math.floor(totalHabil / total)
      let cursor = params.fechaInicio
      const etapas = scratchEtapas.map((nombre, i) => {
        const dur = i === total - 1 ? Math.max(1, calcDuracionHabil(cursor, params.fechaFin)) : perEtapa
        const fi = cursor
        const ff = i === total - 1 ? params.fechaFin : calcFechaFin(cursor, dur)
        cursor = addBusinessDays(ff, 1)
        return { id: i + 1, nombre, fechaInicio: fi, fechaFin: ff, duracionDias: dur, pesoRelativo: params.pesosAuto ? Math.round(100 / total) : 10, parentId: null, dependeDeId: null, tipoVinculo: 'Fin a inicio', desfaseDias: 0 }
      })
      setPreviewEtapas(etapas)
      return
    }

    const tareas = generarTareasDesdeTemplate(selectedTemplate, etapasIncluidas, project.id, params.fechaInicio, params.fechaFin)
    setPreviewEtapas(tareas.filter(t => t.parentId === null))
  }

  const canNext = () => {
    if (step === 1) {
      if (!nombre.trim()) return false
      if (mode === 'template') return selectedTemplate !== null
      if (mode === 'pdf') return pdfEtapas.length > 0
      return true
    }
    if (step === 2) return params.fechaInicio && params.fechaFin
    return true
  }

  const goNext = () => {
    if (step === 2) buildPreview()
    setStep(s => s + 1)
  }

  const handleCrear = () => {
    let tareas
    if (mode === 'pdf' || mode === 'scratch') {
      tareas = previewEtapas.map((et, i) => ({
        id: i + 1, obraId: project.id, parentId: null,
        nombre: et.nombre, tipo: 'etapa',
        fechaInicio: et.fechaInicio, fechaFin: et.fechaFin,
        duracionDias: Math.max(0, calcDuracionHabil(et.fechaInicio, et.fechaFin)),
        responsable: params.responsableObra || '',
        avanceActual: 0, estado: 'Pendiente',
        pesoRelativo: et.pesoRelativo,
        presupuesto: et.presupuesto || null,
        adicionales: [],
        dependeDeId: null, esCritica: false,
        tipoVinculo: 'Fin a inicio', desfaseDias: 0,
      }))
    } else {
      const rawTareas = generarTareasDesdeTemplate(selectedTemplate, etapasIncluidas, project.id, params.fechaInicio, params.fechaFin)
      tareas = rawTareas.map(t => {
        if (t.parentId === null) {
          const preview = previewEtapas.find(pe => pe.id === t.id)
          if (preview) return { ...t, fechaInicio: preview.fechaInicio, fechaFin: preview.fechaFin, pesoRelativo: preview.pesoRelativo, nombre: preview.nombre }
        }
        return { ...t, responsable: params.responsableObra }
      })
    }
    onCrear({ obraId: project.id, nombre, creadoEn: new Date().toISOString().split('T')[0], autorCronograma: params.autorCronograma, contratistaPrincipal: params.contratistaPrincipal, tareas, informes: [], certificados: [] })
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 820, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 80px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '22px 28px 0', borderBottom: '1px solid var(--gray-200)', paddingBottom: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--gray-900)', marginBottom: 2 }}>Nuevo cronograma</h2>
              <p style={{ fontSize: 12, color: 'var(--gray-500)' }}>{project.name}</p>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--gray-400)', lineHeight: 1, padding: '4px 8px' }}>×</button>
          </div>
          <StepBar step={step} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {step === 1 && (
            <Step1 mode={mode} setMode={setMode} selectedTemplate={selectedTemplate} setSelectedTemplate={handleSelectTemplate}
              nombre={nombre} setNombre={setNombre} templates={templates} onEtapasImportadas={handleEtapasImportadas} />
          )}
          {step === 2 && (
            <Step2 params={params} setParams={setParams}
              etapasIncluidas={etapasIncluidas} setEtapasIncluidas={setEtapasIncluidas}
              template={selectedTemplate} mode={mode} teamMembers={teamMembers}
              scratchEtapas={scratchEtapas} setScratchEtapas={setScratchEtapas}
              showMiniModal={showMiniModal} setShowMiniModal={setShowMiniModal}
              miniNombre={miniNombre} setMiniNombre={setMiniNombre}
              pdfEtapas={pdfEtapas} setPdfEtapas={setPdfEtapas} />
          )}
          {step === 3 && (
            <Step3 previewEtapas={previewEtapas} setPreviewEtapas={setPreviewEtapas}
              totalTareas={totalTareas} params={params} />
          )}
        </div>

        <div style={{ padding: '16px 28px', borderTop: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={step === 1 ? onClose : () => setStep(s => s - 1)}
            style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-700)', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
            {step === 1 ? 'Cancelar' : '← Anterior'}
          </button>
          <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Paso {step} de 3</div>
          {step < 3 ? (
            <button onClick={goNext} disabled={!canNext()}
              style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: canNext() ? 'var(--orange)' : 'var(--gray-200)', color: canNext() ? 'white' : 'var(--gray-400)', cursor: canNext() ? 'pointer' : 'default', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', boxShadow: canNext() ? '0 2px 8px rgba(249,115,22,0.4)' : 'none' }}>
              Siguiente →
            </button>
          ) : (
            <button onClick={handleCrear}
              style={{ padding: '10px 22px', borderRadius: 8, border: 'none', background: 'var(--orange)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(249,115,22,0.4)' }}>
              Crear cronograma ✓
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
