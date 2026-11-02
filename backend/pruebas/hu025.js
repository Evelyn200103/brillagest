// Pruebas de la HU-025: proteger la información de autenticación.
//
// Uso (con el backend encendido), desde la carpeta backend, en PowerShell:
//   $env:ADMIN_USUARIO='admin'; $env:ADMIN_PASSWORD='su_clave'; node pruebas/hu025.js
// Para probar el backend desplegado (HTTPS real), agregue antes:
//   $env:API='https://brillagest.onrender.com'
// Para probar la regla de HTTPS en su computador, encienda el backend con
//   $env:FORZAR_HTTPS='true'; npm run dev
// y ejecute este script con $env:SIMULAR_PROXY='true'.
//
// Los resultados quedan en backend/pruebas/resultados-hu025.md
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const tls = require('tls');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const API = (process.env.API || 'http://localhost:4000').replace(/\/$/, '');
const ADMIN_USUARIO = process.env.ADMIN_USUARIO;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SIMULAR_PROXY = process.env.SIMULAR_PROXY === 'true';
const ES_HTTPS = API.startsWith('https://');

if (!ADMIN_USUARIO || !ADMIN_PASSWORD) {
  console.error('Faltan ADMIN_USUARIO y ADMIN_PASSWORD (variables de entorno).');
  process.exit(1);
}

const resultados = [];
function registrar(id, criterio, descripcion, pasa, detalle = '', omitida = false) {
  resultados.push({ id, criterio, descripcion, pasa, detalle, omitida });
  const marca = omitida ? 'OMITE' : pasa ? 'PASA ' : 'FALLA';
  console.log(`${marca} ${id}  ${descripcion}${detalle ? `  (${detalle})` : ''}`);
}

async function llamar(metodo, ruta, { token, cuerpo, headers: extra, manual, base = API } = {}) {
  // Con SIMULAR_PROXY las peticiones normales se hacen "como si" vinieran por https
  const headers = { ...(SIMULAR_PROXY ? { 'X-Forwarded-Proto': 'https' } : {}), ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cuerpo) headers['Content-Type'] = 'application/json';
  const res = await fetch(base + ruta, {
    method: metodo,
    headers,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    redirect: manual ? 'manual' : 'follow'
  });
  const texto = await res.text();
  let datos = null;
  try { datos = JSON.parse(texto); } catch { /* sin JSON */ }
  return { status: res.status, datos, texto, headers: res.headers };
}

function certificado(host) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port: 443, servername: host }, () => {
      const cert = socket.getPeerCertificate();
      const info = { autorizado: socket.authorized, error: socket.authorizationError, hasta: cert.valid_to };
      socket.end();
      resolve(info);
    });
    socket.setTimeout(15000, () => { socket.destroy(); reject(new Error('tiempo agotado')); });
    socket.on('error', reject);
  });
}

