import { useState } from 'react';
import Encabezado from './Encabezado';
import PiePagina from './PiePagina';
import CatalogoProductos from './CatalogoProductos';
import CatalogoCategorias from './CatalogoCategorias';
import DisponibilidadProducto from './DisponibilidadProducto';
import CintaAnuncios from './CintaAnuncios';
import BannerPortada from './BannerPortada';
import useAparecer from './useAparecer';
import Chatbot from './Chatbot';
import DetalleProducto from './DetalleProducto';

// Página web pública de la joyería: solo catálogo, sin inicio de sesión.
// La gestión de inventario y usuarios está en app-inventario (HU-024).
function App() {
  const [vista, setVista] = useState('todos');
  const [detalleId, setDetalleId] = useState(null); // HU-019: producto abierto desde el chatbot
  useAparecer();

  // Al cambiar de sección se cierra el detalle abierto desde el chatbot
  const cambiarVista = (destino) => {
    setDetalleId(null);
    setVista(destino);
  };

  const verProductoDelChat = (id) => {
    setDetalleId(id);
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  };

  const irA = (destino) => {
    setDetalleId(null);
    setVista(destino);
    document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' });
  };

  let contenido;
  if (detalleId) {
    contenido = <DetalleProducto id={detalleId} onVolver={() => setDetalleId(null)} />;
  } else if (vista === 'categorias') {
    contenido = <CatalogoCategorias />;
  } else if (vista === 'disponibilidad') {
    contenido = <DisponibilidadProducto />;
  } else {
    contenido = <CatalogoProductos />;
  }

  return (
    <>
      <CintaAnuncios />
      <Encabezado vista={vista} onCambiarVista={cambiarVista} />

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
      <Chatbot onVerProducto={verProductoDelChat} />
    </>
  );
}

export default App;