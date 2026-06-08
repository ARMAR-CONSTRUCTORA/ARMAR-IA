const NAV_GROUPS = [
 {
   label: 'Principal',
   items: [
     { id: 'dashboard', label: 'Dashboard',  icon: '📊' },
     { id: 'obras',     label: 'Obras',       icon: '🏗️' },
   ],
 },
 {
   label: 'Gestión',
   items: [
     { id: 'cronogramas', label: 'Cronogramas', icon: '📅' },
     { id: 'presupuestos', label: 'Presupuestos', icon: '💰' },
     { id: 'equipo',      label: 'Equipo',       icon: '👥' },
   ],
 },
 {
   label: 'Sistema',
   items: [
     { id: 'configuracion', label: 'Configuración', icon: '⚙️' },
   ],
 },
]
function NavItems({ activePage, onNavigate, expanded }) {
 return (
   <nav style={{ padding: expanded ? '16px 12px' : '16px 6px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
     {NAV_GROUPS.map((group, gi) => (
       <div key={group.label} style={{ marginBottom: gi < NAV_GROUPS.length - 1 ? 20 : 0 }}>
         {expanded && (
           <p style={{
             fontSize: 10, fontWeight: 700, color: 'var(--gray-400)',
             textTransform: 'uppercase', letterSpacing: '0.09em',
             padding: '0 10px', marginBottom: 6,
           }}>
             {group.label}
           </p>
         )}
         {!expanded && gi > 0 && (
           <div style={{ height: 1, background: 'var(--gray-200)', margin: '8px 6px 14px' }} />
         )}
         {group.items.map(item => {
           const active = activePage === item.id
           return (
             <button
               key={item.id}
               onClick={() => onNavigate(item.id)}
               title={!expanded ? item.label : undefined}
               style={{
                 width: '100%',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: expanded ? 'flex-start' : 'center',
                 gap: expanded ? 10 : 0,
                 padding: expanded ? '10px 12px' : '10px 0',
                 borderRadius: 8, border: 'none',
                 background: active ? '#FFF7ED' : 'transparent',
                 color: active ? 'var(--orange)' : 'var(--gray-600)',
                 fontWeight: active ? 700 : 500, fontSize: 14,
                 cursor: 'pointer', marginBottom: 2, textAlign: 'left',
                 fontFamily: 'inherit', transition: 'background 0.15s, color 0.15s',
                 borderLeft: expanded ? `3px solid ${active ? 'var(--orange)' : 'transparent'}` : '3px solid transparent',
                 whiteSpace: 'nowrap', overflow: 'hidden',
               }}
             >
               <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>{item.icon}</span>
               {expanded && item.label}
             </button>
           )
         })}
       </div>
     ))}
   </nav>
 )
}

function SidebarContent({ activePage, onNavigate, onClose, showClose, currentUser, onLoginClick, onLogout, expanded }) {
 return (
   <>
     {/* Logo header */}
     <div style={{
       padding: expanded ? '18px 20px' : '18px 10px',
       borderBottom: '1px solid var(--gray-200)',
       display: 'flex', alignItems: 'center',
       justifyContent: expanded ? 'space-between' : 'center',
       flexShrink: 0, minHeight: 80,
       transition: 'padding 0.22s ease',
       overflow: 'hidden',
     }}>
       <div
         onClick={() => onNavigate('dashboard')}
         style={{
           display: 'flex', alignItems: 'center',
           gap: expanded ? 12 : 0,
           cursor: 'pointer', borderRadius: 10,
           padding: '4px 6px', transition: 'background 0.15s',
           overflow: 'hidden',
         }}
         onMouseEnter={e => { e.currentTarget.style.background = '#FFF7ED' }}
         onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
       >
         <img
           src="/LOGO CON BLANCO PERIMETRAL.jpg"
           alt="ARMAR"
           style={{ height: 48, width: 'auto', flexShrink: 0 }}
         />
         {expanded && (
           <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--gray-900)', letterSpacing: '-0.3px', whiteSpace: 'nowrap' }}>
             ARMAR
           </span>
         )}
       </div>
       {showClose && expanded && (
         <button
           onClick={onClose}
           style={{
             background: 'var(--gray-100)', border: 'none', borderRadius: 8,
             width: 34, height: 34, display: 'flex', alignItems: 'center',
             justifyContent: 'center', cursor: 'pointer', fontSize: 16,
             color: 'var(--gray-500)', flexShrink: 0,
           }}
         >
           ✕
         </button>
       )}
     </div>

     {/* Auth */}
     <div style={{
       padding: expanded ? '10px 16px' : '10px 6px',
       borderBottom: '1px solid var(--gray-200)',
       flexShrink: 0, overflow: 'hidden',
       transition: 'padding 0.22s ease',
     }}>
       {currentUser ? (
         <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: expanded ? 'flex-start' : 'center' }}>
           <div
             style={{
               width: 30, height: 30, borderRadius: '50%',
               background: 'var(--orange)', color: 'white',
               display: 'flex', alignItems: 'center', justifyContent: 'center',
               fontSize: 12, fontWeight: 800, flexShrink: 0,
             }}
             title={!expanded ? currentUser.nombre : undefined}
           >
             {currentUser.nombre.charAt(0).toUpperCase()}
           </div>
           {expanded && (
             <div style={{ flex: 1, minWidth: 0 }}>
               <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-800)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                 {currentUser.nombre}
               </div>
               <button
                 onClick={onLogout}
                 style={{
                   background: 'none', border: 'none', padding: 0,
                   fontSize: 11, color: 'var(--gray-400)', cursor: 'pointer',
                   fontFamily: 'inherit',
                 }}
               >
                 Cerrar sesión
               </button>
             </div>
           )}
         </div>
       ) : (
         expanded ? (
           <button
             onClick={onLoginClick}
             style={{
               width: '100%', padding: '9px 14px', borderRadius: 8,
               border: '1px solid var(--gray-200)', background: 'white',
               color: 'var(--gray-600)', cursor: 'pointer', fontWeight: 700,
               fontSize: 13, fontFamily: 'inherit', display: 'flex',
               alignItems: 'center', justifyContent: 'center', gap: 6,
             }}
           >
             🔐 Iniciar sesión
           </button>
         ) : (
           <div style={{ display: 'flex', justifyContent: 'center' }} title="Iniciar sesión">
             <span style={{ fontSize: 18, cursor: 'pointer' }} onClick={onLoginClick}>🔐</span>
           </div>
         )
       )}
     </div>

     <NavItems activePage={activePage} onNavigate={onNavigate} expanded={expanded} />

     {/* Footer */}
     {expanded && (
       <div style={{
         padding: '10px 16px', borderTop: '1px solid var(--gray-200)',
         fontSize: 11, color: 'var(--gray-400)', textAlign: 'center', flexShrink: 0,
       }}>
         ARMAR · Sistema de Obras · {new Date().getFullYear()}
       </div>
     )}
   </>
 )
}

