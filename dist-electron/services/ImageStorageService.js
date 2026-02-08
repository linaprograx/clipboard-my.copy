"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImageStorageService = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
class ImageStorageService {
    storagePath;
    constructor() {
        this.storagePath = path_1.default.join(electron_1.app.getPath('userData'), 'thumbnails');
        this.ensureDirectoryExists();
    }
    ensureDirectoryExists() {
        if (!fs_1.default.existsSync(this.storagePath)) {
            fs_1.default.mkdirSync(this.storagePath, { recursive: true });
        }
    }
    /**
     * Saves a buffer as a PNG file and returns the unique ID/Filename.
     */
    async saveThumbnail(buffer) {
        const id = (0, uuid_1.v4)();
        const filename = `${id}.png`;
        const filePath = path_1.default.join(this.storagePath, filename);
        await fs_1.default.promises.writeFile(filePath, buffer);
        console.log('[ImageStorageService] Saved thumbnail:', filename);
        return filename;
    }
    /**
     * Gets the full path for a given thumbnail filename.
     */
    getThumbnailPath(filename) {
        return path_1.default.join(this.storagePath, filename);
    }
    /**
     * Helper to get the protocol URL for a filename.
     * e.g. thumbnail://abc-123.png (with 2 slashes, not 3)
     */
    getThumbnailUrl(filename) {
        // CRITICAL: Use exactly 2 slashes, not 3
        // Electron protocol handlers expect: scheme://filename
        return `thumbnail://${filename}`;
    }
}
exports.ImageStorageService = ImageStorageService;
