// HU-018 — Chatbot: comunicación con Dialogflow ES y respuestas con datos reales.
//
// Flujo: el cliente escribe → el backend envía el texto a Dialogflow (detectIntent)
// → Dialogflow devuelve la intención y los parámetros → el backend consulta la
// base de datos y arma la respuesta. Así la información siempre coincide con el sistema.
const pool = require('./db');
const { conDisponibilidad } = require('./disponibilidad');

const CATEGORIAS = [
  'Anillos', 'Pulseras', 'Cadenas', 'Topos', 'Dijes',
  'Aretes largos', 'Candongas', 'Candongas con piedrería',
  'Argollas', 'Tobilleras', 'Relojes',
];

const MAX_PRODUCTOS_LISTA = 8;
const MAX_LARGO_MENSAJE = 300;

const MENSAJE_AYUDA =
  'Puedo ayudarte con: ver las categorías de joyas, mostrarte los productos de una categoría, ' +
  'y consultar el precio y la disponibilidad de un producto. ' +
  'Por ejemplo: "qué anillos tienen" o "precio del dije corazón".';

const MENSAJE_NO_ENTENDIDO = `No logré entender tu consulta. ${MENSAJE_AYUDA}`;

const SUGERENCIAS = ['Ver categorías', 'Qué anillos tienen', 'Precio del dije corazón'];

// ---------- Cliente de Dialogflow ES ----------

let clienteReal = null;

// Las credenciales NUNCA van en el código: se leen de variables de entorno.
//  - DIALOGFLOW_CREDENCIALES: el contenido del archivo JSON de la cuenta de servicio (Render)
//  - o GOOGLE_APPLICATION_CREDENTIALS: la ruta al archivo JSON (en el PC local)
function obtenerClienteReal() {
  if (clienteReal) return clienteReal;

  const { SessionsClient } = require('@google-cloud/dialogflow');
  const crudo = process.env.DIALOGFLOW_CREDENCIALES;
  let opciones = {};
  let projectId = process.env.DIALOGFLOW_PROJECT_ID;

  if (crudo) {
    const credenciales = JSON.parse(crudo);
    opciones = {
      credentials: {
        client_email: credenciales.client_email,
        private_key: credenciales.private_key,
      },
      projectId: credenciales.project_id,
    };
    projectId = projectId || credenciales.project_id;
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    const ruta = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    projectId = projectId || require(require('path').resolve(ruta)).project_id;
  } else {
    const error = new Error('Dialogflow no está configurado');
    error.codigo = 'SIN_CONFIGURAR';
    throw error;
  }

  const sesiones = new SessionsClient(opciones);
  clienteReal = { sesiones, projectId };
  return clienteReal;
}

// Envía el texto a Dialogflow y devuelve solo lo que necesitamos.
async function detectarIntencionDialogflow(texto, sesionId) {
  const { sesiones, projectId } = obtenerClienteReal();
  const [respuesta] = await sesiones.detectIntent({
    session: sesiones.projectAgentSessionPath(projectId, sesionId),
    queryInput: { text: { text: texto, languageCode: 'es' } },
  });
  const r = respuesta.queryResult || {};
  const campos = (r.parameters && r.parameters.fields) || {};
  const parametros = {};
  for (const [nombre, valor] of Object.entries(campos)) {
    parametros[nombre] = valor.stringValue || '';
  }
  return {
    intencion: (r.intent && r.intent.displayName) || '',
    esFallback: Boolean(r.intent && r.intent.isFallback),
    parametros,
    textoDialogflow: r.fulfillmentText || '',
    confianza: r.intentDetectionConfidence ?? null,
    faltanParametros: r.allRequiredParamsPresent === false,
  };
}

// ---------- Utilidades ----------

