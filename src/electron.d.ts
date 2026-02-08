export interface ClipboardItem {
    id: string;
    type: 'text' | 'image' | 'rtf' | 'html';
    content: string;
    preview?: string;
    timestamp: number;
    pinned: boolean;
}

export interface IElectronAPI {
    hideWithoutPaste: () => void;
    getHistory: () => Promise<ClipboardItem[]>;
    onClipboardUpdate: (callback: (history: ClipboardItem[]) => void) => () => void;
    onClipboardChanged: (callback: (item: ClipboardItem) => void) => () => void;
    pasteItem: (item: ClipboardItem) => void;
    pinItem: (id: string) => void;
    deleteItem: (id: string) => void;
    clearHistory: () => void;
    updateItemContent: (id: string, content: string) => void;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}
