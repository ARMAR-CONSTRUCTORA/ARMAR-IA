# ARMAR-IA — Contexto del proyecto

## Stack
- React JSX + Vite, CSS inline styles, Supabase, Vercel
- Sin Tailwind, sin librerías de UI. Todo el estilo es inline.
- Fuente: Outfit / Segoe UI
- Sin router — navegación client-side via estado `activePage` en `App.jsx`

## Estructura de carpetas
```
ARMAR-IA/
├── src/
│   ├── App.jsx                     # Rutas y estado global
│   ├── index.css                   # Variables CSS globales
│   ├── components/
│   │   ├── Sidebar.jsx             # Menú colapsable
│   │   ├── TopBar.jsx              # Barra superior mobile
│   │   ├── Dashboard.jsx
│   │   ├── ProjectList.jsx         # Lista de obras
│   │   ├── ProjectModal.jsx
│   │   ├── CronogramasPage.jsx     # Cronograma general
│   │   ├── CronogramaTab.jsx       # Gantt + certificados + informes + stats
│   │   ├── ModalCrearCronograma.jsx  # Wizard 3 pasos
│   │   ├── ModalEditarEtapa.jsx    # Edición de etapas
│   │   ├── EquipoPage.jsx          # OBRA/PROYECTO/GREMIOS/ADMINISTRACIÓN
│   │   ├── DocumentosPage.jsx
│   │   └── ConfigPage.jsx
│   ├── data/
│   │   └── cronogramaTemplates.js  # Plantillas predefinidas
│   ├── lib/
│   │   └── supabase.js             # Cliente Supabase + mappers DB
│   └── utils/
│       └── templateStorage.js      # Guarda plantillas en localStorage
```

## Colores — siempre usar estas constantes locales en cada componente
```js
const orange = "#E8641A"
const orangeLight = "#FFF3EB"
const orangeMid = "#F28C4E"
const dark = "#1A1A1A"
const mid = "#444"
const light = "#F7F7F5"
const border = "#E0DDD8"
const green = "#2D7A4F"
const greenLight = "#EBF7F1"
const red = "#C0392B"
const redLight = "#FDECEA"
const blue = "#2563EB"
const blueLight = "#EFF6FF"
```
El naranja principal también está disponible como `var(--orange)` en index.css.

## Supabase — tablas
- `projects` — obras
- `cronogramas` — columnas JSONB: `tareas`, `informes`, `certificados`
- `team_members`
- `usuarios`
- **Pendiente crear:** tabla `presupuestos` con JSONB para capítulos e ítems

## Idioma
Toda la UI en español (Argentina).

## Responsive
Hook `useBreakpoint` → `{ isDesktop, isMobile }`. Sidebar fija 240px en desktop.

---

## Lógica de negocio — flujo real del proyecto
```
Presupuesto → aprobado por cliente → Cronograma base → Cronocash inicial
→ Obra → Certificados de avance → Certificados de pago
```

---

## Cambios ya implementados

### CronogramaTab
- `handleDeleteTarea` limpia dependencias huérfanas al eliminar padre e hijos
- Columna `COL_INCIDENCIA = 72` muestra `pesoRelativo %` por etapa
- Fila total al pie: verde si suma 100%, naranja si menor, rojo si supera

### ModalEditarEtapa
- Botón 🗑 Eliminar en footer con `ModalConfirmarEliminar` (`zIndex 400`)
- Prop `onDelete` — al eliminar etapa padre también elimina hijos y limpia `dependeDeId` huérfanos

### ModalCrearCronograma
- Botón "🗑 Gestionar" en paso 1 activa modo gestión con × para eliminar plantillas
- `ModalConfirmarEliminarPlantilla` con `zIndex 500`
- `templates` es estado mutable, llama `saveTemplates` al eliminar

### cronogramaTemplates.js
- Eliminado parámetro `esCritica` del helper `e()`, todas las etapas tienen `esCritica: false`

---

## Módulo Presupuestos — lógica definida, pendiente crear PresupuestosTab.jsx

**Tres tipos de presupuesto:**
1. **Presupuesto Cliente** — formal con markup, honorarios, GG
2. **Presupuesto Interno** — costo real acordado con cada gremio, para calcular margen
3. **Contrataciones del Cliente** — cliente contrata directo, estudio cobra % honorarios de gestión; no está en el presupuesto formal pero sí en el cronograma

**Estructura:**
- Capítulos = etapas del cronograma (mismos títulos)
- Ítems por capítulo: descripción, unidad, cantidad, precio unitario cliente, precio unitario interno, moneda (ARS o USD)
- `const USD_RATE = 1250` — cotización de referencia
- Gastos Generales y Honorarios: fijos o como % del total
- Estado del presupuesto: Borrador / Enviado al cliente / Aprobado

**Vista triple (selector en header):**
- 👤 Cliente — solo precios cliente
- 🔒 Interno — solo costos reales
- ⚖️ Comparar — ambas columnas + margen %

**Cards superiores:** total cliente | costo interno | margen % | honorarios de gestión

**Tabs internos:** Capítulos de obra / Contrataciones cliente / Resumen final

**Resumen final:** tabla por capítulo con margen e incidencia (barra visual), total general en dark box

---

## Módulo Cronocash — definido, pendiente implementar
- Proyección que cruza presupuesto aprobado × cronograma base
- El cliente ve cuándo desembolsar en cada etapa
- Si el cronograma se mueve → cronocash se recalcula automáticamente
- Certificados de avance → generan certificados de pago reales para comparar con lo proyectado

## Certificados — relación con presupuesto
- Certificado de avance (% ejecutado de etapa) × monto de etapa en presupuesto = monto a cobrar al cliente

---

## Pendientes (en orden sugerido)
1. Crear `PresupuestosTab.jsx` con la lógica definida arriba
2. Conectar `PresupuestosTab` a Supabase (tabla `presupuestos` JSONB)
3. Vincular capítulos del presupuesto con etapas del cronograma
4. Exportar PDF vista cliente (sin precios internos ni margen)
5. Cronocash — nueva pestaña cruzando presupuesto × cronograma
6. Certificados de pago derivados de certificados de avance × monto de etapa
