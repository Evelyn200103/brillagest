import CatalogoProductos from './CatalogoProductos';
import CatalogoCategorias from './CatalogoCategorias';
import DisponibilidadProducto from './DisponibilidadProducto';

function App() {
  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1>Joyería Sánchez</h1>
      <CatalogoProductos />
      <CatalogoCategorias />
      <DisponibilidadProducto />
    </div>
  );
}

export default App;