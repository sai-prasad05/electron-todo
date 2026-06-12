// ─── electron/tray.js — System Tray ─────────────────────────────────────────
// Puts a small icon in the OS system tray (bottom-right on Windows,
// top-right menu bar on macOS, varies on Linux).
//
// Why: a conferencing/productivity app should keep running in the background
// when the user closes the window. The tray lets them:
//   • Show the app again
//   • Trigger "Add Todo" without opening the window first
//   • Quit the app completely (vs just hiding the window)
//
// The close → hide behavior is set in main.js via win.on('close').
// The tray "Quit" sets app.isQuitting = true so the close handler knows
// to actually quit rather than hide.

'use strict';

const { Tray, Menu, nativeImage, app } = require('electron');
const path = require('path');

let tray; // module-level reference — prevents garbage collection

function createTray(win) {
  // Load the tray icon from the assets folder.
  // Windows/Linux: use a 16×16 or 32×32 PNG.
  // macOS: ideally a monochrome "template" image (named ...Template.png)
  //        so it adapts automatically to light/dark menu bars.
  const iconPath = path.join(__dirname, '..', 'assets', 'tray.png');
  const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });

  tray = new Tray(icon);
  tray.setToolTip('Electron Todo');

  // The right-click context menu on the tray icon
  tray.setContextMenu(Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => win.show(), // bring the window back from hidden
    },
    {
      label: 'Add Todo',
      // Show the window AND send an IPC push to React to focus the input
      click: () => {
        win.show();
        win.webContents.send('tray:addTodo'); // preload exposes this as onTrayAddTodo(cb)
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        // Set the flag so the close handler in main.js knows to actually quit
        app.isQuitting = true;
        app.quit();
      },
    },
  ]));

  // Double-clicking the tray icon shows the app (Windows/Linux UX convention)
  tray.on('double-click', () => win.show());
}

module.exports = { createTray };
