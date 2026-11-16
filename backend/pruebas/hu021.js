// Pruebas automáticas de la HU-021 — Integrar chatbot con la página web.
//
// Uso, desde la carpeta backend, en PowerShell:   node pruebas/hu021.js
//
// No necesita el backend encendido ni iniciar sesión: levanta el chatbot y el catálogo en un
// servidor temporal con la base de datos de backend/.env. Dialogflow se SIMULA (y el script
// anota qué mensajes le llegan). Si hay credenciales de Dialogflow en este PC
// (GOOGLE_APPLICATION_CREDENTIALS), además se ejecutan las pruebas R01–R03 de punta a punta
// con el agente REAL. El script crea un producto de prueba y al final lo BORRA.
// Resultados: backend/pruebas/resultados-hu021.md
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

// ---- Dialogflow simulado: anota cada llamada para comprobar qué le llega ----
const llamadasDialogflow = [];
let modoDialogflow = 'normal'; // normal | error | lento
function dialogflowSimulado(texto, sesion) {
  llamadasDialogflow.push({ texto, sesion });
  if (modoDialogflow === 'error') throw new Error('UNAVAILABLE: detalle interno secreto');
  if (modoDialogflow === 'lento') return new Promise(() => {}); // nunca responde
  const base = { esFallback: false, parametros: {}, textoDialogflow: '', confianza: 0.9 };
  if (/^hola/i.test(texto)) return { ...base, intencion: 'Default Welcome Intent', textoDialogflow: '¡Hola! Soy el asistente de Joyería Sánchez.' };
  if (/categor/i.test(texto)) return { ...base, intencion: 'listar_categorias' };
  if (/^ayuda/i.test(texto)) return { ...base, intencion: 'ayuda_chatbot' };
  if (/^qué anillos/i.test(texto)) return { ...base, intencion: 'productos_categoria', parametros: { categoria: 'Anillos' } };
  const m = texto.match(/^(cuánto cuesta|precio de) (.+)$/i);
  if (m) return { ...base, intencion: 'consultar_producto', parametros: { producto: m[2].replace(/^(el|la) /i, '') } };
  return { ...base, intencion: 'Default Fallback Intent', esFallback: true };
}

async function enviar(base, cuerpo, { ip = '10.0.0.1', crudo } = {}) {
  const res = await fetch(`${base}/api/chatbot/mensaje`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: crudo !== undefined ? crudo : JSON.stringify(cuerpo),
  });
  let datos = null;
  try { datos = await res.json(); } catch { /* sin cuerpo */ }
  return { status: res.status, datos };
}
async function obtener(base, ruta) {
  const res = await fetch(base + ruta);
  let datos = null;
  try { datos = await res.json(); } catch { /* sin cuerpo */ }
  return { status: res.status, datos };
}

