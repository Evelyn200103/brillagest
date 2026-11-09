// Pruebas automáticas de la HU-012 — Consultar productos por categoría (catálogo público).
//
// Uso (con el backend encendido), desde la carpeta backend, en PowerShell:
//   $env:ADMIN_USUARIO='admin'; $env:ADMIN_PASSWORD='su_clave'; node pruebas/hu012.js
// Opcional: $env:API='http://localhost:4000' (es el valor por defecto).
//
// El script crea 4 productos de prueba en la categoría "Aretes largos" y "Anillos"
// (usa la sesión del administrador solo para prepararlos). Las consultas del catálogo
// se hacen SIN token, como las haría un cliente de la página web. Al final BORRA los
// productos de prueba y deja la base de datos como estaba.
// Los resultados quedan en backend/pruebas/resultados-hu012.md
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../db');

const API = (process.env.API || 'http://localhost:4000').replace(/\/$/, '');
const ADMIN_USUARIO = process.env.ADMIN_USUARIO;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USUARIO || !ADMIN_PASSWORD) {
  console.error('Faltan ADMIN_USUARIO y ADMIN_PASSWORD (en backend/.env o como variables de entorno).');
  process.exit(1);
}

const CATEGORIAS = ['Anillos', 'Pulseras', 'Cadenas', 'Topos', 'Dijes', 'Aretes largos', 'Candongas', 'Candongas con piedrería', 'Argollas', 'Tobilleras', 'Relojes'];
const CAT = 'Aretes largos';
const OTRA = 'Anillos';

const resultados = [];
function registrar(id, criterio, descripcion, pasa, detalle = '', omitida = false) {
  resultados.push({ id, criterio, descripcion, pasa, detalle, omitida });
  console.log(`${omitida ? 'OMITE' : pasa ? 'PASA ' : 'FALLA'} ${id}  ${descripcion}${detalle ? `  (${detalle})` : ''}`);
}

async function llamar(metodo, ruta, { token, cuerpo } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cuerpo) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + ruta, { method: metodo, headers, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  let datos = null;
  try { datos = await res.json(); } catch { /* sin cuerpo */ }
  return { status: res.status, datos };
}

