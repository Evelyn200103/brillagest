require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { verificarToken, permisosDeRol } = require('../auth');

const router = express.Router();

router.post('/api/auth/login', async (req, res) => {
  const { usuario, password } = req.body;

  if (!usuario || !password) {
    return res.status(400).json({ error: 'El usuario y la contraseña son obligatorios.' });
  }

  try {
    const resultado = await pool.query(
      'SELECT id, usuario, nombre, password_hash, rol, activo FROM usuarios WHERE usuario = $1',
      [usuario]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const encontrado = resultado.rows[0];

    if (!encontrado.activo) {
      return res.status(403).json({ error: 'El usuario está inactivo. Contacte al administrador.' });
    }

    const coincide = await bcrypt.compare(password, encontrado.password_hash);

    if (!coincide) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
    }

    const token = jwt.sign(
      { id: encontrado.id, usuario: encontrado.usuario, rol: encontrado.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRA || '8h' }
    );

    res.json({
      token,
      usuario: {
        id: encontrado.id,
        usuario: encontrado.usuario,
        nombre: encontrado.nombre,
        rol: encontrado.rol,
        permisos: permisosDeRol(encontrado.rol)
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/api/auth/perfil', verificarToken, (req, res) => {
  res.json({ usuario: { ...req.usuario, permisos: permisosDeRol(req.usuario.rol) } });
});

module.exports = router;