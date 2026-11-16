# Pruebas de la HU-029 — Validar el funcionamiento del chatbot

- Fecha de ejecución: 16/11/2026, 4:50:29 p. m.
- Tipo: integración de punta a punta (ruta del chatbot + agente real de Dialogflow + base de datos real). Nada simulado.
- Resumen: 63 pruebas, 63 pasan, 0 fallan.
- Por grupo: Intenciones válidas 15/15 · Variaciones 24/24 · Consultas ambiguas 8/8 · Conversación 4/4 · No reconocidas 5/5 · Productos y disponibilidad 5/5 · Cobertura 2/2

| Prueba | Grupo | Criterio | Descripción | Resultado | Detalle |
| --- | --- | --- | --- | --- | --- |
| V01 | Intenciones válidas | C1, C2 | Saludo: "hola" recibe la bienvenida de la joyería | PASA | HTTP 200, intención Default Welcome Intent, tipo texto |
| V02 | Intenciones válidas | C1, C2, C5 | Categorías: la lista y el número de productos de cada una coinciden con la base de datos | PASA | HTTP 200, intención listar_categorias, tipo categorias; Anillos=2, Topos=1, Relojes=1 |
| V03 | Intenciones válidas | C1, C2, C5 | Productos de una categoría: "qué anillos tienen" muestra solo anillos y la cantidad publicada | PASA | HTTP 200, intención productos_categoria, tipo productos; 2 productos, base de datos: 2 |
| V04 | Intenciones válidas | C1, C2 | Producto: "precio del Anillo Clásico" responde precio y disponibilidad | PASA | HTTP 200, intención consultar_producto, tipo producto |
| V05 | Intenciones válidas | C1, C2 | Ayuda: explica qué se puede consultar | PASA | HTTP 200, intención ayuda_chatbot, tipo texto |
| V06 | Intenciones válidas | C1, C2 | Consulta frecuente "Horario de atención" recibe la respuesta aprobada (faq_horario) | PASA | HTTP 200, intención faq_horario, tipo faq |
| V07 | Intenciones válidas | C1, C2 | Consulta frecuente "Dónde están ubicados" recibe la respuesta aprobada (faq_ubicacion) | PASA | HTTP 200, intención faq_ubicacion, tipo faq |
| V08 | Intenciones válidas | C1, C2 | Consulta frecuente "Contacto" recibe la respuesta aprobada (faq_contacto) | PASA | HTTP 200, intención faq_contacto, tipo faq |
| V09 | Intenciones válidas | C1, C2 | Consulta frecuente "Medios de pago" recibe la respuesta aprobada (faq_medios_pago) | PASA | HTTP 200, intención faq_medios_pago, tipo faq |
| V10 | Intenciones válidas | C1, C2 | Consulta frecuente "Garantía" recibe la respuesta aprobada (faq_garantia) | PASA | HTTP 200, intención faq_garantia, tipo faq |
| V11 | Intenciones válidas | C1, C2 | Consulta frecuente "Arreglos y servicios" recibe la respuesta aprobada (faq_servicios) | PASA | HTTP 200, intención faq_servicios, tipo faq |
| V12 | Intenciones válidas | C1, C2 | Consulta frecuente "Diseños personalizados" recibe la respuesta aprobada (faq_encargos) | PASA | HTTP 200, intención faq_encargos, tipo faq |
| V13 | Intenciones válidas | C1, C2 | Consulta frecuente "Compran oro y plata" recibe la respuesta aprobada (faq_compra_metales) | PASA | HTTP 200, intención faq_compra_metales, tipo faq |
| V14 | Intenciones válidas | C1, C2 | Consulta frecuente "¿Hacen envíos?" recibe la respuesta aprobada (faq_envios) | PASA | HTTP 200, intención faq_envios, tipo faq |
| V15 | Intenciones válidas | C1, C4 | Pregunta ajena a la joyería cae en Default Fallback Intent y orienta al cliente | PASA | HTTP 200, intención Default Fallback Intent, tipo no_entendido |
| C01 | Variaciones | C3 | Ninguna variación de esta prueba es una frase de entrenamiento del agente (si lo fuera, no mediría nada) | PASA | 23 variaciones revisadas contra 176 frases |
| C02 | Variaciones | C3 | "buenas tardes" se reconoce como Default Welcome Intent | PASA | HTTP 200, intención Default Welcome Intent, tipo texto |
| C03 | Variaciones | C3 | "buenos días, cómo estás" se reconoce como Default Welcome Intent | PASA | HTTP 200, intención Default Welcome Intent, tipo texto |
| C04 | Variaciones | C3 | "qué tipos de joyas venden" se reconoce como listar_categorias | PASA | HTTP 200, intención listar_categorias, tipo categorias |
| C05 | Variaciones | C3 | "muéstrame las categorías del catálogo" se reconoce como listar_categorias | PASA | HTTP 200, intención listar_categorias, tipo categorias |
| C06 | Variaciones | C3 | "qué clases de productos manejan" se reconoce como listar_categorias | PASA | HTTP 200, intención listar_categorias, tipo categorias |
| C07 | Variaciones | C3 | "muéstrame los relojes" se reconoce como productos_categoria | PASA | HTTP 200, intención productos_categoria, tipo productos |
| C08 | Variaciones | C3 | "qué cadenas hay disponibles" se reconoce como productos_categoria | PASA | HTTP 200, intención productos_categoria, tipo productos |
| C09 | Variaciones | C3 | "quiero ver los topos" se reconoce como productos_categoria | PASA | HTTP 200, intención productos_categoria, tipo productos |
| C10 | Variaciones | C3 | "qué precio tiene el Anillo Clásico" se reconoce como consultar_producto y responde el producto Anillo Clásico | PASA | HTTP 200, intención consultar_producto, tipo producto |
| C11 | Variaciones | C3 | "está disponible el Anillo Clásico" se reconoce como consultar_producto y responde el producto Anillo Clásico | PASA | HTTP 200, intención consultar_producto, tipo producto |
| C12 | Variaciones | C3 | "me regalas el precio de Anillo Clásico" se reconoce como consultar_producto y responde el producto Anillo Clásico | PASA | HTTP 200, intención consultar_producto, tipo producto |
| C13 | Variaciones | C3 | "qué tipo de preguntas respondes" se reconoce como ayuda_chatbot | PASA | HTTP 200, intención ayuda_chatbot, tipo texto |
| C14 | Variaciones | C3 | "cómo funciona este chat" se reconoce como ayuda_chatbot | PASA | HTTP 200, intención ayuda_chatbot, tipo texto |
| C15 | Variaciones | C3 | "con qué cosas me ayudas" se reconoce como ayuda_chatbot | PASA | HTTP 200, intención ayuda_chatbot, tipo texto |
| C16 | Variaciones | C3 | "a qué horas atienden al público" se reconoce como faq_horario | PASA | HTTP 200, intención faq_horario, tipo faq |
| C17 | Variaciones | C3 | "dónde puedo encontrar la joyería físicamente" se reconoce como faq_ubicacion | PASA | HTTP 200, intención faq_ubicacion, tipo faq |
| C18 | Variaciones | C3 | "cuál es el celular de la joyería" se reconoce como faq_contacto | PASA | HTTP 200, intención faq_contacto, tipo faq |
| C19 | Variaciones | C3 | "puedo pagar con transferencia de Nequi" se reconoce como faq_medios_pago | PASA | HTTP 200, intención faq_medios_pago, tipo faq |
| C20 | Variaciones | C3 | "si se me daña la cadena me la cubren" se reconoce como faq_garantia | PASA | HTTP 200, intención faq_garantia, tipo faq |
| C21 | Variaciones | C3 | "le pueden hacer limpieza a mi anillo" se reconoce como faq_servicios | PASA | HTTP 200, intención faq_servicios, tipo faq |
| C22 | Variaciones | C3 | "me pueden fabricar un anillo con mi diseño" se reconoce como faq_encargos | PASA | HTTP 200, intención faq_encargos, tipo faq |
| C23 | Variaciones | C3 | "ustedes compran oro usado" se reconoce como faq_compra_metales | PASA | HTTP 200, intención faq_compra_metales, tipo faq |
| C24 | Variaciones | C3 | "lo pueden enviar a domicilio" se reconoce como faq_envios | PASA | HTTP 200, intención faq_envios, tipo faq |
| A01 | Consultas ambiguas | C2, C4 | "precio": pide aclarar de qué producto | PASA | HTTP 200, intención consultar_producto, tipo no_entendido |
| A02 | Consultas ambiguas | C2, C4 | "cuánto cuesta": pide aclarar de qué producto | PASA | HTTP 200, intención consultar_producto, tipo no_entendido |
| A03 | Consultas ambiguas | C2, C4 | "está disponible?": pide aclarar de qué producto | PASA | HTTP 200, intención listar_categorias, tipo categorias; 3 productos |
| A04 | Consultas ambiguas | C2, C4 | "quiero un reloj": muestra relojes o pide aclaración (nunca otra categoría) | PASA | HTTP 200, intención consultar_producto, tipo producto; 1 productos |
| A05 | Consultas ambiguas | C2, C4 | "anillo": muestra anillos o pide aclaración (nunca otra categoría) | PASA | HTTP 200, intención consultar_producto, tipo productos; 2 productos |
| A06 | Consultas ambiguas | C2, C4 | "oro": responde sobre compra de oro, muestra productos de oro o pide aclaración | PASA | HTTP 200, intención faq_compra_metales, tipo faq |
| A07 | Consultas ambiguas | C2, C4 | "plata": responde sobre compra de plata, muestra productos de plata o pide aclaración | PASA | HTTP 200, intención faq_compra_metales, tipo faq |
| A08 | Consultas ambiguas | C2, C4 | "y ese cuánto vale": sin contexto: pide aclaración u orienta (nunca inventa un producto) | PASA | HTTP 200, intención Default Fallback Intent, tipo no_entendido |
| T01 | Conversación | C2, C3 | Tras "precio", en la misma conversación "le pueden hacer limpieza a mi anillo" se reconoce como faq_servicios | PASA | HTTP 200, intención faq_servicios, tipo faq |
| T02 | Conversación | C2, C3 | Tras "cuánto cuesta", en la misma conversación "hacen envíos" se reconoce como faq_envios | PASA | HTTP 200, intención faq_envios, tipo faq |
| T03 | Conversación | C2, C3 | Tras "me regalas el precio de Anillo Clásico", en la misma conversación "a qué hora abren" se reconoce como faq_horario | PASA | HTTP 200, intención faq_horario, tipo faq |
| T04 | Conversación | C2, C3 | Tras "qué anillos tienen", en la misma conversación "cómo puedo pagar" se reconoce como faq_medios_pago | PASA | HTTP 200, intención faq_medios_pago, tipo faq |
| N01 | No reconocidas | C4 | "recomiéndame una película": no inventa una respuesta y orienta al cliente con ejemplos | PASA | HTTP 200, intención Default Fallback Intent, tipo no_entendido |
| N02 | No reconocidas | C4 | "asdfghjkl": no inventa una respuesta y orienta al cliente con ejemplos | PASA | HTTP 200, intención Default Fallback Intent, tipo no_entendido |
| N03 | No reconocidas | C4 | "quiero pedir una pizza": no inventa una respuesta y orienta al cliente con ejemplos | PASA | HTTP 200, intención Default Fallback Intent, tipo no_entendido |
| N04 | No reconocidas | C4 | "😀😀😀": no inventa una respuesta y orienta al cliente con ejemplos | PASA | HTTP 200, intención Default Fallback Intent, tipo no_entendido |
| N05 | No reconocidas | C4 | "cómo está el clima hoy": no inventa una respuesta y orienta al cliente con ejemplos | PASA | HTTP 200, intención Default Fallback Intent, tipo no_entendido |
| P01 | Productos y disponibilidad | C5 | El catálogo que consulta el chatbot no tiene productos de prueba publicados | PASA | 4 productos publicados revisados |
| P02 | Productos y disponibilidad | C5 | "Anillo Clásico": precio y disponibilidad del chatbot iguales a la base de datos y a la página | PASA | precio 89000, stock 20, disponible (chatbot y página) |
| P03 | Productos y disponibilidad | C5 | "Reloj Casio Dama Acero": precio y disponibilidad del chatbot iguales a la base de datos y a la página | PASA | precio 325000, stock 6, disponible (chatbot y página) |
| P04 | Productos y disponibilidad | C5 | "Anillo solitario corazon": precio y disponibilidad del chatbot iguales a la base de datos y a la página | PASA | precio 1250000, stock 15, disponible (chatbot y página) |
| P05 | Productos y disponibilidad | C5 | "Topos corazón": precio y disponibilidad del chatbot iguales a la base de datos y a la página | PASA | precio 45000, stock 10, disponible (chatbot y página) |
| K01 | Cobertura | C1 | Todas las intenciones del agente (15) fueron probadas al menos una vez | PASA | 15 de 15 |
| K02 | Cobertura | C1 | Todas las intenciones que devolvió el chatbot existen en el agente exportado | PASA | coinciden |
