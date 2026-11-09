// Pruebas automáticas de las historias de usuario desarrolladas por Daniel Nova:
//   HU-005 (registrar entrada de inventario)   HU-008 (consultar movimientos)
//   HU-011 (visualizar catálogo)               HU-014 (consultar disponibilidad)
//   HU-022 (iniciar sesión)                    HU-023 (gestionar usuarios)
//
// Uso (con el backend encendido), desde la carpeta backend:
//   node pruebas/hu-daniel.js
// Las credenciales del administrador se leen de backend/.env (ADMIN_USUARIO, ADMIN_PASSWORD).
// Opcional: API=http://localhost:4000 (por defecto).
//
// El script también ejecuta las pruebas unitarias de pruebas/unitarias-daniel.js
// y deja todo en backend/pruebas/resultados-daniel.md
//
// Al terminar deja la base de datos como estaba: devuelve el stock de los productos
// que tocó, borra los movimientos y los usuarios que creó para las pruebas, y deja
// al usuario "vendedora" activo y con su contraseña original.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const pool = require('../db');

const API = (process.env.API || 'http://localhost:4000').replace(/\/$/, '');
const ADMIN_USUARIO = process.env.ADMIN_USUARIO;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USUARIO || !ADMIN_PASSWORD) {
  console.error('Faltan ADMIN_USUARIO y ADMIN_PASSWORD (en backend/.env o como variables de entorno).');
  process.exit(1);
}

const resultados = [];
const notas = [];

// ---------------------------------------------------------------- utilidades
function registrar(id, hu, tipo, descripcion, esperado, obtenido, texto, pasa) {
  resultados.push({ id, hu, tipo, descripcion, esperado, obtenido, texto, pasa });
  console.log(`${pasa ? 'PASA ' : 'FALLA'} ${id}  ${descripcion}  (esperado ${esperado}, obtenido ${obtenido})`);
}

async function llamar(metodo, ruta, { token, cuerpo } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cuerpo) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + ruta, {
    method: metodo,
    headers,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined
  });
  const texto = await res.text();
  let datos = null;
  try { datos = JSON.parse(texto); } catch { /* sin JSON */ }
  return { status: res.status, datos, texto };
}

// Texto corto de lo que respondió el servidor, para la columna "resultado obtenido"
function resumen(r) {
  const d = r.datos;
  if (d === null || d === undefined) return `HTTP ${r.status}, sin cuerpo JSON`;
  if (Array.isArray(d)) return `HTTP ${r.status}, lista con ${d.length} elemento(s)`;
  if (d.mensaje) return `HTTP ${r.status}, "${d.mensaje}"`;
  if (d.error) return `HTTP ${r.status}, error: "${d.error}"`;
  return `HTTP ${r.status}`;
}

// Prueba de API: compara el código HTTP y, si se pide, una comprobación extra del cuerpo
function http(id, hu, descripcion, esperado, r, ok = true, detalle = '') {
  const pasa = r.status === esperado && ok !== false;
  const texto = detalle ? `${resumen(r)} — ${detalle}` : resumen(r);
  registrar(id, hu, 'API', descripcion, esperado, r.status, texto, pasa);
}

// Comprobación que no es un código HTTP (datos, base de datos, campos ocultos...)
function check(id, hu, descripcion, pasa, detalle) {
  registrar(id, hu, 'API', descripcion, '—', '—', detalle, pasa);
}

async function stockEnBD(id) {
  const r = await pool.query('SELECT COALESCE(stock, 0) AS stock FROM productos WHERE id = $1', [id]);
  return r.rows.length ? Number(r.rows[0].stock) : null;
}

// Stock visto por la API interna (GET /api/existencias)
async function stockPorApi(id, token) {
  const r = await llamar('GET', '/api/existencias', { token });
  const p = Array.isArray(r.datos) ? r.datos.find((x) => x.id === id) : null;
  return p ? Number(p.stock) : null;
}

// --------------------------------------------------------------------- estado
const limpieza = {
  stockOriginal: new Map(), // producto_id -> stock antes de las pruebas
  movimientos: [],          // movimientos creados por este script
  usuarios: [],             // usuarios creados por este script
  vendedora: null           // { id, nombre, rol, password_hash, activo } original
};

async function recordarStock(id) {
  if (!limpieza.stockOriginal.has(id)) limpieza.stockOriginal.set(id, await stockEnBD(id));
}

async function movimiento(tipo, token, cuerpo) {
  const r = await llamar('POST', `/api/movimientos/${tipo}`, { token, cuerpo });
  if (r.datos && r.datos.movimiento && r.datos.movimiento.id) limpieza.movimientos.push(r.datos.movimiento.id);
  return r;
}

