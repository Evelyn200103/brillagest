// Formato único de precios para toda la página web (pesos colombianos).
export function formatoPrecio(valor) {
  const numero = Number(valor);
  if (isNaN(numero)) return '-';
  return numero.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
}