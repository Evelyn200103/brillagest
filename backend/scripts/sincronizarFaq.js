// HU-020 — Crea o actualiza en Dialogflow ES las intenciones de consultas frecuentes (faq_*).
//
// La definición vive en backend/faq.js (configuración como código): este script la sube al agente.
//
// Seguridad (mínimo privilegio):
//  - NO usa la llave del chatbot (GOOGLE_APPLICATION_CREDENTIALS), que solo debe poder conversar.
//  - Usa la cuenta de Google de quien lo ejecuta, iniciada con:
//        gcloud auth application-default login
//    Esa cuenta necesita en el proyecto los roles "Dialogflow API Admin" y "Service Usage Consumer".
//  - Solo crea o actualiza intenciones cuyo nombre empieza por "faq_". Nunca toca ni borra las demás.
//
// Uso, desde la carpeta backend:
//   node scripts/sincronizarFaq.js            → solo REVISA: muestra qué haría, sin cambiar nada
//   node scripts/sincronizarFaq.js --aplicar  → crea/actualiza las intenciones y entrena el agente

// La llave del chatbot no se usa aquí: se quita para que Google tome la cuenta personal.
delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
delete process.env.DIALOGFLOW_CREDENCIALES;

const { IntentsClient, AgentsClient } = require('@google-cloud/dialogflow');
const { PREGUNTAS_FRECUENTES } = require('../faq');

const PROYECTO = process.env.DIALOGFLOW_PROJECT_ID || 'brillagest-asistente-lqnj';
const IDIOMA = 'es';
const PREFIJO = 'faq_';
const APLICAR = process.argv.includes('--aplicar');

function validarDefinicion() {
  const vistas = new Map();
  for (const faq of PREGUNTAS_FRECUENTES) {
    if (!faq.intencion.startsWith(PREFIJO)) {
      throw new Error(`La intención "${faq.intencion}" no empieza por "${PREFIJO}". El script solo administra intenciones faq_.`);
    }
    for (const frase of faq.frases) {
      const clave = frase.toLowerCase();
      if (vistas.has(clave)) {
        throw new Error(`La frase "${frase}" está repetida en ${vistas.get(clave)} y ${faq.intencion}.`);
      }
      vistas.set(clave, faq.intencion);
    }
  }
}

function construirIntencion(faq, existente) {
  return {
    ...(existente ? { name: existente.name } : {}),
    displayName: faq.intencion,
    trainingPhrases: faq.frases.map((frase) => ({ type: 'EXAMPLE', parts: [{ text: frase }] })),
    // La respuesta también queda en Dialogflow como respaldo, idéntica a la del backend.
    messages: [{ text: { text: [faq.respuesta] } }],
  };
}

function explicarError(e) {
  const texto = String(e && e.message);
  if (/default credentials/i.test(texto)) {
    return 'No hay sesión de Google en este PC. Ejecuta: gcloud auth application-default login';
  }
  if (/quota project|serviceusage/i.test(texto)) {
    return 'Falta el proyecto de cuota o el rol "Service Usage Consumer". Ejecuta: ' +
      `gcloud auth application-default set-quota-project ${PROYECTO}  (y verifica el rol con Miguel)`;
  }
  if (e && e.code === 7) {
    return 'Tu cuenta no tiene permiso en el agente. Pide el rol "Dialogflow API Admin" en el proyecto ' + PROYECTO;
  }
  return texto;
}

async function main() {
  validarDefinicion();
  const intents = new IntentsClient();
  const padre = intents.projectAgentPath(PROYECTO);

  const [actuales] = await intents.listIntents({ parent: padre, languageCode: IDIOMA, intentView: 'INTENT_VIEW_FULL' });
  const porNombre = new Map(actuales.map((i) => [i.displayName, i]));
  const ajenas = actuales.filter((i) => !i.displayName.startsWith(PREFIJO)).map((i) => i.displayName);

  console.log(`Proyecto: ${PROYECTO}  |  Modo: ${APLICAR ? 'APLICAR' : 'SOLO REVISAR (no cambia nada)'}`);
  console.log(`Intenciones que NO se tocan (${ajenas.length}): ${ajenas.join(', ')}`);

  let creadas = 0;
  let actualizadas = 0;
  for (const faq of PREGUNTAS_FRECUENTES) {
    const existente = porNombre.get(faq.intencion);
    const accion = existente ? 'actualizar' : 'crear';
    console.log(`  - ${accion.padEnd(10)} ${faq.intencion} (${faq.frases.length} frases)`);
    if (!APLICAR) continue;
    const intencion = construirIntencion(faq, existente);
    if (existente) {
      await intents.updateIntent({ intent: intencion, languageCode: IDIOMA });
      actualizadas += 1;
    } else {
      await intents.createIntent({ parent: padre, intent: intencion, languageCode: IDIOMA });
      creadas += 1;
    }
  }

  if (!APLICAR) {
    console.log('\nNo se cambió nada. Si todo se ve bien, ejecuta: node scripts/sincronizarFaq.js --aplicar');
    return;
  }

  console.log(`\nCreadas: ${creadas}. Actualizadas: ${actualizadas}. Entrenando el agente...`);
  const agentes = new AgentsClient();
  const [operacion] = await agentes.trainAgent({ parent: agentes.projectPath(PROYECTO) });
  await operacion.promise();
  console.log('Listo: el agente quedó entrenado con las consultas frecuentes.');
}

main().catch((e) => {
  console.error('No se pudo sincronizar:', explicarError(e));
  process.exit(1);
});
