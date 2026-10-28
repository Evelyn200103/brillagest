import { apiFetch, obtenerUsuario } from './api';
import { useEffect, useState } from 'react';
import CabeceraPagina from './CabeceraPagina';
import { iniciales } from './formato';
import { IconoEditar, IconoUsuarios } from './Iconos';

const API_URL = import.meta.env.VITE_API_URL;

const ROLES = ['administrador', 'empleado'];

const FORM_VACIO = { usuario: '', nombre: '', password: '', rol: 'empleado' };

function Usuarios() {
  const sesion = obtenerUsuario();

  const [usuarios, setUsuarios] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  const [form, setForm] = useState(FORM_VACIO);
  const [editandoId, setEditandoId] = useState(null);

  const cargarUsuarios = () => {
    setCargando(true);
    setError('');

    apiFetch(`${API_URL}/api/usuarios`)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error(data.error || 'Respuesta inesperada del servidor');
        }
        setUsuarios(data);
      })
      .catch((err) => setError(err.message || 'No se pudo cargar la lista de usuarios'))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleEditar = (u) => {
    setEditandoId(u.id);
    setForm({ usuario: u.usuario, nombre: u.nombre, password: '', rol: u.rol });
    setError('');
    setMensaje('');
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setError('');
    setMensaje('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMensaje('');

    const usuarioLimpio = form.usuario.trim();
    const nombreLimpio = form.nombre.trim();

    // Al editar, el usuario no se cambia y la contraseña es opcional.
    if (!editandoId && !usuarioLimpio) {
      setError('El usuario es obligatorio.');
      return;
    }

    if (!nombreLimpio) {
      setError('El nombre es obligatorio.');
      return;
    }

    if (!form.rol) {
      setError('El rol es obligatorio.');
      return;
    }

    if (!editandoId && !form.password) {
      setError('La contraseña es obligatoria.');
      return;
    }

    if (form.password && form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    const payload = editandoId
      ? { nombre: nombreLimpio, rol: form.rol }
      : { usuario: usuarioLimpio, nombre: nombreLimpio, password: form.password, rol: form.rol };

    if (editandoId && form.password) {
      payload.password = form.password;
    }

    try {
      const url = editandoId ? `${API_URL}/api/usuarios/${editandoId}` : `${API_URL}/api/usuarios`;
      const method = editandoId ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const datos = await res.json();

      if (!res.ok) {
        throw new Error(datos.error || 'Error al guardar el usuario');
      }

      setMensaje(editandoId ? 'Usuario actualizado con éxito.' : 'Usuario registrado con éxito.');
      setEditandoId(null);
      setForm(FORM_VACIO);
      cargarUsuarios();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCambiarEstado = async (u) => {
    setError('');
    setMensaje('');

    try {
      const res = await apiFetch(`${API_URL}/api/usuarios/${u.id}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !u.activo })
      });

      const datos = await res.json();

      if (!res.ok) {
        throw new Error(datos.error || 'Error al cambiar el estado del usuario');
      }

      setMensaje(u.activo ? 'Usuario desactivado.' : 'Usuario activado.');
      cargarUsuarios();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <CabeceraPagina titulo="Usuarios" Icono={IconoUsuarios} />

      <div className="usuarios-grid">
        <form className="panel formulario" onSubmit={handleSubmit}>
          <h2 className="panel-titulo">{editandoId ? 'Editar usuario' : 'Registrar usuario'}</h2>

          <div className="campo">
            <label htmlFor="u-usuario">Usuario</label>
            <input
              id="u-usuario"
              name="usuario"
              value={form.usuario}
              onChange={handleChange}
              disabled={Boolean(editandoId)}
            />
          </div>
          <div className="campo">
            <label htmlFor="u-nombre">Nombre completo</label>
            <input id="u-nombre" name="nombre" value={form.nombre} onChange={handleChange} />
          </div>
          <div className="campo">
            <label htmlFor="u-password">Contraseña</label>
            <input
              id="u-password"
              name="password"
              type="password"
              placeholder={editandoId ? 'Dejar vacío para no cambiarla' : 'Mínimo 8 caracteres'}
              value={form.password}
              onChange={handleChange}
            />
          </div>
          <div className="campo">
            <label htmlFor="u-rol">Rol</label>
            <select id="u-rol" name="rol" value={form.rol} onChange={handleChange}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="formulario-botones">
            <button type="submit" className="btn btn-dorado">
              {editandoId ? 'Actualizar usuario' : 'Guardar usuario'}
            </button>
            {editandoId && (
              <button type="button" className="btn btn-borde" onClick={cancelarEdicion}>Cancelar</button>
            )}
          </div>

          {error && <p className="mensaje mensaje-error" style={{ marginTop: '1rem' }}>{error}</p>}
          {mensaje && <p className="mensaje mensaje-exito" style={{ marginTop: '1rem' }}>{mensaje}</p>}
        </form>

        <div className="bloque">
          <h2 className="panel-titulo">Usuarios registrados</h2>

          {cargando ? (
            <p className="mensaje">Cargando usuarios…</p>
          ) : usuarios.length === 0 ? (
            <p className="mensaje">No hay usuarios registrados.</p>
          ) : (
            <div className="tabla-contenedor">
              <table className="tabla">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th aria-label="Acciones" />
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => {
                    const esSesionActual = sesion && u.id === sesion.id;
                    return (
                      <tr key={u.id}>
                        <td>
                          <div className="celda-usuario">
                            <span className="avatar">{iniciales(u.nombre)}</span>
                            <span>
                              <span className="celda-producto">{u.nombre}</span>
                              <span className="celda-codigo" style={{ display: 'block' }}>{u.usuario}</span>
                            </span>
                          </div>
                        </td>
                        <td><span className="pastilla">{u.rol}</span></td>
                        <td>
                          <span className={u.activo ? 'estado estado-disponible' : 'estado estado-inactivo'}>
                            {u.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="celda-acciones">
                          {esSesionActual ? (
                            <span className="texto-suave" style={{ fontSize: '0.75rem' }}>Tu sesión</span>
                          ) : (
                            <>
                              <button type="button" className="btn-icono" onClick={() => handleEditar(u)} title="Editar" aria-label={`Editar ${u.nombre}`}>
                                <IconoEditar />
                              </button>
                              <button type="button" className="btn btn-borde btn-chico" onClick={() => handleCambiarEstado(u)}>
                                {u.activo ? 'Desactivar' : 'Activar'}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Usuarios;
