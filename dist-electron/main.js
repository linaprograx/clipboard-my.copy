"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const { fileURLToPath } = require('url');
const electron_store_1 = __importDefault(require("electron-store"));
const ClipboardService_1 = require("./services/ClipboardService");
// Store Setup
const store = new electron_store_1.default({
    defaults: { history: [] }
});
// Startup Cleanup: Remove "Division Palermo" card if exists
const history = store.get('history', []);
const sanitizedHistory = history.filter(item => {
    const content = (item.content || '').toLowerCase();
    const isDivisionPalermo = content.includes('division palermo') || content.includes('división palermo');
    return !isDivisionPalermo;
});
if (history.length !== sanitizedHistory.length) {
    store.set('history', sanitizedHistory);
    console.log('Sanitized history: Removed "Division Palermo" card(s)');
}
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Removed electron-squirrel-startup check to prevent issues on non-Windows platforms/dev.
let mainWindow = null;
let clipboardService = null;
let lastClipboardContent = '';
const createWindow = () => {
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const { width } = primaryDisplay.bounds;
    const { height: screenHeight } = primaryDisplay.bounds;
    const APP_HEIGHT = 280; // Reduced height (Compact Dock)
    mainWindow = new electron_1.BrowserWindow({
        width: width,
        height: APP_HEIGHT,
        x: 0,
        y: screenHeight - APP_HEIGHT, // Sit at the absolute bottom of the screen
        frame: false,
        transparent: true,
        vibrancy: 'fullscreen-ui', // Darker vibrancy for the "Paste" look
        visualEffectState: 'active',
        resizable: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        hasShadow: false,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false, // Allow ESM preload?
        },
    });
    // Force exact bounds
    const setBounds = () => {
        if (!mainWindow)
            return;
        mainWindow.setBounds({
            x: 0,
            y: screenHeight - APP_HEIGHT,
            width: width,
            height: APP_HEIGHT
        });
    };
    setBounds();
    // Aggressively ensure bounds on macOS
    setTimeout(setBounds, 100);
    setTimeout(setBounds, 500);
    setTimeout(setBounds, 1000);
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
    // Ensure service has the latest window reference
    if (clipboardService) {
        clipboardService.updateMainWindow(mainWindow);
    }
};
// Helper to update store and notify renderer
const dispatchClipboardUpdate = (newItem) => {
    // ... (logic remains same, shortened for brevity if possible, keeping functionality)
    const history = store.get('history', []);
    // Avoid exact duplicate at the top
    if (history.length > 0) {
        const top = history[0];
        if (top.type === newItem.type && (top.content === newItem.content || top.preview === newItem.preview)) {
            // Duplicate detected. Sync if needed.
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('clipboard-updated', history);
            }
            return;
        }
    }
    const newHistory = [newItem, ...history].slice(0, 100);
    store.set('history', newHistory);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('clipboard-changed', newItem);
    }
};
// Register Privileged Schemes (MUST be done before app is ready)
electron_1.protocol.registerSchemesAsPrivileged([
    {
        scheme: 'thumbnail',
        privileges: {
            secure: true,
            standard: true,
            supportFetchAPI: true,
            bypassCSP: true,
            corsEnabled: true
        }
    }
]);
electron_1.app.whenReady().then(() => {
    // 1. Register 'thumbnail://' protocol
    electron_1.protocol.registerFileProtocol('thumbnail', (request, callback) => {
        let url = request.url;
        console.log('[Protocol] RAW REQUEST:', url);
        // Remove protocol scheme
        url = url.replace(/^thumbnail:\/*/i, '');
        // Remove any trailing slashes
        url = url.replace(/\/+$/, '');
        const filename = decodeURIComponent(url);
        const filePath = path_1.default.join(electron_1.app.getPath('userData'), 'thumbnails', filename);
        console.log('[Protocol] Cleaned filename:', filename);
        console.log('[Protocol] Full path:', filePath);
        console.log('[Protocol] Exists:', fs_1.default.existsSync(filePath));
        if (!fs_1.default.existsSync(filePath)) {
            console.error('[Protocol] ERROR: File not found');
            callback({ error: -6 }); // NET_ERROR(FILE_NOT_FOUND)
            return;
        }
        callback({ path: filePath });
    });
    createWindow();
    // Initialize Clipboard Service
    console.log('[Main] UserData Path:', electron_1.app.getPath('userData'));
    console.log('[Main] Initializing ClipboardService...');
    try {
        clipboardService = new ClipboardService_1.ClipboardService(store, mainWindow);
        clipboardService.startMonitoring();
        console.log('[Main] ClipboardService initialized successfully.');
    }
    catch (err) {
        console.error('[Main] Failed to initialize ClipboardService:', err);
    }
    // Global Shortcut
    try {
        electron_1.globalShortcut.register('CommandOrControl+Shift+V', () => {
            if (mainWindow) {
                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                }
                else {
                    // Send current history before showing
                    mainWindow.webContents.send('clipboard-updated', store.get('history'));
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        });
    }
    catch (e) {
        // Ignore registration errors
    }
});
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
// IPC Handlers
electron_1.ipcMain.handle('get-history', () => {
    return store.get('history', []);
});
electron_1.ipcMain.on('hide-window', () => {
    mainWindow?.hide();
});
electron_1.ipcMain.on('toggle-pin', (event, id) => {
    const history = store.get('history');
    const index = history.findIndex(item => item.id === id);
    if (index !== -1) {
        history[index].pinned = !history[index].pinned;
        store.set('history', history);
        mainWindow?.webContents.send('clipboard-updated', history);
    }
});
electron_1.ipcMain.on('copy-item', (event, id) => {
    if (!id || typeof id !== 'string')
        return;
    const history = store.get('history');
    const item = history.find(i => i.id === id);
    if (!item)
        return;
    try {
        if (item.type === 'image' && item.preview) {
            const img = electron_1.nativeImage.createFromDataURL(item.preview);
            if (!img.isEmpty()) {
                electron_1.clipboard.writeImage(img);
                lastClipboardContent = item.preview;
            }
        }
        else {
            electron_1.clipboard.writeText(item.content);
            lastClipboardContent = item.content;
        }
        // Do NOT hide window, just copy
    }
    catch (err) {
        console.error('Failed to copy item:', err);
    }
});
electron_1.ipcMain.on('paste-item', (event, id) => {
    if (!id || typeof id !== 'string')
        return;
    const history = store.get('history');
    const item = history.find(i => i.id === id);
    if (!item)
        return;
    // 1. Write to clipboard
    try {
        if (item.type === 'image' && item.preview) {
            const img = electron_1.nativeImage.createFromDataURL(item.preview);
            if (!img.isEmpty()) {
                electron_1.clipboard.writeImage(img);
                lastClipboardContent = item.preview;
            }
        }
        else {
            electron_1.clipboard.writeText(item.content);
            lastClipboardContent = item.content;
        }
        // 2. Hide window
        mainWindow?.hide();
        // 3. Simulate paste (CMD+V)
        const script = `osascript -e 'tell application "System Events" to keystroke "v" using command down'`;
        (0, child_process_1.exec)(script);
    }
    catch (err) {
        // Silently fail
    }
});
electron_1.ipcMain.on('delete-item', (event, id) => {
    const history = store.get('history');
    const itemToDelete = history.find(item => item.id === id);
    if (itemToDelete && itemToDelete.content === lastClipboardContent) {
        lastClipboardContent = '';
    }
    const newHistory = history.filter(item => item.id !== id);
    store.set('history', newHistory);
    mainWindow?.webContents.send('clipboard-updated', newHistory);
});
electron_1.ipcMain.on('clear-history', () => {
    store.set('history', []);
    lastClipboardContent = '';
    mainWindow?.webContents.send('clipboard-updated', []);
});
electron_1.ipcMain.on('update-item-content', (event, { id, content }) => {
    const history = store.get('history');
    const index = history.findIndex(item => item.id === id);
    if (index !== -1) {
        history[index].content = content;
        history[index].timestamp = Date.now();
        store.set('history', history);
        mainWindow?.webContents.send('clipboard-updated', history);
    }
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('will-quit', () => {
    electron_1.globalShortcut.unregisterAll();
});
