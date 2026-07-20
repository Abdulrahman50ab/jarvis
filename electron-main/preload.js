const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  writeFile: (path, content) => ipcRenderer.invoke('write-file', path, content),
  listFiles: (dirPath) => ipcRenderer.invoke('list-files', dirPath),
  readFolderTree: (dirPath) => ipcRenderer.invoke('read-folder-tree', dirPath),
  openFolder: () => ipcRenderer.invoke('dialog-open-folder'),
  openFile: () => ipcRenderer.invoke('dialog-open-file'),
});