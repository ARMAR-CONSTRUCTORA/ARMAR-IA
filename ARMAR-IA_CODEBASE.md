# ARMAR-IA — Documentación completa del codebase
> Versión: junio 2026 · Para uso con IA colaborativa

---

## 1. Resumen ejecutivo

**ARMAR-IA** es una aplicación web SPA de gestión de obras de construcción para la empresa ARMAR. Cubre el ciclo completo: proyectos → presupuestos → obras → cronogramas → ejecución → calendario.

- **URL producción**: Vercel (repo `ARMAR-CONSTRUCTORA/ARMAR-IA`)
- **Stack**: React 18 + Vite, CSS inline, Supabase (PostgreSQL + RLS), sin router, sin Tailwind, sin librerías de UI
- **Idioma UI**: español (Argentina)
- **Autenticación**: login propio con tabla `usuarios` + bcryptjs (no usa Supabase Auth)
- **Realtime**: Supabase Realtime en tablas `projects`, `cronogramas`, `team_members`, `calendario_eventos`

---

## 2. Stack y dependencias

```json
{
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "@supabase/supabase-js": "^2.107.0",
  "bcryptjs": "^3.0.3",
  "jspdf": "^4.2.1",
  "html2canvas": "^1.4.1",
  "exceljs": "^4.4.0",
  "xlsx": "^0.18.5",
  "vite": "^5.4.0"
}
```

Variables de entorno requeridas (`.env`):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## 3. Estructura de carpetas

```
ARMAR-IA/
├── src/
│   ├── App.jsx                      # Estado global, routing por estado, handlers de datos
│   ├── main.jsx                     # Entry point
│   ├── index.css                    # Variables CSS globales (:root)
│   ├── components/
│   │   ├── Dashboard.jsx            # Métricas consolidadas de todos los módulos
│   │   ├── ProjectList.jsx          # Lista de obras (CRUD completo)
│   │   ├── ProjectModal.jsx         # Modal crear/editar obra
│   │   ├── CronogramasPage.jsx      # Vista general de cronogramas por obra
│   │   ├── CronogramaTab.jsx        # ★ Gantt + certificados + informes + exportar PDF
│   │   ├── ModalCrearCronograma.jsx # Wizard 3 pasos para nuevo cronograma
│   │   ├── ModalEditarEtapa.jsx     # Edición de etapas y subetapas del Gantt
│   │   ├── ModalCargarAvance.jsx    # Carga de informe de avance
│   │   ├── ModalDetalleHito.jsx     # Detalle de hito
│   │   ├── PresupuestosTab.jsx      # Presupuestos por obra (vistas cliente/interno/comparar)
│   │   ├── ProyectosPage.jsx        # Proyectos ARMAR con checklist operativo
│   │   ├── CalendarioPage.jsx       # Calendario con eventos automáticos y manuales
│   │   ├── EquipoPage.jsx           # Gestión de equipo por obra
│   │   ├── DocumentosPage.jsx       # Documentos (UI lista, sin upload real aún)
│   │   ├── ConfigPage.jsx           # Configuración de cuenta
│   │   ├── Sidebar.jsx              # Navegación lateral (240px desktop, drawer mobile)
│   │   ├── TopBar.jsx               # Barra superior con título y usuario
│   │   ├── LoginModal.jsx           # Modal de login (usuario/contraseña)
│   │   ├── LocationAutocomplete.jsx # Autocomplete de ubicación (Google Places-style)
│   │   ├── Navbar.jsx               # Navbar alternativa (mobile)
│   │   └── Toast.jsx                # Notificaciones toast
│   ├── data/
│   │   ├── cronogramaTemplates.js   # Plantillas predefinidas de cronograma
│   │   ├── sampleData.js            # Datos de muestra
│   │   └── templateStorage.js      # Plantillas en localStorage
│   ├── hooks/
│   │   └── useBreakpoint.js         # { isDesktop, isMobile } basado en window.innerWidth
│   ├── lib/
│   │   └── supabase.js              # Cliente Supabase + todos los mappers DB↔App + helpers CRUD
│   └── utils/
│       └── calendarUtils.js         # calcFechaFin, addBusinessDays (días hábiles lun-vie)
```

