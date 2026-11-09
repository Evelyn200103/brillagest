// Pruebas unitarias de la disponibilidad que ve el cliente (HU-013 y HU-016).
// Se ejecutan con: npm run test:unit
const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { calcularDisponibilidad, conDisponibilidad } = require('../../disponibilidad');

describe('HU-013 — Consultar detalle del producto', () => {
  test('HU013-CP11: producto con unidades: no muestra el stock y dice Disponible', () => {
    const resultado = conDisponibilidad({ id: 1, nombre: 'Anillo', stock: 3 });
    assert.equal('stock' in resultado, false);
    assert.equal(resultado.nombre, 'Anillo');
    assert.equal(resultado.disponibilidad, 'DISPONIBLE');
    assert.equal(resultado.estado, 'Disponible');
  });

  test('HU013-CP12: producto sin unidades: no muestra el stock y dice Agotado', () => {
    const resultado = conDisponibilidad({ id: 2, nombre: 'Reloj', stock: 0 });
    assert.equal('stock' in resultado, false);
    assert.equal(resultado.disponibilidad, 'AGOTADO');
    assert.equal(resultado.estado, 'Agotado');
  });
});


describe('HU-016 — Actualizar disponibilidad en el catálogo', () => {
  test('HU016-CP09: con unidades devuelve Disponible', () => {
    assert.deepEqual(calcularDisponibilidad(3), {
      disponible: true,
      disponibilidad: 'DISPONIBLE',
      estado: 'Disponible'
    });
  });

  test('HU016-CP10: sin unidades devuelve Agotado', () => {
    assert.deepEqual(calcularDisponibilidad(0), {
      disponible: false,
      disponibilidad: 'AGOTADO',
      estado: 'Agotado'
    });
  });

  test('HU016-CP11: valores frontera (1 está disponible, -2 está agotado)', () => {
    assert.equal(calcularDisponibilidad(1).disponibilidad, 'DISPONIBLE');
    assert.equal(calcularDisponibilidad(-2).disponibilidad, 'AGOTADO');
  });

  test('HU016-CP12: stock sin dato no genera error y devuelve Agotado', () => {
    assert.equal(calcularDisponibilidad(null).disponibilidad, 'AGOTADO');
    assert.equal(calcularDisponibilidad(undefined).disponibilidad, 'AGOTADO');
  });
});