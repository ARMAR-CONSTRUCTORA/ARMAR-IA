import { useState, useEffect, useRef, useCallback } from 'react'
import LocationAutocomplete from './LocationAutocomplete'
import {
  loadProyectosArmar,
  upsertProyectoArmar,
  deleteProyectoArmar,
  loadChecklistItems,
  upsertChecklistItem,
  insertChecklistItems,
  loadPresupuestosResumen,
  upsertCalendarioEvento,
  supabase,
} from '../lib/supabase'

// ─── Constantes de color ──────────────────────────────────────────────────────

const orange      = '#E8641A'
const orangeLight = '#FFF3EB'
const dark        = '#1A1A1A'
const mid         = '#444'
const light       = '#F7F7F5'
const border      = '#E0DDD8'
const green       = '#2D7A4F'
const greenLight  = '#EBF7F1'
const red         = '#C0392B'
const redLight    = '#FDECEA'
const blue        = '#2563EB'
const blueLight   = '#EFF6FF'

const PRESUPUESTO_ESTADO_META = {
  borrador: { label: 'Borrador', color: '#6B7280', bg: '#F3F4F6' },
  enviado:  { label: 'Enviado',  color: orange,    bg: orangeLight },
  aprobado: { label: 'Aprobado', color: green,      bg: greenLight },
}

// ─── Tipos y opciones ─────────────────────────────────────────────────────────

const TIPOS_ENCARGO = [
  { value: 'proyecto_direccion_construccion_armar', label: 'Proyecto + Dirección + Construcción ARMAR' },
  { value: 'obra_proyecto_externo',                 label: 'Obra sobre proyecto externo' },
]

const MODALIDADES_OBRA_EXTERNA = ['Dirección + construcción', 'Solo construcción']

const TIPOS_OBRA = [
  'Vivienda unifamiliar', 'Reforma o ampliación', 'Local comercial',
  'Local gastronómico', 'Oficina', 'Desarrollo inmobiliario', 'Otro',
]

const ESTADOS_GENERALES = ['En análisis', 'En curso', 'Pausado', 'Finalizado']

const ESTADO_COLORS = {
  'En análisis': { color: blue,        bg: blueLight },
  'En curso':    { color: green,       bg: greenLight },
  'Pausado':     { color: '#F59E0B',   bg: '#FEF3C7' },
  'Finalizado':  { color: mid,         bg: '#F3F4F6' },
}

const ESTADOS_ITEM = [
  { value: 'no_iniciado',          label: 'No iniciado' },
  { value: 'en_curso',             label: 'En curso' },
  { value: 'pendiente_cliente',    label: 'Pend. cliente' },
  { value: 'pendiente_proveedor',  label: 'Pend. proveedor' },
  { value: 'pendiente_municipio',  label: 'Pend. municipio' },
  { value: 'bloqueado',            label: 'Bloqueado' },
  { value: 'revisado',             label: 'Revisado' },
  { value: 'aprobado',             label: 'Aprobado' },
  { value: 'no_aplica',            label: 'No aplica' },
]

const ESTADOS_COMPLETOS = new Set(['aprobado', 'revisado', 'no_aplica'])

const ESTADO_ITEM_COLORS = {
  no_iniciado:         { color: '#9CA3AF', bg: '#F9FAFB' },
  en_curso:            { color: blue,      bg: blueLight },
  pendiente_cliente:   { color: '#7C3AED', bg: '#EDE9FE' },
  pendiente_proveedor: { color: '#D97706', bg: '#FEF3C7' },
  pendiente_municipio: { color: '#0891B2', bg: '#E0F2FE' },
  bloqueado:           { color: red,       bg: redLight },
  revisado:            { color: '#059669', bg: '#D1FAE5' },
  aprobado:            { color: green,     bg: greenLight },
  no_aplica:           { color: '#9CA3AF', bg: '#F3F4F6' },
}

// ─── Etapas y pesos ───────────────────────────────────────────────────────────

const ETAPA_LABELS = {
  alta_encuadre:                    'Alta y encuadre',
  viabilidad:                       'Viabilidad',
  anteproyecto:                     'Anteproyecto',
  proyecto_ejecutivo_transferencia: 'Proyecto Ejecutivo + Presupuesto + Transferencia',
  documentacion_externa_validacion: 'Documentación externa y validación básica',
  presupuesto_contratacion:         'Presupuesto y contratación',
  planificacion_obra:               'Planificación de obra',
}

const ETAPAS_A = ['alta_encuadre', 'viabilidad', 'anteproyecto', 'proyecto_ejecutivo_transferencia']
const ETAPAS_B = ['alta_encuadre', 'documentacion_externa_validacion', 'presupuesto_contratacion', 'planificacion_obra']

const PESOS_A = { alta_encuadre: 15, viabilidad: 20, anteproyecto: 25, proyecto_ejecutivo_transferencia: 40 }
const PESOS_B = { alta_encuadre: 15, documentacion_externa_validacion: 20, presupuesto_contratacion: 30, planificacion_obra: 35 }

function getEtapas(tipoEncargo) {
  return tipoEncargo === 'proyecto_direccion_construccion_armar' ? ETAPAS_A : ETAPAS_B
}

function getPesos(tipoEncargo) {
  return tipoEncargo === 'proyecto_direccion_construccion_armar' ? PESOS_A : PESOS_B
}

// ─── Plantillas de checklist ──────────────────────────────────────────────────

function buildItems(proyectoArmarId, etapa, titulos, pesoEtapa, esUltimaEtapa = false) {
  return titulos.map((titulo, i) => ({
    proyectoArmarId,
    etapa,
    titulo,
    obligatorio: true,
    aplica:      true,
    estado:      'no_iniciado',
    peso:        pesoEtapa,
    orden:       i,
    descripcion:  '',
    responsable:  '',
    fechaObjetivo: '',
    observaciones: '',
    linkAdjunto:   '',
    fechaCierre:   '',
    // El último ítem de la última etapa es la compuerta
    ...(esUltimaEtapa && i === titulos.length - 1 ? { esCompuerta: true } : {}),
  }))
}

function generarPlantilla(proyectoArmarId, tipoEncargo) {
  if (tipoEncargo === 'proyecto_direccion_construccion_armar') {
    return [
      ...buildItems(proyectoArmarId, 'alta_encuadre', [
        'Ficha básica del proyecto completa',
        'Datos de contacto del comitente cargados',
        'Tipo de encargo confirmado',
        'Tipo de obra definido',
        'Alcance preliminar definido',
        'Responsable interno ARMAR asignado',
        'Carpeta de documentación creada',
        'Kickoff registrado',
      ], 15),
      ...buildItems(proyectoArmarId, 'viabilidad', [
        'Relevamiento inicial realizado y cargado a carpeta del proyecto',
        'Documento de necesidades del comitente completado y cargado a carpeta',
        'Antecedentes documentación base recopilada y cargada a carpeta del proyecto',
        'Normativa aplicable verificada y respaldo cargado a carpeta',
        'Aprobación interna para avanzar',
      ], 20),
      ...buildItems(proyectoArmarId, 'anteproyecto', [
        'Carpeta de anteproyecto creada',
        'Notas de reuniones con cliente completadas por avance',
        'Documento de definiciones del cliente completo',
        'Presupuesto preliminar estimación de obra cargada',
        'Versión final de anteproyecto aprobada',
      ], 25),
      ...buildItems(proyectoArmarId, 'proyecto_ejecutivo_transferencia', [
        'Carpeta de proyecto ejecutivo creada',
        'Documentación de proyecto cargada por rubro',
        'Informe de listado de documentos planos planillas completado y cargado',
        'Observaciones ajustes de proyecto registrados y resueltos',
        'Versión final de proyecto ejecutivo validada',
        'Presupuesto final de obra completo emitido',
        'Transferencia de documentación a obra en carpeta y reunión técnica realizada',
      ], 40, true),
    ]
  }

  // Plantilla B — Obra sobre proyecto externo
  return [
    ...buildItems(proyectoArmarId, 'alta_encuadre', [
      'Ficha básica del proyecto completa',
      'Datos del comitente cargados',
      'Profesional estudio responsable del proyecto identificado',
      'Contacto técnico externo cargado',
      'Alcance de ARMAR definido',
      'Responsabilidades excluidas de ARMAR registradas',
      'Carpeta general del proyecto creada',
    ], 15),
    ...buildItems(proyectoArmarId, 'documentacion_externa_validacion', [
      'Carpeta de documentación externa creada',
      'Documentación externa recibida y cargada a carpeta',
      'Informe listado de documentación recibida completado',
      'Faltantes o indefiniciones registrados',
      'Versión vigente de documentación confirmada',
      'Documentación suficiente para cotizar definida',
    ], 20),
    ...buildItems(proyectoArmarId, 'presupuesto_contratacion', [
      'Carpeta de presupuesto creada',
      'Presupuesto de obra completo cargado',
      'Alcance exclusiones y supuestos registrados',
      'Responsabilidades del cliente profesional externo registradas',
      'Presupuesto enviado presentado al comitente',
      'Presupuesto aprobado y condiciones de contratación registradas',
    ], 30),
    ...buildItems(proyectoArmarId, 'planificacion_obra', [
      'Carpeta de planificación de obra creada',
      'Documentación vigente para obra cargada y confirmada',
      'Cronograma de obra cargado',
      'Responsables y canales de comunicación definidos',
      'Condiciones de inicio logística y accesos registrados',
      'Reunión de inicio transferencia a obra realizada',
    ], 35, true),
  ]
}

// ─── Marcar compuerta desde items ya guardados en DB ─────────────────────────
// (esCompuerta no se persiste en DB, se deriva de posición)

function markCompuerta(items, tipoEncargo) {
  if (!items.length) return items
  const etapas      = getEtapas(tipoEncargo)
  const ultimaEtapa = etapas[etapas.length - 1]
  const deUltima    = items.filter(it => it.etapa === ultimaEtapa)
  if (!deUltima.length) return items
  const maxOrden = Math.max(...deUltima.map(it => it.orden))
  return items.map(it => ({
    ...it,
    esCompuerta: it.etapa === ultimaEtapa && it.orden === maxOrden,
  }))
}

// ─── Cálculo de avance ────────────────────────────────────────────────────────

function calcAvanceEtapa(items) {
  const aplicables = items.filter(it => it.aplica && it.estado !== 'no_aplica')
  if (!aplicables.length) return 100
  const completos  = aplicables.filter(it => ESTADOS_COMPLETOS.has(it.estado))
  return Math.round((completos.length / aplicables.length) * 100)
}

function calcAvanceTotal(items, tipoEncargo) {
  const pesos     = getPesos(tipoEncargo)
  const etapas    = getEtapas(tipoEncargo)
  let total = 0, pesoTotal = 0
  for (const etapa of etapas) {
    const peso = pesos[etapa] || 0
    pesoTotal += peso
    total += (calcAvanceEtapa(items.filter(it => it.etapa === etapa)) / 100) * peso
  }
  return pesoTotal ? Math.round((total / pesoTotal) * 100) : 0
}

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function semaforo(pct) {
  if (pct >= 80) return green
  if (pct >= 40) return '#F59E0B'
  return red
}

function ProgressBar({ value, height = 6 }) {
  const color = value === 100 ? green : value >= 70 ? orange : value >= 40 ? '#F59E0B' : '#9CA3AF'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 32, textAlign: 'right' }}>{value}%</span>
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: `1px solid ${border}`, fontSize: 13, fontFamily: 'inherit',
  boxSizing: 'border-box', outline: 'none', color: dark, background: 'white',
}
const labelStyle = {
  display: 'block', fontSize: 11, fontWeight: 700, color: '#6B7280',
  textTransform: 'uppercase', marginBottom: 5, letterSpacing: '0.05em',
}
const focusOrange = {
  onFocus: e => { e.target.style.borderColor = orange },
  onBlur:  e => { e.target.style.borderColor = border },
}

// ─── Modal Crear / Editar ─────────────────────────────────────────────────────

