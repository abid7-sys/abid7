const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveRecords: (data) => ipcRenderer.invoke('save-records', data),
  loadRecords: () => ipcRenderer.invoke('load-records'),
});
