import { clipboard, BrowserWindow, nativeImage } from 'electron';
import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import { ClipboardItem } from '../types';
import { FileUtils } from '../utils/FileUtils';
import { ImageStorageService } from './ImageStorageService';
import path from 'path';

export class ClipboardService {
    private store: Store<{ history: ClipboardItem[] }>;
    private mainWindow: BrowserWindow | null;
    private imageStorage: ImageStorageService;
    private lastClipboardContent: string = '';
    private isProcessing: boolean = false;
    private intervalId: NodeJS.Timeout | null = null;
    private POLL_INTERVAL = 1000;

    constructor(store: Store<{ history: ClipboardItem[] }>, mainWindow: BrowserWindow | null) {
        this.store = store;
        this.mainWindow = mainWindow;
        this.imageStorage = new ImageStorageService();
    }

    public updateMainWindow(window: BrowserWindow | null) {
        this.mainWindow = window;
    }

    public startMonitoring() {
        if (this.intervalId) return;

        console.log('[ClipboardService] Starting monitoring...');
        this.intervalId = setInterval(async () => {
            if (this.isProcessing) return;
            this.isProcessing = true;

            try {
                await this.checkClipboard();
            } catch (error) {
                console.error('[ClipboardService] Error in poll loop:', error);
            } finally {
                this.isProcessing = false;
            }
        }, this.POLL_INTERVAL);
    }

    public stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[ClipboardService] Stopped monitoring.');
        }
    }

    private async checkClipboard() {
        const formats = clipboard.availableFormats();
        const history = this.store.get('history', []);

        // CRITICAL DEBUG: Log ALL available formats
        console.log('========================================');
        console.log('[ClipboardService] Available Formats:', formats);
        console.log('[ClipboardService] Format Count:', formats.length);

        // Log the content of each format
        for (const format of formats) {
            try {
                if (format.startsWith('image/')) {
                    console.log(`[ClipboardService] ${format}: [IMAGE DATA]`);
                } else {
                    const content = clipboard.read(format);
                    console.log(`[ClipboardService] ${format}:`, content ? content.substring(0, 100) : 'EMPTY');
                }
            } catch (e) {
                console.log(`[ClipboardService] ${format}: [ERROR READING]`);
            }
        }
        console.log('========================================');

        let newItemCandidate: ClipboardItem | null = null;
        let originalPreviewData: string = ''; // Keep track of raw data for duplicate checking

        // 1. FILE HANDLER (Delegated to FileUtils)
        const detectedFilePath = FileUtils.detectFilePath(formats);

        if (detectedFilePath) {
            // OPTIMIZATION: Check for duplicate file BEFORE generating thumbnail/saving to disk
            // This prevents infinite loop and disk spam
            const signature = `file:${detectedFilePath}`;
            if (signature === this.lastClipboardContent) {
                return;
            }

            const fileName = path.basename(detectedFilePath);
            const { preview: dataUrl, type } = await FileUtils.generateFilePreview(detectedFilePath);

            // Convert DataURL to Thumbnail URL
            let thumbnailUrl = '';
            if (dataUrl && dataUrl.startsWith('data:')) {
                const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                const filename = await this.imageStorage.saveThumbnail(buffer);
                thumbnailUrl = this.imageStorage.getThumbnailUrl(filename);
            } else if (dataUrl) {
                // If it's already a URL or empty? Unlikely given FileUtils.
                thumbnailUrl = dataUrl;
            }

            newItemCandidate = {
                id: uuidv4(),
                type: type, // Should always be 'image' now
                content: fileName,
                preview: thumbnailUrl,
                timestamp: Date.now(),
                pinned: false,
                metadata: { originalPath: detectedFilePath }
            };
            originalPreviewData = dataUrl; // Use dataUrl for duplicate checking signature

            console.log(`[ClipboardService] File Detected: ${fileName} -> ${thumbnailUrl}`);
        }

        // 2. IMAGE HANDLER (Non-file images, e.g. web screenshots)
        if (!newItemCandidate) {
            if (formats.some(f => f.startsWith('image/'))) {
                const image = clipboard.readImage();
                if (!image.isEmpty()) {
                    const dataUrl = image.resize({ height: 600 }).toDataURL();

                    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
                    const buffer = Buffer.from(base64Data, 'base64');
                    const filename = await this.imageStorage.saveThumbnail(buffer);
                    const thumbnailUrl = this.imageStorage.getThumbnailUrl(filename);

                    newItemCandidate = {
                        id: uuidv4(),
                        type: 'image',
                        content: 'Image content placeholder',
                        preview: thumbnailUrl,
                        timestamp: Date.now(),
                        pinned: false
                    };
                    originalPreviewData = dataUrl;
                }
            }
        }

        // 3. TEXT HANDLER
        if (!newItemCandidate) {
            const text = clipboard.readText();
            if (text && text.trim().length > 0) {
                newItemCandidate = {
                    id: uuidv4(),
                    type: 'text',
                    content: text,
                    timestamp: Date.now(),
                    pinned: false
                };
            }
        }

        // 4. DE-DUPLICATION & SAVE
        if (newItemCandidate) {
            // Robust Signature Calculation
            let signature = '';

            if (newItemCandidate.metadata && newItemCandidate.metadata.originalPath) {
                // If it came from a file, the path IS the signature.
                signature = `file:${newItemCandidate.metadata.originalPath}`;
            } else {
                // For other content, use type + content + preview length
                const signaturePreview = originalPreviewData || newItemCandidate.preview || '';
                const contentSig = newItemCandidate.content.substring(0, 50);
                signature = `${newItemCandidate.type}:${newItemCandidate.content.length}:${contentSig}:${signaturePreview.length}`;
            }

            // Check against last captured signature (Fast check)
            // console.log(`[ClipboardService] Sig Check: '${signature}' vs '${this.lastClipboardContent}'`);
            if (signature === this.lastClipboardContent) {
                return;
            } else {
                console.log(`[ClipboardService] New Signature Detected: '${signature}' (Old: '${this.lastClipboardContent}')`);
            }

            // Check against history top item (Deep check)
            const lastItem = history.length > 0 ? history[0] : null;

            // For duplicate checking with history, we might need a smarter check since previews are now URLs
            // But usually, if content matches and type matches, it's a duplicate for text/files.
            // For images, it's harder. Let's rely on our local `lastClipboardContent` for the immediate loop.

            this.saveItem(newItemCandidate);
            this.lastClipboardContent = signature;
            console.log(`[ClipboardService] Updated Last Content: '${this.lastClipboardContent}'`);
            console.log('[ClipboardService] New Item Saved:', newItemCandidate.type);
        }
    }

    private saveItem(newItem: ClipboardItem) {
        const history = this.store.get('history', []);
        const newHistory = [newItem, ...history].slice(0, 100);
        this.store.set('history', newHistory);

        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('clipboard-changed', newItem);
        }
    }
}
