import { useEffect, useState } from "react";

const API = "http://localhost:4000";

export default function DisponibilidadProducto() {
  const [productos, setProductos] = useState([]);
  const [idSeleccionado, setIdSeleccionado] = useState("");
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/api/productos`)
      .then((r) => r.json())
      .then((datos) => setProductos(datos))
      .catch(() => setError("No se pudo cargar la lista de productos"));
  }, []);

  const consultar = async () => {
    if (!idSeleccionado) {
      setError("Selecciona un producto");
      setResultado(null);
      return;
    }
    setCargando(true);
    setError("");
    setResultado(null);
    try {
      const respuesta = await fetch(`${API}/api/disponibilidad/${idSeleccionado}`);
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || "Error al consultar");
      setResultado(datos);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  return (
    <section style={{ marginTop: 24 }}>
      <h2>Consultar disponibilidad</h2>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <select
          value={idSeleccionado}
          onChange={(e) => setIdSeleccionado(e.target.value)}
        >
          <option value="">Selecciona un producto</option>
          {productos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} ({p.sku})
            </option>
          ))}
        </select>
        <button onClick={consultar} disabled={cargando}>
          {cargando ? "Consultando..." : "Consultar disponibilidad"}
        </button>
        {resultado && (
          <button onClick={consultar} disabled={cargando}>
            Actualizar
          </button>
        )}
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {resultado && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            maxWidth: 360,
          }}
        >
          <h3 style={{ margin: "0 0 8px" }}>{resultado.nombre}</h3>
          <p style={{ margin: 0, fontSize: 13 }}>SKU: {resultado.sku}</p>
          <p style={{ margin: 0, fontSize: 13 }}>
            Categoría: {resultado.categoria || "-"}
          </p>
          <p
            style={{
              margin: "12px 0 0",
              fontWeight: "bold",
              color: resultado.disponible ? "green" : "red",
            }}
          >
            {resultado.estado}
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#666" }}>
            Consultado: {new Date(resultado.consultado_en).toLocaleString("es-CO")}
          </p>
        </div>
      )}
    </section>
  );
}