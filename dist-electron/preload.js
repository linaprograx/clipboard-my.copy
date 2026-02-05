import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    hideWithoutPaste: () => ipcRenderer.send('hide-window'),
    getHistory: () => ipcRenderer.invoke('get-history'),
    onClipboardUpdate: (callback) => {
        const subscription = (_event, value) => callback(value);
        ipcRenderer.on('clipboard-updated', subscription);
        return () => ipcRenderer.removeListener('clipboard-updated', subscription);
    },
    pasteItem: (item) => ipcRenderer.send('paste-item', item),
    pinItem: (id) => ipcRenderer.send('pin-item', id),
});
