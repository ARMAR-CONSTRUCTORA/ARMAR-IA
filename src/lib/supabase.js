import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ── Mappers DB ↔ App ──────────────────────────────────────────────────────────

function fromDbProject(row) {
  return {
    id:                  row.id,
    name:                row.name,
    location:            row.location              || '',
    startDate:           row.start_date            || '',
    endDate:             row.end_date              || '',
    progress:            row.progress              ?? 0,
    responsible:         row.responsible           || '',
    responsableProyecto: row.responsable_proyecto  || '',
    contratista:         row.contratista           || '',
    proyecto:            row.proyecto              || '',
    status:              row.status                || 'activa',
    tasks:               row.tasks                 || [],
    tipoObra:            row.tipo_obra             || '',
    arquitectoProyecto:  row.arquitecto_proyecto   || '',
    contactoArquitecto:  row.contacto_arquitecto   || '',
    linkDocumentacion:   row.link_documentacion    || '',
    proyectoArmarId:     row.proyecto_armar_id     || null,
  }
}

function toDbProject(p) {
  return {
    id:                   p.id,
    name:                 p.name,
    location:             p.location             ?? null,
    start_date:           p.startDate            ?? null,
    end_date:             p.endDate              ?? null,
    progress:             p.progress             ?? 0,
    responsible:          p.responsible          ?? null,
    responsable_proyecto: p.responsableProyecto  ?? null,
    contratista:          p.contratista          ?? null,
    proyecto:             p.proyecto             ?? null,
    status:               p.status               || 'activa',
    tasks:                p.tasks                || [],
    tipo_obra:            p.tipoObra             ?? null,
    arquitecto_proyecto:  p.arquitectoProyecto   ?? null,
    contacto_arquitecto:  p.contactoArquitecto   ?? null,
    link_documentacion:   p.linkDocumentacion    ?? null,
    proyecto_armar_id:    p.proyectoArmarId      || null,
  }
}

function fromDbCronograma(row) {
  return {
    id:                   row.id,
    obraId:               row.obra_id,
    nombre:               row.nombre                || '',
    creadoEn:             row.creado_en             || '',
    autorCronograma:      row.autor_cronograma      || '',
    contratistaPrincipal: row.contratista_principal || '',
    tareas:               row.tareas                || [],
    informes:             row.informes              || [],
    certificados:         row.certificados          || [],
  }
}

function toDbCronograma(c) {
  return {
    id:                    c.id,
    obra_id:               c.obraId,
    nombre:                c.nombre               || '',
    creado_en:             c.creadoEn             || null,
    autor_cronograma:      c.autorCronograma      || null,
    contratista_principal: c.contratistaPrincipal || null,
    tareas:                c.tareas               || [],
    informes:              c.informes             || [],
    certificados:          c.certificados         || [],
  }
}

// ── Mappers Presupuestos ──────────────────────────────────────────────────────

function fromDbPresupuesto(row) {
  return {
    id:                row.id,
    proyectoId:        row.proyecto_id,
    numeroVersion:     row.numero_version ?? 1,
    estadoVersion:     row.estado_version || 'borrador',
    fechaCreacion:     row.fecha_creacion || '',
    fechaAprobacion:   row.fecha_aprobacion || '',
    motivoRevision:    row.motivo_revision || '',
    aprobadoPor:       row.aprobado_por || '',
    esVersionVigente:  row.es_version_vigente ?? true,
    usdRate:           Number(row.usd_rate || 1250),
    proyectoArmarId:   row.proyecto_armar_id  || null,

    capitulos: (row.presupuesto_capitulos || [])
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      .map(fromDbPresupuestoCapitulo),

    contratacionesCliente: (row.contrataciones_cliente || [])
      .map(fromDbContratacionCliente),

    gastosGenerales: (row.presupuesto_gastos_generales || [])
      .map(fromDbGastoGeneral),
  }
}

function fromDbPresupuestoCapitulo(row) {
  return {
    id:            row.id,
    presupuestoId: row.presupuesto_id,
    nombre:        row.nombre || '',
    etapaId:       row.etapa_id || null,
    orden:         row.orden ?? 0,
    items:         (row.presupuesto_items || [])
      .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
      .map(fromDbPresupuestoItem),
  }
}

