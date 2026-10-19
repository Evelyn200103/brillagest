import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

const formatoPrecio = (valor) => {
  const numero = Number(valor);
  if (isNaN(numero)) return '—';
  return numero.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  });
};

const DISPONIBILIDAD = {
  DISPONIBLE: { texto: 'Disponible', color: '#1b7f3b' },
  AGOTADO: { texto: 'Agotado por el momento', color: '#b00020' }
};

function Dato({ etiqueta, valor }) {
  return (
    <p style={{ margin: '0.4rem 0' }}>
      <b>{etiqueta}:</b> {valor}
    </p>
  );
}

function DetalleProducto({ id, onVolver }) {
  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

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
    <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16, marginTop: 24 }}>
      <button type="button" onClick={onVolver}>← Volver al catálogo</button>

      {cargando && <p>Cargando detalle del producto...</p>}

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      {producto && (
        <>
          <h2>{producto.nombre}</h2>

          <p style={{ fontWeight: 'bold', color: estado?.color }}>
            {estado?.texto || producto.disponibilidad}
          </p>

          <Dato etiqueta="Categoría" valor={producto.categoria || '—'} />
          {esReloj ? (
            <>
              <Dato etiqueta="Marca" valor={producto.marca || '—'} />
              <Dato etiqueta="Tipo" valor={producto.tipo || '—'} />
            </>
          ) : (
            <Dato etiqueta="Material" valor={producto.material || '—'} />
          )}
          <Dato etiqueta="Peso" valor={producto.peso ? `${producto.peso} g` : '—'} />
          <Dato etiqueta="Precio" valor={formatoPrecio(producto.precio)} />
          <Dato etiqueta="Referencia (SKU)" valor={producto.sku} />
        </>
      )}
    </section>
  );
}

export default DetalleProducto;