async function main() {
  const suf = Date.now().toString().slice(-6);
  let idProducto = null;
  const nombreProducto = `Anillo Integracion I${suf}`;

  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  const conSimulado = (tiempoMs) => (t, s) => chatbot.procesarMensaje(t, s, async (x, y) => dialogflowSimulado(x, y), tiempoMs);
  rutasChatbot.dependencias.procesar = conSimulado();
  app.use(rutasCatalogo);
  app.use(rutasChatbot);
  const servidor = http.createServer(app);
  await new Promise((ok) => servidor.listen(0, ok));
  const BASE = `http://localhost:${servidor.address().port}`;

  try {
    idProducto = (await pool.query(
      `INSERT INTO productos (sku, nombre, categoria, material, precio, stock, publicado)
       VALUES ($1,$2,'Anillos','Plata 925',150000,3,true) RETURNING id`,
      [`PRUEBA-021-${suf}`, nombreProducto]
    )).rows[0].id;

    // ---------- C1, C2: iniciar una conversación ----------
    const SESION = `sesion-hu021-${suf}`;
    let r = await enviar(BASE, { mensaje: 'hola', sesion: SESION }, { ip: '10.0.1.1' });
    registrar('T01', 'C1, C2', 'El cliente inicia la conversación y recibe la bienvenida', r.status === 200 && /Joyería Sánchez/.test(r.datos.respuesta), `HTTP ${r.status}`);

    // ---------- C3: el mensaje llega correctamente al servicio conversacional ----------
    llamadasDialogflow.length = 0;
    r = await enviar(BASE, { mensaje: '   ¿Cuánto cuesta la cadena? Ñandú   ', sesion: SESION }, { ip: '10.0.1.2' });
    const llamada = llamadasDialogflow[0] || {};
    registrar('T02', 'C3', 'Dialogflow recibe el texto exacto del cliente (sin espacios sobrantes, con tildes y ñ) y el id de la sesión', llamadasDialogflow.length === 1 && llamada.texto === '¿Cuánto cuesta la cadena? Ñandú' && llamada.sesion === SESION, JSON.stringify(llamada.texto));

    // ---------- C4: las respuestas se muestran correctamente ----------
    r = await enviar(BASE, { mensaje: 'qué categorías tienen', sesion: SESION }, { ip: '10.0.1.3' });
    registrar('T03', 'C4', 'La respuesta tiene la forma que espera la página (texto, intención y tipo)', r.status === 200 && typeof r.datos.respuesta === 'string' && r.datos.respuesta.length > 0 && typeof r.datos.intencion === 'string' && typeof r.datos.tipo === 'string', Object.keys(r.datos || {}).join(','));
    r = await enviar(BASE, { mensaje: `precio de ${nombreProducto}`, sesion: SESION }, { ip: '10.0.1.4' });
    const p = (r.datos.datos || [])[0] || {};
    registrar('T04', 'C4', 'La respuesta de un producto trae lo que la página necesita para la tarjeta (id, nombre, precio y disponibilidad)', r.status === 200 && p.id === idProducto && p.nombre === nombreProducto && Number(p.precio) === 150000 && typeof p.disponible === 'boolean' && typeof p.estado === 'string');

    // ---------- Múltiples consultas ----------
    llamadasDialogflow.length = 0;
    const secuencia = [
      ['hola', 'Default Welcome Intent'],
      ['qué categorías tienen', 'listar_categorias'],
      ['qué anillos tienen', 'productos_categoria'],
      [`precio de ${nombreProducto}`, 'consultar_producto'],
      ['ayuda', 'ayuda_chatbot'],
      ['blablabla', 'Default Fallback Intent'],
    ];
    const SES2 = `sesion-seguida-${suf}`;
    const salidas = [];
    for (const [m] of secuencia) salidas.push(await enviar(BASE, { mensaje: m, sesion: SES2 }, { ip: '10.0.2.1' }));
    const todasBien = salidas.every((x, i) => x.status === 200 && (secuencia[i][1] === 'Default Fallback Intent' ? x.datos.tipo === 'no_entendido' : x.datos.intencion === secuencia[i][1]));
    registrar('T05', 'Pruebas: múltiples consultas', 'Seis consultas seguidas en la misma conversación: cada una recibe su respuesta correcta', todasBien, `${salidas.filter((x) => x.status === 200).length} de 6 con HTTP 200`);
    registrar('T06', 'C3', 'Todas las consultas de una conversación viajan con el mismo id de sesión', llamadasDialogflow.length === 6 && llamadasDialogflow.every((c) => c.sesion === SES2));

    // ---------- Consultas al mismo tiempo (varios clientes) ----------
    llamadasDialogflow.length = 0;
    const simultaneas = await Promise.all(secuencia.slice(0, 5).map(([m], i) => enviar(BASE, { mensaje: m, sesion: `cliente-${i}-${suf}` }, { ip: `10.0.3.${i}` })));
    const sinMezclar = simultaneas.every((x, i) => x.status === 200 && x.datos.intencion === secuencia[i][1]);
    registrar('T07', 'Pruebas: múltiples consultas', 'Cinco clientes consultan al mismo tiempo: todos reciben su propia respuesta sin mezclarse', sinMezclar, `${simultaneas.filter((x) => x.status === 200).length} de 5 con HTTP 200`);
    const sesionesVistas = new Set(llamadasDialogflow.map((c) => c.sesion));
    registrar('T08', 'C3', 'Cada cliente usa su propia sesión en Dialogflow', sesionesVistas.size === 5, `${sesionesVistas.size} sesiones`);

    // ---------- C5: la integración no afecta al resto de la página ----------
    const rutasPagina = ['/api/catalogo', '/api/catalogo/categorias', '/api/catalogo/categorias/Anillos/productos', `/api/catalogo/productos/${idProducto}`, `/api/disponibilidad/${idProducto}`];
    let estados = [];
    for (const ruta of rutasPagina) estados.push((await obtener(BASE, ruta)).status);
    registrar('T09', 'C5, Pruebas: integración con el resto de la página', 'El catálogo, las categorías, el detalle y la disponibilidad siguen funcionando con el chatbot integrado', estados.every((s) => s === 200), estados.join(', '));
    const get = await obtener(BASE, '/api/chatbot/mensaje');
    registrar('T10', 'C5', 'Abrir la ruta del chatbot con GET no rompe el servidor (404/405) y el catálogo sigue respondiendo', [404, 405].includes(get.status) && (await obtener(BASE, '/api/catalogo')).status === 200, `HTTP ${get.status}`);

    // ---------- C6: errores de comunicación ----------
    modoDialogflow = 'error';
    r = await enviar(BASE, { mensaje: 'hola', sesion: SESION }, { ip: '10.0.4.1' });
    registrar('T11', 'C6, Pruebas: error de comunicación', 'Si Dialogflow falla: 503 con mensaje amable y sin detalles internos', r.status === 503 && /no está disponible/.test(r.datos.error) && !/secreto|UNAVAILABLE/.test(JSON.stringify(r.datos)), `HTTP ${r.status}`);
    const catalogoConFalla = await obtener(BASE, '/api/catalogo');
    registrar('T12', 'C5, C6', 'Mientras el chatbot falla, el catálogo de la página sigue funcionando', catalogoConFalla.status === 200, `HTTP ${catalogoConFalla.status}`);

    modoDialogflow = 'lento';
    rutasChatbot.dependencias.procesar = conSimulado(300);
    const inicio = Date.now();
    r = await enviar(BASE, { mensaje: 'hola', sesion: SESION }, { ip: '10.0.4.2' });
    const demora = Date.now() - inicio;
    registrar('T13', 'C6, Pruebas: error de comunicación', 'Si Dialogflow no responde, la API corta la espera y avisa (503) en vez de quedarse cargando', r.status === 503 && demora < 3000 && /no está disponible/.test(r.datos.error), `HTTP ${r.status} en ${demora} ms (límite de prueba 300 ms)`);

    modoDialogflow = 'normal';
    rutasChatbot.dependencias.procesar = conSimulado();
    r = await enviar(BASE, { mensaje: 'hola', sesion: SESION }, { ip: '10.0.4.3' });
    registrar('T14', 'C6', 'Después de un error, el siguiente mensaje funciona con normalidad', r.status === 200 && /Joyería Sánchez/.test(r.datos.respuesta), `HTTP ${r.status}`);

    // Sin credenciales (detector real, como en un servidor sin configurar)
    const guardadas = { a: process.env.DIALOGFLOW_CREDENCIALES, b: process.env.GOOGLE_APPLICATION_CREDENTIALS };
    delete process.env.DIALOGFLOW_CREDENCIALES; delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    rutasChatbot.dependencias.procesar = (t, s) => chatbot.procesarMensaje(t, s);
    r = await enviar(BASE, { mensaje: 'hola', sesion: SESION }, { ip: '10.0.4.4' });
    registrar('T15', 'C6', 'Sin credenciales de Dialogflow en el servidor: 503 con mensaje amable (el chatbot no tumba la página)', r.status === 503 && /no está disponible/.test(r.datos.error), `HTTP ${r.status}`);
    if (guardadas.a) process.env.DIALOGFLOW_CREDENCIALES = guardadas.a;
    if (guardadas.b) process.env.GOOGLE_APPLICATION_CREDENTIALS = guardadas.b;
    rutasChatbot.dependencias.procesar = conSimulado();

    // Datos de entrada inválidos
    const malos = [
      await enviar(BASE, { mensaje: '', sesion: SESION }, { ip: '10.0.5.1' }),
      await enviar(BASE, { mensaje: 'a'.repeat(chatbot.MAX_LARGO_MENSAJE + 1), sesion: SESION }, { ip: '10.0.5.1' }),
      await enviar(BASE, { mensaje: 'hola', sesion: 'x y' }, { ip: '10.0.5.1' }),
      await enviar(BASE, null, { ip: '10.0.5.1', crudo: '{esto no es json' }),
    ];
    registrar('T16', 'C6', 'Mensaje vacío, demasiado largo, sesión inválida o JSON dañado: error 4xx claro y el servidor sigue vivo', malos.every((x) => x.status >= 400 && x.status < 500), malos.map((x) => x.status).join(', '));
    r = await enviar(BASE, { mensaje: 'hola', sesion: SESION }, { ip: '10.0.5.2' });
    registrar('T17', 'C6', 'Después de los mensajes inválidos, un mensaje correcto se responde bien', r.status === 200);

    // ---------- Agente REAL de Dialogflow, de punta a punta ----------
    const hay = Boolean(process.env.DIALOGFLOW_CREDENCIALES || process.env.GOOGLE_APPLICATION_CREDENTIALS);
    rutasChatbot.dependencias.procesar = (t, s) => chatbot.procesarMensaje(t, s);
    const reales = [
      ['R01', 'hola', (x) => x.status === 200 && x.datos.tipo === 'texto', 'responde la bienvenida'],
      ['R02', 'qué categorías tienen', (x) => x.status === 200 && x.datos.tipo === 'categorias', 'lista las categorías'],
      ['R03', 'blablabla', (x) => x.status === 200 && x.datos.tipo === 'no_entendido', 'orienta al cliente'],
    ];
    for (const [id, frase, ok, queHace] of reales) {
      if (!hay) { registrar(id, 'C3, C4', `Agente real, punta a punta: "${frase}" ${queHace}`, true, 'omitida: no hay credenciales en este PC', true); continue; }
      const x = await enviar(BASE, { mensaje: frase, sesion: `real-${id}-${suf}` }, { ip: `10.0.6.${id.slice(1)}` });
      registrar(id, 'C3, C4', `Agente real, punta a punta: "${frase}" ${queHace}`, ok(x), `HTTP ${x.status}, tipo ${x.datos && x.datos.tipo}`);
    }

    // ---------- Límite de mensajes (al final) ----------
    rutasChatbot.dependencias.procesar = conSimulado();
    const codigos = [];
    for (let i = 0; i < 32; i++) codigos.push((await enviar(BASE, { mensaje: 'hola', sesion: SESION }, { ip: '10.0.9.9' })).status);
    registrar('T18', 'C6', 'Si alguien envía demasiados mensajes (más de 30 por minuto), recibe 429 con un aviso', codigos.includes(429) && codigos[0] === 200, `${codigos.filter((c) => c === 429).length} bloqueados de 32`);
    registrar('T19', 'C5', 'Aunque el chatbot bloquee a una IP, el catálogo sigue respondiendo a esa misma IP', (await fetch(`${BASE}/api/catalogo`, { headers: { 'X-Forwarded-For': '10.0.9.9' } })).status === 200);
  } finally {
    await new Promise((ok) => servidor.close(ok));
    if (idProducto) {
      await pool.query('DELETE FROM movimientos WHERE producto_id = $1', [idProducto]).catch(() => {});
      await pool.query('DELETE FROM productos WHERE id = $1', [idProducto]);
    }
  }

  const evaluadas = resultados.filter((x) => !x.omitida);
  const fallas = evaluadas.filter((x) => !x.pasa);
  const omitidas = resultados.length - evaluadas.length;
  console.log(`\n${evaluadas.length} pruebas: ${evaluadas.length - fallas.length} pasan, ${fallas.length} fallan${omitidas ? `, ${omitidas} omitidas` : ''}.`);

  const md = [
    '# Pruebas de la HU-021 — Integrar chatbot con la página web',
    '',
    `- Fecha de ejecución: ${new Date().toLocaleString('es-CO')}`,
    `- Resumen: ${evaluadas.length} pruebas, ${evaluadas.length - fallas.length} pasan, ${fallas.length} fallan${omitidas ? `, ${omitidas} omitidas` : ''}.`,
    '',
    '| Prueba | Criterio | Descripción | Resultado | Detalle |',
    '| --- | --- | --- | --- | --- |',
    ...resultados.map((x) => `| ${x.id} | ${x.criterio} | ${x.descripcion} | ${x.omitida ? 'OMITIDA' : x.pasa ? 'PASA' : 'FALLA'} | ${String(x.detalle).replace(/\|/g, '/').replace(/\n/g, ' ')} |`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(__dirname, 'resultados-hu021.md'), md, 'utf8');
  console.log('Resultados guardados en backend/pruebas/resultados-hu021.md');
  await pool.end();
  process.exit(fallas.length ? 1 : 0);
}

main().catch((e) => { console.error('Error inesperado:', e.message); process.exit(1); });
