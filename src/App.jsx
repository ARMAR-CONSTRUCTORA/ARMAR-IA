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
import ProyectosPage from './components/ProyectosPage'
import CalendarioPage from './components/CalendarioPage'
import LoginModal from './components/LoginModal'
import PresupuestosTab from './components/PresupuestosTab'

import {
  supabase,
  loadProjects, upsertProject, deleteProject,
  loadCronogramasAll, upsertCronograma, deleteCronograma,
  loadTeamMembers, upsertTeamMember, deleteTeamMember,
  loadProyectosArmar,
  loadCalendarioEventos, upsertCalendarioEvento, deleteCalendarioEvento,
  loadPresupuestosBasic,
} from './lib/supabase'

const SESSION_KEY = 'armar-ia-user'

const PAGE_TITLES = {
  dashboard:     'Dashboard',
  obras:         'Obras',
  proyectos:     'Proyectos',
  cronogramas:   'Cronogramas',
  presupuestos:  'Presupuestos',
  equipo:        'Equipo',
  calendario:    'Calendario',
  documentos:    'Documentos',
  configuracion: 'Configuración',
}

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--gray-100)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏗️</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--gray-600)' }}>Cargando datos…</div>
        <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>Conectando con Supabase</div>
      </div>
    </div>
  )
}

