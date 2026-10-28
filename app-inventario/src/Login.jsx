import { useState } from 'react';
import { guardarSesion } from './api';
import BotonTema from './BotonTema';

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
      setError(
        err instanceof TypeError
          ? 'No se pudo conectar con el servidor. Intenta de nuevo en unos segundos.'
          : err.message
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login">
      <section className="login-portada">
        <div className="login-marca">
          <span className="login-sello">BG</span>
          <span>
            <span className="marca-sub">Sistema de gestión</span>
            <span className="marca-nombre">BRILLAGEST</span>
          </span>
        </div>

        <div className="login-texto">
          <p className="eyebrow">Joyería Sánchez · Bogotá</p>
          <h1 className="login-titulo">
            Todo tu inventario,
            <br />
            en un solo lugar.
          </h1>
          <p className="texto-suave">
            Registra entradas y salidas, consulta el stock en tiempo real y mantén el catálogo web al día.
          </p>
          <span className="linea-dorada" />
          <div className="login-datos">
            <div>
              <strong>18k · 10k · 925</strong>
              <span>materiales</span>
            </div>
            <div>
              <strong>Stock en vivo</strong>
              <span>sincronizado</span>
            </div>
            <div>
              <strong>24/7</strong>
              <span>catálogo web</span>
            </div>
          </div>
        </div>

        <p className="login-pie">Acceso protegido · autenticación JWT · roles por usuario</p>
      </section>

      <section className="login-lado">
        <div className="login-tema">
          <BotonTema />
        </div>

        <form className="panel login-tarjeta" onSubmit={handleSubmit}>
          <div className="lateral-marca" style={{ padding: 0, marginBottom: '1.4rem' }}>
            <span className="marca-logo" aria-hidden="true" />
            <span className="marca-nombre">BrillaGest</span>
          </div>

          <h2 className="login-bienvenida">Bienvenido de nuevo</h2>
          <p className="texto-suave" style={{ margin: '0 0 1.4rem', fontSize: '0.85rem' }}>
            Ingresa tus credenciales para continuar
          </p>

          <div className="campo">
            <label htmlFor="login-usuario">Usuario</label>
            <input
              id="login-usuario"
              name="usuario"
              autoComplete="username"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoFocus
            />
          </div>
          <div className="campo">
            <label htmlFor="login-password">Contraseña</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="mensaje mensaje-error" style={{ margin: '0 0 1rem' }}>{error}</p>}

          <button type="submit" className="btn btn-dorado btn-ancho" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Iniciar sesión'}
          </button>

          <div className="separador"><span>Acceso interno</span></div>
          <p className="nota" style={{ margin: 0 }}>
            Las contraseñas se guardan cifradas (bcrypt) y cada usuario solo ve lo que su rol le permite.
          </p>
        </form>
      </section>
    </div>
  );
}

export default Login;
