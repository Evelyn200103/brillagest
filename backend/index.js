require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const rutasInventario = require('./rutas/inventario');
const rutasCatalogo = require('./rutas/catalogo');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', dbTime: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// App de inventario (escritorio, uso interno)
app.use(rutasInventario);

// Página web pública (catálogo y, más adelante, chatbot)
app.use(rutasCatalogo);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend corriendo en el puerto ${PORT}`));