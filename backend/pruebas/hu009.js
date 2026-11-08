// Pruebas automáticas de la HU-009 — Alertas de stock bajo.
//
// Uso (con el backend encendido), desde la carpeta backend, en PowerShell:
//   $env:ADMIN_USUARIO='admin'; $env:ADMIN_PASSWORD='su_clave'; node pruebas/hu009.js
// Opcional: $env:API='http://localhost:4000' (es el valor por defecto).
//
// El script crea 4 productos de prueba (por debajo del límite, exactamente en el límite,
// por encima del límite y agotado) y un empleado de prueba. Al final BORRA los productos
// y sus movimientos y DESACTIVA al empleado, dejando la base de datos como estaba.
// Los resultados quedan en backend/pruebas/resultados-hu009.md
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

const resultados = [];
function registrar(id, criterio, descripcion, pasa, detalle = '') {
  resultados.push({ id, criterio, descripcion, pasa, detalle });
  console.log(`${pasa ? 'PASA ' : 'FALLA'} ${id}  ${descripcion}${detalle ? `  (${detalle})` : ''}`);
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
  const claveEmpleado = `Clave${sufijo}xyz`;

  // ---------- Preparación ----------
  const login = await llamar('POST', '/api/auth/login', { cuerpo: { usuario: ADMIN_USUARIO, password: ADMIN_PASSWORD } });
  if (login.status !== 200) { console.error('No se pudo iniciar sesión como administrador.'); process.exit(1); }
  const tAdmin = login.datos.token;

  const emp = await llamar('POST', '/api/usuarios', { token: tAdmin, cuerpo: { usuario: `prueba09_${sufijo}`, nombre: `Empleado HU-009 ${sufijo}`, password: claveEmpleado, rol: 'empleado' } });
  if (emp.status !== 201) { console.error('No se pudo crear el empleado de prueba:', emp.datos); process.exit(1); }
  const idEmpleado = emp.datos.id;
  const tEmp = (await llamar('POST', '/api/auth/login', { cuerpo: { usuario: `prueba09_${sufijo}`, password: claveEmpleado } })).datos.token;

  const inicial = await llamar('GET', '/api/alertas/stock-bajo', { token: tEmp });
  const m = inicial.datos && inicial.datos.stock_minimo;
  if (!Number.isInteger(m) || m < 2) { console.error('El nivel mínimo debe ser un entero de 2 o más para estas pruebas.'); process.exit(1); }

  const ids = [];
  async function crear(etiqueta, stock) {
    const r = await llamar('POST', '/api/productos', { token: tAdmin, cuerpo: { nombre: `PRUEBA HU-009 ${etiqueta} ${sufijo}`, categoria: 'Anillos', material: 'Plata 925', precio: 1000, stock } });
    if (r.status !== 201) throw new Error(`No se pudo crear el producto de prueba (${etiqueta}): ${JSON.stringify(r.datos)}`);
    ids.push(r.datos.id);
    return r.datos;
  }

  try {
    const pBajo = await crear('bajo', m - 1);
    const pLimite = await crear('limite', m);
    const pSobre = await crear('sobre', m + 1);
    const pAgotado = await crear('agotado', 0);

    const alertas = async (token = tEmp) => {
      const r = await llamar('GET', '/api/alertas/stock-bajo', { token });
      return r.datos || { alertas: [] };
    };
    const buscar = (lista, id) => lista.alertas.find((a) => a.id === id);

    // ---------- C1: compara con el nivel mínimo ----------
    const a0 = await alertas();
    registrar('T01', 'C1', 'La consulta de alertas responde 200 e informa el nivel mínimo y el total de alertas', inicial.status === 200 && Number.isInteger(a0.stock_minimo) && a0.total === a0.alertas.length, `nivel mínimo ${a0.stock_minimo}, total ${a0.total}`);
    const ex = await llamar('GET', '/api/existencias', { token: tEmp });
    const estadoDe = (id) => (ex.datos.find((p) => p.id === id) || {}).estado;
    registrar('T02', 'C1, C5', 'El mismo nivel mínimo se usa en las existencias: en el límite es STOCK_BAJO y por encima es DISPONIBLE', estadoDe(pLimite.id) === 'STOCK_BAJO' && estadoDe(pSobre.id) === 'DISPONIBLE', `límite: ${estadoDe(pLimite.id)}, encima: ${estadoDe(pSobre.id)}`);

    // ---------- C2, C3, C4: productos por debajo y en el límite ----------
    const aBajo = buscar(a0, pBajo.id);
    registrar('T03', 'C2, C3', `Producto por debajo del límite (stock ${m - 1}) aparece con estado STOCK_BAJO`, !!aBajo && aBajo.estado === 'STOCK_BAJO', aBajo ? `estado ${aBajo.estado}` : 'no aparece');
    registrar('T04', 'C4', 'La alerta permite identificar el producto: trae id, SKU, nombre, categoría y stock', !!aBajo && aBajo.id === pBajo.id && aBajo.sku === pBajo.sku && aBajo.nombre === pBajo.nombre && aBajo.categoria === 'Anillos' && aBajo.stock === m - 1, aBajo ? `${aBajo.sku} — ${aBajo.nombre} — stock ${aBajo.stock}` : 'no aparece');
    const aLimite = buscar(a0, pLimite.id);
    registrar('T05', 'C2', `Producto exactamente en el límite (stock ${m}) aparece con estado STOCK_BAJO`, !!aLimite && aLimite.estado === 'STOCK_BAJO', aLimite ? `estado ${aLimite.estado}` : 'no aparece');
    const aAgotado = buscar(a0, pAgotado.id);
    registrar('T06', 'C2, C3', 'Producto agotado (stock 0) aparece con estado AGOTADO', !!aAgotado && aAgotado.estado === 'AGOTADO', aAgotado ? `estado ${aAgotado.estado}` : 'no aparece');
    const pos = (id) => a0.alertas.findIndex((a) => a.id === id);
    registrar('T07', 'C3', 'Las alertas se ordenan de menor a mayor stock (primero el agotado)', pos(pAgotado.id) >= 0 && pos(pAgotado.id) < pos(pBajo.id) && pos(pBajo.id) < pos(pLimite.id), `posiciones: agotado ${pos(pAgotado.id)}, bajo ${pos(pBajo.id)}, límite ${pos(pLimite.id)}`);

    // ---------- C5: por encima del límite ----------
    registrar('T08', 'C5', `Producto por encima del límite (stock ${m + 1}) no genera alerta`, !buscar(a0, pSobre.id), buscar(a0, pSobre.id) ? 'aparece' : 'no aparece');

    // ---------- C6: se actualiza cuando cambian las existencias ----------
    const e1 = await llamar('POST', '/api/movimientos/entrada', { token: tEmp, cuerpo: { producto_id: pBajo.id, cantidad: 2 } });
    const a1 = await alertas();
    registrar('T09', 'C6', `Entrada que sube el producto bajo de ${m - 1} a ${m + 1}: la alerta desaparece`, e1.status === 201 && !buscar(a1, pBajo.id), `entrada HTTP ${e1.status}`);

    const s1 = await llamar('POST', '/api/movimientos/salida', { token: tEmp, cuerpo: { producto_id: pSobre.id, cantidad: 1 } });
    const a2 = await alertas();
    const nuevaLimite = buscar(a2, pSobre.id);
    registrar('T10', 'C6', `Salida que baja el producto de ${m + 1} a ${m}: aparece la alerta STOCK_BAJO`, s1.status === 201 && !!nuevaLimite && nuevaLimite.estado === 'STOCK_BAJO', `salida HTTP ${s1.status}`);

    const s2 = await llamar('POST', '/api/movimientos/salida', { token: tEmp, cuerpo: { producto_id: pSobre.id, cantidad: m } });
    const a3 = await alertas();
    const agotado = buscar(a3, pSobre.id);
    registrar('T11', 'C6', 'Salida que deja el producto en 0: el estado de la alerta cambia a AGOTADO', s2.status === 201 && !!agotado && agotado.estado === 'AGOTADO', agotado ? `estado ${agotado.estado}` : 'no aparece');

    const e2 = await llamar('POST', '/api/movimientos/entrada', { token: tEmp, cuerpo: { producto_id: pAgotado.id, cantidad: m + 3 } });
    const a4 = await alertas();
    registrar('T12', 'C6', `Entrada al producto agotado (+${m + 3}): la alerta desaparece`, e2.status === 201 && !buscar(a4, pAgotado.id), `entrada HTTP ${e2.status}`);

    // ---------- Usuario autorizado / no autorizado ----------
    const rAdmin = await llamar('GET', '/api/alertas/stock-bajo', { token: tAdmin });
    registrar('T13', 'Pruebas: usuario autorizado', 'El administrador consulta las alertas: 200', rAdmin.status === 200, `HTTP ${rAdmin.status}`);
    registrar('T14', 'Pruebas: usuario autorizado', 'El empleado consulta las alertas: 200', inicial.status === 200, `HTTP ${inicial.status}`);
    const rSin = await llamar('GET', '/api/alertas/stock-bajo');
    registrar('T15', 'Pruebas: usuario no autorizado', 'Sin iniciar sesión (sin token): 401', rSin.status === 401, `HTTP ${rSin.status}`);
    const rFalso = await llamar('GET', '/api/alertas/stock-bajo', { token: 'abc.def.ghi' });
    registrar('T16', 'Pruebas: usuario no autorizado', 'Con un token inventado: 401', rFalso.status === 401, `HTTP ${rFalso.status}`);
    await llamar('PATCH', `/api/usuarios/${idEmpleado}/estado`, { token: tAdmin, cuerpo: { activo: false } });
    const rDes = await llamar('GET', '/api/alertas/stock-bajo', { token: tEmp });
    registrar('T17', 'Pruebas: usuario no autorizado', 'Un usuario desactivado ya no puede consultar las alertas: 401', rDes.status === 401, `HTTP ${rDes.status}`);
  } finally {
    // ---------- Limpieza ----------
    if (ids.length) {
      await pool.query('DELETE FROM movimientos WHERE producto_id = ANY($1)', [ids]);
      await pool.query('DELETE FROM productos WHERE id = ANY($1)', [ids]);
    }
    await llamar('PATCH', `/api/usuarios/${idEmpleado}/estado`, { token: tAdmin, cuerpo: { activo: false } });
  }

  const fallas = resultados.filter((r) => !r.pasa);
  console.log(`\n${resultados.length} pruebas: ${resultados.length - fallas.length} pasan, ${fallas.length} fallan.`);

  const md = [
    '# Pruebas de la HU-009 — Alertas de stock bajo',
    '',
    `- Fecha de ejecución: ${new Date().toLocaleString('es-CO')}`,
    `- Backend probado: \`${API}\``,
    `- Resumen: ${resultados.length} pruebas, ${resultados.length - fallas.length} pasan, ${fallas.length} fallan.`,
    '',
    '| Prueba | Criterio | Descripción | Resultado | Detalle |',
    '| --- | --- | --- | --- | --- |',
    ...resultados.map((r) => `| ${r.id} | ${r.criterio} | ${r.descripcion} | ${r.pasa ? 'PASA' : 'FALLA'} | ${r.detalle.replace(/\|/g, '/')} |`),
    ''
  ].join('\n');
  fs.writeFileSync(path.join(__dirname, 'resultados-hu009.md'), md, 'utf8');
  console.log('Resultados guardados en backend/pruebas/resultados-hu009.md');

  await pool.end();
  process.exit(fallas.length ? 1 : 0);
}

main().catch((e) => { console.error('Error inesperado:', e.message); process.exit(1); });
