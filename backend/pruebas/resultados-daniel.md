# Pruebas de las historias de usuario de Daniel Nova

Historias cubiertas: HU-005 (registrar entrada de inventario), HU-008 (consultar movimientos),
HU-011 (visualizar catálogo), HU-014 (consultar disponibilidad), HU-022 (iniciar sesión) y
HU-023 (gestionar usuarios).

## Datos de la ejecución

- Fecha de ejecución: 5/11/2026, 9:05:49 p. m.
- Ambiente: backend `http://localhost:4000` (Node v24.11.0, base de datos PostgreSQL del proyecto)
- Scripts ejecutados: `backend/pruebas/hu-daniel.js` (pruebas de API) y `backend/pruebas/unitarias-daniel.js` (pruebas unitarias con node:test)
- Sesiones usadas: administrador `admin` (TOKEN) y empleado `vendedora` (TOKEN)

- **Total de pruebas: 90** (63 de API y 27 unitarias)
- **Pasaron: 90**
- **Fallaron: 0**

| ID | Historia | Tipo | Descripción | HTTP esperado | HTTP obtenido | Resultado obtenido | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D05-01 | HU-005 | API | Entrada válida con token de administrador devuelve mensaje de confirmación | 201 | 201 | HTTP 201, "Entrada registrada correctamente" | PASA |
| D05-02 | HU-005 | API | El stock del producto subió exactamente la cantidad registrada (7) | — | — | stock antes 20, stock después 27 (diferencia 7) | PASA |
| D05-03 | HU-005 | API | El movimiento registrado aparece después en GET /api/movimientos | 200 | 200 | HTTP 200, lista con 23 elemento(s) — el movimiento 34 aparece en la lista | PASA |
| D05-04 | HU-005 | API | Entrada con cantidad igual a cero | 400 | 400 | HTTP 400, error: "La cantidad debe ser un número entero mayor que cero" | PASA |
| D05-05 | HU-005 | API | Entrada con cantidad negativa (-3) | 400 | 400 | HTTP 400, error: "La cantidad debe ser un número entero mayor que cero" | PASA |
| D05-06 | HU-005 | API | Entrada con cantidad decimal (2.5) | 400 | 400 | HTTP 400, error: "La cantidad debe ser un número entero mayor que cero" | PASA |
| D05-07 | HU-005 | API | Entrada con cantidad como texto ("cinco") | 400 | 400 | HTTP 400, error: "La cantidad debe ser un número entero mayor que cero" | PASA |
| D05-08 | HU-005 | API | Entrada sobre un producto inexistente (id 999999) | 404 | 404 | HTTP 404, error: "Producto no encontrado" | PASA |
| D05-09 | HU-005 | API | Entrada sin token de sesión | 401 | 401 | HTTP 401, error: "No autorizado. Falta el token de sesión." | PASA |
| D05-10 | HU-005 | API | Entrada con token de empleado (el empleado sí tiene permiso de registrar movimientos) | 201 | 201 | HTTP 201, "Entrada registrada correctamente" | PASA |
| D05-11 | HU-005 | API | La entrada del empleado también suma al stock (2 unidades) | — | — | stock antes 27, stock después 29 | PASA |
| D05-12 | HU-005 | API | Una salida de 9 unidades devuelve el stock al valor que tenía antes de las pruebas | 201 | 201 | HTTP 201, "Salida registrada correctamente" — stock original 20, stock actual 20 | PASA |
| D08-01 | HU-008 | API | GET /api/movimientos con token de administrador devuelve una lista no vacía | 200 | 200 | HTTP 200, lista con 25 elemento(s) | PASA |
| D08-02 | HU-008 | API | Cada movimiento trae los campos producto, sku, tipo, cantidad, responsable y fecha (creado_en) | — | — | 25 movimientos revisados; 0 sin alguno de los campos; 0 con producto/sku/tipo/cantidad/fecha vacíos | PASA |
| D08-03 | HU-008 | API | Los movimientos registrados por esta prueba traen el nombre del responsable | — | — | 3 movimientos de esta prueba con responsable: Administrador, Leidys Duran Rojas. Observación: 9 movimientos históricos anteriores tienen responsable nulo | PASA |
| D08-04 | HU-008 | API | Filtrar por tipo=ENTRADA: todos los movimientos son de tipo ENTRADA | 200 | 200 | HTTP 200, lista con 13 elemento(s) — 13 movimientos, todos ENTRADA: true | PASA |
| D08-05 | HU-008 | API | Filtrar por tipo=SALIDA: todos los movimientos son de tipo SALIDA | 200 | 200 | HTTP 200, lista con 12 elemento(s) — 12 movimientos, todos SALIDA: true | PASA |
| D08-06 | HU-008 | API | Filtrar con un tipo inválido (tipo=DEVOLUCION) | 400 | 400 | HTTP 400, error: "El tipo debe ser ENTRADA o SALIDA" | PASA |
| D08-07 | HU-008 | API | Filtrar por producto_id válido (1): todos los movimientos son de ese producto | 200 | 200 | HTTP 200, lista con 9 elemento(s) — 9 movimientos del producto PROD-0001 | PASA |
| D08-08 | HU-008 | API | Filtrar con un producto_id inválido (producto_id=abc) | 400 | 400 | HTTP 400, error: "Producto inválido" | PASA |
| D08-09 | HU-008 | API | Consultar un producto sin movimientos (PROD-0004) devuelve una lista vacía | 200 | 200 | HTTP 200, lista con 0 elemento(s) | PASA |
| D08-10 | HU-008 | API | GET /api/movimientos sin token de sesión | 401 | 401 | HTTP 401, error: "No autorizado. Falta el token de sesión." | PASA |
| D08-11 | HU-008 | API | GET /api/movimientos con token de empleado | 200 | 200 | HTTP 200, lista con 25 elemento(s) | PASA |
| D11-01 | HU-011 | API | GET /api/catalogo sin token (página web pública) | 200 | 200 | HTTP 200, lista con 9 elemento(s) | PASA |
| D11-02 | HU-011 | API | Ningún producto del catálogo expone el campo stock | — | — | 9 productos revisados, 0 con el campo stock. Campos devueltos: id, sku, nombre, categoria, material, marca, tipo, peso, precio, disponible, disponibilidad, estado | PASA |
| D11-03 | HU-011 | API | Todos los productos del catálogo tienen publicado = true en la base de datos | — | — | 9 productos verificados en la base de datos, 0 con publicado distinto de true | PASA |
| D11-04 | HU-011 | API | La cantidad de productos del catálogo coincide con la consulta directa a la base de datos | — | — | catálogo: 9 productos, base de datos (publicado = true): 9 | PASA |
| D11-05 | HU-011 | API | GET /api/catalogo/categorias sin token devuelve las categorías con su total | 200 | 200 | HTTP 200, lista con 11 elemento(s) — 11 categorías; ejemplo: Anillos=6, Pulseras=0, Cadenas=0 | PASA |
| D11-06 | HU-011 | API | GET /api/catalogo/categorias/Anillos/productos sin token | 200 | 200 | HTTP 200 — categoría "Anillos" con 6 productos | PASA |
| D11-07 | HU-011 | API | Consultar una categoría que no existe (Sombreros) | 404 | 404 | HTTP 404, error: "La categoría solicitada no existe" | PASA |
| D11-08 | HU-011 | API | Búsqueda con q que no coincide con nada devuelve una lista vacía | 200 | 200 | HTTP 200, lista con 0 elemento(s) | PASA |
| D14-01 | HU-014 | API | Disponibilidad de un producto publicado con stock mayor que cero: disponible = true y estado "Disponible" | 200 | 200 | HTTP 200 — disponible = true, estado = "Disponible", disponibilidad = "DISPONIBLE" | PASA |
| D14-02 | HU-014 | API | La respuesta de disponibilidad no expone el campo stock | — | — | campos devueltos: id, sku, nombre, categoria, precio, disponible, disponibilidad, estado, consultado_en | PASA |
| D14-03 | HU-014 | API | Disponibilidad con un id inválido (abc) | 400 | 400 | HTTP 400, error: "El identificador del producto no es válido" | PASA |
| D14-04 | HU-014 | API | Disponibilidad de un id inexistente (999999) | 404 | 404 | HTTP 404, error: "Producto no encontrado" | PASA |
| D14-05 | HU-014 | API | Registrar una salida de 6 unidades deja el stock de PROD-0003 en cero | 201 | 201 | HTTP 201, "Salida registrada correctamente" — stock tras la salida: 0 | PASA |
| D14-06 | HU-014 | API | Con el stock en cero la disponibilidad pasa a disponible = false y estado "Agotado" | 200 | 200 | HTTP 200 — disponible = false, estado = "Agotado" | PASA |
| D14-07 | HU-014 | API | Registrar una entrada de 6 unidades devuelve el stock de PROD-0003 a su valor original | 201 | 201 | HTTP 201, "Entrada registrada correctamente" — stock tras la entrada: 6 (original 6) | PASA |
| D14-08 | HU-014 | API | Con el stock repuesto la disponibilidad vuelve a disponible = true y estado "Disponible" | 200 | 200 | HTTP 200 — disponible = true, estado = "Disponible" | PASA |
| D22-01 | HU-022 | API | Login correcto devuelve un token de sesión | 200 | 200 | HTTP 200 — devuelve TOKEN y los datos del usuario (sin contraseña) | PASA |
| D22-02 | HU-022 | API | Login con contraseña incorrecta | 401 | 401 | HTTP 401, error: "Usuario o contraseña incorrectos." | PASA |
| D22-03 | HU-022 | API | Login con un usuario inexistente | 401 | 401 | HTTP 401, error: "Usuario o contraseña incorrectos." | PASA |
| D22-04 | HU-022 | API | El mensaje de error es el mismo para contraseña incorrecta y usuario inexistente (no revela qué usuarios existen) | — | — | ambos responden: "Usuario o contraseña incorrectos." | PASA |
| D22-05 | HU-022 | API | Login con los campos vacíos | 400 | 400 | HTTP 400, error: "El usuario y la contraseña son obligatorios." | PASA |
| D22-06 | HU-022 | API | Ruta protegida (GET /api/productos) sin token | 401 | 401 | HTTP 401, error: "No autorizado. Falta el token de sesión." | PASA |
| D22-07 | HU-022 | API | Ruta protegida (GET /api/productos) con token válido | 200 | 200 | HTTP 200, lista con 9 elemento(s) | PASA |
| D22-08 | HU-022 | API | Ruta pública (GET /api/catalogo) sin token | 200 | 200 | HTTP 200, lista con 9 elemento(s) | PASA |
| D22-09 | HU-022 | API | La respuesta del login no incluye password_hash ni la contraseña | — | — | campos del usuario devueltos: id, usuario, nombre, rol, permisos | PASA |
| D23-01 | HU-023 | API | GET /api/usuarios con token de administrador | 200 | 200 | HTTP 200, lista con 9 elemento(s) | PASA |
| D23-02 | HU-023 | API | Ningún usuario de la lista trae password_hash | — | — | 9 usuarios revisados, 0 con contraseña. Campos devueltos: id, usuario, nombre, rol, activo, creado_en | PASA |
| D23-03 | HU-023 | API | Crear un usuario nuevo (daniel_prueba_727786) | 201 | 201 | HTTP 201 — usuario creado con id 11, rol empleado, activo true | PASA |
| D23-04 | HU-023 | API | Crear el mismo usuario otra vez (nombre de usuario repetido) | 409 | 409 | HTTP 409, error: "Ya existe un usuario con ese nombre de usuario." | PASA |
| D23-05 | HU-023 | API | Crear un usuario con el cuerpo vacío | 400 | 400 | HTTP 400, error: "Faltan campos obligatorios" | PASA |
| D23-06 | HU-023 | API | Crear un usuario con una contraseña de menos de 8 caracteres | 400 | 400 | HTTP 400, error: "La contraseña debe tener al menos 8 caracteres." | PASA |
| D23-07 | HU-023 | API | Crear un usuario con un rol que no existe (gerente) | 400 | 400 | HTTP 400, error: "El rol debe ser administrador o empleado." | PASA |
| D23-08 | HU-023 | API | Actualizar el nombre de un usuario | 200 | 200 | HTTP 200 — nombre actualizado a "Usuario de prueba Daniel (editado)" | PASA |
| D23-09 | HU-023 | API | Actualizar un usuario con un id que no existe (999999) | 404 | 404 | HTTP 404, error: "El usuario no existe." | PASA |
| D23-10 | HU-023 | API | El administrador intenta quitarse a sí mismo el rol de administrador | 400 | 400 | HTTP 400, error: "Un administrador no puede quitarse a si mismo el rol de administrador." | PASA |
| D23-11 | HU-023 | API | El administrador intenta desactivarse a sí mismo | 400 | 400 | HTTP 400, error: "Un administrador no puede desactivarse a si mismo." | PASA |
| D23-12 | HU-023 | API | Desactivar a otro usuario deja activo = false | 200 | 200 | HTTP 200 — activo = false | PASA |
| D23-13 | HU-023 | API | El usuario desactivado intenta iniciar sesión | 403 | 403 | HTTP 403, error: "El usuario está inactivo. Contacte al administrador." | PASA |
| D23-14 | HU-023 | API | Reactivar al usuario desactivado | 200 | 200 | HTTP 200 — activo = true | PASA |
| D23-15 | HU-023 | API | GET /api/usuarios con token de empleado | 403 | 403 | HTTP 403, error: "No tiene permisos para realizar esta acción." | PASA |
| U-01 | HU-014 | Unitaria | calcularDisponibilidad con stock mayor que cero devuelve DISPONIBLE | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-02 | HU-014 | Unitaria | calcularDisponibilidad con stock en cero devuelve AGOTADO | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-03 | HU-014 | Unitaria | calcularDisponibilidad con stock nulo (null) devuelve AGOTADO | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-04 | HU-014 | Unitaria | calcularDisponibilidad con stock indefinido (undefined) devuelve AGOTADO | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-05 | HU-014 | Unitaria | calcularDisponibilidad con stock como texto no numérico ("abc") devuelve AGOTADO | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-06 | HU-014 | Unitaria | calcularDisponibilidad con el valor frontera de una unidad devuelve DISPONIBLE | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-07 | HU-014 | Unitaria | calcularDisponibilidad con stock negativo (-3) devuelve AGOTADO | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-08 | HU-014 | Unitaria | calcularDisponibilidad acepta el stock escrito como número en texto ("4") | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-09 | HU-014 | Unitaria | conDisponibilidad elimina el campo stock del objeto devuelto | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-10 | HU-014 | Unitaria | conDisponibilidad conserva los demás campos del producto | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-11 | HU-014 | Unitaria | conDisponibilidad agrega disponible, disponibilidad y estado según el stock | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-12 | HU-014 | Unitaria | conDisponibilidad no modifica el objeto original (función pura) | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-13 | HU-014 | Unitaria | conDisponibilidad con una fila sin stock la trata como agotada | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-14 | HU-011 | Unitaria | formatoPrecio (página web) muestra el precio en pesos sin decimales | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-15 | HU-011 | Unitaria | formatoPrecio (página web) con cero muestra $ 0 | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-16 | HU-011 | Unitaria | formatoPrecio (página web) redondea y no deja decimales | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-17 | HU-011 | Unitaria | formatoPrecio (página web) acepta el precio escrito como texto | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-18 | HU-011 | Unitaria | formatoPrecio (página web) con un valor no numérico devuelve un guion | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-19 | Formato (app) | Unitaria | formatoPrecio muestra el precio en pesos sin decimales | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-20 | Formato (app) | Unitaria | formatoPrecio con un valor no numérico devuelve una raya | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-21 | Formato (app) | Unitaria | estadoStock usa el mismo nivel mínimo que el backend | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-22 | Formato (app) | Unitaria | estadoStock con stock en cero devuelve Agotado | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-23 | Formato (app) | Unitaria | estadoStock en el valor frontera de una unidad devuelve Stock bajo | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-24 | Formato (app) | Unitaria | estadoStock en el nivel mínimo devuelve Stock bajo y una unidad más Disponible | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-25 | Formato (app) | Unitaria | estadoStock devuelve también la clase de color del estado | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-26 | Formato (app) | Unitaria | iniciales toma la primera letra de los dos primeros nombres | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |
| U-27 | Formato (app) | Unitaria | iniciales con un texto vacío o solo espacios devuelve una cadena vacía | — | — | La función devolvió el valor esperado (assert sin errores) | PASA |

## Pruebas que fallaron

Ninguna: las 90 pruebas pasaron.

## Notas y observaciones

- A "vendedora" se le puso una contraseña temporal para las pruebas y al final se restauró su contraseña original.
- Observación de datos (no es una falla del backend): 9 de los 25 movimientos que ya estaban en la base de datos tienen el responsable nulo. Son movimientos antiguos, cargados antes de que los movimientos guardaran automáticamente el usuario que los registra; los movimientos nuevos sí traen el nombre del responsable (D08-03).
- No se modificó ningún archivo del backend fuera de backend/pruebas: las pruebas solo consumen la API y leen la base de datos.
- Las pruebas unitarias leen (sin modificarlos) los módulos de formato de app-inventario y pagina-web con import() dinámico.

## Limpieza de la base de datos

El script deja la base de datos como estaba antes de ejecutarlo:

- 5 movimiento(s) de prueba eliminados
- producto 1: stock devuelto a 20
- producto 4: stock devuelto a 6
- 1 usuario(s) de prueba eliminados
- usuario "vendedora": contraseña original restaurada y queda activo

En este archivo nunca se escriben tokens reales: donde iría un token de sesión aparece la palabra TOKEN.
