require('dotenv').config();

// Nivel mínimo de existencias (HU-007, HU-009 y HU-010)
const STOCK_MINIMO = Number(process.env.STOCK_MINIMO) || 5;

module.exports = { STOCK_MINIMO };