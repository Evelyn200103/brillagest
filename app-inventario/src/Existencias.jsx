import { apiFetch } from './api';
import { useEffect, useState } from 'react';
import IconoCategoria from './IconoCategoria';

const API_URL = import.meta.env.VITE_API_URL;

// El backend responde DISPONIBLE, STOCK_BAJO o SIN_STOCK.
// En pantalla se muestra igual que en el resto del sistema: Disponible, Stock bajo, Agotado.
const ESTADOS = {
  DISPONIBLE: { texto: 'Disponible', clase: 'estado estado-disponible' },
  STOCK_BAJO: { texto: 'Stock bajo', clase: 'estado estado-bajo' },
  SIN_STOCK: { texto: 'Agotado', clase: 'estado estado-agotado' },
  AGOTADO: { texto: 'Agotado', clase: 'estado estado-agotado' }
};

function Existencias({ categorias, version }) {
  const [items, setItems] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [categoria, setCategoria] = useState('');

  const cargar = (q = busqueda, cat = categoria) => {
    setCargando(true);
    setError('');

    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (cat) params.set('categoria', cat);

    apiFetch(`${API_URL}/api/existencias?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error(data.error || 'Respuesta inesperada del servidor');
        }
        setItems(data);
      })
      .catch((err) => setError(err.message || 'No se pudieron cargar las existencias'))
      .finally(() => setCargando(false));
  };

  // Se recarga al abrir la pantalla y cada vez que cambia "version"
  // (App.jsx la incrementa después de una entrada o una salida).
  useEffect(() => {
    cargar();
  }, [version]);

  const consultar = (e) => {
    e.preventDefault();
    cargar();
  };

  return (
    <section className="bloque">
      <form className="filtros" onSubmit={consultar} style={{ marginBottom: '1rem' }}>
        <input
          type="search"
          placeholder="Buscar por nombre o SKU"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar"
        />
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-dorado">Consultar</button>
      </form>

      {error && <p className="mensaje mensaje-error">{error}</p>}

      {cargando ? (
        <p className="mensaje">Cargando existencias…</p>
      ) : items.length === 0 && !error ? (
        <p className="mensaje">No hay productos registrados que coincidan con la consulta.</p>
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Nombre</th>
                <th>Categoría</th>
                <th>Material / Marca</th>
                <th>Existencias</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => {
                const estado = ESTADOS[p.estado] || ESTADOS.DISPONIBLE;
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
                    <td>
                      <span className="pastilla">
                        {p.material || `${p.marca || '—'} (${p.tipo || '—'})`}
                      </span>
                    </td>
                    <td className="celda-numero">{p.stock}</td>
                    <td><span className={estado.clase}>{estado.texto}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default Existencias;
