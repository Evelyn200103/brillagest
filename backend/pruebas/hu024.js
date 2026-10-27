// Pruebas automáticas de la HU-024 (control de acceso por rol).
// Uso (con el backend encendido):
//   ADMIN_USUARIO=admin ADMIN_PASSWORD=su_clave node pruebas/hu024.js
// Opcional: API=http://localhost:4000 (por defecto)
const API = process.env.API || 'http://localhost:4000';
const ADMIN_USUARIO = process.env.ADMIN_USUARIO;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_USUARIO || !ADMIN_PASSWORD) {
  console.error('Faltan ADMIN_USUARIO y ADMIN_PASSWORD (variables de entorno).');
  process.exit(1);
}

const resultados = [];

async function llamar(metodo, ruta, { token, cuerpo } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cuerpo) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + ruta, { method: metodo, headers, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
  let datos = null;
  try { datos = await res.json(); } catch (e) { /* sin cuerpo */ }
  return { status: res.status, datos };
}

async function probar(id, descripcion, esperado, peticion) {
  const { status, datos } = await peticion();
  const pasa = status === esperado;
  resultados.push({ id, descripcion, esperado, status, pasa });
  console.log(`${pasa ? 'PASA ' : 'FALLA'} ${id}  ${descripcion}  (esperado ${esperado}, obtenido ${status})`);
  return datos;
}

