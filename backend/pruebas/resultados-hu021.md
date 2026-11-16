# Pruebas de la HU-021 — Integrar chatbot con la página web

- Fecha de ejecución: 15/11/2026, 8:08:42 p. m.
- Resumen: 22 pruebas, 22 pasan, 0 fallan.

| Prueba | Criterio | Descripción | Resultado | Detalle |
| --- | --- | --- | --- | --- |
| T01 | C1, C2 | El cliente inicia la conversación y recibe la bienvenida | PASA | HTTP 200 |
| T02 | C3 | Dialogflow recibe el texto exacto del cliente (sin espacios sobrantes, con tildes y ñ) y el id de la sesión | PASA | "¿Cuánto cuesta la cadena? Ñandú" |
| T03 | C4 | La respuesta tiene la forma que espera la página (texto, intención y tipo) | PASA | intencion,tipo,respuesta,datos,sugerencias |
| T04 | C4 | La respuesta de un producto trae lo que la página necesita para la tarjeta (id, nombre, precio y disponibilidad) | PASA |  |
| T05 | Pruebas: múltiples consultas | Seis consultas seguidas en la misma conversación: cada una recibe su respuesta correcta | PASA | 6 de 6 con HTTP 200 |
| T06 | C3 | Todas las consultas de una conversación viajan con el mismo id de sesión | PASA |  |
| T07 | Pruebas: múltiples consultas | Cinco clientes consultan al mismo tiempo: todos reciben su propia respuesta sin mezclarse | PASA | 5 de 5 con HTTP 200 |
| T08 | C3 | Cada cliente usa su propia sesión en Dialogflow | PASA | 5 sesiones |
| T09 | C5, Pruebas: integración con el resto de la página | El catálogo, las categorías, el detalle y la disponibilidad siguen funcionando con el chatbot integrado | PASA | 200, 200, 200, 200, 200 |
| T10 | C5 | Abrir la ruta del chatbot con GET no rompe el servidor (404/405) y el catálogo sigue respondiendo | PASA | HTTP 404 |
| T11 | C6, Pruebas: error de comunicación | Si Dialogflow falla: 503 con mensaje amable y sin detalles internos | PASA | HTTP 503 |
| T12 | C5, C6 | Mientras el chatbot falla, el catálogo de la página sigue funcionando | PASA | HTTP 200 |
| T13 | C6, Pruebas: error de comunicación | Si Dialogflow no responde, la API corta la espera y avisa (503) en vez de quedarse cargando | PASA | HTTP 503 en 306 ms (límite de prueba 300 ms) |
| T14 | C6 | Después de un error, el siguiente mensaje funciona con normalidad | PASA | HTTP 200 |
| T15 | C6 | Sin credenciales de Dialogflow en el servidor: 503 con mensaje amable (el chatbot no tumba la página) | PASA | HTTP 503 |
| T16 | C6 | Mensaje vacío, demasiado largo, sesión inválida o JSON dañado: error 4xx claro y el servidor sigue vivo | PASA | 400, 400, 400, 400 |
| T17 | C6 | Después de los mensajes inválidos, un mensaje correcto se responde bien | PASA |  |
| R01 | C3, C4 | Agente real, punta a punta: "hola" responde la bienvenida | PASA | HTTP 200, tipo texto |
| R02 | C3, C4 | Agente real, punta a punta: "qué categorías tienen" lista las categorías | PASA | HTTP 200, tipo categorias |
| R03 | C3, C4 | Agente real, punta a punta: "blablabla" orienta al cliente | PASA | HTTP 200, tipo no_entendido |
| T18 | C6 | Si alguien envía demasiados mensajes (más de 30 por minuto), recibe 429 con un aviso | PASA | 2 bloqueados de 32 |
| T19 | C5 | Aunque el chatbot bloquee a una IP, el catálogo sigue respondiendo a esa misma IP | PASA |  |