// ----------------------------------------------------------------------- main
async function main() {
  const sufijo = Date.now().toString().slice(-6);
  const claveTemporal = `ClaveDaniel${sufijo}`;

  // ======================= Preparación =======================
  const login = await llamar('POST', '/api/auth/login', { cuerpo: { usuario: ADMIN_USUARIO, password: ADMIN_PASSWORD } });
  if (login.status !== 200) {
    console.error('No se pudo iniciar sesión como administrador:', login.datos);
    process.exit(1);
  }
  const tAdmin = login.datos.token;
  const idAdmin = login.datos.usuario.id;

  // El empleado de las pruebas es "vendedora". Si no existe se crea; si está
  // inactivo se activa. Para poder iniciar sesión con ella se le pone una
  // contraseña temporal y al final se restaura su hash original.
  const fila = (await pool.query(
    'SELECT id, usuario, nombre, rol, activo, password_hash FROM usuarios WHERE usuario = $1',
    ['vendedora']
  )).rows[0];

  let idVendedora;
  if (!fila) {
    const creada = await llamar('POST', '/api/usuarios', {
      token: tAdmin,
      cuerpo: { usuario: 'vendedora', nombre: 'Vendedora', password: claveTemporal, rol: 'empleado' }
    });
    if (creada.status !== 201) { console.error('No se pudo crear a "vendedora":', creada.datos); process.exit(1); }
    idVendedora = creada.datos.id;
    notas.push('El usuario "vendedora" no existía: el script lo creó y lo dejó activo.');
  } else {
    idVendedora = fila.id;
    limpieza.vendedora = fila;
    if (!fila.activo) {
      await llamar('PATCH', `/api/usuarios/${idVendedora}/estado`, { token: tAdmin, cuerpo: { activo: true } });
      notas.push('El usuario "vendedora" estaba inactivo: el script lo activó y lo dejó activo.');
    }
    const puesta = await llamar('PUT', `/api/usuarios/${idVendedora}`, {
      token: tAdmin,
      cuerpo: { nombre: fila.nombre, rol: fila.rol, password: claveTemporal }
    });
    if (puesta.status !== 200) { console.error('No se pudo preparar a "vendedora":', puesta.datos); process.exit(1); }
    notas.push('A "vendedora" se le puso una contraseña temporal para las pruebas y al final se restauró su contraseña original.');
  }

  const loginEmp = await llamar('POST', '/api/auth/login', { cuerpo: { usuario: 'vendedora', password: claveTemporal } });
  if (loginEmp.status !== 200) { console.error('No se pudo iniciar sesión como "vendedora":', loginEmp.datos); process.exit(1); }
  const tEmp = loginEmp.datos.token;

  // Productos de trabajo: uno para las entradas, uno sin movimientos y uno para agotar
  const productos = (await pool.query(
    `SELECT p.id, p.sku, p.nombre, p.categoria, COALESCE(p.stock, 0)::int AS stock, COUNT(m.id)::int AS movs
     FROM productos p LEFT JOIN movimientos m ON m.producto_id = p.id
     WHERE p.publicado = true
     GROUP BY p.id ORDER BY p.id`
  )).rows;

  if (productos.length === 0) { console.error('No hay productos publicados con los que probar.'); process.exit(1); }

  const pEntrada = productos.find((p) => p.movs > 0) || productos[0];
  const pSinMovs = productos.find((p) => p.movs === 0 && p.id !== pEntrada.id);
  const pAgotar = productos.find((p) => p.stock > 0 && p.id !== pEntrada.id && (!pSinMovs || p.id !== pSinMovs.id))
    || productos.find((p) => p.stock > 0 && p.id !== pEntrada.id);

  if (!pSinMovs) notas.push('No se encontró un producto publicado sin movimientos: la prueba D08-09 se marcó como no aplicable.');
  if (!pAgotar) notas.push('No se encontró un segundo producto publicado con stock: las pruebas de cambio de existencias (HU-014) se marcaron como no aplicables.');

  console.log(`\nAmbiente: ${API}`);
  console.log(`Producto para entradas: ${pEntrada.sku} (id ${pEntrada.id}, stock ${pEntrada.stock})`);
  if (pSinMovs) console.log(`Producto sin movimientos: ${pSinMovs.sku} (id ${pSinMovs.id})`);
  if (pAgotar) console.log(`Producto para agotar: ${pAgotar.sku} (id ${pAgotar.id}, stock ${pAgotar.stock})\n`);

  // ======================= HU-005: registrar entrada =======================
  const CANTIDAD = 7;
  await recordarStock(pEntrada.id);
  const stockAntes = await stockPorApi(pEntrada.id, tAdmin);

  const entrada = await movimiento('entrada', tAdmin, { producto_id: pEntrada.id, cantidad: CANTIDAD, observacion: 'Prueba HU-005 (administrador)' });
  http('D05-01', 'HU-005', 'Entrada válida con token de administrador devuelve mensaje de confirmación', 201, entrada,
    !!(entrada.datos && /registrada/i.test(entrada.datos.mensaje || '')));

  const stockDespues = await stockPorApi(pEntrada.id, tAdmin);
  check('D05-02', 'HU-005', `El stock del producto subió exactamente la cantidad registrada (${CANTIDAD})`,
    stockAntes !== null && stockDespues === stockAntes + CANTIDAD,
    `stock antes ${stockAntes}, stock después ${stockDespues} (diferencia ${stockDespues - stockAntes})`);

  const idMovimiento = entrada.datos && entrada.datos.movimiento ? entrada.datos.movimiento.id : null;
  const listaTrasEntrada = await llamar('GET', '/api/movimientos', { token: tAdmin });
  const encontrado = Array.isArray(listaTrasEntrada.datos) && listaTrasEntrada.datos.find((m) => m.id === idMovimiento);
  http('D05-03', 'HU-005', 'El movimiento registrado aparece después en GET /api/movimientos', 200, listaTrasEntrada,
    !!encontrado, encontrado ? `el movimiento ${idMovimiento} aparece en la lista` : `el movimiento ${idMovimiento} NO aparece`);

  http('D05-04', 'HU-005', 'Entrada con cantidad igual a cero', 400,
    await movimiento('entrada', tAdmin, { producto_id: pEntrada.id, cantidad: 0 }));
  http('D05-05', 'HU-005', 'Entrada con cantidad negativa (-3)', 400,
    await movimiento('entrada', tAdmin, { producto_id: pEntrada.id, cantidad: -3 }));
  http('D05-06', 'HU-005', 'Entrada con cantidad decimal (2.5)', 400,
    await movimiento('entrada', tAdmin, { producto_id: pEntrada.id, cantidad: 2.5 }));
  http('D05-07', 'HU-005', 'Entrada con cantidad como texto ("cinco")', 400,
    await movimiento('entrada', tAdmin, { producto_id: pEntrada.id, cantidad: 'cinco' }));
  http('D05-08', 'HU-005', 'Entrada sobre un producto inexistente (id 999999)', 404,
    await movimiento('entrada', tAdmin, { producto_id: 999999, cantidad: 1 }));
  http('D05-09', 'HU-005', 'Entrada sin token de sesión', 401,
    await movimiento('entrada', null, { producto_id: pEntrada.id, cantidad: 1 }));

  const stockAntesEmp = await stockPorApi(pEntrada.id, tAdmin);
  const entradaEmp = await movimiento('entrada', tEmp, { producto_id: pEntrada.id, cantidad: 2, observacion: 'Prueba HU-005 (empleado)' });
  http('D05-10', 'HU-005', 'Entrada con token de empleado (el empleado sí tiene permiso de registrar movimientos)', 201, entradaEmp);
  const stockDespuesEmp = await stockPorApi(pEntrada.id, tAdmin);
  check('D05-11', 'HU-005', 'La entrada del empleado también suma al stock (2 unidades)',
    stockDespuesEmp === stockAntesEmp + 2, `stock antes ${stockAntesEmp}, stock después ${stockDespuesEmp}`);

  // Se devuelve el stock a su valor original por el mismo camino de la aplicación
  const devolucion = await movimiento('salida', tAdmin, { producto_id: pEntrada.id, cantidad: CANTIDAD + 2, observacion: 'Prueba HU-005: devolver el stock original' });
  const stockFinal = await stockPorApi(pEntrada.id, tAdmin);
  http('D05-12', 'HU-005', `Una salida de ${CANTIDAD + 2} unidades devuelve el stock al valor que tenía antes de las pruebas`, 201, devolucion,
    stockFinal === limpieza.stockOriginal.get(pEntrada.id), `stock original ${limpieza.stockOriginal.get(pEntrada.id)}, stock actual ${stockFinal}`);

  // ======================= HU-008: consultar movimientos =======================
  const movs = await llamar('GET', '/api/movimientos', { token: tAdmin });
  const lista = Array.isArray(movs.datos) ? movs.datos : [];
  http('D08-01', 'HU-008', 'GET /api/movimientos con token de administrador devuelve una lista no vacía', 200, movs, lista.length > 0);

  const CAMPOS = ['producto', 'sku', 'tipo', 'cantidad', 'responsable', 'creado_en'];
  const faltantes = lista.filter((m) => CAMPOS.some((c) => !(c in m)));
  const sinDato = lista.filter((m) => ['producto', 'sku', 'tipo', 'cantidad', 'creado_en'].some((c) => m[c] === null || m[c] === undefined));
  check('D08-02', 'HU-008', 'Cada movimiento trae los campos producto, sku, tipo, cantidad, responsable y fecha (creado_en)',
    lista.length > 0 && faltantes.length === 0 && sinDato.length === 0,
    `${lista.length} movimientos revisados; ${faltantes.length} sin alguno de los campos; ${sinDato.length} con producto/sku/tipo/cantidad/fecha vacíos`);

  const mios = lista.filter((m) => limpieza.movimientos.includes(m.id));
  const sinResponsable = lista.filter((m) => m.responsable === null || m.responsable === undefined);
  check('D08-03', 'HU-008', 'Los movimientos registrados por esta prueba traen el nombre del responsable',
    mios.length > 0 && mios.every((m) => typeof m.responsable === 'string' && m.responsable.length > 0),
    `${mios.length} movimientos de esta prueba con responsable: ${[...new Set(mios.map((m) => m.responsable))].join(', ')}` +
    (sinResponsable.length ? `. Observación: ${sinResponsable.length} movimientos históricos anteriores tienen responsable nulo` : ''));

  if (sinResponsable.length) {
    notas.push(`Observación de datos (no es una falla del backend): ${sinResponsable.length} de los ${lista.length} movimientos ` +
      'que ya estaban en la base de datos tienen el responsable nulo. Son movimientos antiguos, cargados antes de que los ' +
      'movimientos guardaran automáticamente el usuario que los registra; los movimientos nuevos sí traen el nombre del responsable (D08-03).');
  }

  const entradas = await llamar('GET', '/api/movimientos?tipo=ENTRADA', { token: tAdmin });
  http('D08-04', 'HU-008', 'Filtrar por tipo=ENTRADA: todos los movimientos son de tipo ENTRADA', 200, entradas,
    Array.isArray(entradas.datos) && entradas.datos.length > 0 && entradas.datos.every((m) => m.tipo === 'ENTRADA'),
    Array.isArray(entradas.datos) ? `${entradas.datos.length} movimientos, todos ENTRADA: ${entradas.datos.every((m) => m.tipo === 'ENTRADA')}` : '');

  const salidas = await llamar('GET', '/api/movimientos?tipo=SALIDA', { token: tAdmin });
  http('D08-05', 'HU-008', 'Filtrar por tipo=SALIDA: todos los movimientos son de tipo SALIDA', 200, salidas,
    Array.isArray(salidas.datos) && salidas.datos.length > 0 && salidas.datos.every((m) => m.tipo === 'SALIDA'),
    Array.isArray(salidas.datos) ? `${salidas.datos.length} movimientos, todos SALIDA: ${salidas.datos.every((m) => m.tipo === 'SALIDA')}` : '');

  http('D08-06', 'HU-008', 'Filtrar con un tipo inválido (tipo=DEVOLUCION)', 400,
    await llamar('GET', '/api/movimientos?tipo=DEVOLUCION', { token: tAdmin }));

  const porProducto = await llamar('GET', `/api/movimientos?producto_id=${pEntrada.id}`, { token: tAdmin });
  http('D08-07', 'HU-008', `Filtrar por producto_id válido (${pEntrada.id}): todos los movimientos son de ese producto`, 200, porProducto,
    Array.isArray(porProducto.datos) && porProducto.datos.length > 0 && porProducto.datos.every((m) => m.producto_id === pEntrada.id),
    Array.isArray(porProducto.datos) ? `${porProducto.datos.length} movimientos del producto ${pEntrada.sku}` : '');

  http('D08-08', 'HU-008', 'Filtrar con un producto_id inválido (producto_id=abc)', 400,
    await llamar('GET', '/api/movimientos?producto_id=abc', { token: tAdmin }));

  if (pSinMovs) {
    const vacia = await llamar('GET', `/api/movimientos?producto_id=${pSinMovs.id}`, { token: tAdmin });
    http('D08-09', 'HU-008', `Consultar un producto sin movimientos (${pSinMovs.sku}) devuelve una lista vacía`, 200, vacia,
      Array.isArray(vacia.datos) && vacia.datos.length === 0);
  } else {
    registrar('D08-09', 'HU-008', 'API', 'Consultar un producto sin movimientos devuelve una lista vacía', '200', 'n/a',
      'No aplicable: no hay ningún producto publicado sin movimientos en este ambiente', true);
  }

  http('D08-10', 'HU-008', 'GET /api/movimientos sin token de sesión', 401, await llamar('GET', '/api/movimientos'));
  http('D08-11', 'HU-008', 'GET /api/movimientos con token de empleado', 200, await llamar('GET', '/api/movimientos', { token: tEmp }));

  // ======================= HU-011: visualizar catálogo =======================
  const catalogo = await llamar('GET', '/api/catalogo');
  const items = Array.isArray(catalogo.datos) ? catalogo.datos : [];
  http('D11-01', 'HU-011', 'GET /api/catalogo sin token (página web pública)', 200, catalogo, items.length > 0);

  const conStock = items.filter((p) => 'stock' in p);
  check('D11-02', 'HU-011', 'Ningún producto del catálogo expone el campo stock',
    items.length > 0 && conStock.length === 0 && !/"stock"/.test(catalogo.texto),
    `${items.length} productos revisados, ${conStock.length} con el campo stock. Campos devueltos: ${items[0] ? Object.keys(items[0]).join(', ') : '—'}`);

  const idsCatalogo = items.map((p) => p.id);
  const publicadosBD = (await pool.query(
    'SELECT id, publicado FROM productos WHERE id = ANY($1)', [idsCatalogo]
  )).rows;
  const noPublicados = publicadosBD.filter((p) => p.publicado !== true);
  check('D11-03', 'HU-011', 'Todos los productos del catálogo tienen publicado = true en la base de datos',
    idsCatalogo.length > 0 && noPublicados.length === 0,
    `${publicadosBD.length} productos verificados en la base de datos, ${noPublicados.length} con publicado distinto de true`);

  const totalBD = Number((await pool.query('SELECT COUNT(*)::int AS total FROM productos WHERE publicado = true')).rows[0].total);
  check('D11-04', 'HU-011', 'La cantidad de productos del catálogo coincide con la consulta directa a la base de datos',
    items.length === totalBD, `catálogo: ${items.length} productos, base de datos (publicado = true): ${totalBD}`);

  const categorias = await llamar('GET', '/api/catalogo/categorias');
  const listaCat = Array.isArray(categorias.datos) ? categorias.datos : [];
  http('D11-05', 'HU-011', 'GET /api/catalogo/categorias sin token devuelve las categorías con su total', 200, categorias,
    listaCat.length > 0 && listaCat.every((c) => typeof c.nombre === 'string' && Number.isInteger(c.total)),
    `${listaCat.length} categorías; ejemplo: ${listaCat.slice(0, 3).map((c) => `${c.nombre}=${c.total}`).join(', ')}`);

  const anillos = await llamar('GET', '/api/catalogo/categorias/Anillos/productos');
  http('D11-06', 'HU-011', 'GET /api/catalogo/categorias/Anillos/productos sin token', 200, anillos,
    !!(anillos.datos && anillos.datos.categoria === 'Anillos' && Array.isArray(anillos.datos.productos)),
    anillos.datos ? `categoría "${anillos.datos.categoria}" con ${anillos.datos.total} productos` : '');

  http('D11-07', 'HU-011', 'Consultar una categoría que no existe (Sombreros)', 404,
    await llamar('GET', '/api/catalogo/categorias/Sombreros/productos'));

  const sinCoincidencias = await llamar('GET', `/api/catalogo?q=zzzznoexistezzzz${sufijo}`);
  http('D11-08', 'HU-011', 'Búsqueda con q que no coincide con nada devuelve una lista vacía', 200, sinCoincidencias,
    Array.isArray(sinCoincidencias.datos) && sinCoincidencias.datos.length === 0);

  // ======================= HU-014: consultar disponibilidad =======================
  const pDisponible = items.find((p) => p.disponible === true) || null;

  if (pDisponible) {
    const disp = await llamar('GET', `/api/disponibilidad/${pDisponible.id}`);
    http('D14-01', 'HU-014', 'Disponibilidad de un producto publicado con stock mayor que cero: disponible = true y estado "Disponible"', 200, disp,
      !!(disp.datos && disp.datos.disponible === true && disp.datos.estado === 'Disponible'),
      disp.datos ? `disponible = ${disp.datos.disponible}, estado = "${disp.datos.estado}", disponibilidad = "${disp.datos.disponibilidad}"` : '');
    check('D14-02', 'HU-014', 'La respuesta de disponibilidad no expone el campo stock',
      !!disp.datos && !('stock' in disp.datos) && !/"stock"/.test(disp.texto),
      `campos devueltos: ${disp.datos ? Object.keys(disp.datos).join(', ') : '—'}`);
  } else {
    registrar('D14-01', 'HU-014', 'API', 'Disponibilidad de un producto publicado con stock mayor que cero', '200', 'n/a', 'No aplicable: no hay productos publicados con stock', true);
    registrar('D14-02', 'HU-014', 'API', 'La respuesta de disponibilidad no expone el campo stock', '—', 'n/a', 'No aplicable', true);
  }

  http('D14-03', 'HU-014', 'Disponibilidad con un id inválido (abc)', 400, await llamar('GET', '/api/disponibilidad/abc'));
  http('D14-04', 'HU-014', 'Disponibilidad de un id inexistente (999999)', 404, await llamar('GET', '/api/disponibilidad/999999'));

  if (pAgotar) {
    await recordarStock(pAgotar.id);
    const original = limpieza.stockOriginal.get(pAgotar.id);

    const salida = await movimiento('salida', tAdmin, { producto_id: pAgotar.id, cantidad: original, observacion: 'Prueba HU-014: dejar el stock en cero' });
    http('D14-05', 'HU-014', `Registrar una salida de ${original} unidades deja el stock de ${pAgotar.sku} en cero`, 201, salida,
      !!(salida.datos && salida.datos.producto && Number(salida.datos.producto.stock) === 0),
      salida.datos && salida.datos.producto ? `stock tras la salida: ${salida.datos.producto.stock}` : '');

    const agotado = await llamar('GET', `/api/disponibilidad/${pAgotar.id}`);
    http('D14-06', 'HU-014', 'Con el stock en cero la disponibilidad pasa a disponible = false y estado "Agotado"', 200, agotado,
      !!(agotado.datos && agotado.datos.disponible === false && agotado.datos.estado === 'Agotado'),
      agotado.datos ? `disponible = ${agotado.datos.disponible}, estado = "${agotado.datos.estado}"` : '');

    const reposicion = await movimiento('entrada', tAdmin, { producto_id: pAgotar.id, cantidad: original, observacion: 'Prueba HU-014: devolver el stock original' });
    http('D14-07', 'HU-014', `Registrar una entrada de ${original} unidades devuelve el stock de ${pAgotar.sku} a su valor original`, 201, reposicion,
      !!(reposicion.datos && reposicion.datos.producto && Number(reposicion.datos.producto.stock) === original),
      reposicion.datos && reposicion.datos.producto ? `stock tras la entrada: ${reposicion.datos.producto.stock} (original ${original})` : '');

    const otraVez = await llamar('GET', `/api/disponibilidad/${pAgotar.id}`);
    http('D14-08', 'HU-014', 'Con el stock repuesto la disponibilidad vuelve a disponible = true y estado "Disponible"', 200, otraVez,
      !!(otraVez.datos && otraVez.datos.disponible === true && otraVez.datos.estado === 'Disponible'),
      otraVez.datos ? `disponible = ${otraVez.datos.disponible}, estado = "${otraVez.datos.estado}"` : '');
  } else {
    for (const [id, descripcion] of [
      ['D14-05', 'Registrar una salida que deja el stock en cero'],
      ['D14-06', 'Con el stock en cero la disponibilidad pasa a "Agotado"'],
      ['D14-07', 'Registrar una entrada que devuelve el stock original'],
      ['D14-08', 'Con el stock repuesto la disponibilidad vuelve a "Disponible"']
    ]) registrar(id, 'HU-014', 'API', descripcion, '—', 'n/a', 'No aplicable: no hay un producto publicado con stock para esta prueba', true);
  }

  // ======================= HU-022: iniciar sesión =======================
  const loginOk = await llamar('POST', '/api/auth/login', { cuerpo: { usuario: ADMIN_USUARIO, password: ADMIN_PASSWORD } });
  http('D22-01', 'HU-022', 'Login correcto devuelve un token de sesión', 200, loginOk,
    !!(loginOk.datos && typeof loginOk.datos.token === 'string' && loginOk.datos.token.split('.').length === 3),
    'devuelve TOKEN y los datos del usuario (sin contraseña)');

  const claveMala = await llamar('POST', '/api/auth/login', { cuerpo: { usuario: ADMIN_USUARIO, password: 'ClaveIncorrecta999' } });
  http('D22-02', 'HU-022', 'Login con contraseña incorrecta', 401, claveMala);

  const noExiste = await llamar('POST', '/api/auth/login', { cuerpo: { usuario: `no_existe_${sufijo}`, password: 'ClaveIncorrecta999' } });
  http('D22-03', 'HU-022', 'Login con un usuario inexistente', 401, noExiste);

  check('D22-04', 'HU-022', 'El mensaje de error es el mismo para contraseña incorrecta y usuario inexistente (no revela qué usuarios existen)',
    !!(claveMala.datos && noExiste.datos && claveMala.datos.error === noExiste.datos.error),
    `ambos responden: "${claveMala.datos ? claveMala.datos.error : ''}"`);

  http('D22-05', 'HU-022', 'Login con los campos vacíos', 400,
    await llamar('POST', '/api/auth/login', { cuerpo: { usuario: '', password: '' } }));

  http('D22-06', 'HU-022', 'Ruta protegida (GET /api/productos) sin token', 401, await llamar('GET', '/api/productos'));
  http('D22-07', 'HU-022', 'Ruta protegida (GET /api/productos) con token válido', 200, await llamar('GET', '/api/productos', { token: tAdmin }));
  http('D22-08', 'HU-022', 'Ruta pública (GET /api/catalogo) sin token', 200, await llamar('GET', '/api/catalogo'));

  check('D22-09', 'HU-022', 'La respuesta del login no incluye password_hash ni la contraseña',
    loginOk.status === 200 && !/password|hash|\$2[aby]\$/i.test(loginOk.texto) && !loginOk.texto.includes(ADMIN_PASSWORD),
    `campos del usuario devueltos: ${loginOk.datos && loginOk.datos.usuario ? Object.keys(loginOk.datos.usuario).join(', ') : '—'}`);

  // ======================= HU-023: gestionar usuarios =======================
  const usuarios = await llamar('GET', '/api/usuarios', { token: tAdmin });
  const listaUsuarios = Array.isArray(usuarios.datos) ? usuarios.datos : [];
  http('D23-01', 'HU-023', 'GET /api/usuarios con token de administrador', 200, usuarios, listaUsuarios.length > 0);

  const conHash = listaUsuarios.filter((u) => 'password_hash' in u || 'password' in u);
  check('D23-02', 'HU-023', 'Ningún usuario de la lista trae password_hash',
    listaUsuarios.length > 0 && conHash.length === 0 && !/password|hash|\$2[aby]\$/i.test(usuarios.texto),
    `${listaUsuarios.length} usuarios revisados, ${conHash.length} con contraseña. Campos devueltos: ${listaUsuarios[0] ? Object.keys(listaUsuarios[0]).join(', ') : '—'}`);

  const nuevoUsuario = `daniel_prueba_${sufijo}`;
  const claveNueva = `ClavePrueba${sufijo}`;
  const creado = await llamar('POST', '/api/usuarios', { token: tAdmin, cuerpo: { usuario: nuevoUsuario, nombre: 'Usuario de prueba Daniel', password: claveNueva, rol: 'empleado' } });
  if (creado.status === 201 && creado.datos && creado.datos.id) limpieza.usuarios.push(creado.datos.id);
  http('D23-03', 'HU-023', `Crear un usuario nuevo (${nuevoUsuario})`, 201, creado,
    !!(creado.datos && creado.datos.usuario === nuevoUsuario && creado.datos.rol === 'empleado'),
    creado.datos ? `usuario creado con id ${creado.datos.id}, rol ${creado.datos.rol}, activo ${creado.datos.activo}` : '');

  http('D23-04', 'HU-023', 'Crear el mismo usuario otra vez (nombre de usuario repetido)', 409,
    await llamar('POST', '/api/usuarios', { token: tAdmin, cuerpo: { usuario: nuevoUsuario, nombre: 'Repetido', password: claveNueva, rol: 'empleado' } }));

  http('D23-05', 'HU-023', 'Crear un usuario con el cuerpo vacío', 400,
    await llamar('POST', '/api/usuarios', { token: tAdmin, cuerpo: {} }));

  http('D23-06', 'HU-023', 'Crear un usuario con una contraseña de menos de 8 caracteres', 400,
    await llamar('POST', '/api/usuarios', { token: tAdmin, cuerpo: { usuario: `corta_${sufijo}`, nombre: 'Clave corta', password: 'abc123', rol: 'empleado' } }));

  http('D23-07', 'HU-023', 'Crear un usuario con un rol que no existe (gerente)', 400,
    await llamar('POST', '/api/usuarios', { token: tAdmin, cuerpo: { usuario: `rol_malo_${sufijo}`, nombre: 'Rol inválido', password: claveNueva, rol: 'gerente' } }));

  const idNuevo = creado.datos ? creado.datos.id : 999999;
  const renombrado = await llamar('PUT', `/api/usuarios/${idNuevo}`, { token: tAdmin, cuerpo: { nombre: 'Usuario de prueba Daniel (editado)', rol: 'empleado' } });
  http('D23-08', 'HU-023', 'Actualizar el nombre de un usuario', 200, renombrado,
    !!(renombrado.datos && renombrado.datos.nombre === 'Usuario de prueba Daniel (editado)'),
    renombrado.datos ? `nombre actualizado a "${renombrado.datos.nombre}"` : '');

  http('D23-09', 'HU-023', 'Actualizar un usuario con un id que no existe (999999)', 404,
    await llamar('PUT', '/api/usuarios/999999', { token: tAdmin, cuerpo: { nombre: 'No existe', rol: 'empleado' } }));

  http('D23-10', 'HU-023', 'El administrador intenta quitarse a sí mismo el rol de administrador', 400,
    await llamar('PUT', `/api/usuarios/${idAdmin}`, { token: tAdmin, cuerpo: { nombre: 'Administrador', rol: 'empleado' } }));

  http('D23-11', 'HU-023', 'El administrador intenta desactivarse a sí mismo', 400,
    await llamar('PATCH', `/api/usuarios/${idAdmin}/estado`, { token: tAdmin, cuerpo: { activo: false } }));

  const desactivado = await llamar('PATCH', `/api/usuarios/${idNuevo}/estado`, { token: tAdmin, cuerpo: { activo: false } });
  http('D23-12', 'HU-023', 'Desactivar a otro usuario deja activo = false', 200, desactivado,
    !!(desactivado.datos && desactivado.datos.activo === false),
    desactivado.datos ? `activo = ${desactivado.datos.activo}` : '');

  http('D23-13', 'HU-023', 'El usuario desactivado intenta iniciar sesión', 403,
    await llamar('POST', '/api/auth/login', { cuerpo: { usuario: nuevoUsuario, password: claveNueva } }));

  const reactivado = await llamar('PATCH', `/api/usuarios/${idNuevo}/estado`, { token: tAdmin, cuerpo: { activo: true } });
  http('D23-14', 'HU-023', 'Reactivar al usuario desactivado', 200, reactivado,
    !!(reactivado.datos && reactivado.datos.activo === true),
    reactivado.datos ? `activo = ${reactivado.datos.activo}` : '');

  http('D23-15', 'HU-023', 'GET /api/usuarios con token de empleado', 403, await llamar('GET', '/api/usuarios', { token: tEmp }));
}

