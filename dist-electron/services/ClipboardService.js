"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClipboardService = void 0;
const electron_1 = require("electron");
const uuid_1 = require("uuid");
const FileUtils_1 = require("../utils/FileUtils");
const ImageStorageService_1 = require("./ImageStorageService");
const path_1 = __importDefault(require("path"));
class ClipboardService {
    store;
    mainWindow;
    imageStorage;
    lastClipboardContent = '';
    isProcessing = false;
    intervalId = null;
    POLL_INTERVAL = 1000;
    constructor(store, mainWindow) {
        this.store = store;
        this.mainWindow = mainWindow;
        this.imageStorage = new ImageStorageService_1.ImageStorageService();
    }
    updateMainWindow(window) {
        this.mainWindow = window;
    }
    startMonitoring() {
        if (this.intervalId)
            return;
        console.log('[ClipboardService] Starting monitoring...');
        this.intervalId = setInterval(async () => {
            if (this.isProcessing)
                return;
            this.isProcessing = true;
            try {
                await this.checkClipboard();
            }
            catch (error) {
                console.error('[ClipboardService] Error in poll loop:', error);
            }
            finally {
                this.isProcessing = false;
            }
        }, this.POLL_INTERVAL);
    }
    stopMonitoring() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
            console.log('[ClipboardService] Stopped monitoring.');
        }
    }
    async checkClipboard() {
        const formats = electron_1.clipboard.availableFormats();
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
                }
                else {
                    const content = electron_1.clipboard.read(format);
                    console.log(`[ClipboardService] ${format}:`, content ? content.substring(0, 100) : 'EMPTY');
                }
            }
            catch (e) {
                console.log(`[ClipboardService] ${format}: [ERROR READING]`);
            }
        }
        console.log('========================================');
        let newItemCandidate = null;
        let originalPreviewData = ''; // Keep track of raw data for duplicate checking
        // 1. FILE HANDLER (Delegated to FileUtils)
        const detectedFilePath = FileUtils_1.FileUtils.detectFilePath(formats);
        if (detectedFilePath) {
            // OPTIMIZATION: Check for duplicate file BEFORE generating thumbnail/saving to disk
            // This prevents infinite loop and disk spam
            const signature = `file:${detectedFilePath}`;
            if (signature === this.lastClipboardContent) {
                return;
            }
            const fileName = path_1.default.basename(detectedFilePath);
            const { preview: dataUrl, type } = await FileUtils_1.FileUtils.generateFilePreview(detectedFilePath);
            // Convert DataURL to Thumbnail URL
            let thumbnailUrl = '';
            if (dataUrl && dataUrl.startsWith('data:')) {
                const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                const filename = await this.imageStorage.saveThumbnail(buffer);
                thumbnailUrl = this.imageStorage.getThumbnailUrl(filename);
            }
            else if (dataUrl) {
                // If it's already a URL or empty? Unlikely given FileUtils.
                thumbnailUrl = dataUrl;
            }
            newItemCandidate = {
                id: (0, uuid_1.v4)(),
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
                const image = electron_1.clipboard.readImage();
                if (!image.isEmpty()) {
                    const dataUrl = image.resize({ height: 600 }).toDataURL();
                    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
                    const buffer = Buffer.from(base64Data, 'base64');
                    const filename = await this.imageStorage.saveThumbnail(buffer);
                    const thumbnailUrl = this.imageStorage.getThumbnailUrl(filename);
                    newItemCandidate = {
                        id: (0, uuid_1.v4)(),
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
            const text = electron_1.clipboard.readText();
            if (text && text.trim().length > 0) {
                newItemCandidate = {
                    id: (0, uuid_1.v4)(),
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
            }
            else {
                // For other content, use type + content + preview length
                const signaturePreview = originalPreviewData || newItemCandidate.preview || '';
                const contentSig = newItemCandidate.content.substring(0, 50);
                signature = `${newItemCandidate.type}:${newItemCandidate.content.length}:${contentSig}:${signaturePreview.length}`;
            }
            // Check against last captured signature (Fast check)
            // console.log(`[ClipboardService] Sig Check: '${signature}' vs '${this.lastClipboardContent}'`);
            if (signature === this.lastClipboardContent) {
                return;
            }
            else {
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
    saveItem(newItem) {
        const history = this.store.get('history', []);
        const newHistory = [newItem, ...history].slice(0, 100);
        this.store.set('history', newHistory);
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('clipboard-changed', newItem);
        }
    }
}
exports.ClipboardService = ClipboardService;
