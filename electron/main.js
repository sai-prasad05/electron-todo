// ─── electron/main.js — the Main Process ────────────────────────────────────
// This file runs in Node.js (NOT in the browser).
// It is the "backend" of the desktop app:
//   • creates and manages the BrowserWindow (the Chromium window React runs in)
//   • handles all IPC requests from the React renderer (file I/O, dialogs, etc.)
//   • manages the system tray (Day 3)
//   • registers the deep link protocol (Day 3)
//   • checks for updates (Day 5)

'use strict';

const {
  app, BrowserWindow, ipcMain, dialog,
  Notification, session
} = require('electron');
const path  = require('path');
const fs    = require('fs').promises;

// isDev = true  → load React from Vite dev server (http://localhost:5173)
// isDev = false → load React from the bundled dist/ files via file://
//
// We can't use `!app.isPackaged` alone because that's only true in a packaged
// build (electron-builder output). When running `electron .` directly it's always
// false. Instead we use an env variable:
//   ELECTRON_IS_DEV=1 electron .   → dev mode (electron:dev script sets this)
//   electron .                     → production mode (electron:preview uses this)
//   packaged app                   → production mode (app.isPackaged is true)
const isDev = !app.isPackaged && process.env.ELECTRON_IS_DEV === '1';

// Windows: set App User Model ID early so OS notifications show the correct
// app name and icon. Must be called BEFORE app.whenReady().
app.setAppUserModelId('com.samvyo.electrontodo');

// Path where todos.json is stored on disk.
// app.getPath('userData') resolves to:
//   Linux:   ~/.config/electron-todo
//   macOS:   ~/Library/Application Support/electron-todo
//   Windows: %APPDATA%\electron-todo
const todosPath = path.join(app.getPath('userData'), 'todos.json');

// Keep a module-level reference to the window so IPC handlers and tray can reach it.
let mainWindow;