---

## 4. Navegación y routing

No hay React Router. La navegación se maneja con estado `activePage` en `App.jsx`:

```js
const [activePage, setActivePage] = useState('dashboard')
```

| `activePage` | Componente | Grupo |
|---|---|---|
| `dashboard` | `Dashboard` | — |
| `obras` | `ProjectList` | PRINCIPAL |
| `proyectos` | `ProyectosPage` | PRINCIPAL |
| `cronogramas` | `CronogramasPage` | PRINCIPAL |
| `presupuestos` | `PresupuestosTab` | PRINCIPAL |
| `equipo` | `EquipoPage` | GESTIÓN |
| `calendario` | `CalendarioPage` | GESTIÓN |
| `documentos` | `DocumentosPage` | GESTIÓN |
| `configuracion` | `ConfigPage` | GESTIÓN |

---

## 5. Estado global (App.jsx)

```js
// Datos
const [projects, setProjects]               = useState([])
const [teamMembers, setTeamMembers]         = useState([])
const [cronogramas, setCronogramas]         = useState({})   // { [obraId]: cronograma }
const [proyectosArmar, setProyectosArmar]   = useState([])
const [calendarioEventos, setCalendarioEventos] = useState([])
const [presupuestos, setPresupuestos]       = useState([])
const [obraHitos, setObraHitos]             = useState([])

// UI
const [currentUser, setCurrentUser]         = useState(null)  // sessionStorage
const [activePage, setActivePage]           = useState('dashboard')
const [loading, setLoading]                 = useState(true)
const [toast, setToast]                     = useState(null)
const isEditor = currentUser !== null
```

Realtime activo: `projects`, `cronogramas`, `team_members`, `calendario_eventos`.

---

## 6. Base de datos Supabase

### Tablas

| Tabla | PK tipo | Descripción |
|---|---|---|
| `projects` | `bigint` | Obras de construcción |
| `cronogramas` | `text` | Cronogramas (JSONB: tareas, informes, certificados) |
| `team_members` | `uuid` | Integrantes de equipo por obra |
| `usuarios` | `uuid` | Usuarios con acceso editor |
| `presupuestos` | `uuid` | Presupuestos por proyecto |
| `presupuesto_capitulos` | `uuid` | Capítulos del presupuesto |
| `presupuesto_items` | `uuid` | Ítems de cada capítulo |
| `presupuesto_gastos_generales` | `uuid` | GG y honorarios |
| `contrataciones_cliente` | `uuid` | Contrataciones directas del cliente |
| `proyectos_armar` | `uuid` | Proyectos de la empresa ARMAR |
| `proyecto_checklist_items` | `uuid` | Ítems del checklist operativo |
| `calendario_eventos` | `uuid` | Eventos del calendario |
| `hitos` | `uuid` | Hitos de obra |

### Relaciones clave

```
projects.proyecto_armar_id          → proyectos_armar.id
presupuestos.proyecto_armar_id      → proyectos_armar.id
proyecto_checklist_items.proyecto_armar_id → proyectos_armar.id
calendario_eventos.obra_id          → projects.id (bigint)
calendario_eventos.cronograma_id    → cronogramas.id (text)
calendario_eventos.proyecto_armar_id → proyectos_armar.id
calendario_eventos.presupuesto_id   → presupuestos.id
```

### Estructura JSONB: `cronogramas`

