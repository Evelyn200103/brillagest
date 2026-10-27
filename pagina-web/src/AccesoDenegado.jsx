// Se muestra cuando alguien intenta entrar a una pantalla que su rol no permite.
function AccesoDenegado() {
  return (
    <div style={{ padding: '1rem 0' }}>
      <h2>Acceso denegado</h2>
      <p>Su rol no tiene permiso para ver esta sección.</p>
    </div>
  );
}

export default AccesoDenegado;
