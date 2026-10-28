import IconoCategoria from './IconoCategoria';
import { formatoPrecio } from './formato';

// Tarjeta de un producto del catálogo (se usa en "Todos" y en "Por categoría")
function TarjetaProducto({ producto, onVer }) {
  const p = producto;
  const detalle = p.material || [p.marca, p.tipo].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      className={p.disponible ? 'tarjeta' : 'tarjeta agotada'}
      onClick={() => onVer(p)}
      aria-label={`Ver detalle de ${p.nombre}`}
    >
      <div className="tarjeta-imagen">
        <IconoCategoria categoria={p.categoria} />
      </div>
      <span className={p.disponible ? 'estado estado-disponible' : 'estado estado-agotado'}>
        {p.estado}
      </span>
      <div className="tarjeta-cuerpo">
        <span className="tarjeta-meta">
          {p.categoria}
          {detalle ? ` · ${detalle}` : ''}
        </span>
        <h3 className="tarjeta-nombre">{p.nombre}</h3>
        <div className="tarjeta-pie">
          <span className="precio">{formatoPrecio(p.precio)}</span>
          {p.peso ? <span className="peso">{p.peso} g</span> : null}
        </div>
      </div>
    </button>
  );
}

export default TarjetaProducto;