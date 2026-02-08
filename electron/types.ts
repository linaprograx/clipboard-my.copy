export interface ClipboardItemMetadata {
    originalPath?: string;
    hash?: string;
    htmlContent?: string;
    isCode?: boolean;
}

export interface ClipboardItem {
    id: string;
    type: 'text' | 'image' | 'rtf' | 'html' | 'file';
    content: string;
    preview?: string; // For images or truncated text
    timestamp: number;
    pinned: boolean;
    metadata?: ClipboardItemMetadata;
}
