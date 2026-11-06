// Pruebas unitarias de las funciones puras usadas por las historias de Daniel Nova.
//
// Uso, desde la carpeta backend:
//   node --test pruebas/unitarias-daniel.js
// También las ejecuta pruebas/hu-daniel.js, que las incluye en el reporte final.
//
// Se prueban:
//   - backend/disponibilidad.js      calcularDisponibilidad y conDisponibilidad (HU-014)
//   - pagina-web/src/formato.js      formatoPrecio (HU-011)
//   - app-inventario/src/formato.js  formatoPrecio, estadoStock e iniciales
//
// Los dos archivos de formato son módulos ES del frontend: se cargan con import()
// dinámico y solo se leen (no se modifican).
const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

const { calcularDisponibilidad, conDisponibilidad } = require('../disponibilidad');
const { STOCK_MINIMO } = require('../config');

let formatoWeb = null;
let formatoApp = null;

before(async () => {
  const raiz = path.join(__dirname, '..', '..');
  formatoWeb = await import(pathToFileURL(path.join(raiz, 'pagina-web', 'src', 'formato.js')).href);
  formatoApp = await import(pathToFileURL(path.join(raiz, 'app-inventario', 'src', 'formato.js')).href);
});

// Los precios en es-CO salen con espacio duro ("$ 325.000"): se normaliza para comparar.
const normal = (t) => String(t).replace(/ /g, ' ');

// ===================== HU-014: calcularDisponibilidad =====================

test('HU-014: calcularDisponibilidad con stock mayor que cero devuelve DISPONIBLE', () => {
  assert.deepEqual(calcularDisponibilidad(12), {
    disponible: true,
    disponibilidad: 'DISPONIBLE',
    estado: 'Disponible'
  });
});

test('HU-014: calcularDisponibilidad con stock en cero devuelve AGOTADO', () => {
  assert.deepEqual(calcularDisponibilidad(0), {
    disponible: false,
    disponibilidad: 'AGOTADO',
    estado: 'Agotado'
  });
});

test('HU-014: calcularDisponibilidad con stock nulo (null) devuelve AGOTADO', () => {
  assert.deepEqual(calcularDisponibilidad(null), {
    disponible: false,
    disponibilidad: 'AGOTADO',
    estado: 'Agotado'
  });
});

test('HU-014: calcularDisponibilidad con stock indefinido (undefined) devuelve AGOTADO', () => {
  assert.equal(calcularDisponibilidad(undefined).disponible, false);
  assert.equal(calcularDisponibilidad(undefined).estado, 'Agotado');
});

test('HU-014: calcularDisponibilidad con stock como texto no numérico ("abc") devuelve AGOTADO', () => {
  assert.deepEqual(calcularDisponibilidad('abc'), {
    disponible: false,
    disponibilidad: 'AGOTADO',
    estado: 'Agotado'
  });
});

test('HU-014: calcularDisponibilidad con el valor frontera de una unidad devuelve DISPONIBLE', () => {
  assert.equal(calcularDisponibilidad(1).disponible, true);
  assert.equal(calcularDisponibilidad(1).estado, 'Disponible');
});

test('HU-014: calcularDisponibilidad con stock negativo (-3) devuelve AGOTADO', () => {
  assert.equal(calcularDisponibilidad(-3).disponible, false);
  assert.equal(calcularDisponibilidad(-3).estado, 'Agotado');
});

test('HU-014: calcularDisponibilidad acepta el stock escrito como número en texto ("4")', () => {
  assert.equal(calcularDisponibilidad('4').disponible, true);
  assert.equal(calcularDisponibilidad('4').disponibilidad, 'DISPONIBLE');
});

// ===================== HU-014: conDisponibilidad =====================

test('HU-014: conDisponibilidad elimina el campo stock del objeto devuelto', () => {
  const fila = { id: 7, sku: 'PROD-0007', nombre: 'Anillo', precio: 120000, stock: 9 };
  const salida = conDisponibilidad(fila);
  assert.equal('stock' in salida, false);
  assert.equal(Object.keys(salida).includes('stock'), false);
});

test('HU-014: conDisponibilidad conserva los demás campos del producto', () => {
  const fila = { id: 7, sku: 'PROD-0007', nombre: 'Anillo', precio: 120000, stock: 9 };
  const salida = conDisponibilidad(fila);
  assert.equal(salida.id, 7);
  assert.equal(salida.sku, 'PROD-0007');
  assert.equal(salida.nombre, 'Anillo');
  assert.equal(salida.precio, 120000);
});

