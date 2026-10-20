import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

function HistorialMovimientos() {
  const [movimientos, setMovimientos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [tipo, setTipo] = useState('');
  const [productoId, setProductoId] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarMovimientos = async () => {
    setCargando(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (tipo) params.set('tipo', tipo);
      if (productoId) params.set('producto_id', productoId);

      const res = await fetch(`${API_URL}/api/movimientos?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al consultar los movimientos');
      }
      setMovimientos(data);
    } catch (err) {
      setError(err.message);
      setMovimientos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetch(`${API_URL}/api/productos`)
      .then((res) => res.json())
      .then((data) => setProductos(Array.isArray(data) ? data : []))
      .catch(() => setProductos([]));
  }, []);

  useEffect(() => {
    cargarMovimientos();
  }, [tipo, productoId]);

  const formatearFecha = (valor) =>
    new Date(valor).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short'
    });

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h2>Historial de movimientos</h2>

      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem' }}>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="">Entradas y salidas</option>
          <option value="ENTRADA">Solo entradas</option>
          <option value="SALIDA">Solo salidas</option>
        </select>

        <select
          value={productoId}
          onChange={(e) => setProductoId(e.target.value)}
          style={{ flex: 1 }}
        >
          <option value="">Todos los productos</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} — {p.nombre}
            </option>
          ))}
        </select>

        <button type="button" onClick={cargarMovimientos}>Actualizar</button>
      </div>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {cargando ? (
        <p>Cargando...</p>
      ) : movimientos.length === 0 && !error ? (
        <p>No hay registros disponibles.</p>
      ) : (
        <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Responsable</th>
              <th>Observación</th>
            </tr>
          </thead>
          <tbody>
            {movimientos.map((m) => (
              <tr key={m.id}>
                <td>{formatearFecha(m.creado_en)}</td>
                <td>{m.sku} — {m.producto}</td>
                <td style={{ color: m.tipo === 'ENTRADA' ? 'green' : 'crimson' }}>
                  {m.tipo === 'ENTRADA' ? 'Entrada' : 'Salida'}
                </td>
                <td>{m.cantidad}</td>
                <td>{m.responsable || '—'}</td>
                <td>{m.observacion || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default HistorialMovimientos;