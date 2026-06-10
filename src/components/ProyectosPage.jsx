import { useState, useEffect } from 'react'
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

  const obrasSinProyecto = (projects || []).filter(p => !p.proyectoArmarId)

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

function ProyectoCard({ p, checklistItems, loadingChecklist, isEditor, onEdit, onDelete, onToggle, isExpanded, onUpdateItem, onVincularObra, presupuestoInfo, projects, cronogramas, onNavigate }) {
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

      {/* ── Checklist ── */}
      {isExpanded && (
        <div style={{ borderTop: `1px solid ${border}`, padding: 16, background: light }}>
          {loadingChecklist ? (
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
          )}
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
