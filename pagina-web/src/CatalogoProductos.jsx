import { useEffect, useState } from 'react';
import DetalleProducto from './DetalleProducto';
import TarjetaProducto from './TarjetaProducto';

const API = import.meta.env.VITE_API_URL;

export default function CatalogoProductos() {
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');
  const [seleccionado, setSeleccionado] = useState(null);

  const cargarCatalogo = async (q = busqueda, cat = categoria) => {
    setCargando(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (q) params.append('q', q);
      if (cat) params.append('categoria', cat);
      const respuesta = await fetch(`${API}/api/catalogo?${params.toString()}`);
      if (!respuesta.ok) throw new Error('No se pudo cargar el catálogo');
      const datos = await respuesta.json();
      setProductos(datos);
      // Las categorías de los chips se toman de la primera carga (sin filtros)
      if (!q && !cat) {
        setCategorias([...new Set(datos.map((p) => p.categoria).filter(Boolean))]);
      }
    } catch (e) {
      setError(
        e instanceof TypeError
          ? 'No se pudo conectar con el servidor. Intenta de nuevo en unos segundos.'
          : e.message
      );
      setProductos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCatalogo('', '');
  }, []);

  const elegirCategoria = (cat) => {
    setCategoria(cat);
    cargarCatalogo(busqueda, cat);
  };

  const buscar = (e) => {
    e.preventDefault();
    cargarCatalogo();
  };

  const limpiar = () => {
    setBusqueda('');
    setCategoria('');
    cargarCatalogo('', '');
  };

  if (seleccionado) {
    return <DetalleProducto id={seleccionado.id} onVolver={() => setSeleccionado(null)} />;
  }

  return (
    <section>
      <div className="seccion-cabecera">
        <div>
          <p className="eyebrow">Diseños Joyería Sánchez</p>
          <h2>Catálogo de productos</h2>
        </div>

        <form className="buscador" onSubmit={buscar} role="search">
          <input
            type="search"
            placeholder="Buscar por nombre o referencia"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar producto"
          />
          <button type="submit" className="btn btn-dorado">Buscar</button>
          {(busqueda || categoria) && (
            <button type="button" className="btn btn-borde" onClick={limpiar}>Limpiar</button>
          )}
        </form>
      </div>

      {categorias.length > 0 && (
        <div className="chips" style={{ marginBottom: '1.5rem' }}>
          <button
            type="button"
            className={categoria === '' ? 'chip activo' : 'chip'}
            onClick={() => elegirCategoria('')}
          >
            Todo
          </button>
          {categorias.map((c) => (
            <button
              key={c}
              type="button"
              className={categoria === c ? 'chip activo' : 'chip'}
              onClick={() => elegirCategoria(c)}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {cargando && <p className="mensaje">Cargando catálogo…</p>}
      {error && <p className="mensaje mensaje-error">{error}</p>}
      {!cargando && !error && productos.length === 0 && (
        <p className="mensaje">No encontramos productos con esa búsqueda.</p>
      )}

      {!cargando && productos.length > 0 && (
        <div className="grid-productos">
          {productos.map((p) => (
            <TarjetaProducto key={p.id} producto={p} onVer={setSeleccionado} />
          ))}
        </div>
      )}
    </section>
  );
}