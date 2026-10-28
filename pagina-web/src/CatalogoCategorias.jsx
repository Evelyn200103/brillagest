import { useEffect, useState } from 'react';
import DetalleProducto from './DetalleProducto';
import TarjetaProducto from './TarjetaProducto';
import IconoCategoria from './IconoCategoria';

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
    <section>
      <div className="seccion-cabecera">
        <div>
          <p className="eyebrow">Explora por tipo de joya</p>
          <h2>Catálogo por categorías</h2>
        </div>
      </div>

      <div className="grid-categorias">
        {categorias.map((c) => (
          <button
            key={c.nombre}
            type="button"
            className={seleccionada === c.nombre ? 'tarjeta-categoria activo' : 'tarjeta-categoria'}
            onClick={() => elegirCategoria(c.nombre)}
          >
            <IconoCategoria categoria={c.nombre} />
            <span className="tarjeta-categoria-nombre">{c.nombre}</span>
            <span className="chip-numero">{c.total}</span>
          </button>
        ))}
      </div>

      {error && <p className="mensaje mensaje-error">{error}</p>}

      {!seleccionada && !error && (
        <p className="mensaje">Selecciona una categoría para ver sus productos.</p>
      )}

      {seleccionada && (
        <h3 className="subtitulo-seccion">{seleccionada}</h3>
      )}

      {seleccionada && cargando && <p className="mensaje">Cargando…</p>}

      {seleccionada && !cargando && !error && productos.length === 0 && (
        <p className="mensaje">Por el momento no hay productos en la categoría "{seleccionada}".</p>
      )}

      {!cargando && productos.length > 0 && (
        <div className="grid-productos">
          {productos.map((p) => (
            <TarjetaProducto key={p.id} producto={p} onVer={(prod) => setDetalleId(prod.id)} />
          ))}
        </div>
      )}
    </section>
  );
}

export default CatalogoCategorias;