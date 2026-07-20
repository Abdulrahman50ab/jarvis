const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'JARVIS IDE',
    backgroundColor: '#0a0a0a',
    icon: path.join(__dirname, 'icons', 'jarvis.svg')
  });

  const LIVE_URL = 'https://jarvis-six-pearl.vercel.app/';
  const targetUrl = process.env.FRONTEND_URL || process.env.VERCEL_URL || LIVE_URL;

  mainWindow.loadURL(targetUrl).catch(() => {
    const indexPath = path.join(__dirname, '../frontend/out/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    }
  });

  if (!app.isPackaged && process.env.OPEN_DEVTOOLS === 'true') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.webContents.on('did-fail-load', () => {
    const indexPath = path.join(__dirname, '../frontend/out/index.html');
    if (fs.existsSync(indexPath)) {
      mainWindow.loadFile(indexPath);
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// IPC handlers for file operations
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { success: true, content };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('write-file', async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('list-files', async (event, dirPath) => {
  try {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });
    const files = items.map(f => ({
      name: f.name,
      type: f.isDirectory() ? 'folder' : 'file',
      path: path.join(dirPath, f.name)
    }));
    return { success: true, files };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('read-folder-tree', async (event, dirPath) => {
  try {
    function readDir(dir, depth = 0) {
      if (depth > 5) return [];
      const items = fs.readdirSync(dir, { withFileTypes: true });
      return items
        .filter(i => !i.name.startsWith('.') && i.name !== 'node_modules')
        .map(i => {
          const fullPath = path.join(dir, i.name);
          if (i.isDirectory()) {
            return { name: i.name, type: 'folder', children: readDir(fullPath, depth + 1) };
          }
          return { name: i.name, type: 'file', path: fullPath };
        });
    }
    const tree = readDir(dirPath);
    return { success: true, tree };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('dialog-open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  return result;
});

ipcMain.handle('dialog-open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result;
});

app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});