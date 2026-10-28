// Modo claro / oscuro de la página (se recuerda en el navegador).
const CLAVE = 'joyeria-tema';

export function temaInicial() {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === 'claro' || guardado === 'oscuro') return guardado;
  } catch {
    // Si el navegador no deja guardar, se usa el modo del sistema
  }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'oscuro'
    : 'claro';
}

export function aplicarTema(tema, guardar = true) {
  document.documentElement.dataset.tema = tema;
  if (guardar) {
    try {
      localStorage.setItem(CLAVE, tema);
    } catch {
      // No pasa nada si no se puede guardar
    }
  }
}

// Se aplica apenas carga la página, antes de dibujar, para que no "parpadee".
aplicarTema(temaInicial(), false);