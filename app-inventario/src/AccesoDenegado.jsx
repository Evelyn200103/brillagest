// Se muestra cuando alguien intenta entrar a una pantalla que su rol no permite (HU-024).
function AccesoDenegado() {
  return (
    <div className="panel" style={{ maxWidth: 480 }}>
      <h2>Acceso denegado</h2>
      <p className="texto-suave">Su rol no tiene permiso para ver esta sección.</p>
    </div>
  );
}

export default AccesoDenegado;
