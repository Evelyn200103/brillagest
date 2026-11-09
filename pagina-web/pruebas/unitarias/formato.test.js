// Pruebas unitarias del formato de precios de la página web (HU-013).
// Se ejecutan con: npm run test:unit (dentro de pagina-web)
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { formatoPrecio } from '../../src/formato.js';

// El formato de pesos pone un espacio "especial" entre el $ y el número.
const limpiar = (texto) => texto.replace(/\s/g, ' ');

describe('HU-013 — Consultar detalle del producto (página web)', () => {
  test('HU013-CP13: formatoPrecio muestra pesos colombianos y "-" si no es número', () => {
    assert.equal(limpiar(formatoPrecio(500000)), '$ 500.000');
    assert.equal(formatoPrecio('abc'), '-');
  });
});