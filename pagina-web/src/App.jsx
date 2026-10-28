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

  let contenido;
  if (vista === 'categorias') {
    contenido = <CatalogoCategorias />;
  } else if (vista === 'disponibilidad') {
    contenido = <DisponibilidadProducto />;
  } else {
    contenido = <CatalogoProductos />;
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>
      <Encabezado vista={vista} onCambiarVista={setVista} />
      <main>{contenido}</main>
      <PiePagina />
    </div>
  );
}

export default App;