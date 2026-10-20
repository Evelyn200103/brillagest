// Rutas de la App de inventario (uso interno de la joyería)
const express = require('express');
const pool = require('../db');
const { STOCK_MINIMO } = require('../config');

const router = express.Router();

// Generar un SKU simple automático, ej: PROD-0007
async function generarSku() {
  const result = await pool.query(
    `SELECT COALESCE(MAX(SUBSTRING(sku FROM 'PROD-(\\d+)')::int), 0) AS maximo FROM productos`
  );
  const siguiente = result.rows[0].maximo + 1;
  return `PROD-${String(siguiente).padStart(4, '0')}`;
}

// Crear un producto nuevo
router.post('/api/productos', async (req, res) => {
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
router.get('/api/productos', async (req, res) => {
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
router.put('/api/productos/:id', async (req, res) => {
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
router.delete('/api/productos/:id', async (req, res) => {
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
router.post('/api/movimientos/entrada', async (req, res) => {
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

// Registrar una salida de inventario (HU-006)
router.post('/api/movimientos/salida', async (req, res) => {
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
      'SELECT id, stock FROM productos WHERE id = $1 FOR UPDATE',
      [productoId]
    );

    if (producto.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const stockActual = producto.rows[0].stock || 0;
    if (cant > stockActual) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Stock insuficiente. Disponible: ${stockActual}`
      });
    }

    const movimiento = await client.query(
      `INSERT INTO movimientos (producto_id, tipo, cantidad, responsable, observacion)
       VALUES ($1, 'SALIDA', $2, $3, $4) RETURNING *`,
      [productoId, cant, responsable || null, observacion || null]
    );

    const actualizado = await client.query(
      `UPDATE productos SET stock = stock - $1
       WHERE id = $2 RETURNING id, nombre, stock`,
      [cant, productoId]
    );

    await client.query('COMMIT');

    res.status(201).json({
      mensaje: 'Salida registrada correctamente',
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

// Consultar existencias (HU-007)

router.get('/api/existencias', async (req, res) => {
  try {
    const { q, categoria } = req.query;
    let sql = `SELECT id, sku, nombre, categoria, material, marca, tipo, stock
               FROM productos WHERE 1=1`;
    const params = [];

    if (q) {
      params.push(`%${q}%`);
      sql += ` AND (nombre ILIKE $${params.length} OR sku ILIKE $${params.length})`;
    }

    if (categoria) {
      params.push(categoria);
      sql += ` AND categoria = $${params.length}`;
    }

    sql += ' ORDER BY nombre ASC';

    const result = await pool.query(sql, params);

    const productos = result.rows.map((p) => {
      const stock = p.stock || 0;
      let estado = 'DISPONIBLE';
      if (stock === 0) estado = 'SIN_STOCK';
      else if (stock <= STOCK_MINIMO) estado = 'STOCK_BAJO';
      return { ...p, stock, estado };
    });

    res.json(productos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Consultar movimientos de inventario (HU-008)
router.get('/api/movimientos', async (req, res) => {
  try {
    const { tipo, producto_id } = req.query;
    const condiciones = [];
    const params = [];

    if (tipo) {
      const tipoNormalizado = String(tipo).toUpperCase();
      if (!['ENTRADA', 'SALIDA'].includes(tipoNormalizado)) {
        return res.status(400).json({ error: 'El tipo debe ser ENTRADA o SALIDA' });
      }
      params.push(tipoNormalizado);
      condiciones.push(`m.tipo = $${params.length}`);
    }

    if (producto_id) {
      const productoId = Number(producto_id);
      if (!Number.isInteger(productoId) || productoId <= 0) {
        return res.status(400).json({ error: 'Producto inválido' });
      }
      params.push(productoId);
      condiciones.push(`m.producto_id = $${params.length}`);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT m.id, m.producto_id, p.sku, p.nombre AS producto, m.tipo, m.cantidad,
              m.creado_en AT TIME ZONE 'UTC' AS creado_en, m.responsable, m.observacion
       FROM movimientos m
       JOIN productos p ON p.id = m.producto_id
       ${where}
       ORDER BY m.creado_en DESC, m.id DESC`,
      params
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Alertas de stock bajo (HU-009)


router.get('/api/alertas/stock-bajo', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, sku, nombre, categoria, COALESCE(stock, 0) AS stock
       FROM productos
       WHERE COALESCE(stock, 0) <= $1
       ORDER BY stock ASC, nombre ASC`,
      [STOCK_MINIMO]
    );

    const alertas = result.rows.map((p) => ({
      ...p,
      estado: p.stock === 0 ? 'AGOTADO' : 'STOCK_BAJO'
    }));

    res.json({ stock_minimo: STOCK_MINIMO, total: alertas.length, alertas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reportes básicos de inventario (HU-010)
// Usa STOCK_MINIMO, el mismo nivel definido para las alertas (HU-009)
router.get('/api/reportes/inventario', async (req, res) => {
  try {
    // Periodo (en días) para el resumen de movimientos. Por defecto, 30.
    const dias = req.query.dias === undefined ? 30 : Number(req.query.dias);
    if (!Number.isInteger(dias) || dias < 1 || dias > 365) {
      return res.status(400).json({ error: 'El periodo debe ser un número entero de días entre 1 y 365' });
    }

    const [resumen, categorias, movimientos, stockBajo] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total_productos,
                COALESCE(SUM(COALESCE(stock, 0)), 0)::int AS total_unidades,
                COALESCE(SUM(COALESCE(stock, 0) * precio), 0)::float AS valor_inventario,
                COUNT(*) FILTER (WHERE COALESCE(stock, 0) = 0)::int AS agotados,
                COUNT(*) FILTER (WHERE COALESCE(stock, 0) > 0 AND COALESCE(stock, 0) <= $1)::int AS stock_bajo
         FROM productos`,
        [STOCK_MINIMO]
      ),
      pool.query(
        `SELECT categoria,
                COUNT(*)::int AS productos,
                COALESCE(SUM(COALESCE(stock, 0)), 0)::int AS unidades,
                COALESCE(SUM(COALESCE(stock, 0) * precio), 0)::float AS valor
         FROM productos
         GROUP BY categoria
         ORDER BY categoria ASC`
      ),
      pool.query(
        `SELECT tipo,
                COUNT(*)::int AS movimientos,
                COALESCE(SUM(cantidad), 0)::int AS unidades
         FROM movimientos
         WHERE creado_en >= NOW() - make_interval(days => $1)
         GROUP BY tipo`,
        [dias]
      ),
      pool.query(
        `SELECT id, sku, nombre, categoria, COALESCE(stock, 0) AS stock
         FROM productos
         WHERE COALESCE(stock, 0) <= $1
         ORDER BY COALESCE(stock, 0) ASC, nombre ASC
         LIMIT 10`,
        [STOCK_MINIMO]
      )
    ]);

    const porTipo = { ENTRADA: { movimientos: 0, unidades: 0 }, SALIDA: { movimientos: 0, unidades: 0 } };
    movimientos.rows.forEach((m) => {
      porTipo[m.tipo] = { movimientos: m.movimientos, unidades: m.unidades };
    });

    res.json({
      generado_en: new Date().toISOString(),
      hay_informacion: resumen.rows[0].total_productos > 0,
      stock_minimo: STOCK_MINIMO,
      resumen: resumen.rows[0],
      por_categoria: categorias.rows,
      movimientos: {
        dias,
        total: porTipo.ENTRADA.movimientos + porTipo.SALIDA.movimientos,
        entradas: porTipo.ENTRADA,
        salidas: porTipo.SALIDA
      },
      productos_a_reponer: stockBajo.rows.map((p) => ({
        ...p,
        estado: p.stock === 0 ? 'AGOTADO' : 'STOCK_BAJO'
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;