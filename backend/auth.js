require('dotenv').config();
const jwt = require('jsonwebtoken');
const pool = require('./db');

// Permisos de cada rol (HU-024). Es la única tabla que decide quién puede qué.
// Para dar o quitar un permiso a un rol solo se cambia esta lista.
const PERMISOS = {
  administrador: [
    'productos:ver',
    'productos:editar',
    'existencias:ver',
    'movimientos:ver',
    'movimientos:registrar',
    'alertas:ver',
    'reportes:ver',
    'usuarios:gestionar'
  ],
  empleado: [
    'productos:ver',
    'existencias:ver',
    'movimientos:ver',
    'movimientos:registrar',
    'alertas:ver'
  ]
};

function permisosDeRol(rol) {
  return PERMISOS[rol] || [];
}

async function verificarToken(req, res, next) {
  const encabezado = req.headers.authorization || '';
  const token = encabezado.startsWith('Bearer ') ? encabezado.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'No autorizado. Falta el token de sesión.' });
  }

  let datos;
  try {
    datos = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Sesión inválida o expirada. Inicie sesión de nuevo.' });
  }

  try {
    // El rol y el estado se leen de la base de datos en cada petición, no del token.
    // Así, si el administrador cambia un rol o desactiva a alguien, se aplica al instante.
    const resultado = await pool.query(
      'SELECT id, usuario, rol, activo FROM usuarios WHERE id = $1',
      [datos.id]
    );
    const actual = resultado.rows[0];

    if (!actual || !actual.activo) {
      return res.status(401).json({ error: 'Sesión inválida o expirada. Inicie sesión de nuevo.' });
    }

    req.usuario = { id: actual.id, usuario: actual.usuario, rol: actual.rol };
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// Deja pasar solo si el rol del usuario tiene el permiso indicado; si no, responde 403.
function requierePermiso(permiso) {
  return (req, res, next) => {
    if (!req.usuario || !permisosDeRol(req.usuario.rol).includes(permiso)) {
      return res.status(403).json({ error: 'No tiene permisos para realizar esta acción.' });
    }
    next();
  };
}

function soloAdmin(req, res, next) {
  return requierePermiso('usuarios:gestionar')(req, res, next);
}

module.exports = { verificarToken, soloAdmin, requierePermiso, permisosDeRol };
