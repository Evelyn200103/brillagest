// Pruebas automáticas de la HU-018 — Consultar información mediante el chatbot.
//
// Uso, desde la carpeta backend, en PowerShell:   node pruebas/hu018.js
//
// NO necesita el backend encendido ni iniciar sesión: el script levanta el chatbot en
// un servidor temporal y usa la base de datos de backend/.env. Como Dialogflow es un
// servicio externo, las pruebas usan un Dialogflow SIMULADO (que devuelve la intención
// y los parámetros como lo haría el agente real). Si en este PC están configuradas las
// credenciales de Dialogflow (GOOGLE_APPLICATION_CREDENTIALS o DIALOGFLOW_CREDENCIALES),
// además se ejecutan las pruebas R01–R05 contra el agente REAL.
// El script crea productos de prueba y al final los BORRA.
// Los resultados quedan en backend/pruebas/resultados-hu018.md
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const pool = require('../db');
const chatbot = require('../chatbot');
const rutas = require('../rutas/chatbot');

const resultados = [];
function registrar(id, criterio, descripcion, pasa, detalle = '', omitida = false) {
  resultados.push({ id, criterio, descripcion, pasa, detalle, omitida });
  console.log(`${omitida ? 'OMITE' : pasa ? 'PASA ' : 'FALLA'} ${id}  ${descripcion}${detalle ? `  (${detalle})` : ''}`);
}

// ---- Dialogflow simulado: imita lo que devuelve el agente real para cada frase ----
function dialogflowSimulado(texto) {
  const t = texto.toLowerCase();
  const base = { esFallback: false, parametros: {}, textoDialogflow: '', confianza: 0.9 };
  if (t === 'error-dialogflow') throw new Error('PERMISSION_DENIED: credencial secreta xyz');
  if (/^hola/.test(t)) return { ...base, intencion: 'Default Welcome Intent', textoDialogflow: '¡Hola! Soy el asistente de Joyería Sánchez.' };
  if (/qué categorías|que categorias|qué productos venden|catálogo/.test(t)) return { ...base, intencion: 'listar_categorias' };
  if (/^ayuda|qué puedes hacer/.test(t)) return { ...base, intencion: 'ayuda_chatbot' };
  if (/^qué (anillos|aretes largos|relojes) tienen/.test(t)) {
    const cat = t.match(/^qué (anillos|aretes largos|relojes)/)[1];
    return { ...base, intencion: 'productos_categoria', parametros: { categoria: cat === 'aretes largos' ? 'Aretes largos' : cat === 'relojes' ? 'Relojes' : 'Anillos' } };
  }
  if (/^(cuánto cuesta|precio de|tienen disponible) /.test(t)) {
    const producto = texto.replace(/^(cuánto cuesta|precio de|tienen disponible)( el| la| del| los| las)? /i, '');
    return { ...base, intencion: 'consultar_producto', parametros: { producto } };
  }
  if (t === 'precio') return { ...base, intencion: 'consultar_producto', parametros: {}, textoDialogflow: '¿De qué producto quieres saber el precio o la disponibilidad?' };
  if (t === 'quiero reservar una cita') return { ...base, intencion: 'reservar_cita' }; // intención no soportada
  return { ...base, intencion: 'Default Fallback Intent', esFallback: true };
}

async function enviar(base, cuerpo, crudo) {
  const res = await fetch(`${base}/api/chatbot/mensaje`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: crudo !== undefined ? crudo : JSON.stringify(cuerpo),
  });
  let datos = null;
  try { datos = await res.json(); } catch { /* sin cuerpo */ }
  return { status: res.status, datos };
}

