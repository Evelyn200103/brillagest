-- Cada movimiento guarda automáticamente el usuario que lo registró.
-- Los movimientos anteriores quedan con usuario_id vacío (NULL).
ALTER TABLE movimientos
ADD COLUMN IF NOT EXISTS usuario_id INTEGER REFERENCES usuarios(id);