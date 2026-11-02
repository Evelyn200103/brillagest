# Pruebas de la HU-025 — Proteger la información de autenticación

- Fecha de ejecución: 1/11/2026, 9:17:39 p. m.
- Backend probado: `https://brillagest.onrender.com`
- Resumen: 31 pruebas, 31 pasan, 0 fallan, 1 omitidas.

| Prueba | Criterio | Descripción | Resultado | Detalle |
| --- | --- | --- | --- | --- |
| A1 | Criterio 1 | La tabla usuarios solo tiene la columna password_hash (ninguna columna de contraseña en texto plano) | PASA | columnas: id, usuario, nombre, password_hash, rol, activo, creado_en |
| A2 | Criterio 2 | Los 8 usuarios guardan un hash bcrypt válido (empieza con $2b$ y mide 60 caracteres) | PASA |  |
| A3 | Criterio 2 | Todos los hashes usan un costo bcrypt de 10 o más | PASA | costo mínimo: 10 |
| A4 | Criterio 1 | El hash guardado es distinto de la contraseña escrita | PASA |  |
| A5 | Criterio 2 | Dos usuarios con la misma contraseña tienen hashes distintos (cada hash lleva su propia sal) | PASA |  |
| A6 | Criterio 2 | El hash guardado sí corresponde a la contraseña (bcrypt.compare) | PASA |  |
| B1 | Criterio 2 | La respuesta del login no contiene hash ni la contraseña | PASA |  |
| B2 | Criterio 2 | La lista de usuarios no contiene hashes ni contraseñas | PASA |  |
| B3 | Criterio 2 | El perfil no contiene hash ni contraseña | PASA |  |
| C1 | Pruebas | Credenciales incorrectas (contraseña mala) | PASA | HTTP 401 |
| C2 | Pruebas | Credenciales incorrectas (usuario que no existe) | PASA | HTTP 401 |
| C3 | Pruebas | El mensaje de error es el mismo para usuario inexistente y contraseña mala (no revela qué usuarios existen) | PASA |  |
| C4 | Pruebas | Login con campos vacíos | PASA | HTTP 400 |
| D1 | Criterio 4 | Sin autenticación: GET /api/productos | PASA | HTTP 401 |
| D2 | Criterio 4 | Sin autenticación: GET /api/existencias | PASA | HTTP 401 |
| D3 | Criterio 4 | Sin autenticación: GET /api/movimientos | PASA | HTTP 401 |
| D4 | Criterio 4 | Sin autenticación: GET /api/reportes/inventario | PASA | HTTP 401 |
| D5 | Criterio 4 | Sin autenticación: GET /api/usuarios | PASA | HTTP 401 |
| D6 | Criterio 4 | Sin autenticación: POST /api/movimientos/salida | PASA | HTTP 401 |
| D7 | Criterio 4 | Token inventado | PASA | HTTP 401 |
| D8 | Criterio 4 | Token alterado a mano para "hacerse" administrador | PASA | HTTP 401 |
| D9 | Criterio 4 | Token firmado con otra llave | PASA | HTTP 401 |
| D10 | Criterio 4 | Token sin firma (alg "none") | PASA | HTTP 401 |
| D11 | Criterio 4 | Token vencido | OMITIDA | omitida: solo se prueba contra el backend local |
| D12 | Pruebas | Acceso a un recurso sin permisos (empleado pide la lista de usuarios) | PASA | HTTP 403 |
| D13 | Criterio 4 | El catálogo público sigue abierto sin token | PASA | HTTP 200 |
| E1 | Criterio 3 | La respuesta incluye X-Content-Type-Options: nosniff | PASA |  |
| E2 | Criterio 3 | Las respuestas del login no se guardan en caché (Cache-Control: no-store) | PASA |  |
| E3 | Criterio 3 | La respuesta del servidor incluye Strict-Transport-Security (HSTS) | PASA | max-age=31536000; includeSubDomains |
| E4 | Infraestructura | Certificado SSL/TLS de brillagest.onrender.com válido y confiable | PASA | vence Dec 20 23:04:28 2026 GMT |
| E5 | Infraestructura | El certificado no vence en los próximos 15 días | PASA | 48 días restantes |
| E6 | Criterio 3 | Entrar por http:// redirige a https:// | PASA | HTTP 302 |
