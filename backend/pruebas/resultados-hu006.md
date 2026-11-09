# Pruebas de la HU-006 — Registrar salida de inventario

- Fecha de ejecución: 8/11/2026, 12:46:35 p. m.
- Backend probado: `http://localhost:4000`
- Resumen: 23 pruebas, 23 pasan, 0 fallan.

| Prueba | Criterio | Descripción | Resultado | Detalle |
| --- | --- | --- | --- | --- |
| T01 | C1, C2, C5, C7 | Salida válida de 3 unidades (stock 10): responde 201 y confirma la operación | PASA | HTTP 201 |
| T02 | C6, C7 | La respuesta trae el nuevo stock del producto (7) | PASA | stock 7 |
| T03 | C6 | Verificación del stock después de la operación: las existencias muestran 7 | PASA | existencias: 7 |
| T04 | C5 | El movimiento queda guardado como SALIDA, con producto, cantidad y el usuario que la hizo | PASA | tipo SALIDA, cantidad 3 |
| T05 | C8 | El movimiento aparece en el historial (/api/movimientos) con el nombre de quien lo registró | PASA | responsable: Empleado HU-006 984709 |
| T06 | C5 | La observación opcional se guarda junto con el movimiento | PASA | HTTP 201 |
| T07 | C4, C7 | Salida mayor al stock (6 con stock 5): responde 400 e informa el stock disponible | PASA | HTTP 400: Stock insuficiente. Disponible: 5 |
| T08 | C4, C6 | La salida rechazada no cambia el stock ni crea un movimiento | PASA | stock 5 |
| T09 | C4, C6 | Salida de todo el stock disponible (5): responde 201 y el stock queda en 0 | PASA | HTTP 201 |
| T10 | C4 | Salida con el producto agotado (stock 0): responde 400 "Stock insuficiente. Disponible: 0" | PASA | HTTP 400 |
| T11 | C3, C7 | Salida con cantidad cero: responde 400 con el mensaje de validación | PASA | HTTP 400 |
| T12 | C3, C7 | Salida con cantidad negativa (-2): responde 400 con el mensaje de validación | PASA | HTTP 400 |
| T13 | C3, C7 | Salida con cantidad decimal (1.5): responde 400 con el mensaje de validación | PASA | HTTP 400 |
| T14 | C3, C7 | Salida con cantidad con texto ("abc"): responde 400 con el mensaje de validación | PASA | HTTP 400 |
| T15 | C3 | Salida sin indicar la cantidad: responde 400 | PASA | HTTP 400 |
| T16 | C1 | Producto inexistente: responde 404 "Producto no encontrado" | PASA | HTTP 404 |
| T17 | C1 | Producto inválido ("abc"): responde 400 "Producto inválido" | PASA | HTTP 400 |
| T18 | C1 | Salida sin indicar el producto: responde 400 | PASA | HTTP 400 |
| T19 | C5, C6 | Ninguna de las peticiones inválidas creó movimientos ni cambió el stock | PASA | movimientos: 3, stock: 0 |
| T20 | C1, C5 | El administrador también puede registrar una salida y queda registrado como responsable | PASA | HTTP 201 |
| T21 | Pruebas (usuario sin permisos) | Sin iniciar sesión (sin token): responde 401 | PASA | HTTP 401 |
| T22 | Pruebas (usuario sin permisos) | Con un token inventado: responde 401 | PASA | HTTP 401 |
| T23 | Pruebas (usuario sin permisos) | Un usuario desactivado ya no puede registrar salidas: responde 401 | PASA | HTTP 401 |
