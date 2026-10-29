import BotonTema from './BotonTema';
import LogoJoyeria from './LogoJoyeria';

const OPCIONES = [
  { id: 'todos', texto: 'Todos los productos' },
  { id: 'categorias', texto: 'Por categoría' },
  { id: 'disponibilidad', texto: 'Consultar disponibilidad' }
];

function Encabezado({ vista, onCambiarVista }) {
  return (
    <header className="encabezado">
      <div className="contenedor encabezado-fila">
        <button type="button" className="marca" onClick={() => onCambiarVista('todos')}>
          <span>
            <LogoJoyeria variante="nombre" className="marca-nombre-logo" titulo="Joyería Sánchez" />
            <span className="marca-sub">Joyas &amp; relojes · Bogotá</span>
          </span>
        </button>

        <nav className="nav" aria-label="Secciones del catálogo">
          {OPCIONES.map((o) => (
            <button
              key={o.id}
              type="button"
              className={vista === o.id ? 'nav-boton activo' : 'nav-boton'}
              onClick={() => onCambiarVista(o.id)}
            >
              {o.texto}
            </button>
          ))}
        </nav>

        <BotonTema />
      </div>
    </header>
  );
}

export default Encabezado;
