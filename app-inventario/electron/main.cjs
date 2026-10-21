const { app, BrowserWindow } = require('electron');

// Por ahora carga la app que corre con "npm run dev" (puerto 5174).
// Después del miércoles se cambia para cargar la versión compilada (instalador).
const URL_APP = 'http://localhost:5174';

function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'BrillaGest — Inventario',
    autoHideMenuBar: true
  });

  // Si la ventana abre antes de que Vite termine de arrancar, la carga falla.
  // En ese caso se reintenta cada segundo en lugar de dejar la ventana en blanco.
  ventana.webContents.on('did-fail-load', (_evento, _codigo, _descripcion, _url, esPrincipal) => {
    if (esPrincipal && !ventana.isDestroyed()) {
      setTimeout(() => {
        if (!ventana.isDestroyed()) ventana.loadURL(URL_APP);
      }, 1000);
    }
  });

  ventana.loadURL(URL_APP);
}

app.whenReady().then(crearVentana);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});