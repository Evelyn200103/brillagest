// Pruebas automáticas de la HU-019 — Consultar productos mediante el chatbot.
//
// Uso, desde la carpeta backend, en PowerShell:   node pruebas/hu019.js
//
// No necesita el backend encendido ni iniciar sesión: levanta el chatbot y el catálogo en un
// servidor temporal con la base de datos de backend/.env. Dialogflow se SIMULA (devuelve la
// intención y el parámetro como el agente real). Si hay credenciales de Dialogflow en este PC
// (GOOGLE_APPLICATION_CREDENTIALS), además se ejecutan las pruebas R01–R03 con el agente REAL.
// El script crea productos de prueba y al final los BORRA.
// Resultados: backend/pruebas/resultados-hu019.md
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const pool = require('../db');
const chatbot = require('../chatbot');
const rutasChatbot = require('../rutas/chatbot');
const rutasCatalogo = require('../rutas/catalogo');

const resultados = [];
function registrar(id, criterio, descripcion, pasa, detalle = '', omitida = false) {
  resultados.push({ id, criterio, descripcion, pasa, detalle, omitida });
  console.log(`${omitida ? 'OMITE' : pasa ? 'PASA ' : 'FALLA'} ${id}  ${descripcion}${detalle ? `  (${detalle})` : ''}`);
}

// Dialogflow simulado: toda frase "precio/cuánto cuesta/tienen/busco ..." es consultar_producto
function dialogflowSimulado(texto) {
  const base = { esFallback: false, parametros: {}, textoDialogflow: '', confianza: 0.9 };
  const m = texto.match(/^(cuánto cuesta|cuanto cuesta|precio de|tienen disponible|busco|información de|informacion de)( el| la| del| los| las)? (.+)$/i);
  if (m) return { ...base, intencion: 'consultar_producto', parametros: { producto: m[3] } };
  if (/^qué anillos tienen/i.test(texto)) return { ...base, intencion: 'productos_categoria', parametros: { categoria: 'Anillos' } };
  return { ...base, intencion: 'Default Fallback Intent', esFallback: true };
}

async function llamar(base, ruta, cuerpo) {
  const res = await fetch(base + ruta, cuerpo
    ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }
    : undefined);
  let datos = null;
  try { datos = await res.json(); } catch { /* sin cuerpo */ }
  return { status: res.status, datos };
}

