import { useState } from 'react';
import { temaInicial, aplicarTema } from './tema';

function IconoSol() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function IconoLuna() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

// Interruptor de modo claro / oscuro
function BotonTema() {
  const [tema, setTema] = useState(temaInicial);

  const cambiar = (nuevo) => {
    setTema(nuevo);
    aplicarTema(nuevo);
  };

  return (
    <div className="tema-switch" role="group" aria-label="Modo de color">
      <button
        type="button"
        className={tema === 'claro' ? 'activo' : ''}
        onClick={() => cambiar('claro')}
        aria-label="Modo claro"
        title="Modo claro"
      >
        <IconoSol />
      </button>
      <button
        type="button"
        className={tema === 'oscuro' ? 'activo' : ''}
        onClick={() => cambiar('oscuro')}
        aria-label="Modo oscuro"
        title="Modo oscuro"
      >
        <IconoLuna />
      </button>
    </div>
  );
}

export default BotonTema;
