import { apiFetch } from './api';
import { useEffect, useState } from 'react';
import { formatoPrecio } from './formato';
import IconoCategoria from './IconoCategoria';
import { IconoInventario, IconoAlertas, IconoValor, IconoJoya, IconoEliminar } from './Iconos';

const API_URL = import.meta.env.VITE_API_URL;

const ESTADOS = {
  STOCK_BAJO: { texto: 'Stock bajo', clase: 'estado estado-bajo' },
  AGOTADO: { texto: 'Agotado', clase: 'estado estado-agotado' }
};

function Kpi({ titulo, valor, tono, Icono }) {
  return (
    <div className="kpi">
      {Icono && (
        <span className={tono ? `kpi-icono ${tono}` : 'kpi-icono'} aria-hidden="true">
          <Icono tamano={20} />
        </span>
      )}
      <p className="kpi-titulo">{titulo}</p>
      <p className={tono ? `kpi-valor ${tono}` : 'kpi-valor'}>{valor}</p>
    </div>
  );
}

function Reportes({ version }) {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [dias, setDias] = useState(30);

  const cargar = async (periodo) => {
    setCargando(true);
    setError('');
    try {
      const res = await apiFetch(`${API_URL}/api/reportes/inventario?dias=${periodo}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo generar el reporte');
      setDatos(data);
    } catch (err) {
      setError(err.message);
      setDatos(null);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar(dias);
  }, [version, dias]);

  const maxUnidades = datos?.por_categoria?.length
    ? Math.max(...datos.por_categoria.map((c) => Number(c.unidades) || 0), 1)
    : 1;

  return (
    <section className="bloque">
      <div className="filtros" style={{ marginBottom: '1.2rem' }}>
        <select value={dias} onChange={(e) => setDias(Number(e.target.value))} aria-label="Periodo">
          <option value={7}>Movimientos de los últimos 7 días</option>
          <option value={30}>Movimientos de los últimos 30 días</option>
          <option value={90}>Movimientos de los últimos 90 días</option>
        </select>
        <button type="button" className="btn btn-borde" onClick={() => cargar(dias)}>
          Actualizar reporte
        </button>
      </div>

      {error && <p className="mensaje mensaje-error">{error}</p>}
      {cargando && <p className="mensaje">Generando reporte…</p>}

      {!cargando && datos && !datos.hay_informacion && (
        <p className="mensaje">
          No hay información suficiente para generar los reportes: todavía no hay
          productos registrados en el inventario.
        </p>
      )}

      {!cargando && datos && datos.hay_informacion && (
        <>
          <div className="kpis kpis-5">
            <Kpi titulo="Productos registrados" valor={datos.resumen.total_productos} Icono={IconoJoya} />
            <Kpi titulo="Unidades en existencia" valor={datos.resumen.total_unidades} tono="verde" Icono={IconoInventario} />
            <Kpi titulo="Valor del inventario" valor={formatoPrecio(datos.resumen.valor_inventario)} Icono={IconoValor} />
            <Kpi titulo="Con stock bajo" valor={datos.resumen.stock_bajo} tono="dorado" Icono={IconoAlertas} />
            <Kpi titulo="Agotados" valor={datos.resumen.agotados} tono="rojo" Icono={IconoEliminar} />
          </div>
          <p className="nota">
            Generado el {new Date(datos.generado_en).toLocaleString('es-CO')}. El valor del inventario es el
            precio de cada producto por sus existencias. Se considera stock bajo cuando hay{' '}
            {datos.stock_minimo} unidades o menos.
          </p>

          <div className="dos-columnas">
            <div className="bloque">
              <h2 className="panel-titulo">Inventario por categoría</h2>
              <div className="tabla-contenedor">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>Categoría</th>
                      <th>Productos</th>
                      <th>Unidades</th>
                      <th>Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.por_categoria.map((c) => (
                      <tr key={c.categoria}>
                        <td>
                          <div className="celda-con-dibujo">
                            <span className="miniatura" aria-hidden="true">
                              <IconoCategoria categoria={c.categoria} />
                            </span>
                            {c.categoria}
                          </div>
                        </td>
                        <td className="celda-numero">{c.productos}</td>
                        <td>
                          <div className="barra">
                            <span
                              className="barra-relleno"
                              style={{ width: `${((Number(c.unidades) || 0) / maxUnidades) * 100}%` }}
                            />
                            <span className="celda-numero">{c.unidades}</span>
                          </div>
                        </td>
                        <td className="celda-numero">{formatoPrecio(c.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bloque">
              <h2 className="panel-titulo">Movimientos de los últimos {datos.movimientos.dias} días</h2>
              {datos.movimientos.total === 0 ? (
                <p className="mensaje">No hay movimientos registrados en este periodo.</p>
              ) : (
                <div className="kpis kpis-2">
                  <div className="kpi">
                    <p className="kpi-titulo">Entradas</p>
                    <p className="kpi-valor verde">+{datos.movimientos.entradas.unidades}</p>
                    <p className="kpi-nota">
                      {datos.movimientos.entradas.movimientos}{' '}
                      {datos.movimientos.entradas.movimientos === 1 ? 'movimiento' : 'movimientos'}
                    </p>
                  </div>
                  <div className="kpi">
                    <p className="kpi-titulo">Salidas</p>
                    <p className="kpi-valor rojo">−{datos.movimientos.salidas.unidades}</p>
                    <p className="kpi-nota">
                      {datos.movimientos.salidas.movimientos}{' '}
                      {datos.movimientos.salidas.movimientos === 1 ? 'movimiento' : 'movimientos'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bloque">
            <h2 className="panel-titulo">Productos por reponer</h2>
            {datos.productos_a_reponer.length === 0 ? (
              <p className="mensaje mensaje-exito">Ningún producto está en el nivel mínimo o por debajo.</p>
            ) : (
              <div className="tabla-contenedor">
                <table className="tabla">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Nombre</th>
                      <th>Categoría</th>
                      <th>Existencias</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.productos_a_reponer.map((p) => {
                      const estado = ESTADOS[p.estado] || ESTADOS.STOCK_BAJO;
                      return (
                        <tr key={p.id}>
                          <td className="celda-codigo">{p.sku}</td>
                          <td>
                            <div className="celda-con-dibujo">
                              <span className="miniatura" aria-hidden="true">
                                <IconoCategoria categoria={p.categoria} />
                              </span>
                              <span className="celda-producto">{p.nombre}</span>
                            </div>
                          </td>
                          <td>{p.categoria}</td>
                          <td className="celda-numero">{p.stock}</td>
                          <td><span className={estado.clase}>{estado.texto}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default Reportes;
