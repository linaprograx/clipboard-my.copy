import { clipboard, nativeImage, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { pathToFileURL, fileURLToPath } from 'url';

const GENERIC_FILE_ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAAANlBMVEWkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKSkpKT///8wbNkZAAAAEHRSTlMAM8z/MzYz////M5xmZpmZQT455wAAAGRJREFUeNrtwQEIQAAMcmd0/v+n52CCg11Ctcpj0fF4PB6Px+PxeDwej8fj8Xg8Ho/H4/F4PB6Px/N5P/4kKd0fMJ6IAAAAAElFTkSuQmCC';

export class FileUtils {

    /**
     * The "Detective". Tries to find a valid local file path from clipboard data.
     * Checks: public.file-url -> text/uri-list -> text/plain (as path)
     */
    static detectFilePath(formats: string[]): string | null {
        let detectedPath: string | null = null;

        try {
            // 1. Check public.file-url (Standard macOS Finder)
            if (formats.includes('public.file-url')) {
                const url = clipboard.read('public.file-url');
                console.log('[FileUtils] Raw public.file-url:', url ? url.substring(0, 200) : 'EMPTY/NULL');
                if (url && url.startsWith('file://')) {
                    try {
                        detectedPath = fileURLToPath(url);
                    } catch (e) {
                        // ignore malformed URLs
                    }
                }
            }

            // 2. Check text/uri-list (Linux/macOS fallback)
            if (!detectedPath && formats.includes('text/uri-list')) {
                const uriList = clipboard.read('text/uri-list');
                // Silenced log

                const lines = uriList.split(/[\r\n]+/);
                const fileLine = lines.find(line => line.trim().startsWith('file://'));
                if (fileLine) {
                    try {
                        detectedPath = fileURLToPath(fileLine.trim());
                        // Silenced log
                    } catch (e) {
                        // Silenced log
                    }
                }
            }

            // 3. Check text/plain (The "Text as Path" fallback)
            if (!detectedPath) {
                // Read text, decode it just in case it's a file:// string turned into text
                let text = clipboard.readText().trim();

                // Common issue: "file:///Users/..." copy-pasted as text
                if (text.startsWith('file://')) {
                    try { text = fileURLToPath(text); } catch (e) { }
                }

                // NEW HEURISTIC: If text is just a filename (e.g. "image.png"), check Downloads/Desktop
                // This fixes the issue where macOS sets text to filename but file-url is empty/invalid
                if (!detectedPath && text.length > 0 && !text.includes('/') && !text.includes('\\')) {
                    try {
                        const downloadsPath = path.join(app.getPath('downloads'), text);
                        const desktopPath = path.join(app.getPath('desktop'), text);

                        if (fs.existsSync(downloadsPath)) {
                            detectedPath = downloadsPath;
                            // console.log('[FileUtils] Found orphan filename in Downloads:', detectedPath);
                        } else if (fs.existsSync(desktopPath)) {
                            detectedPath = desktopPath;
                            // console.log('[FileUtils] Found orphan filename in Desktop:', detectedPath);
                        }
                    } catch (e) { }
                }

                // Heuristic: Must start with / (absolute path)
                if (!detectedPath && text.startsWith('/')) {
                    if (fs.existsSync(text)) {
                        try {
                            const stats = fs.statSync(text);
                            if (stats.isFile()) {
                                detectedPath = text;
                                console.log('[FileUtils] Detected valid file from plain text:', text);
                            }
                        } catch (e) { }
                    } else {
                        // Debug why it failed existence check
                        console.log('[FileUtils] Text looks like path but fs.existsSync failed:', text);
                    }
                }
            }

            // Final Verification: Does it actually exist?
            if (detectedPath) {
                return detectedPath;
            } else {
                // DEBUG: too noisy
                // console.log('[FileUtils] Failed to detect path. Formats:', formats);
                return null;
            }

        } catch (e) {
            console.error('[FileUtils] Error detecting file path:', e);
            return null;
        }
    }

    /**
     * The "Artist". Generates the best possible preview for a file.
     * Fallback Chain: QuickLook -> HD Image -> System Icon -> Generic
     */
    static async generateFilePreview(filePath: string): Promise<{ preview: string, type: 'image' | 'text' }> {
        let preview = '';

        const ext = path.extname(filePath).toLowerCase();
        const isImageFile = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff', '.ico', '.svg'].includes(ext);
        const isPdf = ext === '.pdf';

        try {
            // 1. QuickLook (Best for PDFs, Videos, some Images)
            // Especially critical for PDFs to get the first page
            try {
                const thumbnail = await nativeImage.createThumbnailFromPath(filePath, { width: 600, height: 600 });
                if (!thumbnail.isEmpty()) {
                    preview = thumbnail.toDataURL();
                    // console.log('[FileUtils] Action: QuickLook');
                }
            } catch (e) {
                // Ignore QuickLook failures (common on some OS versions/permissions)
            }

            // 2. HD Image Load (If QuickLook failed but it IS an image)
            if (!preview && isImageFile) {
                try {
                    const image = nativeImage.createFromPath(filePath);
                    if (!image.isEmpty()) {
                        preview = image.resize({ height: 600 }).toDataURL();
                        // console.log('[FileUtils] Action: HD Image');
                    }
                } catch (e) { }
            }

            // 3. System File Icon (Guaranteed visual for any file)
            if (!preview) {
                try {
                    const icon = await app.getFileIcon(filePath, { size: 'normal' });
                    if (!icon.isEmpty()) {
                        preview = icon.toDataURL();
                        // console.log('[FileUtils] Action: System Icon');
                    }
                } catch (e) { }
            }

            // 4. Generic Fallback
            if (!preview) {
                preview = GENERIC_FILE_ICON;
                console.warn('[FileUtils] Action: Generic Fallback (Everything failed)');
            }

        } catch (error) {
            console.error('[FileUtils] Error generating preview:', error);
            preview = GENERIC_FILE_ICON;
        }

        // Return 'image' only if it's strictly an image file, otherwise 'file' for PDF/Docs
        const finalType = isImageFile ? 'image' : (preview ? 'file' : 'text');

        return {
            preview,
            type: finalType as any
        };
    }
}
