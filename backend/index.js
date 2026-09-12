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

// Listar todos los productos
app.get('/api/productos', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend corriendo en el puerto ${PORT}`));