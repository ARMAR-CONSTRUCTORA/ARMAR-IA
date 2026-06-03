// Feriados inamovibles de Argentina (MM-DD)
const FERIADOS_AR = new Set([
  '01-01', '03-24', '04-02', '05-01', '05-25',
  '06-20', '07-09', '08-17', '10-12', '11-20',
  '12-08', '12-25',
])

export function esHabil(dateOrStr) {
  const d = dateOrStr instanceof Date ? dateOrStr : new Date(dateOrStr + 'T00:00:00')
  const dow = d.getDay()
  if (dow === 0 || dow === 6) return false
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return !FERIADOS_AR.has(`${mm}-${dd}`)
}

// Calcula la fecha de fin dado un inicio y N días hábiles (el inicio cuenta como día 1 si es hábil)
export function calcFechaFin(fechaInicio, diasHabiles) {
  if (!fechaInicio) return ''
  if (diasHabiles <= 0) return fechaInicio
  let cur = new Date(fechaInicio + 'T00:00:00')
  while (!esHabil(cur)) cur.setDate(cur.getDate() + 1)
  let counted = 1
  while (counted < diasHabiles) {
    cur.setDate(cur.getDate() + 1)
    if (esHabil(cur)) counted++
  }
  return cur.toISOString().split('T')[0]
}

// Cuenta días hábiles entre dos fechas (inclusive)
export function calcDuracionHabil(fechaInicio, fechaFin) {
  if (!fechaInicio || !fechaFin) return 0
  const start = new Date(fechaInicio + 'T00:00:00')
  const end   = new Date(fechaFin   + 'T00:00:00')
  if (end < start) return 0
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    if (esHabil(cur)) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

// Avanza N días hábiles desde una fecha (sin incluir la fecha base)
export function addBusinessDays(fechaStr, n) {
  if (!fechaStr || n <= 0) return fechaStr || ''
  let cur = new Date(fechaStr + 'T00:00:00')
  let added = 0
  while (added < n) {
    cur.setDate(cur.getDate() + 1)
    if (esHabil(cur)) added++
  }
  return cur.toISOString().split('T')[0]
}

// Calcula el corrimiento en cadena dado una tarea modificada
// Devuelve { impactados: [...], updatedMap: Map<id, tarea> }
export function computeCascade(tareas, changedTarea) {
  const impactados = []
  const updatedMap = new Map()
  updatedMap.set(changedTarea.id, changedTarea)

  const queue = [changedTarea.id]
  const visited = new Set()

  while (queue.length > 0) {
    const predId = queue.shift()
    if (visited.has(predId)) continue
    visited.add(predId)

    const pred = updatedMap.get(predId) || tareas.find(t => t.id === predId)
    if (!pred) continue

    const deps = tareas.filter(t => t.dependeDeId === predId)
    for (const dep of deps) {
      if (visited.has(dep.id)) continue

      const desfase = dep.desfaseDias || 0
      let newFI
      if ((dep.tipoVinculo || 'Fin a inicio') === 'Inicio a inicio') {
        newFI = desfase > 0 ? addBusinessDays(pred.fechaInicio, desfase) : pred.fechaInicio
      } else {
        // Fin a inicio: empieza el siguiente día hábil después del fin del predecesor + desfase
        newFI = addBusinessDays(pred.fechaFin, 1 + desfase)
      }

      const newFF = calcFechaFin(newFI, Math.max(1, dep.duracionDias || 1))
      const updatedDep = { ...dep, fechaInicio: newFI, fechaFin: newFF }
      updatedMap.set(dep.id, updatedDep)

      impactados.push({
        id: dep.id,
        nombre: dep.nombre,
        fechaInicioAnterior: dep.fechaInicio,
        fechaInicioNueva: newFI,
        fechaFinAnterior: dep.fechaFin,
        fechaFinNueva: newFF,
        esCritica: !!dep.esCritica,
      })

      queue.push(dep.id)
    }
  }

  return { impactados, updatedMap }
}
