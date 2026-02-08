import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { ClipboardItem } from './types';

contextBridge.exposeInMainWorld('electronAPI', {
    hideWithoutPaste: () => ipcRenderer.send('hide-window'),
    getHistory: () => ipcRenderer.invoke('get-history'),
    onClipboardUpdate: (callback: (history: ClipboardItem[]) => void) => {
        const subscription = (_event: IpcRendererEvent, value: ClipboardItem[]) => callback(value);
        ipcRenderer.on('clipboard-updated', subscription);
        return () => ipcRenderer.removeListener('clipboard-updated', subscription);
    },
    onClipboardChanged: (callback: (item: ClipboardItem) => void) => {
        const subscription = (_event: IpcRendererEvent, value: ClipboardItem) => callback(value);
        ipcRenderer.on('clipboard-changed', subscription);
        return () => ipcRenderer.removeListener('clipboard-changed', subscription);
    },
    pasteItem: (item: ClipboardItem) => ipcRenderer.send('paste-item', item),
    pinItem: (id: string) => ipcRenderer.send('pin-item', id),
    deleteItem: (id: string) => ipcRenderer.send('delete-item', id),
    clearHistory: () => ipcRenderer.send('clear-history'),
    updateItemContent: (id: string, content: string) => ipcRenderer.send('update-item-content', { id, content }),
});
