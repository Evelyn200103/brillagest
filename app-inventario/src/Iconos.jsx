// Íconos de línea para el menú y los botones de BrillaGest.

function Icono({ children, tamano = 18 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={tamano}
      height={tamano}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconoInventario = (p) => (
  <Icono {...p}>
    <path d="M3 7l9-4 9 4-9 4z" />
    <path d="M3 7v10l9 4 9-4V7" />
    <path d="M12 11v10" />
  </Icono>
);

export const IconoMovimientos = (p) => (
  <Icono {...p}>
    <path d="M7 4v14M3 14l4 4 4-4" />
    <path d="M17 20V6M13 10l4-4 4 4" />
  </Icono>
);

export const IconoExistencias = (p) => (
  <Icono {...p}>
    <path d="M12 3l9 5-9 5-9-5z" />
    <path d="M3 13l9 5 9-5" />
  </Icono>
);

export const IconoReportes = (p) => (
  <Icono {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Icono>
);

export const IconoAlertas = (p) => (
  <Icono {...p}>
    <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" />
    <path d="M10 21h4" />
  </Icono>
);

export const IconoUsuarios = (p) => (
  <Icono {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" />
  </Icono>
);

export const IconoEditar = (p) => (
  <Icono tamano={16} {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </Icono>
);

export const IconoEliminar = (p) => (
  <Icono tamano={16} {...p}>
    <path d="M4 7h16M10 11v6M14 11v6" />
    <path d="M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Icono>
);

export const IconoSalir = (p) => (
  <Icono tamano={16} {...p}>
    <path d="M15 4h4v16h-4" />
    <path d="M10 8l-4 4 4 4M6 12h10" />
  </Icono>
);

export const IconoMas = (p) => (
  <Icono tamano={16} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icono>
);

export const IconoEntrada = (p) => (
  <Icono {...p}>
    <path d="M12 4v12M7 11l5 5 5-5" />
    <path d="M4 20h16" />
  </Icono>
);

export const IconoSalida = (p) => (
  <Icono {...p}>
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M4 20h16" />
  </Icono>
);

export const IconoValor = (p) => (
  <Icono {...p}>
    <ellipse cx="12" cy="6" rx="7" ry="2.5" />
    <path d="M5 6v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6" />
    <path d="M5 10v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4" />
    <path d="M5 14v4c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-4" />
  </Icono>
);

export const IconoJoya = (p) => (
  <Icono {...p}>
    <path d="M6 9l3-4h6l3 4-6 10z" />
    <path d="M6 9h12M10 5l-1 4 3 10 3-10-1-4" />
  </Icono>
);
