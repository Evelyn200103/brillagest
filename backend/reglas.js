// Reglas de negocio del inventario escritas como funciones puras
// (no usan la base de datos), para poder probarlas con pruebas unitarias.
// Las usa la ruta de productos en rutas/inventario.js.

// HU-001 y HU-003: valida los datos de un producto.
// Devuelve el mensaje de error, o null si todo está bien.
function validarProducto({ nombre, categoria, material, precio } = {}) {
  if (!nombre || !categoria || !precio) return 'Faltan campos obligatorios';
  if (categoria !== 'Relojes' && !material) return 'El material es obligatorio para esta categoría';
  // DEF-001: el precio debe ser un número y mayor que cero
  const valorPrecio = Number(precio);
  if (!Number.isFinite(valorPrecio) || valorPrecio <= 0) return 'El precio debe ser un número mayor que cero';
  return null;
}

// HU-001: arma el siguiente SKU a partir del número más alto que ya existe.
function siguienteSku(maximoActual) {
  const siguiente = (Number(maximoActual) || 0) + 1;
  return `PROD-${String(siguiente).padStart(4, '0')}`;
}

// HU-004: un producto que tiene movimientos no se puede eliminar,
// para no perder el historial del inventario (trazabilidad).
// Devuelve el mensaje de error, o null si sí se puede eliminar.
function puedeEliminarProducto(cantidadMovimientos) {
  if (Number(cantidadMovimientos) > 0) {
    return 'No se puede eliminar el producto porque tiene movimientos de inventario registrados. Puede ocultarlo de la página web.';
  }
  return null;
}

// HU-007: estado de las existencias según las unidades y el nivel mínimo.
// 0 o menos: SIN_STOCK · hasta el mínimo: STOCK_BAJO · más del mínimo: DISPONIBLE
function estadoExistencia(stock, stockMinimo) {
  const unidades = Number(stock) || 0;
  if (unidades <= 0) return 'SIN_STOCK';
  if (unidades <= stockMinimo) return 'STOCK_BAJO';
  return 'DISPONIBLE';
}

// HU-010: periodo del reporte en días (de 1 a 365). Si no se escoge, 30.
// Devuelve el número de días, o null si el valor no es válido.
function periodoReporte(valor) {
  if (valor === undefined) return 30;
  const dias = Number(valor);
  if (Number.isInteger(dias) && dias >= 1 && dias <= 365) return dias;
  return null;
}

module.exports = { validarProducto, siguienteSku, puedeEliminarProducto, estadoExistencia, periodoReporte };