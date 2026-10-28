import { apiFetch } from './api';
import { useEffect, useState } from 'react';
import { IconoAlertas } from './Iconos';
import IconoCategoria from './IconoCategoria';

const API_URL = import.meta.env.VITE_API_URL;

function AlertasStock({ productos }) {
  const [datos, setDatos] = useState({ stock_minimo: 0, alertas: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch(`${API_URL}/api/alertas/stock-bajo`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setDatos(data);
        setError('');
      })
      .catch(() => setError('No se pudieron cargar las alertas de stock.'));
  }, [productos]);

  if (error) return <p className="mensaje mensaje-error">{error}</p>;

  if (datos.alertas.length === 0) {
    return (
      <p className="mensaje mensaje-exito">
        Sin alertas: todos los productos están por encima del mínimo ({datos.stock_minimo} unidades).
      </p>
    );
  }

  return (
    <section className="bloque">
      <div className="panel alerta-resumen">
        <span className="icono-redondo icono-alerta"><IconoAlertas /></span>
        <div>
          <p className="panel-titulo" style={{ margin: 0 }}>
            {datos.alertas.length} {datos.alertas.length === 1 ? 'producto necesita' : 'productos necesitan'} reposición
          </p>
          <p className="texto-suave" style={{ margin: 0 }}>
            Nivel mínimo: {datos.stock_minimo} unidades
          </p>
        </div>
      </div>

      <div className="grid-alertas">
        {datos.alertas.map((a) => (
          <div key={a.id} className={a.estado === 'AGOTADO' ? 'tarjeta-alerta agotado' : 'tarjeta-alerta'}>
            <div className="tarjeta-alerta-fila">
              <span className="celda-codigo">{a.sku}</span>
              <span className={a.estado === 'AGOTADO' ? 'estado estado-agotado' : 'estado estado-bajo'}>
                {a.estado === 'AGOTADO' ? 'Agotado' : 'Stock bajo'}
              </span>
            </div>
            <div className="tarjeta-alerta-cuerpo">
              <span className="miniatura miniatura-grande" aria-hidden="true">
                <IconoCategoria categoria={a.categoria} />
              </span>
              <p className="tarjeta-alerta-nombre">{a.nombre}</p>
            </div>
            <p className="tarjeta-alerta-stock">
              <strong>{a.stock}</strong> en stock
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default AlertasStock;
