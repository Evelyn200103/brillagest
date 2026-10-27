// Pruebas automáticas de la HU-017: integración entre la app de inventario,
// la API, la base de datos y la página web pública (catálogo).
// También verifica la HU-015 (publicación) y la HU-016 (regla de disponibilidad).
//
// Uso (con el backend encendido), en la terminal PowerShell de VS Code,
// desde la carpeta backend:
//   $env:ADMIN_USUARIO='admin'; $env:ADMIN_PASSWORD='su_clave'; node pruebas/hu017.js
// Opcional, para probar contra producción:
//   $env:API='https://brillagest.onrender.com'
//
// Los resultados quedan en backend/pruebas/resultados-hu017.md
const fs = require('fs');
const path = require('path');

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

// Una prueba pasa si el código HTTP es el esperado y, cuando se indica,
// si el contenido de la respuesta cumple la condición "validar".
async function probar(id, descripcion, esperado, peticion, validar) {
  const { status, datos } = await peticion();
  let pasa = status === esperado;
  let obtenido = `HTTP ${status}`;
  if (pasa && validar) {
    let ok = false;
    try { ok = Boolean(validar(datos)); } catch (e) { ok = false; }
    if (!ok) { pasa = false; obtenido += ', contenido distinto al esperado'; }
  }
  resultados.push({ id, descripcion, esperado: `HTTP ${esperado}`, obtenido, pasa });
  console.log(`${pasa ? 'PASA ' : 'FALLA'} ${id}  ${descripcion}  (esperado ${esperado}, obtenido ${obtenido})`);
  return datos;
}

const buscarEnCatalogo = (nombre) => llamar('GET', `/api/catalogo?q=${encodeURIComponent(nombre)}`);
const productosDeCategoria = (cat) => llamar('GET', `/api/catalogo/categorias/${encodeURIComponent(cat)}/productos`);
const enLista = (lista, id) => (Array.isArray(lista) ? lista.find((p) => p.id === id) : undefined);
const totalCategoria = (lista, nombre) => ((Array.isArray(lista) ? lista : []).find((c) => c.nombre === nombre) || {}).total;

