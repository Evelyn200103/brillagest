import { apiFetch } from './api';
import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

function HistorialMovimientos({ version = 0 }) {
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

      const res = await apiFetch(`${API_URL}/api/movimientos?${params.toString()}`);
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
    apiFetch(`${API_URL}/api/productos`)
      .then((res) => res.json())
      .then((data) => setProductos(Array.isArray(data) ? data : []))
      .catch(() => setProductos([]));
  }, []);

  // Se recarga al cambiar los filtros y después de cada entrada o salida
  useEffect(() => {
    cargarMovimientos();
  }, [tipo, productoId, version]);

  const formatearFecha = (valor) =>
    new Date(valor).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short'
    });

  return (
    <section className="bloque">
      <div className="bloque-cabecera">
        <h2 className="panel-titulo">Historial de movimientos</h2>
        <div className="filtros">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} aria-label="Tipo de movimiento">
            <option value="">Entradas y salidas</option>
            <option value="ENTRADA">Solo entradas</option>
            <option value="SALIDA">Solo salidas</option>
          </select>

          <select value={productoId} onChange={(e) => setProductoId(e.target.value)} aria-label="Producto">
            <option value="">Todos los productos</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} — {p.nombre}
              </option>
            ))}
          </select>

          <button type="button" className="btn btn-borde" onClick={cargarMovimientos}>Actualizar</button>
        </div>
      </div>

      {error && <p className="mensaje mensaje-error">{error}</p>}

      {cargando ? (
        <p className="mensaje">Cargando…</p>
      ) : movimientos.length === 0 && !error ? (
        <p className="mensaje">No hay registros disponibles.</p>
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla">
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
                  <td className="celda-numero">{formatearFecha(m.creado_en)}</td>
                  <td>
                    <span className="celda-codigo">{m.sku}</span> {m.producto}
                  </td>
                  <td>
                    <span className={m.tipo === 'ENTRADA' ? 'estado estado-disponible' : 'estado estado-agotado'}>
                      {m.tipo === 'ENTRADA' ? 'Entrada' : 'Salida'}
                    </span>
                  </td>
                  <td className="celda-numero">{m.tipo === 'ENTRADA' ? '+' : '−'}{m.cantidad}</td>
                  <td>{m.responsable || '—'}</td>
                  <td className="texto-suave">{m.observacion || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default HistorialMovimientos;