function ModalProyecto({ proy, onSave, onClose }) {
  const isExterno = (v) => v === 'obra_proyecto_externo'

  // Campos comunes
  const [nombre,            setNombre]            = useState(proy?.nombre            || '')
  const [tipoEncargo,       setTipoEncargo]       = useState(proy?.tipoEncargo       || '')
  const [tipoObra,          setTipoObra]          = useState(proy?.tipoObra          || '')
  const [direccion,         setDireccion]         = useState(proy?.direccion         || '')
  const [zona,              setZona]              = useState(proy?.zona              || '')
  const [fechaInicio,       setFechaInicio]       = useState(proy?.fechaInicio       || '')
  const [fechaObjetivo,     setFechaObjetivo]     = useState(proy?.fechaObjetivo     || '')
  const [comitente,         setComitente]         = useState(proy?.comitente         || '')
  const [telefonoComitente, setTelefonoComitente] = useState(proy?.telefonoComitente || '')
  const [emailComitente,    setEmailComitente]    = useState(proy?.emailComitente    || '')
  const [responsableArmar,  setResponsableArmar]  = useState(proy?.responsableArmar  || '')
  const [estadoGeneral,     setEstadoGeneral]     = useState(proy?.estadoGeneral     || 'En análisis')
  const [linkDocumentacion, setLinkDocumentacion] = useState(proy?.linkDocumentacion || '')

  // Campos obra_proyecto_externo
  // Reutilizamos campos existentes del DB: responsableObra=modalidad, responsableProyecto=alcance, responsableAdmin=exclusiones
  const [modalidadArmar,            setModalidadArmar]            = useState(proy?.responsableObra   || '')
  const [arquitectoExterno,         setArquitectoExterno]         = useState(proy?.arquitectoExterno         || '')
  const [contactoArquitectoExterno, setContactoArquitectoExterno] = useState(proy?.contactoArquitectoExterno || '')
  const [alcanceArmar,              setAlcanceArmar]              = useState(proy?.responsableProyecto || '')
  const [responsabilidadesExcluidas, setResponsabilidadesExcluidas] = useState(proy?.responsableAdmin  || '')

  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nombre.trim()) { setError('El nombre es obligatorio.'); return }
    if (!tipoEncargo)   { setError('Seleccioná el tipo de encargo.'); return }
    setError('')
    setSaving(true)
    await onSave({
      nombre: nombre.trim(), tipoEncargo, tipoObra, direccion, zona,
      fechaInicio, fechaObjetivo,
      comitente: comitente.trim(), telefonoComitente, emailComitente,
      responsableArmar, estadoGeneral, linkDocumentacion,
      // Campos externos mapeados a columnas existentes
      arquitectoExterno, contactoArquitectoExterno,
      responsableObra:     isExterno(tipoEncargo) ? modalidadArmar            : (proy?.responsableObra     || ''),
      responsableProyecto: isExterno(tipoEncargo) ? alcanceArmar              : (proy?.responsableProyecto || ''),
      responsableAdmin:    isExterno(tipoEncargo) ? responsabilidadesExcluidas : (proy?.responsableAdmin    || ''),
    })
    setSaving(false)
  }

  const row2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 580, maxHeight: '92vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: `1px solid ${border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: dark }}>
            {proy ? 'Editar proyecto' : 'Nuevo proyecto'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9CA3AF', padding: '2px 8px' }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

          {/* Nombre */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Nombre del proyecto *</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} required
              placeholder="Ej: Casa Rodríguez" style={inputStyle} {...focusOrange} />
          </div>

          {/* Tipo de encargo */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Tipo de encargo *</label>
            <select value={tipoEncargo} onChange={e => setTipoEncargo(e.target.value)}
              style={inputStyle} {...focusOrange}>
              <option value="">Seleccionar…</option>
              {TIPOS_ENCARGO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Campos condicionales — obra_proyecto_externo */}
          {isExterno(tipoEncargo) && (
            <>
              {/* Modalidad ARMAR */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Modalidad ARMAR en obra externa</label>
                <select value={modalidadArmar} onChange={e => setModalidadArmar(e.target.value)}
                  style={inputStyle} {...focusOrange}>
                  <option value="">Seleccionar…</option>
                  {MODALIDADES_OBRA_EXTERNA.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

              {/* Profesional externo + Contacto */}
              <div style={{ ...row2 }}>
                <div>
                  <label style={labelStyle}>Profesional / estudio del proyecto</label>
                  <input value={arquitectoExterno} onChange={e => setArquitectoExterno(e.target.value)}
                    placeholder="Nombre o estudio" style={inputStyle} {...focusOrange} />
                </div>
                <div>
                  <label style={labelStyle}>Contacto técnico externo</label>
                  <input value={contactoArquitectoExterno} onChange={e => setContactoArquitectoExterno(e.target.value)}
                    placeholder="Tel / email" style={inputStyle} {...focusOrange} />
                </div>
              </div>

              {/* Alcance + Exclusiones */}
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Alcance de ARMAR</label>
                <input value={alcanceArmar} onChange={e => setAlcanceArmar(e.target.value)}
                  placeholder="Describir el alcance acordado" style={inputStyle} {...focusOrange} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>Responsabilidades excluidas de ARMAR</label>
                <input value={responsabilidadesExcluidas} onChange={e => setResponsabilidadesExcluidas(e.target.value)}
                  placeholder="Describir qué queda excluido" style={inputStyle} {...focusOrange} />
              </div>
            </>
          )}

          {/* Tipo obra + Estado */}
          <div style={{ ...row2 }}>
            <div>
              <label style={labelStyle}>Tipo de obra</label>
              <select value={tipoObra} onChange={e => setTipoObra(e.target.value)}
                style={inputStyle} {...focusOrange}>
                <option value="">Seleccionar…</option>
                {TIPOS_OBRA.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Estado general</label>
              <select value={estadoGeneral} onChange={e => setEstadoGeneral(e.target.value)}
                style={inputStyle} {...focusOrange}>
                {ESTADOS_GENERALES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Dirección + Zona */}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Dirección</label>
            <LocationAutocomplete value={direccion} onChange={setDireccion} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Zona</label>
            <input value={zona} onChange={e => setZona(e.target.value)}
              placeholder="Ej: Palermo, CABA" style={inputStyle} {...focusOrange} />
          </div>

          {/* Fechas */}
          <div style={{ ...row2 }}>
            <div>
              <label style={labelStyle}>Fecha de ingreso</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} style={inputStyle} {...focusOrange} />
            </div>
            <div>
              <label style={labelStyle}>Fecha objetivo</label>
              <input type="date" value={fechaObjetivo} onChange={e => setFechaObjetivo(e.target.value)} style={inputStyle} {...focusOrange} />
            </div>
          </div>

          {/* Comitente */}
          <div style={{ marginBottom: 6 }}>
            <label style={labelStyle}>Cliente / Comitente</label>
          </div>
          <div style={{ marginBottom: 16 }}>
            <input value={comitente} onChange={e => setComitente(e.target.value)}
              placeholder="Nombre del cliente principal" style={{ ...inputStyle, marginBottom: 8 }} {...focusOrange} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input value={telefonoComitente} onChange={e => setTelefonoComitente(e.target.value)}
                placeholder="Teléfono" style={inputStyle} {...focusOrange} />
              <input value={emailComitente} onChange={e => setEmailComitente(e.target.value)}
                placeholder="Email" style={inputStyle} {...focusOrange} />
            </div>
          </div>

          {/* Responsable + Carpeta */}
          <div style={{ ...row2 }}>
            <div>
              <label style={labelStyle}>Responsable ARMAR</label>
              <input value={responsableArmar} onChange={e => setResponsableArmar(e.target.value)}
                placeholder="Ej: Juan" style={inputStyle} {...focusOrange} />
            </div>
            <div>
              <label style={labelStyle}>Carpeta del proyecto</label>
              <input value={linkDocumentacion} onChange={e => setLinkDocumentacion(e.target.value)}
                placeholder="URL Drive / Dropbox" style={inputStyle} {...focusOrange} />
            </div>
          </div>

          {error && <p style={{ color: red, fontSize: 12, marginBottom: 12, marginTop: 4 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8, paddingBottom: 4 }}>
            <button type="button" onClick={onClose}
              style={{ padding: '10px 20px', borderRadius: 8, border: `1px solid ${border}`, background: 'white', color: mid, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: orange, color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(232,100,26,0.3)', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando…' : proy ? 'Guardar cambios' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Fila de ítem del checklist ───────────────────────────────────────────────

function ItemRow({ item, onUpdate }) {
  const [editObs,  setEditObs]  = useState(false)
  const [obsLocal, setObsLocal] = useState(item.observaciones || '')
  const [saving,   setSaving]   = useState(false)

  const meta = ESTADO_ITEM_COLORS[item.estado] || ESTADO_ITEM_COLORS.no_iniciado

  const handleEstado = async (val) => {
    setSaving(true)
    await onUpdate({ ...item, estado: val, aplica: val === 'no_aplica' ? false : item.aplica })
    setSaving(false)
  }

  const handleSaveObs = async () => {
    setSaving(true)
    await onUpdate({ ...item, observaciones: obsLocal })
    setSaving(false)
    setEditObs(false)
  }

  const completo = ESTADOS_COMPLETOS.has(item.estado)

  return (
    <tr style={{ borderBottom: `1px solid ${border}`, opacity: item.aplica === false ? 0.45 : 1 }}>
      <td style={{ padding: '8px 12px', fontSize: 12, color: completo ? '#9CA3AF' : dark, textDecoration: completo ? 'line-through' : 'none', minWidth: 180 }}>
        {item.esCompuerta && (
          <span style={{ display: 'inline-block', marginRight: 5, fontSize: 10, fontWeight: 800, color: green, background: greenLight, padding: '1px 6px', borderRadius: 99, verticalAlign: 'middle' }}>
            COMPUERTA
          </span>
        )}
        {item.titulo}
      </td>
      <td style={{ padding: '8px 8px', minWidth: 130 }}>
        <select value={item.estado} onChange={e => handleEstado(e.target.value)} disabled={saving}
          style={{ fontSize: 11, fontWeight: 700, padding: '3px 7px', borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: 'inherit', color: meta.color, background: meta.bg, appearance: 'none', outline: 'none' }}>
          {ESTADOS_ITEM.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </td>
      <td style={{ padding: '8px 8px', fontSize: 12, color: mid, minWidth: 80 }}>
        {item.responsable || <span style={{ color: '#D1D5DB' }}>—</span>}
      </td>
      <td style={{ padding: '8px 8px', minWidth: 160 }}>
        {editObs ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <input value={obsLocal} onChange={e => setObsLocal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter')  handleSaveObs()
                if (e.key === 'Escape') { setEditObs(false); setObsLocal(item.observaciones || '') }
              }}
              style={{ flex: 1, padding: '4px 7px', fontSize: 12, border: `1px solid ${orange}`, borderRadius: 5, fontFamily: 'inherit', outline: 'none' }}
              autoFocus />
            <button onClick={handleSaveObs} disabled={saving}
              style={{ padding: '4px 8px', fontSize: 11, fontWeight: 700, background: orange, color: 'white', border: 'none', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit' }}>
              {saving ? '…' : 'OK'}
            </button>
          </div>
        ) : (
          <span onClick={() => { setEditObs(true); setObsLocal(item.observaciones || '') }}
            style={{ fontSize: 12, color: item.observaciones ? mid : '#D1D5DB', cursor: 'pointer' }}
            title="Clic para editar">
            {item.observaciones || 'Agregar nota…'}
          </span>
        )}
      </td>
    </tr>
  )
}

// ─── Acordeón de etapa ────────────────────────────────────────────────────────

function EtapaAcordeon({ etapa, items, onUpdateItem }) {
  const [open, setOpen] = useState(false)

  const pct        = calcAvanceEtapa(items)
  const color      = semaforo(pct)
  const aplicables = items.filter(it => it.aplica && it.estado !== 'no_aplica')
  const completos  = aplicables.filter(it => ESTADOS_COMPLETOS.has(it.estado))

  return (
    <div style={{ border: `1px solid ${border}`, borderRadius: 9, overflow: 'hidden', marginBottom: 6 }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: open ? '#FAFAF9' : 'white' }}
        onMouseEnter={e => e.currentTarget.style.background = '#FAFAF9'}
        onMouseLeave={e => e.currentTarget.style.background = open ? '#FAFAF9' : 'white'}>
        <span style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 12, fontWeight: 800, color: dark, letterSpacing: '0.02em' }}>
          {ETAPA_LABELS[etapa] || etapa}
        </span>
        <span style={{ fontSize: 11, color: '#9CA3AF' }}>{completos.length}/{aplicables.length} ítems</span>
        <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 34, textAlign: 'right' }}>{pct}%</span>
        <span style={{ fontSize: 9, color: '#9CA3AF', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', marginLeft: 2 }}>▶</span>
      </div>

      {open && (
        <div style={{ borderTop: `1px solid ${border}` }}>
          <div style={{ padding: '4px 6px', background: light }}>
            <ProgressBar value={pct} height={4} />
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F9FAFB' }}>
                  {['Ítem', 'Estado', 'Responsable', 'Observaciones'].map(h => (
                    <th key={h} style={{ padding: '6px 8px', fontSize: 10, fontWeight: 700, color: '#9CA3AF', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${border}`, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <ItemRow key={item.id} item={item} onUpdate={onUpdateItem} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Modal vincular / crear obra ─────────────────────────────────────────────

function ModalVincularObra({ proy, projects, onCrearObra, onVincularObra, onClose }) {
  const [paso,   setPaso]   = useState('opciones')
  const [obraId, setObraId] = useState('')
  const [saving, setSaving] = useState(false)

  const obrasSinProyecto = (projects || []).filter(p => !p.proyectoArmarId || p.proyectoArmarId === proy.id)

  const handleCrearNueva = () => {
    onCrearObra({
      name:                proy.nombre              || '',
      location:            proy.direccion            || '',
      tipoObra:            proy.tipoObra             || '',
      responsible:         proy.responsableObra      || '',
      responsableProyecto: proy.responsableProyecto  || '',
      linkDocumentacion:   proy.linkDocumentacion    || '',
      proyectoArmarId:     proy.id,
    })
    onClose()
  }

  const handleVincular = async () => {
    const obra = obrasSinProyecto.find(o => String(o.id) === obraId)
    if (!obra) return
    setSaving(true)
    await onVincularObra(obra.id, proy.id)
    setSaving(false)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 310, padding: 16, backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ background: 'white', borderRadius: 14, maxWidth: 440, width: '100%', padding: '28px 24px', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: dark }}>Vincular con Obra</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#9CA3AF', padding: '2px 8px' }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: mid, marginBottom: 20, lineHeight: 1.5 }}>
          El proyecto <strong style={{ color: dark }}>{proy.nombre}</strong> completó todas sus etapas.
        </p>

        {paso === 'opciones' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button onClick={handleCrearNueva}
              style={{ display: 'block', width: '100%', padding: '14px 16px', borderRadius: 9, border: `1.5px solid ${border}`, background: 'white', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = orange; e.currentTarget.style.background = '#FFF8F5' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.background = 'white' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: dark, marginBottom: 3 }}>Crear obra nueva</div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>Se abre el formulario con los datos del proyecto pre-completados</div>
            </button>
            <button onClick={() => setPaso('vincular')}
              style={{ display: 'block', width: '100%', padding: '14px 16px', borderRadius: 9, border: `1.5px solid ${border}`, background: 'white', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = blue; e.currentTarget.style.background = blueLight }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.background = 'white' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: dark, marginBottom: 3 }}>Vincular obra existente</div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>Asociar a una obra ya cargada en el sistema</div>
            </button>
          </div>
        )}

        {paso === 'vincular' && (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Seleccionar obra</label>
              {obrasSinProyecto.length === 0 ? (
                <p style={{ fontSize: 13, color: '#9CA3AF', padding: '8px 0' }}>No hay obras sin proyecto vinculado.</p>
              ) : (
                <select value={obraId} onChange={e => setObraId(e.target.value)}
                  style={inputStyle} {...focusOrange}>
                  <option value="">Seleccionar obra…</option>
                  {obrasSinProyecto.map(o => (
                    <option key={o.id} value={String(o.id)}>{o.name}{o.location ? ` — ${o.location}` : ''}</option>
                  ))}
                </select>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setPaso('opciones')}
                style={{ padding: '9px 18px', borderRadius: 8, border: `1px solid ${border}`, background: 'white', color: mid, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Volver
              </button>
              <button onClick={handleVincular} disabled={!obraId || saving}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: green, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', opacity: (!obraId || saving) ? 0.6 : 1 }}>
                {saving ? 'Vinculando…' : 'Confirmar vínculo'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Card de proyecto ─────────────────────────────────────────────────────────

// ─── Tabla de documentación ───────────────────────────────────────────────────

const REVISION_OPTIONS = ['', 'R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10']
const REVISION_COLORS  = { R1: '#2563EB', R2: '#7C3AED', R3: '#D97706', R4: '#DC2626', R5: '#059669', R6: '#0891B2', R7: '#9333EA', R8: '#B45309', R9: '#BE123C', R10: '#1E40AF' }

function isRubroHeader(headers, row) {
  // Fila de título de rubro: ESCALA vacía y columna A es número entero o vacío con texto en B en mayúsculas
  const escalaIdx = headers.findIndex(h => /escala/i.test(h))
  const escalaVacia = escalaIdx < 0 || !String(row[escalaIdx] ?? '').trim()
  const colA = String(row[0] ?? '').trim()
  const esEntero = /^\d+$/.test(colA) || colA === ''
  return escalaVacia && esEntero
}

function isRevisionCol(header) {
  // Solo "NR. REVISIÓN" o "REVISIÓN" puros — excluye "FECHA REVISIÓN", "CAMBIO CONTRA..."
  return /^(nr\.?\s*)?revisi[oó]n$/i.test(header.trim())
}
function isFechaCol(header) {
  return /fecha/i.test(header)
}

function excelSerialToDate(v) {
  if (v instanceof Date) return v
  const n = Number(v)
  if (!isNaN(n) && n > 40000 && n < 60000) {
    return new Date(Math.round((n - 25569) * 86400 * 1000))
  }
  return null
}

function formatDate(v) {
  const d = excelSerialToDate(v)
  if (!d) return String(v ?? '')
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = d.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function getDocName(headers, row, ri) {
  // Busca columna "DOCUMENTO", "NOMBRE PLANO", o la primera columna no-vacía
  const docIdx = headers.findIndex(h => /documento|nombre\s*plano|plano/i.test(h))
  const fallbackIdx = headers.findIndex((_, i) => row[i] && String(row[i]).trim())
  const idx = docIdx >= 0 ? docIdx : fallbackIdx >= 0 ? fallbackIdx : 0
  return String(row[idx] ?? '').trim() || `Fila ${ri + 1}`
}

function buildChangelog(prevHeaders, prevRows, nextHeaders, nextRows) {
  const changes = []
  nextRows.forEach((row, ri) => {
    const prev = prevRows[ri]
    const doc  = getDocName(nextHeaders, row, ri)
    if (!prev) { changes.push({ doc, tipo: 'nueva_fila' }); return }
    row.forEach((cell, ci) => {
      if (String(cell) !== String(prev[ci] ?? '')) {
        changes.push({
          doc,
          col:    nextHeaders[ci] || `Columna ${ci + 1}`,
          antes:  String(prev[ci] ?? ''),
          despues: String(cell),
        })
      }
    })
  })
  if (prevRows.length > nextRows.length) {
    for (let ri = nextRows.length; ri < prevRows.length; ri++) {
      const doc = getDocName(prevHeaders, prevRows[ri], ri)
      changes.push({ doc, tipo: 'fila_eliminada' })
    }
  }
  return changes
}

function formatChangelogText(changes, proyNombre) {
  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const lines = [`*Actualización de documentación — ${proyNombre}*`, `_${fecha}_`, '']
  changes.forEach(c => {
    if (c.tipo === 'nueva_fila')        lines.push(`➕ *Nuevo documento:* ${c.doc}`)
    else if (c.tipo === 'fila_eliminada') lines.push(`❌ *Eliminado:* ${c.doc}`)
    else lines.push(`📄 *${c.doc}*\n   ${c.col}: ${c.antes || '(vacío)'} → *${c.despues || '(vacío)'}*`)
  })
  return lines.join('\n')
}

function ModalChangelog({ changes, proyNombre, onClose }) {
  const texto = formatChangelogText(changes, proyNombre)
  const handleWA = () => {
    window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank')
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 14, maxWidth: 480, width: '100%', padding: '24px', boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: dark }}>Informe de cambios</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: mid }}>×</button>
        </div>
        {changes.length === 0 ? (
          <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '16px 0' }}>Sin cambios detectados.</p>
        ) : (
          <>
            <div style={{ background: '#F9FAFB', border: `1px solid ${border}`, borderRadius: 8, padding: '12px 14px', marginBottom: 16, maxHeight: 280, overflowY: 'auto' }}>
              {changes.map((c, i) => (
                <div key={i} style={{ fontSize: 12, color: dark, lineHeight: 1.7, borderBottom: i < changes.length - 1 ? `1px solid ${border}` : 'none', padding: '4px 0' }}>
                  {c.tipo === 'nueva_fila'       && <span><span style={{ color: green, fontWeight: 700 }}>➕ Nuevo:</span> {c.doc}</span>}
                  {c.tipo === 'fila_eliminada'   && <span><span style={{ color: red, fontWeight: 700 }}>❌ Eliminado:</span> {c.doc}</span>}
                  {!c.tipo && <span><span style={{ color: orange, fontWeight: 700 }}>📝 {c.doc}</span> · <span style={{ color: mid }}>{c.col}:</span> <span style={{ color: red }}>{c.antes || '—'}</span> → <span style={{ color: green }}>{c.despues || '—'}</span></span>}
                </div>
              ))}
            </div>
            <button onClick={handleWA}
              style={{ width: '100%', padding: '11px 0', borderRadius: 9, border: 'none', background: '#25D366', color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              📲 Enviar por WhatsApp
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function TablaDocumentacion({ docData, isEditor, onSave, proyNombre }) {
  const [headers,   setHeaders]   = useState(docData?.headers || [])
  const [rows,      setRows]      = useState(docData?.rows    || [])
  const [saving,    setSaving]    = useState(false)
  const [dirty,     setDirty]     = useState(false)
  const [changelog, setChangelog] = useState(null)
  const [exportando, setExportando] = useState(false)
  const prevRef = useRef({ headers: docData?.headers || [], rows: docData?.rows || [] })
  const fileRef = useRef()

  const exportarPDF = async () => {
    if (!headers.length) return
    setExportando(true)
    try {
      const { jsPDF } = await import('jspdf')

      // A3 landscape: 420×297mm
      const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' })
      const PW = 420, PH = 297, MG = 10
      const usableW = PW - MG * 2

      // Anchos de columna proporcionales al contenido
      const MIN_W = 18, MAX_W = 80
      const rawW = headers.map(h => {
        if (isRevisionCol(h)) return 20
        if (isFechaCol(h))    return 26
        if (/obs|cambio|nota/i.test(h)) return MAX_W
        if (/nombre|modelo|descripci/i.test(h)) return 55
        return 30
      })
      const rawTotal = rawW.reduce((s, w) => s + w, 0)
      const scale = usableW / Math.max(rawTotal, usableW)
      const colW = rawW.map(w => Math.min(MAX_W, Math.max(MIN_W, w * scale)))
      // Redistribuir si excede usableW
      const totalW = colW.reduce((s, w) => s + w, 0)
      const adjW = colW.map(w => w * usableW / totalW)

      const ROW_H  = 6.5
      const HDR_H  = 7
      const THDR_H = 6
      const fecha  = new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' })

      let pageNum = 1
      const drawPageHeader = () => {
        doc.setFillColor(26, 26, 46)
        doc.rect(MG, MG, usableW, 12, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255,255,255)
        doc.text('LISTADO DE DOCUMENTACIÓN', PW / 2, MG + 7.5, { align: 'center' })
        doc.setFontSize(8); doc.setFont('helvetica', 'normal')
        doc.text(proyNombre || '', MG + 3, MG + 4.5)
        doc.text(fecha, PW - MG - 3, MG + 4.5, { align: 'right' })
        doc.text(`Página ${pageNum}`, PW - MG - 3, MG + 10, { align: 'right' })
        doc.setTextColor(0,0,0)
        pageNum++
      }

      const drawTableHeader = (y) => {
        doc.setFillColor(243, 244, 246)
        doc.rect(MG, y, usableW, THDR_H, 'F')
        doc.setDrawColor(200,200,200); doc.setLineWidth(0.2)
        doc.line(MG, y + THDR_H, MG + usableW, y + THDR_H)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(5.5); doc.setTextColor(30,30,30)
        let x = MG
        headers.forEach((h, ci) => {
          const w = adjW[ci]
          const label = doc.splitTextToSize(h, w - 2)[0]
          doc.text(label, x + 1.5, y + THDR_H - 1.5)
          x += w
        })
      }

      drawPageHeader()
      let y = MG + 13
      drawTableHeader(y)
      y += THDR_H

      rows.forEach((row, ri) => {
        const isHdr = isRubroHeader(headers, row)
        const rowH  = isHdr ? HDR_H : ROW_H

        if (y + rowH > PH - MG) {
          doc.addPage([420, 297], 'landscape')
          drawPageHeader()
          y = MG + 13
          drawTableHeader(y)
          y += THDR_H
        }

        // Fondo
        if (isHdr) {
          doc.setFillColor(45, 45, 78); doc.rect(MG, y, usableW, rowH, 'F')
        } else if (ri % 2 === 0) {
          doc.setFillColor(250, 250, 249); doc.rect(MG, y, usableW, rowH, 'F')
        }

        doc.setDrawColor(220,220,220); doc.setLineWidth(0.15)
        doc.line(MG, y + rowH, MG + usableW, y + rowH)

        let x = MG
        headers.forEach((h, ci) => {
          const w   = adjW[ci]
          const val = String(row[ci] ?? '')
          const isRev = isRevisionCol(h)

          doc.setFont('helvetica', isHdr ? 'bold' : 'normal')
          doc.setFontSize(isHdr ? 7 : 6.5)

          if (isHdr) {
            doc.setTextColor(255,255,255)
            const parts = doc.splitTextToSize(val, w - 2)
            doc.text(parts[0] || '', x + 1.5, y + rowH / 2 + 2)
            doc.setTextColor(30,30,30)
            x += w; return
          }

          if (isRev && val) {
            // Chip de revisión
            const [r,g,b] = { R1:[37,99,235], R2:[124,58,237], R3:[217,119,6], R4:[220,38,38], R5:[5,150,105], R6:[8,145,178], R7:[147,51,234], R8:[180,83,9], R9:[190,18,60], R10:[30,64,175] }[val] || [100,100,100]
            doc.setFillColor(r,g,b,0.12)
            const chipW = Math.min(w-3, 14), chipH = 4, chipX = x + (w - chipW) / 2, chipY = y + (rowH - chipH) / 2
            doc.roundedRect(chipX, chipY, chipW, chipH, 1, 1, 'F')
            doc.setTextColor(r,g,b); doc.setFont('helvetica','bold'); doc.setFontSize(6)
            doc.text(val, x + w/2, y + rowH/2 + 1.5, { align:'center' })
            doc.setTextColor(30,30,30)
            x += w; return
          }

          doc.setTextColor(30,30,30)
          const parts = doc.splitTextToSize(val, w - 2)
          const show  = parts.slice(0,2)
          const lh    = 6.5 * 0.352 + 0.7
          const ty    = y + (rowH - show.length * lh) / 2 + lh * 0.75
          show.forEach((l, i) => doc.text(l, x + 1.5, ty + i * lh))
          x += w
        })

        y += rowH
      })

      doc.save(`Documentacion_${(proyNombre||'proyecto').replace(/[^\w\s]/g,'').trim()}.pdf`)
    } catch(e) { console.error(e) }
    finally { setExportando(false) }
  }

  const save = useCallback(async (h, r) => {
    const changes = buildChangelog(prevRef.current.headers, prevRef.current.rows, h, r)
    setSaving(true)
    await onSave({ headers: h, rows: r })
    setSaving(false)
    setDirty(false)
    prevRef.current = { headers: h, rows: r }
    setChangelog(changes)
  }, [onSave])

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const { read, utils } = await import('xlsx')
    const buf  = await file.arrayBuffer()
    const wb   = read(buf, { cellDates: true })
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const data = utils.sheet_to_json(ws, { header: 1, defval: '', raw: true })
    if (!data.length) return
    const h = (data[0] || []).map(v => String(v ?? '').trim())
    const r = data.slice(1)
      .filter(row => row.some(v => v !== '' && v !== null && v !== undefined))
      .map(row =>
      h.map((_, i) => {
        const v = row[i]
        if (v instanceof Date) return formatDate(v)
        if (isFechaCol(h[i])) return formatDate(v)
        return String(v ?? '')
      })
    )
    setHeaders(h)
    setRows(r)
    setDirty(true)
    e.target.value = ''
  }

  const updateCell = (ri, ci, val) => {
    setRows(prev => prev.map((row, i) => i === ri ? row.map((c, j) => j === ci ? val : c) : row))
    setDirty(true)
  }

  const updateHeader = (ci, val) => {
    setHeaders(prev => prev.map((h, i) => i === ci ? val : h))
    setDirty(true)
  }

  const addRow  = () => { setRows(prev => [...prev, headers.map(() => '')]); setDirty(true) }
  const deleteRow = (ri) => { setRows(prev => prev.filter((_, i) => i !== ri)); setDirty(true) }
  const addCol  = () => { const label = `Columna ${headers.length + 1}`; setHeaders(prev => [...prev, label]); setRows(prev => prev.map(r => [...r, ''])); setDirty(true) }
  const deleteCol = (ci) => { setHeaders(prev => prev.filter((_, i) => i !== ci)); setRows(prev => prev.map(r => r.filter((_, i) => i !== ci))); setDirty(true) }

  const isEmpty = !headers.length

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {isEditor && (
          <>
            <button
              onClick={() => fileRef.current?.click()}
              style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${border}`, background: 'white', color: blue, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              onMouseEnter={e => { e.currentTarget.style.background = blueLight }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white' }}>
              ↑ Importar Excel
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={handleFile} />
            {!isEmpty && (
              <>
                <button onClick={addRow}
                  style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${border}`, background: 'white', color: mid, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  + Fila
                </button>
                <button onClick={addCol}
                  style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${border}`, background: 'white', color: mid, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  + Columna
                </button>
                <button onClick={() => { if (window.confirm('¿Eliminar el listado completo?')) { setHeaders([]); setRows([]); setDirty(true) } }}
                  style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid #FCA5A5`, background: 'white', color: red, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🗑 Eliminar listado
                </button>
              </>
            )}
            {dirty && (
              <button onClick={() => save(headers, rows)}
                disabled={saving}
                style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: green, color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando…' : '✓ Guardar cambios'}
              </button>
            )}
          </>
        )}
        {!dirty && !isEmpty && (
          <button onClick={() => setChangelog(buildChangelog([], [], headers, rows))}
            style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${border}`, background: 'white', color: mid, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            Ver último informe
          </button>
        )}
        {!isEmpty && (
          <button onClick={exportarPDF} disabled={exportando}
            style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${border}`, background: 'white', color: dark, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: exportando ? 0.7 : 1 }}>
            {exportando ? 'Generando PDF…' : '↓ Exportar PDF'}
          </button>
        )}
      </div>

      {/* Tabla */}
      {isEmpty ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
          {isEditor ? 'Importá un Excel para cargar la tabla de documentación.' : 'Sin documentación cargada.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#F3F4F6' }}>
                {headers.map((h, ci) => (
                  <th key={ci} style={{ padding: '7px 10px', borderBottom: `1px solid ${border}`, borderRight: ci < headers.length - 1 ? `1px solid ${border}` : 'none', fontWeight: 700, color: dark, whiteSpace: 'nowrap', position: 'relative', minWidth: isRevisionCol(h) ? 90 : 100 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {isEditor ? (
                        <input value={h} onChange={e => updateHeader(ci, e.target.value)}
                          style={{ flex: 1, border: 'none', background: 'transparent', fontWeight: 700, fontSize: 12, color: dark, fontFamily: 'inherit', outline: 'none', minWidth: 60 }} />
                      ) : (
                        <span style={{ flex: 1 }}>{h}</span>
                      )}
                      {isEditor && (
                        <button onClick={() => deleteCol(ci)}
                          style={{ flexShrink: 0, border: 'none', background: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 11, padding: '0 2px', lineHeight: 1 }}
                          title="Eliminar columna">×</button>
                      )}
                    </div>
                  </th>
                ))}
                {isEditor && <th style={{ width: 32, borderBottom: `1px solid ${border}` }} />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                const isHeader = isRubroHeader(headers, row)
                return (
                <tr key={ri}
                  style={{ borderBottom: `1px solid ${border}`, background: isHeader ? '#2D2D2D' : 'white' }}
                  onMouseEnter={e => { e.currentTarget.style.background = isHeader ? '#3A3A3A' : '#FAFAF9' }}
                  onMouseLeave={e => { e.currentTarget.style.background = isHeader ? '#2D2D2D' : 'white' }}>
                  {row.map((cell, ci) => {
                    const h = headers[ci] || ''
                    const isRev = isRevisionCol(h)
                    const cellColor = isHeader ? 'white' : dark
                    const cellFontWeight = isHeader ? 700 : 400
                    return (
                      <td key={ci} style={{ padding: isHeader ? '6px 8px' : '4px 8px', borderRight: ci < row.length - 1 ? `1px solid ${isHeader ? '#444' : border}` : 'none', verticalAlign: 'middle' }}>
                        {isRev && !isHeader ? (
                          isEditor ? (
                            <select value={cell} onChange={e => updateCell(ri, ci, e.target.value)}
                              style={{ border: 'none', borderRadius: 99, padding: '2px 8px', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', outline: 'none',
                                background: cell ? (REVISION_COLORS[cell] + '1A') : '#F3F4F6',
                                color: REVISION_COLORS[cell] || mid }}>
                              {REVISION_OPTIONS.map(o => <option key={o} value={o}>{o || '—'}</option>)}
                            </select>
                          ) : (
                            cell ? (
                              <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: (REVISION_COLORS[cell] || mid) + '1A', color: REVISION_COLORS[cell] || mid }}>
                                {cell}
                              </span>
                            ) : <span style={{ color: '#D1D5DB' }}>—</span>
                          )
                        ) : (
                          isEditor ? (
                            <input value={cell} onChange={e => updateCell(ri, ci, e.target.value)}
                              style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 12, color: cellColor, fontWeight: cellFontWeight, fontFamily: 'inherit', outline: 'none' }} />
                          ) : (
                            <span style={{ color: cellColor, fontWeight: cellFontWeight }}>{cell}</span>
                          )
                        )}
                      </td>
                    )
                  })}
                  {isEditor && (
                    <td style={{ textAlign: 'center', padding: '4px' }}>
                      <button onClick={() => deleteRow(ri)}
                        style={{ border: 'none', background: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1 }}
                        title="Eliminar fila">🗑</button>
                    </td>
                  )}
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal informe de cambios */}
      {changelog !== null && (
        <ModalChangelog
          changes={changelog}
          proyNombre={proyNombre}
          onClose={() => setChangelog(null)}
        />
      )}
    </div>
  )
}

// ─── Listado de compras ───────────────────────────────────────────────────────

const COMPRAS_COLS = [
  { key: 'item',            label: 'Item',              w: 50,  type: 'text' },
  { key: 'foto',            label: 'Foto',              w: 80,  type: 'imagen' },
  { key: 'ubicacion',       label: 'Ubicación',         w: 130, type: 'text' },
  { key: 'categoria',       label: 'Categoría',         w: 120, type: 'text' },
  { key: 'marca',           label: 'Marca',             w: 90,  type: 'text' },
  { key: 'modelo',          label: 'Modelo',            w: 160, type: 'text' },
  { key: 'unidad',          label: 'Un.',               w: 45,  type: 'text' },
  { key: 'cant',            label: 'Cant.',             w: 55,  type: 'number' },
  { key: 'cajasUn',         label: 'Cajas/Un.',         w: 70,  type: 'number' },
  { key: 'definido',        label: 'Definido',          w: 65,  type: 'check' },
  { key: 'fechaDefinicion', label: 'F. definición',     w: 100, type: 'date' },
  { key: 'comprado',        label: 'Comprado',          w: 70,  type: 'check' },
  { key: 'fechaEntrega',    label: 'F. entrega',        w: 90,  type: 'date' },
  { key: 'fechaLimite',     label: 'Fecha Ingreso a Obra', w: 110, type: 'date', limite: true },
  { key: 'link',            label: 'Link',              w: 55,  type: 'link' },
  { key: 'precioUn',        label: '$un.',              w: 80,  type: 'precio' },
  { key: 'precioTot',       label: '$tot',              w: 90,  type: 'calc' },
  { key: 'observaciones',   label: 'Observaciones',     w: 150, type: 'text' },
]

function newComprasRow() {
  return { item:'', foto:'', ubicacion:'', categoria:'', marca:'', modelo:'', unidad:'', cant:'', cajasUn:'', definido:false, fechaDefinicion:'', comprado:false, fechaEntrega:'', fechaLimite:'', link:'', precioUn:'', observaciones:'', _bold: false, _underline: false }
}

function isComprasHeader(row) {
  const item = String(row.item ?? '').trim()
  return /^\d+$/.test(item) && !row.marca && !row.modelo && !row.cant
}

function stripHtml(str) {
  return String(str || '').replace(/<[^>]*>/g, '')
}

// Parsea HTML con <b>/<strong>/<u> y devuelve segmentos { text, bold, underline }
function parseHtmlSegments(html) {
  const el = document.createElement('div')
  el.innerHTML = String(html || '')
  const segs = []
  function walk(node, bold, underline) {
    if (node.nodeType === 3) {
      if (node.textContent) segs.push({ text: node.textContent, bold, underline })
    } else if (node.nodeType === 1) {
      const t = node.tagName.toLowerCase()
      const st = node.style || {}
      const fw = st.fontWeight || ''
      const td = st.textDecoration || ''
      const isBold = bold || t === 'b' || t === 'strong' || fw === 'bold' || fw === '700' || fw === '800'
      const isUnderline = underline || t === 'u' || td === 'underline' || td.includes('underline')
      node.childNodes.forEach(c => walk(c, isBold, isUnderline))
    }
  }
  walk(el, false, false)
  return segs
}

// Renderiza texto enriquecido en jsPDF con word-wrap y respetando negrita/subrayado
function renderRichText(doc, html, colX, cellY, cellH, maxW, align, fontSize = 6.5) {
  const segs = parseHtmlSegments(html)
  if (!segs.length) return
  doc.setFontSize(fontSize)

  // Dividir segmentos en tokens (palabras + espacios), preservando formato
  const tokens = []
  segs.forEach(seg => {
    seg.text.split(/(\s+)/).forEach(part => {
      if (part) tokens.push({ text: part, bold: seg.bold, underline: seg.underline })
    })
  })

  // Construir líneas con word-wrap
  const lines = [] // cada línea: array de tokens
  let line = [], lineW = 0
  tokens.forEach(tok => {
    doc.setFont('helvetica', tok.bold ? 'bold' : 'normal')
    const tw = doc.getTextWidth(tok.text)
    if (lineW + tw > maxW && line.length && tok.text.trim()) {
      lines.push(line); line = [tok]; lineW = tw
    } else {
      line.push(tok); lineW += tw
    }
  })
  if (line.length) lines.push(line)

  const show  = lines.slice(0, 2) // máximo 2 líneas como antes
  const lineH = fontSize * 0.352 + 0.7
  const blockH = show.length * lineH
  const startY = cellY + (cellH - blockH) / 2 + lineH * 0.75

  // Función para medir el ancho total de una línea
  const lineWidth = (ln) => ln.reduce((acc, tok) => {
    doc.setFont('helvetica', tok.bold ? 'bold' : 'normal')
    return acc + doc.getTextWidth(tok.text)
  }, 0)

  show.forEach((ln, li) => {
    const ty = startY + li * lineH
    let startX
    if (align === 'right')       startX = colX - lineWidth(ln)
    else if (align === 'center') startX = colX - lineWidth(ln) / 2
    else                         startX = colX

    let cx = startX
    ln.forEach(tok => {
      doc.setFont('helvetica', tok.bold ? 'bold' : 'normal')
      doc.text(tok.text, cx, ty)
      if (tok.underline) {
        const tw = doc.getTextWidth(tok.text)
        doc.setLineWidth(0.2)
        doc.line(cx, ty + 0.8, cx + tw, ty + 0.8)
      }
      cx += doc.getTextWidth(tok.text)
    })
  })
  doc.setFont('helvetica', 'normal')
}

function calcTot(row) {
  const p = parseFloat(String(row.precioUn).replace(/\./g,'').replace(',','.')) || 0
  const q = parseFloat(String(row.cajasUn).replace(',','.')) || 0
  if (!p || !q) return ''
  return '$' + Math.round(p * q).toLocaleString('es-AR')
}

const ALL_PDF_COLS = [
  { key: 'item',            label: 'Item',             w: 12, align: 'left',   fixed: true },
  { key: 'foto',            label: 'Foto',             w: 24, align: 'center', type: 'imagen' },
  { key: 'ubicacion',       label: 'Ubicación',        w: 36, align: 'left' },
  { key: 'categoria',       label: 'Categoría',        w: 28, align: 'left' },
  { key: 'marca',           label: 'Marca',            w: 20, align: 'left' },
  { key: 'modelo',          label: 'Modelo',           w: 52, align: 'left' },
  { key: 'unidad',          label: 'Un.',              w: 10, align: 'center' },
  { key: 'cant',            label: 'Cant.',            w: 13, align: 'right' },
  { key: 'cajasUn',         label: 'Cajas/Un.',        w: 16, align: 'right' },
  { key: 'definido',        label: 'Definido',         w: 15, align: 'center', type: 'check' },
  { key: 'fechaDefinicion', label: 'F. definición',    w: 22, align: 'center', type: 'date' },
  { key: 'comprado',        label: 'Comprado',         w: 17, align: 'center', type: 'check' },
  { key: 'fechaEntrega',    label: 'F. entrega',       w: 22, align: 'center', type: 'date' },
  { key: 'fechaLimite',     label: 'Ingreso a Obra',   w: 25, align: 'center', type: 'date' },
  { key: 'link',            label: 'Link',             w: 12, align: 'center', type: 'link' },
  { key: 'precioUn',        label: '$un.',             w: 22, align: 'right' },
  { key: 'precioTot',       label: '$tot',             w: 22, align: 'right',  type: 'calc' },
  { key: 'observaciones',   label: 'Obs.',             w: 29, align: 'left' },
]

async function fetchImageBase64(url) {
  return new Promise(res => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width  = img.naturalWidth
        canvas.height = img.naturalHeight
        canvas.getContext('2d').drawImage(img, 0, 0)
        res(canvas.toDataURL('image/jpeg', 0.85))
      } catch { res(null) }
    }
    img.onerror = () => res(null)
    img.src = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now()
  })
}

function TablaCompras({ comprasData, isEditor, proyId, proyNombre, onSave }) {
  const [rows,        setRows]        = useState(comprasData?.rows || [])
  const [saving,      setSaving]      = useState(false)
  const [dirty,       setDirty]       = useState(false)
  const [uploading,   setUploading]   = useState({})
  const [editMode,    setEditMode]    = useState(false)
  const [fotoModal,   setFotoModal]   = useState(null)
  const [exportando,           setExportando]           = useState(false)
  const [exportandoRellenable, setExportandoRellenable] = useState(false)
  const [exportSelector,       setExportSelector]       = useState(false)
  const [selectedPdfCols,      setSelectedPdfCols]      = useState(() => new Set(ALL_PDF_COLS.map(c => c.key)))
  const [colWidths, setColWidths] = useState(() => Object.fromEntries(COMPRAS_COLS.map(c => [c.key, c.w])))
  const [confirmDelete, setConfirmDelete] = useState(null)
  const fileRefs = useRef({})
  const editing = isEditor && editMode

  const startColResize = (e, key) => {
    e.preventDefault()
    const startX = e.clientX, startW = colWidths[key]
    const onMove = ev => setColWidths(prev => ({ ...prev, [key]: Math.max(30, startW + ev.clientX - startX) }))
    const onUp = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const exportarPDF = async (colsSet) => {
    setExportando(true)
    setExportSelector(false)
    try {
      const { jsPDF } = await import('jspdf')
      const PDF_COLS = ALL_PDF_COLS.filter(c => colsSet.has(c.key))

      // Pre-fetch imágenes con dimensiones naturales
      const imgCache = {}
      for (const row of rows) {
        if (row.foto && !imgCache[row.foto] && colsSet.has('foto')) {
          const b64 = await fetchImageBase64(row.foto)
          if (b64) {
            const size = await new Promise(res => {
              const tmp = new Image()
              tmp.onload = () => res({ natW: tmp.naturalWidth, natH: tmp.naturalHeight })
              tmp.onerror = () => res({ natW: 1, natH: 1 })
              tmp.src = b64
            })
            imgCache[row.foto] = { b64, natW: size.natW, natH: size.natH }
          }
        }
      }

      // A3 landscape: 420 × 297 mm
      const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' })
      const PW   = 420, PH = 297, MG = 10
      const usableW = PW - MG * 2
      const totalColW = PDF_COLS.reduce((s, c) => s + c.w, 0)
      const scale = usableW / totalColW

      const colW = PDF_COLS.map(c => c.w * scale)
      const ROW_H   = 22   // datos
      const HDR_H   = 9    // encabezado de sección
      const THDR_H  = 8    // header de tabla
      const FONT_SZ = 8    // tamaño de texto en celdas
      const PAGE_H  = PH - MG * 2

      const fecha = new Date().toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' })

      let pageNum = 1
      const drawPageHeader = () => {
        // Fondo oscuro header
        doc.setFillColor(26, 26, 46)
        doc.rect(MG, MG, usableW, 12, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255,255,255)
        doc.text('LISTADO DE COMPRAS CLIENTES', PW / 2, MG + 7.5, { align: 'center' })
        doc.setFontSize(8); doc.setFont('helvetica', 'normal')
        doc.text(proyNombre || '', MG + 3, MG + 4.5)
        doc.text(fecha, PW - MG - 3, MG + 4.5, { align: 'right' })
        doc.text(`Página ${pageNum}`, PW - MG - 3, MG + 10, { align: 'right' })
        doc.setTextColor(0,0,0)
        pageNum++
      }

      const drawTableHeader = (y) => {
        doc.setFillColor(243, 244, 246)
        doc.rect(MG, y, usableW, THDR_H, 'F')
        doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2)
        doc.line(MG, y + THDR_H, MG + usableW, y + THDR_H)
        doc.setFont('helvetica', 'bold'); doc.setFontSize(FONT_SZ - 1); doc.setTextColor(30,30,30)
        let x = MG
        PDF_COLS.forEach((col, ci) => {
          const w = colW[ci]
          if (col.align === 'right') doc.text(col.label, x + w - 1.5, y + THDR_H - 2, { align: 'right' })
          else if (col.align === 'center') doc.text(col.label, x + w / 2, y + THDR_H - 2, { align: 'center' })
          else doc.text(col.label, x + 1.5, y + THDR_H - 2)
          x += w
        })
      }

      drawPageHeader()
      let y = MG + 13
      drawTableHeader(y)
      y += THDR_H

      for (let ri = 0; ri < rows.length; ri++) {
        const row = rows[ri]
        const isHdr = isComprasHeader(row)
        const rowH  = isHdr ? HDR_H : ROW_H

        // Nueva página si no cabe
        if (y + rowH > MG + PAGE_H) {
          doc.addPage([420, 297], 'landscape')
          drawPageHeader()
          y = MG + 13
          drawTableHeader(y)
          y += THDR_H
        }

        // Fondo fila
        if (isHdr) {
          doc.setFillColor(45, 45, 78)
          doc.rect(MG, y, usableW, rowH, 'F')
        } else if (row.comprado) {
          doc.setFillColor(240, 253, 244)
          doc.rect(MG, y, usableW, rowH, 'F')
        } else if (ri % 2 === 0) {
          doc.setFillColor(250, 250, 249)
          doc.rect(MG, y, usableW, rowH, 'F')
        }

        // Línea separadora
        doc.setDrawColor(220, 220, 220); doc.setLineWidth(0.15)
        doc.line(MG, y + rowH, MG + usableW, y + rowH)

        // Celdas
        let x = MG
        PDF_COLS.forEach((col, ci) => {
          const w = colW[ci]
          const raw = row[col.key] ?? ''

          if (isHdr) {
            if (col.key === 'item' || col.key === 'categoria') {
              doc.setFont('helvetica', 'bold'); doc.setFontSize(FONT_SZ + 0.5); doc.setTextColor(255,255,255)
              const txt = col.key === 'item' ? String(raw) : String(raw)
              if (col.align === 'left') doc.text(txt, x + 1.5, y + rowH / 2 + 2.5)
              x += w; return
            }
            x += w; return
          }

          doc.setFont('helvetica', 'normal'); doc.setFontSize(FONT_SZ); doc.setTextColor(30,30,30)

          if (col.type === 'imagen') {
            const cached = imgCache[raw]
            if (cached) {
              const { b64, natW, natH } = cached
              const maxW = w - 4, maxH = rowH - 4
              const ratio = natW / natH
              let imgW, imgH
              if (ratio > maxW / maxH) { imgW = maxW; imgH = maxW / ratio }
              else                      { imgH = maxH; imgW = maxH * ratio }
              const imgX = x + (w - imgW) / 2
              const imgY = y + (rowH - imgH) / 2
              try { doc.addImage(b64, imgX, imgY, imgW, imgH, undefined, 'FAST') } catch {}
            }
            x += w; return
          }

          const midY = y + rowH / 2 + FONT_SZ * 0.18

          if (col.type === 'check') {
            const tick = raw ? '✓' : '—'
            doc.setTextColor(raw ? 45 : 180, raw ? 122 : 180, raw ? 79 : 180)
            doc.setFont('helvetica', raw ? 'bold' : 'normal')
            doc.text(tick, x + w / 2, midY, { align: 'center' })
            doc.setTextColor(30,30,30)
            x += w; return
          }

          if (col.type === 'link') {
            if (raw) {
              doc.setTextColor(37, 99, 235); doc.setFont('helvetica', 'bold')
              doc.text('LINK', x + w / 2, midY, { align: 'center' })
              doc.link(x, y, w, rowH, { url: raw })
              doc.setTextColor(30,30,30)
            }
            x += w; return
          }

          if (col.type === 'calc') {
            const tot = calcTot(row)
            if (tot) {
              doc.setFont('helvetica', 'bold')
              doc.text(tot, x + w - 1.5, midY, { align: 'right' })
            }
            x += w; return
          }

          if (col.type === 'date') {
            const display = raw
              ? new Date(raw + 'T00:00:00').toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
              : 'DD/MM/AAAA'
            const isLimite = col.key === 'fechaLimite'
            doc.setFont('helvetica', isLimite ? 'bold' : 'normal')
            doc.setTextColor(raw ? 30 : 180, 30, raw ? 30 : 180)
            doc.text(display, x + w / 2, midY, { align: 'center' })
            doc.setFont('helvetica', 'normal')
            doc.setTextColor(30, 30, 30)
            x += w; return
          }

          if (col.key === 'precioUn') {
            const p = parseFloat(String(raw).replace(/\./g,'').replace(',','.')) || 0
            if (p) {
              doc.setFont('helvetica', 'normal')
              doc.text('$ ' + Math.round(p).toLocaleString('es-AR'), x + w - 1.5, midY, { align: 'right' })
            }
            x += w; return
          }

          // Texto enriquecido (respeta negrita, subrayado y word-wrap)
          if (!stripHtml(raw)) { x += w; return }
          if (col.align === 'right') {
            renderRichText(doc, raw, x + w - 1.5, y, rowH, w - 3, 'right', FONT_SZ)
          } else if (col.align === 'center') {
            renderRichText(doc, raw, x + w / 2, y, rowH, w - 3, 'center', FONT_SZ)
          } else {
            renderRichText(doc, raw, x + 1.5, y, rowH, w - 3, 'left', FONT_SZ)
          }
          x += w
        })

        y += rowH
      }

      doc.save(`Compras_${(proyNombre || 'proyecto').replace(/[^\w\s]/g,'').trim()}.pdf`)
    } catch(e) { console.error(e) }
    finally { setExportando(false) }
  }

  const exportarPDFRellenable = async () => {
    setExportandoRellenable(true)
    try {
      const { PDFDocument, rgb, StandardFonts } = await import('pdf-lib')

      const safe = (str) => String(str || '').replace(/[^\x20-\xFF]/g, '').trim()

      const pdfDoc = await PDFDocument.create()
      const fontB  = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const fontR  = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const form   = pdfDoc.getForm()

      const PW = 1190, PH = 842, MG = 28
      const usableW = PW - MG * 2

      // ── Columnas del listado — todas las del web + OBS. CLIENTE fillable ────
      const COLS = [
        { key: 'item',            label: 'ITEM',          fr: 0.031 },
        { key: 'foto',            label: 'FOTO',          fr: 0.060, tipo: 'imagen' },
        { key: 'ubicacion',       label: 'UBICACION',     fr: 0.069 },
        { key: 'categoria',       label: 'CATEGORIA',     fr: 0.062 },
        { key: 'marca',           label: 'MARCA',         fr: 0.051 },
        { key: 'modelo',          label: 'MODELO',        fr: 0.086 },
        { key: 'unidad',          label: 'UN.',           fr: 0.025 },
        { key: 'cant',            label: 'CANT.',         fr: 0.028 },
        { key: 'cajasUn',         label: 'CAJ/UN',        fr: 0.034 },
        { key: 'definido',        label: 'DEFINIDO',      fr: 0.029, tipo: 'check' },
        { key: 'fechaDefinicion', label: 'F.DEF.',        fr: 0.046 },
        { key: 'comprado',        label: 'COMPRADO',      fr: 0.029, tipo: 'check' },
        { key: 'fechaEntrega',    label: 'F.ENTREGA',     fr: 0.046 },
        { key: 'fechaLimite',     label: 'ING.OBRA',      fr: 0.049 },
        { key: 'link',            label: 'LINK',          fr: 0.035 },
        { key: 'precioUn',        label: '$UN.',          fr: 0.046 },
        { key: 'precioTot',       label: '$TOT.',         fr: 0.046, tipo: 'calc' },
        { key: 'observaciones',   label: 'OBSERVACIONES', fr: 0.066 },
        { key: 'obs_cliente',     label: 'OBS. CLIENTE',  fr: 0.162, tipo: 'field' },
      ]
      const colW = COLS.map(c => Math.floor(usableW * c.fr))
      const totalW = colW.reduce((s, w) => s + w, 0)
      colW[colW.length - 1] += usableW - totalW

      const TITLE_H  = 36
      const META_H   = 22   // fila cliente/revisión/fecha
      const THDR_H   = 16
      const ROW_H    = 46
      const HDR_H    = 16

      // ── Página de instructivo ────────────────────────────────────────────────
      const instrPage = pdfDoc.addPage([PW, PH])

      // Cabecera azul oscuro
      instrPage.drawRectangle({ x: MG, y: PH - MG - 60, width: usableW, height: 60, color: rgb(0.08, 0.12, 0.28) })
      try { instrPage.drawText('ARMAR · LISTADO DE COMPRAS', { x: MG + 16, y: PH - MG - 28, size: 18, font: fontB, color: rgb(1,1,1) }) } catch {}
      try { instrPage.drawText('Revision del cliente', { x: MG + 16, y: PH - MG - 46, size: 10, font: fontR, color: rgb(0.7,0.8,1) }) } catch {}
      try { instrPage.drawText(safe(proyNombre), { x: PW - MG - fontB.widthOfTextAtSize(safe(proyNombre), 10) - 16, y: PH - MG - 40, size: 10, font: fontB, color: rgb(1,1,1) }) } catch {}

      const instrLines = [
        { text: 'INSTRUCCIONES PARA EL CLIENTE', bold: true, size: 11, gap: 24 },
        { text: '', gap: 4 },
        { text: 'Este documento ha sido preparado por el equipo ARMAR para su revision y aprobacion. Por favor:', bold: false, size: 9, gap: 14 },
        { text: '', gap: 6 },
        { text: '1.  APROBADO: marque el casillero si esta de acuerdo con el material/producto propuesto.', bold: false, size: 9, gap: 12 },
        { text: '2.  OBS. CLIENTE: escriba cualquier comentario, consulta o modificacion que desee en el campo de texto.', bold: false, size: 9, gap: 12 },
        { text: '3.  ING. OBRA: fecha prevista en que el material debe ingresar a la obra. Consulte si tiene dudas.', bold: false, size: 9, gap: 12 },
        { text: '4.  Una vez completado, guarde el PDF y envielo a su arquitecto/a ARMAR.', bold: false, size: 9, gap: 20 },
        { text: '', gap: 8 },
        { text: 'CAMPOS QUE DEBE COMPLETAR EL CLIENTE', bold: true, size: 10, gap: 14 },
        { text: '', gap: 6 },
        { text: '  •  Nombre del cliente (encabezado de cada pagina)', bold: false, size: 9, gap: 10 },
        { text: '  •  Numero de revision (encabezado de cada pagina)', bold: false, size: 9, gap: 10 },
        { text: '  •  Fecha de revision (encabezado de cada pagina)', bold: false, size: 9, gap: 10 },
        { text: '  •  Casilleros APROBADO en cada fila', bold: false, size: 9, gap: 10 },
        { text: '  •  Observaciones en cada fila que lo requiera', bold: false, size: 9, gap: 22 },
        { text: '', gap: 8 },
        { text: 'IMPORTANTE', bold: true, size: 10, gap: 14 },
        { text: '', gap: 4 },
        { text: 'Los materiales marcados como APROBADO seran los que se procederan a comprar. Cualquier cambio', bold: false, size: 9, gap: 11 },
        { text: 'posterior puede generar demoras o costos adicionales. En caso de duda, consulte antes de aprobar.', bold: false, size: 9, gap: 22 },
      ]

      let iy = PH - MG - 60 - 28
      for (const ln of instrLines) {
        if (ln.text) {
          try {
            instrPage.drawText(safe(ln.text), { x: MG + 20, y: iy, size: ln.size || 9, font: ln.bold ? fontB : fontR, color: ln.bold ? rgb(0.08,0.12,0.28) : rgb(0.18,0.18,0.22) })
          } catch {}
        }
        iy -= ln.gap || 12
      }

      // Firma
      instrPage.drawRectangle({ x: MG, y: MG + 30, width: usableW / 3 - 10, height: 1, color: rgb(0.6,0.6,0.6) })
      try { instrPage.drawText('Firma del cliente', { x: MG, y: MG + 16, size: 8, font: fontR, color: rgb(0.5,0.5,0.5) }) } catch {}
      instrPage.drawRectangle({ x: MG + usableW / 3 + 10, y: MG + 30, width: usableW / 3 - 20, height: 1, color: rgb(0.6,0.6,0.6) })
      try { instrPage.drawText('Aclaracion', { x: MG + usableW / 3 + 10, y: MG + 16, size: 8, font: fontR, color: rgb(0.5,0.5,0.5) }) } catch {}
      instrPage.drawRectangle({ x: MG + (usableW / 3) * 2 + 10, y: MG + 30, width: usableW / 3 - 10, height: 1, color: rgb(0.6,0.6,0.6) })
      try { instrPage.drawText('Fecha', { x: MG + (usableW / 3) * 2 + 10, y: MG + 16, size: 8, font: fontR, color: rgb(0.5,0.5,0.5) }) } catch {}

      // ── Pre-embed imágenes ───────────────────────────────────────────────────
      const imgCache = {}
      for (const row of rows) {
        if (row.foto && !imgCache[row.foto]) {
          try {
            const b64   = await fetchImageBase64(row.foto)
            if (!b64) continue
            const data  = b64.split(',')[1]
            const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0))
            imgCache[row.foto] = b64.startsWith('data:image/png')
              ? await pdfDoc.embedPng(bytes)
              : await pdfDoc.embedJpg(bytes)
          } catch {}
        }
      }

      // ── Páginas del listado ──────────────────────────────────────────────────
      let pageNum = 0, page, bodyTop
      let clienteFieldDone = false

      const addPage = () => {
        pageNum++
        page = pdfDoc.addPage([PW, PH])

        // Barra título
        page.drawRectangle({ x: MG, y: PH - MG - TITLE_H, width: usableW, height: TITLE_H, color: rgb(0.08, 0.12, 0.28) })
        try { page.drawText('LISTADO DE COMPRAS - REVISION CLIENTE', { x: MG + 10, y: PH - MG - 16, size: 10, font: fontB, color: rgb(1,1,1) }) } catch {}
        try { page.drawText(safe(proyNombre), { x: MG + 10, y: PH - MG - 28, size: 7.5, font: fontR, color: rgb(0.65,0.75,1) }) } catch {}
        try { page.drawText(`Pag. ${pageNum}`, { x: PW - MG - 36, y: PH - MG - 20, size: 7, font: fontR, color: rgb(0.7,0.7,0.85) }) } catch {}

        let nextTop = PH - MG - TITLE_H

        // Fila meta (cliente / revisión / fecha) — fillable solo pág 1, estático resto
        page.drawRectangle({ x: MG, y: nextTop - META_H, width: usableW, height: META_H, color: rgb(0.94, 0.96, 1) })
        page.drawLine({ start: { x: MG, y: nextTop - META_H }, end: { x: MG + usableW, y: nextTop - META_H }, thickness: 0.5, color: rgb(0.7,0.75,0.9) })

        const metaFields = [
          { label: 'CLIENTE:', key: 'meta_cliente', x: MG + 6 },
          { label: 'REVISION N°:', key: 'meta_revision', x: MG + usableW * 0.35 },
          { label: 'FECHA:', key: 'meta_fecha', x: MG + usableW * 0.6 },
        ]
        metaFields.forEach(mf => {
          try { page.drawText(mf.label, { x: mf.x, y: nextTop - META_H + 7, size: 6.5, font: fontB, color: rgb(0.2,0.25,0.5) }) } catch {}
          const labelW = fontB.widthOfTextAtSize(mf.label, 6.5) + 4
          const fieldW = mf.key === 'meta_cliente' ? usableW * 0.32 : mf.key === 'meta_revision' ? usableW * 0.22 : usableW * 0.38
          if (!clienteFieldDone || pageNum === 1) {
            try {
              const tf = form.createTextField(mf.key)
              tf.addToPage(page, { x: mf.x + labelW, y: nextTop - META_H + 3, width: fieldW - labelW - 4, height: META_H - 6 })
              tf.setFontSize(8)
            } catch {}
          }
        })
        if (pageNum === 1) clienteFieldDone = true

        nextTop -= META_H

        // Header columnas
        page.drawRectangle({ x: MG, y: nextTop - THDR_H, width: usableW, height: THDR_H, color: rgb(0.20, 0.25, 0.50) })
        let hx = MG
        COLS.forEach((col, ci) => {
          try { page.drawText(col.label, { x: hx + 3, y: nextTop - THDR_H + 5, size: 5.5, font: fontB, color: rgb(1,1,1) }) } catch {}
          if (ci < COLS.length - 1) page.drawLine({ start: { x: hx + colW[ci], y: nextTop - THDR_H }, end: { x: hx + colW[ci], y: nextTop }, thickness: 0.4, color: rgb(0.4,0.45,0.7) })
          hx += colW[ci]
        })

        bodyTop = nextTop - THDR_H
        return bodyTop
      }

      const drawTextSafe = (txt, opts) => { try { page.drawText(safe(txt), opts) } catch {} }

      const wrapText = (txt, maxW, sz, f) => {
        const words = safe(txt).split(' ').filter(Boolean)
        const lines = [], maxLines = 2
        let cur = ''
        for (const w of words) {
          const test = cur ? cur + ' ' + w : w
          try {
            if (f.widthOfTextAtSize(test, sz) > maxW - 6) { if (cur) lines.push(cur); cur = w }
            else cur = test
          } catch { cur = test }
          if (lines.length >= maxLines) break
        }
        if (cur && lines.length < maxLines) lines.push(cur)
        return lines
      }

      let fieldIdx = 0
      let y = addPage()

      for (const row of rows) {
        const isHdr = isComprasHeader(row)
        const rowH  = isHdr ? HDR_H : ROW_H

        if (y - rowH < MG + 10) y = addPage()
        const rowY = y - rowH

        if (isHdr) {
          page.drawRectangle({ x: MG, y: rowY, width: usableW, height: rowH, color: rgb(0.13, 0.16, 0.36) })
        } else {
          page.drawRectangle({ x: MG, y: rowY, width: usableW, height: rowH, color: fieldIdx % 2 === 0 ? rgb(0.98, 0.98, 1) : rgb(1,1,1) })
        }
        page.drawLine({ start: { x: MG, y: rowY }, end: { x: MG + usableW, y: rowY }, thickness: 0.3, color: rgb(0.82,0.82,0.88) })

        let x = MG
        COLS.forEach((col, ci) => {
          const w   = colW[ci]
          const val = row[col.key] ?? ''

          if (isHdr) {
            if (col.key === 'item' || col.key === 'ubicacion' || col.key === 'categoria') {
              drawTextSafe(val, { x: x + 3, y: rowY + (rowH - 6) / 2, size: 6.5, font: fontB, color: rgb(1,1,1) })
            }
          } else if (col.tipo === 'imagen') {
            const img = imgCache[val]
            if (img) {
              try {
                const dim = img.scaleToFit(w - 4, rowH - 4)
                page.drawImage(img, { x: x + 2 + (w - 4 - dim.width) / 2, y: rowY + 2 + (rowH - 4 - dim.height) / 2, width: dim.width, height: dim.height })
              } catch {}
            }
          } else if (col.tipo === 'check') {
            const sz  = Math.min(w - 10, rowH - 10, 16)
            const cbX = Math.round(x + (w - sz) / 2)
            const cbY = Math.round(rowY + (rowH - sz) / 2)
            try {
              const cb = form.createCheckBox(`${col.key}_${fieldIdx}`)
              cb.addToPage(page, { x: cbX, y: cbY, width: sz, height: sz })
              if (val) cb.check()
            } catch {}
          } else if (col.tipo === 'field') {
            try {
              const tf = form.createTextField(`obs_${fieldIdx}`)
              tf.addToPage(page, { x: x + 2, y: rowY + 2, width: w - 4, height: rowH - 4 })
              tf.enableMultiline()
              tf.setFontSize(7)
            } catch {}
          } else if (col.tipo === 'calc') {
            const p = parseFloat(String(row.precioUn  || '').replace(/\./g,'').replace(',','.')) || 0
            const q = parseFloat(String(row.cajasUn || '').replace(',','.')) || 0
            const tot = p && q ? Math.round(p * q).toLocaleString('es-AR') : ''
            const lines = wrapText(tot, w, 6.5, fontR)
            const lineH = 9
            const startY = rowY + (rowH - lines.length * lineH) / 2 + 3
            lines.forEach((l, li) => {
              drawTextSafe(l, { x: x + 3, y: startY + (lines.length - 1 - li) * lineH, size: 6.5, font: fontR, color: rgb(0.12,0.12,0.15) })
            })
          } else {
            const displayVal = col.key === 'link' ? (val ? 'Ver link' : '') : stripHtml(val)
            const lines = wrapText(displayVal, w, 6.5, fontR)
            const lineH = 9
            const blockH = lines.length * lineH
            const startY = rowY + (rowH - blockH) / 2 + 3
            lines.forEach((l, li) => {
              drawTextSafe(l, { x: x + 3, y: startY + (lines.length - 1 - li) * lineH, size: 6.5, font: fontR, color: col.key === 'link' ? rgb(0.15,0.35,0.75) : rgb(0.12,0.12,0.15) })
            })
          }

          if (ci < COLS.length - 1) page.drawLine({ start: { x: x + w, y: rowY }, end: { x: x + w, y: rowY + rowH }, thickness: 0.3, color: rgb(0.82,0.82,0.88) })
          x += w
        })

        if (!isHdr) fieldIdx++
        y -= rowH
      }

      const bytes = await pdfDoc.save()
      const blob  = new Blob([bytes], { type: 'application/pdf' })
      const url   = URL.createObjectURL(blob)
      const a     = document.createElement('a')
      a.href = url
      a.download = `Compras_Rellenable_${safe(proyNombre || 'proyecto')}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('[PDF Rellenable] error:', err)
      alert('Error generando PDF: ' + (err?.message || String(err)))
    } finally {
      setExportandoRellenable(false)
    }
  }

  const save = useCallback(async (r) => {
    setSaving(true)
    await onSave({ rows: r })
    setSaving(false)
    setDirty(false)
  }, [onSave])

  const updateRow = (ri, key, val) => {
    setRows(prev => prev.map((r, i) => i === ri ? { ...r, [key]: val } : r))
    setDirty(true)
  }

  // Renumera todos los ítems y subítems usando el número del capítulo como prefijo
  const renumerarRows = (rowList) => {
    let capN = 0, subN = 0
    return rowList.map(row => {
      if (isComprasHeader(row)) {
        capN++; subN = 0
        return { ...row, item: String(capN) }
      }
      subN++
      return { ...row, item: `${capN}.${subN}` }
    })
  }

  const addRow = () => { setRows(prev => [...prev, newComprasRow()]); setDirty(true) }

  // Inserta una fila debajo de `ri` y renumera
  const insertRowAfter = (ri) => {
    setRows(prev => {
      const next = [...prev]
      const prevRow = prev[ri]
      const prevItem = String(isComprasHeader(prevRow) ? '' : (prevRow?.item || '')).trim()
      const isSub = /^\d+\.\d/.test(prevItem)
      next.splice(ri + 1, 0, { ...newComprasRow(), item: isSub ? '0.0' : '0' })
      return renumerarRows(next)
    })
    setDirty(true)
  }

  const renumerar = () => { setRows(prev => renumerarRows(prev)); setDirty(true) }

  const deleteRow = (ri) => { setRows(prev => prev.filter((_, i) => i !== ri)); setDirty(true); setConfirmDelete(null) }
  const clearAll = () => { if (window.confirm('¿Eliminar el listado completo?')) { setRows([]); setDirty(true) } }

  const handleImageUpload = async (ri, file) => {
    if (!file) return
    const ext  = file.name.split('.').pop()
    const path = `${proyId}/${Date.now()}-${ri}.${ext}`
    setUploading(prev => ({ ...prev, [ri]: true }))
    const { error } = await supabase.storage.from('compras-imagenes').upload(path, file, { upsert: true })
    if (error) {
      console.error('[compras-imagenes] upload error:', error)
      alert('Error al subir imagen: ' + (error.message || JSON.stringify(error)))
    } else {
      const { data: urlData } = supabase.storage.from('compras-imagenes').getPublicUrl(path)
      updateRow(ri, 'foto', urlData.publicUrl)
    }
    setUploading(prev => ({ ...prev, [ri]: false }))
  }

  const isEmpty = !rows.length

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {isEditor && (
          <button onClick={() => { setEditMode(m => !m); if (dirty) save(rows) }}
            style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${editMode ? orange : border}`, background: editMode ? orangeLight : 'white', color: editMode ? orange : mid, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            {editMode ? '✓ Cerrar edición' : '✏ Editar listado'}
          </button>
        )}
        {editing && (
          <>
            <button onClick={addRow}
              style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${border}`, background: 'white', color: mid, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Fila
            </button>
            <button
              title="Negrita (seleccioná texto primero)"
              onMouseDown={e => { e.preventDefault(); document.execCommand('bold') }}
              style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${border}`, background: 'white', color: dark, fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>B</button>
            <button
              title="Subrayado (seleccioná texto primero)"
              onMouseDown={e => { e.preventDefault(); document.execCommand('underline') }}
              style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${border}`, background: 'white', color: dark, fontSize: 13, fontWeight: 400, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>U</button>
            {!isEmpty && (
              <button onClick={renumerar}
                style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${border}`, background: 'white', color: mid, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                # Renumerar
              </button>
            )}
            {!isEmpty && (
              <button onClick={clearAll}
                style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid #FCA5A5', background: 'white', color: red, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                🗑 Eliminar listado
              </button>
            )}
            {dirty && (
              <button onClick={() => save(rows)} disabled={saving}
                style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: green, color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando…' : '✓ Guardar cambios'}
              </button>
            )}
          </>
        )}
        {!isEmpty && !editMode && (
          <>
            <button onClick={() => setExportSelector(true)} disabled={exportando}
              style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid ${border}`, background: 'white', color: dark, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: exportando ? 0.7 : 1 }}>
              {exportando ? 'Generando PDF…' : '↓ Exportar PDF'}
            </button>
            <button onClick={exportarPDFRellenable} disabled={exportandoRellenable}
              style={{ padding: '6px 14px', borderRadius: 7, border: `1px solid #2563EB`, background: exportandoRellenable ? '#EFF6FF' : '#EFF6FF', color: '#2563EB', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: exportandoRellenable ? 0.7 : 1 }}>
              {exportandoRellenable ? 'Generando…' : '↓ PDF Rellenable'}
            </button>
          </>
        )}
        {!isEmpty && (
          <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 4 }}>
            {rows.filter(r => r.comprado).length}/{rows.filter(r => !isComprasHeader(r)).length} comprados
          </span>
        )}
      </div>

      {isEmpty ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
          {isEditor ? 'Agregá filas para armar el listado de compras.' : 'Sin listado de compras cargado.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${border}` }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#F3F4F6' }}>
                {COMPRAS_COLS.map(col => (
                  <th key={col.key} style={{ padding: '7px 8px', borderBottom: `1px solid ${border}`, borderRight: `1px solid ${border}`, fontWeight: 700, color: col.limite ? '#991B1B' : dark, background: col.limite ? '#FEF2F2' : '#F3F4F6', whiteSpace: 'nowrap', minWidth: 30, width: colWidths[col.key], textAlign: col.type === 'number' || col.type === 'precio' || col.type === 'calc' ? 'right' : 'left', position: 'relative', userSelect: 'none' }}>
                    {col.label}
                    <div onMouseDown={e => startColResize(e, col.key)}
                      style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 5, cursor: 'col-resize', zIndex: 2 }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(37,99,235,0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'} />
                  </th>
                ))}
                {editing && <th style={{ width: 28, borderBottom: `1px solid ${border}` }} />}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                const isHeader = isComprasHeader(row)
                const comprado = row.comprado
                return (
                  <tr key={ri}
                    style={{ borderBottom: `1px solid ${border}`, background: isHeader ? '#1A1A2E' : comprado ? '#F0FDF4' : 'white' }}
                    onMouseEnter={e => { e.currentTarget.style.background = isHeader ? '#2A2A3E' : comprado ? '#DCFCE7' : '#FAFAF9' }}
                    onMouseLeave={e => { e.currentTarget.style.background = isHeader ? '#1A1A2E' : comprado ? '#F0FDF4' : 'white' }}>
                    {COMPRAS_COLS.map(col => {
                      const val = row[col.key] ?? ''
                      const limiteColor = col.limite && !isHeader
                        ? (row.comprado && row.fechaEntrega ? '#F0FDF4' : row.comprado ? '#FEFCE8' : '#FEF2F2')
                        : null
                      const cellStyle = { padding: '4px 6px', borderRight: `1px solid ${isHeader ? '#333' : border}`, verticalAlign: 'middle', minWidth: 30, width: colWidths[col.key], background: limiteColor || undefined }

                      if (isHeader && col.key !== 'item' && col.key !== 'categoria') {
                        return <td key={col.key} style={cellStyle} />
                      }

                      if (col.type === 'imagen') {
                        return (
                          <td key={col.key} style={{ ...cellStyle, textAlign: 'center' }}>
                            {val ? (
                              <div style={{ position: 'relative', display: 'inline-block' }}>
                                <img
                                  src={val} alt=""
                                  onClick={() => !editing && setFotoModal({ url: val, modelo: row.modelo, marca: row.marca, ubicacion: row.ubicacion, categoria: row.categoria })}
                                  style={{ width: 52, height: 40, objectFit: 'contain', borderRadius: 4, border: `1px solid ${border}`, display: 'block', cursor: editing ? 'default' : 'zoom-in' }} />
                                {editing && (
                                  <button onClick={() => fileRefs.current[ri]?.click()}
                                    style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', border: 'none', borderRadius: 4, cursor: 'pointer', color: 'white', fontSize: 13, opacity: 0, transition: 'opacity 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                                    onMouseLeave={e => e.currentTarget.style.opacity = '0'}>✎</button>
                                )}
                              </div>
                            ) : editing ? (
                              <button onClick={() => fileRefs.current[ri]?.click()}
                                disabled={uploading[ri]}
                                style={{ width: 52, height: 40, borderRadius: 6, border: `1px dashed ${border}`, background: '#FAFAF9', color: '#9CA3AF', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {uploading[ri] ? '…' : '+'}
                              </button>
                            ) : null}
                            {editing && (
                              <input type="file" accept="image/*" style={{ display: 'none' }}
                                ref={el => fileRefs.current[ri] = el}
                                onChange={e => handleImageUpload(ri, e.target.files?.[0])} />
                            )}
                          </td>
                        )
                      }

                      if (col.type === 'check') {
                        return (
                          <td key={col.key} style={{ ...cellStyle, textAlign: 'center' }}>
                            {editing ? (
                              <input type="checkbox" checked={!!val} onChange={e => updateRow(ri, col.key, e.target.checked)}
                                style={{ width: 15, height: 15, cursor: 'pointer', accentColor: green }} />
                            ) : val ? (
                              <span style={{ color: green, fontWeight: 700 }}>✓</span>
                            ) : <span style={{ color: '#D1D5DB' }}>—</span>}
                          </td>
                        )
                      }

                      if (col.type === 'link') {
                        return (
                          <td key={col.key} style={{ ...cellStyle, textAlign: 'center' }}>
                            {editing ? (
                              <input value={val} onChange={e => updateRow(ri, col.key, e.target.value)}
                                placeholder="URL"
                                style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 11, color: blue, fontFamily: 'inherit', outline: 'none' }} />
                            ) : val ? (
                              <a href={val} target="_blank" rel="noreferrer"
                                style={{ color: blue, fontWeight: 700, fontSize: 11, textDecoration: 'none' }}>
                                🔗
                              </a>
                            ) : null}
                          </td>
                        )
                      }

                      if (col.type === 'calc') {
                        const tot = calcTot(row)
                        return (
                          <td key={col.key} style={{ ...cellStyle, textAlign: 'right', color: tot ? dark : '#D1D5DB', fontWeight: tot ? 700 : 400 }}>
                            {tot || '—'}
                          </td>
                        )
                      }

                      if (col.type === 'date') {
                        return (
                          <td key={col.key} style={cellStyle}>
                            {editing ? (
                              <input type="date" value={val}
                                onChange={e => updateRow(ri, col.key, e.target.value)}
                                style={{ border: 'none', background: 'transparent', fontSize: 11, color: isHeader ? 'white' : dark, fontFamily: 'inherit', outline: 'none', width: '100%' }} />
                            ) : val ? (
                              <span>{new Date(val + 'T00:00:00').toLocaleDateString('es-AR')}</span>
                            ) : null}
                          </td>
                        )
                      }

                      // text / number / precio
                      const isNum = col.type === 'number' || col.type === 'precio'
                      const isItemCol = col.key === 'item'
                      const isCatCol  = col.key === 'categoria'
                      const textColor = isHeader ? 'white' : dark
                      const fontW     = isHeader && (isItemCol || isCatCol) ? 800 : 400
                      // Celdas de texto plano (número, precio, item) usan input normal
                      if (isNum || isItemCol) {
                        return (
                          <td key={col.key} style={{ ...cellStyle, textAlign: isNum ? 'right' : 'left' }}>
                            {editing ? (
                              <input value={val} onChange={e => updateRow(ri, col.key, e.target.value)}
                                style={{ width: '100%', border: 'none', background: 'transparent', fontSize: 11, color: textColor, fontWeight: fontW, fontFamily: 'inherit', outline: 'none', textAlign: isNum ? 'right' : 'left' }} />
                            ) : (
                              <span style={{ color: textColor, fontWeight: fontW }}>
                                {col.type === 'precio' && val
                                  ? '$ ' + Math.round(parseFloat(String(val).replace(/\./g,'').replace(',','.')) || 0).toLocaleString('es-AR')
                                  : val}
                              </span>
                            )}
                          </td>
                        )
                      }
                      // Celdas de texto enriquecido — contentEditable para formato por selección
                      return (
                        <td key={col.key} style={{ ...cellStyle, textAlign: 'left' }}>
                          {editing ? (
                            <div
                              contentEditable
                              suppressContentEditableWarning
                              dangerouslySetInnerHTML={{ __html: val }}
                              onBlur={e => updateRow(ri, col.key, e.currentTarget.innerHTML)}
                              style={{ minWidth: 20, outline: 'none', fontSize: 11, color: textColor, fontWeight: fontW, fontFamily: 'inherit', cursor: 'text', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                            />
                          ) : (
                            <span
                              style={{ color: textColor, fontWeight: fontW }}
                              dangerouslySetInnerHTML={{ __html: val }}
                            />
                          )}
                        </td>
                      )
                    })}
                    {editing && (
                      <td style={{ textAlign: 'center', padding: 3, borderRight: 'none', whiteSpace: 'nowrap' }}>
                        <button onClick={() => insertRowAfter(ri)}
                          title="Insertar fila debajo"
                          style={{ border: 'none', background: 'none', color: green, cursor: 'pointer', fontSize: 14, padding: '0 3px', fontWeight: 700 }}>＋</button>
                        <button onClick={() => setConfirmDelete(ri)}
                          style={{ border: 'none', background: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 12, padding: '0 3px' }}>🗑</button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal selector de columnas PDF */}
      {exportSelector && (
        <div onClick={() => setExportSelector(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 14, padding: '24px 28px', maxWidth: 420, width: '92%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: dark, marginBottom: 4 }}>Elegí los campos a exportar</div>
            <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 16 }}>El campo "Item" siempre se incluye.</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginBottom: 20 }}>
              {ALL_PDF_COLS.filter(c => !c.fixed).map(col => (
                <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: dark }}>
                  <input
                    type="checkbox"
                    checked={selectedPdfCols.has(col.key)}
                    onChange={() => {
                      setSelectedPdfCols(prev => {
                        const next = new Set(prev)
                        next.has(col.key) ? next.delete(col.key) : next.add(col.key)
                        return next
                      })
                    }}
                    style={{ accentColor: orange, width: 15, height: 15 }}
                  />
                  {col.label}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setExportSelector(false)}
                style={{ padding: '8px 18px', borderRadius: 8, border: `1px solid ${border}`, background: 'white', color: mid, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={() => exportarPDF(new Set([...selectedPdfCols, 'item']))}
                style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: orange, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                ↓ Exportar PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación eliminar fila */}
      {confirmDelete !== null && (
        <div onClick={() => setConfirmDelete(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 600 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 14, padding: '28px 32px', maxWidth: 340, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🗑️</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: dark, marginBottom: 8 }}>¿Eliminar esta fila?</div>
            <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 24 }}>Esta acción no se puede deshacer.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ padding: '8px 20px', borderRadius: 8, border: `1px solid ${border}`, background: 'white', color: mid, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={() => deleteRow(confirmDelete)}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: red, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal foto ampliada */}
      {fotoModal && (
        <div onClick={() => setFotoModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 16, maxWidth: 560, width: '100%', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>
            <div style={{ background: dark, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'white', fontWeight: 800, fontSize: 14 }}>{fotoModal.modelo || '—'}</div>
                <div style={{ color: '#9CA3AF', fontSize: 11, marginTop: 2 }}>
                  {[fotoModal.marca, fotoModal.categoria, fotoModal.ubicacion].filter(Boolean).join(' · ')}
                </div>
              </div>
              <button onClick={() => setFotoModal(null)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, background: '#F9FAFB' }}>
              <img src={fotoModal.url} alt={fotoModal.modelo}
                style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain', borderRadius: 8 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Listado de Contrataciones ────────────────────────────────────────────────

const RUBROS_OBRA = [
  'MÁRMOLERÍA / MESADAS', 'HERRERÍA', 'MUEBLES / CARPINTERÍA',
  'ABERTURAS (VENTANAS Y PUERTAS)', 'PAISAJISMO / RIEGO', 'DOMÓTICA',
  'TERMOMECÁNICA (AA Y CALEFACCIÓN)', 'AISLACIONES', 'PILETA',
]
const RUBROS_ASESORIA = [
  'ILUMINACIÓN', 'PAISAJISMO', 'ENERGÍAS RENOVABLES', 'INSTALACIONES', 'ESTRUCTURA',
]
const TODOS_RUBROS = [...RUBROS_OBRA, ...RUBROS_ASESORIA]

const ESTADOS_CONTRATACION = [
  { value: 'cotizando',    label: 'Cotizando',     bg: '#F3F4F6', color: '#6B7280' },
  { value: 'contratado',   label: 'Contratado',    bg: '#EFF6FF', color: '#2563EB' },
  { value: 'en_ejecucion', label: 'En ejecución',  bg: '#ECFDF5', color: '#059669' },
  { value: 'finalizado',   label: 'Finalizado',    bg: '#F0FDF4', color: '#2D7A4F' },
  { value: 'cancelado',    label: 'Cancelado',     bg: '#FEF2F2', color: '#DC2626' },
]

const CHECKLIST_ITEMS_DEF = [
  { key: 'doc_cotizar',    label: 'Documentación enviada para cotizar', hasText: true,  hasDate: true  },
  { key: 'ppto_recibido',  label: 'Presupuesto recibido',               hasText: false, hasDate: true  },
  { key: 'ppto_aprobado',  label: 'Presupuesto aprobado por cliente',   hasText: false, hasDate: true  },
  { key: 'contrato',       label: 'Contrato firmado / Adelanto abonado',hasText: false, hasDate: true  },
  { key: 'doc_ejecutar',   label: 'Documentación para ejecutar / taller de fabricación', hasText: true, hasDate: true },
  { key: 'planos_entrega', label: 'Planos/documentación entregada (si es asesoría)',      hasText: false, hasDate: true },
  { key: 'ingreso_obra',   label: 'Fecha de ingreso a obra',            hasText: false, hasDate: true  },
  { key: 'finalizado',     label: 'Trabajo finalizado y aprobado',      hasText: false, hasDate: true  },
]

function newContratacion() {
  return {
    id: crypto.randomUUID(),
    rubro: '',
    empresa: '',
    contacto: '',
    descripcion: '',
    presupuesto: '',
    aprobadoCliente: false,
    estado: 'cotizando',
    checklist: CHECKLIST_ITEMS_DEF.map(d => ({ key: d.key, done: false, texto: '', fecha: '' })),
    calEventId: null,
  }
}

function EstadoChip({ estado }) {
  const meta = ESTADOS_CONTRATACION.find(e => e.value === estado) || ESTADOS_CONTRATACION[0]
  return (
    <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: meta.bg, color: meta.color }}>
      {meta.label}
    </span>
  )
}

function ContratacionCard({ c, isEditor, onChange, onDelete }) {
  const [open, setOpen] = useState(false)

  const updateField = (field, val) => onChange({ ...c, [field]: val })
  const updateChecklist = (idx, patch) => {
    const cl = c.checklist.map((it, i) => i === idx ? { ...it, ...patch } : it)
    onChange({ ...c, checklist: cl })
  }

  const ingresoItem = c.checklist.find(it => it.key === 'ingreso_obra')
  const ingresoFecha = ingresoItem?.fecha || ''

  return (
    <div style={{ border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', background: open ? '#FAFAF9' : 'white', userSelect: 'none' }}
      >
        <span style={{ fontSize: 14, color: mid, flexShrink: 0 }}>{open ? '▾' : '▸'}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: dark }}>{c.rubro || <em style={{ color: '#9CA3AF', fontStyle: 'normal' }}>Sin rubro</em>}</span>
            <EstadoChip estado={c.estado} />
            {c.aprobadoCliente && <span style={{ fontSize: 11, background: '#F0FDF4', color: green, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>✓ Aprobado</span>}
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
            {[c.empresa, c.presupuesto ? `$${Number(c.presupuesto).toLocaleString('es-AR')}` : null, ingresoFecha ? `Ingreso: ${ingresoFecha}` : null].filter(Boolean).join(' · ')}
          </div>
        </div>
        {isEditor && (
          <button onClick={e => { e.stopPropagation(); onDelete() }}
            style={{ background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 16, padding: 4, lineHeight: 1 }}
            title="Eliminar contratación">×</button>
        )}
      </div>

      {/* Expanded */}
      {open && (
        <div style={{ padding: '14px 16px', borderTop: `1px solid ${border}`, background: 'white' }}>
          {/* Campos principales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 11, color: mid, fontWeight: 600, display: 'block', marginBottom: 4 }}>Rubro</label>
              {isEditor ? (
                <select value={c.rubro} onChange={e => updateField('rubro', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: `1px solid ${border}`, fontSize: 12, fontFamily: 'inherit', background: 'white' }}>
                  <option value="">— Seleccionar —</option>
                  <optgroup label="Obra">
                    {RUBROS_OBRA.map(r => <option key={r} value={r}>{r}</option>)}
                  </optgroup>
                  <optgroup label="Asesoría">
                    {RUBROS_ASESORIA.map(r => <option key={r} value={r}>{r}</option>)}
                  </optgroup>
                </select>
              ) : (
                <span style={{ fontSize: 12, color: dark }}>{c.rubro || '—'}</span>
              )}
            </div>
            <div>
              <label style={{ fontSize: 11, color: mid, fontWeight: 600, display: 'block', marginBottom: 4 }}>Estado</label>
              {isEditor ? (
                <select value={c.estado} onChange={e => updateField('estado', e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: `1px solid ${border}`, fontSize: 12, fontFamily: 'inherit', background: 'white' }}>
                  {ESTADOS_CONTRATACION.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              ) : (
                <EstadoChip estado={c.estado} />
              )}
            </div>
            <div>
              <label style={{ fontSize: 11, color: mid, fontWeight: 600, display: 'block', marginBottom: 4 }}>Empresa / Contratista</label>
              {isEditor ? (
                <input value={c.empresa} onChange={e => updateField('empresa', e.target.value)} placeholder="Empresa o persona"
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: `1px solid ${border}`, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              ) : (
                <span style={{ fontSize: 12, color: dark }}>{c.empresa || '—'}</span>
              )}
            </div>
            <div>
              <label style={{ fontSize: 11, color: mid, fontWeight: 600, display: 'block', marginBottom: 4 }}>Contacto</label>
              {isEditor ? (
                <input value={c.contacto} onChange={e => updateField('contacto', e.target.value)} placeholder="Teléfono o mail"
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: `1px solid ${border}`, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              ) : (
                <span style={{ fontSize: 12, color: dark }}>{c.contacto || '—'}</span>
              )}
            </div>
            <div>
              <label style={{ fontSize: 11, color: mid, fontWeight: 600, display: 'block', marginBottom: 4 }}>$ Presupuesto</label>
              {isEditor ? (
                <input value={c.presupuesto} onChange={e => updateField('presupuesto', e.target.value)} placeholder="0" type="number"
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: `1px solid ${border}`, fontSize: 12, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              ) : (
                <span style={{ fontSize: 12, color: dark }}>{c.presupuesto ? `$${Number(c.presupuesto).toLocaleString('es-AR')}` : '—'}</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 18 }}>
              <input type="checkbox" id={`aprobado-${c.id}`} checked={!!c.aprobadoCliente} onChange={e => updateField('aprobadoCliente', e.target.checked)} disabled={!isEditor}
                style={{ width: 15, height: 15, cursor: isEditor ? 'pointer' : 'default', accentColor: green }} />
              <label htmlFor={`aprobado-${c.id}`} style={{ fontSize: 12, color: dark, fontWeight: 600, cursor: isEditor ? 'pointer' : 'default' }}>Aprobado por cliente</label>
            </div>
          </div>

          {/* Descripción */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: mid, fontWeight: 600, display: 'block', marginBottom: 4 }}>Descripción / Alcance</label>
            {isEditor ? (
              <textarea value={c.descripcion} onChange={e => updateField('descripcion', e.target.value)} rows={2} placeholder="Descripción del trabajo..."
                style={{ width: '100%', padding: '6px 8px', borderRadius: 7, border: `1px solid ${border}`, fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
            ) : (
              <p style={{ fontSize: 12, color: dark, margin: 0 }}>{c.descripcion || '—'}</p>
            )}
          </div>

          {/* Checklist */}
          <div>
            <div style={{ fontSize: 11, color: mid, fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Checklist de gestión</div>
            {CHECKLIST_ITEMS_DEF.map((def, idx) => {
              const item = c.checklist[idx] || { done: false, texto: '', fecha: '' }
              const isIngreso = def.key === 'ingreso_obra'
              return (
                <div key={def.key} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: idx < CHECKLIST_ITEMS_DEF.length - 1 ? `1px solid ${border}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <input type="checkbox" checked={!!item.done} onChange={e => updateChecklist(idx, { done: e.target.checked })} disabled={!isEditor}
                      style={{ marginTop: 2, width: 14, height: 14, cursor: isEditor ? 'pointer' : 'default', accentColor: isIngreso ? blue : orange, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: item.done ? '#6B7280' : dark, textDecoration: item.done ? 'line-through' : 'none' }}>
                        {def.label}
                        {isIngreso && <span style={{ marginLeft: 6, fontSize: 10, color: blue, fontWeight: 700 }}>→ calendario</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                        {def.hasText && isEditor && (
                          <input value={item.texto || ''} onChange={e => updateChecklist(idx, { texto: e.target.value })}
                            placeholder="Indicar documentación..." disabled={!isEditor}
                            style={{ flex: 1, minWidth: 140, padding: '4px 6px', borderRadius: 6, border: `1px solid ${border}`, fontSize: 11, fontFamily: 'inherit' }} />
                        )}
                        {def.hasText && !isEditor && item.texto && (
                          <span style={{ fontSize: 11, color: mid }}>{item.texto}</span>
                        )}
                        {def.hasDate && (
                          isEditor ? (
                            <input type="date" value={item.fecha || ''} onChange={e => updateChecklist(idx, { fecha: e.target.value })}
                              style={{ padding: '4px 6px', borderRadius: 6, border: `1px solid ${isIngreso ? blue : border}`, fontSize: 11, fontFamily: 'inherit', color: isIngreso ? blue : dark }} />
                          ) : item.fecha ? (
                            <span style={{ fontSize: 11, color: mid }}>{item.fecha}</span>
                          ) : null
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function TablaContrataciones({ contratacionesData, isEditor, proyId, proyNombre, onSave }) {
  const [lista, setLista] = useState(() => Array.isArray(contratacionesData) ? contratacionesData : [])
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const dirtyRef = useRef(false)

  // Sync from parent when not editing (covers both tab-switch remounts and async save completion)
  useEffect(() => {
    if (!dirtyRef.current) {
      setLista(Array.isArray(contratacionesData) ? contratacionesData : [])
    }
  }, [contratacionesData])

  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  const update = (id, patch) => {
    setLista(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
    setDirty(true)
  }

  const addContratacion = () => {
    setLista(prev => [...prev, newContratacion()])
    setDirty(true)
  }

  const deleteContratacion = (id) => {
    setLista(prev => prev.filter(c => c.id !== id))
    setDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const savedLista = await onSave(lista)
      if (savedLista) setLista(savedLista)
      setDirty(false)
    } catch (e) {
      console.error('Error guardando contrataciones:', e)
      alert('Error al guardar. Revisá la consola.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 12, color: '#9CA3AF' }}>{lista.length} contratación{lista.length !== 1 ? 'es' : ''}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {isEditor && dirty && (
            <button onClick={handleSave} disabled={saving}
              style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: orange, color: 'white', fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Guardando…' : '✓ Guardar'}
            </button>
          )}
          {isEditor && (
            <button onClick={addContratacion}
              style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${border}`, background: 'white', color: dark, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Agregar
            </button>
          )}
        </div>
      </div>

      {lista.length === 0 ? (
        <div style={{ border: `2px dashed ${border}`, borderRadius: 10, padding: '32px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
          Sin contrataciones.{isEditor && <span onClick={addContratacion} style={{ color: orange, cursor: 'pointer', fontWeight: 700, marginLeft: 6 }}>Agregar la primera</span>}
        </div>
      ) : (
        lista.map(c => (
          <ContratacionCard
            key={c.id}
            c={c}
            isEditor={isEditor}
            onChange={updated => update(c.id, updated)}
            onDelete={() => deleteContratacion(c.id)}
          />
        ))
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

function ProyectoCard({ p, checklistItems, loadingChecklist, isEditor, onEdit, onDelete, onToggle, isExpanded, onUpdateItem, onVincularObra, presupuestoInfo, projects, cronogramas, onNavigate, onSaveDoc, onSaveCompras, onSaveContrataciones }) {
  const [activeTab, setActiveTab] = useState('checklist')
  const estadoMeta   = ESTADO_COLORS[p.estadoGeneral] || ESTADO_COLORS['En análisis']
  const avance       = checklistItems ? calcAvanceTotal(checklistItems, p.tipoEncargo) : (p.avanceTotal ?? 0)
  const tipoLabel    = TIPOS_ENCARGO.find(t => t.value === p.tipoEncargo)?.label || p.tipoEncargo || '—'
  const esExterno    = p.tipoEncargo === 'obra_proyecto_externo'
  const etapas       = p.tipoEncargo ? getEtapas(p.tipoEncargo) : []

  // Compuerta: último ítem de última etapa aprobado
  const compuertaOk  = checklistItems?.some(it => it.esCompuerta && it.estado === 'aprobado') || false

  // Obra vinculada y su cronograma
  const linkedObra      = (projects || []).find(o => o.proyectoArmarId === p.id)
  const obraCronogramas = linkedObra ? (cronogramas?.[linkedObra.id] || []) : []
  const hasCronograma   = obraCronogramas.length > 0
  const avanceObra      = linkedObra?.progress ?? 0

  // Info extra para obra externa
  const modalidad    = p.responsableObra    || ''
  const arqExterno   = p.arquitectoExterno  || ''

  return (
    <div style={{ background: 'white', borderRadius: 12, border: `1px solid ${border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>

      {/* ── Header clicable ── */}
      <div
        onClick={() => onToggle(p.id)}
        style={{ padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}
        onMouseEnter={e => e.currentTarget.style.background = '#FAFAF9'}
        onMouseLeave={e => e.currentTarget.style.background = 'white'}
      >
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: dark }}>{p.nombre}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: estadoMeta.color, background: estadoMeta.bg, padding: '2px 9px', borderRadius: 99, flexShrink: 0 }}>
              {p.estadoGeneral}
            </span>
            {esExterno && modalidad && (
              <span style={{ fontSize: 10, fontWeight: 600, color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>
                {modalidad}
              </span>
            )}
            {presupuestoInfo && (() => {
              const pm = PRESUPUESTO_ESTADO_META[presupuestoInfo.estadoVersion] || PRESUPUESTO_ESTADO_META.borrador
              return (
                <span style={{ fontSize: 10, fontWeight: 700, color: pm.color, background: pm.bg, padding: '2px 9px', borderRadius: 99, flexShrink: 0 }}>
                  Presupuesto: {pm.label}
                </span>
              )
            })()}
            {linkedObra && (
              hasCronograma
                ? avanceObra > 0
                  ? <span style={{ fontSize: 10, fontWeight: 700, color: orange, background: orangeLight, padding: '2px 9px', borderRadius: 99, flexShrink: 0 }}>En ejecución {avanceObra}%</span>
                  : <span style={{ fontSize: 10, fontWeight: 700, color: green, background: greenLight, padding: '2px 9px', borderRadius: 99, flexShrink: 0 }}>Cronograma cargado</span>
                : <span style={{ fontSize: 10, fontWeight: 700, color: '#9CA3AF', background: '#F3F4F6', padding: '2px 9px', borderRadius: 99, flexShrink: 0 }}>Sin cronograma</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#6B7280', lineHeight: 1.6 }}>
            {[p.comitente, p.direccion || p.zona, p.tipoObra].filter(Boolean).join(' · ')}
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
            {tipoLabel}
            {p.responsableArmar && ` · ${p.responsableArmar}`}
            {esExterno && arqExterno && ` · ${arqExterno}`}
          </div>
          <div style={{ marginTop: 8, maxWidth: 260 }}>
            <ProgressBar value={avance} />
          </div>
        </div>

        {/* Acciones */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {p.linkDocumentacion && (
            <a href={p.linkDocumentacion} target="_blank" rel="noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ padding: '5px 10px', borderRadius: 6, border: `1px solid ${border}`, background: 'white', color: blue, fontSize: 11, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}
              title="Carpeta del proyecto">
              📁
            </a>
          )}
          {isEditor && (
            <>
              <button
                onClick={e => { e.stopPropagation(); onEdit(p) }}
                style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${border}`, background: 'white', color: orange, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.background = orangeLight; e.currentTarget.style.borderColor = '#F28C4E' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = border }}>
                Editar
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(p.id) }}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid #FCA5A5', background: 'white', color: red, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                🗑
              </button>
            </>
          )}
          <span style={{ fontSize: 10, color: '#9CA3AF', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', marginLeft: 2 }}>▶</span>
        </div>
      </div>

      {/* ── Botón compuerta ── */}
      {compuertaOk && (
        <div style={{ padding: '0 16px 12px', background: 'white' }} onClick={e => e.stopPropagation()}>
          {linkedObra && hasCronograma ? (
            <button
              onClick={e => { e.stopPropagation(); onNavigate('cronogramas') }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: 'none', background: blue, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(37,99,235,0.3)' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              ▶ Ver obra y cronograma
            </button>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); onVincularObra() }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 8, border: 'none', background: green, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(45,122,79,0.3)' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              ✓ Proyecto listo — Crear / vincular obra
            </button>
          )}
        </div>
      )}

      {/* ── Panel expandido ── */}
      {isExpanded && (
        <div style={{ borderTop: `1px solid ${border}`, background: light }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${border}`, background: 'white' }}>
            {[
              { key: 'checklist',        label: 'Checklist' },
              { key: 'documentacion',    label: 'Documentación' },
              { key: 'compras',          label: 'Listado de compras' },
              { key: 'contrataciones',   label: 'Contrataciones' },
            ].map(tab => (
              <button key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '9px 18px', border: 'none', background: 'none', fontFamily: 'inherit',
                  fontSize: 12, fontWeight: activeTab === tab.key ? 800 : 500,
                  color: activeTab === tab.key ? orange : mid,
                  borderBottom: activeTab === tab.key ? `2px solid ${orange}` : '2px solid transparent',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Contenido del tab activo */}
          <div style={{ padding: 16 }}>
            {activeTab === 'checklist' && (
              loadingChecklist ? (
                <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>Cargando checklist…</p>
              ) : !checklistItems?.length ? (
                <p style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>Sin ítems de checklist.</p>
              ) : (
                etapas.map(etapa => {
                  const etapaItems = checklistItems.filter(it => it.etapa === etapa)
                  if (!etapaItems.length) return null
                  return (
                    <EtapaAcordeon
                      key={etapa}
                      etapa={etapa}
                      items={etapaItems}
                      onUpdateItem={onUpdateItem}
                    />
                  )
                })
              )
            )}

            {activeTab === 'documentacion' && (
              <TablaDocumentacion
                key={p.id}
                docData={p.documentacion}
                isEditor={isEditor}
                onSave={docData => onSaveDoc(p.id, docData)}
                proyNombre={p.nombre}
              />
            )}

            {activeTab === 'compras' && (
              <TablaCompras
                key={p.id + '-compras'}
                comprasData={p.compras}
                isEditor={isEditor}
                proyId={p.id}
                proyNombre={p.nombre}
                onSave={data => onSaveCompras(p.id, data)}
              />
            )}

            {activeTab === 'contrataciones' && (
              <TablaContrataciones
                key={p.id + '-contrataciones'}
                contratacionesData={p.contrataciones || []}
                isEditor={isEditor}
                proyId={p.id}
                proyNombre={p.nombre}
                onSave={lista => onSaveContrataciones(p.id, lista)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

function ProyectosPage({ isEditor, projects, cronogramas, onCrearObra, onVincularObra, onNavigate, onError }) {
  const [proyectos,       setProyectos]       = useState([])
  const [loading,         setLoading]         = useState(true)
  const [showModal,       setShowModal]       = useState(false)
  const [editingProy,     setEditingProy]     = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [expandedId,      setExpandedId]      = useState(null)
  const [checklistMap,    setChecklistMap]    = useState({})
  const [loadingCL,       setLoadingCL]       = useState({})
  const [loadedCL,        setLoadedCL]        = useState(new Set())
  const [vincularProyecto,  setVincularProyecto]  = useState(null)
  const [presupuestosMap,   setPresupuestosMap]   = useState({})

  useEffect(() => {
    Promise.all([loadProyectosArmar(), loadPresupuestosResumen()]).then(([data, presups]) => {
      setProyectos(data)
      const map = {}
      presups.forEach(p => { map[p.proyectoArmarId] = p })
      setPresupuestosMap(map)
      setLoading(false)
    })
  }, [])

  const handleToggle = async (id) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (loadedCL.has(id)) return
    setLoadingCL(prev => ({ ...prev, [id]: true }))
    console.log('[handleToggle] loadChecklistItems para:', id)
    const raw   = await loadChecklistItems(id)
    const proy  = proyectos.find(p => p.id === id)
    const items = proy ? markCompuerta(raw, proy.tipoEncargo) : raw
    console.log('[handleToggle] recibidos:', items.length, 'items')
    setChecklistMap(prev => ({ ...prev, [id]: items }))
    setLoadedCL(prev => new Set([...prev, id]))
    setLoadingCL(prev => ({ ...prev, [id]: false }))
  }

  const handleSave = async (data) => {
    if (editingProy) {
      const updated = await upsertProyectoArmar({ ...editingProy, ...data })
      if (updated) setProyectos(prev => prev.map(p => p.id === updated.id ? updated : p))
      else onError?.('No se pudo guardar el proyecto. Los cambios no se guardaron, intentá de nuevo.')
    } else {
      const created = await upsertProyectoArmar(data)
      console.log('[handleSave] proyecto creado:', created?.id, created?.tipoEncargo)
      if (created) {
        setProyectos(prev => [created, ...prev])
        const plantilla = generarPlantilla(created.id, created.tipoEncargo)
        console.log('[handleSave] plantilla:', plantilla.length, 'items')
        const raw   = await insertChecklistItems(plantilla)
        const items = markCompuerta(raw, created.tipoEncargo)
        console.log('[handleSave] items insertados:', items.length)
        setChecklistMap(prev => ({ ...prev, [created.id]: items }))
        setLoadedCL(prev => new Set([...prev, created.id]))
        setExpandedId(created.id)
        upsertCalendarioEvento({
          proyectoArmarId: created.id,
          origen:     'proyecto',
          tipoEvento: 'hito',
          titulo:     `Kickoff: ${created.nombre}`,
          fecha:      created.fechaInicio || new Date().toISOString().slice(0, 10),
          estado:     'pendiente',
        })
      } else {
        onError?.('No se pudo guardar el proyecto. Los cambios no se guardaron, intentá de nuevo.')
      }
    }
    setShowModal(false)
    setEditingProy(null)
  }

  const handleDelete = async (id) => {
    await deleteProyectoArmar(id)
    setProyectos(prev => prev.filter(p => p.id !== id))
    setChecklistMap(prev => { const n = { ...prev }; delete n[id]; return n })
    setLoadedCL(prev => { const n = new Set(prev); n.delete(id); return n })
    if (expandedId === id) setExpandedId(null)
    setConfirmDeleteId(null)
  }

  const handleSaveDoc = async (proyId, docData) => {
    const proy = proyectos.find(p => p.id === proyId)
    if (!proy) return
    const updated = await upsertProyectoArmar({ ...proy, documentacion: docData })
    if (updated) setProyectos(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  const handleSaveCompras = async (proyId, data) => {
    const proy = proyectos.find(p => p.id === proyId)
    if (!proy) return

    // Sincronizar eventos de calendario para filas con Fecha límite
    const rowsConFecha = (data.rows || []).filter(r => !isComprasHeader(r) && r.fechaLimite)
    const newRows = [...(data.rows || [])]
    for (let i = 0; i < newRows.length; i++) {
      const row = newRows[i]
      if (isComprasHeader(row) || !row.fechaLimite) {
        if (row.calEventId) {
          // Si se borró la fecha límite, eliminar evento (no bloqueante)
          newRows[i] = { ...row, calEventId: null }
        }
        continue
      }
      const esVerde   = row.comprado && row.fechaEntrega
      const esAmarillo = row.comprado && !row.fechaEntrega
      const estado    = esVerde ? 'completado' : 'pendiente'
      const color     = esVerde ? '#2D7A4F' : esAmarillo ? '#D97706' : '#DC2626'
      const evento = {
        ...(row.calEventId ? { id: row.calEventId } : {}),
        proyectoArmarId: proy.id,
        origen:     'proyecto',
        tipoEvento: 'hito',
        titulo:     `Ingreso a obra: ${row.modelo || row.categoria || row.item || 'ítem'} — ${proy.nombre}`,
        descripcion: `${proy.nombre} — ${row.ubicacion || ''}`.trim().replace(/—\s*$/, ''),
        fecha:      row.fechaLimite,
        estado,
        color,
      }
      const saved = await upsertCalendarioEvento(evento)
      if (saved) newRows[i] = { ...row, calEventId: saved.id }
    }

    const updatedData = { ...data, rows: newRows }
    const updated = await upsertProyectoArmar({ ...proy, compras: updatedData })
    if (updated) setProyectos(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  const handleSaveContrataciones = async (proyId, lista) => {
    const proy = proyectos.find(p => p.id === proyId)
    if (!proy) return
    const newLista = [...lista]
    for (let i = 0; i < newLista.length; i++) {
      const c = newLista[i]
      const ingresoItem = c.checklist?.find(it => it.key === 'ingreso_obra')
      const fechaIngreso = ingresoItem?.fecha || ''
      if (!fechaIngreso) {
        if (c.calEventId) newLista[i] = { ...c, calEventId: null }
        continue
      }
      const estado = c.estado === 'finalizado' ? 'completado' : 'pendiente'
      const color  = c.estado === 'finalizado' ? '#2D7A4F' : c.estado === 'en_ejecucion' ? '#059669' : '#2563EB'
      const evento = {
        ...(c.calEventId ? { id: c.calEventId } : {}),
        proyectoArmarId: proy.id,
        origen: 'proyecto', tipoEvento: 'hito',
        titulo: `Ingreso a obra: ${c.rubro || c.empresa || 'Contratación'} — ${proy.nombre}`,
        descripcion: [c.empresa, c.descripcion].filter(Boolean).join(' · '),
        fecha: fechaIngreso,
        estado,
        color,
      }
      const saved = await upsertCalendarioEvento(evento)
      if (saved) newLista[i] = { ...c, calEventId: saved.id }
    }
    const updated = await upsertProyectoArmar({ ...proy, contrataciones: newLista })
    if (!updated) { console.error('handleSaveContrataciones: upsert returned null'); return null }
    setProyectos(prev => prev.map(p => p.id === updated.id ? updated : p))
    return updated.contrataciones
  }

  const handleUpdateItem = async (item) => {
    const updated = await upsertChecklistItem(item)
    if (!updated) return
    const proy     = proyectos.find(p => p.id === item.proyectoArmarId)
    const allItems = (checklistMap[item.proyectoArmarId] || [])
      .map(it => it.id === updated.id ? updated : it)
    const withMark = proy ? markCompuerta(allItems, proy.tipoEncargo) : allItems
    setChecklistMap(prev => ({ ...prev, [item.proyectoArmarId]: withMark }))
    if (proy) {
      const avance = calcAvanceTotal(withMark, proy.tipoEncargo)
      const upd    = await upsertProyectoArmar({ ...proy, avanceTotal: avance })
      if (upd) setProyectos(prev => prev.map(p => p.id === upd.id ? upd : p))
    }
    if (updated.estado === 'aprobado') {
      const tituloLower = (updated.titulo || '').toLowerCase()
      const hoy = new Date().toISOString().slice(0, 10)
      if (tituloLower.includes('versión final de anteproyecto')) {
        upsertCalendarioEvento({
          proyectoArmarId: updated.proyectoArmarId,
          origen:     'proyecto',
          tipoEvento: 'hito',
          titulo:     `Anteproyecto aprobado: ${proy?.nombre || ''}`,
          fecha:      hoy,
          estado:     'completado',
        })
      } else if (tituloLower.includes('transferencia') && (tituloLower.includes('obra') || tituloLower.includes('inicio'))) {
        upsertCalendarioEvento({
          proyectoArmarId: updated.proyectoArmarId,
          origen:     'proyecto',
          tipoEvento: 'hito',
          titulo:     `Transferencia a obra: ${proy?.nombre || ''}`,
          fecha:      hoy,
          estado:     'completado',
        })
      }
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: dark, letterSpacing: '-0.5px', marginBottom: 4 }}>Proyectos</h1>
          <p style={{ color: '#6B7280', fontSize: 14 }}>
            {proyectos.length} {proyectos.length === 1 ? 'proyecto' : 'proyectos'}
            {proyectos.length > 0 && ` · ${Math.round(proyectos.reduce((s, p) => s + (p.avanceTotal ?? 0), 0) / proyectos.length)}% avance promedio`}
          </p>
        </div>
        {isEditor && (
          <button onClick={() => { setEditingProy(null); setShowModal(true) }}
            style={{ padding: '10px 18px', borderRadius: 9, border: 'none', background: orange, color: 'white', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer', boxShadow: '0 2px 8px rgba(232,100,26,0.3)' }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            + Nuevo proyecto
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>Cargando proyectos…</div>
      ) : proyectos.length === 0 ? (
        <div style={{ border: `2px dashed ${border}`, borderRadius: 14, padding: '48px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
          No hay proyectos cargados.{' '}
          {isEditor && <span onClick={() => { setEditingProy(null); setShowModal(true) }} style={{ color: orange, cursor: 'pointer', fontWeight: 700 }}>Crear el primero</span>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {proyectos.map(p => (
            <ProyectoCard
              key={p.id}
              p={p}
              checklistItems={checklistMap[p.id] || null}
              loadingChecklist={loadingCL[p.id] || false}
              isEditor={isEditor}
              onEdit={proy => { setEditingProy(proy); setShowModal(true) }}
              onDelete={id => setConfirmDeleteId(id)}
              onToggle={handleToggle}
              isExpanded={expandedId === p.id}
              onUpdateItem={handleUpdateItem}
              onVincularObra={() => setVincularProyecto(p)}
              presupuestoInfo={presupuestosMap[p.id] || null}
              projects={projects}
              cronogramas={cronogramas}
              onNavigate={onNavigate}
              onSaveDoc={handleSaveDoc}
              onSaveCompras={handleSaveCompras}
              onSaveContrataciones={handleSaveContrataciones}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ModalProyecto
          proy={editingProy}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingProy(null) }}
        />
      )}

      {/* Modal vincular / crear obra */}
      {vincularProyecto && (
        <ModalVincularObra
          proy={vincularProyecto}
          projects={projects}
          onCrearObra={onCrearObra}
          onVincularObra={onVincularObra}
          onClose={() => setVincularProyecto(null)}
        />
      )}

      {/* Confirmar eliminar */}
      {confirmDeleteId && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 14, maxWidth: 380, width: '100%', padding: '28px 24px', boxShadow: '0 16px 48px rgba(0,0,0,0.2)', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>🗑</div>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: dark, marginBottom: 8 }}>¿Eliminar proyecto?</h3>
            <p style={{ fontSize: 13, color: mid, lineHeight: 1.6, marginBottom: 24 }}>
              Se eliminará el proyecto y todos sus ítems de checklist. Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={() => setConfirmDeleteId(null)}
                style={{ padding: '9px 20px', borderRadius: 8, border: `1px solid ${border}`, background: 'white', color: mid, fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: red, color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
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
