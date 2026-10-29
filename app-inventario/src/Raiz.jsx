import { useEffect, useState } from 'react';
import App from './App.jsx';
import Login from './Login.jsx';
import Usuarios from './Usuarios.jsx';
import AccesoDenegado from './AccesoDenegado.jsx';
import BotonTema from './BotonTema';
import { obtenerUsuario, cerrarSesion, refrescarPerfil, tienePermiso } from './api';
import { iniciales } from './formato';
import {
  IconoInventario,
  IconoMovimientos,
  IconoExistencias,
  IconoReportes,
  IconoAlertas,
  IconoUsuarios,
  IconoSalir
} from './Iconos';

// Secciones del menú y el permiso que pide cada una (HU-024)
const MENU = [
  {
    grupo: 'Gestión',
    opciones: [
      { id: 'inventario', texto: 'Inventario', Icono: IconoInventario, permisos: ['productos:ver'] },
      { id: 'movimientos', texto: 'Movimientos', Icono: IconoMovimientos, permisos: ['movimientos:ver', 'movimientos:registrar'] },
      { id: 'existencias', texto: 'Existencias', Icono: IconoExistencias, permisos: ['existencias:ver'] }
    ]
  },
  {
    grupo: 'Análisis',
    opciones: [
      { id: 'reportes', texto: 'Reportes', Icono: IconoReportes, permisos: ['reportes:ver'] },
      { id: 'alertas', texto: 'Alertas de stock', Icono: IconoAlertas, permisos: ['alertas:ver'] }
    ]
  },
  {
    grupo: 'Administración',
    opciones: [
      { id: 'usuarios', texto: 'Usuarios', Icono: IconoUsuarios, permisos: ['usuarios:gestionar'] }
    ]
  }
];

function Raiz() {
  const [usuario, setUsuario] = useState(obtenerUsuario());
  const [seccion, setSeccion] = useState('inventario');
  const [aviso, setAviso] = useState('');

  // Trae del backend los permisos actualizados del usuario (HU-024)
  const actualizarPerfil = async () => {
    try {
      await refrescarPerfil();
      setUsuario(obtenerUsuario());
    } catch {
      // Si falla, se queda con los datos que ya estaban guardados
    }
  };

  useEffect(() => {
    if (obtenerUsuario()) actualizarPerfil();
  }, []);

  // Si el backend responde 403, api.js avisa con este evento
  useEffect(() => {
    const alDenegar = (e) => {
      setAviso(e.detail || 'No tiene permiso para realizar esta acción.');
      setTimeout(() => setAviso(''), 5000);
    };
    window.addEventListener('acceso-denegado', alDenegar);
    return () => window.removeEventListener('acceso-denegado', alDenegar);
  }, []);

  const alEntrar = (u) => {
    setUsuario(u);
    setSeccion('inventario');
    actualizarPerfil();
  };

  if (!usuario) {
    return <Login onEntrar={alEntrar} />;
  }

  // Solo se muestran las opciones que el usuario tiene permitidas
  const puede = (op) => op.permisos.some((p) => tienePermiso(usuario, p));
  const menuVisible = MENU.map((g) => ({ ...g, opciones: g.opciones.filter(puede) })).filter(
    (g) => g.opciones.length > 0
  );
  const opcionesVisibles = menuVisible.flatMap((g) => g.opciones);
  const actual = opcionesVisibles.find((o) => o.id === seccion);

  let contenido;
  if (!actual) {
    contenido = <AccesoDenegado />;
  } else if (seccion === 'usuarios') {
    contenido = <Usuarios />;
  } else {
    contenido = <App usuario={usuario} seccion={seccion} />;
  }

  return (
    <div className="app">
      <aside className="lateral">
        <div className="lateral-marca">
          <span>
            <span className="marca-nombre">BrillaGest</span>
            <span className="marca-sub">Joyería Sánchez</span>
          </span>
        </div>

        <nav className="lateral-menu" aria-label="Menú principal">
          {menuVisible.map((g) => (
            <div key={g.grupo} className="lateral-grupo">
              <p className="lateral-grupo-titulo">{g.grupo}</p>
              {g.opciones.map(({ id, texto, Icono }) => (
                <button
                  key={id}
                  type="button"
                  className={seccion === id ? 'lateral-opcion activo' : 'lateral-opcion'}
                  onClick={() => setSeccion(id)}
                >
                  <Icono />
                  <span>{texto}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="lateral-pie">
          <div className="lateral-usuario">
            <span className="avatar">{iniciales(usuario.nombre)}</span>
            <span>
              <span className="lateral-usuario-nombre">{usuario.nombre}</span>
              <span className="lateral-usuario-rol">{usuario.rol}</span>
            </span>
          </div>
          <div className="lateral-acciones">
            <BotonTema />
            <button type="button" className="btn-icono" onClick={cerrarSesion} title="Cerrar sesión" aria-label="Cerrar sesión">
              <IconoSalir />
            </button>
          </div>
        </div>
      </aside>

      <main className="principal">
        {aviso && (
          <div role="alert" className="mensaje mensaje-error aviso-flotante">
            {aviso}
          </div>
        )}
        {contenido}
      </main>
    </div>
  );
}

export default Raiz;