function fromDbPresupuestoItem(row) {
  return {
    id: row.id,
    capituloId: row.capitulo_id,
    descripcion: row.descripcion || '',
    unidad: row.unidad || 'GLOBAL',
    cantidad: Number(row.cantidad || 0),

    costoDirectoUnitario: Number(row.costo_directo_unitario || row.costo_presupuestado || 0),
    indirectosPct: Number(row.indirectos_pct || 0),
    riesgoPct: Number(row.riesgo_pct || 0),
    utilidadPct: Number(row.utilidad_pct || 0),

    precioCliente: Number(row.precio_cliente || 0),
    costoPresupuestado: Number(row.costo_presupuestado || 0),

    costoContratado: Number(row.costo_contratado || 0),
    costoComprado: Number(row.costo_comprado || 0),
    costoFacturado: Number(row.costo_facturado || 0),
    costoPagado: Number(row.costo_pagado || 0),

    moneda: row.moneda || 'ARS',
    estadoItem: row.estado_item || 'previsto',

    etapaId: row.etapa_id || null,
    tareaId: row.tarea_id || null,
    hitoId: row.hito_id || null,
    proveedorId: row.proveedor_id || null,
    ordenCompraId: row.orden_compra_id || null,
    facturaId: row.factura_id || null,
    certificadoId: row.certificado_id || null,
    orden: row.orden ?? 0,
  }
}

function toDbPresupuestoItem(item) {
  const costoDirectoUnitario = Number(item.costoDirectoUnitario ?? item.costoPresupuestado ?? 0)
  const indirectosPct = Number(item.indirectosPct ?? 0)
  const riesgoPct = Number(item.riesgoPct ?? 0)
  const utilidadPct = Number(item.utilidadPct ?? 0)

  const precioCliente =
    costoDirectoUnitario *
    (1 + indirectosPct / 100) *
    (1 + riesgoPct / 100) *
    (1 + utilidadPct / 100)

  return {
    capitulo_id: item.capituloId,
    descripcion: item.descripcion || '',
    unidad: item.unidad || 'GLOBAL',
    cantidad: item.cantidad ?? 0,

    costo_directo_unitario: costoDirectoUnitario,
    costo_presupuestado: costoDirectoUnitario,
    indirectos_pct: indirectosPct,
    riesgo_pct: riesgoPct,
    utilidad_pct: utilidadPct,
    precio_cliente: precioCliente,

    costo_contratado: item.costoContratado ?? 0,
    costo_comprado: item.costoComprado ?? 0,
    costo_facturado: item.costoFacturado ?? 0,
    costo_pagado: item.costoPagado ?? 0,

    moneda: item.moneda || 'ARS',
    estado_item: item.estadoItem || 'previsto',

    etapa_id: item.etapaId || null,
    tarea_id: item.tareaId || null,
    hito_id: item.hitoId || null,
    proveedor_id: item.proveedorId || null,
    orden_compra_id: item.ordenCompraId || null,
    factura_id: item.facturaId || null,
    certificado_id: item.certificadoId || null,
    orden: item.orden ?? 0,
  }
}

function fromDbContratacionCliente(row) {
  return {
    id:            row.id,
    presupuestoId: row.presupuesto_id,
    descripcion:   row.descripcion || '',
    monto:         Number(row.monto || 0),
    moneda:        row.moneda || 'ARS',
    honorariosPct: Number(row.honorarios_pct || 0),
    proveedorId:   row.proveedor_id || null,
    estado:        row.estado || 'previsto',
  }
}

function fromDbGastoGeneral(row) {
  return {
    id:            row.id,
    presupuestoId: row.presupuesto_id,
    descripcion:   row.descripcion || '',
    tipo:          row.tipo || 'monto',
    monto:         Number(row.monto || 0),
    pct:           Number(row.pct || 0),
    moneda:        row.moneda || 'ARS',
  }
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function loadProjects() {
  const { data, error } = await supabase.from('projects').select('*').order('id')
  if (error) { console.error('loadProjects:', error); return [] }
  return (data || []).map(fromDbProject)
}

export async function upsertProject(project) {
  const { error } = await supabase.from('projects').upsert(toDbProject(project))
  if (error) console.error('upsertProject:', error)
}

export async function deleteProject(id) {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) console.error('deleteProject:', error)
}

// ── Cronogramas ───────────────────────────────────────────────────────────────

