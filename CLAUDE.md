# ARMAR-IA — Contexto del proyecto para Claude

## Stack tecnológico

- **React 18.3.1** — componentes funcionales, hooks (`useState`, `useEffect`)
- **Vite 5.4.0** — build tool y dev server (`@vitejs/plugin-react`)
- **Sin librerías de UI externas** — todo el estilo es CSS-in-JS inline
- **Sin router** — navegación client-side via estado `activePage` en `App.jsx`
- **Persistencia** — `localStorage` bajo la clave `armar-ia-projects`

## Estructura de carpetas

```
ARMAR-IA/
├── index.html
├── vite.config.js
├── package.json
├── src/
│   ├── main.jsx              # Punto de entrada React
│   ├── App.jsx               # Componente raíz — estado global, layout, routing
│   ├── index.css             # Variables CSS globales (colores, tipografía)
│   ├── components/
│   │   ├── Sidebar.jsx       # Navegación lateral (fija en desktop, drawer en mobile)
│   │   ├── TopBar.jsx        # Barra superior (solo mobile/tablet)
│   │   ├── Navbar.jsx        # (componente de navegación auxiliar)
│   │   ├── Dashboard.jsx     # Página de inicio con resumen de obras
│   │   ├── ProjectList.jsx   # Página "Obras" — listado + CRUD
│   │   ├── ProjectModal.jsx  # Modal para agregar/editar obras
│   │   ├── CronogramasPage.jsx  # Página "Cronogramas" — Gantt por obra
│   │   ├── EquipoPage.jsx    # Página "Equipo" — personas asignadas por obra
│   │   ├── DocumentosPage.jsx   # Página "Documentos" — archivos por obra
│   │   ├── ConfigPage.jsx    # Página "Configuración"
│   │   └── LocationAutocomplete.jsx  # Input con autocompletado de ubicación
│   ├── data/
│   │   └── sampleData.js     # Datos de ejemplo como fallback inicial
│   └── hooks/
│       └── useBreakpoint.js  # Hook responsive: { isDesktop, isMobile }
└── dist/                     # Output del build
```

## Páginas / secciones

| Clave          | Título        | Componente           |
|----------------|---------------|----------------------|
| `dashboard`    | Dashboard     | `Dashboard.jsx`      |
| `obras`        | Obras         | `ProjectList.jsx`    |
| `cronogramas`  | Cronogramas   | `CronogramasPage.jsx`|
| `equipo`       | Equipo        | `EquipoPage.jsx`     |
| `documentos`   | Documentos    | `DocumentosPage.jsx` |
| `configuracion`| Configuración | `ConfigPage.jsx`     |

## Colores principales

```css
/* Acento principal */
--orange: #F97316;

/* Escala de grises */
--gray-100: /* fondo general */
--gray-300: /* bordes suaves */
--gray-500: /* texto secundario */
--gray-700: /* texto medio */
--gray-800: /* texto principal */

/* Estado de error / peligro */
--red: /* botones destructivos */
```

Los colores se definen en `src/index.css` como variables CSS y se usan inline vía `var(--nombre)`.

## Idioma

Toda la UI está en **español (Argentina)**. Mantener ese idioma en textos, labels, mensajes de error y confirmaciones.

## Responsive

El layout usa tres breakpoints gestionados por `useBreakpoint`:
- **Mobile** (`isMobile: true`) — padding reducido, bottom sheets, drawer de navegación
- **Tablet** — valores intermedios
- **Desktop** (`isDesktop: true`) — sidebar fija de 240px, modales centrados, padding amplio

## Persistencia actual

Los datos de obras se guardan en `localStorage['armar-ia-projects']` como JSON. El estado se inicializa desde ahí o desde `sampleData.js` como fallback. No hay backend ni base de datos conectada todavía.

## Mejoras pendientes

- [ ] **Zoom en Gantt** — controles para escalar la vista de cronograma (semanas / meses / trimestres)
- [ ] **Formulario de obras ampliado** — nuevos campos en `ProjectModal` (presupuesto, comitente, tipo de obra, etc.)
- [ ] **Integración con Supabase para documentos** — subir y listar archivos reales en `DocumentosPage`, reemplazando el estado local
- [ ] **Logo real de ARMAR** — reemplazar el placeholder/texto en `Sidebar` y `TopBar` con el logo SVG/PNG oficial
