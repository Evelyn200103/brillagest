import { useEffect, useState } from 'react';
import DetalleProducto from './DetalleProducto';

const API_URL = import.meta.env.VITE_API_URL;

function CatalogoCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [seleccionada, setSeleccionada] = useState('');
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [detalleId, setDetalleId] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/catalogo/categorias`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setCategorias)
      .catch(() => setError('No se pudieron cargar las categorías.'));
  }, []);

  const elegirCategoria = (nombre) => {
    setSeleccionada(nombre);
    setError('');
    setCargando(true);

    fetch(`${API_URL}/api/catalogo/categorias/${encodeURIComponent(nombre)}/productos`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al consultar la categoría');
        return data;
      })
      .then((data) => setProductos(data.productos))
      .catch((err) => {
        setProductos([]);
        setError(err.message);
      })
      .finally(() => setCargando(false));
  };

  if (detalleId) {
    return <DetalleProducto id={detalleId} onVolver={() => setDetalleId(null)} />;
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2>Catálogo por categorías</h2>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
        {categorias.map((c) => (
          <button
            key={c.nombre}
            type="button"
            onClick={() => elegirCategoria(c.nombre)}
            style={{
              fontWeight: seleccionada === c.nombre ? 'bold' : 'normal',
              border: seleccionada === c.nombre ? '2px solid goldenrod' : '1px solid gray'
            }}
          >
            {c.nombre} ({c.total})
          </button>
        ))}
      </div>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {!seleccionada && !error && <p>Selecciona una categoría para ver sus productos.</p>}

      {seleccionada && cargando && <p>Cargando...</p>}

      {seleccionada && !cargando && !error && productos.length === 0 && (
        <p>Por el momento no hay productos disponibles en la categoría "{seleccionada}".</p>
      )}

      {!cargando && productos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.8rem' }}>
          {productos.map((p) => (
            <div key={p.id} style={{ border: '1px solid gray', borderRadius: '6px', padding: '0.8rem' }}>
              <strong>{p.nombre}</strong>
              <p style={{ margin: '0.3rem 0' }}>
                {p.material || `${p.marca || '—'} (${p.tipo || '—'})`}
              </p>
              {p.peso && <p style={{ margin: '0.3rem 0' }}>{p.peso} g</p>}
              <p style={{ margin: '0.3rem 0' }}>${Number(p.precio).toLocaleString('es-CO')}</p>
              {!p.disponible && <span style={{ color: 'crimson' }}>Agotado</span>}
              <div style={{ marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setDetalleId(p.id)}>Ver detalle →</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CatalogoCategorias;