function formatoPrecio(valor) {
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 'precio no disponible';
  return numero.toLocaleString('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  });
}

function sinTildes(texto) {
  return String(texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const PALABRAS_VACIAS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'con', 'para', 'por', 'que', 'en', 'al',
]);

function categoriaValida(texto) {
  const buscada = sinTildes(String(texto || '').trim());
  return CATEGORIAS.find((c) => sinTildes(c) === buscada) || null;
}

// ---------- Respuestas con datos de la base ----------

async function responderCategorias() {
  const r = await pool.query(
    'SELECT categoria, COUNT(*)::int AS total FROM productos WHERE publicado = true GROUP BY categoria'
  );
  const conteo = Object.fromEntries(r.rows.map((f) => [f.categoria, f.total]));
  const categorias = CATEGORIAS.map((nombre) => ({ nombre, total: conteo[nombre] || 0 }));
  const conProductos = categorias.filter((c) => c.total > 0);

  if (conProductos.length === 0) {
    return { tipo: 'categorias', respuesta: 'Por ahora no tenemos productos publicados en el catálogo.', datos: [] };
  }
  const lista = conProductos.map((c) => `${c.nombre} (${c.total})`).join(', ');
  return {
    tipo: 'categorias',
    respuesta: `Estas son nuestras categorías con productos disponibles para consulta: ${lista}. ¿De cuál quieres ver productos?`,
    datos: conProductos,
    sugerencias: conProductos.slice(0, 4).map((c) => `Qué ${c.nombre.toLowerCase()} tienen`),
  };
}

async function responderProductosDeCategoria(nombreCategoria) {
  const categoria = categoriaValida(nombreCategoria);
  if (!categoria) {
    return { tipo: 'no_entendido', respuesta: `No reconozco esa categoría. ${MENSAJE_AYUDA}`, datos: [] };
  }
  const r = await pool.query(
    `SELECT id, sku, nombre, categoria, precio, stock
       FROM productos WHERE categoria = $1 AND publicado = true
       ORDER BY (COALESCE(stock, 0) > 0) DESC, nombre ASC`,
    [categoria]
  );
  const productos = r.rows.map(conDisponibilidad);
  if (productos.length === 0) {
    return {
      tipo: 'productos',
      respuesta: `Por ahora no tenemos productos publicados en la categoría ${categoria}.`,
      datos: [],
    };
  }
  const mostrados = productos.slice(0, MAX_PRODUCTOS_LISTA);
  const lineas = mostrados.map((p) => `• ${p.nombre} — ${formatoPrecio(p.precio)} (${p.estado})`);
  const resto = productos.length - mostrados.length;
  return {
    tipo: 'productos',
    respuesta:
      `En ${categoria} tenemos ${productos.length} producto${productos.length === 1 ? '' : 's'}:\n` +
      lineas.join('\n') +
      (resto > 0 ? `\n…y ${resto} más en el catálogo.` : ''),
    datos: mostrados,
  };
}

async function responderProducto(textoProducto) {
  const palabras = sinTildes(textoProducto)
    .split(/[^a-z0-9ñ]+/)
    .filter((p) => p.length >= 2 && !PALABRAS_VACIAS.has(p));

  if (palabras.length === 0) {
    return {
      tipo: 'no_entendido',
      respuesta: '¿De qué producto quieres saber el precio o la disponibilidad? Escribe su nombre, por ejemplo: "precio del dije corazón".',
      datos: [],
    };
  }

  // Todas las palabras deben aparecer en el nombre, sin importar tildes ni mayúsculas.
  const condiciones = palabras.map((_, i) => `translate(lower(nombre), 'áéíóúü', 'aeiouu') LIKE $${i + 1}`);
  const r = await pool.query(
    `SELECT id, sku, nombre, categoria, precio, stock
       FROM productos
      WHERE publicado = true AND ${condiciones.join(' AND ')}
      ORDER BY (COALESCE(stock, 0) > 0) DESC, nombre ASC
      LIMIT 6`,
    palabras.map((p) => `%${p}%`)
  );
  const productos = r.rows.map(conDisponibilidad);

  if (productos.length === 0) {
    return {
      tipo: 'producto_no_encontrado',
      respuesta:
        `No encontré un producto llamado "${textoProducto.trim()}" en nuestro catálogo. ` +
        'Revisa el nombre o pregúntame por una categoría, por ejemplo: "qué anillos tienen".',
      datos: [],
    };
  }
  if (productos.length === 1) {
    const p = productos[0];
    const estado = p.disponible ? 'está disponible' : 'está agotado por ahora';
    return {
      tipo: 'producto',
      respuesta: `${p.nombre} (${p.categoria}): cuesta ${formatoPrecio(p.precio)} y ${estado}.`,
      datos: [p],
    };
  }
  const lineas = productos.map((p) => `• ${p.nombre} — ${formatoPrecio(p.precio)} (${p.estado})`);
  return {
    tipo: 'productos',
    respuesta: `Encontré varios productos que coinciden:\n${lineas.join('\n')}\nEscribe el nombre completo del que te interesa.`,
    datos: productos,
  };
}

// ---------- Punto de entrada ----------

// `detectar` se puede reemplazar en las pruebas por un Dialogflow simulado.
async function procesarMensaje(texto, sesionId, detectar = detectarIntencionDialogflow) {
  const d = await detectar(texto, sesionId);

  if (d.esFallback || !d.intencion) {
    return { tipo: 'no_entendido', intencion: d.intencion || 'fallback', respuesta: MENSAJE_NO_ENTENDIDO, sugerencias: SUGERENCIAS };
  }

  let salida;
  switch (d.intencion) {
    case 'listar_categorias':
      salida = await responderCategorias();
      break;
    case 'productos_categoria':
      salida = d.parametros.categoria
        ? await responderProductosDeCategoria(d.parametros.categoria)
        : { tipo: 'texto', respuesta: d.textoDialogflow || MENSAJE_AYUDA };
      break;
    case 'consultar_producto':
      salida = d.parametros.producto
        ? await responderProducto(d.parametros.producto)
        : { tipo: 'texto', respuesta: d.textoDialogflow || MENSAJE_AYUDA };
      break;
    case 'ayuda_chatbot':
      salida = { tipo: 'texto', respuesta: MENSAJE_AYUDA, sugerencias: SUGERENCIAS };
      break;
    case 'Default Welcome Intent':
      salida = { tipo: 'texto', respuesta: d.textoDialogflow || '¡Hola! Soy el asistente de Joyería Sánchez. ¿Qué te gustaría ver?', sugerencias: SUGERENCIAS };
      break;
    default:
      // Intención que Dialogflow reconoce pero el sistema aún no soporta
      salida = { tipo: 'no_entendido', respuesta: MENSAJE_NO_ENTENDIDO, sugerencias: SUGERENCIAS };
  }
  return { intencion: d.intencion, ...salida };
}

module.exports = {
  procesarMensaje,
  detectarIntencionDialogflow,
  categoriaValida,
  formatoPrecio,
  MAX_LARGO_MENSAJE,
  MENSAJE_AYUDA,
  MENSAJE_NO_ENTENDIDO,
};