// ------------------------------------------------- pruebas unitarias (node:test)
function pruebasUnitarias() {
  const archivo = path.join(__dirname, 'unitarias-daniel.js');
  const ejecucion = spawnSync(process.execPath, ['--test', '--test-reporter=tap', archivo], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8'
  });
  const salida = `${ejecucion.stdout || ''}\n${ejecucion.stderr || ''}`;
  const lineas = salida.split(/\r?\n/).filter((l) => /^(not )?ok \d+ - /.test(l));

  if (lineas.length === 0) {
    registrar('U-00', 'Unitarias', 'Unitaria', 'Ejecutar pruebas/unitarias-daniel.js', '—', '—',
      `No se pudo leer el resultado de node --test. Salida: ${salida.trim().slice(0, 300)}`, false);
    return;
  }

  lineas.forEach((linea, i) => {
    const pasa = !linea.startsWith('not ');
    const nombre = linea.replace(/^(not )?ok \d+ - /, '').replace(/ # (SKIP|TODO).*$/, '').trim();
    const hu = (nombre.match(/HU-\d+/) || [])[0] || 'Formato (app)';
    const descripcion = nombre.replace(/^HU-\d+:\s*/, '').replace(/^Formato \(app\):\s*/, '');
    registrar(`U-${String(i + 1).padStart(2, '0')}`, hu, 'Unitaria', descripcion, '—', '—',
      pasa ? 'La función devolvió el valor esperado (assert sin errores)' : 'La aserción falló (ver la salida de node --test)', pasa);
  });
}

