import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export class ImageStorageService {
    private storagePath: string;

    constructor() {
        this.storagePath = path.join(app.getPath('userData'), 'thumbnails');
        this.ensureDirectoryExists();
    }

    private ensureDirectoryExists() {
        if (!fs.existsSync(this.storagePath)) {
            fs.mkdirSync(this.storagePath, { recursive: true });
        }
    }

    /**
     * Saves a buffer as a PNG file and returns the unique ID/Filename.
     */
    public async saveThumbnail(buffer: Buffer): Promise<string> {
        const id = uuidv4();
        const filename = `${id}.png`;
        const filePath = path.join(this.storagePath, filename);

        await fs.promises.writeFile(filePath, buffer);
        console.log('[ImageStorageService] Saved thumbnail:', filename);

        return filename;
    }

    /**
     * Gets the full path for a given thumbnail filename.
     */
    public getThumbnailPath(filename: string): string {
        return path.join(this.storagePath, filename);
    }

    /**
     * Helper to get the protocol URL for a filename.
     * e.g. thumbnail://abc-123.png (with 2 slashes, not 3)
     */
    public getThumbnailUrl(filename: string): string {
        // CRITICAL: Use exactly 2 slashes, not 3
        // Electron protocol handlers expect: scheme://filename
        return `thumbnail://${filename}`;
    }
}
