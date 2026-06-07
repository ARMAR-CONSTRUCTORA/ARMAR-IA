import { calcFechaFin, calcDuracionHabil, addBusinessDays } from '../utils/calendarUtils'

// ── Helpers de construcción ───────────────────────────────────────────────────
const e = (nombre, duracionDias, pesoRelativo, tareas = []) =>
  ({ nombre, duracionDias, pesoRelativo, esCritica: false, tareas })
const t = (nombre, duracionDias, pesoRelativo) =>
  ({ nombre, duracionDias, pesoRelativo })

// ── Plantillas ────────────────────────────────────────────────────────────────
export const CRONOGRAMA_TEMPLATES = [
  {
    id: 'vivienda',
    nombre: 'Vivienda unifamiliar',
    icono: '🏠',
    descripcion: 'Construcción de vivienda desde cero, obra nueva completa.',
    duracionEstimada: '8–12 meses',
    etapas: [
      e('Inicio de obra',              3,  2),
      e('Movimiento de suelo',          7,  3),
      e('Fundaciones',                 20,  8, [
        t('Excavación',                 5, 25),
        t('Armado de hierro',           5, 25),
        t('Encofrado',                  5, 25),
        t('Hormigonado',                5, 25),
      ]),
      e('Estructura',                  30, 12),
      e('Mampostería',                 20,  8),
      e('Cubierta',                    15,  6),
      e('Instalación sanitaria',       15,  6),
      e('Instalación eléctrica',       15,  6),
      e('Instalación gas',             10,  4),
      e('Revoques',                    20,  7),
      e('Contrapisos y carpetas',      10,  4),
      e('Cielorrasos',                 10,  4),
      e('Revestimientos',              15,  5),
      e('Solados',                     15,  5),
      e('Carpinterías',                10,  4),
      e('Pintura',                     15,  5),
      e('Equipamiento',                 7,  3),
      e('Exterior / parquización',     10,  3),
      e('Repasos',                      5,  2),
      e('Entrega',                      3,  1),
    ],
  },
  {
    id: 'reforma',
    nombre: 'Reforma residencial',
    icono: '🔧',
    descripcion: 'Reforma y renovación integral de vivienda existente.',
    duracionEstimada: '3–6 meses',
    etapas: [
      e('Relevamiento y proyecto',     5,  5),
      e('Demoliciones y retiro',       7,  8),
      e('Refuerzos estructurales',    10,  8),
      e('Albañilería',                15, 12),
      e('Instalación sanitaria',      10, 10),
      e('Instalación eléctrica',      10, 10),
      e('Revoques y yesos',           15, 10),
      e('Contrapisos y carpetas',      8,  8),
      e('Revestimientos',             10,  8),
      e('Carpinterías',                8,  8),
      e('Pintura',                    10,  8),
      e('Entrega',                     3,  5),
    ],
  },
  {
    id: 'local_comercial',
    nombre: 'Local comercial',
    icono: '🏪',
    descripcion: 'Habilitación y equipamiento de local comercial.',
    duracionEstimada: '3–5 meses',
    etapas: [
      e('Relevamiento y replanteo',   3,  3),
      e('Demoliciones',               7,  6),
      e('Albañilería',               20, 12),
      e('Instalación sanitaria',     10,  8),
      e('Instalación eléctrica',     10,  8),
      e('Gas / ventilaciones',        8,  7),
      e('Climatización',              7,  6),
      e('Cielorrasos',                8,  6),
      e('Pisos y revestimientos',    15, 10),
      e('Carpinterías / herrerías',  10,  8),
      e('Equipamiento fijo',          7,  7),
      e('Pintura',                    8,  6),
      e('Gráfica / imagen comercial', 5,  4),
      e('Habilitación / pruebas',     7,  6),
      e('Entrega',                    2,  3),
    ],
  },
  {
    id: 'local_gastro',
    nombre: 'Local gastronómico',
    icono: '🍽️',
    descripcion: 'Restaurante, bar o local gastronómico con cocina industrial.',
    duracionEstimada: '3–5 meses',
    etapas: [
      e('Relevamiento y replanteo',    3,  3),
      e('Demoliciones',                7,  6),
      e('Albañilería',                20, 10),
      e('Instalación sanitaria',      10,  8),
      e('Instalación eléctrica',      10,  8),
      e('Gas / ventilaciones',         8,  7),
      e('Climatización',               7,  6),
      e('Extracción / equipos cocina',10,  8),
      e('Cielorrasos',                 8,  5),
      e('Pisos y revestimientos',     15,  8),
      e('Carpinterías / herrerías',   10,  7),
      e('Equipamiento fijo',           7,  7),
      e('Pintura',                     8,  5),
      e('Gráfica / imagen comercial',  5,  4),
      e('Habilitación / pruebas',      7,  6),
      e('Entrega',                     2,  2),
    ],
  },
  {
    id: 'oficina',
    nombre: 'Oficina',
    icono: '🏢',
    descripcion: 'Acondicionamiento y equipamiento de espacio de oficinas.',
    duracionEstimada: '2–4 meses',
    etapas: [
      e('Relevamiento y diseño',       5,  5),
      e('Demoliciones',                5,  6),
      e('Tabiquería',                 10, 10),
      e('Instalación eléctrica / datos',12,12),
      e('Climatización',               7, 10),
      e('Cielorrasos',                 8, 10),
      e('Pisos',                       8, 10),
      e('Carpinterías y vidrios',      7, 10),
      e('Pintura',                     8, 10),
      e('Mobiliario y entrega',        5,  7),
    ],
  },
  {
    id: 'obra_menor',
    nombre: 'Obra menor',
    icono: '🔨',
    descripcion: 'Trabajos menores, ampliaciones o refacciones puntuales.',
    duracionEstimada: '1–2 meses',
    etapas: [
      e('Relevamiento',    2,  5),
      e('Demolición parcial',3, 10),
      e('Obra civil',     10, 30),
      e('Instalaciones',   7, 25),
      e('Terminaciones',   8, 20),
      e('Entrega',         1, 10),
    ],
  },
]

