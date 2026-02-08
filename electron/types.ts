export interface ClipboardItemMetadata {
    originalPath?: string;
    hash?: string;
    htmlContent?: string;
    isCode?: boolean;
    openGraphValues?: {
        title?: string;
        image?: string;
        description?: string;
        url?: string;
    };
    width?: number;
    height?: number;
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
