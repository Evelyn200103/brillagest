// Encabezado de cada pantalla: dibujo, título, ruta y botones a la derecha
function CabeceraPagina({ titulo, Icono, children }) {
  return (
    <div className="pagina-cabecera">
      <div className="pagina-titulo-grupo">
        {Icono && (
          <span className="pagina-icono" aria-hidden="true">
            <Icono tamano={24} />
          </span>
        )}
        <div>
          <h1 className="pagina-titulo">{titulo}</h1>
          <p className="migas">BrillaGest / {titulo}</p>
        </div>
      </div>
      {children && <div className="pagina-acciones">{children}</div>}
    </div>
  );
}

export default CabeceraPagina;