test('HU-014: conDisponibilidad agrega disponible, disponibilidad y estado según el stock', () => {
  const conUnidades = conDisponibilidad({ id: 1, nombre: 'Pulsera', stock: 3 });
  assert.deepEqual(conUnidades, { id: 1, nombre: 'Pulsera', disponible: true, disponibilidad: 'DISPONIBLE', estado: 'Disponible' });

  const sinUnidades = conDisponibilidad({ id: 2, nombre: 'Dije', stock: 0 });
  assert.deepEqual(sinUnidades, { id: 2, nombre: 'Dije', disponible: false, disponibilidad: 'AGOTADO', estado: 'Agotado' });
});

test('HU-014: conDisponibilidad no modifica el objeto original (función pura)', () => {
  const fila = { id: 3, nombre: 'Cadena', stock: 5 };
  conDisponibilidad(fila);
  assert.deepEqual(fila, { id: 3, nombre: 'Cadena', stock: 5 });
});

test('HU-014: conDisponibilidad con una fila sin stock la trata como agotada', () => {
  const salida = conDisponibilidad({ id: 4, nombre: 'Tobillera' });
  assert.equal(salida.disponible, false);
  assert.equal(salida.estado, 'Agotado');
  assert.equal('stock' in salida, false);
});

// ===================== HU-011: formato de precios de la página web =====================

test('HU-011: formatoPrecio (página web) muestra el precio en pesos sin decimales', () => {
  assert.equal(normal(formatoWeb.formatoPrecio(325000)), '$ 325.000');
});

test('HU-011: formatoPrecio (página web) con cero muestra $ 0', () => {
  assert.equal(normal(formatoWeb.formatoPrecio(0)), '$ 0');
});

test('HU-011: formatoPrecio (página web) redondea y no deja decimales', () => {
  assert.equal(normal(formatoWeb.formatoPrecio(1234.56)), '$ 1.235');
});

test('HU-011: formatoPrecio (página web) acepta el precio escrito como texto', () => {
  assert.equal(normal(formatoWeb.formatoPrecio('325000')), '$ 325.000');
});

test('HU-011: formatoPrecio (página web) con un valor no numérico devuelve un guion', () => {
  assert.equal(formatoWeb.formatoPrecio('abc'), '-');
  assert.equal(formatoWeb.formatoPrecio(undefined), '-');
});

// ===================== Formato de la app de inventario =====================

test('Formato (app): formatoPrecio muestra el precio en pesos sin decimales', () => {
  assert.equal(normal(formatoApp.formatoPrecio(325000)), '$ 325.000');
  assert.equal(normal(formatoApp.formatoPrecio(0)), '$ 0');
});

test('Formato (app): formatoPrecio con un valor no numérico devuelve una raya', () => {
  assert.equal(formatoApp.formatoPrecio('abc'), '—');
  assert.equal(formatoApp.formatoPrecio(undefined), '—');
  assert.equal(normal(formatoApp.formatoPrecio(null)), '$ 0');
});

test('Formato (app): estadoStock usa el mismo nivel mínimo que el backend', () => {
  assert.equal(formatoApp.STOCK_MINIMO, STOCK_MINIMO);
});

test('Formato (app): estadoStock con stock en cero devuelve Agotado', () => {
  assert.equal(formatoApp.estadoStock(0).texto, 'Agotado');
  assert.equal(formatoApp.estadoStock(null).texto, 'Agotado');
  assert.equal(formatoApp.estadoStock('abc').texto, 'Agotado');
});

test('Formato (app): estadoStock en el valor frontera de una unidad devuelve Stock bajo', () => {
  assert.equal(formatoApp.estadoStock(1).texto, 'Stock bajo');
});

test('Formato (app): estadoStock en el nivel mínimo devuelve Stock bajo y una unidad más Disponible', () => {
  assert.equal(formatoApp.estadoStock(STOCK_MINIMO).texto, 'Stock bajo');
  assert.equal(formatoApp.estadoStock(STOCK_MINIMO + 1).texto, 'Disponible');
});

test('Formato (app): estadoStock devuelve también la clase de color del estado', () => {
  assert.equal(formatoApp.estadoStock(0).clase, 'estado estado-agotado');
  assert.equal(formatoApp.estadoStock(1).clase, 'estado estado-bajo');
  assert.equal(formatoApp.estadoStock(50).clase, 'estado estado-disponible');
});

test('Formato (app): iniciales toma la primera letra de los dos primeros nombres', () => {
  assert.equal(formatoApp.iniciales('Leidys Duran Rojas'), 'LD');
  assert.equal(formatoApp.iniciales('daniel nova'), 'DN');
  assert.equal(formatoApp.iniciales('Administrador'), 'A');
});

test('Formato (app): iniciales con un texto vacío o solo espacios devuelve una cadena vacía', () => {
  assert.equal(formatoApp.iniciales(''), '');
  assert.equal(formatoApp.iniciales('   '), '');
  assert.equal(formatoApp.iniciales(), '');
});
