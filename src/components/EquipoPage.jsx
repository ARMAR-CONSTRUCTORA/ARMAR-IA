import { useState, useRef, useEffect } from 'react'

const STATUS_COLORS = {
  activa:    { color: '#059669', bg: '#D1FAE5' },
  terminada: { color: '#2563EB', bg: '#DBEAFE' },
  atrasada:  { color: '#DC2626', bg: '#FEE2E2' },
}
const STATUS_LABELS = { activa: 'Activa', terminada: 'Terminada', atrasada: 'Atrasada' }

const AVATAR_PALETTE = [
  '#F97316', '#3B82F6', '#10B981', '#8B5CF6',
  '#EC4899', '#F59E0B', '#14B8A6', '#6366F1',
]

const CATEGORIES = ['OBRA', 'PROYECTO', 'GREMIOS']

const CATEGORY_META = {
  OBRA:     { label: 'Obra',     color: '#F97316', bg: '#FFF7ED', border: '#FED7AA' },
  PROYECTO: { label: 'Proyecto', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  GREMIOS:  { label: 'Gremios',  color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' },
}

function avatarColor(name) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_PALETTE.length
  return AVATAR_PALETTE[h]
}

function initials(name) {
  const words = name.split(' ').filter(w => w.length > 2)
  return words.slice(-2).map(w => w[0].toUpperCase()).join('').slice(0, 2)
}

function MiniProgressBar({ value }) {
  const color = value === 100 ? '#10B981' : value >= 70 ? '#F97316' : value >= 40 ? '#F59E0B' : '#9CA3AF'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
      <div style={{ flex: 1, height: 5, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color, borderRadius: 99 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color, minWidth: 30, textAlign: 'right' }}>{value}%</span>
    </div>
  )
}

function DeleteConfirm({ name, onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, backdropFilter: 'blur(2px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div style={{
        background: 'white', borderRadius: 16, padding: 32,
        maxWidth: 380, width: '90%', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
        <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 8 }}>
          Eliminar persona
        </h3>
        <p style={{ color: 'var(--gray-500)', fontSize: 14, marginBottom: 24 }}>
          ¿Eliminar a <strong>{name}</strong>? Esta acción no se puede deshacer.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 22px', borderRadius: 8,
              border: '1px solid var(--gray-200)', background: 'white',
              color: 'var(--gray-700)', cursor: 'pointer', fontWeight: 600,
              fontSize: 14, fontFamily: 'inherit',
            }}
          >Cancelar</button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 22px', borderRadius: 8, border: 'none',
              background: '#DC2626', color: 'white', cursor: 'pointer',
              fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
            }}
          >Sí, eliminar</button>
        </div>
      </div>
    </div>
  )
}

