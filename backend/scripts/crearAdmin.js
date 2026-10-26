require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../db');

const RONDAS = 10;

async function crearAdmin() {
  const usuario = process.env.ADMIN_USUARIO;
  const password = process.env.ADMIN_PASSWORD;

  if (!usuario || !password) {
    console.error('Faltan ADMIN_USUARIO o ADMIN_PASSWORD en el archivo .env');
    return;
  }

  const existente = await pool.query('SELECT id FROM usuarios WHERE usuario = $1', [usuario]);

  if (existente.rows.length > 0) {
    console.log(`El usuario "${usuario}" ya existe. No se creó de nuevo.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, RONDAS);

  const resultado = await pool.query(
    `INSERT INTO usuarios (usuario, nombre, password_hash, rol, activo)
     VALUES ($1, $2, $3, 'administrador', TRUE)
     RETURNING id, usuario, nombre, rol, activo`,
    [usuario, 'Administrador', passwordHash]
  );

  console.log('Administrador creado:', resultado.rows[0]);
}

crearAdmin()
  .catch((err) => console.error('Error al crear el administrador:', err.message))
  .finally(() => pool.end());