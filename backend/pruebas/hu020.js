// Pruebas automáticas de la HU-020 — Resolver consultas frecuentes con el chatbot.
//
// Uso, desde la carpeta backend:   node pruebas/hu020.js
//
// No necesita el backend encendido ni la base de datos: levanta la ruta del chatbot en un
// servidor temporal. Dialogflow se SIMULA para probar el backend. Si hay credenciales del
// chatbot en este PC (GOOGLE_APPLICATION_CREDENTIALS), además se ejecutan las pruebas R
// contra el agente REAL: variaciones de preguntas que NO están en el entrenamiento.
// Resultados: backend/pruebas/resultados-hu020.md
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const pool = require('../db');
const chatbot = require('../chatbot');
const rutasChatbot = require('../rutas/chatbot');
const { NEGOCIO, PREGUNTAS_FRECUENTES } = require('../faq');

const RAIZ = path.join(__dirname, '..', '..');
const resultados = [];
function registrar(id, criterio, descripcion, pasa, detalle = '', omitida = false) {
  resultados.push({ id, criterio, descripcion, pasa, detalle, omitida });
  console.log(`${omitida ? 'OMITE' : pasa ? 'PASA ' : 'FALLA'} ${id}  ${descripcion}${detalle ? `  (${detalle})` : ''}`);
}

const minus = (t) => String(t).toLowerCase();

// Dialogflow simulado: el mensaje "intencion:<nombre>" hace que "Dialogflow" devuelva esa intención.
function dialogflowSimulado(texto) {
  const base = { esFallback: false, parametros: {}, textoDialogflow: '', confianza: 0.9 };
  const m = texto.match(/^intencion:(.+)$/);
  if (m) return { ...base, intencion: m[1] };
  if (/^ayuda/.test(texto)) return { ...base, intencion: 'ayuda_chatbot' };
  return { ...base, intencion: 'Default Fallback Intent', esFallback: true };
}

async function llamar(base, ruta, cuerpo) {
  const res = await fetch(base + ruta, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo),
  });
  let datos = null;
  try { datos = await res.json(); } catch { /* sin cuerpo */ }
  return { status: res.status, datos };
}

// Variaciones de preguntas que NO están en las frases de entrenamiento (prueban que el agente generaliza).
const VARIACIONES = {
  faq_horario: ['ustedes hasta qué hora trabajan', 'el sábado atienden'],
  faq_ubicacion: ['en qué dirección queda el local', 'dónde está la tienda'],
  faq_contacto: ['me das el número de WhatsApp', 'cómo puedo comunicarme con la joyería'],
  faq_medios_pago: ['puedo pagar con Nequi', 'reciben pagos con tarjeta débito'],
  faq_garantia: ['si el anillo se daña me responden', 'qué garantía tienen las joyas'],
  faq_servicios: ['me pueden arreglar una pulsera', 'necesito cambiarle la pila a mi reloj'],
  faq_encargos: ['quiero mandar a hacer una cadena personalizada', 'hacen anillos sobre diseño'],
  faq_compra_metales: ['quiero vender unas joyas de oro', 'ustedes compran plata'],
  faq_envios: ['me pueden mandar la joya a mi casa', 'tienen domicilios'],
};

