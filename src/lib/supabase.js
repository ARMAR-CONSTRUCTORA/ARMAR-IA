import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// ── Mappers DB ↔ App ──────────────────────────────────────────────────────────

function fromDbProject(row) {
  return {
    id:          row.id,
    name:        row.name,
    location:    row.location    || '',
    startDate:   row.start_date  || '',
    endDate:     row.end_date    || '',
    progress:    row.progress    ?? 0,
    responsible: row.responsible || '',
    contratista: row.contratista || '',
    proyecto:    row.proyecto    || '',
    status:      row.status      || 'activa',
    tasks:       row.tasks       || [],
  }
}

function toDbProject(p) {
  return {
    id:          p.id,
    name:        p.name,
    location:    p.location    ?? null,
    start_date:  p.startDate   ?? null,
    end_date:    p.endDate     ?? null,
    progress:    p.progress    ?? 0,
    responsible: p.responsible ?? null,
    contratista: p.contratista ?? null,
    proyecto:    p.proyecto    ?? null,
    status:      p.status      || 'activa',
    tasks:       p.tasks       || [],
  }
}

function fromDbCronograma(row) {
  return {
    id:                   row.id,
    obraId:               row.obra_id,
    nombre:               row.nombre               || '',
    creadoEn:             row.creado_en            || '',
    autorCronograma:      row.autor_cronograma     || '',
    contratistaPrincipal: row.contratista_principal || '',
    tareas:               row.tareas               || [],
    informes:             row.informes             || [],
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
