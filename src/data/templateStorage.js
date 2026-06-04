import { CRONOGRAMA_TEMPLATES } from './cronogramaTemplates'

const KEY = 'armar-ia-templates'

export function loadTemplates() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return CRONOGRAMA_TEMPLATES.map(t => ({ ...t, etapas: t.etapas.map(e => ({ ...e })) }))
}

export function saveTemplates(templates) {
  try {
    localStorage.setItem(KEY, JSON.stringify(templates))
  } catch {}
}
