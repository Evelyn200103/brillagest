// Mientras no exista el inicio de sesión, la opción Inventario solo se muestra
// si el .env tiene VITE_MOSTRAR_INVENTARIO=true (en Vercel no se define).
const MOSTRAR_INVENTARIO = true;

function Encabezado({ vista, onCambiarVista }) {
  const opcion = (id, texto) => (
    <button
      type="button"
      onClick={() => onCambiarVista(id)}
      style={{
        background: 'none',
        border: 'none',
        borderBottom: vista === id ? '2px solid goldenrod' : '2px solid transparent',
        fontWeight: vista === id ? 'bold' : 'normal',
        fontSize: '1rem',
        cursor: 'pointer',
        padding: '0.3rem 0',
        color: 'inherit'
      }}
    >
      {texto}
    </button>
  );

  return (
    <header style={{ borderBottom: '1px solid #ddd', paddingBottom: '1rem', marginBottom: '1rem' }}>
      <h1 style={{ margin: 0 }}>Joyería Sánchez</h1>
      <p style={{ margin: '0.3rem 0 1rem', color: '#666' }}>Catálogo de joyas y relojes</p>
      <nav style={{ display: 'flex', gap: '1.5rem' }}>
        {opcion('todos', 'Todos los productos')}
        {opcion('categorias', 'Por categoría')}
        {opcion('disponibilidad', 'Consultar disponibilidad')}
        {MOSTRAR_INVENTARIO && opcion('inventario', 'Inventario')}
      </nav>
    </header>
  );
}

export default Encabezado;