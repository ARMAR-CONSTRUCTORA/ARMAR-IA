import { useState, useRef } from 'react'
import { useBreakpoint } from '../hooks/useBreakpoint'

const DOCS_KEY = 'armar-ia-docs'

function loadDocs() {
  try { return JSON.parse(localStorage.getItem(DOCS_KEY) || '[]') } catch { return [] }
}
function saveDocs(docs) {
  localStorage.setItem(DOCS_KEY, JSON.stringify(
    docs.map(({ id, projectId, name, size, type, date }) => ({ id, projectId, name, size, type, date }))
  ))
}

function fileIcon(name = '', type = '') {
  if (type.includes('pdf') || name.endsWith('.pdf'))                          return { icon: '📄', color: '#EF4444' }
  if (type.includes('image') || /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(name)) return { icon: '🖼️', color: '#3B82F6' }
  if (/\.(xlsx|xls|csv)$/i.test(name))                                        return { icon: '📊', color: '#10B981' }
  if (/\.(docx|doc|odt)$/i.test(name))                                        return { icon: '📝', color: '#6366F1' }
  if (/\.(zip|rar|7z|tar|gz)$/i.test(name))                                   return { icon: '🗜️', color: '#F59E0B' }
  return { icon: '📎', color: '#9CA3AF' }
}

