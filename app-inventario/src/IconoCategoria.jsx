// Dibujos de cada categoría (se usan porque los productos aún no tienen foto).
// Están hechos con líneas (SVG) y toman el color dorado del diseño.

const DIBUJOS = {
  Anillos: (
    <>
      <ellipse cx="32" cy="40" rx="15" ry="15" />
      <ellipse cx="32" cy="40" rx="11" ry="11" />
      <path d="M26 25l6-9 6 9-6 4z" />
      <path d="M26 25h12" />
    </>
  ),
  Argollas: (
    <>
      <circle cx="26" cy="34" r="13" />
      <circle cx="26" cy="34" r="10" />
      <circle cx="40" cy="34" r="13" />
      <circle cx="40" cy="34" r="10" />
    </>
  ),
  Pulseras: (
    <>
      <ellipse cx="32" cy="34" rx="22" ry="14" />
      <ellipse cx="32" cy="34" rx="18" ry="10" />
      <circle cx="32" cy="48" r="2.5" />
      <circle cx="16" cy="43" r="2" />
      <circle cx="48" cy="43" r="2" />
    </>
  ),
  Cadenas: (
    <>
      <rect x="6" y="27" width="16" height="10" rx="5" />
      <rect x="18" y="29" width="14" height="6" rx="3" />
      <rect x="28" y="27" width="16" height="10" rx="5" />
      <rect x="40" y="29" width="14" height="6" rx="3" />
      <path d="M54 32h4" />
    </>
  ),
  Tobilleras: (
    <>
      <path d="M8 22c8 14 40 14 48 0" />
      <circle cx="16" cy="29" r="1.6" />
      <circle cx="24" cy="32" r="1.6" />
      <circle cx="40" cy="32" r="1.6" />
      <circle cx="48" cy="29" r="1.6" />
      <path d="M32 33v6" />
      <path d="M28 43l4-4 4 4-4 5z" />
    </>
  ),
  Dijes: (
    <>
      <path d="M12 12c6 8 34 8 40 0" />
      <circle cx="32" cy="19" r="3" />
      <path d="M32 50c-10-7-14-12-14-17a6.5 6.5 0 0 1 14-2 6.5 6.5 0 0 1 14 2c0 5-4 10-14 17z" />
    </>
  ),
  Topos: (
    <>
      <circle cx="22" cy="32" r="8" />
      <path d="M18 32l4-4 4 4-4 4z" />
      <circle cx="42" cy="32" r="8" />
      <path d="M38 32l4-4 4 4-4 4z" />
    </>
  ),
  'Aretes largos': (
    <>
      <path d="M22 10a3 3 0 1 1 0 6" />
      <path d="M22 16v10" />
      <path d="M22 26l-6 10 6 16 6-16z" />
      <path d="M42 10a3 3 0 1 1 0 6" />
      <path d="M42 16v10" />
      <path d="M42 26l-6 10 6 16 6-16z" />
    </>
  ),
  Candongas: (
    <>
      <circle cx="22" cy="34" r="12" />
      <circle cx="42" cy="34" r="12" />
      <path d="M22 22v-6M42 22v-6" />
    </>
  ),
  'Candongas con piedrería': (
    <>
      <circle cx="22" cy="34" r="12" />
      <circle cx="42" cy="34" r="12" />
      <path d="M22 22v-6M42 22v-6" />
      <circle cx="13.5" cy="42.5" r="1.8" />
      <circle cx="22" cy="46" r="1.8" />
      <circle cx="30.5" cy="42.5" r="1.8" />
      <circle cx="33.5" cy="42.5" r="1.8" />
      <circle cx="42" cy="46" r="1.8" />
      <circle cx="50.5" cy="42.5" r="1.8" />
    </>
  ),
  Relojes: (
    <>
      <path d="M24 18l2-10h12l2 10" />
      <path d="M24 46l2 10h12l2-10" />
      <circle cx="32" cy="32" r="14" />
      <path d="M32 24v8l5 4" />
      <path d="M46 32h3" />
    </>
  )
};

// Si la categoría no tiene dibujo, se muestra una gema
const GEMA = (
  <>
    <path d="M14 24l8-10h20l8 10-18 26z" />
    <path d="M14 24h36M26 14l-4 10 10 26 10-26-4-10" />
  </>
);

function IconoCategoria({ categoria }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {DIBUJOS[categoria] || GEMA}
    </svg>
  );
}

export default IconoCategoria;
