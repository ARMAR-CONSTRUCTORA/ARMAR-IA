import { useState, useEffect } from 'react'
import { useBreakpoint } from './hooks/useBreakpoint'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Dashboard from './components/Dashboard'
import ProjectList from './components/ProjectList'
import ProjectModal from './components/ProjectModal'
import ConfigPage from './components/ConfigPage'
import CronogramasPage from './components/CronogramasPage'
import EquipoPage from './components/EquipoPage'
import DocumentosPage from './components/DocumentosPage'
import { sampleProjects } from './data/sampleData'

const STORAGE_KEY = 'armar-ia-projects'

const PAGE_TITLES = {
  dashboard:     'Dashboard',
  obras:         'Obras',
  cronogramas:   'Cronogramas',
  equipo:        'Equipo',
  documentos:    'Documentos',
  configuracion: 'Configuración',
}

function App() {
  const { isDesktop, isMobile } = useBreakpoint()

  const [projects, setProjects] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : sampleProjects
    } catch {
      return sampleProjects
    }
  })

  const [activePage, setActivePage]   = useState('dashboard')
  const [menuOpen, setMenuOpen]       = useState(false)
  const [modalOpen, setModalOpen]     = useState(false)
  const [editingProject, setEditing]  = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  }, [projects])

  // Close drawer when resizing to desktop
  useEffect(() => { if (isDesktop) setMenuOpen(false) }, [isDesktop])

  // Prevent body scroll when drawer or modal is open on mobile
  useEffect(() => {
    document.body.style.overflow = (!isDesktop && menuOpen) || modalOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen, modalOpen, isDesktop])

  const openAdd   = () => { setEditing(null); setModalOpen(true) }
  const openEdit  = (p) => { setEditing(p); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditing(null) }

  const handleNavigate = (page) => { setActivePage(page); setMenuOpen(false) }

  const handleSave = (data) => {
    if (editingProject) {
      setProjects(prev => prev.map(p => p.id === editingProject.id ? { ...data, id: p.id } : p))
    } else {
      const newId = projects.length > 0 ? Math.max(...projects.map(p => p.id)) + 1 : 1
      setProjects(prev => [...prev, { ...data, id: newId }])
    }
    closeModal()
  }

  const handleDelete = (id) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    setDeleteTarget(null)
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard projects={projects} onAdd={openAdd} onNavigateToObras={() => handleNavigate('obras')} />
      case 'obras':
        return <ProjectList projects={projects} onAdd={openAdd} onEdit={openEdit} onDelete={setDeleteTarget} />
      case 'cronogramas':
        return <CronogramasPage projects={projects} />
      case 'equipo':
        return <EquipoPage projects={projects} />
      case 'documentos':
        return <DocumentosPage projects={projects} />
      case 'configuracion':
        return <ConfigPage />
      default:
        return null
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--gray-100)' }}>
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        isDesktop={isDesktop}
      />

      {/* Main area */}
      <div style={{
        marginLeft: isDesktop ? 240 : 0,
        flex: 1,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: isDesktop ? 'calc(100vw - 240px)' : '100vw',
        minWidth: 0,
      }}>
        {/* TopBar only on mobile/tablet */}
        {!isDesktop && (
          <TopBar
            onMenuOpen={() => setMenuOpen(true)}
            pageTitle={activePage !== 'dashboard' ? PAGE_TITLES[activePage] : undefined}
          />
        )}

        <main style={{
          flex: 1,
          padding: isMobile ? '20px 16px 40px' : isDesktop ? '40px 40px' : '28px 24px',
        }}>
          {renderPage()}
        </main>
      </div>

      {/* Add/Edit modal */}
      {modalOpen && (
        <ProjectModal project={editingProject} onSave={handleSave} onClose={closeModal} />
      )}

      {/* Delete confirmation */}
      {deleteTarget !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: isMobile ? 'flex-end' : 'center',
            justifyContent: 'center',
            zIndex: 100, padding: isMobile ? 0 : 16, backdropFilter: 'blur(2px)',
          }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null) }}
        >
          <div style={{
            background: 'white',
            borderRadius: isMobile ? '20px 20px 0 0' : 16,
            padding: isMobile ? '32px 24px 40px' : 32,
            maxWidth: isMobile ? '100%' : 420,
            width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            textAlign: 'center',
          }}>
            {isMobile && (
              <div style={{
                width: 40, height: 4, background: 'var(--gray-300)',
                borderRadius: 99, margin: '0 auto 20px',
              }} />
            )}
            <div style={{ fontSize: 44, marginBottom: 14 }}>🗑️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 10 }}>
              Eliminar obra
            </h3>
            <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 28 }}>
              ¿Estás seguro de que deseas eliminar esta obra? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexDirection: isMobile ? 'column-reverse' : 'row' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: '11px 24px', borderRadius: 8,
                  border: '1px solid var(--gray-200)', background: 'white',
                  color: 'var(--gray-700)', cursor: 'pointer', fontWeight: 600,
                  fontSize: 14, fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                style={{
                  padding: '11px 24px', borderRadius: 8, border: 'none',
                  background: 'var(--red)', color: 'white', cursor: 'pointer',
                  fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
                }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