function Sidebar({ activePage, onNavigate, isOpen, onClose, isDesktop, currentUser, onLoginClick, onLogout }) {
 const [expanded, setExpanded] = useState(false)
 const authProps = { currentUser, onLoginClick, onLogout }

 /* ── Desktop: fixed sidebar con hover expand ── */
 if (isDesktop) {
   return (
     <aside
       onMouseEnter={() => setExpanded(true)}
       onMouseLeave={() => setExpanded(false)}
       style={{
         width: expanded ? 240 : 64,
         minHeight: '100vh',
         background: expanded ? 'rgba(255,255,255,0.97)' : 'white',
         backdropFilter: expanded ? 'blur(8px)' : 'none',
         borderRight: '1px solid var(--gray-200)',
         display: 'flex', flexDirection: 'column',
         position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50,
         boxShadow: expanded ? '4px 0 24px rgba(0,0,0,0.13)' : '2px 0 12px rgba(0,0,0,0.04)',
         transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1), box-shadow 0.22s ease',
         overflow: 'hidden',
       }}
     >
       <SidebarContent
         activePage={activePage}
         onNavigate={onNavigate}
         expanded={expanded}
         {...authProps}
       />
     </aside>
   )
 }

 /* ── Mobile/Tablet: slide-in drawer ── */
 return (
   <>
     <div
       onClick={onClose}
       style={{
         position: 'fixed', inset: 0, zIndex: 49,
         background: 'rgba(0,0,0,0.5)',
         opacity: isOpen ? 1 : 0,
         pointerEvents: isOpen ? 'auto' : 'none',
         transition: 'opacity 0.25s ease',
       }}
     />
     <aside style={{
       position: 'fixed', left: 0, top: 0, bottom: 0,
       width: 270, background: 'white', zIndex: 50,
       display: 'flex', flexDirection: 'column',
       boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
       transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
       transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
     }}>
       <SidebarContent
         activePage={activePage}
         onNavigate={onNavigate}
         onClose={onClose}
         showClose
         expanded={true}
         {...authProps}
       />
     </aside>
   </>
 )
}

export default Sidebar
