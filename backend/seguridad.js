// Seguridad de la comunicación (HU-025): HTTPS, cabeceras seguras y CORS.

// En producción (Render) el servidor recibe las peticiones a través de un proxy que
// termina el HTTPS. El proxy avisa con la cabecera X-Forwarded-Proto si el cliente
// usó "https" o "http". Con eso decidimos si dejamos pasar la petición.
function estaEnProduccion() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.RENDER === 'true' ||
    process.env.FORZAR_HTTPS === 'true'
  );
}

// Si alguien entra por http:// lo mandamos a https:// (GET) o lo rechazamos (el resto),
// para que la contraseña nunca viaje sin cifrar. /api/health se deja pasar para que
// el chequeo de salud de Render no falle.
function exigirHttps(req, res, next) {
  if (!estaEnProduccion() || req.path === '/api/health') return next();

  if (req.secure) return next(); // req.secure usa X-Forwarded-Proto porque activamos "trust proxy"

  if (req.method === 'GET' || req.method === 'HEAD') {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  return res.status(403).json({ error: 'Se requiere una conexión segura (HTTPS).' });
}

// Cabeceras que piden al navegador comportarse de forma segura.
function cabecerasSeguras(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');

  // HSTS: el navegador recordará usar siempre https con este servidor (1 año).
  if (estaEnProduccion()) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Las respuestas con sesiones o usuarios no deben guardarse en cachés.
  if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/usuarios')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
}

// CORS: si ORIGENES_PERMITIDOS está definido (lista separada por comas, por ejemplo
// "https://brillagest.vercel.app,https://inventario.vercel.app") solo esas páginas
// pueden llamar a la API desde un navegador. Si no está definido, se permite todo
// (comportamiento anterior) para no romper el despliegue.
function opcionesCors() {
  const lista = (process.env.ORIGENES_PERMITIDOS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (lista.length === 0) return {};

  return {
    origin(origen, callback) {
      // Sin "origin" son llamadas que no vienen de un navegador (curl, pruebas): se permiten.
      if (!origen || lista.includes(origen)) return callback(null, true);
      return callback(null, false);
    }
  };
}

module.exports = { estaEnProduccion, exigirHttps, cabecerasSeguras, opcionesCors };
