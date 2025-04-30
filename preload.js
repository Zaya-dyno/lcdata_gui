const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('electronAPI', {
    sendContext: (context) => ipcRenderer.invoke('sendContext', context),
    saveFiles: (filesData) => ipcRenderer.send('saveFiles', filesData)
})