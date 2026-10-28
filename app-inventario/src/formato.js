// Formato de precios en pesos colombianos: $ 325.000
export function formatoPrecio(valor) {
  const numero = Number(valor);
  if (isNaN(numero)) return '—';
  return numero.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  });
}

// Mismo nivel mínimo que backend/config.js (STOCK_MINIMO)
export const STOCK_MINIMO = 5;

// Estado según las unidades: Disponible, Stock bajo o Agotado
export function estadoStock(stock) {
  const unidades = Number(stock) || 0;
  if (unidades <= 0) return { texto: 'Agotado', clase: 'estado estado-agotado' };
  if (unidades <= STOCK_MINIMO) return { texto: 'Stock bajo', clase: 'estado estado-bajo' };
  return { texto: 'Disponible', clase: 'estado estado-disponible' };
}

export function iniciales(nombre = '') {
  return nombre
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}
