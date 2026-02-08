import { app, BrowserWindow, globalShortcut, ipcMain, screen, clipboard } from 'electron';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import Store from 'electron-store';
import { v4 as uuidv4 } from 'uuid';

import { ClipboardItem } from './types.js';

// Store Setup
const store = new Store<{ history: ClipboardItem[] }>({
    defaults: { history: [] }
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
// Removed electron-squirrel-startup check to prevent issues on non-Windows platforms/dev.

let mainWindow: BrowserWindow | null = null;
let lastClipboardContent: string = '';

const createWindow = () => {
    const primaryDisplay = screen.getPrimaryDisplay();
    // Use 'bounds' for width to span the full physical screen, ignoring Dock/Sidebars
    const { width } = primaryDisplay.bounds;
    const { height: workAreaHeight } = primaryDisplay.workAreaSize; // Still use workArea for height to avoid covering top menu bar? 
    // Actually, for "Bottom Dock" that covers the OS Dock, we might want bounds.height too, 
    // but usually we just want to sit at the bottom of the visible area.
    // Let's use bounds.height for calculating 'y' if we want to be TRULY at the bottom.
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
    setTimeout(setBounds, 1000); // Fail-safe explanation: macOS sometimes overrides initial bounds for frameless windows.

    // Ensure it stays at the bottom even if focus changes (optional, aggressive)
    // mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        // mainWindow.webContents.openDevTools({ mode: 'detach' }); 
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    // Hide on blur (optional, maybe configurable)
    // mainWindow.on('blur', () => mainWindow?.hide());
};

const addToHistory = (text: string, format: 'text' | 'html' = 'text') => {
    const history = store.get('history');

    // Avoid exact duplicates at the top
    if (history.length > 0 && history[0].content === text) return;

    const newItem: ClipboardItem = {
        id: uuidv4(),
        type: format,
        content: text,
        timestamp: Date.now(),
        pinned: false,
    };

    // Add to top, limit to 200
    // Keep pinned items at the top? Or just sort them in UI? 
    // Plan: Add new item to index 0. UI handles sorting (pinned first).

    const newHistory = [newItem, ...history].slice(0, 200);
    store.set('history', newHistory);

    // Send to renderer if window exists
    if (mainWindow) {
        mainWindow.webContents.send('clipboard-updated', newHistory);
    }
};

const checkClipboard = () => {
    const text = clipboard.readText();
    if (text && text !== lastClipboardContent) {
        lastClipboardContent = text;
        addToHistory(text, 'text');
    }
    // Future: Handle images, HTML
};

app.whenReady().then(() => {
    createWindow();

    // Global Shortcut
    const ret = globalShortcut.register('CommandOrControl+Shift+V', () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
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
setInterval(() => {
    try {
        const text = clipboard.readText();
        if (text && text !== lastClipboardContent && text.trim().length > 0) {
            lastClipboardContent = text;
            const newItem: ClipboardItem = {
                id: uuidv4(),
                type: 'text',
                content: text,
                timestamp: Date.now(),
                pinned: false
            };

            // Add to store
            const history = store.get('history', []);
            // Avoid dupes at top
            if (history.length === 0 || history[0].content !== text) {
                const newHistory = [newItem, ...history].slice(0, 100);
                store.set('history', newHistory);

                // Send to Renderer
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('clipboard-changed', newItem);
                }
            }
        }
    } catch (e) {
        console.error("Clipboard poll error", e);
    }
}, 1000); // 1 second poll

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// IPC Handlers
ipcMain.handle('get-history', () => {
    return store.get('history');
});

ipcMain.on('hide-window', () => {
    mainWindow?.hide();
});

ipcMain.on('paste-item', (event, item: ClipboardItem) => {
    // 1. Write to clipboard
    clipboard.writeText(item.content);
    lastClipboardContent = item.content; // Avoid re-capture loop

    // 2. Hide window
    mainWindow?.hide();

    // 3. Simulate paste (CMD+V)
    // Using robotjs is hard to set up (native deps). 
    // Fallback: Use simple AppleScript via 'osascript' command.
    // It's standard on macOS.
    const script = `osascript -e 'tell application "System Events" to keystroke "v" using command down'`;
    exec(script);
});

ipcMain.on('pin-item', (event, id: string) => {
    const history = store.get('history');
    const index = history.findIndex(i => i.id === id);
    if (index !== -1) {
        history[index].pinned = !history[index].pinned;
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
