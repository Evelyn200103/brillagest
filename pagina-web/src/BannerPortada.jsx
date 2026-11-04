import { useEffect, useState } from 'react';
import IconoCategoria from './IconoCategoria';

// Banner de la portada: 3 diapositivas que cambian solas cada 6 segundos.
// Cuando tengamos fotos reales, se pone la ruta en "foto" (ej: '/fotos/anillos.jpg')
// y la foto reemplaza al dibujo.
const DIAPOSITIVAS = [
  {
    estilo: 'claro',
    etiqueta: 'Oro 18k · Oro 10k · Plata 925',
    titulo: 'Tu brillo es único',
    texto: 'Descubre el catálogo de Joyería Sánchez, actualizado en tiempo real desde nuestro inventario.',
    boton: 'Ver catálogo',
    destino: 'todos',
    dibujo: 'Gema'
  },
  {
    estilo: 'esmeralda',
    etiqueta: 'Anillos · Cadenas · Pulseras · Dijes',
    titulo: 'Joyas para toda la vida',
    texto: 'Encuentra la pieza perfecta en nuestras categorías, desde argollas de matrimonio hasta candongas.',
    boton: 'Explorar por categoría',
    destino: 'categorias',
    dibujo: 'Anillos'
  },
  {
    estilo: 'champana',
    etiqueta: 'Antes de venir a la tienda',
    titulo: '¿Está disponible?',
    texto: 'Consulta en segundos si la joya que te gusta está disponible en la tienda.',
    boton: 'Consultar disponibilidad',
    destino: 'disponibilidad',
    dibujo: 'Dijes'
  }
];

const TIEMPO = 6000; // milisegundos entre una diapositiva y la siguiente

function BannerPortada({ onIr }) {
  const [actual, setActual] = useState(0);
  const [pausado, setPausado] = useState(false);
  const total = DIAPOSITIVAS.length;

  const siguiente = () => setActual((a) => (a + 1) % total);
  const anterior = () => setActual((a) => (a - 1 + total) % total);

  // Cambia sola, excepto si el mouse está encima o si la persona
  // pidió en su computador "reducir movimiento"
  useEffect(() => {
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (pausado || reducir) return;
    const temporizador = setTimeout(siguiente, TIEMPO);
    return () => clearTimeout(temporizador);
  }, [actual, pausado]);

  return (
    <section
      className="banner"
      aria-roledescription="carrusel"
      aria-label="Novedades de Joyería Sánchez"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div className="banner-pista">
        {DIAPOSITIVAS.map((d, i) => {
          // Solo la primera diapositiva lleva el título principal (h1) de la página
          const Titulo = i === 0 ? 'h1' : 'h2';
          return (
            <div
              key={d.titulo}
              className={`diapositiva diapositiva-${d.estilo}${i === actual ? ' activa' : ''}`}
              aria-hidden={i !== actual}
            >
              <div className="contenedor diapositiva-fila">
                <div className="banner-texto">
                  <p className="eyebrow">{d.etiqueta}</p>
                  <Titulo className="hero-titulo">{d.titulo}</Titulo>
                  <p className="hero-texto">{d.texto}</p>
                  <button
                    type="button"
                    className={d.estilo === 'esmeralda' ? 'btn btn-claro' : 'btn btn-dorado'}
                    onClick={() => onIr(d.destino)}
                    tabIndex={i === actual ? 0 : -1}
                  >
                    {d.boton}
                  </button>
                </div>

                <div className="vitrina" aria-hidden="true">
                  <span className="vitrina-orbita" />
                  <span className="destello destello-1">✦</span>
                  <span className="destello destello-2">✦</span>
                  <span className="destello destello-3">✦</span>
                  {d.foto ? (
                    <img className="vitrina-foto" src={d.foto} alt="" />
                  ) : (
                    <span className="vitrina-dibujo">
                      <IconoCategoria categoria={d.dibujo} />
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button type="button" className="banner-flecha izquierda" onClick={anterior} aria-label="Anterior">
        ‹
      </button>
      <button type="button" className="banner-flecha derecha" onClick={siguiente} aria-label="Siguiente">
        ›
      </button>

      <div className="banner-puntos">
        {DIAPOSITIVAS.map((d, i) => (
          <button
            key={d.titulo}
            type="button"
            className={i === actual ? 'activo' : ''}
            onClick={() => setActual(i)}
            aria-label={`Ir a la diapositiva ${i + 1}`}
          />
        ))}
      </div>
    </section>
  );
}

export default BannerPortada;