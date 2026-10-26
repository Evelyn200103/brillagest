import { useState } from 'react';
import App from './App.jsx';
import Login from './Login.jsx';
import Usuarios from './Usuarios.jsx';
import { obtenerUsuario, cerrarSesion } from './api';

function Raiz() {
  const [usuario, setUsuario] = useState(obtenerUsuario());
  const [vista, setVista] = useState('inventario');

  if (!usuario) {
    return <Login onEntrar={setUsuario} />;
  }

  const esAdmin = usuario.rol === 'administrador';
  // Solo el administrador puede llegar a la vista de usuarios.
  const vistaActual = esAdmin ? vista : 'inventario';

  return (
    <>
      <div
        style={{
          fontFamily: 'sans-serif',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '0.8rem',
          padding: '0.6rem 1rem',
          borderBottom: '1px solid #ddd'
        }}
      >
        {esAdmin && (
          <button
            type="button"
            onClick={() => setVista(vistaActual === 'usuarios' ? 'inventario' : 'usuarios')}
          >
            {vistaActual === 'usuarios' ? 'Ir a inventario' : 'Gestionar usuarios'}
          </button>
        )}
        <span>{usuario.nombre} ({usuario.rol})</span>
        <button type="button" onClick={cerrarSesion}>Cerrar sesión</button>
      </div>

      {vistaActual === 'usuarios' ? <Usuarios /> : <App />}
    </>
  );
}

export default Raiz;
