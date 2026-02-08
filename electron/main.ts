import { app, BrowserWindow, globalShortcut, ipcMain, screen, clipboard, nativeImage, protocol } from 'electron';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
const { fileURLToPath } = require('url');
import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';
import { ClipboardItem } from './types';
import { ClipboardService } from './services/ClipboardService';


// Store Setup
interface UserPreferences {
    globalShortcut: string;
    launchAtLogin: boolean;
    historyLimit: number;
}

const defaultPreferences: UserPreferences = {
    globalShortcut: 'CommandOrControl+Shift+V',
    launchAtLogin: false,
    historyLimit: 200
};

let store: Store<{ history: ClipboardItem[], preferences: UserPreferences }>;
try {
    store = new Store<{ history: ClipboardItem[], preferences: UserPreferences }>({
        defaults: { history: [], preferences: defaultPreferences },
    });
} catch (err) {
    console.error('Failed to initialize Electron Store, resetting:', err);
    const Store = require('electron-store');
    store = new Store();
    store.clear();
    store.set('history', []);
    store.set('preferences', defaultPreferences);
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Removed electron-squirrel-startup check to prevent issues on non-Windows platforms/dev.

let mainWindow: BrowserWindow | null = null;
let clipboardService: ClipboardService | null = null;
let lastClipboardContent: string = '';

const createWindow = () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width } = primaryDisplay.bounds;
    const { height: screenHeight } = primaryDisplay.bounds;

    const APP_HEIGHT = 280; // Reduced height (Compact Dock)

    mainWindow = new BrowserWindow({
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
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false, // Allow ESM preload?
        },
    });

    // Force exact bounds
    const setBounds = () => {
        if (!mainWindow) return;
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
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Ensure service has the latest window reference
    if (clipboardService) {
        clipboardService.updateMainWindow(mainWindow);
    }
};

const registerGlobalShortcut = (shortcut: string) => {
    globalShortcut.unregisterAll();
    try {
        globalShortcut.register(shortcut, () => {
            if (mainWindow) {
                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow.webContents.send('clipboard-updated', store.get('history'));
                    mainWindow.show();
                    mainWindow.focus();
                }
            }
        });
        console.log(`[Main] Global shortcut registered: ${shortcut}`);
    } catch (err) {
        console.error(`[Main] Failed to register shortcut: ${shortcut}`, err);
    }
};

