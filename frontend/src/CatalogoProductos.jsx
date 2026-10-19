import { useEffect, useState } from "react";
import DetalleProducto from "./DetalleProducto";

const API = "http://localhost:4000";

function formatoPrecio(valor) {
  const numero = Number(valor);
  if (isNaN(numero)) return "-";
  return numero.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
}

export default function CatalogoProductos() {
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState("");
  const [seleccionado, setSeleccionado] = useState(null);

  const cargarCatalogo = async () => {
    setCargando(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (busqueda) params.append("q", busqueda);
      if (categoria) params.append("categoria", categoria);
      const respuesta = await fetch(`${API}/api/catalogo?${params.toString()}`);
      if (!respuesta.ok) throw new Error("No se pudo cargar el catálogo");
      const datos = await respuesta.json();
      setProductos(datos);
    } catch (e) {
      setError(e.message);
      setProductos([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCatalogo();
  }, []);

  const categorias = [...new Set(productos.map((p) => p.categoria).filter(Boolean))];

  if (seleccionado) {
    return <DetalleProducto id={seleccionado.id} onVolver={() => setSeleccionado(null)} />;
  }

  return (
    <section style={{ marginTop: 24 }}>
      <h2>Catálogo de productos</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          placeholder="Buscar por nombre o SKU"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button onClick={cargarCatalogo}>Buscar</button>
        <button
          onClick={() => {
            setBusqueda("");
            setCategoria("");
            setTimeout(cargarCatalogo, 0);
          }}
        >
          Limpiar
        </button>
      </div>

      {cargando && <p>Cargando catálogo...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!cargando && !error && productos.length === 0 && (
        <p>No hay productos disponibles en el catálogo.</p>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        {productos.map((p) => (
          <article
            key={p.id}
            onClick={() => setSeleccionado(p)}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 12,
              width: 220,
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <h3 style={{ margin: "0 0 8px" }}>{p.nombre}</h3>
            <p style={{ margin: 0, fontSize: 13 }}>{p.categoria || "-"}</p>
            <p style={{ margin: 0, fontSize: 13 }}>{p.material || p.marca || "-"}</p>
            <p style={{ margin: "8px 0 0", fontWeight: "bold" }}>{formatoPrecio(p.precio)}</p>
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#666" }}>Ver detalle →</p>
          </article>
        ))}
      </div>
    </section>
  );
}