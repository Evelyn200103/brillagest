import { useState } from 'react';
import Encabezado from './Encabezado';
import PiePagina from './PiePagina';
import CatalogoProductos from './CatalogoProductos';
import CatalogoCategorias from './CatalogoCategorias';
import DisponibilidadProducto from './DisponibilidadProducto';
import Inventario from './inventario/Inventario';

function App() {
  const [vista, setVista] = useState('todos');

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>
      <Encabezado vista={vista} onCambiarVista={setVista} />
      <main>
        {vista === 'todos' && <CatalogoProductos />}
        {vista === 'categorias' && <CatalogoCategorias />}
        {vista === 'disponibilidad' && <DisponibilidadProducto />}
        {vista === 'inventario' && <Inventario />}
      </main>
      <PiePagina />
    </div>
  );
}

export default App;