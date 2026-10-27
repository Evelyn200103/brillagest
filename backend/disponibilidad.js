// HU-016

function calcularDisponibilidad(stock) {
  const unidades = Number(stock) || 0;
  const disponible = unidades > 0;
  return {
    disponible,                                           
    disponibilidad: disponible ? 'DISPONIBLE' : 'AGOTADO', 
    estado: disponible ? 'Disponible' : 'Agotado',    
  };
}

// Recibe una fila de la base de datos, le quita el stock (el cliente no ve
// cuántas unidades hay) y le agrega los campos de disponibilidad.
function conDisponibilidad(fila) {
  const { stock, ...resto } = fila;
  return { ...resto, ...calcularDisponibilidad(stock) };
}

module.exports = { calcularDisponibilidad, conDisponibilidad };