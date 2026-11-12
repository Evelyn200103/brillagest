import { useEffect, useRef, useState } from 'react';
import './Chatbot.css';

// HU-018: asistente virtual de la página web (Dialogflow ES a través del backend).
const API = import.meta.env.VITE_API_URL;
const MAX_CARACTERES = 300;

const BIENVENIDA = {
  id: 'bienvenida',
  autor: 'bot',
  texto:
    '¡Hola! Soy el asistente de Joyería Sánchez. Puedo mostrarte categorías, productos, precios y disponibilidad. ¿Qué te gustaría ver?',
};
const SUGERENCIAS_INICIALES = ['Ver categorías', 'Qué anillos tienen', 'Precio del dije corazón'];

// Identificador de la conversación (Dialogflow lo usa para recordar el contexto).
function obtenerSesion() {
  try {
    const guardada = sessionStorage.getItem('brillagest-chat-sesion');
    if (guardada) return guardada;
  } catch { /* sin almacenamiento: se usa uno en memoria */ }
  const nueva = `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  try { sessionStorage.setItem('brillagest-chat-sesion', nueva); } catch { /* nada */ }
  return nueva;
}

function Chatbot() {
  const [abierto, setAbierto] = useState(false);
  const [mensajes, setMensajes] = useState([BIENVENIDA]);
  const [sugerencias, setSugerencias] = useState(SUGERENCIAS_INICIALES);
  const [texto, setTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [ultimo, setUltimo] = useState('');
  const sesion = useRef(null);
  const final = useRef(null);
  const campo = useRef(null);
  const contador = useRef(0);

  if (sesion.current === null) sesion.current = obtenerSesion();

  useEffect(() => {
    final.current?.scrollIntoView({ block: 'end' });
  }, [mensajes, cargando, error, abierto]);

  useEffect(() => {
    if (abierto) campo.current?.focus();
  }, [abierto]);

  const agregar = (autor, contenido) => {
    contador.current += 1;
    setMensajes((previos) => [...previos, { id: contador.current, autor, texto: contenido }]);
  };

  const enviar = async (mensaje, { reintento = false } = {}) => {
    const limpio = mensaje.trim();
    if (!limpio || cargando) return;

    if (!reintento) agregar('usuario', limpio);
    setTexto('');
    setError('');
    setUltimo(limpio);
    setCargando(true);

    try {
      const respuesta = await fetch(`${API}/api/chatbot/mensaje`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: limpio, sesion: sesion.current }),
      });
      let datos = null;
      try { datos = await respuesta.json(); } catch { /* sin cuerpo */ }

      if (!respuesta.ok) {
        throw new Error((datos && datos.error) || 'No pudimos procesar tu consulta.');
      }
      agregar('bot', datos.respuesta);
      setSugerencias(Array.isArray(datos.sugerencias) ? datos.sugerencias : []);
    } catch (e) {
      // fetch lanza TypeError cuando no hay conexión con el servidor
      setError(
        e instanceof TypeError
          ? 'No hay conexión con el asistente. Revisa tu internet e inténtalo de nuevo.'
          : e.message
      );
    } finally {
      setCargando(false);
    }
  };

  const alEnviar = (evento) => {
    evento.preventDefault();
    enviar(texto);
  };

  return (
    <div className="chat">
      {abierto && (
        <section className="chat-panel" role="dialog" aria-label="Asistente virtual de Joyería Sánchez">
          <header className="chat-cabecera">
            <div>
              <strong>Asistente virtual</strong>
              <span>Joyería Sánchez</span>
            </div>
            <button type="button" className="chat-cerrar" onClick={() => setAbierto(false)} aria-label="Cerrar el chat">
              ×
            </button>
          </header>

          <div className="chat-mensajes" aria-live="polite">
            {mensajes.map((m) => (
              <div key={m.id} className={`chat-burbuja chat-${m.autor}`}>
                {m.texto}
              </div>
            ))}

            {cargando && (
              <div className="chat-burbuja chat-bot chat-escribiendo" role="status" aria-label="El asistente está escribiendo">
                <span /><span /><span />
              </div>
            )}

            {error && (
              <div className="chat-error" role="alert">
                <p>{error}</p>
                <button type="button" onClick={() => enviar(ultimo, { reintento: true })}>
                  Reintentar
                </button>
              </div>
            )}

            {!cargando && !error && sugerencias.length > 0 && (
              <div className="chat-sugerencias">
                {sugerencias.map((s) => (
                  <button key={s} type="button" onClick={() => enviar(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <div ref={final} />
          </div>

          <form className="chat-formulario" onSubmit={alEnviar}>
            <input
              ref={campo}
              type="text"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={MAX_CARACTERES}
              placeholder="Escribe tu consulta…"
              aria-label="Escribe tu consulta"
              disabled={cargando}
            />
            <button type="submit" disabled={cargando || texto.trim() === ''}>
              Enviar
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="chat-boton"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        aria-label={abierto ? 'Cerrar el asistente virtual' : 'Abrir el asistente virtual'}
      >
        {abierto ? '×' : 'Chat'}
      </button>
    </div>
  );
}

export default Chatbot;
