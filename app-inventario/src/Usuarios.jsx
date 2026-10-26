import { apiFetch, obtenerUsuario } from './api';
import { useEffect, useState } from 'react';

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
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
      <h1>BrillaGest — Usuarios</h1>

      <h2>{editandoId ? 'Editar usuario' : 'Registrar usuario'}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.6rem', marginBottom: '1.5rem' }}>
        <input
          name="usuario"
          placeholder="Usuario"
          value={form.usuario}
          onChange={handleChange}
          disabled={Boolean(editandoId)}
        />
        <input
          name="nombre"
          placeholder="Nombre completo"
          value={form.nombre}
          onChange={handleChange}
        />
        <input
          name="password"
          type="password"
          placeholder={editandoId ? 'Dejar vacío para no cambiarla' : 'Contraseña (mínimo 8 caracteres)'}
          value={form.password}
          onChange={handleChange}
        />
        <select name="rol" value={form.rol} onChange={handleChange}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button type="submit">{editandoId ? 'Actualizar usuario' : 'Guardar usuario'}</button>
          {editandoId && (
            <button type="button" onClick={cancelarEdicion}>Cancelar edición</button>
          )}
        </div>
      </form>

      {error && <p style={{ color: '#b00020' }}>{error}</p>}
      {mensaje && <p>{mensaje}</p>}

      <h2>Usuarios registrados</h2>

      {cargando ? (
        <p>Cargando usuarios...</p>
      ) : usuarios.length === 0 ? (
        <p>No hay usuarios registrados.</p>
      ) : (
        <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Nombre</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const esSesionActual = sesion && u.id === sesion.id;
              return (
                <tr key={u.id}>
                  <td>{u.usuario}</td>
                  <td>{u.nombre}</td>
                  <td>{u.rol}</td>
                  <td>{u.activo ? 'Activo' : 'Inactivo'}</td>
                  <td>
                    {esSesionActual ? (
                      <span>—</span>
                    ) : (
                      <>
                        <button type="button" onClick={() => handleEditar(u)}>Editar</button>{' '}
                        <button type="button" onClick={() => handleCambiarEstado(u)}>
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
      )}
    </div>
  );
}

export default Usuarios;