async function main() {
  const suf = Date.now().toString().slice(-6);
  const SES = `sesion-hu019-${suf}`;
  const ids = [];
  let n = 0;
  async function crear(nombre, categoria, precio, stock, publicado, material = 'Plata 925') {
    n += 1;
    const r = await pool.query(
      `INSERT INTO productos (sku, nombre, categoria, material, precio, stock, publicado)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [`PRUEBA-019-${suf}-${n}`, nombre, categoria, material, precio, stock, publicado]
    );
    ids.push(r.rows[0].id);
    return r.rows[0].id;
  }

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  rutasChatbot.dependencias.procesar = (t, s) => chatbot.procesarMensaje(t, s, async (x) => dialogflowSimulado(x));
  app.use(rutasCatalogo);
  app.use(rutasChatbot);
  const servidor = http.createServer(app);
  await new Promise((ok) => servidor.listen(0, ok));
  const BASE = `http://localhost:${servidor.address().port}`;
  const preguntar = (m) => llamar(BASE, '/api/chatbot/mensaje', { mensaje: m, sesion: SES });

  try {
    const nZafiro = `Anillo Zafiro H${suf}`;
    const nGrande = `Anillo Zafiro H${suf} Grande`;
    const nAgotado = `Dije Estrella H${suf}`;
    const nOculto = `Dije Oculto H${suf}`;
    const idZafiro = await crear(nZafiro, 'Anillos', 250000, 5, true);
    await crear(nGrande, 'Anillos', 310000, 2, true);
    const idAgotado = await crear(nAgotado, 'Dijes', 90000, 0, true);
    await crear(nOculto, 'Dijes', 77000, 3, false);
    const idTitanio = await crear(`Anillo Moderno H${suf}`, 'Anillos', 120000, 4, true, `Titanio${suf}`);
    for (let i = 1; i <= 10; i++) await crear(`Pulsera Lote${suf} ${i}`, 'Pulseras', 50000 + i, 1, true);

    // ---------- C1, C2, C3: consulta en lenguaje natural sobre un producto ----------
    let r = await preguntar(`cuánto cuesta el ${nAgotado}`);
    registrar('T01', 'C1, C2', 'El cliente consulta un producto en lenguaje natural y recibe respuesta', r.status === 200 && r.datos.tipo === 'producto', `HTTP ${r.status}, tipo ${r.datos && r.datos.tipo}`);
    registrar('T02', 'C2', 'El chatbot identifica la consulta como relacionada con productos (intención consultar_producto)', r.datos.intencion === 'consultar_producto', r.datos.intencion);
    const dato = (r.datos.datos || [])[0] || {};

    // ---------- C3, C4: la respuesta sale del sistema ----------
    const bd = (await pool.query('SELECT precio, stock FROM productos WHERE id=$1', [idAgotado])).rows[0];
    registrar('T03', 'C3, C4', 'El precio de la respuesta es el de la base de datos', r.datos.respuesta.replace(/\s/g, ' ').includes(chatbot.formatoPrecio(bd.precio).replace(/\s/g, ' ')), chatbot.formatoPrecio(bd.precio));
    const cat = await llamar(BASE, `/api/catalogo/productos/${dato.id}`);
    registrar('T04', 'Pruebas: consistencia entre chatbot y catálogo', 'El producto del chatbot coincide con el del catálogo (nombre, precio y disponibilidad)', cat.status === 200 && cat.datos.nombre === dato.nombre && Number(cat.datos.precio) === Number(dato.precio) && cat.datos.disponibilidad === (dato.disponible ? 'DISPONIBLE' : 'AGOTADO'), `catálogo: ${cat.datos && cat.datos.disponibilidad}, chatbot: ${dato.estado}`);
    registrar('T05', 'Frontend: navegación al producto', 'La respuesta trae el id del producto y con ese id el detalle del catálogo abre (200)', dato.id === idAgotado && cat.status === 200, `id ${dato.id}`);
    registrar('T06', 'C4', 'Producto agotado: informa que está agotado', /agotado/.test(r.datos.respuesta) && dato.disponible === false, r.datos.respuesta);
    registrar('T07', 'C6', 'La respuesta no incluye stock ni SKU', !('stock' in dato) && !('sku' in dato) && !/stock|unidades/i.test(r.datos.respuesta));

    // ---------- Consulta de producto existente con varias variantes de escritura ----------
    r = await preguntar(`precio de ${nZafiro.toUpperCase()}`);
    registrar('T08', 'C2, C3', 'El nombre se reconoce sin importar mayúsculas', r.datos.tipo === 'producto' && r.datos.datos[0].id === idZafiro, r.datos.tipo);
    r = await preguntar(`busco el anillo titanio${suf}`);
    registrar('T09', 'C3', 'Se puede buscar por el material del producto (no solo por el nombre)', r.datos.tipo === 'producto' && r.datos.datos[0].id === idTitanio, r.datos.tipo);

    // ---------- Consulta ambigua ----------
    r = await preguntar(`precio de Anillo`);
    const lista = r.datos.datos || [];
    const todosValidos = (await Promise.all(lista.map((p) => llamar(BASE, `/api/catalogo/productos/${p.id}`)))).every((x) => x.status === 200);
    registrar('T10', 'Pruebas: consulta ambigua', 'Consulta ambigua ("Anillo"): lista varios productos para elegir, con su id', r.datos.tipo === 'productos' && lista.length >= 3 && lista.every((p) => p.id && p.nombre), `${lista.length} productos`);
    registrar('T11', 'Frontend: navegación al producto', 'Cada producto de la lista ambigua abre su detalle en el catálogo', lista.length > 0 && todosValidos);
    registrar('T12', 'C6', 'La lista ambigua no incluye productos no publicados', !lista.some((p) => p.nombre === nOculto));
    r = await preguntar(`precio de ${nZafiro}`);
    registrar('T13', 'Pruebas: consulta ambigua', 'Si el cliente escribe el nombre exacto, responde ese producto aunque otro se parezca ("… Grande")', r.datos.tipo === 'producto' && r.datos.datos.length === 1 && r.datos.datos[0].id === idZafiro, r.datos.tipo);
    r = await preguntar(`precio de Lote${suf}`);
    registrar('T14', 'Frontend: presentación de resultados', 'Con más de 8 coincidencias muestra solo 8 y avisa que hay varios', r.datos.tipo === 'productos' && r.datos.datos.length === 8 && /varios/.test(r.datos.respuesta), `${r.datos.datos.length} mostrados`);

    // ---------- C5, C6: producto inexistente / no publicado ----------
    r = await preguntar('cuánto cuesta el Anillo Fantasma Inexistente');
    registrar('T15', 'C5, Pruebas: producto inexistente', 'Producto inexistente: indica que no encontró información y orienta al cliente', r.datos.tipo === 'producto_no_encontrado' && /No encontré/.test(r.datos.respuesta) && r.datos.datos.length === 0, r.datos.tipo);
    r = await preguntar(`precio de ${nOculto}`);
    registrar('T16', 'C6', 'Un producto no publicado se trata como inexistente (no se muestra información que no está disponible)', r.datos.tipo === 'producto_no_encontrado' && !JSON.stringify(r.datos).includes('77.000') && !JSON.stringify(r.datos).includes('77000'), r.datos.tipo);
    r = await preguntar("precio de x'; DROP TABLE productos;--");
    const existe = await pool.query('SELECT COUNT(*)::int AS n FROM productos');
    registrar('T17', 'Seguridad', 'Texto con comillas y código SQL: responde "no encontré" y la tabla sigue existiendo', r.status === 200 && r.datos.tipo === 'producto_no_encontrado' && existe.rows[0].n > 0, `HTTP ${r.status}`);
    r = await preguntar('precio de %');
    registrar('T18', 'Seguridad', 'El comodín "%" no devuelve todo el catálogo', r.status === 200 && (r.datos.datos || []).length === 0, `${(r.datos.datos || []).length} productos`);

    // ---------- Consistencia chatbot-catálogo por categoría ----------
    r = await preguntar('qué anillos tienen');
    const delChat = new Set((r.datos.datos || []).map((p) => p.id));
    const delCatalogo = await llamar(BASE, '/api/catalogo/categorias/Anillos/productos');
    const idsCat = new Set(delCatalogo.datos.productos.slice(0, 8).map((p) => p.id));
    registrar('T19', 'Pruebas: consistencia entre chatbot y catálogo', 'Los anillos que muestra el chatbot son los mismos que muestra el catálogo', delChat.size > 0 && [...delChat].every((id) => idsCat.has(id) || delCatalogo.datos.productos.some((p) => p.id === id)), `${delChat.size} en el chat, ${delCatalogo.datos.total} en el catálogo`);

    // ---------- Manejo de errores ----------
    const original = pool.query.bind(pool);
    pool.query = async () => { throw new Error('conexión caída: secreto interno'); };
    r = await preguntar(`precio de ${nZafiro}`);
    pool.query = original;
    registrar('T20', 'Pruebas: manejo de errores', 'Si la base de datos falla: 503 con mensaje amable y sin detalles internos', r.status === 503 && !/secreto|conexión/.test(JSON.stringify(r.datos)), `HTTP ${r.status}`);

    // ---------- Agente REAL de Dialogflow (solo si hay credenciales) ----------
    const hay = Boolean(process.env.DIALOGFLOW_CREDENCIALES || process.env.GOOGLE_APPLICATION_CREDENTIALS);
    const reales = [
      ['R01', 'precio del dije corazón', 'consultar_producto'],
      ['R02', 'tienen disponible el reloj clásico', 'consultar_producto'],
      ['R03', 'busco el anillo solitario', 'consultar_producto'],
    ];
    for (const [id, frase, esperada] of reales) {
      if (!hay) { registrar(id, 'C2', `Agente real: "${frase}" → ${esperada}`, true, 'omitida: no hay credenciales en este PC', true); continue; }
      try {
        const d = await chatbot.detectarIntencionDialogflow(frase, `real-${suf}`);
        registrar(id, 'C2', `Agente real: "${frase}" → ${esperada} con el nombre del producto`, d.intencion === esperada && Boolean(d.parametros.producto), `devolvió "${d.intencion}", producto "${d.parametros.producto || ''}"`);
      } catch (e) {
        registrar(id, 'C2', `Agente real: "${frase}" → ${esperada}`, false, `error: ${e.message.slice(0, 80)}`);
      }
    }
  } finally {
    await new Promise((ok) => servidor.close(ok));
    if (ids.length) {
      await pool.query('DELETE FROM movimientos WHERE producto_id = ANY($1)', [ids]).catch(() => {});
      await pool.query('DELETE FROM productos WHERE id = ANY($1)', [ids]);
    }
  }

  const evaluadas = resultados.filter((x) => !x.omitida);
  const fallas = evaluadas.filter((x) => !x.pasa);
  const omitidas = resultados.length - evaluadas.length;
  console.log(`\n${evaluadas.length} pruebas: ${evaluadas.length - fallas.length} pasan, ${fallas.length} fallan${omitidas ? `, ${omitidas} omitidas` : ''}.`);

  const md = [
    '# Pruebas de la HU-019 — Consultar productos mediante el chatbot',
    '',
    `- Fecha de ejecución: ${new Date().toLocaleString('es-CO')}`,
    `- Resumen: ${evaluadas.length} pruebas, ${evaluadas.length - fallas.length} pasan, ${fallas.length} fallan${omitidas ? `, ${omitidas} omitidas` : ''}.`,
    '',
    '| Prueba | Criterio | Descripción | Resultado | Detalle |',
    '| --- | --- | --- | --- | --- |',
    ...resultados.map((x) => `| ${x.id} | ${x.criterio} | ${x.descripcion} | ${x.omitida ? 'OMITIDA' : x.pasa ? 'PASA' : 'FALLA'} | ${String(x.detalle).replace(/\|/g, '/').replace(/\n/g, ' ')} |`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(__dirname, 'resultados-hu019.md'), md, 'utf8');
  console.log('Resultados guardados en backend/pruebas/resultados-hu019.md');
  await pool.end();
  process.exit(fallas.length ? 1 : 0);
}

main().catch((e) => { console.error('Error inesperado:', e.message); process.exit(1); });