function AddMemberModal({ category, onAdd, onClose }) {
  const [name, setName] = useState('')
  const [cat, setCat] = useState(category)
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd(trimmed, cat)
    onClose()
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, backdropFilter: 'blur(2px)',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'white', borderRadius: 16, padding: 32,
        maxWidth: 400, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-800)', marginBottom: 20 }}>
          Agregar persona
        </h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Nombre
            </label>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Ing. Juan García"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8,
                border: '1px solid var(--gray-200)', fontSize: 14,
                fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.target.style.borderColor = '#F97316' }}
              onBlur={e => { e.target.style.borderColor = 'var(--gray-200)' }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--gray-500)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Categoría
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {CATEGORIES.map(c => {
                const meta = CATEGORY_META[c]
                const active = cat === c
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCat(c)}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                      fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                      border: `2px solid ${active ? meta.color : 'var(--gray-200)'}`,
                      background: active ? meta.bg : 'white',
                      color: active ? meta.color : 'var(--gray-400)',
                      transition: 'all 0.15s',
                    }}
                  >{c}</button>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 22px', borderRadius: 8,
                border: '1px solid var(--gray-200)', background: 'white',
                color: 'var(--gray-700)', cursor: 'pointer', fontWeight: 600,
                fontSize: 14, fontFamily: 'inherit',
              }}
            >Cancelar</button>
            <button
              type="submit"
              style={{
                padding: '10px 22px', borderRadius: 8, border: 'none',
                background: '#F97316', color: 'white', cursor: 'pointer',
                fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
              }}
            >Agregar</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function MemberCard({ member, obras, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(member.name)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.focus()
  }, [editing])

  const confirmEdit = () => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== member.name) onEdit(member.id, trimmed)
    else setEditName(member.name)
    setEditing(false)
  }

  const activas    = obras.filter(o => o.status === 'activa').length
  const terminadas = obras.filter(o => o.status === 'terminada').length
  const atrasadas  = obras.filter(o => o.status === 'atrasada').length
  const avgProg    = obras.length ? Math.round(obras.reduce((s, o) => s + o.progress, 0) / obras.length) : 0
  const color      = avatarColor(member.name)
  const ini        = initials(member.name)

  return (
    <div style={{
      background: 'white', borderRadius: 14,
      boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
      border: '1px solid var(--gray-200)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: '18px 18px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: color, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontWeight: 800, color: 'white', fontSize: 17,
          flexShrink: 0, letterSpacing: '-0.5px',
        }}>
          {ini}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              ref={inputRef}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={confirmEdit}
              onKeyDown={e => {
                if (e.key === 'Enter') confirmEdit()
                if (e.key === 'Escape') { setEditName(member.name); setEditing(false) }
              }}
              style={{
                width: '100%', fontSize: 14, fontWeight: 700,
                border: '1px solid #F97316', borderRadius: 6,
                padding: '3px 8px', fontFamily: 'inherit',
                outline: 'none', boxSizing: 'border-box',
                color: 'var(--gray-800)',
              }}
            />
          ) : (
            <div style={{
              fontWeight: 700, color: 'var(--gray-800)', fontSize: 14,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {member.name}
            </div>
          )}
          <div style={{ color: 'var(--gray-400)', fontSize: 11, marginTop: 2 }}>
            {obras.length} {obras.length === 1 ? 'obra asignada' : 'obras asignadas'}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--orange)', lineHeight: 1 }}>
              {avgProg}%
            </div>
            <div style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 500, marginTop: 1 }}>
              promedio
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              onClick={() => { setEditName(member.name); setEditing(true) }}
              title="Editar nombre"
              style={{
                width: 26, height: 26, borderRadius: 6, border: '1px solid var(--gray-200)',
                background: 'white', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--gray-400)', fontSize: 13, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.color = '#3B82F6'; e.currentTarget.style.borderColor = '#BFDBFE' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--gray-400)'; e.currentTarget.style.borderColor = 'var(--gray-200)' }}
            >✏️</button>
            <button
              onClick={() => onDelete(member.id, member.name)}
              title="Eliminar"
              style={{
                width: 26, height: 26, borderRadius: 6, border: '1px solid var(--gray-200)',
                background: 'white', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--gray-400)', fontSize: 13, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = '#FCA5A5' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = 'var(--gray-400)'; e.currentTarget.style.borderColor = 'var(--gray-200)' }}
            >🗑️</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex',
        borderTop: '1px solid var(--gray-200)',
        borderBottom: obras.length > 0 ? '1px solid var(--gray-200)' : 'none',
      }}>
        {[
          { label: 'Activas',    value: activas,    color: '#059669' },
          { label: 'Terminadas', value: terminadas, color: '#2563EB' },
          { label: 'Atrasadas',  value: atrasadas,  color: '#DC2626' },
        ].map(({ label, value, color: c }, idx, arr) => (
          <div key={label} style={{
            flex: 1, padding: '9px 0', textAlign: 'center',
            borderRight: idx < arr.length - 1 ? '1px solid var(--gray-200)' : 'none',
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: c }}>{value}</div>
            <div style={{ fontSize: 10, color: 'var(--gray-400)', fontWeight: 600, marginTop: 1 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Obras list */}
      {obras.length > 0 && (
        <div style={{ padding: '8px 0' }}>
          {obras.map(o => (
            <div key={o.id} style={{
              display: 'flex', alignItems: 'center',
              padding: '8px 16px', gap: 10,
            }}>
              <div style={{
                width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                background: STATUS_COLORS[o.status].color,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, color: 'var(--gray-700)', fontWeight: 600,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {o.name}
                </div>
                <MiniProgressBar value={o.progress} />
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, flexShrink: 0, marginLeft: 4,
                color: STATUS_COLORS[o.status].color,
                background: STATUS_COLORS[o.status].bg,
                padding: '2px 8px', borderRadius: 99,
              }}>
                {STATUS_LABELS[o.status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EquipoPage({ projects, teamMembers, onAddMember, onEditMember, onDeleteMember }) {
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, name }
  const [addModal, setAddModal] = useState(null) // category string

  const totalPersonas = teamMembers.length
  const totalObras = projects.length

  const obrasByMember = (memberName) =>
    projects.filter(p => p.responsible === memberName)

  const handleDeleteClick = (id, name) => setDeleteTarget({ id, name })
  const handleDeleteConfirm = () => {
    onDeleteMember(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: 'var(--gray-900)', letterSpacing: '-0.5px', marginBottom: 4 }}>
            Equipo
          </h1>
          <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
            {totalPersonas} {totalPersonas === 1 ? 'persona' : 'personas'} · {totalObras} obras en total
          </p>
        </div>
        <button
          onClick={() => setAddModal('OBRA')}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '10px 18px', borderRadius: 9, border: 'none',
            background: '#F97316', color: 'white', cursor: 'pointer',
            fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(249,115,22,0.3)',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          <span style={{ fontSize: 17, lineHeight: 1 }}>+</span> Agregar persona
        </button>
      </div>

      {/* Summary bar */}
      <div style={{
        background: 'white', borderRadius: 14,
        boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
        border: '1px solid var(--gray-200)',
        padding: '18px 24px', marginBottom: 32,
        display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--gray-900)' }}>{totalPersonas}</div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 500 }}>Personas</div>
        </div>
        <div style={{ width: 1, height: 40, background: 'var(--gray-200)' }} />
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#059669' }}>
            {projects.filter(p => p.status === 'activa').length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 500 }}>Obras activas</div>
        </div>
        <div style={{ width: 1, height: 40, background: 'var(--gray-200)' }} />
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#DC2626' }}>
            {projects.filter(p => p.status === 'atrasada').length}
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 500 }}>Obras atrasadas</div>
        </div>
        <div style={{ width: 1, height: 40, background: 'var(--gray-200)' }} />
        <div>
          <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--orange)' }}>
            {Math.round(projects.reduce((s, p) => s + p.progress, 0) / (totalObras || 1))}%
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 500 }}>Avance promedio</div>
        </div>
        {/* Category badges */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => {
            const meta = CATEGORY_META[cat]
            const count = teamMembers.filter(m => m.category === cat).length
            return (
              <div key={cat} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 99,
                background: meta.bg, border: `1px solid ${meta.border}`,
              }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: meta.color }}>{cat}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: 'white',
                  background: meta.color, borderRadius: '50%',
                  width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{count}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Category sections */}
      {CATEGORIES.map(cat => {
        const meta = CATEGORY_META[cat]
        const members = teamMembers.filter(m => m.category === cat)
        return (
          <div key={cat} style={{ marginBottom: 40 }}>
            {/* Section header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  padding: '4px 14px', borderRadius: 99,
                  background: meta.bg, border: `1px solid ${meta.border}`,
                  fontSize: 12, fontWeight: 800, color: meta.color, letterSpacing: '0.06em',
                }}>
                  {cat}
                </div>
                <span style={{ fontSize: 13, color: 'var(--gray-400)', fontWeight: 500 }}>
                  {members.length} {members.length === 1 ? 'persona' : 'personas'}
                </span>
              </div>
              <button
                onClick={() => setAddModal(cat)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 14px', borderRadius: 8,
                  border: `1px solid ${meta.border}`,
                  background: meta.bg, color: meta.color,
                  cursor: 'pointer', fontWeight: 700, fontSize: 12,
                  fontFamily: 'inherit', transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.75' }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
              >
                + Agregar
              </button>
            </div>

            {members.length === 0 ? (
              <div style={{
                border: `2px dashed ${meta.border}`, borderRadius: 14,
                padding: '28px 20px', textAlign: 'center',
                color: 'var(--gray-400)', fontSize: 13,
              }}>
                No hay personas en esta categoría.{' '}
                <span
                  style={{ color: meta.color, cursor: 'pointer', fontWeight: 600 }}
                  onClick={() => setAddModal(cat)}
                >
                  Agregar una
                </span>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: 18,
              }}>
                {members.map(member => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    obras={obrasByMember(member.name)}
                    onEdit={onEditMember}
                    onDelete={handleDeleteClick}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Modals */}
      {addModal && (
        <AddMemberModal
          category={addModal}
          onAdd={onAddMember}
          onClose={() => setAddModal(null)}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}

export default EquipoPage
