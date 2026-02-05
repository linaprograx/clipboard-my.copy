export interface ClipboardItem {
    id: string;
    type: 'text' | 'image' | 'rtf' | 'html';
    content: string;
    preview?: string; // For images or truncated text
    timestamp: number;
    pinned: boolean;
}