app.whenReady().then(() => {
    // ... (Protocol registration remains same) ...

    protocol.registerFileProtocol('thumbnail', (request, callback) => {
        // ... (Thumbnail handler remains same) ...
        let url = request.url;
        url = url.replace(/^thumbnail:\/*/i, '');
        url = url.replace(/\/+$/, '');
        const filename = decodeURIComponent(url);
        const filePath = path.join(app.getPath('userData'), 'thumbnails', filename);
        if (!fs.existsSync(filePath)) {
            callback({ error: -6 });
            return;
        }
        callback({ path: filePath });
    });

    createWindow();

    // Initialize Clipboard Service
    try {
        clipboardService = new ClipboardService(store, mainWindow);
        clipboardService.startMonitoring();
    } catch (err) {
        console.error('[Main] Failed to initialize ClipboardService:', err);
    }

    // Register Global Shortcut from Preferences
    const prefs = store.get('preferences') || defaultPreferences;
    registerGlobalShortcut(prefs.globalShortcut);

    // Apply Launch at Login
    app.setLoginItemSettings({
        openAtLogin: prefs.launchAtLogin,
        path: app.getPath('exe')
    });
});

// ... (Other handlers) ...

// IPC: Preferences
ipcMain.handle('get-preferences', () => {
    return store.get('preferences') || defaultPreferences;
});

ipcMain.on('update-preference', (event, { key, value }: { key: keyof UserPreferences, value: any }) => {
    const prefs = store.get('preferences') || defaultPreferences;
    const newPrefs = { ...prefs, [key]: value };
    store.set('preferences', newPrefs);

    // Apply Side Effects
    if (key === 'globalShortcut') {
        registerGlobalShortcut(value as string);
    } else if (key === 'launchAtLogin') {
        app.setLoginItemSettings({
            openAtLogin: value as boolean,
            path: app.getPath('exe')
        });
    }

    // Notify renderer (optional, or it can just re-fetch)
    mainWindow?.webContents.send('preferences-updated', newPrefs);
});


app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers
ipcMain.handle('get-history', () => {
    return store.get('history', []);
});

ipcMain.on('hide-window', () => {
    mainWindow?.hide();
});

ipcMain.on('toggle-pin', (event, id: string) => {
    const history = store.get('history');
    const index = history.findIndex(item => item.id === id);
    if (index !== -1) {
        history[index].pinned = !history[index].pinned;
        store.set('history', history);
        mainWindow?.webContents.send('clipboard-updated', history);
    }
});

ipcMain.on('copy-item', (event, id: string) => {
    if (!id || typeof id !== 'string') return;

    const history = store.get('history');
    const item = history.find(i => i.id === id);

    if (!item) return;

    try {
        if (item.type === 'image' && item.preview) {
            const img = nativeImage.createFromDataURL(item.preview);
            if (!img.isEmpty()) {
                clipboard.writeImage(img);
            }
        } else {
            // Support rich text / HTML
            if (item.metadata?.htmlContent) {
                clipboard.write({
                    text: item.content,
                    html: item.metadata.htmlContent
                });
            } else {
                clipboard.writeText(item.content);
            }
        }
    } catch (err) {
        console.error('Failed to copy item:', err);
    }
});

ipcMain.on('paste-item', (event, id: string) => {
    if (!id || typeof id !== 'string') return;

    const history = store.get('history');
    const item = history.find(i => i.id === id);

    if (!item) return;

    // 1. Write to clipboard
    try {
        if (item.type === 'image' && item.preview) {
            const img = nativeImage.createFromDataURL(item.preview);
            if (!img.isEmpty()) {
                clipboard.writeImage(img);
            }
        } else {
            // Support rich text / HTML
            if (item.metadata?.htmlContent) {
                clipboard.write({
                    text: item.content,
                    html: item.metadata.htmlContent
                });
            } else {
                clipboard.writeText(item.content);
            }
        }

        // 2. Hide window and paste
        if (process.platform === 'darwin') {
            app.hide();
        } else {
            mainWindow?.hide();
        }

        // 3. Simulate Paste Action (Cmd+V)
        setTimeout(() => {
            try {
                console.log('[Main] Simulating Paste...');
                const script = `
                tell application "System Events"
                    keystroke "v" using command down
                end tell
            `;
                // Execute AppleScript
                const { exec } = require('child_process');
                exec(`osascript -e '${script}'`, (error: any) => {
                    if (error) console.error('Paste Error:', error);
                });
            } catch (e) {
                console.error('Paste Exception:', e);
            }
        }, 150);
    } catch (err) {
        // Silently fail
    }
});

ipcMain.on('delete-item', (event, id: string) => {
    const history = store.get('history');
    const itemToDelete = history.find(item => item.id === id);

    if (itemToDelete) {
        // Cleanup logic if needed
    }

    const newHistory = history.filter(item => item.id !== id);
    store.set('history', newHistory);
    mainWindow?.webContents.send('clipboard-updated', newHistory);
});

ipcMain.on('clear-history', () => {
    store.set('history', []);
    lastClipboardContent = '';
    mainWindow?.webContents.send('clipboard-updated', []);
});

ipcMain.on('update-item-content', (event, { id, content }: { id: string, content: string }) => {
    const history = store.get('history');
    const index = history.findIndex(item => item.id === id);
    if (index !== -1) {
        history[index].content = content;
        history[index].timestamp = Date.now();
        store.set('history', history);
        mainWindow?.webContents.send('clipboard-updated', history);
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});