function App() {
  const { isDesktop, isMobile } = useBreakpoint()

  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [cronogramas, setCronogramas] = useState({})
  const [proyectosArmar, setProyectosArmar] = useState([])
  const [calendarioEventos, setCalendarioEventos] = useState([])
  const [presupuestos,      setPresupuestos]      = useState([])
  const [prefillProjectData, setPrefillProjectData] = useState(null)

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  })

  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const isEditor = currentUser !== null

  const [activePage, setActivePage] = useState('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProject, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [selectedBudgetProjectId, setSelectedBudgetProjectId] = useState(null)

  useEffect(() => {
    Promise.all([
      loadProjects(),
      loadTeamMembers(),
      loadCronogramasAll(),
      loadProyectosArmar(),
      loadCalendarioEventos(),
      loadPresupuestosBasic(),
    ]).then(([projs, team, cronos, proyArmar, calEvs, presups]) => {
      setProjects(projs)
      setTeamMembers(team)
      setCronogramas(cronos)
      setProyectosArmar(proyArmar)
      setCalendarioEventos(calEvs)
      setPresupuestos(presups)
      setSelectedBudgetProjectId(projs?.[0]?.id ?? null)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('armar-ia-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        loadProjects().then(projs => {
          setProjects(projs)
          setSelectedBudgetProjectId(prev => prev ?? projs?.[0]?.id ?? null)
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cronogramas' }, () => {
        loadCronogramasAll().then(setCronogramas)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        loadTeamMembers().then(setTeamMembers)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendario_eventos' }, () => {
        loadCalendarioEventos().then(setCalendarioEventos)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presupuestos' }, () => {
        loadPresupuestosBasic().then(setPresupuestos)
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  useEffect(() => {
    const ping = () => supabase.from('projects').select('id').limit(1)
    ping()
    const id = setInterval(ping, 4 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => { if (isDesktop) setMenuOpen(false) }, [isDesktop])

  useEffect(() => {
    document.body.style.overflow = (!isDesktop && menuOpen) || modalOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen, modalOpen, isDesktop])

  const handleLogin = (user) => {
    setCurrentUser(user)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
    setLoginModalOpen(false)
  }

  const handleLogout = () => {
    setCurrentUser(null)
    sessionStorage.removeItem(SESSION_KEY)
  }

  const openAdd = (prefill = null) => { setEditing(null); setPrefillProjectData(prefill || null); setModalOpen(true) }
  const openEdit = (p) => { setEditing(p); setPrefillProjectData(null); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditing(null); setPrefillProjectData(null) }

  const handleVincularObra = async (obraId, proyectoArmarId) => {
    const obra = projects.find(p => String(p.id) === String(obraId))
    if (!obra) return
    const updated = { ...obra, proyectoArmarId }
    setProjects(prev => prev.map(p => String(p.id) === String(obraId) ? updated : p))
    await upsertProject(updated)
  }
  const handleNavigate = (page) => { setActivePage(page); setMenuOpen(false) }

  const handleUpsertEvento = async (evento) => {
    const saved = await upsertCalendarioEvento(evento)
    if (saved) {
      setCalendarioEventos(prev => {
        const idx = prev.findIndex(e => e.id === saved.id)
        return idx >= 0 ? prev.map(e => e.id === saved.id ? saved : e) : [...prev, saved]
      })
    }
  }

  const handleDeleteEvento = async (id) => {
    setCalendarioEventos(prev => prev.filter(e => e.id !== id))
    await deleteCalendarioEvento(id)
  }

  const handleSave = async (data) => {
    if (editingProject) {
      const updated = { ...data, id: editingProject.id }
      setProjects(prev => prev.map(p => p.id === editingProject.id ? updated : p))
      await upsertProject(updated)
    } else {
      const newId = Date.now()
      const project = { ...data, id: newId, tasks: data.tasks || [], progress: data.progress ?? 0 }
      setProjects(prev => [...prev, project])
      setSelectedBudgetProjectId(prev => prev ?? newId)
      await upsertProject(project)
    }
    closeModal()
  }

  const handleDelete = async (id) => {
    setProjects(prev => prev.filter(p => p.id !== id))
    setDeleteTarget(null)
    if (selectedBudgetProjectId === id) {
      const nextProject = projects.find(p => p.id !== id)
      setSelectedBudgetProjectId(nextProject?.id ?? null)
    }
    await deleteProject(id)
  }

  const handleUpdateTasks = async (projectId, updatedTasks) => {
    const avg = updatedTasks.length
      ? Math.round(updatedTasks.reduce((s, t) => s + t.progress, 0) / updatedTasks.length)
      : 0

    const project = projects.find(p => p.id === projectId)
    if (!project) return

    const updated = { ...project, tasks: updatedTasks, progress: avg }
    setProjects(prev => prev.map(p => p.id === projectId ? updated : p))
    await upsertProject(updated)
  }

  const handleCreateCronograma = async (projectId, data) => {
    const id = `cron-${projectId}-${Date.now()}`
    const cronograma = { ...data, id }

    setCronogramas(prev => ({
      ...prev,
      [projectId]: [...(prev[projectId] || []), cronograma],
    }))

    await upsertCronograma(cronograma)
  }

  const handleDeleteCronograma = async (projectId, cronId) => {
    setCronogramas(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).filter(c => c.id !== cronId),
    }))

    await deleteCronograma(cronId)
  }

  const handleSaveCronograma = async (projectId, cronId, updates) => {
    const existing = cronogramas[projectId]?.find(c => c.id === cronId)
    if (!existing) return

    const updated = { ...existing, ...updates }

    setCronogramas(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).map(c => c.id === cronId ? updated : c),
    }))

    await upsertCronograma(updated)
  }

  const handleCargarAvance = async (projectId, cronId, informe, tareasActualizadas, certData) => {
    const existing = cronogramas[projectId]?.find(c => c.id === cronId)
    if (!existing) return

    const updatedCron = {
      ...existing,
      tareas: tareasActualizadas,
      informes: [...(existing.informes || []), informe],
      certificados: certData ? [...(existing.certificados || []), certData] : (existing.certificados || []),
    }

    const totalPeso = tareasActualizadas
      .filter(t => t.parentId === null)
      .reduce((s, t) => s + (t.pesoRelativo || 1), 0)

    const nuevoAvance = Math.round(
      tareasActualizadas
        .filter(t => t.parentId === null)
        .reduce((s, t) => s + t.avanceActual * (t.pesoRelativo || 1), 0) / Math.max(1, totalPeso)
    )

    const updatedProject = projects.find(p => p.id === projectId)

    setCronogramas(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).map(c => c.id === cronId ? updatedCron : c),
    }))

    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, progress: nuevoAvance } : p))

    await Promise.all([
      upsertCronograma(updatedCron),
      updatedProject ? upsertProject({ ...updatedProject, progress: nuevoAvance }) : Promise.resolve(),
    ])
  }

  const handleEditarInforme = async (projectId, cronId, informeId, updatedInforme, tareasActualizadas) => {
    const existing = cronogramas[projectId]?.find(c => c.id === cronId)
    if (!existing) return

    const updatedCron = {
      ...existing,
      tareas: tareasActualizadas,
      informes: (existing.informes || []).map(inf => inf.id === informeId ? updatedInforme : inf),
    }

    const totalPeso = tareasActualizadas
      .filter(t => t.parentId === null)
      .reduce((s, t) => s + (t.pesoRelativo || 1), 0)

    const nuevoAvance = Math.round(
      tareasActualizadas
        .filter(t => t.parentId === null)
        .reduce((s, t) => s + t.avanceActual * (t.pesoRelativo || 1), 0) / Math.max(1, totalPeso)
    )

    const updatedProject = projects.find(p => p.id === projectId)

    setCronogramas(prev => ({
      ...prev,
      [projectId]: (prev[projectId] || []).map(c => c.id === cronId ? updatedCron : c),
    }))

    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, progress: nuevoAvance } : p))

    await Promise.all([
      upsertCronograma(updatedCron),
      updatedProject ? upsertProject({ ...updatedProject, progress: nuevoAvance }) : Promise.resolve(),
    ])
  }

  const handleAddMember = async (name, category) => {
    const member = { id: `m-${Date.now()}`, name, category }
    setTeamMembers(prev => [...prev, member])
    await upsertTeamMember(member)
  }

  const handleEditMember = async (id, name) => {
    const existing = teamMembers.find(m => m.id === id)
    if (!existing) return

    const updated = { ...existing, name }
    setTeamMembers(prev => prev.map(m => m.id === id ? updated : m))
    await upsertTeamMember(updated)
  }

  const handleDeleteMember = async (id) => {
    setTeamMembers(prev => prev.filter(m => m.id !== id))
    await deleteTeamMember(id)
  }

  if (loading) return <LoadingScreen />

  const selectedBudgetProject =
    projects.find(p => p.id === selectedBudgetProjectId) ||
    projects[0] ||
    null

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return (
          <Dashboard
            projects={projects}
            cronogramas={cronogramas}
            proyectosArmar={proyectosArmar}
            calendarioEventos={calendarioEventos}
            presupuestos={presupuestos}
            teamMembers={teamMembers}
            onAdd={openAdd}
            onNavigate={handleNavigate}
            isEditor={isEditor}
          />
        )

      case 'obras':
        return (
          <ProjectList
            projects={projects}
            cronogramas={cronogramas}
            teamMembers={teamMembers}
            proyectosArmar={proyectosArmar}
            presupuestos={presupuestos}
            onAdd={openAdd}
            onEdit={openEdit}
            onDelete={setDeleteTarget}
            onUpdateTasks={handleUpdateTasks}
            onCreateCronograma={handleCreateCronograma}
            onSaveCronograma={handleSaveCronograma}
            onCargarAvance={handleCargarAvance}
            onDeleteCronograma={handleDeleteCronograma}
            onEditarInforme={handleEditarInforme}
            isEditor={isEditor}
          />
        )

      case 'cronogramas':
        return <CronogramasPage projects={projects} cronogramas={cronogramas} proyectosArmar={proyectosArmar} />

      case 'presupuestos':
        return (
          <div>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-600)' }}>
                Obra:
              </label>

              <select
                value={selectedBudgetProject?.id || ''}
                onChange={e => setSelectedBudgetProjectId(Number(e.target.value))}
                style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: '1px solid var(--gray-200)',
                  background: 'white',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  minWidth: 260,
                }}
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedBudgetProject ? (
              <PresupuestosTab proyecto={selectedBudgetProject} isEditor={isEditor} proyectosArmar={proyectosArmar} />
            ) : (
              <div style={{ background: 'white', padding: 24, borderRadius: 16 }}>
                No hay obras cargadas para presupuestar.
              </div>
            )}
          </div>
        )

      case 'proyectos':
        return (
          <ProyectosPage
            isEditor={isEditor}
            projects={projects}
            cronogramas={cronogramas}
            onCrearObra={openAdd}
            onVincularObra={handleVincularObra}
            onNavigate={handleNavigate}
          />
        )

      case 'equipo':
        return (
          <EquipoPage
            projects={projects}
            teamMembers={teamMembers}
            onAddMember={handleAddMember}
            onEditMember={handleEditMember}
            onDeleteMember={handleDeleteMember}
            isEditor={isEditor}
          />
        )

      case 'calendario':
        return <CalendarioPage eventos={calendarioEventos} proyectosArmar={proyectosArmar} isEditor={isEditor} onUpsertEvento={handleUpsertEvento} onDeleteEvento={handleDeleteEvento} />

      case 'configuracion':
        return <ConfigPage />

      default:
        return null
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--gray-100)' }}>
      <Sidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        isDesktop={isDesktop}
        currentUser={currentUser}
        onLoginClick={() => setLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      <div style={{
        marginLeft: 0,
        flex: 1,
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: '100vw',
        minWidth: 0,
      }}>
        {!isDesktop && (
          <TopBar
            onMenuOpen={() => setMenuOpen(true)}
            pageTitle={activePage !== 'dashboard' ? PAGE_TITLES[activePage] : undefined}
          />
        )}

        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: isMobile ? '20px 16px 40px' : isDesktop ? '40px 40px 40px 104px' : '28px 24px',
        }}>
          {renderPage()}
        </main>
      </div>

      {modalOpen && isEditor && (
        <ProjectModal
          project={editingProject}
          teamMembers={teamMembers}
          proyectosArmar={proyectosArmar}
          prefillData={prefillProjectData}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}

      {loginModalOpen && (
        <LoginModal onLogin={handleLogin} onClose={() => setLoginModalOpen(false)} />
      )}

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
              <div style={{ width: 40, height: 4, background: 'var(--gray-300)', borderRadius: 99, margin: '0 auto 20px' }} />
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
                style={{ padding: '11px 24px', borderRadius: 8, border: '1px solid var(--gray-200)', background: 'white', color: 'var(--gray-700)', cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'inherit' }}
              >
                Cancelar
              </button>

              <button
                onClick={() => handleDelete(deleteTarget)}
                style={{ padding: '11px 24px', borderRadius: 8, border: 'none', background: 'var(--red)', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' }}
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
