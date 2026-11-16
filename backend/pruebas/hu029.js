// Pruebas de la HU-029 — Validar el funcionamiento del chatbot (de punta a punta).
//
// A diferencia de las pruebas de las HU-018 a HU-021, aquí NADA se simula: cada consulta pasa por
// la ruta real del chatbot, el agente REAL de Dialogflow y la base de datos REAL (Neon), y las
// respuestas se comparan con lo que hay guardado en el sistema.
//
// Requisitos (en backend/.env): DATABASE_URL y GOOGLE_APPLICATION_CREDENTIALS (llave del chatbot).
// Antes, ejecutar una vez:  node scripts/exportarIntenciones.js   (crea pruebas/intenciones-agente.json)
//
// Uso, desde la carpeta backend:   node pruebas/hu029.js
// Resultados: backend/pruebas/resultados-hu029.md
// La prueba solo CONSULTA: no crea, cambia ni borra datos.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const pool = require('../db');
const rutasChatbot = require('../rutas/chatbot');
const rutasCatalogo = require('../rutas/catalogo');
const { PREGUNTAS_FRECUENTES } = require('../faq');

const ARCHIVO_AGENTE = path.join(__dirname, 'intenciones-agente.json');
const resultados = [];
const intencionesProbadas = new Set();

function registrar(id, grupo, criterio, descripcion, pasa, detalle = '') {
  resultados.push({ id, grupo, criterio, descripcion, pasa, detalle });
  console.log(`${pasa ? 'PASA ' : 'FALLA'} ${id}  ${descripcion}${detalle ? `  (${detalle})` : ''}`);
}

const normal = (t) => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[¿?¡!.,]/g, '').replace(/\s+/g, ' ').trim();

let n = 0;
async function preguntar(base, mensaje, sesion) {
  n += 1;
  const res = await fetch(`${base}/api/chatbot/mensaje`, {
    method: 'POST',
    // Cada consulta usa su propia sesión y una IP de prueba distinta, para no chocar con el
    // límite de 30 mensajes por minuto (HU-018) ni mezclar contextos de conversación.
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': `10.29.${Math.floor(n / 200)}.${n % 200}` },
    body: JSON.stringify({ mensaje, sesion: sesion || `hu029-${Date.now().toString(36)}-${n}` }),
  });
  let datos = null;
  try { datos = await res.json(); } catch { /* sin cuerpo */ }
  if (datos && datos.intencion) intencionesProbadas.add(datos.intencion);
  return { status: res.status, d: datos || {} };
}

async function obtener(base, ruta) {
  const res = await fetch(base + ruta);
  let datos = null;
  try { datos = await res.json(); } catch { /* sin cuerpo */ }
  return { status: res.status, d: datos };
}

const resumen = (r) => `HTTP ${r.status}, intención ${r.d.intencion || '-'}, tipo ${r.d.tipo || '-'}`;
// Pedir aclaración puede ser: preguntar de qué producto, orientar con "No logré entender", o listar
// las categorías preguntando "¿De cuál quieres ver productos?" (ajuste documentado tras la 1.ª ejecución,
// prueba A03: esa respuesta también devuelve la pregunta al cliente y no inventa ningún producto).
const pideAclaracion = (r) =>
  (r.d.tipo === 'no_entendido' && /De qué producto|No logré entender/.test(r.d.respuesta || '')) ||
  (r.d.tipo === 'categorias' && /De cuál quieres ver productos/.test(r.d.respuesta || ''));
const orienta = (r) => /qué anillos tienen/.test(r.d.respuesta || '') || /Revisa el nombre o pregúntame/.test(r.d.respuesta || '');

