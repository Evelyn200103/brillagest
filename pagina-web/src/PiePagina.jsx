import LogoJoyeria from './LogoJoyeria';

const WHATSAPP = '573202736866'; // 57 = Colombia + 320 273 6866

function PiePagina() {
  const anio = new Date().getFullYear();

  return (
    <footer className="pie">
      <div className="contenedor pie-columnas">
        <div>
          <LogoJoyeria className="pie-logo" />
          <p className="texto-suave">Calle 16 Sur # 18-43, Bogotá</p>
        </div>

        <div>
          <h3 className="pie-titulo">Contacto</h3>
          <ul className="pie-lista">
            <li>
              <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer">
                WhatsApp 320 273 6866
              </a>
            </li>
            <li>
              <a href="https://www.instagram.com/joyeria_sanchez_12" target="_blank" rel="noreferrer">
                Instagram @joyeria_sanchez_12
              </a>
            </li>
            <li>
              <a href="https://www.tiktok.com/@sanchezjoyeria" target="_blank" rel="noreferrer">
                TikTok @sanchezjoyeria
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="pie-titulo">Tienda</h3>
          <ul className="pie-lista">
            <li>Oro 18k · Oro 10k · Plata 925</li>
            <li>Relojes</li>
          </ul>
        </div>
      </div>

      <div className="contenedor pie-final">
        © {anio} Joyería Sánchez · Todos los derechos reservados
      </div>
    </footer>
  );
}

export default PiePagina;
