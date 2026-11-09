// Pruebas unitarias de las funciones de formato del sistema de inventario (HU-002).
// Se ejecutan con: npm run test:unit (dentro de app-inventario)
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { formatoPrecio, estadoStock } from '../../src/formato.js';

// El formato de pesos pone un espacio "especial" entre el $ y el número.
// Esta función lo cambia por un espacio normal para poder compararlo.
const limpiar = (texto) => texto.replace(/\s/g, ' ');

describe('HU-002 — Consultar productos', () => {
  test('HU002-CP12: formatoPrecio muestra el precio en pesos colombianos', () => {
    assert.equal(limpiar(formatoPrecio(500000)), '$ 500.000');
  });

  test('HU002-CP13: formatoPrecio devuelve "—" si el valor no es un número', () => {
    assert.equal(formatoPrecio('abc'), '—');
  });

  test('HU002-CP14: estadoStock con 0 unidades devuelve Agotado', () => {
    assert.equal(estadoStock(0).texto, 'Agotado');
  });

  test('HU002-CP15: estadoStock con 3, 5 y 10 unidades', () => {
    assert.equal(estadoStock(3).texto, 'Stock bajo');
    assert.equal(estadoStock(5).texto, 'Stock bajo');
    assert.equal(estadoStock(10).texto, 'Disponible');
  });
});