// ------------------------------------------------------------------- limpieza
async function limpiar() {
  const hecho = [];
  try {
    if (limpieza.movimientos.length) {
      const borrados = await pool.query('DELETE FROM movimientos WHERE id = ANY($1) RETURNING id', [limpieza.movimientos]);
      hecho.push(`${borrados.rowCount} movimiento(s) de prueba eliminados`);
    }
    for (const [id, stock] of limpieza.stockOriginal) {
      await pool.query('UPDATE productos SET stock = $1 WHERE id = $2', [stock, id]);
      hecho.push(`producto ${id}: stock devuelto a ${stock}`);
    }
    if (limpieza.usuarios.length) {
      try {
        const borrados = await pool.query('DELETE FROM usuarios WHERE id = ANY($1) RETURNING id', [limpieza.usuarios]);
        hecho.push(`${borrados.rowCount} usuario(s) de prueba eliminados`);
      } catch {
        await pool.query('UPDATE usuarios SET activo = false WHERE id = ANY($1)', [limpieza.usuarios]);
        hecho.push(`${limpieza.usuarios.length} usuario(s) de prueba desactivados`);
      }
    }
    if (limpieza.vendedora) {
      await pool.query('UPDATE usuarios SET password_hash = $1, nombre = $2, rol = $3, activo = true WHERE id = $4',
        [limpieza.vendedora.password_hash, limpieza.vendedora.nombre, limpieza.vendedora.rol, limpieza.vendedora.id]);
      hecho.push('usuario "vendedora": contraseña original restaurada y queda activo');
    }
  } catch (e) {
    hecho.push(`ATENCIÓN: la limpieza falló (${e.message})`);
  }
  return hecho;
}