export async function loadCronogramasAll() {
  const { data, error } = await supabase.from('cronogramas').select('*').order('created_at')
  if (error) { console.error('loadCronogramasAll:', error); return {} }

  const result = {}
  for (const row of data || []) {
    const c = fromDbCronograma(row)
    if (!result[c.obraId]) result[c.obraId] = []
    result[c.obraId].push(c)
  }
  return result
}

export async function upsertCronograma(cronograma) {
  const { error } = await supabase.from('cronogramas').upsert(toDbCronograma(cronograma))
  if (error) console.error('upsertCronograma:', error)
}

export async function deleteCronograma(id) {
  const { error } = await supabase.from('cronogramas').delete().eq('id', id)
  if (error) console.error('deleteCronograma:', error)
}

// ── Team members ──────────────────────────────────────────────────────────────

export async function loadTeamMembers() {
  const { data, error } = await supabase.from('team_members').select('*').order('created_at')
  if (error) { console.error('loadTeamMembers:', error); return [] }
  return (data || []).map(r => ({ id: r.id, name: r.name, category: r.category }))
}

export async function upsertTeamMember(member) {
  const { error } = await supabase
    .from('team_members')
    .upsert({ id: member.id, name: member.name, category: member.category })
  if (error) console.error('upsertTeamMember:', error)
}

export async function deleteTeamMember(id) {
  const { error } = await supabase.from('team_members').delete().eq('id', id)
  if (error) console.error('deleteTeamMember:', error)
}

// ── Presupuestos ──────────────────────────────────────────────────────────────

export async function getPresupuestoVigente(proyectoId) {
  const { data, error } = await supabase
    .from('presupuestos')
    .select(`
      *,
      presupuesto_capitulos (
        *,
        presupuesto_items (*)
      ),
      contrataciones_cliente (*),
      presupuesto_gastos_generales (*)
    `)
    .eq('proyecto_id', proyectoId)
    .eq('es_version_vigente', true)
    .maybeSingle()

  if (error) {
    console.error('getPresupuestoVigente:', error)
    return null
  }

  return data ? fromDbPresupuesto(data) : null
}

export async function crearPresupuestoBase(proyectoId) {
  const { data, error } = await supabase
    .from('presupuestos')
    .insert({
      proyecto_id: proyectoId,
      numero_version: 1,
      estado_version: 'borrador',
      es_version_vigente: true,
      usd_rate: 1250,
    })
    .select()
    .single()

  if (error) {
    console.error('crearPresupuestoBase:', error)
    return null
  }

  return fromDbPresupuesto({
    ...data,
    presupuesto_capitulos: [],
    contrataciones_cliente: [],
    presupuesto_gastos_generales: [],
  })
}

export async function updatePresupuestoEstado(presupuestoId, estadoVersion) {
  const payload = {
    estado_version: estadoVersion,
    fecha_aprobacion: estadoVersion === 'aprobado' ? new Date().toISOString() : null,
  }

  const { error } = await supabase
    .from('presupuestos')
    .update(payload)
    .eq('id', presupuestoId)

  if (error) console.error('updatePresupuestoEstado:', error)
}

export async function guardarCapitulo(presupuestoId, nombre, orden = 0) {
  const { data, error } = await supabase
    .from('presupuesto_capitulos')
    .insert({
      presupuesto_id: presupuestoId,
      nombre,
      orden,
    })
    .select()
    .single()

  if (error) {
    console.error('guardarCapitulo:', error)
    return null
  }

  return fromDbPresupuestoCapitulo({
    ...data,
    presupuesto_items: [],
  })
}

export async function actualizarCapitulo(capituloId, updates) {
  const payload = {
    nombre: updates.nombre,
    etapa_id: updates.etapaId || null,
    orden: updates.orden ?? 0,
  }

  const { error } = await supabase
    .from('presupuesto_capitulos')
    .update(payload)
    .eq('id', capituloId)

  if (error) console.error('actualizarCapitulo:', error)
}

export async function eliminarCapitulo(capituloId) {
  const { error } = await supabase
    .from('presupuesto_capitulos')
    .delete()
    .eq('id', capituloId)

  if (error) console.error('eliminarCapitulo:', error)
}

export async function guardarItem(capituloId, item) {
  const payload = toDbPresupuestoItem({
    ...item,
    capituloId,
  })

  const { data, error } = await supabase
    .from('presupuesto_items')
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error('guardarItem:', error)
    return null
  }

  return fromDbPresupuestoItem(data)
}

