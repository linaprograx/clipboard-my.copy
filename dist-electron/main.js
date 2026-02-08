"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const electron_store_1 = __importDefault(require("electron-store"));
const uuid_1 = require("uuid");
// Store Setup
const store = new electron_store_1.default({
    defaults: { history: [] }
});
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Removed electron-squirrel-startup check to prevent issues on non-Windows platforms/dev.
let mainWindow = null;
let lastClipboardContent = '';
const createWindow = () => {
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    // Use 'bounds' for width to span the full physical screen, ignoring Dock/Sidebars
    const { width } = primaryDisplay.bounds;
    const { height: workAreaHeight } = primaryDisplay.workAreaSize; // Still use workArea for height to avoid covering top menu bar? 
    // Actually, for "Bottom Dock" that covers the OS Dock, we might want bounds.height too, 
    // but usually we just want to sit at the bottom of the visible area.
    // Let's use bounds.height for calculating 'y' if we want to be TRULY at the bottom.
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
    setTimeout(setBounds, 1000); // Fail-safe explanation: macOS sometimes overrides initial bounds for frameless windows.
    // Ensure it stays at the bottom even if focus changes (optional, aggressive)
    // mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
    // Hide on blur (optional, maybe configurable)
    // mainWindow.on('blur', () => mainWindow?.hide());
};
// ... (existing code) ...
// ... (existing code) ...
// Helper to update store and notify renderer
const dispatchClipboardUpdate = (newItem) => {
    console.log("Dispatching update for item:", newItem.id);
    const history = store.get('history', []);
    // Avoid exact duplicate at the top
    if (history.length > 0) {
        const top = history[0];
        if (top.type === newItem.type && (top.content === newItem.content || top.preview === newItem.preview)) {
            console.log("Duplicate detected. Backend has it, but UI might not. Forcing sync.");
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('clipboard-updated', history);
            }
            return;
        }
    }
    const newHistory = [newItem, ...history].slice(0, 100);
    store.set('history', newHistory);
    if (mainWindow && !mainWindow.isDestroyed()) {
        console.log("Sending 'clipboard-changed' to renderer...");
        mainWindow.webContents.send('clipboard-changed', newItem);
    }
    else {
        console.error("MainWindow is missing or destroyed, cannot send IPC.");
    }
};
electron_1.app.whenReady().then(() => {
    createWindow();
    // Global Shortcut
    const ret = electron_1.globalShortcut.register('CommandOrControl+Shift+V', () => {
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
    if (!ret) {
        console.log('registration failed');
    }
});
// Clipboard polling
// Clipboard polling (500ms for responsiveness)
setInterval(() => {
    try {
        // 1. Check Text
        const text = electron_1.clipboard.readText();
        // console.log("Checking clipboard:", text.substring(0, 20)); // Verbose logging
        if (text && text !== lastClipboardContent && text.trim().length > 0) {
            console.log("New text detected:", text.substring(0, 20));
            lastClipboardContent = text;
            const newItem = {
                id: (0, uuid_1.v4)(),
                type: 'text',
                content: text,
                timestamp: Date.now(),
                pinned: false
            };
            dispatchClipboardUpdate(newItem);
        }
        // 2. Check Image (Basic check: if image is diff from last)
        // Note: Reading images is expensive, so we optimized by checking available formats first
        const formats = electron_1.clipboard.availableFormats();
        if (formats.includes('image/png') || formats.includes('image/jpeg')) {
            const image = electron_1.clipboard.readImage();
            if (!image.isEmpty()) {
                const dataUrl = image.toDataURL();
                // Simple diff: length check or store hash. For now, check if different from last content (if it was an image)
                // This is a naive check. A better way is to store the last 'sequenceNumber' if Electron supported it, 
                // or just compare dataUrl length/content if it's not too huge.
                // Let's rely on strict equality for now, but to avoid loop, we need to store it.
                if (dataUrl !== lastClipboardContent) {
                    lastClipboardContent = dataUrl;
                    const newItem = {
                        id: (0, uuid_1.v4)(),
                        type: 'image',
                        content: 'Image content placeholder', // UI uses this for text preview
                        preview: dataUrl, // Actual image data
                        timestamp: Date.now(),
                        pinned: false
                    };
                    dispatchClipboardUpdate(newItem);
                }
            }
        }
    }
    catch (e) {
        console.error("Clipboard poll error", e);
    }
}, 500);
electron_1.app.on('activate', () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
// IPC Handlers
electron_1.ipcMain.handle('get-history', () => {
    const history = store.get('history', []);
    console.log("Renderer requested history. Count:", history.length);
    return history;
});
electron_1.ipcMain.on('hide-window', () => {
    mainWindow?.hide();
});
electron_1.ipcMain.on('paste-item', (event, item) => {
    // 1. Write to clipboard
    electron_1.clipboard.writeText(item.content);
    lastClipboardContent = item.content; // Avoid re-capture loop
    // 2. Hide window
    mainWindow?.hide();
    // 3. Simulate paste (CMD+V)
    // Using robotjs is hard to set up (native deps). 
    // Fallback: Use simple AppleScript via 'osascript' command.
    // It's standard on macOS.
    const script = `osascript -e 'tell application "System Events" to keystroke "v" using command down'`;
    (0, child_process_1.exec)(script);
});
electron_1.ipcMain.on('delete-item', (event, id) => {
    const history = store.get('history');
    const itemToDelete = history.find(item => item.id === id);
    // If we are deleting the item currently in the clipboard memory, reset memory
    // so it can be re-copied immediately if needed.
    if (itemToDelete && itemToDelete.content === lastClipboardContent) {
        lastClipboardContent = '';
    }
    const newHistory = history.filter(item => item.id !== id);
    store.set('history', newHistory);
    mainWindow?.webContents.send('clipboard-updated', newHistory);
});
electron_1.ipcMain.on('clear-history', () => {
    store.set('history', []);
    lastClipboardContent = ''; // Important: Reset so we can re-copy same text
    mainWindow?.webContents.send('clipboard-updated', []);
});
electron_1.ipcMain.on('update-item-content', (event, { id, content }) => {
    const history = store.get('history');
    const index = history.findIndex(item => item.id === id);
    if (index !== -1) {
        history[index].content = content;
        history[index].timestamp = Date.now(); // Update timestamp on edit? Maybe.
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
