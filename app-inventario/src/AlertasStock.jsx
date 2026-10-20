import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

function AlertasStock({ productos }) {
  const [datos, setDatos] = useState({ stock_minimo: 0, alertas: [] });
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/alertas/stock-bajo`)
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

  if (error) return <p style={{ color: 'crimson' }}>{error}</p>;

  if (datos.alertas.length === 0) {
    return (
      <p style={{ color: 'green' }}>
        Sin alertas: todos los productos están por encima del mínimo ({datos.stock_minimo}).
      </p>
    );
  }

  return (
    <div style={{ border: '2px solid darkorange', borderRadius: '6px', padding: '0.8rem', marginBottom: '1.5rem' }}>
      <h2 style={{ marginTop: 0 }}>Alertas de stock bajo ({datos.alertas.length})</h2>
      <p style={{ marginTop: 0 }}>Nivel mínimo: {datos.stock_minimo} unidades</p>
      <ul style={{ margin: 0 }}>
        {datos.alertas.map((a) => (
          <li key={a.id}>
            <strong>{a.sku}</strong> — {a.nombre}: {a.stock} en stock{' '}
            <span style={{ color: a.estado === 'AGOTADO' ? 'crimson' : 'darkorange' }}>
              [{a.estado === 'AGOTADO' ? 'Agotado' : 'Stock bajo'}]
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AlertasStock;