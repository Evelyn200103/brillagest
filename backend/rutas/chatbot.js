// HU-018 — Ruta pública del chatbot (no requiere iniciar sesión: es para los clientes).
const express = require('express');
const { procesarMensaje, MAX_LARGO_MENSAJE } = require('../chatbot');

const router = express.Router();

// Límite sencillo por IP para que nadie gaste la cuota de Dialogflow: 30 mensajes por minuto.
const VENTANA_MS = 60 * 1000;
const MAX_POR_VENTANA = 30;
const usos = new Map();

function limitar(req, res, next) {
  const ahora = Date.now();
  const ip = req.ip || 'desconocida';
  const registro = usos.get(ip) || { inicio: ahora, cuenta: 0 };
  if (ahora - registro.inicio > VENTANA_MS) {
    registro.inicio = ahora;
    registro.cuenta = 0;
  }
  registro.cuenta += 1;
  usos.set(ip, registro);
  if (registro.cuenta > MAX_POR_VENTANA) {
    return res.status(429).json({ error: 'Estás enviando muchos mensajes. Espera un momento e inténtalo de nuevo.' });
  }
  next();
}

const ID_SESION = /^[A-Za-z0-9_-]{8,64}$/;

// El procesador se puede cambiar en las pruebas (Dialogflow simulado).
const dependencias = { procesar: procesarMensaje };

router.post('/api/chatbot/mensaje', limitar, async (req, res) => {
  const { mensaje, sesion } = req.body || {};

  if (typeof mensaje !== 'string' || mensaje.trim() === '') {
    return res.status(400).json({ error: 'Escribe tu consulta para poder ayudarte' });
  }
  const texto = mensaje.trim();
  if (texto.length > MAX_LARGO_MENSAJE) {
    return res.status(400).json({ error: `Tu mensaje es demasiado largo (máximo ${MAX_LARGO_MENSAJE} caracteres)` });
  }
  if (typeof sesion !== 'string' || !ID_SESION.test(sesion)) {
    return res.status(400).json({ error: 'La sesión del chat no es válida' });
  }

  try {
    const resultado = await dependencias.procesar(texto, sesion);
    res.json(resultado);
  } catch (error) {
    // Nunca se devuelven detalles internos (credenciales, rutas) al cliente.
    console.error('Error en POST /api/chatbot/mensaje:', error.codigo || error.message);
    res.status(503).json({
      error: 'El asistente no está disponible en este momento. Inténtalo de nuevo en unos minutos.',
    });
  }
});

module.exports = router;
module.exports.dependencias = dependencias;
