import { useState } from 'react';
import App from './App.jsx';
import Login from './Login.jsx';
import { obtenerUsuario, cerrarSesion } from './api';

function Raiz() {
  const [usuario, setUsuario] = useState(obtenerUsuario());

  if (!usuario) {
    return <Login onEntrar={setUsuario} />;
  }

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
        <span>{usuario.nombre} ({usuario.rol})</span>
        <button type="button" onClick={cerrarSesion}>Cerrar sesión</button>
      </div>

      <App />
    </>
  );
}

export default Raiz;