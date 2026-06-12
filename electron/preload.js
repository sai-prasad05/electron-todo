// ─── electron/preload.js — the Context Bridge ───────────────────────────────
// This script runs in a PRIVILEGED context before the React page loads.
// It has access to both Node.js (via require) AND the browser window.
//
// contextBridge.exposeInMainWorld() injects a safe, explicit API into React's
// window object as window.todoDesktop. React can only call the functions
// listed here — it has no access to ipcRenderer, fs, or any Node API directly.
//
// Security rules enforced here:
//   1. Never expose the raw ipcRenderer object — wrap every call in a named function
//   2. Channel names are hardcoded here — the renderer cannot pass arbitrary channels
//   3. All subscription functions return an "unsubscribe" function for cleanup

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('todoDesktop', {

  // ── request/response (invoke → handle) ────────────────────────────────────
  // These return Promises. React awaits them.

  // Read todos array from the JSON file on disk (via main process fs.readFile)
  getTodos: () => ipcRenderer.invoke('todos:get'),

  // Write todos array to disk (via main process fs.writeFile)
  saveTodos: (todos) => ipcRenderer.invoke('todos:save', todos),

  // Get the app version string from package.json (via app.getVersion() in main)
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Open a native Save dialog and export todos as a JSON file
  exportTodos: (todos) => ipcRenderer.invoke('dialog:export', todos),

  // ── fire-and-forget (send → on) ───────────────────────────────────────────
  // These don't return a value. Renderer fires and forgets.

  // Tell the main process to fire an OS notification for this todo title
  notifyAdded: (title) => ipcRenderer.send('todos:notify', title),

  // Tell the main process to quit and install the downloaded update
  installUpdate: () => ipcRenderer.send('update:install'),

  // ── main → renderer subscriptions (on → webContents.send) ─────────────────
  // These let the main process PUSH events to React.
  // Each returns an unsubscribe function — React calls it in useEffect cleanup
  // to remove the listener when the component unmounts (prevents memory leaks).

  // Fired when the user clicks "New Todo" in the native File menu
  onMenuNewTodo: (cb) => {
    ipcRenderer.on('menu:newTodo', cb);
    return () => ipcRenderer.removeListener('menu:newTodo', cb);
  },

  // Fired when the user clicks "Add Todo" in the system tray context menu
  onTrayAddTodo: (cb) => {
    ipcRenderer.on('tray:addTodo', cb);
    return () => ipcRenderer.removeListener('tray:addTodo', cb);
  },

  // Fired when the OS delivers a todo:// deep link to this app
  onDeepLink: (cb) => {
    // Wrap cb so we only pass the URL string, not the internal IPC event object
    const listener = (_event, url) => cb(url);
    ipcRenderer.on('deeplink:add', listener);
    return () => ipcRenderer.removeListener('deeplink:add', listener);
  },

  // Fired when electron-updater detects a new version on GitHub Releases
  onUpdateAvailable: (cb) => {
    ipcRenderer.on('update:available', (_event, info) => cb(info));
  },

  // Fired when electron-updater finishes downloading the new version
  // React shows the UpdateBanner when this fires
  onUpdateDownloaded: (cb) => {
    ipcRenderer.on('update:downloaded', cb);
  },
});
