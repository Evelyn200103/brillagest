// HU-020 — Consultas frecuentes del chatbot.
//
// Este archivo es la ÚNICA fuente de la información aprobada por Joyería Sánchez:
//  - backend/chatbot.js toma de aquí las respuestas.
//  - backend/scripts/sincronizarFaq.js toma de aquí las frases para entrenar a Dialogflow.
//  - backend/pruebas/hu020.js compara estos datos con lo que publica la página web.
// Si la joyería cambia un dato (horario, teléfono...), se cambia aquí y en ningún otro sitio del backend.

const NEGOCIO = {
  direccion: 'Calle 16 Sur # 18-43, Bogotá',
  whatsapp: '320 273 6866',
  instagram: '@joyeria_sanchez_12',
  tiktok: '@sanchezjoyeria',
};

// Cada consulta frecuente:
//  - intencion: nombre de la intención en Dialogflow (todas empiezan por "faq_").
//  - etiqueta: texto del botón de sugerencia; también es una frase de entrenamiento.
//  - frases: ejemplos con los que Dialogflow aprende a reconocer la pregunta.
//  - respuesta: texto aprobado que entrega el chatbot.
//  - fuente: dónde está validada la información (criterio 3 de la HU-020).
//      archivo: archivo de la página web que publica el mismo dato.
//      datos: textos que deben aparecer igual en la respuesta y en ese archivo.
const PREGUNTAS_FRECUENTES = [
  {
    intencion: 'faq_horario',
    etiqueta: 'Horario de atención',
    frases: [
      'Horario de atención',
      'a qué hora abren',
      'cuál es el horario',
      'a qué hora cierran',
      'qué días atienden',
      'hasta qué hora atienden',
      'están abiertos hoy',
      'abren los sábados',
      'abren el domingo',
      'cuál es su horario de atención',
      'a que hora abren la tienda',
    ],
    respuesta:
      'Nuestro horario de atención es de lunes a viernes, de 9:30 a.m. a 6:00 p.m. ' +
      `Te esperamos en ${NEGOCIO.direccion}.`,
    fuente: { archivo: 'pagina-web/src/CintaAnuncios.jsx', datos: ['lunes a viernes', '9:30 a.m.', '6:00 p.m.'] },
  },
  {
    intencion: 'faq_ubicacion',
    etiqueta: 'Dónde están ubicados',
    frases: [
      'Dónde están ubicados',
      'cuál es la dirección',
      'dónde queda la joyería',
      'tienen tienda física',
      'cómo llego a la tienda',
      'dirección de la tienda',
      'dónde los encuentro',
      'dónde quedan',
      'en qué parte de Bogotá están',
      'me pasan la ubicación',
      'donde queda la joyeria',
      'dónde queda el local',
      'cuál es la dirección del local',
      'en qué dirección están ubicados',
      'dirección del almacén',
    ],
    respuesta:
      `Estamos en ${NEGOCIO.direccion}. Atendemos de lunes a viernes, de 9:30 a.m. a 6:00 p.m.`,
    fuente: { archivo: 'pagina-web/src/PiePagina.jsx', datos: ['Calle 16 Sur # 18-43', 'Bogotá'] },
  },
  {
    intencion: 'faq_contacto',
    etiqueta: 'Contacto',
    frases: [
      'Contacto',
      'cuál es su número',
      'tienen WhatsApp',
      'cómo los contacto',
      'número de teléfono',
      'tienen Instagram',
      'cuáles son sus redes sociales',
      'quiero hablar con alguien',
      'cómo me comunico con ustedes',
      'teléfono de contacto',
      'tienen TikTok',
      'cómo me pongo en contacto con la joyería',
      'quiero comunicarme con la tienda',
      'cómo contacto a la joyería',
      'a qué número les puedo escribir',
      'cuál es el medio de contacto de la joyería',
    ],
    respuesta:
      `Puedes escribirnos por WhatsApp al ${NEGOCIO.whatsapp}. ` +
      `También estamos en Instagram como ${NEGOCIO.instagram} y en TikTok como ${NEGOCIO.tiktok}.`,
    fuente: { archivo: 'pagina-web/src/PiePagina.jsx', datos: [NEGOCIO.whatsapp, NEGOCIO.instagram, NEGOCIO.tiktok] },
  },
  {
    intencion: 'faq_medios_pago',
    etiqueta: 'Medios de pago',
    frases: [
      'Medios de pago',
      'cómo puedo pagar',
      'aceptan tarjeta',
      'reciben Nequi',
      'puedo pagar con Daviplata',
      'cuáles son las formas de pago',
      'aceptan efectivo',
      'qué métodos de pago tienen',
      'se puede pagar por Nequi',
      'puedo pagar con tarjeta de crédito',
      'como se paga',
    ],
    respuesta: 'Puedes pagar en efectivo, con tarjeta, por Nequi o por Daviplata.',
    fuente: { archivo: 'pagina-web/src/CintaAnuncios.jsx', datos: ['efectivo', 'tarjeta', 'Nequi', 'Daviplata'] },
  },
  {
    intencion: 'faq_garantia',
    etiqueta: 'Garantía',
    frases: [
      'Garantía',
      'tienen garantía',
      'los productos tienen garantía',
      'qué pasa si la joya se daña',
      'cuánto dura la garantía',
      'la joya salió defectuosa',
      'me dan garantía',
      'los relojes tienen garantía',
      'cómo hago válida la garantía',
      'las joyas tienen garantia',
      'me responden si la pulsera se daña',
      'qué cubre la garantía',
      'si la cadena sale defectuosa me la cambian',
      'responden por daños de fábrica',
      'si el reloj falla qué hacen',
    ],
    respuesta:
      'Sí, nuestros productos tienen garantía. Para conocer las condiciones de la garantía de una pieza en particular, ' +
      `escríbenos por WhatsApp al ${NEGOCIO.whatsapp}.`,
    fuente: { archivo: 'pagina-web/src/CintaAnuncios.jsx', datos: ['garantía'] },
  },
  {
    intencion: 'faq_servicios',
    etiqueta: 'Arreglos y servicios',
    frases: [
      'Arreglos y servicios',
      'hacen arreglos de joyas',
      'arreglan cadenas',
      'hacen grabados',
      'pueden grabar un anillo',
      'limpian joyas',
      'cambian la pila del reloj',
      'qué servicios tienen',
      'se me rompió la cadena',
      'le cambian la batería al reloj',
      'hacen mantenimiento de joyas',
      // DEF-007 (HU-029): frases con nombres de joyas, para no confundir servicios con encargos
      'limpian anillos y cadenas',
      'quiero que me limpien una pulsera',
      'me pueden reparar un anillo',
      'le cambian el broche a una cadena',
      'pueden pulir unos aretes',
    ],
    respuesta:
      'Hacemos arreglos de joyas, grabados, limpieza y cambio de pila de relojes. ' +
      `Para cotizar tu servicio escríbenos por WhatsApp al ${NEGOCIO.whatsapp} o visítanos en ${NEGOCIO.direccion}.`,
    fuente: { archivo: 'pagina-web/src/CintaAnuncios.jsx', datos: ['arreglos', 'grabados', 'limpieza', 'cambio de pila'] },
  },
  {
    intencion: 'faq_encargos',
    etiqueta: 'Diseños personalizados',
    frases: [
      'Diseños personalizados',
      'hacen joyas personalizadas',
      'puedo mandar a hacer un anillo',
      'hacen diseños por encargo',
      'quiero una joya a mi gusto',
      'hacen argollas personalizadas',
      'pueden hacer un dije con un nombre',
      'puedo encargar un diseño',
      'hacen joyas a la medida',
      'fabrican joyas por pedido',
    ],
    respuesta:
      'Sí, hacemos diseños personalizados y joyas por encargo. ' +
      `Cuéntanos tu idea por WhatsApp al ${NEGOCIO.whatsapp} y te asesoramos.`,
    fuente: { archivo: 'pagina-web/src/CintaAnuncios.jsx', datos: ['diseños personalizados', 'joyas por encargo'] },
  },
  {
    intencion: 'faq_compra_metales',
    etiqueta: 'Compran oro y plata',
    frases: [
      'Compran oro y plata',
      'compran oro',
      'compran plata',
      'quiero vender mi oro',
      'dónde puedo vender oro',
      'a cómo compran el gramo de oro',
      'reciben oro usado',
      'quiero vender una cadena de oro',
      'compran joyas de plata',
      'les puedo vender oro',
    ],
    respuesta:
      'Sí, compramos oro y plata. Para valorar tu pieza acércate a la tienda en ' +
      `${NEGOCIO.direccion} o escríbenos por WhatsApp al ${NEGOCIO.whatsapp}.`,
    fuente: { archivo: 'pagina-web/src/CintaAnuncios.jsx', datos: ['oro y plata'] },
  },
  {
    intencion: 'faq_envios',
    etiqueta: '¿Hacen envíos?',
    frases: [
      '¿Hacen envíos?',
      'hacen envíos',
      'hacen domicilios',
      'envían a domicilio',
      'me lo pueden enviar',
      'tienen servicio a domicilio',
      'hacen entregas',
      'cuánto cuesta el envío',
      'me pueden llevar el pedido',
      'cómo me llega el producto',
      'hacen envios',
      'me lo mandan a la casa',
      'envían a mi casa',
      'lo pueden mandar a mi dirección',
      'me pueden mandar el pedido',
      'me envían la compra a domicilio',
    ],
    respuesta:
      'Sí, hacemos envíos. Los realiza directamente el dueño de la joyería, Jaime Sánchez. ' +
      `Para coordinar tu envío escríbenos por WhatsApp al ${NEGOCIO.whatsapp}.`,
    // No está publicado en la página web: lo confirmó el equipo del proyecto con la joyería (15/11/2026).
    fuente: { equipo: 'Confirmado por el equipo con Joyería Sánchez el 15/11/2026', datos: ['Jaime Sánchez', NEGOCIO.whatsapp] },
  },
];

const POR_INTENCION = new Map(PREGUNTAS_FRECUENTES.map((p) => [p.intencion, p]));

function esIntencionFaq(intencion) {
  return POR_INTENCION.has(intencion);
}

// Respuesta del chatbot para una consulta frecuente, con 3 sugerencias de otras consultas.
function responderFaq(intencion) {
  const faq = POR_INTENCION.get(intencion);
  if (!faq) return null;
  const i = PREGUNTAS_FRECUENTES.indexOf(faq);
  const otras = [1, 2, 3].map((k) => PREGUNTAS_FRECUENTES[(i + k) % PREGUNTAS_FRECUENTES.length].etiqueta);
  return { tipo: 'faq', respuesta: faq.respuesta, sugerencias: otras };
}

module.exports = { NEGOCIO, PREGUNTAS_FRECUENTES, esIntencionFaq, responderFaq };
