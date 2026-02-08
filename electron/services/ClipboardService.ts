import { clipboard, BrowserWindow, nativeImage } from 'electron';
import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { ClipboardItem } from '../types';
import { FileUtils } from '../utils/FileUtils';
import { ImageStorageService } from './ImageStorageService';
import { LinkPreviewService } from './LinkPreviewService';
import path from 'path';

export class ClipboardService {
    private store: Store<{ history: ClipboardItem[] }>;
    private mainWindow: BrowserWindow | null;
    private imageStorage: ImageStorageService;
    private lastClipboardHash: string = '';
    private isProcessing: boolean = false;
    private intervalId: NodeJS.Timeout | null = null;
    private POLL_INTERVAL = 1000;
    private static MAX_HISTORY_SIZE = 200;

    constructor(store: Store<{ history: ClipboardItem[] }>, mainWindow: BrowserWindow | null) {
        this.store = store;
        this.mainWindow = mainWindow;
        this.imageStorage = new ImageStorageService();
        this.migrateLegacyItems();
    }

    private migrateLegacyItems() {
        const history = this.store.get('history', []);
        let changed = false;

        const migrated = history.map(item => {
            if (!item.metadata || !item.metadata.hash) {
                // Generate missing hash
                const hash = this.generateHash(
                    item.content,
                    item.type,
                    item.metadata?.originalPath || item.preview || ''
                );

                changed = true;
                return {
                    ...item,
                    metadata: {
                        ...item.metadata,
                        hash: hash
                    }
                };
            }
            return item;
        });

        if (changed) {
            console.log('[ClipboardService] Migrated legacy items with hashes.');
            this.store.set('history', migrated);
        }
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

    private generateHash(content: string, type: string, extra: string = ''): string {
        return createHash('sha256')
            .update(`${type}:${content}:${extra}`)
            .digest('hex');
    }

    private async checkClipboard() {
        const formats = clipboard.availableFormats();

        // Fast exit if no formats (clipboard empty/cleared)
        if (formats.length === 0) return;

        let newItemCandidate: ClipboardItem | null = null;
        let contentHash = '';

        // 1. FILE HANDLER
        const detectedFilePath = FileUtils.detectFilePath(formats);
        if (detectedFilePath) {
            const fileName = path.basename(detectedFilePath);
            contentHash = this.generateHash(detectedFilePath, 'file');

            // Fast check against last capture
            if (contentHash === this.lastClipboardHash) return;

            const { preview: dataUrl, type } = await FileUtils.generateFilePreview(detectedFilePath);

            // Process thumbnail
            let thumbnailUrl = '';
            if (dataUrl && dataUrl.startsWith('data:')) {
                const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                const filename = await this.imageStorage.saveThumbnail(buffer);
                thumbnailUrl = this.imageStorage.getThumbnailUrl(filename);
            } else if (dataUrl) {
                thumbnailUrl = dataUrl;
            }

            newItemCandidate = {
                id: uuidv4(),
                type: 'file', // Explicitly 'file'
                content: fileName,
                preview: thumbnailUrl,
                timestamp: Date.now(),
                pinned: false,
                metadata: {
                    originalPath: detectedFilePath,
                    hash: contentHash
                }
            };
        }

        // 2. IMAGE HANDLER (Non-file images)
        if (!newItemCandidate && formats.some(f => f.startsWith('image/'))) {
            const image = clipboard.readImage();
            if (!image.isEmpty()) {
                const dataUrl = image.resize({ height: 600 }).toDataURL();
                // For images, we hash the base64 data
                contentHash = this.generateHash(dataUrl, 'image');

                if (contentHash === this.lastClipboardHash) return;

                const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                const filename = await this.imageStorage.saveThumbnail(buffer);
                const thumbnailUrl = this.imageStorage.getThumbnailUrl(filename);

                newItemCandidate = {
                    id: uuidv4(),
                    type: 'image',
                    content: 'Image',
                    preview: thumbnailUrl,
                    timestamp: Date.now(),
                    pinned: false,
                    metadata: { hash: contentHash }
                };
            }
        }

        // 3. TEXT/HTML HANDLER
        if (!newItemCandidate) {
            const text = clipboard.readText();
            const html = clipboard.readHTML();

            if (text && text.trim().length > 0) {
                contentHash = this.generateHash(text, 'text');

                if (contentHash === this.lastClipboardHash) return;

                const isCode = this.detectCode(text);

                // Check if it's a URL
                let isUrl = false;
                try {
                    // Basic URL validation
                    const url = new URL(text);
                    isUrl = ['http:', 'https:'].includes(url.protocol);
                } catch (e) { }

                newItemCandidate = {
                    id: uuidv4(),
                    type: isUrl ? 'text' : (html ? 'html' : 'text'),
                    content: text,
                    timestamp: Date.now(),
                    pinned: false,
                    metadata: {
                        hash: contentHash,
                        htmlContent: html || undefined,
                        isCode: isCode
                    }
                };

                // If it's a URL, fetch metadata asynchronously
                if (isUrl && !isCode) {
                    this.enrichLinkItem(newItemCandidate);
                }
            }
        }

        // 4. SAVE & DEDUPLICATE
        if (newItemCandidate && contentHash) {
            this.handleNewItem(newItemCandidate, contentHash);
            this.lastClipboardHash = contentHash;
        }
    }

    private async enrichLinkItem(item: ClipboardItem) {
        if (!item.metadata) return; // Should not happen

        try {
            console.log(`[ClipboardService] Fetching metadata for: ${item.content}`);
            const metadata = await LinkPreviewService.fetchMetadata(item.content);

            if (metadata.openGraphValues?.title || metadata.openGraphValues?.image) {

                // Update the item in the store
                const history = this.store.get('history', []);
                const index = history.findIndex(i => i.id === item.id);

                if (index !== -1) {
                    history[index].metadata = {
                        ...history[index].metadata,
                        ...metadata
                    };

                    this.store.set('history', history);

                    // Notify renderer of update
                    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                        this.mainWindow.webContents.send('clipboard-updated', history);
                    }
                    console.log(`[ClipboardService] Enriched Link: ${item.content} -> ${metadata.openGraphValues.title}`);
                }
            }
        } catch (e) {
            console.error('[ClipboardService] Failed to enrich link:', e);
        }
    }

