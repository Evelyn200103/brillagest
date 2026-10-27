import { useEffect, useState } from 'react';

import { apiFetch } from '../sesion';

const API_URL = import.meta.env.VITE_API_URL;

const ESTADOS = {
  STOCK_BAJO: { texto: 'Stock bajo', color: '#b26a00' },
  AGOTADO: { texto: 'Agotado', color: '#b00020' }
};

const formatoMoneda = (valor) =>
  Number(valor || 0).toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  });

function Tarjeta({ titulo, valor }) {
  return (
    <div
      style={{
        flex: '1 1 150px',
        border: '1px solid #888',
        borderRadius: '6px',
        padding: '10px',
        textAlign: 'center'
      }}
    >
      <div style={{ fontSize: '0.85rem' }}>{titulo}</div>
      <div style={{ fontSize: '1.3rem', fontWeight: 'bold' }}>{valor}</div>
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

  return (
    <div style={{ marginTop: '30px' }}>
      <h2>Reportes de inventario</h2>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <select value={dias} onChange={(e) => setDias(Number(e.target.value))}>
          <option value={7}>Movimientos de los últimos 7 días</option>
          <option value={30}>Movimientos de los últimos 30 días</option>
          <option value={90}>Movimientos de los últimos 90 días</option>
        </select>
        <button type="button" onClick={() => cargar(dias)}>
          Actualizar reporte
        </button>
      </div>

      {error && <p style={{ color: '#b00020' }}>{error}</p>}
      {cargando && <p>Generando reporte...</p>}

      {!cargando && datos && !datos.hay_informacion && (
        <p>
          No hay información suficiente para generar los reportes: todavía no hay
          productos registrados en el inventario.
        </p>
      )}

      {!cargando && datos && datos.hay_informacion && (
        <>
          <p style={{ fontSize: '0.85rem' }}>
            Generado el {new Date(datos.generado_en).toLocaleString('es-CO')}
          </p>

          <h3>Resumen general</h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <Tarjeta titulo="Productos registrados" valor={datos.resumen.total_productos} />
            <Tarjeta titulo="Unidades en existencia" valor={datos.resumen.total_unidades} />
            <Tarjeta titulo="Valor del inventario" valor={formatoMoneda(datos.resumen.valor_inventario)} />
            <Tarjeta titulo="Con stock bajo" valor={datos.resumen.stock_bajo} />
            <Tarjeta titulo="Agotados" valor={datos.resumen.agotados} />
          </div>
          <p style={{ fontSize: '0.8rem' }}>
            El valor del inventario es el precio de cada producto por sus existencias.
            Se considera stock bajo cuando hay {datos.stock_minimo} unidades o menos.
          </p>

          <h3>Inventario por categoría</h3>
          <table>
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
                  <td>{c.categoria}</td>
                  <td>{c.productos}</td>
                  <td>{c.unidades}</td>
                  <td>{formatoMoneda(c.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3>Movimientos de los últimos {datos.movimientos.dias} días</h3>
          {datos.movimientos.total === 0 ? (
            <p>No hay movimientos registrados en este periodo.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Movimientos</th>
                  <th>Unidades</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Entradas</td>
                  <td>{datos.movimientos.entradas.movimientos}</td>
                  <td>{datos.movimientos.entradas.unidades}</td>
                </tr>
                <tr>
                  <td>Salidas</td>
                  <td>{datos.movimientos.salidas.movimientos}</td>
                  <td>{datos.movimientos.salidas.unidades}</td>
                </tr>
              </tbody>
            </table>
          )}

          <h3>Productos por reponer</h3>
          {datos.productos_a_reponer.length === 0 ? (
            <p>Ningún producto está en el nivel mínimo o por debajo.</p>
          ) : (
            <table>
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
                      <td>{p.sku}</td>
                      <td>{p.nombre}</td>
                      <td>{p.categoria}</td>
                      <td>{p.stock}</td>
                      <td style={{ color: estado.color, fontWeight: 'bold' }}>{estado.texto}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

export default Reportes;