export async function actualizarItem(itemId, item) {
  const payload = toDbPresupuestoItem(item)
  delete payload.capitulo_id

  const { data, error } = await supabase
    .from('presupuesto_items')
    .update(payload)
    .eq('id', itemId)
    .select()
    .single()

  if (error) {
    console.error('actualizarItem:', error)
    return null
  }

  return fromDbPresupuestoItem(data)
}

export async function eliminarItem(itemId) {
  const { error } = await supabase
    .from('presupuesto_items')
    .delete()
    .eq('id', itemId)

  if (error) console.error('eliminarItem:', error)
}

// ── Contrataciones cliente ────────────────────────────────────────────────────

export async function guardarContratacionCliente(presupuestoId, item) {
  const { data, error } = await supabase
    .from('contrataciones_cliente')
    .insert({
      presupuesto_id: presupuestoId,
      descripcion: item.descripcion || '',
      monto: item.monto ?? 0,
      moneda: item.moneda || 'ARS',
      honorarios_pct: item.honorariosPct ?? 0,
      proveedor_id: item.proveedorId || null,
      estado: item.estado || 'previsto',
    })
    .select()
    .single()

  if (error) {
    console.error('guardarContratacionCliente:', error)
    return null
  }

  return fromDbContratacionCliente(data)
}