```js
{
  id: string,
  obraId: number,
  nombre: string,
  creadoEn: string,
  autorCronograma: string,
  contratistaPrincipal: string,
  tareas: [
    {
      id: number,
      nombre: string,
      parentId: number | null,     // null = etapa, number = subetapa
      fechaInicio: string,         // 'YYYY-MM-DD'
      fechaFin: string,
      duracionDias: number,        // días hábiles
      avanceActual: number,        // 0-100
      pesoRelativo: number,        // % incidencia
      presupuesto: number | null,
      adicionales: [{ id, motivo, monto }],
      dependeDeId: number | null,
      desfaseDias: number,
      tipoVinculo: string,
      esCritica: boolean,
      estado: string,              // 'Pendiente' | 'En curso' | 'Finalizado'
      responsable: string,
      color: string,               // hex, solo en etapas (parentId===null)
    }
  ],
  informes: [
    {
      id: string,
      fecha: string,
      avances: { [tareaId]: number },
      montoEstimado: number,
      observaciones: string,
      certificadoId: string | null,
    }
  ],
  certificados: [
    {
      id: string,
      numero: number,
      fecha: string,
      informeId: string,
      montoBase: number,
      ajuste: number,
      montoCertificado: number,
      tareaId: number | null,
    }
  ]
}
```

---

## 7. Módulo CRONOGRAMAS — `CronogramaTab.jsx` ★

El componente más complejo del sistema (~2350 líneas).

### Sub-componentes internos

| Nombre | Descripción |
|---|---|
| `TablaGantt` | Tabla Gantt con scroll horizontal, barras, dependencias SVG |
| `StatsPanel` | Panel lateral con donut, resumen financiero, próximo hito |
| `HistorialInformes` | Lista de informes y certificados |
| `ModalExportarPDF` | Modal de selección de columnas para exportar |
| `ModalEliminarCronograma` | Confirmación de borrado |
| `ModalImpacto` | Muestra impacto en cascada de cambios de fechas |
| `ModalEditarInforme` | Edición de informe de avance existente |
| `DonutChart` | Gráfico de avance circular (SVG puro) |

### Gantt — zoom levels

```js
const PPD_LEVELS = [
  { val: 0.65, label: 'Trimestral' },
  { val: 2.6,  label: 'Mensual'    },
  { val: 5.5,  label: 'Semanal'    },
  { val: 12,   label: 'Diario'     },
]
```

`ppd` = pixels por día. El zoom cambia con botones `+`/`−`.

### Gantt — columnas configurables

```js
const PDF_COLUMNAS = [
  { key: 'fin',          label: 'Fin Est.' },
  { key: 'duracion',     label: 'Duración' },
  { key: 'avance',       label: 'Avance'   },
  { key: 'estado',       label: 'Estado'   },
  { key: 'presupuesto',  label: 'Presupuesto' },
  { key: 'adicionales',  label: 'Adicionales' },
  { key: 'subtotal',     label: 'Subtotal' },
  { key: 'pagos',        label: 'Pagos'    },
  { key: 'saldo',        label: 'Saldo'    },
]
```

### Gantt — modelo de presupuesto

- **Subetapas**: guardan `presupuesto` (base) y `adicionales[]` propios
- **Etapas**: no guardan presupuesto propio; muestran la suma de sus subetapas en render
- Cálculo display:
  ```js
  dispPresup = subs.length > 0 ? subs.reduce((s,t) => s + (t.presupuesto||0), 0) : tarea.presupuesto
  adic = subs.length > 0 ? subs.reduce((s,t) => s + calcTotalAdicionales(t), 0) : calcTotalAdicionales(tarea)
  ```

### Exportar PDF (`exportarPDF`)

Generación 100% programática con jsPDF (sin html2canvas):

- **Página 1**: A3 portrait (297×420mm) — resumen con nombre, inicio, fin, avance y barras Gantt. Row height adaptativo para entrar todo en una hoja.
- **Páginas 2+**: A3 landscape (420×297mm) — detalle con todas las columnas seleccionadas, texto con wrapping a 2 líneas, barras de progreso, línea "hoy" naranja, grid semanal discontinuo.

Columnas detail: nombre (90mm) + columnas visibles + Gantt (≈163mm).
Columnas summary: nombre (72mm) + inicio/fin/avance + Gantt.

