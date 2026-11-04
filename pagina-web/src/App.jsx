import { useState } from 'react';
import Encabezado from './Encabezado';
import PiePagina from './PiePagina';
import CatalogoProductos from './CatalogoProductos';
import CatalogoCategorias from './CatalogoCategorias';
import DisponibilidadProducto from './DisponibilidadProducto';
import CintaAnuncios from './CintaAnuncios';
import BannerPortada from './BannerPortada';
import useAparecer from './useAparecer';

// Página web pública de la joyería: solo catálogo, sin inicio de sesión.
// La gestión de inventario y usuarios está en app-inventario (HU-024).
function App() {
  const [vista, setVista] = useState('todos');
  useAparecer();

  const irA = (destino) => {
    setVista(destino);
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
      <CintaAnuncios />
      <Encabezado vista={vista} onCambiarVista={setVista} />

      <BannerPortada onIr={irA} />

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