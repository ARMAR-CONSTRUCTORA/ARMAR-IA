# ARMAR-IA — Contexto del proyecto

## Stack
- React 18 + Vite, CSS inline, sin librerías de UI
- Supabase (PostgreSQL con RLS), Vercel
- Sin Tailwind. Sin router — navegación por estado `activePage` en App.jsx
- Fuente: Outfit / Segoe UI
- Repo: ARMAR-CONSTRUCTORA/ARMAR-IA

## Estructura de carpetas
```
ARMAR-IA/
├── src/
│   ├── App.jsx                        # Rutas, estado global, handlers
│   ├── index.css                      # Variables CSS globales
│   ├── components/
│   │   ├── Dashboard.jsx              # Métricas reales de todos los módulos
│   │   ├── ProjectList.jsx            # Lista de obras (CRUD)
│   │   ├── ProjectModal.jsx           # Modal crear/editar obra
│   │   ├── CronogramasPage.jsx        # Vista general de cronogramas
│   │   ├── CronogramaTab.jsx          # Gantt + certificados + informes
│   │   ├── ModalCrearCronograma.jsx   # Wizard 3 pasos
│   │   ├── ModalEditarEtapa.jsx       # Edición de etapas
│   │   ├── ModalCargarAvance.jsx      # Carga de informe de avance
│   │   ├── PresupuestosTab.jsx        # Presupuestos por obra
│   │   ├── ProyectosPage.jsx          # Proyectos ARMAR con checklist operativo
│   │   ├── CalendarioPage.jsx         # Calendario operativo con eventos reales
│   │   ├── EquipoPage.jsx             # Equipo por obra
│   │   ├── DocumentosPage.jsx
│   │   ├── ConfigPage.jsx
│   │   ├── Sidebar.jsx
│   │   ├── TopBar.jsx
│   │   ├── LoginModal.jsx
│   │   └── LocationAutocomplete.jsx
│   ├── data/
│   │   ├── cronogramaTemplates.js     # Plantillas predefinidas de cronograma
│   │   ├── sampleData.js
│   │   └── templateStorage.js        # Plantillas en localStorage
│   ├── lib/
│   │   └── supabase.js                # Cliente + mappers DB ↔ App
│   └── hooks/
│       └── useBreakpoint.js           # { isDesktop, isMobile }
```

## Páginas
| Clave | Nombre | Grupo |
|---|---|---|
| `dashboard` | Dashboard | — |
| `obras` | Obras | PRINCIPAL |
| `proyectos` | Proyectos | PRINCIPAL |
| `cronogramas` | Cronogramas | PRINCIPAL |
| `presupuestos` | Presupuestos | PRINCIPAL |
| `equipo` | Equipo | GESTIÓN |
| `calendario` | Calendario | GESTIÓN |
| `documentos` | Documentos | GESTIÓN |
| `configuracion` | Configuración | GESTIÓN |

## Colores — siempre usar estas constantes locales en cada componente
```js
const orange      = "#E8641A"
const orangeLight = "#FFF3EB"
const orangeMid   = "#F28C4E"
const dark        = "#1A1A1A"
const mid         = "#444"
const light       = "#F7F7F5"
const border      = "#E0DDD8"
const green       = "#2D7A4F"
const greenLight  = "#EBF7F1"
const red         = "#C0392B"
const redLight    = "#FDECEA"
const blue        = "#2563EB"
const blueLight   = "#EFF6FF"
const USD_RATE    = 1250
```

## Supabase — tablas
| Tabla | ID tipo | Descripción |
|---|---|---|
| `projects` | bigint | Obras |
| `cronogramas` | text | Cronogramas (JSONB: tareas, informes, certificados) |
| `team_members` | uuid | Equipo por obra |
| `usuarios` | uuid | Usuarios con login |
| `presupuestos` | uuid | Presupuestos |
| `presupuesto_capitulos` | uuid | Capítulos |
| `presupuesto_items` | uuid | Ítems |
| `presupuesto_gastos_generales` | uuid | GG y honorarios |
| `contrataciones_cliente` | uuid | Contrataciones directas |
| `proyectos_armar` | uuid | Proyectos ARMAR |
| `proyecto_checklist_items` | uuid | Checklist operativo |
| `calendario_eventos` | uuid | Eventos del calendario |

