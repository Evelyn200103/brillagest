// Rutas de gestión de usuarios (HU-023). Solo para administradores.
const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../db');
const { verificarToken, soloAdmin } = require('../auth');

const router = express.Router();

const ROLES_VALIDOS = ['administrador', 'empleado'];
const CAMPOS = 'id, usuario, nombre, rol, activo, creado_en';

// Todas las rutas de usuarios exigen sesión válida y rol de administrador
router.use('/api/usuarios', verificarToken, soloAdmin);

// Listar usuarios (nunca se devuelve password_hash)
router.get('/api/usuarios', async (req, res) => {
  try {
    const result = await pool.query(`SELECT ${CAMPOS} FROM usuarios ORDER BY id`);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crear un usuario nuevo
router.post('/api/usuarios', async (req, res) => {
  try {
    const { usuario, nombre, password, rol } = req.body;

    if (!usuario || !nombre || !password || !rol) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ error: 'El rol debe ser administrador o empleado.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    const existente = await pool.query('SELECT id FROM usuarios WHERE usuario = $1', [usuario]);

    if (existente.rows.length > 0) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese nombre de usuario.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO usuarios (usuario, nombre, password_hash, rol)
       VALUES ($1, $2, $3, $4) RETURNING ${CAMPOS}`,
      [usuario, nombre, passwordHash, rol]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Editar un usuario (la contraseña es opcional)
router.put('/api/usuarios/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nombre, rol, password } = req.body;

    if (!nombre || !rol) {
      return res.status(400).json({ error: 'El nombre y el rol son obligatorios.' });
    }

    if (!ROLES_VALIDOS.includes(rol)) {
      return res.status(400).json({ error: 'El rol debe ser administrador o empleado.' });
    }

    if (password !== undefined && password !== null && password !== '' && password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    }

    const existente = await pool.query('SELECT id FROM usuarios WHERE id = $1', [id]);

    if (existente.rows.length === 0) {
      return res.status(404).json({ error: 'El usuario no existe.' });
    }

    if (id === req.usuario.id && rol !== 'administrador') {
      return res.status(400).json({ error: 'Un administrador no puede quitarse a si mismo el rol de administrador.' });
    }

    let result;

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      result = await pool.query(
        `UPDATE usuarios SET nombre = $1, rol = $2, password_hash = $3
         WHERE id = $4 RETURNING ${CAMPOS}`,
        [nombre, rol, passwordHash, id]
      );
    } else {
      result = await pool.query(
        `UPDATE usuarios SET nombre = $1, rol = $2 WHERE id = $3 RETURNING ${CAMPOS}`,
        [nombre, rol, id]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Activar o desactivar un usuario
router.patch('/api/usuarios/:id/estado', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { activo } = req.body;

    if (typeof activo !== 'boolean') {
      return res.status(400).json({ error: 'El campo activo debe ser booleano.' });
    }

    const existente = await pool.query('SELECT id FROM usuarios WHERE id = $1', [id]);

    if (existente.rows.length === 0) {
      return res.status(404).json({ error: 'El usuario no existe.' });
    }

    if (id === req.usuario.id) {
      return res.status(400).json({ error: 'Un administrador no puede desactivarse a si mismo.' });
    }

    const result = await pool.query(
      `UPDATE usuarios SET activo = $1 WHERE id = $2 RETURNING ${CAMPOS}`,
      [activo, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