async function main() {
  const sufijo = Date.now().toString().slice(-6);
  const claveComun = `ClaveSegura${sufijo}`;
  const usuarios = [`prueba25_a_${sufijo}`, `prueba25_b_${sufijo}`];

  const login = await llamar('POST', '/api/auth/login', { cuerpo: { usuario: ADMIN_USUARIO, password: ADMIN_PASSWORD } });
  if (login.status !== 200) { console.error('No se pudo iniciar sesión como administrador.'); process.exit(1); }
  const tAdmin = login.datos.token;

  // Dos usuarios con la MISMA contraseña (para comprobar que los hashes son distintos)
  const ids = [];
  for (const u of usuarios) {
    const r = await llamar('POST', '/api/usuarios', { token: tAdmin, cuerpo: { usuario: u, nombre: `Prueba HU-025 ${u}`, password: claveComun, rol: 'empleado' } });
    if (r.status !== 201) { console.error('No se pudo crear el usuario de prueba:', r.datos); process.exit(1); }
    ids.push(r.datos.id);
  }

  // ---------- Criterios 1 y 2: contraseñas no en texto plano, hash seguro ----------
  const columnas = (await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_name = 'usuarios'"
  )).rows.map((r) => r.column_name);
  const sospechosas = columnas.filter((c) => /pass|clave|contrase/i.test(c) && c !== 'password_hash');
  registrar('A1', 'Criterio 1', 'La tabla usuarios solo tiene la columna password_hash (ninguna columna de contraseña en texto plano)', sospechosas.length === 0 && columnas.includes('password_hash'), `columnas: ${columnas.join(', ')}`);

  const todos = (await pool.query('SELECT usuario, password_hash FROM usuarios')).rows;
  const formato = /^\$2[aby]\$(\d{2})\$[./A-Za-z0-9]{53}$/;
  const malos = todos.filter((u) => !formato.test(u.password_hash));
  registrar('A2', 'Criterio 2', `Los ${todos.length} usuarios guardan un hash bcrypt válido (empieza con $2b$ y mide 60 caracteres)`, malos.length === 0, malos.length ? `mal formados: ${malos.map((m) => m.usuario).join(', ')}` : '');

  const costos = todos.map((u) => Number((u.password_hash.match(formato) || [])[1] || 0));
  registrar('A3', 'Criterio 2', 'Todos los hashes usan un costo bcrypt de 10 o más', costos.length > 0 && Math.min(...costos) >= 10, `costo mínimo: ${Math.min(...costos)}`);

  const filas = (await pool.query('SELECT usuario, password_hash FROM usuarios WHERE id = ANY($1) ORDER BY id', [ids])).rows;
  registrar('A4', 'Criterio 1', 'El hash guardado es distinto de la contraseña escrita', filas.every((f) => f.password_hash !== claveComun && !f.password_hash.includes(claveComun)));
  registrar('A5', 'Criterio 2', 'Dos usuarios con la misma contraseña tienen hashes distintos (cada hash lleva su propia sal)', filas.length === 2 && filas[0].password_hash !== filas[1].password_hash);
  registrar('A6', 'Criterio 2', 'El hash guardado sí corresponde a la contraseña (bcrypt.compare)', filas.length === 2 && await bcrypt.compare(claveComun, filas[0].password_hash) && !(await bcrypt.compare('otra-clave', filas[0].password_hash)));

  // ---------- Que el servidor nunca devuelva hashes ni contraseñas ----------
  const loginA = await llamar('POST', '/api/auth/login', { cuerpo: { usuario: usuarios[0], password: claveComun } });
  const tA = loginA.datos && loginA.datos.token;
  registrar('B1', 'Criterio 2', 'La respuesta del login no contiene hash ni la contraseña', loginA.status === 200 && !/hash|\$2[aby]\$/i.test(loginA.texto) && !loginA.texto.includes(claveComun));
  const lista = await llamar('GET', '/api/usuarios', { token: tAdmin });
  registrar('B2', 'Criterio 2', 'La lista de usuarios no contiene hashes ni contraseñas', lista.status === 200 && !/hash|password|\$2[aby]\$/i.test(lista.texto));
  const perfil = await llamar('GET', '/api/auth/perfil', { token: tA });
  registrar('B3', 'Criterio 2', 'El perfil no contiene hash ni contraseña', perfil.status === 200 && !/hash|password|\$2[aby]\$/i.test(perfil.texto));

  // ---------- Pruebas de autenticación ----------
  const mala = await llamar('POST', '/api/auth/login', { cuerpo: { usuario: ADMIN_USUARIO, password: 'ClaveIncorrecta999' } });
  const inexistente = await llamar('POST', '/api/auth/login', { cuerpo: { usuario: `no_existe_${sufijo}`, password: 'ClaveIncorrecta999' } });
  registrar('C1', 'Pruebas', 'Credenciales incorrectas (contraseña mala)', mala.status === 401, `HTTP ${mala.status}`);
  registrar('C2', 'Pruebas', 'Credenciales incorrectas (usuario que no existe)', inexistente.status === 401, `HTTP ${inexistente.status}`);
  registrar('C3', 'Pruebas', 'El mensaje de error es el mismo para usuario inexistente y contraseña mala (no revela qué usuarios existen)', mala.datos && inexistente.datos && mala.datos.error === inexistente.datos.error);
  const vacio = await llamar('POST', '/api/auth/login', { cuerpo: { usuario: '', password: '' } });
  registrar('C4', 'Pruebas', 'Login con campos vacíos', vacio.status === 400, `HTTP ${vacio.status}`);

  // ---------- Criterio 4: funcionalidades protegidas requieren autenticación ----------
  for (const [id, ruta] of [['D1', '/api/productos'], ['D2', '/api/existencias'], ['D3', '/api/movimientos'], ['D4', '/api/reportes/inventario'], ['D5', '/api/usuarios']]) {
    const r = await llamar('GET', ruta);
    registrar(id, 'Criterio 4', `Sin autenticación: GET ${ruta}`, r.status === 401, `HTTP ${r.status}`);
  }
  const sinTokenPost = await llamar('POST', '/api/movimientos/salida', { cuerpo: { producto_id: 1, cantidad: 1 } });
  registrar('D6', 'Criterio 4', 'Sin autenticación: POST /api/movimientos/salida', sinTokenPost.status === 401, `HTTP ${sinTokenPost.status}`);

  const falso = await llamar('GET', '/api/productos', { token: 'abc.def.ghi' });
  registrar('D7', 'Criterio 4', 'Token inventado', falso.status === 401, `HTTP ${falso.status}`);

  const partes = tA.split('.');
  const alterado = `${partes[0]}.${Buffer.from(JSON.stringify({ id: 1, usuario: ADMIN_USUARIO, rol: 'administrador' })).toString('base64url')}.${partes[2]}`;
  const rAlt = await llamar('GET', '/api/usuarios', { token: alterado });
  registrar('D8', 'Criterio 4', 'Token alterado a mano para "hacerse" administrador', rAlt.status === 401, `HTTP ${rAlt.status}`);

  const otroSecreto = jwt.sign({ id: 1, usuario: ADMIN_USUARIO, rol: 'administrador' }, 'otro-secreto-distinto', { expiresIn: '1h' });
  const rOtro = await llamar('GET', '/api/usuarios', { token: otroSecreto });
  registrar('D9', 'Criterio 4', 'Token firmado con otra llave', rOtro.status === 401, `HTTP ${rOtro.status}`);

  const sinFirma = `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ id: 1, usuario: ADMIN_USUARIO, rol: 'administrador' })).toString('base64url')}.`;
  const rSin = await llamar('GET', '/api/usuarios', { token: sinFirma });
  registrar('D10', 'Criterio 4', 'Token sin firma (alg "none")', rSin.status === 401, `HTTP ${rSin.status}`);

  if (process.env.JWT_SECRET && !ES_HTTPS) {
    const expirado = jwt.sign({ id: ids[0], usuario: usuarios[0], rol: 'empleado' }, process.env.JWT_SECRET, { expiresIn: -60 });
    const rExp = await llamar('GET', '/api/productos', { token: expirado });
    registrar('D11', 'Criterio 4', 'Token vencido', rExp.status === 401, `HTTP ${rExp.status}`);
  } else {
    registrar('D11', 'Criterio 4', 'Token vencido', true, 'omitida: solo se prueba contra el backend local', true);
  }

  const sinPermiso = await llamar('GET', '/api/usuarios', { token: tA });
  registrar('D12', 'Pruebas', 'Acceso a un recurso sin permisos (empleado pide la lista de usuarios)', sinPermiso.status === 403, `HTTP ${sinPermiso.status}`);
  const publico = await llamar('GET', '/api/catalogo');
  registrar('D13', 'Criterio 4', 'El catálogo público sigue abierto sin token', publico.status === 200, `HTTP ${publico.status}`);

  // ---------- Criterio 3: HTTPS ----------
  const cab = await llamar('GET', '/api/catalogo', { headers: SIMULAR_PROXY ? { 'X-Forwarded-Proto': 'https' } : {} });
  registrar('E1', 'Criterio 3', 'La respuesta incluye X-Content-Type-Options: nosniff', cab.headers.get('x-content-type-options') === 'nosniff');
  const sesion = await llamar('POST', '/api/auth/login', { cuerpo: { usuario: ADMIN_USUARIO, password: 'ClaveIncorrecta999' }, headers: SIMULAR_PROXY ? { 'X-Forwarded-Proto': 'https' } : {} });
  registrar('E2', 'Criterio 3', 'Las respuestas del login no se guardan en caché (Cache-Control: no-store)', sesion.headers.get('cache-control') === 'no-store');

  if (ES_HTTPS) {
    const host = new URL(API).hostname;
    registrar('E3', 'Criterio 3', 'La respuesta del servidor incluye Strict-Transport-Security (HSTS)', /max-age=\d+/.test(cab.headers.get('strict-transport-security') || ''), cab.headers.get('strict-transport-security') || 'sin cabecera');
    try {
      const cert = await certificado(host);
      const dias = Math.floor((new Date(cert.hasta) - new Date()) / 86400000);
      registrar('E4', 'Infraestructura', `Certificado SSL/TLS de ${host} válido y confiable`, cert.autorizado, cert.autorizado ? `vence ${cert.hasta}` : cert.error);
      registrar('E5', 'Infraestructura', 'El certificado no vence en los próximos 15 días', dias > 15, `${dias} días restantes`);
    } catch (e) {
      registrar('E4', 'Infraestructura', `Certificado SSL/TLS de ${host}`, false, e.message);
    }
    try {
      const http = await llamar('GET', '/api/catalogo', { manual: true, base: API.replace('https://', 'http://') });
      registrar('E6', 'Criterio 3', 'Entrar por http:// redirige a https://', [301, 302, 307, 308].includes(http.status) && (http.headers.get('location') || '').startsWith('https://'), `HTTP ${http.status}`);
    } catch (e) {
      registrar('E6', 'Criterio 3', 'Entrar por http:// no es posible o redirige a https://', true, `rechazada: ${e.cause ? e.cause.code : e.message}`);
    }
  } else if (SIMULAR_PROXY) {
    const h = { 'X-Forwarded-Proto': 'http' };
    const get = await llamar('GET', '/api/catalogo', { headers: h, manual: true });
    registrar('E3', 'Criterio 3', 'Simulado: GET por http se redirige a https (301)', get.status === 301 && (get.headers.get('location') || '').startsWith('https://'), `HTTP ${get.status}`);
    const post = await llamar('POST', '/api/auth/login', { headers: h, cuerpo: { usuario: ADMIN_USUARIO, password: ADMIN_PASSWORD } });
    registrar('E4', 'Criterio 3', 'Simulado: el login por http se rechaza y no revisa la contraseña (403)', post.status === 403, `HTTP ${post.status}`);
    const seguro = await llamar('GET', '/api/catalogo', { headers: { 'X-Forwarded-Proto': 'https' } });
    registrar('E5', 'Criterio 3', 'Simulado: por https todo funciona (200)', seguro.status === 200, `HTTP ${seguro.status}`);
    registrar('E6', 'Criterio 3', 'Simulado: por https llega la cabecera HSTS', /max-age=\d+/.test(seguro.headers.get('strict-transport-security') || ''));
    const salud = await llamar('GET', '/api/health', { headers: h });
    registrar('E7', 'Criterio 3', 'Simulado: /api/health responde aunque sea por http (chequeo de Render)', salud.status === 200, `HTTP ${salud.status}`);
  } else {
    registrar('E3', 'Criterio 3', 'Regla de HTTPS / HSTS / certificado', true, 'omitida: use API=https://... o SIMULAR_PROXY=true', true);
  }

  // ---------- Limpieza ----------
  for (const id of ids) await llamar('PATCH', `/api/usuarios/${id}/estado`, { token: tAdmin, cuerpo: { activo: false } });

  const evaluadas = resultados.filter((r) => !r.omitida);
  const fallas = evaluadas.filter((r) => !r.pasa);
  const omitidas = resultados.length - evaluadas.length;
  console.log(`\n${evaluadas.length} pruebas: ${evaluadas.length - fallas.length} pasan, ${fallas.length} fallan${omitidas ? `, ${omitidas} omitidas` : ''}.`);

  const md = [
    '# Pruebas de la HU-025 — Proteger la información de autenticación',
    '',
    `- Fecha de ejecución: ${new Date().toLocaleString('es-CO')}`,
    `- Backend probado: \`${API}\`${SIMULAR_PROXY ? ' (con proxy HTTPS simulado)' : ''}`,
    `- Resumen: ${evaluadas.length} pruebas, ${evaluadas.length - fallas.length} pasan, ${fallas.length} fallan${omitidas ? `, ${omitidas} omitidas` : ''}.`,
    '',
    '| Prueba | Criterio | Descripción | Resultado | Detalle |',
    '| --- | --- | --- | --- | --- |',
    ...resultados.map((r) => `| ${r.id} | ${r.criterio} | ${r.descripcion} | ${r.omitida ? 'OMITIDA' : r.pasa ? 'PASA' : 'FALLA'} | ${r.detalle.replace(/\|/g, '/')} |`),
    ''
  ].join('\n');
  fs.writeFileSync(path.join(__dirname, 'resultados-hu025.md'), md, 'utf8');
  console.log('Resultados guardados en backend/pruebas/resultados-hu025.md');

  await pool.end();
  process.exit(fallas.length ? 1 : 0);
}

main().catch((e) => { console.error('Error inesperado:', e.message); process.exit(1); });
