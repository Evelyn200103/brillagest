# Pruebas HTTP de la HU-022 (iniciar sesión) y la HU-023 (gestionar usuarios)

- Fecha de ejecución: 26 de octubre de 2026
- Backend: `node index.js` en `http://localhost:4000`
- Usuario administrador: `admin`
- Usuario empleado creado en la prueba H: `vendedora` (id 2)
- En este documento la palabra `TOKEN` reemplaza siempre al token real de sesión.
  `TOKEN` es el token del administrador (prueba A) y `TOKEN` en las pruebas R y
  siguientes indicadas es el token de la vendedora (prueba Q).

## Resumen

22 pruebas ejecutadas, 22 con el código HTTP esperado, 0 fallidas.

## Tabla de resultados

| Prueba | Descripción | HTTP esperado | HTTP obtenido | Resultado |
| --- | --- | --- | --- | --- |
| A | Iniciar sesión con `admin` y la contraseña correcta; devuelve token | 200 | 200 | PASA |
| B | Iniciar sesión con `admin` y una contraseña incorrecta | 401 | 401 | PASA |
| C | Iniciar sesión con un usuario que no existe | 401 | 401 | PASA |
| D | Iniciar sesión con usuario y contraseña vacíos | 400 | 400 | PASA |
| E | Consultar `/api/productos` sin token | 401 | 401 | PASA |
| F | Consultar `/api/productos` con el token del administrador | 200 | 200 | PASA |
| G | Consultar `/api/catalogo` sin token (ruta pública) | 200 | 200 | PASA |
| H | Crear el usuario `vendedora` con rol `empleado` | 201 | 201 | PASA |
| I | Listar usuarios; ninguno trae `password_hash` | 200 | 200 | PASA (sin `password_hash`) |
| J | Crear otra vez el usuario `vendedora` (duplicado) | 409 | 409 | PASA |
| K | Crear un usuario con el cuerpo vacío | 400 | 400 | PASA |
| L | Crear un usuario con contraseña de 3 caracteres | 400 | 400 | PASA |
| M | Crear un usuario con el rol inválido `gerente` | 400 | 400 | PASA |
| N | Editar el nombre de `vendedora` a "Leidys Duran Rojas" | 200 | 200 | PASA (nombre actualizado) |
| O | El administrador intenta quitarse a sí mismo el rol de administrador | 400 | 400 | PASA |
| P | El administrador intenta desactivarse a sí mismo | 400 | 400 | PASA |
| Q | Iniciar sesión con `vendedora`; devuelve token | 200 | 200 | PASA |
| R | Listar usuarios con el token de `vendedora` (rol empleado) | 403 | 403 | PASA |
| S | Desactivar a `vendedora` | 200 | 200 | PASA (`activo: false`) |
| T | Iniciar sesión con `vendedora` estando inactiva | 403 | 403 | PASA |
| U | Reactivar a `vendedora` | 200 | 200 | PASA (`activo: true`) |
| V | Editar el usuario con id 9999, que no existe | 404 | 404 | PASA |

## Comandos curl

### HU-022 — Iniciar sesión

**A. Inicio de sesión correcto (de aquí sale el TOKEN del administrador)**

```bash
curl -i -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","password":"Brilla2026*"}'
```

**B. Contraseña incorrecta**

```bash
curl -i -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","password":"claveMala123"}'
```

**C. Usuario que no existe**

```bash
curl -i -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"noexiste","password":"Brilla2026*"}'
```

**D. Usuario y contraseña vacíos**

```bash
curl -i -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"","password":""}'
```

**E. Ruta protegida sin token**

```bash
curl -i http://localhost:4000/api/productos
```

**F. Ruta protegida con token**

```bash
curl -i http://localhost:4000/api/productos \
  -H "Authorization: Bearer TOKEN"
```

**G. Ruta pública del catálogo sin token**

```bash
curl -i http://localhost:4000/api/catalogo
```

### HU-023 — Gestionar usuarios

**H. Crear el usuario `vendedora`**

```bash
curl -i -X POST http://localhost:4000/api/usuarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"usuario":"vendedora","nombre":"Leidys Duran","password":"Vendedora2026*","rol":"empleado"}'
```

**I. Listar usuarios**

```bash
curl -i http://localhost:4000/api/usuarios \
  -H "Authorization: Bearer TOKEN"
```

**J. Crear el mismo usuario otra vez (duplicado)**

```bash
curl -i -X POST http://localhost:4000/api/usuarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"usuario":"vendedora","nombre":"Leidys Duran","password":"Vendedora2026*","rol":"empleado"}'
```

**K. Crear con el cuerpo vacío**

```bash
curl -i -X POST http://localhost:4000/api/usuarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{}'
```

**L. Crear con contraseña demasiado corta**

```bash
curl -i -X POST http://localhost:4000/api/usuarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"usuario":"x1","nombre":"X","password":"123","rol":"empleado"}'
```

**M. Crear con un rol inválido**

```bash
curl -i -X POST http://localhost:4000/api/usuarios \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"usuario":"x2","nombre":"X","password":"Correcta2026*","rol":"gerente"}'
```

**N. Editar a `vendedora` (id 2)**

```bash
curl -i -X PUT http://localhost:4000/api/usuarios/2 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"nombre":"Leidys Duran Rojas","rol":"empleado"}'
```

**O. El administrador (id 1) intenta quitarse el rol de administrador**

```bash
curl -i -X PUT http://localhost:4000/api/usuarios/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"nombre":"Administrador","rol":"empleado"}'
```

**P. El administrador (id 1) intenta desactivarse**

```bash
curl -i -X PATCH http://localhost:4000/api/usuarios/1/estado \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"activo":false}'
```

**Q. Inicio de sesión de `vendedora` (de aquí sale el TOKEN de la vendedora)**

```bash
curl -i -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"vendedora","password":"Vendedora2026*"}'
```

**R. Listar usuarios con el TOKEN de la vendedora (rol empleado)**

```bash
curl -i http://localhost:4000/api/usuarios \
  -H "Authorization: Bearer TOKEN"
```

**S. Desactivar a `vendedora`**

```bash
curl -i -X PATCH http://localhost:4000/api/usuarios/2/estado \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"activo":false}'
```

**T. Inicio de sesión de `vendedora` estando inactiva**

```bash
curl -i -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"vendedora","password":"Vendedora2026*"}'
```

**U. Reactivar a `vendedora`**

```bash
curl -i -X PATCH http://localhost:4000/api/usuarios/2/estado \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"activo":true}'
```

**V. Editar un usuario que no existe**

```bash
curl -i -X PUT http://localhost:4000/api/usuarios/9999 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"nombre":"Nadie","rol":"empleado"}'
```