async function main() {
  const sufijo = Date.now().toString().slice(-6);

  const login = await llamar('POST', '/api/auth/login', { cuerpo: { usuario: ADMIN_USUARIO, password: ADMIN_PASSWORD } });
  if (login.status !== 200) { console.error('No se pudo iniciar sesión como administrador.'); process.exit(1); }
  const tAdmin = login.datos.token;

  // Conteo ANTES de crear los productos de prueba (consulta pública, sin token)
  const antes = await llamar('GET', '/api/catalogo/categorias');
  const totalAntes = antes.status === 200 ? (antes.datos.find((c) => c.nombre === CAT) || {}).total : null;

  const ids = [];
  async function crear(etiqueta, categoria, stock, publicado) {
    const r = await llamar('POST', '/api/productos', { token: tAdmin, cuerpo: { nombre: `PRUEBA HU-012 ${etiqueta} ${sufijo}`, categoria, material: 'Plata 925', precio: 1000, stock } });
    if (r.status !== 201) throw new Error(`No se pudo crear el producto de prueba (${etiqueta}): ${JSON.stringify(r.datos)}`);
    ids.push(r.datos.id);
    await llamar('PATCH', `/api/productos/${r.datos.id}/publicado`, { token: tAdmin, cuerpo: { publicado } });
    return r.datos;
  }

  try {
    const pA = await crear('A', CAT, 0, true);       // agotado
    const pB = await crear('B', CAT, 3, true);       // disponible
    const pC = await crear('C', OTRA, 3, true);      // de otra categoría
    const pD = await crear('D', CAT, 3, false);      // NO publicado

    // ---------- C1: categorías disponibles ----------
    const cats = await llamar('GET', '/api/catalogo/categorias');
    const nombres = Array.isArray(cats.datos) ? cats.datos.map((c) => c.nombre) : [];
    registrar('T01', 'C1', 'Sin iniciar sesión, la consulta de categorías responde 200 con las 11 categorías del catálogo, cada una con su total', cats.status === 200 && nombres.length === 11 && CATEGORIAS.every((n) => nombres.includes(n)) && cats.datos.every((c) => Number.isInteger(c.total)), `HTTP ${cats.status}, ${nombres.length} categorías`);
    const totalDespues = (cats.datos.find((c) => c.nombre === CAT) || {}).total;
    registrar('T02', 'C1, C6', `El total de "${CAT}" sube en 2 al crear 2 productos publicados (el no publicado no cuenta)`, totalAntes !== null && totalDespues === totalAntes + 2, `antes ${totalAntes}, después ${totalDespues}`);

    // ---------- C2, C3: productos de la categoría ----------
    const r = await llamar('GET', `/api/catalogo/categorias/${encodeURIComponent(CAT)}/productos`);
    const lista = r.datos && r.datos.productos ? r.datos.productos : [];
    registrar('T03', 'C2, C3', `Consultar "${CAT}" responde 200 con la categoría, el total y la lista de productos`, r.status === 200 && r.datos.categoria === CAT && r.datos.total === lista.length, `HTTP ${r.status}, total ${r.datos ? r.datos.total : '?'}`);
    registrar('T04', 'C3, C6', 'La lista incluye los dos productos de prueba publicados', lista.some((p) => p.id === pA.id) && lista.some((p) => p.id === pB.id), `${lista.length} productos en la lista`);
    registrar('T05', 'C4', 'Verificación de productos correspondientes: todos los productos de la lista pertenecen a la categoría', lista.length > 0 && lista.every((p) => p.categoria === CAT), `${lista.filter((p) => p.categoria === CAT).length} de ${lista.length}`);
    registrar('T06', 'C4', 'El producto de prueba de otra categoría (Anillos) no aparece en la lista', !lista.some((p) => p.id === pC.id));
    registrar('T07', 'C6', 'El producto no publicado no aparece en la lista', !lista.some((p) => p.id === pD.id));
    const a = lista.find((p) => p.id === pA.id);
    const b = lista.find((p) => p.id === pB.id);
    registrar('T08', 'C3, C6', 'Cada producto trae su información (id, SKU, nombre, material, precio) y su disponibilidad, sin mostrar el stock', !!a && !!b && ['id', 'sku', 'nombre', 'material', 'precio'].every((k) => a[k] !== undefined) && a.disponibilidad === 'AGOTADO' && b.disponibilidad === 'DISPONIBLE' && a.stock === undefined && b.stock === undefined, a && b ? `A: ${a.disponibilidad}, B: ${b.disponibilidad}` : 'no aparecen');
    registrar('T09', 'C1, C3', 'El total de la lista de categorías coincide con el total de la consulta por categoría', totalDespues === r.datos.total, `${totalDespues} y ${r.datos.total}`);
    const rMin = await llamar('GET', `/api/catalogo/categorias/${encodeURIComponent(CAT.toLowerCase())}/productos`);
    registrar('T10', 'C2', 'La categoría se reconoce sin importar mayúsculas o minúsculas ("aretes largos")', rMin.status === 200 && rMin.datos.categoria === CAT, `HTTP ${rMin.status}`);

    // ---------- C5: categoría sin productos ----------
    const vacia = cats.datos.find((c) => c.total === 0);
    if (vacia) {
      const rv = await llamar('GET', `/api/catalogo/categorias/${encodeURIComponent(vacia.nombre)}/productos`);
      registrar('T11', 'C5', `Categoría sin productos ("${vacia.nombre}"): responde 200 con total 0 y lista vacía`, rv.status === 200 && rv.datos.total === 0 && rv.datos.productos.length === 0, `HTTP ${rv.status}`);
    } else {
      registrar('T11', 'C5', 'Categoría sin productos: responde 200 con total 0 y lista vacía', true, 'omitida: hoy todas las categorías tienen productos', true);
    }

    // ---------- Categoría inexistente ----------
    const rNo = await llamar('GET', '/api/catalogo/categorias/Sombreros/productos');
    registrar('T12', 'Pruebas: categoría inexistente', 'Categoría inexistente ("Sombreros"): responde 404 "La categoría solicitada no existe"', rNo.status === 404 && rNo.datos.error === 'La categoría solicitada no existe', `HTTP ${rNo.status}`);
    const rInj = await llamar('GET', `/api/catalogo/categorias/${encodeURIComponent("Anillos' OR '1'='1")}/productos`);
    registrar('T13', 'Pruebas: categoría inexistente', 'Un nombre con comillas y código SQL se trata como categoría inexistente: 404', rInj.status === 404, `HTTP ${rInj.status}`);
  } finally {
    // ---------- Limpieza ----------
    if (ids.length) {
      await pool.query('DELETE FROM movimientos WHERE producto_id = ANY($1)', [ids]);
      await pool.query('DELETE FROM productos WHERE id = ANY($1)', [ids]);
    }
  }

  const evaluadas = resultados.filter((r) => !r.omitida);
  const fallas = evaluadas.filter((r) => !r.pasa);
  const omitidas = resultados.length - evaluadas.length;
  console.log(`\n${evaluadas.length} pruebas: ${evaluadas.length - fallas.length} pasan, ${fallas.length} fallan${omitidas ? `, ${omitidas} omitidas` : ''}.`);

  const md = [
    '# Pruebas de la HU-012 — Consultar productos por categoría',
    '',
    `- Fecha de ejecución: ${new Date().toLocaleString('es-CO')}`,
    `- Backend probado: \`${API}\``,
    `- Resumen: ${evaluadas.length} pruebas, ${evaluadas.length - fallas.length} pasan, ${fallas.length} fallan${omitidas ? `, ${omitidas} omitidas` : ''}.`,
    '',
    '| Prueba | Criterio | Descripción | Resultado | Detalle |',
    '| --- | --- | --- | --- | --- |',
    ...resultados.map((r) => `| ${r.id} | ${r.criterio} | ${r.descripcion} | ${r.omitida ? 'OMITIDA' : r.pasa ? 'PASA' : 'FALLA'} | ${r.detalle.replace(/\|/g, '/')} |`),
    ''
  ].join('\n');
  fs.writeFileSync(path.join(__dirname, 'resultados-hu012.md'), md, 'utf8');
  console.log('Resultados guardados en backend/pruebas/resultados-hu012.md');

  await pool.end();
  process.exit(fallas.length ? 1 : 0);
}

main().catch((e) => { console.error('Error inesperado:', e.message); process.exit(1); });