async function main() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  rutasChatbot.dependencias.procesar = (t, s) => chatbot.procesarMensaje(t, s, async (x) => dialogflowSimulado(x));
  app.use(rutasChatbot);
  const servidor = http.createServer(app);
  await new Promise((ok) => servidor.listen(0, ok));
  const BASE = `http://localhost:${servidor.address().port}`;
  const SES = `sesion-hu020-${Date.now().toString().slice(-6)}`;
  const preguntar = (m) => llamar(BASE, '/api/chatbot/mensaje', { mensaje: m, sesion: SES });

  try {
    // ---------- Definición de las consultas frecuentes ----------
    const nombres = PREGUNTAS_FRECUENTES.map((f) => f.intencion);
    registrar('T01', 'C1', 'Hay 9 consultas frecuentes definidas, con nombre único que empieza por faq_',
      nombres.length === 9 && new Set(nombres).size === 9 && nombres.every((n) => n.startsWith('faq_')),
      nombres.join(', '));

    const sinRespuesta = PREGUNTAS_FRECUENTES.filter((f) => !f.respuesta || f.respuesta.trim().length < 20);
    registrar('T02', 'C2', 'Cada intención configurada tiene una respuesta asociada',
      sinRespuesta.length === 0, sinRespuesta.map((f) => f.intencion).join(', ') || 'las 9 tienen respuesta');

    const pocas = PREGUNTAS_FRECUENTES.filter((f) => f.frases.length < 10);
    registrar('T03', 'Pruebas: variaciones de preguntas', 'Cada intención tiene al menos 10 formas distintas de preguntar',
      pocas.length === 0, PREGUNTAS_FRECUENTES.map((f) => `${f.intencion}: ${f.frases.length}`).join('; '));

    const dueño = new Map();
    const repetidas = [];
    for (const f of PREGUNTAS_FRECUENTES) {
      for (const frase of f.frases) {
        const k = minus(frase);
        if (dueño.has(k) && dueño.get(k) !== f.intencion) repetidas.push(frase);
        dueño.set(k, f.intencion);
      }
    }
    registrar('T04', 'Pruebas: respuestas incorrectas', 'Ninguna frase está en dos intenciones (evita que una pregunta caiga en la intención equivocada)',
      repetidas.length === 0, repetidas.join(', '));

    const sinEtiqueta = PREGUNTAS_FRECUENTES.filter((f) => !f.frases.includes(f.etiqueta));
    registrar('T05', 'Frontend: presentación de respuestas', 'El texto de cada botón de sugerencia está entre las frases de su intención (al pulsarlo, se reconoce)',
      sinEtiqueta.length === 0, sinEtiqueta.map((f) => f.intencion).join(', '));

    // ---------- El backend responde cada intención (Dialogflow simulado) ----------
    let n = 6;
    for (const f of PREGUNTAS_FRECUENTES) {
      const r = await preguntar(`intencion:${f.intencion}`);
      const ok = r.status === 200 && r.datos.tipo === 'faq' && r.datos.intencion === f.intencion &&
        r.datos.respuesta === f.respuesta && Array.isArray(r.datos.sugerencias) && r.datos.sugerencias.length === 3;
      registrar(`T${String(n).padStart(2, '0')}`, 'C1, C2', `Intención ${f.intencion}: el chatbot entrega la respuesta aprobada y 3 sugerencias`,
        ok, `HTTP ${r.status}, tipo ${r.datos && r.datos.tipo}`);
      n += 1;
    }

    // ---------- Consistencia con la información aprobada (página web) ----------
    let c = 1;
    for (const f of PREGUNTAS_FRECUENTES) {
      const id = `C${String(c).padStart(2, '0')}`;
      c += 1;
      const enRespuesta = f.fuente.datos.filter((d) => !minus(f.respuesta).includes(minus(d)));
      if (f.fuente.archivo) {
        const pagina = fs.readFileSync(path.join(RAIZ, f.fuente.archivo), 'utf8');
        const enPagina = f.fuente.datos.filter((d) => !minus(pagina).includes(minus(d)));
        registrar(id, 'C3, C5', `${f.intencion}: los datos de la respuesta son los mismos que publica ${path.basename(f.fuente.archivo)}`,
          enRespuesta.length === 0 && enPagina.length === 0,
          enRespuesta.length || enPagina.length
            ? `faltan en respuesta: ${enRespuesta.join(', ') || '-'}; faltan en página: ${enPagina.join(', ') || '-'}`
            : f.fuente.datos.join(' · '));
      } else {
        registrar(id, 'C3', `${f.intencion}: la respuesta contiene lo confirmado por el equipo con la joyería`,
          enRespuesta.length === 0 && Boolean(f.fuente.equipo), `${f.fuente.equipo}: ${f.fuente.datos.join(' · ')}`);
      }
    }

    const pie = fs.readFileSync(path.join(RAIZ, 'pagina-web/src/PiePagina.jsx'), 'utf8');
    const enlace = (pie.match(/WHATSAPP = '(\d+)'/) || [])[1];
    const digitos = NEGOCIO.whatsapp.replace(/\D/g, '');
    registrar(`C${String(c).padStart(2, '0')}`, 'C5', 'El WhatsApp del chatbot es el mismo del enlace de WhatsApp de la página',
      enlace === `57${digitos}`, `página: ${enlace}, chatbot: 57${digitos}`);
    c += 1;

    const conWhatsapp = PREGUNTAS_FRECUENTES.filter((f) => /whatsapp/i.test(f.respuesta));
    const otroNumero = conWhatsapp.filter((f) => !f.respuesta.includes(NEGOCIO.whatsapp));
    registrar(`C${String(c).padStart(2, '0')}`, 'C5', 'Todas las respuestas que mencionan WhatsApp usan el mismo número',
      otroNumero.length === 0, `${conWhatsapp.length} respuestas revisadas`);
    c += 1;

    const r1 = await preguntar('intencion:faq_horario');
    const r2 = await preguntar('intencion:faq_horario');
    registrar(`C${String(c).padStart(2, '0')}`, 'C5', 'La misma pregunta repetida recibe exactamente la misma respuesta',
      r1.status === 200 && r1.datos.respuesta === r2.datos.respuesta);

    // ---------- Respuesta de orientación (consultas no configuradas) ----------
    let r = await preguntar('cuál es la capital de Francia');
    registrar('T15', 'C4, Pruebas: preguntas no reconocidas', 'Consulta no configurada: el chatbot orienta y sugiere consultas frecuentes',
      r.status === 200 && r.datos.tipo === 'no_entendido' && /No logré entender/.test(r.datos.respuesta) &&
      /preguntas frecuentes/.test(r.datos.respuesta) && r.datos.sugerencias.includes('Horario de atención'),
      `sugerencias: ${r.datos && r.datos.sugerencias && r.datos.sugerencias.join(', ')}`);

    r = await preguntar('ayuda');
    registrar('T16', 'C4', 'La ayuda menciona las consultas frecuentes (horario, medios de pago, envíos)',
      r.status === 200 && /horario/.test(r.datos.respuesta) && /medios de pago/.test(r.datos.respuesta) && /envíos/.test(r.datos.respuesta));

    r = await preguntar('intencion:faq_no_configurada');
    registrar('T17', 'C4', 'Una intención faq_ que no está configurada no rompe el chatbot: responde con orientación',
      r.status === 200 && r.datos.tipo === 'no_entendido', `HTTP ${r.status}`);

    // ---------- Agente REAL de Dialogflow (solo si hay credenciales del chatbot) ----------
    const hay = Boolean(process.env.DIALOGFLOW_CREDENCIALES || process.env.GOOGLE_APPLICATION_CREDENTIALS);
    const reales = [];
    for (const [intencion, frases] of Object.entries(VARIACIONES)) {
      for (const frase of frases) reales.push([frase, intencion, 'C1, Pruebas: variaciones de preguntas']);
    }
    reales.push(['cuál es la capital de Francia', 'Default Fallback Intent', 'C4, Pruebas: preguntas no reconocidas']);
    reales.push(['ayúdame con la tarea de matemáticas', 'Default Fallback Intent', 'C4, Pruebas: preguntas no reconocidas']);
    reales.push(['qué anillos tienen', 'productos_categoria', 'Regresión HU-018']);
    reales.push(['precio del dije corazón', 'consultar_producto', 'Regresión HU-019']);

    const entrenamiento = new Set(PREGUNTAS_FRECUENTES.flatMap((f) => f.frases.map(minus)));
    let k = 1;
    for (const [frase, esperada, criterio] of reales) {
      const id = `R${String(k).padStart(2, '0')}`;
      k += 1;
      if (entrenamiento.has(minus(frase))) {
        registrar(id, criterio, `Agente real: "${frase}"`, false, 'la frase está en el entrenamiento: no sirve como variación');
        continue;
      }
      if (!hay) { registrar(id, criterio, `Agente real: "${frase}" → ${esperada}`, true, 'omitida: no hay credenciales en este PC', true); continue; }
      try {
        const d = await chatbot.detectarIntencionDialogflow(frase, `real-hu020-${k}`);
        registrar(id, criterio, `Agente real: "${frase}" → ${esperada}`, d.intencion === esperada, `devolvió "${d.intencion}"`);
      } catch (e) {
        registrar(id, criterio, `Agente real: "${frase}" → ${esperada}`, false, `error: ${e.message.slice(0, 80)}`);
      }
    }

    const id = `R${String(k).padStart(2, '0')}`;
    if (!hay) {
      registrar(id, 'C5', 'La respuesta guardada en Dialogflow es idéntica a la del backend', true, 'omitida: no hay credenciales en este PC', true);
    } else {
      try {
        const d = await chatbot.detectarIntencionDialogflow('Horario de atención', `real-hu020-resp`);
        const faq = PREGUNTAS_FRECUENTES.find((f) => f.intencion === 'faq_horario');
        registrar(id, 'C5', 'La respuesta guardada en Dialogflow es idéntica a la del backend (faq_horario)',
          d.textoDialogflow === faq.respuesta, d.textoDialogflow === faq.respuesta ? 'idénticas' : `Dialogflow: "${d.textoDialogflow.slice(0, 60)}"`);
      } catch (e) {
        registrar(id, 'C5', 'La respuesta guardada en Dialogflow es idéntica a la del backend', false, `error: ${e.message.slice(0, 80)}`);
      }
    }
  } finally {
    await new Promise((ok) => servidor.close(ok));
  }

  const evaluadas = resultados.filter((x) => !x.omitida);
  const fallas = evaluadas.filter((x) => !x.pasa);
  const omitidas = resultados.length - evaluadas.length;
  console.log(`\n${evaluadas.length} pruebas: ${evaluadas.length - fallas.length} pasan, ${fallas.length} fallan${omitidas ? `, ${omitidas} omitidas` : ''}.`);

  const md = [
    '# Pruebas de la HU-020 — Resolver consultas frecuentes',
    '',
    `- Fecha de ejecución: ${new Date().toLocaleString('es-CO')}`,
    `- Resumen: ${evaluadas.length} pruebas, ${evaluadas.length - fallas.length} pasan, ${fallas.length} fallan${omitidas ? `, ${omitidas} omitidas` : ''}.`,
    '',
    '| Prueba | Criterio | Descripción | Resultado | Detalle |',
    '| --- | --- | --- | --- | --- |',
    ...resultados.map((x) => `| ${x.id} | ${x.criterio} | ${x.descripcion} | ${x.omitida ? 'OMITIDA' : x.pasa ? 'PASA' : 'FALLA'} | ${String(x.detalle).replace(/\|/g, '/').replace(/\n/g, ' ')} |`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(__dirname, 'resultados-hu020.md'), md, 'utf8');
  console.log('Resultados guardados en backend/pruebas/resultados-hu020.md');
  await pool.end();
  process.exit(fallas.length ? 1 : 0);
}

main().catch((e) => { console.error('Error inesperado:', e.message); process.exit(1); });
