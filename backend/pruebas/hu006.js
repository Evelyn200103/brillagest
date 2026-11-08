// Pruebas automáticas de la HU-006 — Registrar salida de inventario.
//
// Uso (con el backend encendido), desde la carpeta backend, en PowerShell:
//   node pruebas/hu006.js
// Lee ADMIN_USUARIO y ADMIN_PASSWORD de backend/.env (o de las variables de entorno).
// Opcional: $env:API='http://localhost:4000' (es el valor por defecto).
//
// El script crea un producto y un empleado de prueba, hace las pruebas y al final
// BORRA el producto y sus movimientos y DESACTIVA al empleado, para dejar la base
// de datos como estaba.
// Los resultados quedan en backend/pruebas/resultados-hu006.md
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
  const idAdmin = login.datos.usuario.id;

  const emp = await llamar('POST', '/api/usuarios', { token: tAdmin, cuerpo: { usuario: `prueba06_${sufijo}`, nombre: `Empleado HU-006 ${sufijo}`, password: claveEmpleado, rol: 'empleado' } });
  if (emp.status !== 201) { console.error('No se pudo crear el empleado de prueba:', emp.datos); process.exit(1); }
  const idEmpleado = emp.datos.id;
  const nombreEmpleado = emp.datos.nombre || `Empleado HU-006 ${sufijo}`;
  const loginEmp = await llamar('POST', '/api/auth/login', { cuerpo: { usuario: `prueba06_${sufijo}`, password: claveEmpleado } });
  const tEmp = loginEmp.datos.token;

  const prod = await llamar('POST', '/api/productos', { token: tAdmin, cuerpo: { nombre: `PRUEBA HU-006 ${sufijo}`, categoria: 'Anillos', material: 'Plata 925', precio: 1000, stock: 10 } });
  if (prod.status !== 201) { console.error('No se pudo crear el producto de prueba:', prod.datos); process.exit(1); }
  const idProd = prod.datos.id;

  const salida = (cantidad, extra = {}, token = tEmp) =>
    llamar('POST', '/api/movimientos/salida', { token, cuerpo: { producto_id: idProd, cantidad, ...extra } });
  const stockActual = async () => {
    const r = await llamar('GET', '/api/existencias', { token: tAdmin });
    const p = r.datos.productos ? r.datos.productos.find((x) => x.id === idProd) : r.datos.find((x) => x.id === idProd);
    return p ? Number(p.stock) : null;
  };
  const contarMovimientos = async () =>
    Number((await pool.query('SELECT COUNT(*) FROM movimientos WHERE producto_id = $1', [idProd])).rows[0].count);

  try {
    // ---------- Salida válida (stock inicial 10) ----------
    const s1 = await salida(3);
    registrar('T01', 'C1, C2, C5, C7', 'Salida válida de 3 unidades (stock 10): responde 201 y confirma la operación', s1.status === 201 && s1.datos.mensaje === 'Salida registrada correctamente', `HTTP ${s1.status}`);
    registrar('T02', 'C6, C7', 'La respuesta trae el nuevo stock del producto (7)', s1.datos && s1.datos.producto && Number(s1.datos.producto.stock) === 7, `stock ${s1.datos && s1.datos.producto ? s1.datos.producto.stock : '?'}`);
    const sx = await stockActual();
    registrar('T03', 'C6', 'Verificación del stock después de la operación: las existencias muestran 7', sx === 7, `existencias: ${sx}`);

    const mov = (await pool.query('SELECT tipo, cantidad, usuario_id, producto_id FROM movimientos WHERE producto_id = $1 ORDER BY id', [idProd])).rows;
    registrar('T04', 'C5', 'El movimiento queda guardado como SALIDA, con producto, cantidad y el usuario que la hizo', mov.length === 1 && mov[0].tipo === 'SALIDA' && mov[0].cantidad === 3 && mov[0].usuario_id === idEmpleado, mov.length ? `tipo ${mov[0].tipo}, cantidad ${mov[0].cantidad}` : 'sin movimientos');

    const hist = await llamar('GET', `/api/movimientos?producto_id=${idProd}`, { token: tEmp });
    const fila = Array.isArray(hist.datos) ? hist.datos.find((m) => m.tipo === 'SALIDA' && m.cantidad === 3) : null;
    registrar('T05', 'C8', 'El movimiento aparece en el historial (/api/movimientos) con el nombre de quien lo registró', hist.status === 200 && !!fila && fila.responsable === nombreEmpleado, fila ? `responsable: ${fila.responsable}` : 'no aparece');

    const s2 = await salida(2, { observacion: 'Venta de mostrador' });
    const obs = (await pool.query("SELECT observacion FROM movimientos WHERE producto_id = $1 AND cantidad = 2", [idProd])).rows[0];
    registrar('T06', 'C5', 'La observación opcional se guarda junto con el movimiento', s2.status === 201 && obs && obs.observacion === 'Venta de mostrador', `HTTP ${s2.status}`);

    // ---------- Stock insuficiente (stock actual 5) ----------
    const antes = await contarMovimientos();
    const s3 = await salida(6);
    registrar('T07', 'C4, C7', 'Salida mayor al stock (6 con stock 5): responde 400 e informa el stock disponible', s3.status === 400 && s3.datos.error === 'Stock insuficiente. Disponible: 5', s3.datos ? `HTTP ${s3.status}: ${s3.datos.error}` : `HTTP ${s3.status}`);
    registrar('T08', 'C4, C6', 'La salida rechazada no cambia el stock ni crea un movimiento', (await stockActual()) === 5 && (await contarMovimientos()) === antes, `stock ${await stockActual()}`);

    const s4 = await salida(5);
    registrar('T09', 'C4, C6', 'Salida de todo el stock disponible (5): responde 201 y el stock queda en 0', s4.status === 201 && Number(s4.datos.producto.stock) === 0, `HTTP ${s4.status}`);
    const s5 = await salida(1);
    registrar('T10', 'C4', 'Salida con el producto agotado (stock 0): responde 400 "Stock insuficiente. Disponible: 0"', s5.status === 400 && s5.datos.error === 'Stock insuficiente. Disponible: 0', `HTTP ${s5.status}`);

    // ---------- Validación de la cantidad ----------
    const antesInv = await contarMovimientos();
    for (const [id, etiqueta, valor] of [['T11', 'cantidad cero', 0], ['T12', 'cantidad negativa (-2)', -2], ['T13', 'cantidad decimal (1.5)', 1.5], ['T14', 'cantidad con texto ("abc")', 'abc']]) {
      const r = await salida(valor);
      registrar(id, 'C3, C7', `Salida con ${etiqueta}: responde 400 con el mensaje de validación`, r.status === 400 && r.datos.error === 'La cantidad debe ser un número entero mayor que cero', `HTTP ${r.status}`);
    }
    const rVacia = await llamar('POST', '/api/movimientos/salida', { token: tEmp, cuerpo: { producto_id: idProd } });
    registrar('T15', 'C3', 'Salida sin indicar la cantidad: responde 400', rVacia.status === 400, `HTTP ${rVacia.status}`);

    // ---------- Producto ----------
    const rNo = await llamar('POST', '/api/movimientos/salida', { token: tEmp, cuerpo: { producto_id: 99999999, cantidad: 1 } });
    registrar('T16', 'C1', 'Producto inexistente: responde 404 "Producto no encontrado"', rNo.status === 404 && rNo.datos.error === 'Producto no encontrado', `HTTP ${rNo.status}`);
    const rMal = await llamar('POST', '/api/movimientos/salida', { token: tEmp, cuerpo: { producto_id: 'abc', cantidad: 1 } });
    registrar('T17', 'C1', 'Producto inválido ("abc"): responde 400 "Producto inválido"', rMal.status === 400 && rMal.datos.error === 'Producto inválido', `HTTP ${rMal.status}`);
    const rSinProd = await llamar('POST', '/api/movimientos/salida', { token: tEmp, cuerpo: { cantidad: 1 } });
    registrar('T18', 'C1', 'Salida sin indicar el producto: responde 400', rSinProd.status === 400, `HTTP ${rSinProd.status}`);
    registrar('T19', 'C5, C6', 'Ninguna de las peticiones inválidas creó movimientos ni cambió el stock', (await contarMovimientos()) === antesInv && (await stockActual()) === 0, `movimientos: ${await contarMovimientos()}, stock: ${await stockActual()}`);

    // ---------- Usuarios y permisos ----------
    await pool.query('UPDATE productos SET stock = 4 WHERE id = $1', [idProd]);
    const sa = await salida(1, {}, tAdmin);
    const movAdmin = (await pool.query("SELECT usuario_id FROM movimientos WHERE producto_id = $1 ORDER BY id DESC LIMIT 1", [idProd])).rows[0];
    registrar('T20', 'C1, C5', 'El administrador también puede registrar una salida y queda registrado como responsable', sa.status === 201 && movAdmin && movAdmin.usuario_id === idAdmin, `HTTP ${sa.status}`);
    const sSin = await llamar('POST', '/api/movimientos/salida', { cuerpo: { producto_id: idProd, cantidad: 1 } });
    registrar('T21', 'Pruebas (usuario sin permisos)', 'Sin iniciar sesión (sin token): responde 401', sSin.status === 401, `HTTP ${sSin.status}`);
    const sFalso = await salida(1, {}, 'abc.def.ghi');
    registrar('T22', 'Pruebas (usuario sin permisos)', 'Con un token inventado: responde 401', sFalso.status === 401, `HTTP ${sFalso.status}`);
    const stockAntes = await stockActual();
    await llamar('PATCH', `/api/usuarios/${idEmpleado}/estado`, { token: tAdmin, cuerpo: { activo: false } });
    const sDes = await salida(1);
    registrar('T23', 'Pruebas (usuario sin permisos)', 'Un usuario desactivado ya no puede registrar salidas: responde 401', sDes.status === 401 && (await stockActual()) === stockAntes, `HTTP ${sDes.status}`);
  } finally {
    // ---------- Limpieza ----------
    await pool.query('DELETE FROM movimientos WHERE producto_id = $1', [idProd]);
    await pool.query('DELETE FROM productos WHERE id = $1', [idProd]);
    await llamar('PATCH', `/api/usuarios/${idEmpleado}/estado`, { token: tAdmin, cuerpo: { activo: false } });
  }

  const fallas = resultados.filter((r) => !r.pasa);
  console.log(`\n${resultados.length} pruebas: ${resultados.length - fallas.length} pasan, ${fallas.length} fallan.`);

  const md = [
    '# Pruebas de la HU-006 — Registrar salida de inventario',
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
  fs.writeFileSync(path.join(__dirname, 'resultados-hu006.md'), md, 'utf8');
  console.log('Resultados guardados en backend/pruebas/resultados-hu006.md');

  await pool.end();
  process.exit(fallas.length ? 1 : 0);
}

main().catch((e) => { console.error('Error inesperado:', e.message); process.exit(1); });
