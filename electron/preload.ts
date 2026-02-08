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
    pasteItem: (id: string) => ipcRenderer.send('paste-item', id),
    copyItem: (id: string) => ipcRenderer.send('copy-item', id),
    togglePin: (id: string) => ipcRenderer.send('toggle-pin', id),
    deleteItem: (id: string) => ipcRenderer.send('delete-item', id),
    clearHistory: () => ipcRenderer.send('clear-history'),
    updateItemContent: (id: string, content: string) => ipcRenderer.send('update-item-content', { id, content }),

    // Preferences
    getPreferences: () => ipcRenderer.invoke('get-preferences'),
    updatePreference: (key: string, value: any) => ipcRenderer.send('update-preference', { key, value }),
    onPreferencesUpdated: (callback: (prefs: any) => void) => {
        const subscription = (_event: IpcRendererEvent, value: any) => callback(value);
        ipcRenderer.on('preferences-updated', subscription);
        return () => ipcRenderer.removeListener('preferences-updated', subscription);
    }
});
