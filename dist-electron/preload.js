"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    hideWithoutPaste: () => electron_1.ipcRenderer.send('hide-window'),
    getHistory: () => electron_1.ipcRenderer.invoke('get-history'),
    onClipboardUpdate: (callback) => {
        const subscription = (_event, value) => callback(value);
        electron_1.ipcRenderer.on('clipboard-updated', subscription);
        return () => electron_1.ipcRenderer.removeListener('clipboard-updated', subscription);
    },
    onClipboardChanged: (callback) => {
        const subscription = (_event, value) => callback(value);
        electron_1.ipcRenderer.on('clipboard-changed', subscription);
        return () => electron_1.ipcRenderer.removeListener('clipboard-changed', subscription);
    },
    pasteItem: (item) => electron_1.ipcRenderer.send('paste-item', item),
    pinItem: (id) => electron_1.ipcRenderer.send('pin-item', id),
    deleteItem: (id) => electron_1.ipcRenderer.send('delete-item', id),
    clearHistory: () => electron_1.ipcRenderer.send('clear-history'),
    updateItemContent: (id, content) => electron_1.ipcRenderer.send('update-item-content', { id, content }),
});
