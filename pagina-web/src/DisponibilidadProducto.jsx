import { useEffect, useState } from 'react';
import IconoCategoria from './IconoCategoria';

const API = import.meta.env.VITE_API_URL;

export default function DisponibilidadProducto() {
  const [productos, setProductos] = useState([]);
  const [idSeleccionado, setIdSeleccionado] = useState('');
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/catalogo`)
      .then((r) => r.json())
      .then((datos) => setProductos(datos))
      .catch(() => setError('No se pudo cargar la lista de productos'));
  }, []);

  const consultar = async (e) => {
    e?.preventDefault();
    if (!idSeleccionado) {
      setError('Selecciona un producto');
      setResultado(null);
      return;
    }
    setCargando(true);
    setError('');
    setResultado(null);
    try {
      const respuesta = await fetch(`${API}/api/disponibilidad/${idSeleccionado}`);
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || 'Error al consultar');
      setResultado(datos);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <section className="disponibilidad">
      <div className="seccion-cabecera">
        <div>
          <p className="eyebrow">Stock en vivo</p>
          <h2>Consultar disponibilidad</h2>
          <p className="texto-suave" style={{ margin: 0 }}>
            Elige una joya y te decimos al instante si está disponible en la tienda.
          </p>
        </div>
      </div>

      <form className="panel" onSubmit={consultar}>
        <div className="campo">
          <label htmlFor="producto-consulta">Producto</label>
          <select
            id="producto-consulta"
            value={idSeleccionado}
            onChange={(e) => setIdSeleccionado(e.target.value)}
          >
            <option value="">Selecciona un producto</option>
            {productos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} ({p.sku})
              </option>
            ))}
          </select>
        </div>
        <div className="hero-botones" style={{ justifyContent: 'flex-start' }}>
          <button type="submit" className="btn btn-dorado" disabled={cargando}>
            {cargando ? 'Consultando…' : 'Consultar disponibilidad'}
          </button>
          {resultado && (
            <button type="button" className="btn btn-borde" onClick={consultar} disabled={cargando}>
              Actualizar
            </button>
          )}
        </div>
      </form>

      {error && <p className="mensaje mensaje-error" style={{ marginTop: '1rem' }}>{error}</p>}

      {resultado && (
        <div className="panel resultado-disponibilidad">
          <div className="resultado-icono">
            <IconoCategoria categoria={resultado.categoria} />
          </div>
          <div>
            <span className="tarjeta-meta">
              {resultado.categoria || '—'} · Ref. {resultado.sku}
            </span>
            <h3 className="tarjeta-nombre">{resultado.nombre}</h3>
            <span
              className={resultado.disponible ? 'estado estado-disponible' : 'estado estado-agotado'}
              style={{ marginTop: '0.5rem' }}
            >
              {resultado.estado}
            </span>
            <p className="texto-suave" style={{ fontSize: '0.75rem', margin: '0.6rem 0 0' }}>
              Consultado: {new Date(resultado.consultado_en).toLocaleString('es-CO')}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}