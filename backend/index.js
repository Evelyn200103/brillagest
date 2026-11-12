require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { verificarToken } = require('./auth');
const rutasInventario = require('./rutas/inventario');
const rutasCatalogo = require('./rutas/catalogo');
const rutasChatbot = require('./rutas/chatbot');
const rutasAuth = require('./rutas/auth');
const rutasUsuarios = require('./rutas/usuarios');
const { exigirHttps, cabecerasSeguras, opcionesCors } = require('./seguridad');

const app = express();
app.set('trust proxy', 1); // Render es un proxy: así Express sabe si el cliente usó https
app.use(exigirHttps);
app.use(cabecerasSeguras);
app.use(cors(opcionesCors()));
app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', dbTime: result.rows[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.use(rutasCatalogo);
app.use(rutasChatbot); // HU-018: chatbot público
app.use(rutasAuth);
app.use(rutasUsuarios);
app.use(verificarToken, rutasInventario);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend corriendo en el puerto ${PORT}`));