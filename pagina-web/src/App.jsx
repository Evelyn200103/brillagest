import { useEffect, useState } from 'react';
import Encabezado from './Encabezado';
import PiePagina from './PiePagina';
import CatalogoProductos from './CatalogoProductos';
import CatalogoCategorias from './CatalogoCategorias';
import DisponibilidadProducto from './DisponibilidadProducto';
import Inventario from './inventario/Inventario';
import Usuarios from './Usuarios';
import Login from './Login';
import AccesoDenegado from './AccesoDenegado';
import { obtenerToken, obtenerUsuario, refrescarPerfil, tienePermiso } from './sesion';

// Pantallas protegidas y el permiso que exige cada una (HU-024).
// Las pantallas que no están aquí (el catálogo) son públicas.
const PERMISO_DE_VISTA = {
  inventario: 'productos:ver',
  usuarios: 'usuarios:gestionar'
};

function App() {
  const [vista, setVista] = useState('todos');
  const [usuario, setUsuario] = useState(obtenerUsuario());
  const [aviso, setAviso] = useState('');

  // Al abrir la página se pide al servidor el rol y los permisos actuales.
  useEffect(() => {
    if (obtenerToken()) {
      refrescarPerfil().then((u) => u && setUsuario(u));
    }
  }, []);

  // Si el servidor responde 403, se muestra el aviso y se actualizan los permisos.
  useEffect(() => {
    const alDenegar = (e) => {
      setAviso(e.detail);
      refrescarPerfil().then((u) => u && setUsuario(u));
    };
    window.addEventListener('acceso-denegado', alDenegar);
    return () => window.removeEventListener('acceso-denegado', alDenegar);
  }, []);

  const cambiarVista = (nueva) => {
    setAviso('');
    setVista(nueva);
  };

  const alEntrar = (u) => {
    setUsuario(u);
    setVista('inventario');
  };

  const permisoNecesario = PERMISO_DE_VISTA[vista];

  let contenido;
  if (vista === 'login' || (permisoNecesario && !usuario)) {
    contenido = <Login onEntrar={alEntrar} />;
  } else if (permisoNecesario && !tienePermiso(usuario, permisoNecesario)) {
    contenido = <AccesoDenegado />;
  } else if (vista === 'todos') {
    contenido = <CatalogoProductos />;
  } else if (vista === 'categorias') {
    contenido = <CatalogoCategorias />;
  } else if (vista === 'disponibilidad') {
    contenido = <DisponibilidadProducto />;
  } else if (vista === 'inventario') {
    contenido = <Inventario usuario={usuario} />;
  } else if (vista === 'usuarios') {
    contenido = <Usuarios />;
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '1000px', margin: '0 auto', textAlign: 'left' }}>
      <Encabezado vista={vista} onCambiarVista={cambiarVista} usuario={usuario} />
      {aviso && (
        <p role="alert" style={{ color: '#b00020', border: '1px solid #b00020', padding: '0.5rem 0.8rem' }}>
          {aviso}{' '}
          <button type="button" onClick={() => setAviso('')}>Cerrar aviso</button>
        </p>
      )}
      <main>{contenido}</main>
      <PiePagina />
    </div>
  );
}

export default App;
