const { app, BrowserWindow, ipcMain, dialog, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

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

  if (session.defaultSession) {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      if (['media', 'audioCapture', 'notifications', 'speechRecognition'].includes(permission)) {
        callback(true);
      } else {
        callback(false);
      }
    });

    session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
      if (['media', 'audioCapture', 'speechRecognition'].includes(permission)) return true;
      return false;
    });
  }

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
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('create-file', async (event, filePath, content = '') => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, content, 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-file', async (event, targetPath) => {
  try {
    if (fs.existsSync(targetPath)) {
      const stat = fs.statSync(targetPath);
      if (stat.isDirectory()) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(targetPath);
      }
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('create-folder', async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
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

ipcMain.handle('execute-command', async (event, commandStr, customCwd) => {
  return new Promise((resolve) => {
    const cwd = customCwd || process.cwd();
    exec(commandStr, { cwd, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, output: stderr || stdout || error.message, error: error.message });
      } else {
        resolve({ success: true, output: stdout || 'Command executed successfully.' });
      }
    });
  });
});

ipcMain.handle('git-status', async (event, targetDir) => {
  return new Promise((resolve) => {
    const cwd = targetDir || process.cwd();
    exec('git branch --show-current && git status --porcelain', { cwd }, (error, stdout) => {
      if (error) {
        resolve({ success: false, isRepo: false });
      } else {
        const lines = stdout.split('\n').filter(Boolean);
        const branch = lines[0] || 'main';
        const modifiedCount = lines.length > 1 ? lines.length - 1 : 0;
        resolve({ success: true, isRepo: true, branch, modifiedCount, statusRaw: stdout });
      }
    });
  });
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