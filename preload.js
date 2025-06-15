const { contextBridge, ipcRenderer } = require('electron');


contextBridge.exposeInMainWorld('electronAPI', {
    run_lcdata: () => ipcRenderer.invoke('run_lcdata'),
    saveFiles: (filesData, config=false) => ipcRenderer.send('saveFiles', filesData, config)
})