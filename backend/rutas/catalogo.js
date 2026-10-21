// Rutas de la Página web pública (solo lectura)
const express = require('express');
const pool = require('../db');

const router = express.Router();

// Catálogo público: todos los productos con su disponibilidad (HU-014) 
router.get("/api/catalogo", async (req, res) => {
  try {
    const { q, categoria } = req.query;
        const condiciones = ["1=1"];
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      condiciones.push(`(nombre ILIKE $${params.length} OR sku ILIKE $${params.length})`);
    }
    if (categoria) {
      params.push(categoria);
      condiciones.push(`categoria = $${params.length}`);
    }

    const sql = `
      SELECT id, sku, nombre, categoria, material, marca, tipo, peso, precio,
             (COALESCE(stock, 0) > 0) AS disponible,
             creado_en AT TIME ZONE 'UTC' AS creado_en
      FROM productos
      WHERE ${condiciones.join(" AND ")}
      ORDER BY disponible DESC, nombre ASC
    `;

    const resultado = await pool.query(sql, params);
    res.json(resultado.rows);
  } catch (error) {
    console.error("Error en GET /api/catalogo:", error);
    res.status(500).json({ error: "Error al consultar el catálogo" });
  }
});

// Catálogo público: consultar productos por categoría 
const CATEGORIAS_CATALOGO = [
  'Anillos', 'Pulseras', 'Cadenas', 'Topos', 'Dijes',
  'Aretes largos', 'Candongas', 'Candongas con piedrería',
  'Argollas', 'Tobilleras', 'Relojes'
];

// Lista de categorías disponibles, con cuántos productos tiene cada una
router.get('/api/catalogo/categorias', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT categoria, COUNT(*)::int AS total FROM productos GROUP BY categoria'
    );
    const conteo = Object.fromEntries(result.rows.map((r) => [r.categoria, r.total]));

    res.json(
      CATEGORIAS_CATALOGO.map((nombre) => ({ nombre, total: conteo[nombre] || 0 }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Productos de una categoría
router.get('/api/catalogo/categorias/:nombre/productos', async (req, res) => {
  try {
    const solicitada = String(req.params.nombre).trim().toLowerCase();
    const categoria = CATEGORIAS_CATALOGO.find((c) => c.toLowerCase() === solicitada);

    if (!categoria) {
      return res.status(404).json({ error: 'La categoría solicitada no existe' });
    }

    const result = await pool.query(
      `SELECT id, sku, nombre, categoria, material, marca, tipo, peso, precio,
              (COALESCE(stock, 0) > 0) AS disponible
       FROM productos
       WHERE categoria = $1
       ORDER BY nombre ASC`,
      [categoria]
    );

    res.json({ categoria, total: result.rows.length, productos: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// ===== HU-014: Consultar disponibilidad de productos =====
router.get("/api/disponibilidad/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(Number(id))) {
      return res.status(400).json({ error: "El id debe ser numérico" });
    }

    const resultado = await pool.query(
      `SELECT id, sku, nombre, categoria, precio, stock
       FROM productos
       WHERE id = $1`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const p = resultado.rows[0];
    const disponible = p.stock > 0;

    res.json({
      id: p.id,
      sku: p.sku,
      nombre: p.nombre,
      categoria: p.categoria,
      precio: p.precio,
      disponible: disponible,
            estado: disponible ? "Disponible" : "Agotado",
      consultado_en: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error en GET /api/disponibilidad/:id", error);
    res.status(500).json({ error: "Error al consultar la disponibilidad" });
  }
});

// Catálogo público: detalle de un producto 
router.get('/api/catalogo/productos/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'El identificador del producto no es válido' });
    }

    const result = await pool.query(
      `SELECT id, sku, nombre, categoria, material, marca, tipo, peso, precio,
              (COALESCE(stock, 0) > 0) AS disponible
       FROM productos
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'El producto solicitado no existe o ya no está disponible para consulta'
      });
    }

    const producto = result.rows[0];
    res.json({
      ...producto,
      disponibilidad: producto.disponible ? 'DISPONIBLE' : 'AGOTADO'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;