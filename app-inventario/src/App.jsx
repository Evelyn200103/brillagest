import { apiFetch, tienePermiso } from './api';
import { useEffect, useRef, useState } from 'react';
import HistorialMovimientos from './HistorialMovimientos.jsx';
import FormEntrada from './Entradalnventario';
import FormSalida from './SalidaInventario';
import Existencias from './Existencias';
import Reportes from './Reportes';
import AlertasStock from './AlertasStock';
import { formatoPrecio, estadoStock, STOCK_MINIMO } from './formato';
import {
  IconoEditar,
  IconoEliminar,
  IconoMas,
  IconoInventario,
  IconoMovimientos,
  IconoExistencias,
  IconoReportes,
  IconoAlertas,
  IconoValor,
  IconoJoya
} from './Iconos';
import IconoCategoria from './IconoCategoria';
import CabeceraPagina from './CabeceraPagina';

const API_URL = import.meta.env.VITE_API_URL;

const CATEGORIAS = [
  'Anillos', 'Pulseras', 'Cadenas', 'Topos', 'Dijes',
  'Aretes largos', 'Candongas', 'Candongas con piedrería',
  'Argollas', 'Tobilleras', 'Relojes'
];

const MATERIALES = ['Oro 18k', 'Oro 10k', 'Plata 925'];

const FORM_VACIO = {
  nombre: '', categoria: 'Anillos', material: 'Oro 18k',
  peso: '', precio: '', stock: '', marca: '', tipo: 'Original'
};

const TITULOS = {
  inventario: 'Inventario',
  movimientos: 'Movimientos',
  existencias: 'Existencias',
  reportes: 'Reportes',
  alertas: 'Alertas de stock'
};

function Kpi({ titulo, valor, nota, tono, Icono }) {
  return (
    <div className="kpi">
      {Icono && (
        <span className={tono ? `kpi-icono ${tono}` : 'kpi-icono'} aria-hidden="true">
          <Icono tamano={20} />
        </span>
      )}
      <p className="kpi-titulo">{titulo}</p>
      <p className={tono ? `kpi-valor ${tono}` : 'kpi-valor'}>{valor}</p>
      {nota && <p className="kpi-nota">{nota}</p>}
    </div>
  );
}

