# Pruebas de la HU-012 — Consultar productos por categoría

- Fecha de ejecución: 8/11/2026, 5:44:54 p. m.
- Backend probado: `http://localhost:4000`
- Resumen: 13 pruebas, 13 pasan, 0 fallan.

| Prueba | Criterio | Descripción | Resultado | Detalle |
| --- | --- | --- | --- | --- |
| T01 | C1 | Sin iniciar sesión, la consulta de categorías responde 200 con las 11 categorías del catálogo, cada una con su total | PASA | HTTP 200, 11 categorías |
| T02 | C1, C6 | El total de "Aretes largos" sube en 2 al crear 2 productos publicados (el no publicado no cuenta) | PASA | antes 0, después 2 |
| T03 | C2, C3 | Consultar "Aretes largos" responde 200 con la categoría, el total y la lista de productos | PASA | HTTP 200, total 2 |
| T04 | C3, C6 | La lista incluye los dos productos de prueba publicados | PASA | 2 productos en la lista |
| T05 | C4 | Verificación de productos correspondientes: todos los productos de la lista pertenecen a la categoría | PASA | 2 de 2 |
| T06 | C4 | El producto de prueba de otra categoría (Anillos) no aparece en la lista | PASA |  |
| T07 | C6 | El producto no publicado no aparece en la lista | PASA |  |
| T08 | C3, C6 | Cada producto trae su información (id, SKU, nombre, material, precio) y su disponibilidad, sin mostrar el stock | PASA | A: AGOTADO, B: DISPONIBLE |
| T09 | C1, C3 | El total de la lista de categorías coincide con el total de la consulta por categoría | PASA | 2 y 2 |
| T10 | C2 | La categoría se reconoce sin importar mayúsculas o minúsculas ("aretes largos") | PASA | HTTP 200 |
| T11 | C5 | Categoría sin productos ("Pulseras"): responde 200 con total 0 y lista vacía | PASA | HTTP 200 |
| T12 | Pruebas: categoría inexistente | Categoría inexistente ("Sombreros"): responde 404 "La categoría solicitada no existe" | PASA | HTTP 404 |
| T13 | Pruebas: categoría inexistente | Un nombre con comillas y código SQL se trata como categoría inexistente: 404 | PASA | HTTP 404 |
