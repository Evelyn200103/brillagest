import { useEffect, useState } from 'react';
import IconoCategoria from './IconoCategoria';
import { formatoPrecio } from './formato';

const API_URL = import.meta.env.VITE_API_URL;

const DISPONIBILIDAD = {
  DISPONIBLE: { texto: 'Disponible', clase: 'estado estado-disponible' },
  AGOTADO: { texto: 'Agotado por el momento', clase: 'estado estado-agotado' }
};

function Dato({ etiqueta, valor }) {
  return (
    <div className="dato">
      <dt>{etiqueta}</dt>
      <dd>{valor}</dd>
    </div>
  );
}

function DetalleProducto({ id, onVolver }) {
  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Al abrir el detalle, la página sube hasta el producto
  useEffect(() => {
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  }, [id]);

  useEffect(() => {
    let activo = true;
    setCargando(true);
    setError('');
    setProducto(null);

    fetch(`${API_URL}/api/catalogo/productos/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No se pudo consultar el producto');
        return data;
      })
      .then((data) => {
        if (activo) setProducto(data);
      })
      .catch((err) => {
        if (activo) {
          setError(
            err instanceof TypeError
              ? 'No se pudo conectar con el servidor. Intenta de nuevo en unos segundos.'
              : err.message
          );
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [id]);

  const estado = producto ? DISPONIBILIDAD[producto.disponibilidad] : null;
  const esReloj = producto?.categoria === 'Relojes';

  return (
    <section>
      <button type="button" className="btn-texto" onClick={onVolver}>
        ← Volver al catálogo
      </button>

      {cargando && <p className="mensaje">Cargando detalle del producto…</p>}

      {error && <p className="mensaje mensaje-error">{error}</p>}

      {producto && (
        <div className="detalle">
          <div className={producto.disponible ? 'detalle-imagen' : 'detalle-imagen agotada'}>
            <IconoCategoria categoria={producto.categoria} />
          </div>

          <div className="detalle-info">
            <p className="eyebrow">{producto.categoria || 'Joyería'}</p>
            <h2 className="detalle-nombre">{producto.nombre}</h2>
            <span className={estado?.clase || 'estado'}>
              {estado?.texto || producto.disponibilidad}
            </span>

            <p className="detalle-precio">{formatoPrecio(producto.precio)}</p>

            <dl className="datos">
              {esReloj ? (
                <>
                  <Dato etiqueta="Marca" valor={producto.marca || '—'} />
                  <Dato etiqueta="Tipo" valor={producto.tipo || '—'} />
                </>
              ) : (
                <Dato etiqueta="Material" valor={producto.material || '—'} />
              )}
              <Dato etiqueta="Peso" valor={producto.peso ? `${producto.peso} g` : '—'} />
              <Dato etiqueta="Referencia" valor={producto.sku} />
            </dl>
          </div>
        </div>
      )}
    </section>
  );
}

export default DetalleProducto;