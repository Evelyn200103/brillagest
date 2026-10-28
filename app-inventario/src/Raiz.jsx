import { useEffect, useState } from 'react';
import App from './App.jsx';
import Login from './Login.jsx';
import Usuarios from './Usuarios.jsx';
import AccesoDenegado from './AccesoDenegado.jsx';
import { obtenerUsuario, cerrarSesion, refrescarPerfil, tienePermiso } from './api';

function Raiz() {
  const [usuario, setUsuario] = useState(obtenerUsuario());
  const [vista, setVista] = useState('inventario');
  const [aviso, setAviso] = useState('');

  // Trae del backend los permisos actualizados del usuario (HU-024)
  const actualizarPerfil = async () => {
    try {
      await refrescarPerfil();
      setUsuario(obtenerUsuario());
    } catch {
      // Si falla, se queda con los datos que ya estaban guardados
    }
  };

  useEffect(() => {
    if (obtenerUsuario()) actualizarPerfil();
  }, []);

  // Si el backend responde 403, api.js avisa con este evento
  useEffect(() => {
    const alDenegar = (e) => {
      setAviso(e.detail || 'No tiene permiso para realizar esta acción.');
      setTimeout(() => setAviso(''), 5000);
    };
    window.addEventListener('acceso-denegado', alDenegar);
    return () => window.removeEventListener('acceso-denegado', alDenegar);
  }, []);

  const alEntrar = (u) => {
    setUsuario(u);
    actualizarPerfil();
  };

  if (!usuario) {
    return <Login onEntrar={alEntrar} />;
  }

  const puedeVerInventario = tienePermiso(usuario, 'productos:ver');
  const puedeGestionarUsuarios = tienePermiso(usuario, 'usuarios:gestionar');
  // Solo quien tenga el permiso puede llegar a la vista de usuarios.
  const vistaActual = puedeGestionarUsuarios ? vista : 'inventario';

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
        {puedeGestionarUsuarios && (
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

      {aviso && (
        <div
          role="alert"
          style={{
            fontFamily: 'sans-serif',
            background: '#fdecea',
            color: '#b00020',
            padding: '0.6rem 1rem',
            borderBottom: '1px solid #f5c2c0'
          }}
        >
          {aviso}
        </div>
      )}

      {vistaActual === 'usuarios'
        ? <Usuarios />
        : puedeVerInventario
          ? <App usuario={usuario} />
          : <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}><AccesoDenegado /></div>}
    </>
  );
}

export default Raiz;