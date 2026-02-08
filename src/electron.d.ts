export interface ClipboardItem {
    id: string;
    type: 'text' | 'image' | 'rtf' | 'html';
    content: string;
    preview?: string;
    timestamp: number;
    pinned: boolean;
}

export interface IElectronAPI {
    hideWithoutPaste: () => Promise<void>;
    getHistory: () => Promise<ClipboardItem[]>;
    onClipboardUpdate: (callback: (history: ClipboardItem[]) => void) => () => void;
    onClipboardChanged: (callback: (item: ClipboardItem) => void) => () => void;
    pasteItem: (id: string) => Promise<void>;
    copyItem: (id: string) => Promise<void>;
    togglePin: (id: string) => Promise<void>;
    deleteItem: (id: string) => Promise<void>;
    clearHistory: () => Promise<void>;
    updateItemContent: (id: string, content: string) => Promise<void>;

    // Preferences
    getPreferences: () => Promise<any>;
    updatePreference: (key: string, value: any) => Promise<void>;
    onPreferencesUpdated: (callback: (prefs: any) => void) => () => void;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}