async function main() {
  if (!process.env.DATABASE_URL || !(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.DIALOGFLOW_CREDENCIALES)) {
    console.error('Faltan DATABASE_URL o GOOGLE_APPLICATION_CREDENTIALS en backend/.env: esta prueba usa el agente y la base de datos reales.');
    process.exit(1);
  }
  if (!fs.existsSync(ARCHIVO_AGENTE)) {
    console.error('Falta pruebas/intenciones-agente.json. Ejecuta primero: node scripts/exportarIntenciones.js');
    process.exit(1);
  }
  const agente = JSON.parse(fs.readFileSync(ARCHIVO_AGENTE, 'utf8'));
  const entrenamiento = new Map();
  for (const i of agente.intenciones) for (const f of i.frases) entrenamiento.set(normal(f), i.intencion);

  const app = express();
  app.set('trust proxy', true);
  app.use(express.json());
  app.use(rutasCatalogo);
  app.use(rutasChatbot);
  const servidor = http.createServer(app);
  await new Promise((ok) => servidor.listen(0, ok));
  const BASE = `http://localhost:${servidor.address().port}`;
  const q = (m, sesion) => preguntar(BASE, m, sesion);

  try {
    const { rows: productos } = await pool.query(
      `SELECT id, nombre, categoria, material, precio, stock FROM productos WHERE publicado = true ORDER BY id`);
    const { rows: conteo } = await pool.query(
      `SELECT categoria, COUNT(*)::int AS total FROM productos WHERE publicado = true GROUP BY categoria`);
    const totalPorCategoria = Object.fromEntries(conteo.map((c) => [c.categoria, c.total]));
    const conStock = productos.find((p) => Number(p.stock) > 0);
    const ejemplo = (conStock || productos[0] || {}).nombre || 'Anillo Clásico';

    // ================= 1. Intenciones válidas: una consulta típica por intención (C1, C2) =================
    let k = 1;
    const id1 = () => `V${String(k++).padStart(2, '0')}`;

    let r = await q('hola');
    registrar(id1(), 'Intenciones válidas', 'C1, C2', 'Saludo: "hola" recibe la bienvenida de la joyería',
      r.status === 200 && r.d.intencion === 'Default Welcome Intent' && /Joyería Sánchez/.test(r.d.respuesta), resumen(r));

    r = await q('qué categorías tienen');
    const categoriasOk = r.status === 200 && r.d.tipo === 'categorias' && Array.isArray(r.d.datos) && r.d.datos.length > 0 &&
      r.d.datos.every((c) => totalPorCategoria[c.nombre] === c.total);
    registrar(id1(), 'Intenciones válidas', 'C1, C2, C5', 'Categorías: la lista y el número de productos de cada una coinciden con la base de datos',
      r.d.intencion === 'listar_categorias' && categoriasOk,
      `${resumen(r)}; ${(r.d.datos || []).map((c) => `${c.nombre}=${c.total}`).join(', ')}`);

    r = await q('qué anillos tienen');
    const anillosOk = r.status === 200 && r.d.tipo === 'productos' && (r.d.datos || []).every((p) => p.categoria === 'Anillos') &&
      (r.d.datos || []).length === Math.min(totalPorCategoria.Anillos || 0, 8);
    registrar(id1(), 'Intenciones válidas', 'C1, C2, C5', 'Productos de una categoría: "qué anillos tienen" muestra solo anillos y la cantidad publicada',
      r.d.intencion === 'productos_categoria' && anillosOk, `${resumen(r)}; ${(r.d.datos || []).length} productos, base de datos: ${totalPorCategoria.Anillos || 0}`);

    r = await q(`precio del ${ejemplo}`);
    registrar(id1(), 'Intenciones válidas', 'C1, C2', `Producto: "precio del ${ejemplo}" responde precio y disponibilidad`,
      r.status === 200 && r.d.intencion === 'consultar_producto' && r.d.tipo === 'producto', resumen(r));

    r = await q('ayuda');
    registrar(id1(), 'Intenciones válidas', 'C1, C2', 'Ayuda: explica qué se puede consultar',
      r.status === 200 && r.d.intencion === 'ayuda_chatbot' && /Puedo ayudarte con/.test(r.d.respuesta), resumen(r));

    for (const f of PREGUNTAS_FRECUENTES) {
      r = await q(f.etiqueta);
      registrar(id1(), 'Intenciones válidas', 'C1, C2', `Consulta frecuente "${f.etiqueta}" recibe la respuesta aprobada (${f.intencion})`,
        r.status === 200 && r.d.intencion === f.intencion && r.d.respuesta === f.respuesta, resumen(r));
    }

    r = await q('cuál es la capital de Francia');
    registrar(id1(), 'Intenciones válidas', 'C1, C4', 'Pregunta ajena a la joyería cae en Default Fallback Intent y orienta al cliente',
      r.status === 200 && r.d.intencion === 'Default Fallback Intent' && r.d.tipo === 'no_entendido' && orienta(r), resumen(r));

    // ================= 2. Variaciones: otras formas de preguntar lo mismo (C3) =================
    const VARIACIONES = [
      ['buenas tardes', 'Default Welcome Intent'],
      ['buenos días, cómo estás', 'Default Welcome Intent'],
      ['qué tipos de joyas venden', 'listar_categorias'],
      ['muéstrame las categorías del catálogo', 'listar_categorias'],
      ['qué clases de productos manejan', 'listar_categorias'],
      ['muéstrame los relojes', 'productos_categoria'],
      ['qué cadenas hay disponibles', 'productos_categoria'],
      ['quiero ver los topos', 'productos_categoria'],
      [`qué precio tiene el ${ejemplo}`, 'consultar_producto'],
      [`está disponible el ${ejemplo}`, 'consultar_producto'],
      [`me regalas el precio de ${ejemplo}`, 'consultar_producto'],
      ['qué tipo de preguntas respondes', 'ayuda_chatbot'],
      ['cómo funciona este chat', 'ayuda_chatbot'],
      ['con qué cosas me ayudas', 'ayuda_chatbot'],
      ['a qué horas atienden al público', 'faq_horario'],
      ['dónde puedo encontrar la joyería físicamente', 'faq_ubicacion'],
      ['cuál es el celular de la joyería', 'faq_contacto'],
      ['puedo pagar con transferencia de Nequi', 'faq_medios_pago'],
      ['si se me daña la cadena me la cubren', 'faq_garantia'],
      ['le pueden hacer limpieza a mi anillo', 'faq_servicios'],
      ['me pueden fabricar un anillo con mi diseño', 'faq_encargos'],
      ['ustedes compran oro usado', 'faq_compra_metales'],
      ['lo pueden enviar a domicilio', 'faq_envios'],
    ];
    const memorizadas = VARIACIONES.filter(([frase]) => entrenamiento.has(normal(frase)));
    let v = 1;
    const id2 = () => `C${String(v++).padStart(2, '0')}`;
    registrar(id2(), 'Variaciones', 'C3', 'Ninguna variación de esta prueba es una frase de entrenamiento del agente (si lo fuera, no mediría nada)',
      memorizadas.length === 0, memorizadas.length ? `en entrenamiento: ${memorizadas.map((m) => m[0]).join('; ')}` : `${VARIACIONES.length} variaciones revisadas contra ${entrenamiento.size} frases`);
    for (const [frase, esperada] of VARIACIONES) {
      r = await q(frase);
      // Ajuste tras la 2.ª ejecución (DEF-008): en las consultas de producto no basta reconocer la
      // intención; la respuesta debe traer el producto preguntado (no "no encontré el producto").
      const productoOk = esperada !== 'consultar_producto' ||
        (r.d.tipo === 'producto' && ((r.d.datos || [])[0] || {}).nombre === ejemplo);
      registrar(id2(), 'Variaciones', 'C3',
        `"${frase}" se reconoce como ${esperada}${esperada === 'consultar_producto' ? ` y responde el producto ${ejemplo}` : ''}`,
        r.status === 200 && r.d.intencion === esperada && productoOk, resumen(r));
    }

    // ================= 3. Consultas ambiguas: piden aclaración o responden algo coherente =================
    let a = 1;
    const id3 = () => `A${String(a++).padStart(2, '0')}`;
    const ambiguas = [
      ['precio', 'pide aclarar de qué producto', (x) => pideAclaracion(x)],
      ['cuánto cuesta', 'pide aclarar de qué producto', (x) => pideAclaracion(x)],
      ['está disponible?', 'pide aclarar de qué producto', (x) => pideAclaracion(x)],
      ['quiero un reloj', 'muestra relojes o pide aclaración (nunca otra categoría)',
        (x) => pideAclaracion(x) || (['producto', 'productos'].includes(x.d.tipo) && (x.d.datos || []).length > 0 && x.d.datos.every((p) => p.categoria === 'Relojes'))],
      ['anillo', 'muestra anillos o pide aclaración (nunca otra categoría)',
        (x) => pideAclaracion(x) || (['producto', 'productos'].includes(x.d.tipo) && (x.d.datos || []).length > 0 && x.d.datos.every((p) => p.categoria === 'Anillos'))],
      ['oro', 'responde sobre compra de oro, muestra productos de oro o pide aclaración',
        (x) => pideAclaracion(x) || x.d.intencion === 'faq_compra_metales' ||
          (['producto', 'productos'].includes(x.d.tipo) && (x.d.datos || []).length > 0 && x.d.datos.every((p) => /oro/i.test(`${p.material} ${p.nombre}`)))],
      ['plata', 'responde sobre compra de plata, muestra productos de plata o pide aclaración',
        (x) => pideAclaracion(x) || x.d.intencion === 'faq_compra_metales' ||
          (['producto', 'productos'].includes(x.d.tipo) && (x.d.datos || []).length > 0 && x.d.datos.every((p) => /plata/i.test(`${p.material} ${p.nombre}`)))],
      ['y ese cuánto vale', 'sin contexto: pide aclaración u orienta (nunca inventa un producto)',
        (x) => pideAclaracion(x) || (x.d.tipo === 'producto_no_encontrado' && orienta(x))],
    ];
    for (const [frase, esperado, ok] of ambiguas) {
      r = await q(frase);
      registrar(id3(), 'Consultas ambiguas', 'C2, C4', `"${frase}": ${esperado}`,
        r.status === 200 && Boolean(r.d.respuesta) && ok(r),
        `${resumen(r)}${(r.d.datos || []).length ? `; ${r.d.datos.length} productos` : ''}`);
    }

    // ================= 3b. Conversación: varias preguntas seguidas en la MISMA sesión =================
    // Agregado tras las capturas de interfaz (DEF-010): un mensaje no debe "arrastrar" lo anterior.
    let t = 1;
    const id3b = () => `T${String(t++).padStart(2, '0')}`;
    const conversaciones = [
      ['precio', 'le pueden hacer limpieza a mi anillo', 'faq_servicios'],
      ['cuánto cuesta', 'hacen envíos', 'faq_envios'],
      [`me regalas el precio de ${ejemplo}`, 'a qué hora abren', 'faq_horario'],
      ['qué anillos tienen', 'cómo puedo pagar', 'faq_medios_pago'],
    ];
    for (const [primero, segundo, esperada] of conversaciones) {
      const sesion = `hu029-conv-${Date.now().toString(36)}-${t}`;
      await q(primero, sesion);
      r = await q(segundo, sesion);
      registrar(id3b(), 'Conversación', 'C2, C3', `Tras "${primero}", en la misma conversación "${segundo}" se reconoce como ${esperada}`,
        r.status === 200 && r.d.intencion === esperada, resumen(r));
    }

    // ================= 4. Consultas no reconocidas: el chatbot orienta (C4) =================
    let u = 1;
    const id4 = () => `N${String(u++).padStart(2, '0')}`;
    for (const frase of ['recomiéndame una película', 'asdfghjkl', 'quiero pedir una pizza', '😀😀😀', 'cómo está el clima hoy']) {
      r = await q(frase);
      registrar(id4(), 'No reconocidas', 'C4', `"${frase}": no inventa una respuesta y orienta al cliente con ejemplos`,
        r.status === 200 && ['no_entendido', 'producto_no_encontrado'].includes(r.d.tipo) && orienta(r), resumen(r));
    }

    // ================= 5. Productos y disponibilidad iguales a la base de datos (C5) =================
    let p = 1;
    const id5 = () => `P${String(p++).padStart(2, '0')}`;
    const DE_PRUEBA = /prueba|\btest\b|hu-?\d{3}|\bcp\d{2}\b/i;
    const dePrueba = productos.filter((x) => DE_PRUEBA.test(x.nombre));
    registrar(id5(), 'Productos y disponibilidad', 'C5', 'El catálogo que consulta el chatbot no tiene productos de prueba publicados',
      dePrueba.length === 0, dePrueba.length ? `publicados: ${dePrueba.map((x) => `${x.nombre} (id ${x.id})`).join('; ')}` : `${productos.length} productos publicados revisados`);

    for (const prod of productos) {
      const disponibleBD = Number(prod.stock) > 0;
      r = await q(`precio del ${prod.nombre}`);
      const dato = (r.d.datos || [])[0] || {};
      const okChat = r.status === 200 && r.d.tipo === 'producto' && dato.id === prod.id &&
        Number(dato.precio) === Number(prod.precio) && dato.disponible === disponibleBD;
      const web = await obtener(BASE, `/api/disponibilidad/${prod.id}`);
      const okWeb = web.status === 200 && web.d.disponible === disponibleBD;
      registrar(id5(), 'Productos y disponibilidad', 'C5', `"${prod.nombre}": precio y disponibilidad del chatbot iguales a la base de datos y a la página`,
        okChat && okWeb,
        okChat && okWeb
          ? `precio ${Number(prod.precio)}, stock ${prod.stock}, ${disponibleBD ? 'disponible' : 'agotado'} (chatbot y página)`
          : `${resumen(r)}; chatbot: precio ${dato.precio}, disponible ${dato.disponible}; BD: precio ${Number(prod.precio)}, stock ${prod.stock}; página: disponible ${web.d && web.d.disponible}`);
    }

    // ================= 6. Cobertura: todas las intenciones del agente fueron probadas (C1) =================
    const delAgente = agente.intenciones.map((i) => i.intencion);
    const sinProbar = delAgente.filter((i) => !intencionesProbadas.has(i));
    registrar('K01', 'Cobertura', 'C1', `Todas las intenciones del agente (${delAgente.length}) fueron probadas al menos una vez`,
      sinProbar.length === 0, sinProbar.length ? `sin probar: ${sinProbar.join(', ')}` : `${delAgente.length} de ${delAgente.length}`);
    const fantasma = [...intencionesProbadas].filter((i) => !delAgente.includes(i));
    registrar('K02', 'Cobertura', 'C1', 'Todas las intenciones que devolvió el chatbot existen en el agente exportado',
      fantasma.length === 0, fantasma.length ? `no exportadas: ${fantasma.join(', ')}` : 'coinciden');
  } finally {
    await new Promise((ok) => servidor.close(ok));
  }

  const fallas = resultados.filter((x) => !x.pasa);
  const grupos = [...new Set(resultados.map((x) => x.grupo))];
  console.log(`\n${resultados.length} pruebas: ${resultados.length - fallas.length} pasan, ${fallas.length} fallan.`);
  const md = [
    '# Pruebas de la HU-029 — Validar el funcionamiento del chatbot',
    '',
    `- Fecha de ejecución: ${new Date().toLocaleString('es-CO')}`,
    '- Tipo: integración de punta a punta (ruta del chatbot + agente real de Dialogflow + base de datos real). Nada simulado.',
    `- Resumen: ${resultados.length} pruebas, ${resultados.length - fallas.length} pasan, ${fallas.length} fallan.`,
    `- Por grupo: ${grupos.map((g) => { const t = resultados.filter((x) => x.grupo === g); return `${g} ${t.filter((x) => x.pasa).length}/${t.length}`; }).join(' · ')}`,
    '',
    '| Prueba | Grupo | Criterio | Descripción | Resultado | Detalle |',
    '| --- | --- | --- | --- | --- | --- |',
    ...resultados.map((x) => `| ${x.id} | ${x.grupo} | ${x.criterio} | ${x.descripcion.replace(/\|/g, '/')} | ${x.pasa ? 'PASA' : 'FALLA'} | ${String(x.detalle).replace(/\|/g, '/').replace(/\n/g, ' ')} |`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(__dirname, 'resultados-hu029.md'), md, 'utf8');
  console.log('Resultados guardados en backend/pruebas/resultados-hu029.md');
  await pool.end();
  process.exit(fallas.length ? 1 : 0);
}

main().catch(async (e) => {
  console.error('Error inesperado:', e.message);
  try { await pool.end(); } catch { /* nada */ }
  process.exit(1);
});
