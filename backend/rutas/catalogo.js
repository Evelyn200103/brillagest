// Rutas de la Página web pública (solo lectura)
const express = require('express');
const pool = require('../db');
const { conDisponibilidad } = require('../disponibilidad'); // HU-016

const router = express.Router();

// Catálogo público: todos los productos con su disponibilidad (HU-014, HU-016)
router.get('/api/catalogo', async (req, res) => {
  try {
    const { q, categoria } = req.query;
    const condiciones = ['publicado = true']; // solo productos publicados
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
      SELECT id, sku, nombre, categoria, material, marca, tipo, peso, precio, stock
      FROM productos
      WHERE ${condiciones.join(' AND ')}
      ORDER BY (COALESCE(stock, 0) > 0) DESC, nombre ASC
    `;

    const resultado = await pool.query(sql, params);
    res.json(resultado.rows.map(conDisponibilidad));
  } catch (error) {
    console.error('Error en GET /api/catalogo:', error);
    res.status(500).json({ error: 'Error al consultar el catálogo' });
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
      'SELECT categoria, COUNT(*)::int AS total FROM productos WHERE publicado = true GROUP BY categoria'
    );
    const conteo = Object.fromEntries(result.rows.map((r) => [r.categoria, r.total]));

    res.json(
      CATEGORIAS_CATALOGO.map((nombre) => ({ nombre, total: conteo[nombre] || 0 }))
    );
  } catch (err) {
    console.error('Error en GET /api/catalogo/categorias:', err);
    res.status(500).json({ error: 'Error al consultar las categorías' });
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
      `SELECT id, sku, nombre, categoria, material, marca, tipo, peso, precio, stock
       FROM productos
       WHERE categoria = $1 AND publicado = true
       ORDER BY nombre ASC`,
      [categoria]
    );

    const productos = result.rows.map(conDisponibilidad);
    res.json({ categoria, total: productos.length, productos });
  } catch (err) {
    console.error('Error en GET /api/catalogo/categorias/:nombre/productos:', err);
    res.status(500).json({ error: 'Error al consultar los productos de la categoría' });
  }
});

// ===== HU-014: Consultar disponibilidad de productos =====
router.get('/api/disponibilidad/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'El identificador del producto no es válido' });
    }

    const resultado = await pool.query(
      `SELECT id, sku, nombre, categoria, precio, stock
       FROM productos
       WHERE id = $1 AND publicado = true`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({
      ...conDisponibilidad(resultado.rows[0]),
      consultado_en: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error en GET /api/disponibilidad/:id', error);
    res.status(500).json({ error: 'Error al consultar la disponibilidad' });
  }
});

// Catálogo público: detalle de un producto (HU-013)
router.get('/api/catalogo/productos/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'El identificador del producto no es válido' });
    }

    const result = await pool.query(
      `SELECT id, sku, nombre, categoria, material, marca, tipo, peso, precio, stock
       FROM productos
       WHERE id = $1 AND publicado = true `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'El producto solicitado no existe o ya no está disponible para consulta'
      });
    }

    res.json(conDisponibilidad(result.rows[0]));
  } catch (err) {
    console.error('Error en GET /api/catalogo/productos/:id:', err);
    res.status(500).json({ error: 'Error al consultar el producto' });
  }
});

module.exports = router;