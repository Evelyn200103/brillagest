// Cinta superior con mensajes que se deslizan solos (como en Pandora y Kevin's).
const MENSAJES = [
  'Abierto de lunes a viernes · 9:30 a.m. a 6:00 p.m.',
  'Paga en efectivo, tarjeta, Nequi o Daviplata',
  'Productos con garantía',
  'Diseños personalizados y joyas por encargo',
  'Arreglos, grabados, limpieza y cambio de pila de relojes',
  'Compramos oro y plata'
];

function CintaAnuncios() {
  // Los mensajes se ponen dos veces seguidas para que el movimiento no tenga cortes
  const lista = [...MENSAJES, ...MENSAJES];

  return (
    <div className="cinta">
      <div className="cinta-pista">
        {lista.map((mensaje, i) => (
          <span key={i} className="cinta-item" aria-hidden={i >= MENSAJES.length}>
            <span className="cinta-diamante">◆</span>
            {mensaje}
          </span>
        ))}
      </div>
    </div>
  );
}

export default CintaAnuncios;