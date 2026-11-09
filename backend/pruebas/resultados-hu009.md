# Pruebas de la HU-009 — Alertas de stock bajo

- Fecha de ejecución: 8/11/2026, 1:09:44 p. m.
- Backend probado: `http://localhost:4000`
- Resumen: 17 pruebas, 17 pasan, 0 fallan.

| Prueba | Criterio | Descripción | Resultado | Detalle |
| --- | --- | --- | --- | --- |
| T01 | C1 | La consulta de alertas responde 200 e informa el nivel mínimo y el total de alertas | PASA | nivel mínimo 5, total 5 |
| T02 | C1, C5 | El mismo nivel mínimo se usa en las existencias: en el límite es STOCK_BAJO y por encima es DISPONIBLE | PASA | límite: STOCK_BAJO, encima: DISPONIBLE |
| T03 | C2, C3 | Producto por debajo del límite (stock 4) aparece con estado STOCK_BAJO | PASA | estado STOCK_BAJO |
| T04 | C4 | La alerta permite identificar el producto: trae id, SKU, nombre, categoría y stock | PASA | PROD-0011 — PRUEBA HU-009 bajo 376318 — stock 4 |
| T05 | C2 | Producto exactamente en el límite (stock 5) aparece con estado STOCK_BAJO | PASA | estado STOCK_BAJO |
| T06 | C2, C3 | Producto agotado (stock 0) aparece con estado AGOTADO | PASA | estado AGOTADO |
| T07 | C3 | Las alertas se ordenan de menor a mayor stock (primero el agotado) | PASA | posiciones: agotado 0, bajo 3, límite 4 |
| T08 | C5 | Producto por encima del límite (stock 6) no genera alerta | PASA | no aparece |
| T09 | C6 | Entrada que sube el producto bajo de 4 a 6: la alerta desaparece | PASA | entrada HTTP 201 |
| T10 | C6 | Salida que baja el producto de 6 a 5: aparece la alerta STOCK_BAJO | PASA | salida HTTP 201 |
| T11 | C6 | Salida que deja el producto en 0: el estado de la alerta cambia a AGOTADO | PASA | estado AGOTADO |
| T12 | C6 | Entrada al producto agotado (+8): la alerta desaparece | PASA | entrada HTTP 201 |
| T13 | Pruebas: usuario autorizado | El administrador consulta las alertas: 200 | PASA | HTTP 200 |
| T14 | Pruebas: usuario autorizado | El empleado consulta las alertas: 200 | PASA | HTTP 200 |
| T15 | Pruebas: usuario no autorizado | Sin iniciar sesión (sin token): 401 | PASA | HTTP 401 |
| T16 | Pruebas: usuario no autorizado | Con un token inventado: 401 | PASA | HTTP 401 |
| T17 | Pruebas: usuario no autorizado | Un usuario desactivado ya no puede consultar las alertas: 401 | PASA | HTTP 401 |