    private detectCode(text: string): boolean {
        // Simple heuristic for code detection
        const codePatterns = [
            /^(const|let|var|function|class|import|export|if|for|while|return)\s/gm,
            /[\{\}\[\]\(\);]/g,
            /^\s{2,}/gm
        ];

        let score = 0;
        if (codePatterns[0].test(text)) score += 2;
        if ((text.match(codePatterns[1]) || []).length > 3) score += 1;
        if (codePatterns[2].test(text)) score += 1;

        return score >= 2;
    }

    private handleNewItem(newItem: ClipboardItem, hash: string) {
        const history = this.store.get('history', []);

        // Check for existing item with same hash
        const existingIndex = history.findIndex(item => item.metadata?.hash === hash || item.content === newItem.content);

        let newHistory: ClipboardItem[];

        if (existingIndex !== -1) {
            // DUPLICATE FOUND: Move to top, update timestamp
            const existingItem = history[existingIndex];

            // If pinned, just update timestamp but keep pinned status
            // If not pinned, it effectively becomes the "newest" item
            const updatedItem = {
                ...existingItem,
                timestamp: Date.now(),
                // Update preview if it was missing/broken? maybe not for now.
            };

            // Remove old instance
            history.splice(existingIndex, 1);
            // Add to top
            newHistory = [updatedItem, ...history];
            console.log(`[ClipboardService] Duplicate detected. Bumped item ${existingItem.id} to top.`);
        } else {
            // NEW ITEM
            newHistory = [newItem, ...history];
            console.log(`[ClipboardService] New item captured: ${newItem.type}`);
        }

        // ENFORCE LIMITS
        newHistory = this.enforceHistoryLimit(newHistory);

        this.store.set('history', newHistory);

        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('clipboard-updated', newHistory);
        }
    }

    private enforceHistoryLimit(history: ClipboardItem[]): ClipboardItem[] {
        if (history.length <= ClipboardService.MAX_HISTORY_SIZE) {
            return history;
        }

        // We need to remove items.
        // Strategy: Keep all pinned items. Remove unpinned items starting from the oldest.
        // If we have > MAX_HISTORY_SIZE pinned items, we have to keep them all (user intent wins).

        const pinnedItems = history.filter(item => item.pinned);
        const unpinnedItems = history.filter(item => !item.pinned);

        if (pinnedItems.length >= ClipboardService.MAX_HISTORY_SIZE) {
            // Edge case: User pinned more than the limit. We keep all pinned + maybe a few unpinned if we want?
            // Spec says "Set default max history size of 200 items (excluding pinned items)"
            // -> "When limit is exceeded, remove the oldest non-pinned items first"

            // Let's interpret "excluding pinned items" as "Pinned items don't count towards the recycling limit" 
            // OR "We can go above 200 if they are pinned".
            // Let's go with: Keep all pinned. Trim unpinned to (MAX - pinned.length) or 0.

            // Actually, usually "LIMIT" implies total size shown. 
            // "excluding pinned items" in the prompt request likely means "200 items PLUS pinned items" or "200 non-pinned items".
            // Let's stick to a safe interpretation: Total list size target is 200. Pinned items are protected.

            // Wait, "Set a default maximum history size of 200 items (excluding pinned items)" -> This effectively means we can have 200 unpinned items + N pinned items.

            const maxUnpinned = ClipboardService.MAX_HISTORY_SIZE;
            const trimmedUnpinned = unpinnedItems.slice(0, maxUnpinned); // Keep newest 200 unpinned

            // Re-merge. We need to maintain order? 
            // The `history` array is sorted by "most recent" (index 0). 
            // We should filter the original list to respect order.

            const allowedIds = new Set([
                ...pinnedItems.map(i => i.id),
                ...trimmedUnpinned.map(i => i.id)
            ]);

            return history.filter(item => allowedIds.has(item.id));
        } else {
            // Normal case: We have space for some unpinned items.
            // But if the spec says "200 items (excluding pinned items)", it implies the limit applies ONLY to the unpinned count.
            // So we can always keep 200 unpinned items.

            const maxUnpinned = ClipboardService.MAX_HISTORY_SIZE;
            const trimmedUnpinned = unpinnedItems.slice(0, maxUnpinned);

            const allowedIds = new Set([
                ...pinnedItems.map(i => i.id),
                ...trimmedUnpinned.map(i => i.id)
            ]);

            return history.filter(item => allowedIds.has(item.id));
        }
    }
}
