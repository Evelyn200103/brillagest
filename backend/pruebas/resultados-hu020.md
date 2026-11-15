# Pruebas de la HU-020 — Resolver consultas frecuentes

- Fecha de ejecución: 15/11/2026, 3:53:08 p. m.
- Resumen: 52 pruebas, 52 pasan, 0 fallan.

| Prueba | Criterio | Descripción | Resultado | Detalle |
| --- | --- | --- | --- | --- |
| T01 | C1 | Hay 9 consultas frecuentes definidas, con nombre único que empieza por faq_ | PASA | faq_horario, faq_ubicacion, faq_contacto, faq_medios_pago, faq_garantia, faq_servicios, faq_encargos, faq_compra_metales, faq_envios |
| T02 | C2 | Cada intención configurada tiene una respuesta asociada | PASA | las 9 tienen respuesta |
| T03 | Pruebas: variaciones de preguntas | Cada intención tiene al menos 10 formas distintas de preguntar | PASA | faq_horario: 11; faq_ubicacion: 15; faq_contacto: 16; faq_medios_pago: 11; faq_garantia: 15; faq_servicios: 11; faq_encargos: 10; faq_compra_metales: 10; faq_envios: 16 |
| T04 | Pruebas: respuestas incorrectas | Ninguna frase está en dos intenciones (evita que una pregunta caiga en la intención equivocada) | PASA |  |
| T05 | Frontend: presentación de respuestas | El texto de cada botón de sugerencia está entre las frases de su intención (al pulsarlo, se reconoce) | PASA |  |
| T06 | C1, C2 | Intención faq_horario: el chatbot entrega la respuesta aprobada y 3 sugerencias | PASA | HTTP 200, tipo faq |
| T07 | C1, C2 | Intención faq_ubicacion: el chatbot entrega la respuesta aprobada y 3 sugerencias | PASA | HTTP 200, tipo faq |
| T08 | C1, C2 | Intención faq_contacto: el chatbot entrega la respuesta aprobada y 3 sugerencias | PASA | HTTP 200, tipo faq |
| T09 | C1, C2 | Intención faq_medios_pago: el chatbot entrega la respuesta aprobada y 3 sugerencias | PASA | HTTP 200, tipo faq |
| T10 | C1, C2 | Intención faq_garantia: el chatbot entrega la respuesta aprobada y 3 sugerencias | PASA | HTTP 200, tipo faq |
| T11 | C1, C2 | Intención faq_servicios: el chatbot entrega la respuesta aprobada y 3 sugerencias | PASA | HTTP 200, tipo faq |
| T12 | C1, C2 | Intención faq_encargos: el chatbot entrega la respuesta aprobada y 3 sugerencias | PASA | HTTP 200, tipo faq |
| T13 | C1, C2 | Intención faq_compra_metales: el chatbot entrega la respuesta aprobada y 3 sugerencias | PASA | HTTP 200, tipo faq |
| T14 | C1, C2 | Intención faq_envios: el chatbot entrega la respuesta aprobada y 3 sugerencias | PASA | HTTP 200, tipo faq |
| C01 | C3, C5 | faq_horario: los datos de la respuesta son los mismos que publica CintaAnuncios.jsx | PASA | lunes a viernes · 9:30 a.m. · 6:00 p.m. |
| C02 | C3, C5 | faq_ubicacion: los datos de la respuesta son los mismos que publica PiePagina.jsx | PASA | Calle 16 Sur # 18-43 · Bogotá |
| C03 | C3, C5 | faq_contacto: los datos de la respuesta son los mismos que publica PiePagina.jsx | PASA | 320 273 6866 · @joyeria_sanchez_12 · @sanchezjoyeria |
| C04 | C3, C5 | faq_medios_pago: los datos de la respuesta son los mismos que publica CintaAnuncios.jsx | PASA | efectivo · tarjeta · Nequi · Daviplata |
| C05 | C3, C5 | faq_garantia: los datos de la respuesta son los mismos que publica CintaAnuncios.jsx | PASA | garantía |
| C06 | C3, C5 | faq_servicios: los datos de la respuesta son los mismos que publica CintaAnuncios.jsx | PASA | arreglos · grabados · limpieza · cambio de pila |
| C07 | C3, C5 | faq_encargos: los datos de la respuesta son los mismos que publica CintaAnuncios.jsx | PASA | diseños personalizados · joyas por encargo |
| C08 | C3, C5 | faq_compra_metales: los datos de la respuesta son los mismos que publica CintaAnuncios.jsx | PASA | oro y plata |
| C09 | C3 | faq_envios: la respuesta contiene lo confirmado por el equipo con la joyería | PASA | Confirmado por el equipo con Joyería Sánchez el 15/11/2026: Jaime Sánchez · 320 273 6866 |
| C10 | C5 | El WhatsApp del chatbot es el mismo del enlace de WhatsApp de la página | PASA | página: 573202736866, chatbot: 573202736866 |
| C11 | C5 | Todas las respuestas que mencionan WhatsApp usan el mismo número | PASA | 6 respuestas revisadas |
| C12 | C5 | La misma pregunta repetida recibe exactamente la misma respuesta | PASA |  |
| T15 | C4, Pruebas: preguntas no reconocidas | Consulta no configurada: el chatbot orienta y sugiere consultas frecuentes | PASA | sugerencias: Ver categorías, Qué anillos tienen, Horario de atención, Medios de pago |
| T16 | C4 | La ayuda menciona las consultas frecuentes (horario, medios de pago, envíos) | PASA |  |
| T17 | C4 | Una intención faq_ que no está configurada no rompe el chatbot: responde con orientación | PASA | HTTP 200 |
| R01 | C1, Pruebas: variaciones de preguntas | Agente real: "ustedes hasta qué hora trabajan" → faq_horario | PASA | devolvió "faq_horario" |
| R02 | C1, Pruebas: variaciones de preguntas | Agente real: "el sábado atienden" → faq_horario | PASA | devolvió "faq_horario" |
| R03 | C1, Pruebas: variaciones de preguntas | Agente real: "en qué dirección queda el local" → faq_ubicacion | PASA | devolvió "faq_ubicacion" |
| R04 | C1, Pruebas: variaciones de preguntas | Agente real: "dónde está la tienda" → faq_ubicacion | PASA | devolvió "faq_ubicacion" |
| R05 | C1, Pruebas: variaciones de preguntas | Agente real: "me das el número de WhatsApp" → faq_contacto | PASA | devolvió "faq_contacto" |
| R06 | C1, Pruebas: variaciones de preguntas | Agente real: "cómo puedo comunicarme con la joyería" → faq_contacto | PASA | devolvió "faq_contacto" |
| R07 | C1, Pruebas: variaciones de preguntas | Agente real: "puedo pagar con Nequi" → faq_medios_pago | PASA | devolvió "faq_medios_pago" |
| R08 | C1, Pruebas: variaciones de preguntas | Agente real: "reciben pagos con tarjeta débito" → faq_medios_pago | PASA | devolvió "faq_medios_pago" |
| R09 | C1, Pruebas: variaciones de preguntas | Agente real: "si el anillo se daña me responden" → faq_garantia | PASA | devolvió "faq_garantia" |
| R10 | C1, Pruebas: variaciones de preguntas | Agente real: "qué garantía tienen las joyas" → faq_garantia | PASA | devolvió "faq_garantia" |
| R11 | C1, Pruebas: variaciones de preguntas | Agente real: "me pueden arreglar una pulsera" → faq_servicios | PASA | devolvió "faq_servicios" |
| R12 | C1, Pruebas: variaciones de preguntas | Agente real: "necesito cambiarle la pila a mi reloj" → faq_servicios | PASA | devolvió "faq_servicios" |
| R13 | C1, Pruebas: variaciones de preguntas | Agente real: "quiero mandar a hacer una cadena personalizada" → faq_encargos | PASA | devolvió "faq_encargos" |
| R14 | C1, Pruebas: variaciones de preguntas | Agente real: "hacen anillos sobre diseño" → faq_encargos | PASA | devolvió "faq_encargos" |
| R15 | C1, Pruebas: variaciones de preguntas | Agente real: "quiero vender unas joyas de oro" → faq_compra_metales | PASA | devolvió "faq_compra_metales" |
| R16 | C1, Pruebas: variaciones de preguntas | Agente real: "ustedes compran plata" → faq_compra_metales | PASA | devolvió "faq_compra_metales" |
| R17 | C1, Pruebas: variaciones de preguntas | Agente real: "me pueden mandar la joya a mi casa" → faq_envios | PASA | devolvió "faq_envios" |
| R18 | C1, Pruebas: variaciones de preguntas | Agente real: "tienen domicilios" → faq_envios | PASA | devolvió "faq_envios" |
| R19 | C4, Pruebas: preguntas no reconocidas | Agente real: "cuál es la capital de Francia" → Default Fallback Intent | PASA | devolvió "Default Fallback Intent" |
| R20 | C4, Pruebas: preguntas no reconocidas | Agente real: "ayúdame con la tarea de matemáticas" → Default Fallback Intent | PASA | devolvió "Default Fallback Intent" |
| R21 | Regresión HU-018 | Agente real: "qué anillos tienen" → productos_categoria | PASA | devolvió "productos_categoria" |
| R22 | Regresión HU-019 | Agente real: "precio del dije corazón" → consultar_producto | PASA | devolvió "consultar_producto" |
| R23 | C5 | La respuesta guardada en Dialogflow es idéntica a la del backend (faq_horario) | PASA | idénticas |