// ── Generación de tareas desde plantilla (usa días hábiles) ───────────────────
export function generarTareasDesdeTemplate(template, etapasIncluidas, projectId, fechaInicio, fechaFin) {
  const included = template.etapas.filter(et => etapasIncluidas.includes(et.nombre))
  if (!included.length) return []

  const totalHabilRange   = Math.max(1, calcDuracionHabil(fechaInicio, fechaFin))
  const totalDiasTemplate = included.reduce((s, et) => s + et.duracionDias, 0)

  const tareas = []
  let idCounter = 1
  let cursor = fechaInicio

  for (const etapa of included) {
    const etapaId  = idCounter++
    const durEtapa = Math.max(1, Math.round(etapa.duracionDias / Math.max(1, totalDiasTemplate) * totalHabilRange))
    const finEtapa = calcFechaFin(cursor, durEtapa)

    tareas.push({
      id: etapaId, obraId: projectId, parentId: null,
      nombre: etapa.nombre, tipo: 'etapa',
      fechaInicio: cursor, fechaFin: finEtapa,
      duracionDias: durEtapa, responsable: '',
      avanceActual: 0, estado: 'Pendiente',
      pesoRelativo: etapa.pesoRelativo,
      dependeDeId: null, esCritica: false,
      tipoVinculo: 'Fin a inicio', desfaseDias: 0,
    })

    if (etapa.tareas.length) {
      const totalSubDias = etapa.tareas.reduce((s, st) => s + st.duracionDias, 0)
      let subCursor = cursor
      for (const sub of etapa.tareas) {
        const subId  = idCounter++
        const durSub = Math.max(1, Math.round(sub.duracionDias / Math.max(1, totalSubDias) * durEtapa))
        const finSub = calcFechaFin(subCursor, durSub)
        tareas.push({
          id: subId, obraId: projectId, parentId: etapaId,
          nombre: sub.nombre, tipo: 'subtarea',
          fechaInicio: subCursor, fechaFin: finSub,
          duracionDias: durSub, responsable: '',
          avanceActual: 0, estado: 'Pendiente',
          pesoRelativo: sub.pesoRelativo,
          dependeDeId: null, esCritica: false,
          tipoVinculo: 'Fin a inicio', desfaseDias: 0,
        })
        subCursor = addBusinessDays(finSub, 1)
      }
    }

    cursor = addBusinessDays(finEtapa, 1)
  }
  return tareas
}

// ── Cálculos de avance ────────────────────────────────────────────────────────
export function calcAvanceEtapa(tareas, etapaId) {
  const children = tareas.filter(t => t.parentId === etapaId)
  if (!children.length) {
    const et = tareas.find(t => t.id === etapaId)
    return et ? et.avanceActual : 0
  }
  const totalPeso = children.reduce((s, t) => s + (t.pesoRelativo || 1), 0)
  return Math.round(
    children.reduce((s, t) => s + t.avanceActual * (t.pesoRelativo || 1), 0) / Math.max(1, totalPeso)
  )
}

export function calcAvanceGeneral(tareas) {
  const raices = tareas.filter(t => t.parentId === null)
  if (!raices.length) return 0
  const totalPeso = raices.reduce((s, t) => s + (t.pesoRelativo || 1), 0)
  return Math.round(
    raices.reduce((s, t) => {
      const av = calcAvanceEtapa(tareas, t.id)
      return s + av * (t.pesoRelativo || 1)
    }, 0) / Math.max(1, totalPeso)
  )
}

export function estadoFromAvance(avance) {
  if (avance === 0)   return 'Pendiente'
  if (avance === 100) return 'Finalizada'
  return 'En curso'
}