### Dependencias entre tareas

- `dependeDeId`: ID de la tarea predecesora
- `desfaseDias`: días hábiles de desfase tras el fin de la predecesora
- Las flechas se dibujan como SVG overlay (`data-gantt-arrows`)
- `calcFechaFin` y `addBusinessDays` en `calendarUtils.js`

---

## 8. Módulo PROYECTOS — `ProyectosPage.jsx`

### Tipos de encargo

1. `"Proyecto + Dirección + Construcción ARMAR"` → Checklist Plantilla A
2. `"Obra sobre proyecto externo"` → modalidad `"Dirección + construcción"` o `"Solo construcción"` → Checklist Plantilla B

### Checklist Plantilla A (4 etapas)
1. Alta y encuadre
2. Viabilidad
3. Anteproyecto
4. Proyecto Ejecutivo + Presupuesto final + Transferencia a obra ← **compuerta**

### Checklist Plantilla B (4 etapas)
1. Alta y encuadre
2. Documentación externa y validación básica
3. Presupuesto y contratación
4. Planificación de obra ← **compuerta**

### Estados de ítem
`no_iniciado` | `en_curso` | `pendiente_cliente` | `pendiente_proveedor` | `pendiente_municipio` | `bloqueado` | `revisado` | `aprobado` | `no_aplica`

**Ítem completo**: `aprobado`, `revisado`, `no_aplica`

**Compuerta**: botón "Crear/vincular obra" aparece cuando el último ítem de la última etapa está en estado `aprobado`.

---

## 9. Módulo PRESUPUESTOS — `PresupuestosTab.jsx`

- **Vistas**: 👤 Cliente / 🔒 Interno / ⚖️ Comparar
- **Capítulos** = etapas del cronograma vinculado
- **Ítems**: descripción, unidad, cantidad, precio cliente, precio interno, moneda ARS/USD
- **Estados**: `borrador` → `enviado_cliente` → `aprobado`
- Al aprobar → actualiza checklist del proyecto ARMAR vinculado
- `usdRate` configurable por presupuesto (default 1250)

---

## 10. Módulo CALENDARIO — `CalendarioPage.jsx`

### Eventos automáticos generados desde

| Origen | Evento |
|---|---|
| Proyectos | kickoff, anteproyecto aprobado, transferencia a obra |
| Presupuestos | presupuesto aprobado |
| Cronogramas | inicio de obra, informes de avance |

### Colores por origen
- `proyecto` → naranja `#E8641A`
- `presupuesto` → azul `#2563EB`
- `cronograma` → verde `#2D7A4F`
- `manual` → gris `#6B7280`

---

## 11. Módulo OBRAS — `ProjectList.jsx`

Campos de una obra (`projects`):

```js
{
  id, name, location, startDate, endDate, progress, responsible,
  responsableProyecto, contratista, proyecto, status,
  tipoObra, arquitectoProyecto, contactoArquitecto,
  linkDocumentacion, proyectoArmarId
}
```

Estados: `activa` | `finalizada` | `pausada`

---

## 12. Módulo EQUIPO — `EquipoPage.jsx`

- Miembros por obra (`team_members`)
- Campos: nombre, rol, contacto, obra vinculada

---

## 13. Sistema de colores

### Variables CSS globales (`index.css`)

```css
:root {
  --orange: #F97316;
  --orange-dark: #EA6C0A;
  --orange-light: #FED7AA;
  --gray-900: #111827;
  --gray-800: #1F2937;
  --gray-700: #374151;
  --gray-600: #4B5563;
  --gray-500: #6B7280;
  --gray-400: #9CA3AF;
  --gray-200: #E5E7EB;
  --gray-100: #F3F4F6;
  --green: #10B981;
  --green-light: #D1FAE5;
  --red: #EF4444;
  --red-light: #FEE2E2;
  --blue: #3B82F6;
  --blue-light: #DBEAFE;
}
```

