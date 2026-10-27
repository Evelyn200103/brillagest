# Resultados de las pruebas automáticas de la HU-017

- Fecha de ejecución: 27/10/2026, 5:38:34 p. m.
- API probada: http://localhost:4000
- Resumen: 30 pruebas: 30 pasan, 0 fallan.
- Limpieza: El producto de prueba (id 11) no se pudo eliminar porque tiene movimientos; quedó oculto de la página web.

| ID | Prueba | Esperado | Obtenido | Resultado |
| --- | --- | --- | --- | --- |
| C1 | La página web consulta el catálogo sin iniciar sesión | HTTP 200 | HTTP 200 | Pasa |
| C2 | Un producto registrado en el inventario aparece en el catálogo | HTTP 200 | HTTP 200 | Pasa |
| C3 | El catálogo muestra los datos guardados en la base de datos | HTTP 200 | HTTP 200 | Pasa |
| C4 | El catálogo no muestra el stock exacto | HTTP 200 | HTTP 200 | Pasa |
| C5 | El producto aparece en su categoría | HTTP 200 | HTTP 200 | Pasa |
| C6 | El conteo de la categoría aumenta en 1 | HTTP 200 | HTTP 200 | Pasa |
| C7 | El detalle del producto responde en la página web | HTTP 200 | HTTP 200 | Pasa |
| S1 | Se actualiza el precio desde el inventario | HTTP 200 | HTTP 200 | Pasa |
| S2 | El catálogo muestra el precio nuevo | HTTP 200 | HTTP 200 | Pasa |
| S3 | Con existencias, el producto aparece como Disponible | HTTP 200 | HTTP 200 | Pasa |
| S4 | Se registra una salida de todas las unidades | HTTP 201 | HTTP 201 | Pasa |
| S5 | Sin existencias, el catálogo lo muestra como Agotado | HTTP 200 | HTTP 200 | Pasa |
| S6 | El detalle también lo muestra como Agotado | HTTP 200 | HTTP 200 | Pasa |
| S7 | La consulta de disponibilidad también lo muestra como Agotado | HTTP 200 | HTTP 200 | Pasa |
| S8 | Se registra una entrada de 3 unidades | HTTP 201 | HTTP 201 | Pasa |
| S9 | Con la entrada, vuelve a aparecer como Disponible | HTTP 200 | HTTP 200 | Pasa |
| P1 | Sin iniciar sesión no se puede ocultar un producto | HTTP 401 | HTTP 401 | Pasa |
| P2 | Un valor de publicación inválido se rechaza | HTTP 400 | HTTP 400 | Pasa |
| P3 | El administrador oculta el producto de la página web | HTTP 200 | HTTP 200 | Pasa |
| P4 | El producto oculto no aparece en el catálogo | HTTP 200 | HTTP 200 | Pasa |
| P5 | El producto oculto no aparece en su categoría | HTTP 200 | HTTP 200 | Pasa |
| P6 | El conteo de la categoría vuelve al valor inicial | HTTP 200 | HTTP 200 | Pasa |
| P7 | El detalle de un producto oculto responde 404 | HTTP 404 | HTTP 404 | Pasa |
| P8 | La disponibilidad de un producto oculto responde 404 | HTTP 404 | HTTP 404 | Pasa |
| P9 | El inventario sí sigue viendo el producto oculto | HTTP 200 | HTTP 200 | Pasa |
| P10 | Al publicarlo de nuevo, vuelve a aparecer en el catálogo | HTTP 200 | HTTP 200 | Pasa |
| E1 | Detalle con un identificador inválido | HTTP 400 | HTTP 400 | Pasa |
| E2 | Detalle de un producto que no existe | HTTP 404 | HTTP 404 | Pasa |
| E3 | Productos de una categoría que no existe | HTTP 404 | HTTP 404 | Pasa |
| E4 | Disponibilidad con un identificador inválido | HTTP 400 | HTTP 400 | Pasa |
