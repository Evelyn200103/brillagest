import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL;

const CATEGORIAS = [
  'Anillos', 'Pulseras', 'Cadenas', 'Topos', 'Dijes',
  'Aretes largos', 'Candongas', 'Candongas con piedrería',
  'Argollas', 'Tobilleras', 'Relojes'
];

const MATERIALES = ['Oro 18k', 'Oro 10k', 'Plata 925'];

function App() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');

  const [form, setForm] = useState({
    nombre: '',
    categoria: 'Anillos',
    material: 'Oro 18k',
    peso: '',
    precio: '',
    stock: '',
    marca: '',
    tipo: 'Original'
  });

  const esReloj = form.categoria === 'Relojes';

  const cargarProductos = () => {
    setCargando(true);
    fetch(`${API_URL}/api/productos`)
      .then((res) => res.json())
      .then((data) => setProductos(data))
      .catch(() => setMensaje('No se pudo cargar la lista de productos'))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');

    const payload = {
      ...form,
      material: esReloj ? '' : form.material,
      marca: esReloj ? form.marca : '',
      tipo: esReloj ? form.tipo : ''
    };

    try {
      const res = await fetch(`${API_URL}/api/productos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar el producto');
      }

      setForm({
        nombre: '', categoria: 'Anillos', material: 'Oro 18k',
        peso: '', precio: '', stock: '', marca: '', tipo: 'Original'
      });
      setMensaje('Producto registrado con éxito.');
      cargarProductos();
    } catch (err) {
      setMensaje(err.message);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '700px', margin: '0 auto' }}>
      <h1>BrillaGest — Inventario</h1>

      <h2>Registrar producto</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.6rem', marginBottom: '1.5rem' }}>
        <input
          name="nombre"
          placeholder="Nombre del producto"
          value={form.nombre}
          onChange={handleChange}
          required
        />

        <select name="categoria" value={form.categoria} onChange={handleChange}>
          {CATEGORIAS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>

        {esReloj ? (
          <>
            <input
              name="marca"
              placeholder="Marca (ej. Casio)"
              value={form.marca}
              onChange={handleChange}
            />
            <select name="tipo" value={form.tipo} onChange={handleChange}>
              <option>Original</option>
              <option>Réplica</option>
            </select>
          </>
        ) : (
          <select name="material" value={form.material} onChange={handleChange}>
            {MATERIALES.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        )}

        <input
          name="peso"
          type="number"
          step="0.1"
          placeholder="Peso (gramos, opcional)"
          value={form.peso}
          onChange={handleChange}
        />
        <input
          name="precio"
          type="number"
          placeholder="Precio"
          value={form.precio}
          onChange={handleChange}
          required
        />
        <input
          name="stock"
          type="number"
          placeholder="Stock inicial"
          value={form.stock}
          onChange={handleChange}
        />
        <button type="submit">Guardar producto</button>
      </form>

      {mensaje && <p>{mensaje}</p>}

      <h2>Productos registrados</h2>
      {cargando ? (
        <p>Cargando...</p>
      ) : productos.length === 0 ? (
        <p>Todavía no hay productos registrados.</p>
      ) : (
        <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Material / Marca</th>
              <th>Peso (g)</th>
              <th>Precio</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {productos.map((p) => (
              <tr key={p.id}>
                <td>{p.sku}</td>
                <td>{p.nombre}</td>
                <td>{p.categoria}</td>
                <td>{p.material || `${p.marca || '—'} (${p.tipo || '—'})`}</td>
                <td>{p.peso ?? '—'}</td>
                <td>${p.precio}</td>
                <td>{p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;