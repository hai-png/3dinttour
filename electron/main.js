const { app, BrowserWindow, session } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      disableBlinkFeatures: 'Auxclick',
      allowRunningInsecureContent: false
    },
    icon: path.join(__dirname, 'icon-512.png'),
    backgroundColor: '#0a1628'
  });

  // Set Content Security Policy via session webRequest
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https:; " +
          "font-src 'self'; " +
          "connect-src 'self' https:; " +
          "media-src 'self'; " +
          "object-src 'none'; " +
          "frame-ancestors 'none';"
        ]
      }
    });
  });

  // Navigation whitelisting: only allow navigation within the app
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowedOrigins = ['file://', 'http://localhost', 'https://localhost'];
    const isAllowed = allowedOrigins.some(origin => url.startsWith(origin));
    if (!isAllowed) {
      event.preventDefault();
    }
  });

  // Prevent opening new windows — open external links in system browser instead
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Only allow file:// and localhost origins
    const allowedOrigins = ['file://', 'http://localhost', 'https://localhost'];
    const isAllowed = allowedOrigins.some(origin => url.startsWith(origin));
    if (isAllowed) {
      return { action: 'allow' };
    }
    // Open non-whitelisted URLs in the system browser
    const { shell } = require('electron');
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Load the app
  mainWindow.loadFile('index.html');

  // Open DevTools in development (optional)
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