// ─── createWindow ────────────────────────────────────────────────────────────
function createWindow() {
  // electron-window-state reads the last saved position/size from userData.
  // Falls back to defaultWidth/defaultHeight on first launch.
  const windowStateKeeper = require('electron-window-state');
  const state = windowStateKeeper({ defaultWidth: 900, defaultHeight: 680 });

  mainWindow = new BrowserWindow({
    x: state.x,
    y: state.y,
    width:  state.width,
    height: state.height,
    minWidth:  600,
    minHeight: 400,
    show: false, // don't show until 'ready-to-show' fires — avoids white flash

    webPreferences: {
      // preload.js runs BEFORE the React page loads, in a privileged context.
      // It is the only place allowed to bridge main ↔ renderer.
      preload: path.join(__dirname, 'preload.js'),

      // SECURITY: contextIsolation separates the preload's JS context from the
      // page's JS context so React cannot reach Electron/Node internals directly.
      contextIsolation: true,

      // SECURITY: nodeIntegration: false means React (the renderer) cannot call
      // require('fs') or any Node API. All Node access must go via IPC.
      nodeIntegration: false,

      // sandbox: true gives the renderer process OS-level sandboxing (like Chrome).
      sandbox: true,
    },
  });

  // state.manage() tracks window move/resize events and saves them for next launch
  state.manage(mainWindow);

  // Load the app
  if (isDev) {
    // Dev mode: point at Vite's hot-reload dev server
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in a detached window so they don't squash the app UI
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    // Production mode: load the bundled React build from dist/
    // base: './' in vite.config.js makes all asset paths relative so file:// works
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // Show the window only once it has finished rendering (no white flash)
  mainWindow.once('ready-to-show', () => mainWindow.show());

  // Day 3: intercept the window close button → hide to tray instead of quitting.
  // app.isQuitting is set to true by the tray "Quit" menu item.
  mainWindow.on('close', e => {
    if (!app.isQuitting) {
      e.preventDefault(); // cancel the close
      mainWindow.hide();  // hide window but keep the process running
    }
  });
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────
// ipcMain.handle = request/response pattern (renderer calls invoke, awaits reply)
// ipcMain.on    = fire-and-forget pattern (renderer calls send, no reply)

// todos:get — read todos from disk, return parsed array (or [] if file missing)
ipcMain.handle('todos:get', async () => {
  try {
    const data = await fs.readFile(todosPath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return []; // file doesn't exist yet on first launch — that's fine
  }
});

// todos:save — write the current todos array to disk as pretty-printed JSON
ipcMain.handle('todos:save', async (_event, todos) => {
  // Validate: must be an array. Never trust input from the renderer — treat it
  // like an HTTP request body from an untrusted client (same rule as PERN backend).
  if (!Array.isArray(todos)) return;
  await fs.writeFile(todosPath, JSON.stringify(todos, null, 2), 'utf-8');
});

// app:getVersion — returns the version string from package.json
ipcMain.handle('app:getVersion', () => app.getVersion());

// dialog:export — opens a native Save dialog, writes the todos JSON to the chosen path
ipcMain.handle('dialog:export', async (_event, todos) => {
  if (!Array.isArray(todos)) return null;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Export Todos',
    defaultPath: 'todos.json',
    filters: [{ name: 'JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return null;
  await fs.writeFile(filePath, JSON.stringify(todos, null, 2), 'utf-8');
  return filePath;
});

// todos:notify — fire an OS-level notification when a todo is added
// Uses ipcMain.on (not handle) because the renderer doesn't need a reply
ipcMain.on('todos:notify', (_event, title) => {
  if (typeof title !== 'string') return; // validate
  new Notification({ title: 'Todo Added ✓', body: title }).show();
});

// update:install — triggered by the UpdateBanner's "Restart & Update" button
ipcMain.on('update:install', () => {
  // autoUpdater is set up in Day 5 block below — calling quitAndInstall()
  // closes the app and runs the downloaded installer silently
  try { require('electron-updater').autoUpdater.quitAndInstall(); } catch (e) { console.error('updater error:', e); }
});

// ─── Permission handler ───────────────────────────────────────────────────────
// The renderer (React) can only request permissions that are on this whitelist.
// Any permission not listed here is denied automatically.
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
    const allowed = ['notifications', 'media']; // add 'display-capture' for screen share
    callback(allowed.includes(permission));
  });

  createWindow();

  const { buildMenu } = require('./menu');
  buildMenu(mainWindow);

  const { createTray } = require('./tray');
  createTray(mainWindow);

  // Day 5: check for updates on every launch (production only)
  if (!isDev) {
    try {
      const { autoUpdater } = require('electron-updater');
      autoUpdater.checkForUpdatesAndNotify();

      // When a new version is available, tell React so the UpdateBanner shows
      autoUpdater.on('update-available', info => {
        mainWindow.webContents.send('update:available', info);
      });

      // When the download finishes, tell React so the "Restart & Update" button appears
      autoUpdater.on('update-downloaded', () => {
        mainWindow.webContents.send('update:downloaded');
      });
    } catch (e) { console.error('auto-updater error:', e); }
  }

  // macOS: clicking the dock icon when all windows are hidden should show the app
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else mainWindow.show();
  });
});

// Windows/Linux: quit when all windows are closed.
// macOS apps conventionally stay running until the user explicitly quits (Cmd+Q).
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── Deep Links ──────────────────────────────────────────────────────────────
// Register this app as the handler for todo:// URLs.
// When the user clicks todo://add?title=Buy+Milk anywhere on the system,
// the OS launches this app (or brings it to focus) and passes the URL.
app.setAsDefaultProtocolClient('todo');

// macOS fires the 'open-url' app event with the URL
app.on('open-url', (event, url) => {
  event.preventDefault();
  routeDeepLink(url);
});

// Windows / Linux: deep links arrive as a command-line argument on the second instance.
// requestSingleInstanceLock() ensures only one copy of the app runs at a time.
// If a second instance is launched (e.g. by clicking a todo:// link), it forwards
// its argv to this first instance via the 'second-instance' event, then exits.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  // Another instance is already running — just quit this one
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    // Find the todo:// URL in the new instance's argv
    const url = argv.find(a => a.startsWith('todo://'));
    if (url) routeDeepLink(url);
    // Bring the existing window to the front
    if (mainWindow) { mainWindow.show(); mainWindow.focus(); }
  });
}

// routeDeepLink — parses the todo:// URL and forwards it to React via IPC push
function routeDeepLink(url) {
  // webContents.send is the "main → renderer push" IPC pattern:
  // main calls it, renderer listens with ipcRenderer.on via the preload bridge
  mainWindow?.webContents.send('deeplink:add', url);
}
