import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

const ESTADOS = {
  DISPONIBLE: { texto: 'Disponible', color: '#1b7f3b' },
  STOCK_BAJO: { texto: 'Stock bajo', color: '#b26a00' },
  SIN_STOCK: { texto: 'Sin stock', color: '#b00020' }
};

function Existencias({ categorias, version }) {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');

  const cargar = (q = busqueda, cat = categoria) => {
    setCargando(true);
    setError('');

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (cat) params.set('categoria', cat);

    fetch(`${API_URL}/api/existencias?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error(data.error || 'Respuesta inesperada del servidor');
        }
        setItems(data);
      })
      .catch((err) => setError(err.message || 'No se pudieron cargar las existencias'))
      .finally(() => setCargando(false));
  };

  // Se recarga al abrir la pantalla y cada vez que cambia "version"
  // (App.jsx la incrementa después de una entrada o una salida).
  useEffect(() => {
    cargar();
  }, [version]);

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2>Existencias</h2>

      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem' }}>
        <input
          placeholder="Buscar por nombre o SKU"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ flex: 1 }}
        />
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button type="button" onClick={() => cargar()}>Consultar</button>
      </div>

      {error && <p style={{ color: '#b00020' }}>{error}</p>}

      {cargando ? (
        <p>Cargando existencias...</p>
      ) : items.length === 0 && !error ? (
        <p>No hay productos registrados que coincidan con la consulta.</p>
      ) : (
        <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Material / Marca</th>
              <th>Existencias</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const estado = ESTADOS[p.estado] || ESTADOS.DISPONIBLE;
              return (
                <tr key={p.id}>
                  <td>{p.sku}</td>
                  <td>{p.nombre}</td>
                  <td>{p.categoria}</td>
                  <td>{p.material || `${p.marca || '—'} (${p.tipo || '—'})`}</td>
                  <td>{p.stock}</td>
                  <td style={{ color: estado.color, fontWeight: 'bold' }}>{estado.texto}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Existencias;