async function main() {
  const sufijo = Date.now().toString().slice(-6);
  const empleado = `prueba_emp_${sufijo}`;
  const claveEmpleado = `Clave${sufijo}xyz`;

  // ---------- Preparación ----------
  const login = await llamar('POST', '/api/auth/login', { cuerpo: { usuario: ADMIN_USUARIO, password: ADMIN_PASSWORD } });
  if (login.status !== 200) { console.error('No se pudo iniciar sesión como administrador.'); process.exit(1); }
  const tAdmin = login.datos.token;

  const nuevo = await llamar('POST', '/api/usuarios', { token: tAdmin, cuerpo: { usuario: empleado, nombre: 'Empleado de prueba HU-024', password: claveEmpleado, rol: 'empleado' } });
  if (nuevo.status !== 201) { console.error('No se pudo crear el empleado de prueba:', nuevo.datos); process.exit(1); }
  const idEmpleado = nuevo.datos.id;

  const loginEmp = await llamar('POST', '/api/auth/login', { cuerpo: { usuario: empleado, password: claveEmpleado } });
  const tEmp = loginEmp.datos.token;

  const producto = await llamar('POST', '/api/productos', { token: tAdmin, cuerpo: { nombre: 'PRUEBA HU-024', categoria: 'Anillos', material: 'Plata 925', precio: 1000, stock: 1 } });
  const idProducto = producto.datos.id;

  // ---------- 1. Rol autorizado ----------
  await probar('A1', 'Administrador consulta productos', 200, () => llamar('GET', '/api/productos', { token: tAdmin }));
  await probar('A2', 'Administrador consulta el reporte de inventario', 200, () => llamar('GET', '/api/reportes/inventario', { token: tAdmin }));
  await probar('A3', 'Administrador lista usuarios', 200, () => llamar('GET', '/api/usuarios', { token: tAdmin }));
  await probar('A4', 'Empleado consulta productos', 200, () => llamar('GET', '/api/productos', { token: tEmp }));
  await probar('A5', 'Empleado consulta existencias', 200, () => llamar('GET', '/api/existencias', { token: tEmp }));
  await probar('A6', 'Empleado consulta historial de movimientos', 200, () => llamar('GET', '/api/movimientos', { token: tEmp }));
  await probar('A7', 'Empleado consulta alertas de stock bajo', 200, () => llamar('GET', '/api/alertas/stock-bajo', { token: tEmp }));
  await probar('A8', 'Empleado registra una entrada', 201, () => llamar('POST', '/api/movimientos/entrada', { token: tEmp, cuerpo: { producto_id: idProducto, cantidad: 1 } }));
  await probar('A9', 'Empleado registra una salida', 201, () => llamar('POST', '/api/movimientos/salida', { token: tEmp, cuerpo: { producto_id: idProducto, cantidad: 1 } }));

  // ---------- 2. Rol no autorizado (403) ----------
  const prodNuevo = { nombre: 'No debe crearse', categoria: 'Anillos', material: 'Plata 925', precio: 1 };
  await probar('B1', 'Empleado intenta crear un producto', 403, () => llamar('POST', '/api/productos', { token: tEmp, cuerpo: prodNuevo }));
  await probar('B2', 'Empleado intenta editar un producto', 403, () => llamar('PUT', `/api/productos/${idProducto}`, { token: tEmp, cuerpo: prodNuevo }));
  await probar('B3', 'Empleado intenta eliminar un producto', 403, () => llamar('DELETE', `/api/productos/${idProducto}`, { token: tEmp }));
  await probar('B4', 'Empleado intenta ver el reporte de inventario', 403, () => llamar('GET', '/api/reportes/inventario', { token: tEmp }));
  await probar('B5', 'Empleado intenta listar usuarios', 403, () => llamar('GET', '/api/usuarios', { token: tEmp }));
  await probar('B6', 'Empleado intenta crear un usuario administrador', 403, () => llamar('POST', '/api/usuarios', { token: tEmp, cuerpo: { usuario: 'intruso', nombre: 'Intruso', password: 'Clave12345', rol: 'administrador' } }));
  await probar('B7', 'Empleado intenta cambiarse el rol a administrador', 403, () => llamar('PUT', `/api/usuarios/${idEmpleado}`, { token: tEmp, cuerpo: { nombre: 'x', rol: 'administrador' } }));

  // ---------- 3. Acceso directo a endpoint protegido ----------
  await probar('C1', 'Sin token: productos', 401, () => llamar('GET', '/api/productos'));
  await probar('C2', 'Sin token: reporte', 401, () => llamar('GET', '/api/reportes/inventario'));
  await probar('C3', 'Sin token: usuarios', 401, () => llamar('GET', '/api/usuarios'));
  await probar('C4', 'Sin token: registrar entrada', 401, () => llamar('POST', '/api/movimientos/entrada', { cuerpo: { producto_id: idProducto, cantidad: 1 } }));
  await probar('C5', 'Token inventado', 401, () => llamar('GET', '/api/productos', { token: 'abc.def.ghi' }));
  await probar('C6', 'El catálogo público sigue sin token', 200, () => llamar('GET', '/api/catalogo'));

  // ---------- 4. Verificación de permisos ----------
  const perfAdmin = await probar('D1', 'Perfil del administrador', 200, () => llamar('GET', '/api/auth/perfil', { token: tAdmin }));
  const perfEmp = await probar('D2', 'Perfil del empleado', 200, () => llamar('GET', '/api/auth/perfil', { token: tEmp }));
  const comprobaciones = [
    ['D3', 'El administrador tiene el permiso usuarios:gestionar', perfAdmin.usuario.permisos.includes('usuarios:gestionar')],
    ['D4', 'El empleado NO tiene usuarios:gestionar', !perfEmp.usuario.permisos.includes('usuarios:gestionar')],
    ['D5', 'El empleado NO tiene productos:editar', !perfEmp.usuario.permisos.includes('productos:editar')],
    ['D6', 'El empleado SÍ tiene movimientos:registrar', perfEmp.usuario.permisos.includes('movimientos:registrar')],
  ];
  for (const [id, descripcion, pasa] of comprobaciones) {
    resultados.push({ id, descripcion, esperado: 'true', status: String(pasa), pasa });
    console.log(`${pasa ? 'PASA ' : 'FALLA'} ${id}  ${descripcion}`);
  }

  // ---------- 5. El administrador gestiona roles (el cambio aplica al instante) ----------
  await probar('E1', 'Administrador sube al empleado a administrador', 200, () => llamar('PUT', `/api/usuarios/${idEmpleado}`, { token: tAdmin, cuerpo: { nombre: 'Empleado de prueba HU-024', rol: 'administrador' } }));
  await probar('E2', 'Con el MISMO token, ahora ve el reporte', 200, () => llamar('GET', '/api/reportes/inventario', { token: tEmp }));
  await probar('E3', 'Administrador vuelve al usuario a empleado', 200, () => llamar('PUT', `/api/usuarios/${idEmpleado}`, { token: tAdmin, cuerpo: { nombre: 'Empleado de prueba HU-024', rol: 'empleado' } }));
  await probar('E4', 'Con el MISMO token, otra vez recibe 403 en el reporte', 403, () => llamar('GET', '/api/reportes/inventario', { token: tEmp }));
  await probar('E5', 'Administrador desactiva al empleado', 200, () => llamar('PATCH', `/api/usuarios/${idEmpleado}/estado`, { token: tAdmin, cuerpo: { activo: false } }));
  await probar('E6', 'El token del empleado desactivado ya no sirve', 401, () => llamar('GET', '/api/productos', { token: tEmp }));

  // ---------- Limpieza ----------
  await llamar('DELETE', `/api/productos/${idProducto}`, { token: tAdmin });

  const fallas = resultados.filter((r) => !r.pasa);
  console.log(`\n${resultados.length} pruebas: ${resultados.length - fallas.length} pasan, ${fallas.length} fallan.`);
  console.log(`(Quedó el usuario de prueba "${empleado}" desactivado.)`);
  process.exit(fallas.length ? 1 : 0);
}

main().catch((e) => { console.error('Error inesperado:', e.message); process.exit(1); });
