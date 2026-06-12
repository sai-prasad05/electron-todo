// ─── electron/menu.js — Native Application Menu ─────────────────────────────
// Sets the OS-level menu bar (File, Edit, View, Window, Help).
// On macOS the menu appears at the top of the screen.
// On Windows/Linux it appears inside the app window title bar.
//
// Key point: role: 'editMenu' is CRITICAL on macOS.
// Without it, Cmd+C / Cmd+V / Cmd+X stop working even in text inputs.
// This is one of the most common Electron bugs teams hit in production.

'use strict';

const { Menu } = require('electron');

function buildMenu(mainWindow) {
  const isMac = process.platform === 'darwin';

  const template = [
    // macOS: the first menu is always the "App" menu (shows app name, About, Quit)
    // On Windows/Linux this isn't needed — the app name is in the window title bar
    ...(isMac ? [{ role: 'appMenu' }] : []),

    {
      label: 'File',
      submenu: [
        {
          label: 'New Todo',
          accelerator: 'CmdOrCtrl+N', // Cmd+N on Mac, Ctrl+N on Windows/Linux
          // webContents.send is the "main → renderer push" IPC pattern:
          // this menu click triggers focus on the input box in React
          click: () => mainWindow.webContents.send('menu:newTodo'),
        },
        { type: 'separator' },
        {
          label: 'Export Todos…',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('menu:export'),
        },
        { type: 'separator' },
        // Role shortcuts delegate to Electron's built-in behavior
        isMac ? { role: 'close' } : { role: 'quit' },
      ],
    },

    // editMenu role gives Cut/Copy/Paste/Select All for FREE.
    // Without this, text inputs in the React app don't respond to keyboard shortcuts.
    { role: 'editMenu' },

    // viewMenu gives Reload, Force Reload, Toggle DevTools, Zoom, Fullscreen
    { role: 'viewMenu' },

    // windowMenu gives Minimize, Zoom (macOS), Bring All to Front (macOS)
    { role: 'windowMenu' },

    {
      role: 'help',
      submenu: [
        // Show the app version in the Help menu — non-interactive (enabled: false)
        {
          label: `Version ${require('../package.json').version}`,
          enabled: false,
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { buildMenu };