async function main() {
  const sufijo = Date.now().toString().slice(-6);
  const SES = `sesion-prueba-${sufijo}`;
  const ids = [];

  async function crear(nombre, categoria, precio, stock, publicado) {
    const r = await pool.query(
      `INSERT INTO productos (sku, nombre, categoria, material, precio, stock, publicado)
       VALUES ($1,$2,$3,'Plata 925',$4,$5,$6) RETURNING id`,
      [`PRUEBA-018-${sufijo}-${ids.length + 1}`, nombre, categoria, precio, stock, publicado]
    );
    ids.push(r.rows[0].id);
    return r.rows[0].id;
  }

  // Servidor temporal solo con la ruta del chatbot y el Dialogflow simulado
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  rutas.dependencias.procesar = (texto, sesion) => chatbot.procesarMensaje(texto, sesion, async (t) => dialogflowSimulado(t));
  app.use(rutas);
  const servidor = http.createServer(app);
  await new Promise((ok) => servidor.listen(0, ok));
  const BASE = `http://localhost:${servidor.address().port}`;

  try {
    const nAnillo = `Anillo Zafiro P${sufijo}`;
    const nAgotado = `Anillo Agotado P${sufijo}`;
    const nOculto = `Anillo Oculto P${sufijo}`;
    const nReloj = `Reloj Clásico P${sufijo}`;
    await crear(nAnillo, 'Anillos', 250000, 5, true);
    await crear(nAgotado, 'Anillos', 180000, 0, true);
    await crear(nOculto, 'Anillos', 99000, 4, false);   // NO publicado
    await crear(nReloj, 'Relojes', 520000, 2, true);

    // ---------- C3, C4: intención reconocida ----------
    let r = await enviar(BASE, { mensaje: 'qué categorías tienen', sesion: SES });
    const cats = Array.isArray(r.datos && r.datos.datos) ? r.datos.datos : [];
    registrar('T01', 'C3, C4', 'Consulta reconocida ("qué categorías tienen"): intención listar_categorias y respuesta con las categorías', r.status === 200 && r.datos.intencion === 'listar_categorias' && r.datos.tipo === 'categorias' && cats.some((c) => c.nombre === 'Anillos') && r.datos.respuesta.includes('Anillos'), `HTTP ${r.status}, ${cats.length} categorías`);
    const bd = await pool.query("SELECT COUNT(*)::int AS n FROM productos WHERE categoria='Anillos' AND publicado=true");
    const cAnillos = cats.find((c) => c.nombre === 'Anillos');
    registrar('T02', 'C6', 'El total de la categoría Anillos del chatbot coincide con la base de datos', !!cAnillos && cAnillos.total === bd.rows[0].n, `chatbot ${cAnillos && cAnillos.total}, BD ${bd.rows[0].n}`);

    r = await enviar(BASE, { mensaje: 'qué anillos tienen', sesion: SES });
    const lista = (r.datos && r.datos.datos) || [];
    registrar('T03', 'C3, C4', 'Consulta por categoría ("qué anillos tienen"): intención productos_categoria y lista de anillos', r.status === 200 && r.datos.intencion === 'productos_categoria' && lista.length >= 2, `HTTP ${r.status}, ${lista.length} productos`);
    registrar('T04', 'C6', 'La lista incluye los anillos publicados y NO incluye el producto no publicado ni productos de otra categoría', lista.some((p) => p.nombre === nAnillo) && lista.some((p) => p.nombre === nAgotado) && !lista.some((p) => p.nombre === nOculto) && !lista.some((p) => p.nombre === nReloj) && lista.every((p) => p.categoria === 'Anillos'));
    registrar('T05', 'C6', 'La respuesta no muestra el stock exacto (solo disponible/agotado)', lista.every((p) => p.stock === undefined) && !/stock|unidades/i.test(r.datos.respuesta));

    r = await enviar(BASE, { mensaje: 'hola', sesion: SES });
    registrar('T06', 'C3, C4', 'Saludo ("hola"): responde con la bienvenida y sugerencias', r.status === 200 && r.datos.respuesta.includes('Joyería Sánchez') && Array.isArray(r.datos.sugerencias) && r.datos.sugerencias.length > 0, `intención ${r.datos && r.datos.intencion}`);
    r = await enviar(BASE, { mensaje: 'ayuda', sesion: SES });
    registrar('T07', 'C5', 'Ayuda: el chatbot explica qué consultas puede atender', r.status === 200 && r.datos.respuesta.includes('categorías') && r.datos.respuesta.includes('precio'));

    // ---------- Consulta sobre producto existente ----------
    r = await enviar(BASE, { mensaje: `cuánto cuesta el ${nAnillo}`, sesion: SES });
    const precioBd = (await pool.query('SELECT precio FROM productos WHERE nombre=$1', [nAnillo])).rows[0].precio;
    const esperadoPrecio = chatbot.formatoPrecio(precioBd);
    registrar('T08', 'C3, C4, C6', 'Producto existente y disponible: informa nombre, precio y que está disponible', r.status === 200 && r.datos.intencion === 'consultar_producto' && r.datos.tipo === 'producto' && r.datos.respuesta.includes(nAnillo) && r.datos.respuesta.includes('está disponible'), r.datos && r.datos.respuesta);
    registrar('T09', 'C6', 'El precio que dice el chatbot coincide con el de la base de datos', r.datos && r.datos.respuesta.replace(/\s/g, ' ').includes(esperadoPrecio.replace(/\s/g, ' ')), `BD ${esperadoPrecio}`);
    r = await enviar(BASE, { mensaje: `tienen disponible ${nAgotado}`, sesion: SES });
    registrar('T10', 'C6', 'Producto agotado: informa que está agotado', r.status === 200 && r.datos.tipo === 'producto' && r.datos.respuesta.includes('agotado'), r.datos && r.datos.respuesta);
    r = await enviar(BASE, { mensaje: `precio de ${nReloj.toUpperCase().replace('Á', 'A')}`, sesion: SES });
    registrar('T11', 'C4', 'El nombre del producto se reconoce sin importar mayúsculas ni tildes', r.status === 200 && r.datos.tipo === 'producto' && r.datos.respuesta.includes(nReloj), r.datos && r.datos.tipo);
    r = await enviar(BASE, { mensaje: 'precio de Anillo', sesion: SES });
    registrar('T12', 'C4', 'Nombre ambiguo ("Anillo"): lista los productos que coinciden y pide el nombre completo, sin inventar', r.status === 200 && r.datos.tipo === 'productos' && r.datos.respuesta.includes('nombre completo') && !r.datos.respuesta.includes(nOculto), r.datos && r.datos.tipo);

    // ---------- Consulta sobre producto inexistente ----------
    r = await enviar(BASE, { mensaje: 'cuánto cuesta el Anillo Fantasma Inexistente', sesion: SES });
    registrar('T13', 'Pruebas: producto inexistente', 'Producto inexistente: responde que no lo encontró y orienta al cliente (sin error)', r.status === 200 && r.datos.tipo === 'producto_no_encontrado' && /No encontré/.test(r.datos.respuesta) && /qué anillos tienen/.test(r.datos.respuesta), r.datos && r.datos.tipo);
    r = await enviar(BASE, { mensaje: `precio de ${nOculto}`, sesion: SES });
    registrar('T14', 'C6', 'Un producto NO publicado se trata como inexistente (no se filtra información)', r.status === 200 && r.datos.tipo === 'producto_no_encontrado' && !r.datos.respuesta.includes('99.000'), r.datos && r.datos.tipo);
    r = await enviar(BASE, { mensaje: "precio de x'; DROP TABLE productos;--", sesion: SES });
    const sigue = await pool.query('SELECT COUNT(*)::int AS n FROM productos');
    registrar('T15', 'Seguridad', 'Un nombre con comillas y código SQL no rompe nada: responde "no encontré" y la tabla productos sigue existiendo', r.status === 200 && r.datos.tipo === 'producto_no_encontrado' && sigue.rows[0].n >= 4, `HTTP ${r.status}`);
    r = await enviar(BASE, { mensaje: 'precio', sesion: SES });
    registrar('T16', 'C5', 'Consulta de precio sin decir el producto: el chatbot pide el nombre', r.status === 200 && r.datos.respuesta.includes('¿De qué producto'), r.datos && r.datos.respuesta);

    // ---------- C5: consulta no reconocida ----------
    r = await enviar(BASE, { mensaje: 'blablabla', sesion: SES });
    registrar('T17', 'C5', 'Consulta no reconocida: informa que no entendió y guía sobre qué puede preguntar', r.status === 200 && r.datos.tipo === 'no_entendido' && /No logré entender/.test(r.datos.respuesta) && /qué anillos tienen/.test(r.datos.respuesta) && r.datos.sugerencias.length > 0, `HTTP ${r.status}`);
    r = await enviar(BASE, { mensaje: 'quiero reservar una cita', sesion: SES });
    registrar('T18', 'C5', 'Intención que Dialogflow reconoce pero el sistema no soporta: también se orienta al cliente', r.status === 200 && r.datos.tipo === 'no_entendido' && /No logré entender/.test(r.datos.respuesta));

    // ---------- Validación de la entrada ----------
    r = await enviar(BASE, { mensaje: '   ', sesion: SES });
    registrar('T19', 'C2', 'Mensaje vacío: 400 con aviso, no se llama a Dialogflow', r.status === 400 && /Escribe tu consulta/.test(r.datos.error), `HTTP ${r.status}`);
    r = await enviar(BASE, { mensaje: 'a'.repeat(chatbot.MAX_LARGO_MENSAJE + 1), sesion: SES });
    registrar('T20', 'C2', 'Mensaje demasiado largo: 400', r.status === 400 && /demasiado largo/.test(r.datos.error), `HTTP ${r.status}`);
    r = await enviar(BASE, { mensaje: 'hola', sesion: 'x y/z' });
    registrar('T21', 'Seguridad', 'Identificador de sesión inválido: 400', r.status === 400, `HTTP ${r.status}`);
    r = await enviar(BASE, null, 'esto no es json');
    registrar('T22', 'Errores', 'Cuerpo que no es JSON válido: error controlado (no se cae el servidor)', r.status >= 400 && r.status < 500, `HTTP ${r.status}`);
    r = await enviar(BASE, { mensaje: 12345, sesion: SES });
    registrar('T23', 'C2', 'Mensaje que no es texto: 400', r.status === 400, `HTTP ${r.status}`);

    // ---------- Manejo de errores ----------
    r = await enviar(BASE, { mensaje: 'error-dialogflow', sesion: SES });
    registrar('T24', 'Pruebas: manejo de errores', 'Si Dialogflow falla: 503 con mensaje amable y SIN filtrar detalles internos', r.status === 503 && /no está disponible/.test(r.datos.error) && !/PERMISSION|secreta|xyz/.test(JSON.stringify(r.datos)), `HTTP ${r.status}`);

    // Dialogflow REAL sin credenciales configuradas (se prueba con el detector real)
    const guardadas = { a: process.env.DIALOGFLOW_CREDENCIALES, b: process.env.GOOGLE_APPLICATION_CREDENTIALS };
    delete process.env.DIALOGFLOW_CREDENCIALES; delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    rutas.dependencias.procesar = (texto, sesion) => chatbot.procesarMensaje(texto, sesion); // detector real
    r = await enviar(BASE, { mensaje: 'hola', sesion: SES });
    registrar('T25', 'Pruebas: manejo de errores', 'Sin credenciales de Dialogflow: 503 con mensaje amable (el chatbot no se cae)', r.status === 503 && /no está disponible/.test(r.datos.error), `HTTP ${r.status}`);
    if (guardadas.a) process.env.DIALOGFLOW_CREDENCIALES = guardadas.a;
    if (guardadas.b) process.env.GOOGLE_APPLICATION_CREDENTIALS = guardadas.b;
    rutas.dependencias.procesar = (texto, sesion) => chatbot.procesarMensaje(texto, sesion, async (t) => dialogflowSimulado(t));

    // ---------- Agente REAL de Dialogflow (solo si hay credenciales) ----------
    const hayCredenciales = Boolean(process.env.DIALOGFLOW_CREDENCIALES || process.env.GOOGLE_APPLICATION_CREDENTIALS);
    const reales = [
      ['R01', 'qué anillos tienen', 'productos_categoria', 'C3'],
      ['R02', 'qué categorías venden', 'listar_categorias', 'C3'],
      ['R03', 'cuánto cuesta el anillo solitario', 'consultar_producto', 'C3'],
      ['R04', 'ayuda', 'ayuda_chatbot', 'C3'],
      ['R05', 'blablabla', 'Default Fallback Intent', 'C5'],
    ];
    for (const [id, frase, esperada, criterio] of reales) {
      if (!hayCredenciales) {
        registrar(id, criterio, `Agente real de Dialogflow: "${frase}" → ${esperada}`, true, 'omitida: no hay credenciales en este PC', true);
        continue;
      }
      try {
        const d = await chatbot.detectarIntencionDialogflow(frase, `real-${sufijo}`);
        registrar(id, criterio, `Agente real de Dialogflow: "${frase}" → ${esperada}`, d.intencion === esperada, `devolvió "${d.intencion}"`);
      } catch (e) {
        registrar(id, criterio, `Agente real de Dialogflow: "${frase}" → ${esperada}`, false, `error: ${e.message.slice(0, 80)}`);
      }
    }

    // ---------- Límite de mensajes (al final, porque bloquea la IP de prueba) ----------
    let codigos = [];
    for (let i = 0; i < 32; i++) codigos.push((await enviar(BASE, { mensaje: 'hola', sesion: SES })).status);
    registrar('T26', 'Seguridad', 'Límite de 30 mensajes por minuto: los mensajes de más reciben 429', codigos.includes(429) && codigos[0] !== 429, `${codigos.filter((c) => c === 429).length} bloqueados de 32`);
  } finally {
    await new Promise((ok) => servidor.close(ok));
    if (ids.length) {
      await pool.query('DELETE FROM movimientos WHERE producto_id = ANY($1)', [ids]).catch(() => {});
      await pool.query('DELETE FROM productos WHERE id = ANY($1)', [ids]);
    }
  }

  const evaluadas = resultados.filter((r) => !r.omitida);
  const fallas = evaluadas.filter((r) => !r.pasa);
  const omitidas = resultados.length - evaluadas.length;
  console.log(`\n${evaluadas.length} pruebas: ${evaluadas.length - fallas.length} pasan, ${fallas.length} fallan${omitidas ? `, ${omitidas} omitidas` : ''}.`);

  const md = [
    '# Pruebas de la HU-018 — Consultar información mediante el chatbot',
    '',
    `- Fecha de ejecución: ${new Date().toLocaleString('es-CO')}`,
    `- Resumen: ${evaluadas.length} pruebas, ${evaluadas.length - fallas.length} pasan, ${fallas.length} fallan${omitidas ? `, ${omitidas} omitidas` : ''}.`,
    '',
    '| Prueba | Criterio | Descripción | Resultado | Detalle |',
    '| --- | --- | --- | --- | --- |',
    ...resultados.map((r) => `| ${r.id} | ${r.criterio} | ${r.descripcion} | ${r.omitida ? 'OMITIDA' : r.pasa ? 'PASA' : 'FALLA'} | ${String(r.detalle).replace(/\|/g, '/').replace(/\n/g, ' ')} |`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(__dirname, 'resultados-hu018.md'), md, 'utf8');
  console.log('Resultados guardados en backend/pruebas/resultados-hu018.md');

  await pool.end();
  process.exit(fallas.length ? 1 : 0);
}

main().catch((e) => { console.error('Error inesperado:', e.message); process.exit(1); });
