import { useEffect } from 'react';

// Hace que las tarjetas y secciones aparezcan suavemente cuando
// la persona baja con el scroll y llegan a la pantalla.
const ELEMENTOS = '.tarjeta, .tarjeta-categoria, .seccion-cabecera, .subtitulo-seccion, .panel, .detalle, .franja-fila > div';

function useAparecer() {
  useEffect(() => {
    // Navegadores muy viejos: se deja todo visible, sin animación
    if (!('IntersectionObserver' in window)) return;

    document.documentElement.classList.add('con-aparecer');

    const observador = new IntersectionObserver(
      (entradas) => {
        let orden = 0;
        entradas.forEach((entrada) => {
          if (!entrada.isIntersecting) return;
          // Las que llegan juntas salen una detrás de otra (efecto cascada)
          entrada.target.style.animationDelay = `${Math.min(orden, 6) * 70}ms`;
          entrada.target.classList.add('visible');
          observador.unobserve(entrada.target);
          orden++;
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    const vigilar = () => {
      document.querySelectorAll(ELEMENTOS).forEach((el) => {
        if (!el.classList.contains('visible')) observador.observe(el);
      });
    };
    vigilar();

    // Cuando aparecen tarjetas nuevas (búsqueda, otra categoría), también se vigilan
    const cambios = new MutationObserver(vigilar);
    cambios.observe(document.getElementById('root'), { childList: true, subtree: true });

    return () => {
      observador.disconnect();
      cambios.disconnect();
    };
  }, []);
}

export default useAparecer;