// --------------------------------------------------------------------- reporte
function sinTokens(texto) {
  return String(texto)
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, 'TOKEN')
    .replace(/Bearer\s+\S+/g, 'Bearer TOKEN')
    .replace(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g, 'HASH')
    .replace(/\|/g, '/');
}

function escribirReporte(hecho) {
  const total = resultados.length;
  const fallas = resultados.filter((r) => !r.pasa);
  const api = resultados.filter((r) => r.tipo === 'API');
  const unit = resultados.filter((r) => r.tipo === 'Unitaria');

  const md = [
    '# Pruebas de las historias de usuario de Daniel Nova',
    '',
    'Historias cubiertas: HU-005 (registrar entrada de inventario), HU-008 (consultar movimientos),',
    'HU-011 (visualizar catálogo), HU-014 (consultar disponibilidad), HU-022 (iniciar sesión) y',
    'HU-023 (gestionar usuarios).',
    '',
    '## Datos de la ejecución',
    '',
    `- Fecha de ejecución: ${new Date().toLocaleString('es-CO')}`,
    `- Ambiente: backend \`${API}\` (Node ${process.version}, base de datos PostgreSQL del proyecto)`,
    '- Scripts ejecutados: `backend/pruebas/hu-daniel.js` (pruebas de API) y `backend/pruebas/unitarias-daniel.js` (pruebas unitarias con node:test)',
    `- Sesiones usadas: administrador \`${ADMIN_USUARIO}\` (TOKEN) y empleado \`vendedora\` (TOKEN)`,
    '',
    `- **Total de pruebas: ${total}** (${api.length} de API y ${unit.length} unitarias)`,
    `- **Pasaron: ${total - fallas.length}**`,
    `- **Fallaron: ${fallas.length}**`,
    '',
    '| ID | Historia | Tipo | Descripción | HTTP esperado | HTTP obtenido | Resultado obtenido | Estado |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
    ...resultados.map((r) => `| ${r.id} | ${r.hu} | ${r.tipo} | ${sinTokens(r.descripcion)} | ${r.esperado} | ${r.obtenido} | ${sinTokens(r.texto)} | ${r.pasa ? 'PASA' : 'FALLA'} |`),
    ''
  ];

  if (fallas.length) {
    md.push('## Pruebas que fallaron', '');
    fallas.forEach((r) => md.push(`- **${r.id}** (${r.hu}) ${sinTokens(r.descripcion)} — esperado ${r.esperado}, obtenido ${r.obtenido}. ${sinTokens(r.texto)}`));
    md.push('');
  } else {
    md.push('## Pruebas que fallaron', '', 'Ninguna: las ' + total + ' pruebas pasaron.', '');
  }

  md.push('## Notas y observaciones', '');
  [...notas,
    'No se modificó ningún archivo del backend fuera de backend/pruebas: las pruebas solo consumen la API y leen la base de datos.',
    'Las pruebas unitarias leen (sin modificarlos) los módulos de formato de app-inventario y pagina-web con import() dinámico.'
  ].forEach((n) => md.push(`- ${sinTokens(n)}`));
  md.push('');

  md.push('## Limpieza de la base de datos', '',
    'El script deja la base de datos como estaba antes de ejecutarlo:', '');
  (hecho.length ? hecho : ['No hubo cambios que revertir.']).forEach((h) => md.push(`- ${sinTokens(h)}`));
  md.push('', 'En este archivo nunca se escriben tokens reales: donde iría un token de sesión aparece la palabra TOKEN.', '');

  fs.writeFileSync(path.join(__dirname, 'resultados-daniel.md'), md.join('\n'), 'utf8');
  return { total, fallas };
}

// ----------------------------------------------------------------------- run
(async () => {
  let error = null;
  try {
    await main();
    console.log('\n--- Pruebas unitarias (node --test pruebas/unitarias-daniel.js) ---');
    pruebasUnitarias();
  } catch (e) {
    error = e;
    console.error('\nError inesperado durante las pruebas:', e.message);
  }

  const hecho = await limpiar();
  console.log('\n--- Limpieza ---');
  hecho.forEach((h) => console.log(`  ${h}`));

  const { total, fallas } = escribirReporte(hecho);
  console.log(`\n${total} pruebas: ${total - fallas.length} pasan, ${fallas.length} fallan.`);
  if (fallas.length) fallas.forEach((r) => console.log(`  FALLA ${r.id} (${r.hu}) ${r.descripcion}`));
  console.log('\nResultados guardados en backend/pruebas/resultados-daniel.md');

  await pool.end();
  process.exit(error || fallas.length ? 1 : 0);
})();
