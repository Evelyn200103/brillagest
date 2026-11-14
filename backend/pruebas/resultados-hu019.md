# Pruebas de la HU-019 — Consultar productos mediante el chatbot

- Fecha de ejecución: 14/11/2026, 6:20:38 p. m.
- Resumen: 23 pruebas, 23 pasan, 0 fallan.

| Prueba | Criterio | Descripción | Resultado | Detalle |
| --- | --- | --- | --- | --- |
| T01 | C1, C2 | El cliente consulta un producto en lenguaje natural y recibe respuesta | PASA | HTTP 200, tipo producto |
| T02 | C2 | El chatbot identifica la consulta como relacionada con productos (intención consultar_producto) | PASA | consultar_producto |
| T03 | C3, C4 | El precio de la respuesta es el de la base de datos | PASA | $ 90.000 |
| T04 | Pruebas: consistencia entre chatbot y catálogo | El producto del chatbot coincide con el del catálogo (nombre, precio y disponibilidad) | PASA | catálogo: AGOTADO, chatbot: Agotado |
| T05 | Frontend: navegación al producto | La respuesta trae el id del producto y con ese id el detalle del catálogo abre (200) | PASA | id 77 |
| T06 | C4 | Producto agotado: informa que está agotado | PASA | Dije Estrella H429692 (Dijes): cuesta $ 90.000 y está agotado por ahora. |
| T07 | C6 | La respuesta no incluye stock ni SKU | PASA |  |
| T08 | C2, C3 | El nombre se reconoce sin importar mayúsculas | PASA | producto |
| T09 | C3 | Se puede buscar por el material del producto (no solo por el nombre) | PASA | producto |
| T10 | Pruebas: consulta ambigua | Consulta ambigua ("Anillo"): lista varios productos para elegir, con su id | PASA | 5 productos |
| T11 | Frontend: navegación al producto | Cada producto de la lista ambigua abre su detalle en el catálogo | PASA |  |
| T12 | C6 | La lista ambigua no incluye productos no publicados | PASA |  |
| T13 | Pruebas: consulta ambigua | Si el cliente escribe el nombre exacto, responde ese producto aunque otro se parezca ("… Grande") | PASA | producto |
| T14 | Frontend: presentación de resultados | Con más de 8 coincidencias muestra solo 8 y avisa que hay varios | PASA | 8 mostrados |
| T15 | C5, Pruebas: producto inexistente | Producto inexistente: indica que no encontró información y orienta al cliente | PASA | producto_no_encontrado |
| T16 | C6 | Un producto no publicado se trata como inexistente (no se muestra información que no está disponible) | PASA | producto_no_encontrado |
| T17 | Seguridad | Texto con comillas y código SQL: responde "no encontré" y la tabla sigue existiendo | PASA | HTTP 200 |
| T18 | Seguridad | El comodín "%" no devuelve todo el catálogo | PASA | 0 productos |
| T19 | Pruebas: consistencia entre chatbot y catálogo | Los anillos que muestra el chatbot son los mismos que muestra el catálogo | PASA | 5 en el chat, 5 en el catálogo |
| T20 | Pruebas: manejo de errores | Si la base de datos falla: 503 con mensaje amable y sin detalles internos | PASA | HTTP 503 |
| R01 | C2 | Agente real: "precio del dije corazón" → consultar_producto con el nombre del producto | PASA | devolvió "consultar_producto", producto "dije corazón" |
| R02 | C2 | Agente real: "tienen disponible el reloj clásico" → consultar_producto con el nombre del producto | PASA | devolvió "consultar_producto", producto "el reloj clásico" |
| R03 | C2 | Agente real: "busco el anillo solitario" → consultar_producto con el nombre del producto | PASA | devolvió "consultar_producto", producto "anillo solitario" |
