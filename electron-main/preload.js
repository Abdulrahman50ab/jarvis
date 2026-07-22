const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  readFile: (path) => ipcRenderer.invoke('read-file', path),
  writeFile: (path, content) => ipcRenderer.invoke('write-file', path, content),
  createFile: (path, content) => ipcRenderer.invoke('create-file', path, content),
  deleteFile: (path) => ipcRenderer.invoke('delete-file', path),
  createFolder: (path) => ipcRenderer.invoke('create-folder', path),
  listFiles: (dirPath) => ipcRenderer.invoke('list-files', dirPath),
  readFolderTree: (dirPath) => ipcRenderer.invoke('read-folder-tree', dirPath),
  openFolder: () => ipcRenderer.invoke('dialog-open-folder'),
  openFile: () => ipcRenderer.invoke('dialog-open-file'),
  executeCommand: (command, cwd) => ipcRenderer.invoke('execute-command', command, cwd),
  getGitStatus: (dirPath) => ipcRenderer.invoke('git-status', dirPath),
});