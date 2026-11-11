// Pruebas unitarias de las reglas de productos (HU-001).
// Se ejecutan con: npm run test:unit
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { validarProducto, siguienteSku, puedeEliminarProducto, estadoExistencia, periodoReporte } = require('../../reglas');

describe('HU-001 — Registrar producto', () => {
  test('HU001-CP03: anillo sin material devuelve el error del material', () => {
    const resultado = validarProducto({ nombre: 'Anillo', categoria: 'Anillos', precio: 500000 });
    assert.equal(resultado, 'El material es obligatorio para esta categoría');
  });

  test('HU001-CP13: producto con datos completos no devuelve error', () => {
    const resultado = validarProducto({ nombre: 'Anillo', categoria: 'Anillos', material: 'Oro 18k', precio: 500000 });
    assert.equal(resultado, null);
  });

  test('HU001-CP14: producto sin nombre devuelve "Faltan campos obligatorios"', () => {
    const resultado = validarProducto({ categoria: 'Anillos', material: 'Oro 18k', precio: 500000 });
    assert.equal(resultado, 'Faltan campos obligatorios');
  });

  test('HU001-CP15: reloj sin material no devuelve error', () => {
    const resultado = validarProducto({ nombre: 'Reloj', categoria: 'Relojes', precio: 250000 });
    assert.equal(resultado, null);
  });

  test('HU001-CP16: siguienteSku arma el código con 4 cifras', () => {
    assert.equal(siguienteSku(0), 'PROD-0001');
    assert.equal(siguienteSku(41), 'PROD-0042');
  });

  test('HU001-CP17: precio negativo devuelve error (corrección del DEF-001)', () => {
    const resultado = validarProducto({ nombre: 'Anillo', categoria: 'Anillos', material: 'Oro 18k', precio: -5000 });
    assert.equal(resultado, 'El precio debe ser un número mayor que cero');
  });

  test('HU001-CP18: precio que no es número devuelve error (corrección del DEF-001)', () => {
    const resultado = validarProducto({ nombre: 'Anillo', categoria: 'Anillos', material: 'Oro 18k', precio: 'abc' });
    assert.equal(resultado, 'El precio debe ser un número mayor que cero');
  });

});


describe('HU-003 — Actualizar producto', () => {
  test('HU003-CP12: datos editados con números como texto no devuelven error', () => {
    const resultado = validarProducto({ nombre: 'Anillo editado', categoria: 'Anillos', material: 'Oro 18k', precio: '550000' });
    assert.equal(resultado, null);
  });

  test('HU003-CP13: cambiar un reloj a anillo sin material devuelve el error del material', () => {
    const resultado = validarProducto({ nombre: 'Pieza', categoria: 'Anillos', precio: 300000 });
    assert.equal(resultado, 'El material es obligatorio para esta categoría');
  });

  test('HU003-CP14: precio en cero no se acepta (valor frontera)', () => {
    const resultado = validarProducto({ nombre: 'Anillo', categoria: 'Anillos', material: 'Oro 18k', precio: 0 });
    assert.notEqual(resultado, null);
  });
});


describe('HU-004 — Eliminar producto', () => {
  test('HU004-CP10: producto sin movimientos se puede eliminar', () => {
    assert.equal(puedeEliminarProducto(0), null);
  });

  test('HU004-CP11: producto con movimientos no se puede eliminar', () => {
    assert.equal(
      puedeEliminarProducto(3),
      'No se puede eliminar el producto porque tiene movimientos de inventario registrados. Puede ocultarlo de la página web.'
    );
  });
});


describe('HU-007 — Consultar existencias', () => {
  test('HU007-CP12: producto sin unidades devuelve SIN_STOCK', () => {
    assert.equal(estadoExistencia(0, 5), 'SIN_STOCK');
  });

  test('HU007-CP13: pocas unidades devuelven STOCK_BAJO (5 es el límite)', () => {
    assert.equal(estadoExistencia(3, 5), 'STOCK_BAJO');
    assert.equal(estadoExistencia(5, 5), 'STOCK_BAJO');
  });

  test('HU007-CP14: más del límite devuelve DISPONIBLE (6 es el primer valor)', () => {
    assert.equal(estadoExistencia(6, 5), 'DISPONIBLE');
    assert.equal(estadoExistencia(20, 5), 'DISPONIBLE');
  });
});


describe('HU-010 — Generar reportes básicos de inventario', () => {
  test('HU010-CP11: sin periodo, el reporte usa 30 días', () => {
    assert.equal(periodoReporte(undefined), 30);
  });

  test('HU010-CP12: periodos válidos (incluye los valores frontera 1 y 365)', () => {
    assert.equal(periodoReporte('7'), 7);
    assert.equal(periodoReporte(1), 1);
    assert.equal(periodoReporte(365), 365);
  });

  test('HU010-CP13: periodos inválidos devuelven null', () => {
    assert.equal(periodoReporte(0), null);
    assert.equal(periodoReporte(366), null);
    assert.equal(periodoReporte('abc'), null);
    assert.equal(periodoReporte(2.5), null);
  });
});