import { useState } from 'react';
import Encabezado from './Encabezado';
import PiePagina from './PiePagina';
import CatalogoProductos from './CatalogoProductos';
import CatalogoCategorias from './CatalogoCategorias';
import DisponibilidadProducto from './DisponibilidadProducto';

// Página web pública de la joyería: solo catálogo, sin inicio de sesión.
// La gestión de inventario y usuarios está en app-inventario (HU-024).
function App() {
  const [vista, setVista] = useState('todos');

  const irAlCatalogo = () => {
    setVista('todos');
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  };

  let contenido;
  if (vista === 'categorias') {
    contenido = <CatalogoCategorias />;
  } else if (vista === 'disponibilidad') {
    contenido = <DisponibilidadProducto />;
  } else {
    contenido = <CatalogoProductos />;
  }

  return (
    <>
      <Encabezado vista={vista} onCambiarVista={setVista} />

      <section className="hero">
        <div className="contenedor hero-contenido">
          <p className="eyebrow">Oro 18k · Oro 10k · Plata 925</p>
          <h1 className="hero-titulo">Tu brillo es único</h1>
          <p className="hero-texto">
            Descubre el catálogo de Joyería Sánchez, actualizado en tiempo real desde nuestro inventario.
          </p>
          <div className="hero-botones">
            <button type="button" className="btn btn-dorado" onClick={irAlCatalogo}>
              Ver catálogo
            </button>
            <button type="button" className="btn btn-borde" onClick={() => setVista('categorias')}>
                 Explorar por categoría
               </button>
          </div>
        </div>
      </section>

      <section className="franja">
        <div className="contenedor franja-fila">
          <div>
            <strong>+30 años</strong>
            <span>de trayectoria</span>
          </div>
          <div>
            <strong>Barrio Restrepo</strong>
            <span>Bogotá D.C.</span>
          </div>
          <div>
            <strong>Stock en vivo</strong>
            <span>sincronizado con inventario</span>
          </div>
        </div>
      </section>

      <main id="catalogo" className="contenedor seccion">
        {contenido}
      </main>

      <PiePagina />
    </>
  );
}

export default App;