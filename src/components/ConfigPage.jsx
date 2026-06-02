function ConfigPage() {
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontSize: 28, fontWeight: 800, color: 'var(--gray-900)',
          letterSpacing: '-0.5px', marginBottom: 4,
        }}>
          Configuración
        </h1>
        <p style={{ color: 'var(--gray-500)', fontSize: 14 }}>
          Ajusta las preferencias de tu cuenta y la aplicación
        </p>
      </div>

      <div style={{
        background: 'white',
        borderRadius: 14,
        boxShadow: '0 1px 4px rgba(0,0,0,0.07)',
        border: '1px solid var(--gray-200)',
        padding: '56px 32px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>⚙️</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-700)', marginBottom: 8 }}>
          Módulo en desarrollo
        </h2>
        <p style={{ color: 'var(--gray-400)', fontSize: 14 }}>
          Las opciones de configuración estarán disponibles próximamente.
        </p>
      </div>
    </div>
  )
}

export default ConfigPage