### Vínculos entre tablas
- `projects.proyecto_armar_id` → `proyectos_armar.id`
- `presupuestos.proyecto_armar_id` → `proyectos_armar.id`
- `proyecto_checklist_items.proyecto_armar_id` → `proyectos_armar.id`
- `calendario_eventos.obra_id` → `projects.id` (bigint)
- `calendario_eventos.cronograma_id` → `cronogramas.id` (text)
- `calendario_eventos.proyecto_armar_id` → `proyectos_armar.id`
- `calendario_eventos.presupuesto_id` → `presupuestos.id`

## Idioma
Toda la UI en español (Argentina).

## Responsive
Hook `useBreakpoint` → `{ isDesktop, isMobile }`. Sidebar fija 240px en desktop.

---

## Flujo operativo completo
```
1. PROYECTOS → checklist automático según tipo de encargo
2. PRESUPUESTOS → vinculado al proyecto → al aprobar actualiza checklist
3. OBRAS → creada desde proyecto (hereda datos) o vinculada
4. CRONOGRAMAS → vinculado a la obra → al crear actualiza checklist
5. EJECUCIÓN → informes de avance + certificados de pago
6. CALENDARIO → eventos automáticos de todos los módulos
7. DASHBOARD → métricas consolidadas
```

---

## Módulo PROYECTOS

**Tipos de encargo (solo 2):**
1. `"Proyecto + Dirección + Construcción ARMAR"`
2. `"Obra sobre proyecto externo"` → modalidad: `"Dirección + construcción"` / `"Solo construcción"`

**Checklist — Plantilla A (4 etapas):**
1. Alta y encuadre
2. Viabilidad
3. Anteproyecto
4. Proyecto Ejecutivo + Presupuesto final + Transferencia a obra ← compuerta

**Checklist — Plantilla B (4 etapas):**
1. Alta y encuadre
2. Documentación externa y validación básica
3. Presupuesto y contratación
4. Planificación de obra ← compuerta

**Estados de ítem:** no_iniciado / en_curso / pendiente_cliente / pendiente_proveedor / pendiente_municipio / bloqueado / revisado / aprobado / no_aplica

**Ítem completo:** aprobado, revisado, no_aplica

**Compuerta final:** botón "Crear/vincular obra" cuando último ítem = aprobado

---

## Módulo CRONOGRAMAS

**Estructura tarea:**
```js
{ id, nombre, parentId, fechaInicio, fechaFin, avanceActual,
  pesoRelativo, presupuesto, adicionales, dependeDeId, esCritica, estado, responsable }
```

**Funcionalidades:**
- Gantt con zoom: Trimestral / Mensual / Semanal (S1,S2...) / Diario
- Etapas numeradas: 1., 1.1, 1.2...
- Columna incidencia (% peso relativo), fila total
- Informes de avance con monto estimado por etapa
- Al guardar informe → pregunta si generar certificado de pago
- Certificados editables con recalculo de posteriores
- Eliminar informe/certificado recalcula avances
- Al crear cronograma → actualiza checklist del proyecto vinculado

---

## Módulo PRESUPUESTOS

**Vistas:** 👤 Cliente / 🔒 Interno / ⚖️ Comparar
**Capítulos** = etapas del cronograma
**Ítems:** descripción, unidad, cantidad, precio cliente, precio interno, moneda ARS/USD
**Estados:** Borrador / Enviado al cliente / Aprobado
**Al aprobar** → actualiza automáticamente checklist del proyecto vinculado

---

## Módulo CALENDARIO

**Eventos automáticos generados desde:**
- Proyectos: kickoff, anteproyecto aprobado, transferencia a obra
- Presupuestos: presupuesto aprobado
- Cronogramas: inicio de obra, informes de avance

**Colores por origen:**
- proyecto → naranja #E8641A
- presupuesto → azul #2563EB
- cronograma → verde #2D7A4F
- manual → gris #6B7280

---

## Pendientes identificados
1. Exportar PDF vista cliente del presupuesto
2. Cronocash: proyección desembolsos (presupuesto × cronograma)
3. Vincular hitos críticos del cronograma al calendario (fechas de etapas)
4. Filtros en lista de obras
5. Subida real de archivos en DocumentosPage (Supabase Storage)
6. Log de cambios por ítem de checklist
7. Reportes de avance de obra en PDF para el cliente