export async function actualizarContratacionCliente(id, item) {
  const { data, error } = await supabase
    .from('contrataciones_cliente')
    .update({
      descripcion: item.descripcion || '',
      monto: item.monto ?? 0,
      moneda: item.moneda || 'ARS',
      honorarios_pct: item.honorariosPct ?? 0,
      proveedor_id: item.proveedorId || null,
      estado: item.estado || 'previsto',
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('actualizarContratacionCliente:', error)
    return null
  }

  return fromDbContratacionCliente(data)
}

export async function eliminarContratacionCliente(id) {
  const { error } = await supabase
    .from('contrataciones_cliente')
    .delete()
    .eq('id', id)

  if (error) console.error('eliminarContratacionCliente:', error)
}

// ── Gastos generales ──────────────────────────────────────────────────────────

export async function guardarGastoGeneral(presupuestoId, item) {
  const { data, error } = await supabase
    .from('presupuesto_gastos_generales')
    .insert({
      presupuesto_id: presupuestoId,
      descripcion: item.descripcion || '',
      tipo: item.tipo || 'monto',
      monto: item.monto ?? 0,
      pct: item.pct ?? 0,
      moneda: item.moneda || 'ARS',
    })
    .select()
    .single()

  if (error) {
    console.error('guardarGastoGeneral:', error)
    return null
  }

  return fromDbGastoGeneral(data)
}

export async function actualizarGastoGeneral(id, item) {
  const { data, error } = await supabase
    .from('presupuesto_gastos_generales')
    .update({
      descripcion: item.descripcion || '',
      tipo: item.tipo || 'monto',
      monto: item.monto ?? 0,
      pct: item.pct ?? 0,
      moneda: item.moneda || 'ARS',
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('actualizarGastoGeneral:', error)
    return null
  }

  return fromDbGastoGeneral(data)
}

export async function eliminarGastoGeneral(id) {
  const { error } = await supabase
    .from('presupuesto_gastos_generales')
    .delete()
    .eq('id', id)

  if (error) console.error('eliminarGastoGeneral:', error)
}

export async function vincularPresupuestoAProyecto(presupuestoId, proyectoArmarId) {
  const { error } = await supabase
    .from('presupuestos')
    .update({ proyecto_armar_id: proyectoArmarId || null })
    .eq('id', presupuestoId)
  if (error) console.error('vincularPresupuestoAProyecto:', error)
}

export async function loadPresupuestosResumen() {
  const { data, error } = await supabase
    .from('presupuestos')
    .select('id, proyecto_armar_id, estado_version')
    .not('proyecto_armar_id', 'is', null)
    .eq('es_version_vigente', true)
  if (error) { console.error('loadPresupuestosResumen:', error); return [] }
  return (data || []).map(r => ({
    id:              r.id,
    proyectoArmarId: r.proyecto_armar_id,
    estadoVersion:   r.estado_version || 'borrador',
  }))
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function loginUsuario(nombre, password) {
  const { data, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('nombre', nombre)
    .single()

  if (error || !data) return null

  const match = await bcrypt.compare(password, data.password_hash)
  if (!match) return null

  return { id: data.id, nombre: data.nombre }
}

export async function crearUsuario(nombre, password) {
  const hash = await bcrypt.hash(password, 10)

  const { data, error } = await supabase
    .from('usuarios')
    .insert({ nombre, password_hash: hash })
    .select()
    .single()

  if (error) {
    console.error('crearUsuario:', error)
    return null
  }

  return { id: data.id, nombre: data.nombre }
}

// ── Proyectos ARMAR ───────────────────────────────────────────────────────────

function fromDbProyectoArmar(row) {
  return {
    id:                          row.id,
    nombre:                      row.nombre                        || '',
    comitente:                   row.comitente                     || '',
    telefonoComitente:           row.telefono_comitente            || '',
    emailComitente:              row.email_comitente               || '',
    direccion:                   row.direccion                     || '',
    zona:                        row.zona                          || '',
    tipoEncargo:                 row.tipo_encargo                  || '',
    tipoObra:                    row.tipo_obra                     || '',
    estadoGeneral:               row.estado_general                || 'En análisis',
    fechaInicio:                 row.fecha_inicio                  || '',
    fechaObjetivo:               row.fecha_objetivo                || '',
    responsableArmar:            row.responsable_armar             || '',
    responsableProyecto:         row.responsable_proyecto          || '',
    responsableObra:             row.responsable_obra              || '',
    responsableAdmin:            row.responsable_admin             || '',
    arquitectoExterno:           row.arquitecto_externo            || '',
    contactoArquitectoExterno:   row.contacto_arquitecto_externo   || '',
    linkDocumentacion:           row.link_documentacion            || '',
    avanceTotal:                 row.avance_total                  ?? 0,
  }
}

function toDbProyectoArmar(p) {
  return {
    id:                          p.id,
    nombre:                      p.nombre                        ?? null,
    comitente:                   p.comitente                     ?? null,
    telefono_comitente:          p.telefonoComitente             ?? null,
    email_comitente:             p.emailComitente                ?? null,
    direccion:                   p.direccion                     ?? null,
    zona:                        p.zona                          ?? null,
    tipo_encargo:                p.tipoEncargo                   ?? null,
    tipo_obra:                   p.tipoObra                      ?? null,
    estado_general:              p.estadoGeneral                 || 'En análisis',
    fecha_inicio:                p.fechaInicio                   || null,
    fecha_objetivo:              p.fechaObjetivo                 || null,
    responsable_armar:           p.responsableArmar              ?? null,
    responsable_proyecto:        p.responsableProyecto           ?? null,
    responsable_obra:            p.responsableObra               ?? null,
    responsable_admin:           p.responsableAdmin              ?? null,
    arquitecto_externo:          p.arquitectoExterno             ?? null,
    contacto_arquitecto_externo: p.contactoArquitectoExterno     ?? null,
    link_documentacion:          p.linkDocumentacion             ?? null,
    avance_total:                p.avanceTotal                   ?? 0,
  }
}

function fromDbChecklistItem(row) {
  return {
    id:            row.id,
    proyectoArmarId: row.proyecto_armar_id,
    etapa:         row.etapa         || '',
    titulo:        row.titulo        || '',
    descripcion:   row.descripcion   || '',
    obligatorio:   row.obligatorio   ?? false,
    aplica:        row.aplica        ?? true,
    estado:        row.estado        || 'no_iniciado',
    responsable:   row.responsable   || '',
    fechaObjetivo: row.fecha_objetivo || '',
    observaciones: row.observaciones || '',
    linkAdjunto:   row.link_adjunto  || '',
    fechaCierre:   row.fecha_cierre  || '',
    peso:          row.peso          ?? 1,
    orden:         row.orden         ?? 0,
  }
}

function toDbChecklistItem(item) {
  const out = {
    proyecto_armar_id: item.proyectoArmarId,
    etapa:            item.etapa         || '',
    titulo:           item.titulo        || '',
    descripcion:      item.descripcion   || '',
    obligatorio:      item.obligatorio   ?? false,
    aplica:           item.aplica        ?? true,
    estado:           item.estado        || 'no_iniciado',
    responsable:      item.responsable   || '',
    fecha_objetivo:   item.fechaObjetivo || null,
    observaciones:    item.observaciones || '',
    link_adjunto:     item.linkAdjunto   || '',
    fecha_cierre:     item.fechaCierre   || null,
    peso:             item.peso          ?? 1,
    orden:            item.orden         ?? 0,
  }
  if (item.id !== undefined) out.id = item.id
  return out
}

export async function loadProyectosArmar() {
  const { data, error } = await supabase
    .from('proyectos_armar')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) { console.error('loadProyectosArmar:', error); return [] }
  return (data || []).map(fromDbProyectoArmar)
}

export async function upsertProyectoArmar(proyecto) {
  const { data, error } = await supabase
    .from('proyectos_armar')
    .upsert(toDbProyectoArmar(proyecto))
    .select()
    .single()
  if (error) { console.error('upsertProyectoArmar:', error); return null }
  return fromDbProyectoArmar(data)
}

export async function deleteProyectoArmar(id) {
  const { error } = await supabase.from('proyectos_armar').delete().eq('id', id)
  if (error) console.error('deleteProyectoArmar:', error)
}

export async function loadChecklistItems(proyectoArmarId) {
  const { data, error } = await supabase
    .from('proyecto_checklist_items')
    .select('*')
    .eq('proyecto_armar_id', proyectoArmarId)
    .order('orden')
  if (error) { console.error('loadChecklistItems:', error); return [] }
  return (data || []).map(fromDbChecklistItem)
}

export async function upsertChecklistItem(item) {
  const { data, error } = await supabase
    .from('proyecto_checklist_items')
    .upsert(toDbChecklistItem(item))
    .select()
    .single()
  if (error) { console.error('upsertChecklistItem:', error); return null }
  return fromDbChecklistItem(data)
}

export async function deleteChecklistItem(id) {
  const { error } = await supabase.from('proyecto_checklist_items').delete().eq('id', id)
  if (error) console.error('deleteChecklistItem:', error)
}

export async function insertChecklistItems(items) {
  if (!items.length) return []
  const payload = items.map(toDbChecklistItem)
  console.log('[insertChecklistItems] inserting', payload.length, 'items, proyecto_armar_id:', payload[0]?.proyecto_armar_id)
  const { data, error } = await supabase
    .from('proyecto_checklist_items')
    .insert(payload)
    .select()
  if (error) {
    console.error('[insertChecklistItems] ERROR:', error.message, error.details, error.hint, error.code)
    return []
  }
  console.log('[insertChecklistItems] OK — insertados:', data?.length)
  return (data || []).map(fromDbChecklistItem)
}

// ── Calendario Eventos ────────────────────────────────────────────────────────

function fromDbCalendarioEvento(row) {
  return {
    id:              row.id,
    proyectoArmarId: row.proyecto_armar_id || null,
    obraId:          row.obra_id ? Number(row.obra_id) : null,
    cronogramaId:    row.cronograma_id || null,
    presupuestoId:   row.presupuesto_id || null,
    origen:          row.origen || 'manual',
    tipoEvento:      row.tipo_evento || 'hito',
    titulo:          row.titulo || '',
    descripcion:     row.descripcion || '',
    fecha:           row.fecha || '',
    estado:          row.estado || 'pendiente',
  }
}

function toDbCalendarioEvento(e) {
  const out = {
    proyecto_armar_id: e.proyectoArmarId || null,
    obra_id:           e.obraId || null,
    cronograma_id:     e.cronogramaId || null,
    presupuesto_id:    e.presupuestoId || null,
    origen:            e.origen || 'manual',
    tipo_evento:       e.tipoEvento || 'hito',
    titulo:            e.titulo || '',
    descripcion:       e.descripcion || '',
    fecha:             e.fecha || null,
    estado:            e.estado || 'pendiente',
  }
  if (e.id) out.id = e.id
  return out
}

export async function loadCalendarioEventos() {
  const { data, error } = await supabase.from('calendario_eventos').select('*').order('fecha', { ascending: true })
  if (error) { console.error('loadCalendarioEventos:', error); return [] }
  return (data || []).map(fromDbCalendarioEvento)
}

export async function upsertCalendarioEvento(evento) {
  const { data, error } = await supabase.from('calendario_eventos').upsert(toDbCalendarioEvento(evento)).select().single()
  if (error) { console.error('upsertCalendarioEvento:', error); return null }
  return fromDbCalendarioEvento(data)
}

export async function deleteCalendarioEvento(id) {
  const { error } = await supabase.from('calendario_eventos').delete().eq('id', id)
  if (error) console.error('deleteCalendarioEvento:', error)
}