### Constantes locales en componentes (CLAUDE.md pattern)

```js
const orange      = "#E8641A"
const orangeLight = "#FFF3EB"
const dark        = "#1A1A1A"
const mid         = "#444"
const light       = "#F7F7F5"
const border      = "#E0DDD8"
const green       = "#2D7A4F"
const red         = "#C0392B"
const blue        = "#2563EB"
```

### Paleta de colores de etapas Gantt (20 colores)

```js
const ETAPA_COLORS = [
  '#F97316','#E8641A','#EAB308','#84CC16','#10B981',
  '#06B6D4','#3B82F6','#6366F1','#8B5CF6','#A855F7',
  '#EC4899','#F43F5E','#DC2626','#92400E','#78716C',
  '#6B7280','#0F766E','#0369A1','#1D4ED8','#15803D',
]
```

---

## 14. Autenticación

- Tabla `usuarios` con campo `password_hash` (bcryptjs)
- Login guarda usuario en `sessionStorage` con clave `'armar-ia-user'`
- `isEditor = currentUser !== null`
- Usuarios no autenticados: solo lectura (sin botones de edición/creación)

---

## 15. Responsive

```js
// useBreakpoint.js
const isDesktop = window.innerWidth >= 1024
const isMobile  = window.innerWidth < 768
```

- Sidebar: fija 240px en desktop, drawer en mobile
- Gantt: scroll horizontal nativo

---

## 16. Flujo operativo completo

```
1. PROYECTOS  → checklist automático según tipo de encargo
2. PRESUPUESTOS → vinculado al proyecto → al aprobar actualiza checklist
3. OBRAS      → creada desde proyecto (hereda datos) o vinculada manualmente
4. CRONOGRAMAS → vinculado a la obra → al crear actualiza checklist
5. EJECUCIÓN  → informes de avance + certificados de pago
6. CALENDARIO → eventos automáticos de todos los módulos
7. DASHBOARD  → métricas consolidadas en tiempo real
```

---

## 17. Utilidades

### `calendarUtils.js`

```js
addBusinessDays(dateStr, n)  // suma n días hábiles (lun-vie)
calcFechaFin(inicio, duracionDias)  // fin estimado en días hábiles
```

### `supabase.js` — funciones exportadas

```js
loadProjects()           upsertProject(p)          deleteProject(id)
loadCronogramasAll()     upsertCronograma(c)        deleteCronograma(id)
loadTeamMembers()        upsertTeamMember(m)        deleteTeamMember(id)
loadProyectosArmar()
loadCalendarioEventos()  upsertCalendarioEvento(e)  deleteCalendarioEvento(id)
loadPresupuestosBasic()
loadHitos()              upsertHito(h)              deleteHito(id)
```

---

## 18. Pendientes / roadmap

1. **PDF del presupuesto** — exportar vista cliente con jsPDF (mismo patrón que cronograma)
2. **Cronocash** — proyección de desembolsos: presupuesto × avance cronograma por período
3. **Hitos en calendario** — vincular fechas de etapas críticas del Gantt al calendario
4. **Filtros en obras** — por estado, tipo, responsable
5. **Subida de archivos** — DocumentosPage usa Supabase Storage (pendiente implementación real)
6. **Log de cambios** — historial de modificaciones por ítem de checklist
7. **Reportes de avance en PDF** — versión para cliente con formato de informe
8. **Excel del Gantt** — exportar con barras coloreadas (ExcelJS instalado, implementación pausada)

---

## 19. Convenciones de código

- **Sin comentarios** salvo WHY no obvio
- **CSS inline** en todos los componentes (no clases externas)
- **Sin librerías de UI** — todo custom
- **Imports dinámicos** para jsPDF / html2canvas / exceljs (lazy, solo al exportar)
- **Estado local** en componentes; estado global solo en App.jsx
- **Mappers explícitos** DB↔App en supabase.js (snake_case → camelCase)