async function main() {
  const sufijo = Date.now().toString().slice(-6);
  const nombre = `PRUEBA HU-017 ${sufijo}`;
  const categoria = 'Dijes';
  const base = { nombre, categoria, material: 'Oro 18k', peso: 2.5 };

  // ---------- Preparación ----------
  const login = await llamar('POST', '/api/auth/login', { cuerpo: { usuario: ADMIN_USUARIO, password: ADMIN_PASSWORD } });
  if (login.status !== 200) { console.error('No se pudo iniciar sesión como administrador.'); process.exit(1); }
  const t = login.datos.token;

  const antes = await llamar('GET', '/api/catalogo/categorias');
  const totalAntes = totalCategoria(antes.datos, categoria);

  const creado = await llamar('POST', '/api/productos', { token: t, cuerpo: { ...base, precio: 150000, stock: 2 } });
  if (creado.status !== 201) { console.error('No se pudo crear el producto de prueba:', creado.datos); process.exit(1); }
  const id = creado.datos.id;

  // ---------- 1. Comunicación inventario -> API -> página web ----------
  await probar('C1', 'La página web consulta el catálogo sin iniciar sesión', 200,
    () => llamar('GET', '/api/catalogo'), (d) => Array.isArray(d));
  await probar('C2', 'Un producto registrado en el inventario aparece en el catálogo', 200,
    () => buscarEnCatalogo(nombre), (d) => enLista(d, id));
  await probar('C3', 'El catálogo muestra los datos guardados en la base de datos', 200,
    () => buscarEnCatalogo(nombre), (d) => {
      const p = enLista(d, id);
      return p && p.nombre === nombre && p.categoria === categoria && Number(p.precio) === 150000;
    });
  await probar('C4', 'El catálogo no muestra el stock exacto', 200,
    () => buscarEnCatalogo(nombre), (d) => { const p = enLista(d, id); return p && !('stock' in p); });
  await probar('C5', 'El producto aparece en su categoría', 200,
    () => productosDeCategoria(categoria), (d) => d && enLista(d.productos, id));
  await probar('C6', 'El conteo de la categoría aumenta en 1', 200,
    () => llamar('GET', '/api/catalogo/categorias'), (d) => totalCategoria(d, categoria) === totalAntes + 1);
  await probar('C7', 'El detalle del producto responde en la página web', 200,
    () => llamar('GET', `/api/catalogo/productos/${id}`), (d) => d && d.id === id);

  // ---------- 2. Sincronización de cambios (HU-016) ----------
  await probar('S1', 'Se actualiza el precio desde el inventario', 200,
    () => llamar('PUT', `/api/productos/${id}`, { token: t, cuerpo: { ...base, precio: 175000, stock: 2 } }));
  await probar('S2', 'El catálogo muestra el precio nuevo', 200,
    () => buscarEnCatalogo(nombre), (d) => { const p = enLista(d, id); return p && Number(p.precio) === 175000; });
  await probar('S3', 'Con existencias, el producto aparece como Disponible', 200,
    () => llamar('GET', `/api/catalogo/productos/${id}`),
    (d) => d.disponible === true && d.disponibilidad === 'DISPONIBLE' && d.estado === 'Disponible');
  await probar('S4', 'Se registra una salida de todas las unidades', 201,
    () => llamar('POST', '/api/movimientos/salida', { token: t, cuerpo: { producto_id: id, cantidad: 2, responsable: 'Prueba HU-017' } }));
  await probar('S5', 'Sin existencias, el catálogo lo muestra como Agotado', 200,
    () => buscarEnCatalogo(nombre), (d) => { const p = enLista(d, id); return p && p.disponible === false && p.estado === 'Agotado'; });
  await probar('S6', 'El detalle también lo muestra como Agotado', 200,
    () => llamar('GET', `/api/catalogo/productos/${id}`), (d) => d.disponibilidad === 'AGOTADO');
  await probar('S7', 'La consulta de disponibilidad también lo muestra como Agotado', 200,
    () => llamar('GET', `/api/disponibilidad/${id}`), (d) => d.estado === 'Agotado');
  await probar('S8', 'Se registra una entrada de 3 unidades', 201,
    () => llamar('POST', '/api/movimientos/entrada', { token: t, cuerpo: { producto_id: id, cantidad: 3, responsable: 'Prueba HU-017' } }));
  await probar('S9', 'Con la entrada, vuelve a aparecer como Disponible', 200,
    () => buscarEnCatalogo(nombre), (d) => { const p = enLista(d, id); return p && p.estado === 'Disponible'; });

  // ---------- 3. Publicación en la página web (HU-015) ----------
  const rutaPublicar = `/api/productos/${id}/publicado`;
  await probar('P1', 'Sin iniciar sesión no se puede ocultar un producto', 401,
    () => llamar('PATCH', rutaPublicar, { cuerpo: { publicado: false } }));
  await probar('P2', 'Un valor de publicación inválido se rechaza', 400,
    () => llamar('PATCH', rutaPublicar, { token: t, cuerpo: { publicado: 'si' } }));
  await probar('P3', 'El administrador oculta el producto de la página web', 200,
    () => llamar('PATCH', rutaPublicar, { token: t, cuerpo: { publicado: false } }),
    (d) => d.producto && d.producto.publicado === false);
  await probar('P4', 'El producto oculto no aparece en el catálogo', 200,
    () => buscarEnCatalogo(nombre), (d) => Array.isArray(d) && !enLista(d, id));
  await probar('P5', 'El producto oculto no aparece en su categoría', 200,
    () => productosDeCategoria(categoria), (d) => d && Array.isArray(d.productos) && !enLista(d.productos, id));
  await probar('P6', 'El conteo de la categoría vuelve al valor inicial', 200,
    () => llamar('GET', '/api/catalogo/categorias'), (d) => totalCategoria(d, categoria) === totalAntes);
  await probar('P7', 'El detalle de un producto oculto responde 404', 404,
    () => llamar('GET', `/api/catalogo/productos/${id}`));
  await probar('P8', 'La disponibilidad de un producto oculto responde 404', 404,
    () => llamar('GET', `/api/disponibilidad/${id}`));
  await probar('P9', 'El inventario sí sigue viendo el producto oculto', 200,
    () => llamar('GET', `/api/productos?q=${encodeURIComponent(nombre)}`, { token: t }),
    (d) => { const p = enLista(d, id); return p && p.publicado === false; });
  await probar('P10', 'Al publicarlo de nuevo, vuelve a aparecer en el catálogo', 200,
    async () => {
      await llamar('PATCH', rutaPublicar, { token: t, cuerpo: { publicado: true } });
      return buscarEnCatalogo(nombre);
    }, (d) => enLista(d, id));

  // ---------- 4. Manejo de errores ----------
  await probar('E1', 'Detalle con un identificador inválido', 400,
    () => llamar('GET', '/api/catalogo/productos/abc'));
  await probar('E2', 'Detalle de un producto que no existe', 404,
    () => llamar('GET', '/api/catalogo/productos/999999999'));
  await probar('E3', 'Productos de una categoría que no existe', 404,
    () => productosDeCategoria('Inexistente'));
  await probar('E4', 'Disponibilidad con un identificador inválido', 400,
    () => llamar('GET', '/api/disponibilidad/abc'));

  // ---------- Limpieza ----------
  const borrado = await llamar('DELETE', `/api/productos/${id}`, { token: t });
  let limpieza;
  if (borrado.status === 200) {
    limpieza = 'El producto de prueba se eliminó.';
  } else {
    await llamar('PATCH', rutaPublicar, { token: t, cuerpo: { publicado: false } });
    limpieza = `El producto de prueba (id ${id}) no se pudo eliminar porque tiene movimientos; quedó oculto de la página web.`;
  }

  // ---------- Resumen y archivo de resultados ----------
  const fallas = resultados.filter((r) => !r.pasa);
  const resumen = `${resultados.length} pruebas: ${resultados.length - fallas.length} pasan, ${fallas.length} fallan.`;
  console.log(`\n${resumen}`);
  console.log(limpieza);

  const fecha = new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  const filas = resultados
    .map((r) => `| ${r.id} | ${r.descripcion} | ${r.esperado} | ${r.obtenido} | ${r.pasa ? 'Pasa' : 'Falla'} |`)
    .join('\n');
  const md = `# Resultados de las pruebas automáticas de la HU-017

- Fecha de ejecución: ${fecha}
- API probada: ${API}
- Resumen: ${resumen}
- Limpieza: ${limpieza}

| ID | Prueba | Esperado | Obtenido | Resultado |
| --- | --- | --- | --- | --- |
${filas}
`;
  fs.writeFileSync(path.join(__dirname, 'resultados-hu017.md'), md, 'utf8');
  console.log('Resultados guardados en pruebas/resultados-hu017.md');

  process.exit(fallas.length ? 1 : 0);
}

main().catch((e) => { console.error('Error inesperado:', e.message); process.exit(1); });