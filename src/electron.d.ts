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
    pasteItem: (item: ClipboardItem) => void;
    pinItem: (id: string) => void;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}
