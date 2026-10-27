import { useState } from 'react';
import { guardarSesion } from './sesion';

const API_URL = import.meta.env.VITE_API_URL;

function Login({ onEntrar }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!usuario.trim() || !password) {
      setError('Ingrese el usuario y la contraseña.');
      return;
    }

    setEnviando(true);

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: usuario.trim(), password })
      });

      const datos = await res.json();

      if (!res.ok) {
        throw new Error(datos.error || 'No se pudo iniciar sesión.');
      }

      guardarSesion(datos.token, datos.usuario);
      onEntrar(datos.usuario);
    } catch (err) {
      setError(err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={{ maxWidth: '360px', margin: '2rem auto' }}>
      <h2>Iniciar sesión</h2>
      <p style={{ color: '#666' }}>Acceso para el personal de la joyería.</p>

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.6rem' }}>
        <input
          name="usuario"
          placeholder="Usuario"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
          autoFocus
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" disabled={enviando}>
          {enviando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </div>
  );
}

export default Login;
