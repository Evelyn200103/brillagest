const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', dbTime: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// Generar un SKU simple automático, ej: PROD-0007
async function generarSku() {
  const result = await pool.query('SELECT COUNT(*) FROM productos');
  const siguiente = parseInt(result.rows[0].count, 10) + 1;
  return `PROD-${String(siguiente).padStart(4, '0')}`;
}

// Crear un producto nuevo
app.post('/api/productos', async (req, res) => {
  try {
    const { nombre, categoria, material, peso, precio, stock, marca, tipo } = req.body;

    if (!nombre || !categoria || !precio) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    if (categoria !== 'Relojes' && !material) {
      return res.status(400).json({ error: 'El material es obligatorio para esta categoría' });
    }

    const sku = await generarSku();

    const result = await pool.query(
      `INSERT INTO productos (sku, nombre, categoria, material, peso, precio, stock, marca, tipo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [sku, nombre, categoria, material || null, peso || null, precio, stock || 0, marca || null, tipo || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Listar productos (con búsqueda y filtro opcional)
app.get('/api/productos', async (req, res) => {
  try {
    const { q, categoria } = req.query;
    let sql = 'SELECT * FROM productos WHERE 1=1';
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      sql += ` AND (nombre ILIKE $${params.length} OR sku ILIKE $${params.length})`;
    }

    if (categoria) {
      params.push(categoria);
      sql += ` AND categoria = $${params.length}`;
    }

    sql += ' ORDER BY id DESC';

    const result = await pool.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Actualizar un producto existente
app.put('/api/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, categoria, material, peso, precio, stock, marca, tipo } = req.body;

    if (!nombre || !categoria || !precio) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    if (categoria !== 'Relojes' && !material) {
      return res.status(400).json({ error: 'El material es obligatorio para esta categoría' });
    }

    const result = await pool.query(
      `UPDATE productos
       SET nombre = $1, categoria = $2, material = $3, peso = $4, precio = $5, stock = $6, marca = $7, tipo = $8
       WHERE id = $9 RETURNING *`,
      [nombre, categoria, material || null, peso || null, precio, stock || 0, marca || null, tipo || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Eliminar un producto
app.delete('/api/productos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM productos WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Producto eliminado', producto: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Registrar una entrada de inventario (HU-005)
app.post('/api/movimientos/entrada', async (req, res) => {
  const { producto_id, cantidad, responsable, observacion } = req.body;

  const productoId = Number(producto_id);
  const cant = Number(cantidad);

  if (!Number.isInteger(productoId) || productoId <= 0) {
    return res.status(400).json({ error: 'Producto inválido' });
  }

  if (!Number.isInteger(cant) || cant <= 0) {
    return res.status(400).json({ error: 'La cantidad debe ser un número entero mayor que cero' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const producto = await client.query(
      'SELECT id FROM productos WHERE id = $1 FOR UPDATE',
      [productoId]
    );

    if (producto.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const movimiento = await client.query(
      `INSERT INTO movimientos (producto_id, tipo, cantidad, responsable, observacion)
       VALUES ($1, 'ENTRADA', $2, $3, $4) RETURNING *`,
      [productoId, cant, responsable || null, observacion || null]
    );

    const actualizado = await client.query(
      `UPDATE productos SET stock = COALESCE(stock, 0) + $1
       WHERE id = $2 RETURNING id, nombre, stock`,
      [cant, productoId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      mensaje: 'Entrada registrada correctamente',
      movimiento: movimiento.rows[0],
      producto: actualizado.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend corriendo en el puerto ${PORT}`));