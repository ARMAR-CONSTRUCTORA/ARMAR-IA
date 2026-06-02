import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import ProjectList from './components/ProjectList'
import ProjectModal from './components/ProjectModal'
import ConfigPage from './components/ConfigPage'
import { sampleProjects } from './data/sampleData'

const STORAGE_KEY = 'armar-ia-projects'

function App() {
  const [projects, setProjects] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : sampleProjects
    } catch {
      return sampleProjects
    }
  })

  const [activePage, setActivePage] = useState('dashboard')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProject, setEditingProject] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects))
  }, [projects])

  const openAdd = () => { setEditingProject(null); setModalOpen(true) }
  const openEdit = (p) => { setEditingProject(p); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditingProject(null) }

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
        return (
          <Dashboard
            projects={projects}
            onAdd={openAdd}
            onNavigateToObras={() => setActivePage('obras')}
          />
        )
      case 'obras':
        return (
          <ProjectList
            projects={projects}
            onAdd={openAdd}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
          />
        )
      case 'configuracion':
        return <ConfigPage />
      default:
        return null
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--gray-100)' }}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <main style={{
        marginLeft: 240,
        flex: 1,
        padding: '40px 40px',
        minHeight: '100vh',
        maxWidth: 'calc(100vw - 240px)',
      }}>
        {renderPage()}
      </main>

      {/* Modal agregar / editar */}
      {modalOpen && (
        <ProjectModal
          project={editingProject}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {/* Confirmación eliminar */}
      {deleteTarget !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: 16, backdropFilter: 'blur(2px)',
          }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null) }}
        >
          <div style={{
            background: 'white', borderRadius: 16, padding: 32,
            maxWidth: 420, width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>🗑️</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 10 }}>
              Eliminar obra
            </h3>
            <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 28 }}>
              ¿Estás seguro de que deseas eliminar esta obra? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: '10px 24px', borderRadius: 8,
                  border: '1px solid var(--gray-200)', background: 'white',
                  color: 'var(--gray-700)', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                  fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteTarget)}
                style={{
                  padding: '10px 24px', borderRadius: 8, border: 'none',
                  background: 'var(--red)', color: 'white',
                  cursor: 'pointer', fontWeight: 700, fontSize: 14,
                  fontFamily: 'inherit',
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