function App({ usuario, seccion = 'inventario' }) {
  // Qué puede hacer este usuario según su rol (HU-024)
  const puedeEditar = tienePermiso(usuario, 'productos:editar');
  const puedeRegistrar = tienePermiso(usuario, 'movimientos:registrar');
  const puedeVerMovimientos = tienePermiso(usuario, 'movimientos:ver');

  const [productos, setProductos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  const [form, setForm] = useState(FORM_VACIO);
  const [editandoId, setEditandoId] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [versionExistencias, setVersionExistencias] = useState(0);
  const formRef = useRef(null);

  const esReloj = form.categoria === 'Relojes';

  const cargarProductos = (q = busqueda, categoria = filtroCategoria) => {
    setCargando(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (categoria) params.set('categoria', categoria);

    apiFetch(`${API_URL}/api/productos?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];
        setProductos(lista);
        // Las tarjetas de resumen se calculan con el inventario completo (sin filtros)
        if (!q && !categoria) {
          setResumen({
            productos: lista.length,
            unidades: lista.reduce((s, p) => s + (Number(p.stock) || 0), 0),
            alertas: lista.filter((p) => (Number(p.stock) || 0) <= STOCK_MINIMO).length,
            valor: lista.reduce((s, p) => s + (Number(p.precio) || 0) * (Number(p.stock) || 0), 0)
          });
        }
      })
      .catch(() => setMensaje('No se pudo cargar la lista de productos'))
      .finally(() => setCargando(false));
  };

  const alRegistrarMovimiento = () => {
    cargarProductos();
    setVersionExistencias((v) => v + 1);
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const abrirNuevo = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setMostrarForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  const handleEditar = (p) => {
    setEditandoId(p.id);
    setForm({
      nombre: p.nombre,
      categoria: p.categoria,
      material: p.material || 'Oro 18k',
      peso: p.peso ?? '',
      precio: p.precio ?? '',
      stock: p.stock ?? '',
      marca: p.marca || '',
      tipo: p.tipo || 'Original'
    });
    setMostrarForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 0);
  };

  const cancelarEdicion = () => {
    setEditandoId(null);
    setForm(FORM_VACIO);
    setMostrarForm(false);
  };

  const handleEliminar = async (p) => {
    const confirmar = window.confirm(`¿Seguro que quieres eliminar "${p.nombre}" (${p.sku})? Esta acción no se puede deshacer.`);
    if (!confirmar) return;

    try {
      const res = await apiFetch(`${API_URL}/api/productos/${p.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al eliminar el producto');
      }
      setMensaje('Producto eliminado con éxito.');
      alRegistrarMovimiento();
    } catch (err) {
      setMensaje(err.message);
    }
  };

  // Mostrar u ocultar un producto en la página web (HU-015)
  const handlePublicar = async (p) => {
    setMensaje('');
    const nuevoValor = p.publicado === false; // si estaba oculto, se publica; si no, se oculta
    try {
      const res = await apiFetch(`${API_URL}/api/productos/${p.id}/publicado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publicado: nuevoValor })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo cambiar la publicación');
      setMensaje(data.mensaje);
      setProductos((lista) =>
        lista.map((x) => (x.id === p.id ? { ...x, publicado: data.producto.publicado } : x))
      );
    } catch (err) {
      setMensaje(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');

    const payload = {
      ...form,
      material: esReloj ? '' : form.material,
      marca: esReloj ? form.marca : '',
      tipo: esReloj ? form.tipo : ''
    };

    try {
      const url = editandoId ? `${API_URL}/api/productos/${editandoId}` : `${API_URL}/api/productos`;
      const method = editandoId ? 'PUT' : 'POST';

      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al guardar el producto');
      }

      setMensaje(editandoId ? 'Producto actualizado con éxito.' : 'Producto registrado con éxito.');
      setEditandoId(null);
      setForm(FORM_VACIO);
      setMostrarForm(false);
      alRegistrarMovimiento();
    } catch (err) {
      setMensaje(err.message);
    }
  };

  const elegirCategoria = (c) => {
    setFiltroCategoria(c);
    cargarProductos(busqueda, c);
  };

  const buscar = (e) => {
    e.preventDefault();
    cargarProductos();
  };

  // ---------- Otras secciones del menú ----------
  if (seccion === 'movimientos') {
    return (
      <>
        <CabeceraPagina titulo={TITULOS.movimientos} Icono={IconoMovimientos} />
        {puedeRegistrar && (
          <div className="dos-columnas">
            <FormEntrada productos={productos} onRegistrada={alRegistrarMovimiento} />
            <FormSalida productos={productos} onRegistrada={alRegistrarMovimiento} />
          </div>
        )}
        {puedeVerMovimientos && <HistorialMovimientos version={versionExistencias} />}
      </>
    );
  }

  if (seccion === 'existencias') {
    return (
      <>
        <CabeceraPagina titulo={TITULOS.existencias} Icono={IconoExistencias} />
        <Existencias categorias={CATEGORIAS} version={versionExistencias} />
      </>
    );
  }

  if (seccion === 'reportes') {
    return (
      <>
        <CabeceraPagina titulo={TITULOS.reportes} Icono={IconoReportes} />
        <Reportes version={versionExistencias} />
      </>
    );
  }

  if (seccion === 'alertas') {
    return (
      <>
        <CabeceraPagina titulo={TITULOS.alertas} Icono={IconoAlertas} />
        <AlertasStock productos={productos} />
      </>
    );
  }

  // ---------- Inventario (productos) ----------
  return (
    <>
      <CabeceraPagina titulo={TITULOS.inventario} Icono={IconoInventario}>
        <form className="buscador" onSubmit={buscar} role="search">
          <input
            type="search"
            placeholder="Buscar por SKU o nombre…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            aria-label="Buscar producto"
          />
        </form>
        {puedeEditar && (
          <button type="button" className="btn btn-dorado" onClick={abrirNuevo}>
            <IconoMas /> Nuevo producto
          </button>
        )}
      </CabeceraPagina>

      {resumen && (
        <div className="kpis">
          <Kpi titulo="Unidades en inventario" valor={resumen.unidades.toLocaleString('es-CO')} nota="suma de existencias" tono="verde" Icono={IconoInventario} />
          <Kpi titulo="Alertas de stock bajo" valor={resumen.alertas} nota={`${STOCK_MINIMO} unidades o menos`} tono="dorado" Icono={IconoAlertas} />
          <Kpi titulo="Productos registrados" valor={resumen.productos} nota="referencias distintas" Icono={IconoJoya} />
          <Kpi titulo="Valor del inventario" valor={formatoPrecio(resumen.valor)} nota="precio × existencias" Icono={IconoValor} />
        </div>
      )}

      {puedeEditar && mostrarForm && (
        <form ref={formRef} className="panel formulario" onSubmit={handleSubmit}>
          <h2 className="panel-titulo">{editandoId ? 'Editar producto' : 'Registrar producto'}</h2>

          <div className="campos">
            <div className="campo campo-ancho">
              <label htmlFor="f-nombre">Nombre del producto</label>
              <input id="f-nombre" name="nombre" value={form.nombre} onChange={handleChange} required />
            </div>

            <div className="campo">
              <label htmlFor="f-categoria">Categoría</label>
              <select id="f-categoria" name="categoria" value={form.categoria} onChange={handleChange}>
                {CATEGORIAS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>

            {esReloj ? (
              <>
                <div className="campo">
                  <label htmlFor="f-marca">Marca</label>
                  <input id="f-marca" name="marca" placeholder="Ej. Casio" value={form.marca} onChange={handleChange} />
                </div>
                <div className="campo">
                  <label htmlFor="f-tipo">Tipo</label>
                  <select id="f-tipo" name="tipo" value={form.tipo} onChange={handleChange}>
                    <option>Original</option>
                    <option>Réplica</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="campo">
                <label htmlFor="f-material">Material</label>
                <select id="f-material" name="material" value={form.material} onChange={handleChange}>
                  {MATERIALES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="campo">
              <label htmlFor="f-peso">Peso (g, opcional)</label>
              <input id="f-peso" name="peso" type="number" step="0.1" value={form.peso} onChange={handleChange} />
            </div>
            <div className="campo">
              <label htmlFor="f-precio">Precio</label>
              <input id="f-precio" name="precio" type="number" value={form.precio} onChange={handleChange} required />
            </div>
            <div className="campo">
              <label htmlFor="f-stock">Stock inicial</label>
              <input id="f-stock" name="stock" type="number" value={form.stock} onChange={handleChange} />
            </div>
          </div>

          <div className="formulario-botones">
            <button type="submit" className="btn btn-dorado">
              {editandoId ? 'Actualizar producto' : 'Guardar producto'}
            </button>
            <button type="button" className="btn btn-borde" onClick={cancelarEdicion}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      {mensaje && <p className="mensaje">{mensaje}</p>}

      <div className="chips" style={{ marginBottom: '1rem' }}>
        <button
          type="button"
          className={filtroCategoria === '' ? 'chip activo' : 'chip'}
          onClick={() => elegirCategoria('')}
        >
          Todas las categorías
        </button>
        {CATEGORIAS.map((c) => (
          <button
            key={c}
            type="button"
            className={filtroCategoria === c ? 'chip chip-dibujo activo' : 'chip chip-dibujo'}
            onClick={() => elegirCategoria(c)}
          >
            <IconoCategoria categoria={c} />
            {c}
          </button>
        ))}
      </div>

      {cargando ? (
        <p className="mensaje">Cargando…</p>
      ) : productos.length === 0 ? (
        <div className="vacio">
          <IconoCategoria categoria={filtroCategoria} />
          <p>No se encontraron productos.</p>
        </div>
      ) : (
        <div className="tabla-contenedor">
          <table className="tabla">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Producto</th>
                <th>Categoría</th>
                <th>Material / Marca</th>
                <th>Peso</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>En la web</th>
                {puedeEditar && <th aria-label="Acciones" />}
              </tr>
            </thead>
            <tbody>
              {productos.map((p) => {
                const estado = estadoStock(p.stock);
                return (
                  <tr key={p.id}>
                    <td className="celda-codigo">{p.sku}</td>
                    <td>
                      <div className="celda-con-dibujo">
                        <span className="miniatura" aria-hidden="true">
                          <IconoCategoria categoria={p.categoria} />
                        </span>
                        <span className="celda-producto">{p.nombre}</span>
                      </div>
                    </td>
                    <td>{p.categoria}</td>
                    <td>
                      <span className="pastilla">
                        {p.material || `${p.marca || '—'} (${p.tipo || '—'})`}
                      </span>
                    </td>
                    <td className="celda-numero">{p.peso ? `${p.peso} g` : '—'}</td>
                    <td className="celda-numero">{formatoPrecio(p.precio)}</td>
                    <td className={`celda-numero stock-${estado.texto === 'Disponible' ? 'ok' : estado.texto === 'Agotado' ? 'agotado' : 'bajo'}`}>
                      {p.stock}
                    </td>
                    <td><span className={estado.clase}>{estado.texto}</span></td>
                    <td>
                      <label className="interruptor" title={puedeEditar ? 'Mostrar u ocultar en la página web' : ''}>
                        <input
                          type="checkbox"
                          checked={p.publicado !== false}
                          onChange={() => handlePublicar(p)}
                          disabled={!puedeEditar}
                        />
                        <span className="interruptor-pista" aria-hidden="true" />
                        <span className="interruptor-texto">{p.publicado !== false ? 'Sí' : 'No'}</span>
                      </label>
                    </td>
                    {puedeEditar && (
                      <td className="celda-acciones">
                        <button type="button" className="btn-icono" onClick={() => handleEditar(p)} title="Editar" aria-label={`Editar ${p.nombre}`}>
                          <IconoEditar />
                        </button>
                        <button type="button" className="btn-icono peligro" onClick={() => handleEliminar(p)} title="Eliminar" aria-label={`Eliminar ${p.nombre}`}>
                          <IconoEliminar />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="tabla-pie">Mostrando {productos.length} productos</p>
        </div>
      )}
    </>
  );
}

export default App;
