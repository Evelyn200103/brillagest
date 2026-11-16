// HU-029 — Exporta, en modo SOLO LECTURA, las intenciones del agente real de Dialogflow.
//
// Para qué sirve:
//  - Saber exactamente qué intenciones existen, para comprobar que TODAS tienen pruebas (criterio 1).
//  - Conocer sus frases de entrenamiento, para que las variaciones de las pruebas NO sean
//    frases que el agente ya memorizó (criterio 3).
//
// Seguridad: solo lee (listIntents y listEntityTypes). No crea, no cambia y no borra nada.
// Usa la cuenta de Google de quien lo ejecuta (gcloud auth application-default login),
// no la llave del chatbot.
//
// Uso, desde la carpeta backend:   node scripts/exportarIntenciones.js
// Resultado: backend/pruebas/intenciones-agente.json

delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
delete process.env.DIALOGFLOW_CREDENCIALES;

const fs = require('fs');
const path = require('path');
const { IntentsClient, EntityTypesClient } = require('@google-cloud/dialogflow');

const PROYECTO = process.env.DIALOGFLOW_PROJECT_ID || 'brillagest-asistente-lqnj';
const IDIOMA = 'es';
const SALIDA = path.join(__dirname, '..', 'pruebas', 'intenciones-agente.json');

async function main() {
  const intents = new IntentsClient();
  const padre = intents.projectAgentPath(PROYECTO);
  const [lista] = await intents.listIntents({ parent: padre, languageCode: IDIOMA, intentView: 'INTENT_VIEW_FULL' });

  const intenciones = lista
    .map((i) => ({
      intencion: i.displayName,
      esFallback: Boolean(i.isFallback),
      frases: (i.trainingPhrases || []).map((t) => (t.parts || []).map((p) => p.text).join('')),
      parametros: (i.parameters || []).map((p) => ({ nombre: p.displayName, entidad: p.entityTypeDisplayName })),
    }))
    .sort((a, b) => a.intencion.localeCompare(b.intencion));

  const entidades = new EntityTypesClient();
  const [tipos] = await entidades.listEntityTypes({ parent: padre, languageCode: IDIOMA });
  const entidadesPropias = tipos.map((t) => ({
    entidad: t.displayName,
    valores: (t.entities || []).map((e) => e.value),
  }));

  const datos = { proyecto: PROYECTO, exportado: new Date().toISOString(), intenciones, entidades: entidadesPropias };
  fs.writeFileSync(SALIDA, JSON.stringify(datos, null, 2), 'utf8');

  console.log(`Intenciones del agente (${intenciones.length}):`);
  for (const i of intenciones) {
    const params = i.parametros.map((p) => `${p.nombre}:${p.entidad}`).join(', ');
    console.log(`  - ${i.intencion.padEnd(26)} ${String(i.frases.length).padStart(3)} frases${params ? `  [${params}]` : ''}`);
  }
  console.log(`Entidades propias: ${entidadesPropias.map((e) => `${e.entidad} (${e.valores.length})`).join(', ') || 'ninguna'}`);
  console.log(`\nGuardado en backend/pruebas/intenciones-agente.json (solo lectura: no se cambió nada del agente).`);
}

main().catch((e) => {
  const texto = String(e && e.message);
  if (/default credentials/i.test(texto)) console.error('No hay sesión de Google: ejecuta gcloud auth application-default login');
  else if (e && e.code === 7) console.error('Tu cuenta no tiene permiso para leer el agente.');
  else console.error('No se pudo exportar:', texto);
  process.exit(1);
});