function fmtSize(b) {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function DocumentosPage({ projects }) {
  const { isMobile, isTablet } = useBreakpoint()
  const compact = isMobile || isTablet

  const [docs, setDocs] = useState(loadDocs)
  const [fileObjs, setFileObjs] = useState({})
  const [selectedProject, setSelectedProject] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProject, setUploadProject] = useState('')
  const [showProjectList, setShowProjectList] = useState(!compact)
  const fileRef = useRef()

  const handleFiles = (files, projectId) => {
    if (!projectId) return
    const newDocs = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      projectId, name: file.name, size: file.size,
      type: file.type || '', date: new Date().toISOString(), file,
    }))
    const updated = [...docs, ...newDocs]
    setDocs(updated)
    saveDocs(updated)
    const objs = {}
    newDocs.forEach(d => { objs[d.id] = d.file })
    setFileObjs(prev => ({ ...prev, ...objs }))
  }

  const handleUploadChange = (e) => { handleFiles(e.target.files, uploadProject); e.target.value = '' }
  const handleDrop = (e) => { e.preventDefault(); setIsDragging(false); handleFiles(e.dataTransfer.files, uploadProject) }

  const handleDelete = (id) => {
    const updated = docs.filter(d => d.id !== id)
    setDocs(updated); saveDocs(updated)
    setFileObjs(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  const handleDownload = (doc) => {
    const file = fileObjs[doc.id] || doc.file
    if (!file) return
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url; a.download = doc.name; a.click()
    URL.revokeObjectURL(url)
  }

  const visibleDocs = selectedProject ? docs.filter(d => d.projectId === selectedProject) : docs
  const docCount = (pid) => docs.filter(d => d.projectId === String(pid)).length
  const projectOf = (pid) => projects.find(p => String(p.id) === String(pid))

  /* Project filter panel */
  const ProjectPanel = () => (
    <div style={{
      background: 'white', borderRadius: 14,
      boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
      border: '1px solid var(--gray-200)', overflow: 'hidden',
      marginBottom: compact ? 16 : 0,
    }}>
      <div style={{
        padding: '12px 16px', borderBottom: '1px solid var(--gray-200)',
        fontSize: 11, fontWeight: 700, color: 'var(--gray-500)',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        Filtrar por obra
        {compact && (
          <button onClick={() => setShowProjectList(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-400)', fontSize: 14 }}>
            ✕
          </button>
        )}
      </div>
      <div style={{ padding: '8px 8px' }}>
        {[{ id: '', name: 'Todas las obras', count: docs.length }, ...projects.map(p => ({ id: String(p.id), name: p.name, count: docCount(p.id) }))].map(item => {
          const active = selectedProject === item.id
          return (
            <button key={item.id} onClick={() => { setSelectedProject(item.id); if (compact) setShowProjectList(false) }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', gap: 8,
                padding: '9px 12px', borderRadius: 7, border: 'none',
                background: active ? '#FFF7ED' : 'transparent',
                color: active ? 'var(--orange)' : 'var(--gray-600)',
                fontWeight: active ? 700 : 400, fontSize: 13, cursor: 'pointer',
                fontFamily: 'inherit', textAlign: 'left', marginBottom: 2,
                borderLeft: `3px solid ${active ? 'var(--orange)' : 'transparent'}`,
              }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </span>
              {item.count > 0 && (
                <span style={{
                  background: active ? 'var(--orange-light)' : 'var(--gray-100)',
                  color: active ? 'var(--orange)' : 'var(--gray-500)',
                  borderRadius: 99, padding: '1px 8px', fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>
                  {item.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 900, color: 'var(--gray-900)', letterSpacing: '-0.5px', marginBottom: 4 }}>
            Documentos
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
            {docs.length} {docs.length === 1 ? 'archivo' : 'archivos'} · {projects.length} obras
          </p>
        </div>
        {/* Mobile: show filter toggle */}
        {compact && (
          <button
            onClick={() => setShowProjectList(true)}
            style={{
              background: 'white', border: '1px solid var(--gray-200)', borderRadius: 8,
              padding: '8px 14px', fontSize: 13, fontWeight: 600, color: 'var(--gray-600)',
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            🔍 Filtrar obra
          </button>
        )}
      </div>

      {/* Mobile project filter overlay */}
      {compact && showProjectList && (
        <div>
          <div onClick={() => setShowProjectList(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40,
          }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 41,
            background: 'white', borderRadius: '20px 20px 0 0',
            maxHeight: '75vh', overflowY: 'auto',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
          }}>
            <div style={{
              width: 40, height: 4, background: 'var(--gray-300)',
              borderRadius: 99, margin: '12px auto 0',
            }} />
            <ProjectPanel />
          </div>
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: compact ? '1fr' : '260px 1fr',
        gap: 20, alignItems: 'start',
      }}>
        {/* Desktop: always visible project panel */}
        {!compact && <ProjectPanel />}

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Upload card */}
          <div style={{
            background: 'white', borderRadius: 14,
            boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
            border: '1px solid var(--gray-200)', padding: isMobile ? '16px' : '20px 22px',
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 14 }}>
              Subir archivos
            </h3>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', display: 'block', marginBottom: 6 }}>
                Obra destino
              </label>
              <select
                value={uploadProject}
                onChange={e => setUploadProject(e.target.value)}
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8,
                  border: '1.5px solid var(--gray-200)', fontSize: 13,
                  color: 'var(--gray-700)', background: 'white', fontFamily: 'inherit',
                }}
              >
                <option value="">— Elige una obra —</option>
                {projects.map(p => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
              </select>
            </div>

            {/* Drop zone — simpler on mobile */}
            {isMobile ? (
              <button
                onClick={() => uploadProject && fileRef.current.click()}
                disabled={!uploadProject}
                style={{
                  width: '100%', padding: '14px', border: `2px dashed ${uploadProject ? 'var(--orange)' : 'var(--gray-200)'}`,
                  borderRadius: 10, background: uploadProject ? '#FFF7ED' : 'var(--gray-100)',
                  color: uploadProject ? 'var(--orange)' : 'var(--gray-400)',
                  fontSize: 14, fontWeight: 700, cursor: uploadProject ? 'pointer' : 'default',
                  fontFamily: 'inherit',
                }}
              >
                📎 {uploadProject ? 'Toca para seleccionar archivos' : 'Seleccioná una obra primero'}
              </button>
            ) : (
              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => uploadProject && fileRef.current.click()}
                style={{
                  border: `2px dashed ${isDragging ? 'var(--orange)' : uploadProject ? 'var(--gray-300)' : 'var(--gray-200)'}`,
                  borderRadius: 10, padding: '24px 20px', textAlign: 'center',
                  cursor: uploadProject ? 'pointer' : 'not-allowed',
                  background: isDragging ? '#FFF7ED' : uploadProject ? '#FAFAFA' : 'var(--gray-100)',
                  transition: 'all 0.2s', opacity: uploadProject ? 1 : 0.6,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>{isDragging ? '📂' : '☁️'}</div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 3 }}>
                  {uploadProject ? 'Arrastrá archivos aquí o hacé clic' : 'Seleccioná una obra primero'}
                </p>
                <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>PDF, imágenes, Excel, Word y más</p>
              </div>
            )}

            {uploadProject && (
              <button
                onClick={() => fileRef.current.click()}
                style={{
                  marginTop: 12, width: '100%', padding: '10px',
                  background: 'var(--orange)', color: 'white', border: 'none',
                  borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(249,115,22,0.35)',
                }}
              >
                + Seleccionar archivos
              </button>
            )}

            <input ref={fileRef} type="file" multiple hidden onChange={handleUploadChange} />
          </div>

          {/* File list */}
          <div style={{
            background: 'white', borderRadius: 14,
            boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
            border: '1px solid var(--gray-200)', overflow: 'hidden',
          }}>
            <div style={{
              padding: isMobile ? '14px 16px' : '16px 22px',
              borderBottom: '1px solid var(--gray-200)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--gray-800)' }}>
                {selectedProject
                  ? `Archivos · ${projectOf(selectedProject)?.name || ''}`
                  : 'Todos los archivos'}
              </h3>
              <span style={{
                background: 'var(--gray-100)', color: 'var(--gray-500)',
                borderRadius: 99, padding: '3px 12px', fontSize: 12, fontWeight: 700,
              }}>
                {visibleDocs.length}
              </span>
            </div>

            {visibleDocs.length === 0 ? (
              <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📁</div>
                <p style={{ fontWeight: 600, color: 'var(--gray-500)', fontSize: 14, marginBottom: 4 }}>
                  No hay archivos aquí
                </p>
                <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>
                  Subí archivos usando el formulario de arriba
                </p>
              </div>
            ) : visibleDocs.map((doc, i) => {
              const { icon, color } = fileIcon(doc.name, doc.type)
              const proj = projectOf(doc.projectId)
              const canDownload = !!(fileObjs[doc.id] || doc.file)
              return (
                <div key={doc.id} style={{
                  display: 'flex', alignItems: 'center', gap: isMobile ? 10 : 14,
                  padding: isMobile ? '12px 16px' : '14px 22px',
                  borderBottom: i < visibleDocs.length - 1 ? '1px solid var(--gray-200)' : 'none',
                  background: i % 2 === 0 ? 'white' : '#FAFAFA',
                }}>
                  <div style={{
                    width: isMobile ? 36 : 40, height: isMobile ? 36 : 40,
                    borderRadius: 10, background: `${color}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: isMobile ? 18 : 20, flexShrink: 0,
                  }}>
                    {icon}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600, color: 'var(--gray-800)', fontSize: isMobile ? 13 : 14,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {doc.name}
                    </div>
                    <div style={{ color: 'var(--gray-400)', fontSize: 11, marginTop: 2 }}>
                      {fmtSize(doc.size)} · {fmtDate(doc.date)}
                      {!selectedProject && proj && (
                        <span style={{
                          marginLeft: 6, background: '#FFF7ED', color: 'var(--orange)',
                          borderRadius: 99, padding: '1px 7px', fontSize: 10, fontWeight: 600,
                        }}>
                          {proj.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      onClick={() => handleDownload(doc)}
                      disabled={!canDownload}
                      style={{
                        padding: isMobile ? '5px 8px' : '5px 12px', borderRadius: 6, border: 'none',
                        background: canDownload ? '#DBEAFE' : 'var(--gray-100)',
                        color: canDownload ? '#2563EB' : 'var(--gray-400)',
                        cursor: canDownload ? 'pointer' : 'default',
                        fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                      }}
                    >
                      {isMobile ? '⬇' : '⬇ Descargar'}
                    </button>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      style={{
                        padding: isMobile ? '5px 8px' : '5px 12px', borderRadius: 6, border: 'none',
                        background: '#FEE2E2', color: '#DC2626',
                        cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit',
                      }}
                    >
                      {isMobile ? '🗑' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DocumentosPage
