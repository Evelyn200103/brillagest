// Manejo de la sesión del usuario (HU-022 y HU-024).
// El token y los datos del usuario (incluidos sus permisos) se guardan en el navegador.

const API_URL = import.meta.env.VITE_API_URL;

export function guardarSesion(token, usuario) {
  localStorage.setItem('token', token);
  localStorage.setItem('usuario', JSON.stringify(usuario));
}

export function obtenerToken() {
  return localStorage.getItem('token');
}

export function obtenerUsuario() {
  try {
    return JSON.parse(localStorage.getItem('usuario'));
  } catch {
    return null;
  }
}

// ¿El usuario que inició sesión tiene este permiso? (ej. 'productos:editar')
export function tienePermiso(usuario, permiso) {
  return Boolean(usuario && Array.isArray(usuario.permisos) && usuario.permisos.includes(permiso));
}

export function cerrarSesion() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.reload();
}

// Igual que fetch, pero envía el token y maneja los errores de acceso:
//   401 -> la sesión no sirve: se cierra y se vuelve a pedir el inicio de sesión.
//   403 -> el rol no tiene permiso: se avisa a la pantalla con el evento "acceso-denegado".
export async function apiFetch(url, opciones = {}) {
  const token = obtenerToken();
  const headers = { ...opciones.headers };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const respuesta = await fetch(url, { ...opciones, headers });

  if (respuesta.status === 401) {
    cerrarSesion();
  }

  if (respuesta.status === 403) {
    let mensaje = 'No tiene permisos para realizar esta acción.';
    try {
      const datos = await respuesta.clone().json();
      if (datos.error) mensaje = datos.error;
    } catch {
      // se deja el mensaje por defecto
    }
    window.dispatchEvent(new CustomEvent('acceso-denegado', { detail: mensaje }));
  }

  return respuesta;
}

// Pide al servidor los datos actuales del usuario (rol y permisos) y actualiza lo guardado.
// Sirve por si el administrador cambió el rol mientras la sesión seguía abierta.
export async function refrescarPerfil() {
  if (!obtenerToken()) return null;
  const res = await apiFetch(`${API_URL}/api/auth/perfil`);
  if (!res.ok) return null;
  const datos = await res.json();
  const anterior = obtenerUsuario() || {};
  const usuario = { ...anterior, ...datos.usuario };
  localStorage.setItem('usuario', JSON.stringify(usuario));
  return usuario;
}