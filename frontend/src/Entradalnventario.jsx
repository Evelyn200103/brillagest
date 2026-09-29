import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

function EntradaInventario({ productos, onRegistrada }) {
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [responsable, setResponsable] = useState('');
  const [observacion, setObservacion] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [esError, setEsError] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const mostrarError = (texto) => {
    setEsError(true);
    setMensaje(texto);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setEsError(false);

    if (!productoId) {
      mostrarError('Selecciona un producto.');
      return;
    }

    const cant = Number(cantidad);
    if (!Number.isInteger(cant) || cant <= 0) {
      mostrarError('La cantidad debe ser un número entero mayor que cero.');
      return;
    }

    setEnviando(true);
    try {
      const res = await fetch(`${API_URL}/api/movimientos/entrada`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: Number(productoId),
          cantidad: cant,
          responsable,
          observacion
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar la entrada');
      }

      setMensaje(
        `Entrada registrada correctamente. Nuevo stock de ${data.producto.nombre}: ${data.producto.stock}.`
      );
      setProductoId('');
      setCantidad('');
      setResponsable('');
      setObservacion('');
      if (onRegistrada) onRegistrada();
    } catch (err) {
      mostrarError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <h2>Registrar entrada de inventario</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.6rem' }}>
        <select value={productoId} onChange={(e) => setProductoId(e.target.value)}>
          <option value="">Selecciona un producto</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} — {p.nombre} (stock: {p.stock})
            </option>
          ))}
        </select>

        <input
          type="number"
          min="1"
          step="1"
          placeholder="Cantidad ingresada"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
        />

        <input
          placeholder="Responsable (opcional)"
          value={responsable}
          onChange={(e) => setResponsable(e.target.value)}
        />

        <input
          placeholder="Observación (opcional)"
          value={observacion}
          onChange={(e) => setObservacion(e.target.value)}
        />

        <button type="submit" disabled={enviando}>
          {enviando ? 'Registrando...' : 'Registrar entrada'}
        </button>
      </form>

      {mensaje && (
        <p style={{ color: esError ? 'crimson' : 'green' }}>{mensaje}</p>
      )}
    </div>
  );
}

export default EntradaInventario;