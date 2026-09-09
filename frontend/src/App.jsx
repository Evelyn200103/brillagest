import { useEffect, useState } from 'react';

function App() {
  const [estado, setEstado] = useState('Conectando...');

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/health`)
      .then((res) => res.json())
      .then((data) => setEstado(`Backend conectado — hora de la BD: ${data.dbTime}`))
      .catch(() => setEstado('No se pudo conectar con el backend'));
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>BrillaGest</h1>
      <p>{estado}</p>
    </div>
  );
}

export default App;