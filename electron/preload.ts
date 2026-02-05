import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { ClipboardItem } from './types.js';

contextBridge.exposeInMainWorld('electronAPI', {
    hideWithoutPaste: () => ipcRenderer.send('hide-window'),
    getHistory: () => ipcRenderer.invoke('get-history'),
    onClipboardUpdate: (callback: (history: ClipboardItem[]) => void) => {
        const subscription = (_event: IpcRendererEvent, value: ClipboardItem[]) => callback(value);
        ipcRenderer.on('clipboard-updated', subscription);
        return () => ipcRenderer.removeListener('clipboard-updated', subscription);
    },
    pasteItem: (item: ClipboardItem) => ipcRenderer.send('paste-item', item),
    pinItem: (id: string) => ipcRenderer.send('pin-item', id),
});
