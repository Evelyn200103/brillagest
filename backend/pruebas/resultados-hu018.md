# Pruebas de la HU-018 — Consultar información mediante el chatbot

- Fecha de ejecución: 11/11/2026, 10:13:38 p. m.
- Resumen: 31 pruebas, 31 pasan, 0 fallan.

| Prueba | Criterio | Descripción | Resultado | Detalle |
| --- | --- | --- | --- | --- |
| T01 | C3, C4 | Consulta reconocida ("qué categorías tienen"): intención listar_categorias y respuesta con las categorías | PASA | HTTP 200, 3 categorías |
| T02 | C6 | El total de la categoría Anillos del chatbot coincide con la base de datos | PASA | chatbot 4, BD 4 |
| T03 | C3, C4 | Consulta por categoría ("qué anillos tienen"): intención productos_categoria y lista de anillos | PASA | HTTP 200, 4 productos |
| T04 | C6 | La lista incluye los anillos publicados y NO incluye el producto no publicado ni productos de otra categoría | PASA |  |
| T05 | C6 | La respuesta no muestra el stock exacto (solo disponible/agotado) | PASA |  |
| T06 | C3, C4 | Saludo ("hola"): responde con la bienvenida y sugerencias | PASA | intención Default Welcome Intent |
| T07 | C5 | Ayuda: el chatbot explica qué consultas puede atender | PASA |  |
| T08 | C3, C4, C6 | Producto existente y disponible: informa nombre, precio y que está disponible | PASA | Anillo Zafiro P210081 (Anillos): cuesta $ 250.000 y está disponible. |
| T09 | C6 | El precio que dice el chatbot coincide con el de la base de datos | PASA | BD $ 250.000 |
| T10 | C6 | Producto agotado: informa que está agotado | PASA | Anillo Agotado P210081 (Anillos): cuesta $ 180.000 y está agotado por ahora. |
| T11 | C4 | El nombre del producto se reconoce sin importar mayúsculas ni tildes | PASA | producto |
| T12 | C4 | Nombre ambiguo ("Anillo"): lista los productos que coinciden y pide el nombre completo, sin inventar | PASA | productos |
| T13 | Pruebas: producto inexistente | Producto inexistente: responde que no lo encontró y orienta al cliente (sin error) | PASA | producto_no_encontrado |
| T14 | C6 | Un producto NO publicado se trata como inexistente (no se filtra información) | PASA | producto_no_encontrado |
| T15 | Seguridad | Un nombre con comillas y código SQL no rompe nada: responde "no encontré" y la tabla productos sigue existiendo | PASA | HTTP 200 |
| T16 | C5 | Consulta de precio sin decir el producto: el chatbot pide el nombre | PASA | ¿De qué producto quieres saber el precio o la disponibilidad? |
| T17 | C5 | Consulta no reconocida: informa que no entendió y guía sobre qué puede preguntar | PASA | HTTP 200 |
| T18 | C5 | Intención que Dialogflow reconoce pero el sistema no soporta: también se orienta al cliente | PASA |  |
| T19 | C2 | Mensaje vacío: 400 con aviso, no se llama a Dialogflow | PASA | HTTP 400 |
| T20 | C2 | Mensaje demasiado largo: 400 | PASA | HTTP 400 |
| T21 | Seguridad | Identificador de sesión inválido: 400 | PASA | HTTP 400 |
| T22 | Errores | Cuerpo que no es JSON válido: error controlado (no se cae el servidor) | PASA | HTTP 400 |
| T23 | C2 | Mensaje que no es texto: 400 | PASA | HTTP 400 |
| T24 | Pruebas: manejo de errores | Si Dialogflow falla: 503 con mensaje amable y SIN filtrar detalles internos | PASA | HTTP 503 |
| T25 | Pruebas: manejo de errores | Sin credenciales de Dialogflow: 503 con mensaje amable (el chatbot no se cae) | PASA | HTTP 503 |
| R01 | C3 | Agente real de Dialogflow: "qué anillos tienen" → productos_categoria | PASA | devolvió "productos_categoria" |
| R02 | C3 | Agente real de Dialogflow: "qué categorías venden" → listar_categorias | PASA | devolvió "listar_categorias" |
| R03 | C3 | Agente real de Dialogflow: "cuánto cuesta el anillo solitario" → consultar_producto | PASA | devolvió "consultar_producto" |
| R04 | C3 | Agente real de Dialogflow: "ayuda" → ayuda_chatbot | PASA | devolvió "ayuda_chatbot" |
| R05 | C5 | Agente real de Dialogflow: "blablabla" → Default Fallback Intent | PASA | devolvió "Default Fallback Intent" |
| T26 | Seguridad | Límite de 30 mensajes por minuto: los mensajes de más reciben 429 | PASA | 22 bloqueados de 32 |
