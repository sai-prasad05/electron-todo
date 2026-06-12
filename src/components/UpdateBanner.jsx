// UpdateBanner — shown at the top of the app when electron-updater has
// downloaded a new version and it's ready to install.
//
// How it works (Day 5):
//   1. electron-updater downloads the new version silently in the background
//   2. It fires the 'update-downloaded' event in main.js
//   3. main.js sends 'update:downloaded' to the renderer via webContents.send
//   4. preload.js relays it via bridge.onUpdateDownloaded(cb)
//   5. App.jsx sets updateReady = true → this banner renders
//   6. User clicks "Restart & Update" → bridge.installUpdate()
//      → ipcRenderer.send('update:install') → autoUpdater.quitAndInstall()
export default function UpdateBanner({ onInstall }) {
  return (
    <div className="update-banner">
      <span>A new version is ready.</span>
      <button onClick={onInstall}>Restart &amp; Update</button>
    </div>
  );
}
