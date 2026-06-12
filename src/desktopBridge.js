// desktopBridge.js — the single place that decides "are we in Electron or a browser?"
//
// When Electron's preload.js runs, it calls contextBridge.exposeInMainWorld('todoDesktop', {...})
// which injects window.todoDesktop into the page before React loads.
// In a normal browser, window.todoDesktop doesn't exist → isDesktop is false.
//
// Pattern used throughout the app:
//   bridge?.saveTodos(todos)   → calls IPC in Electron, does nothing in browser
//   isDesktop ? <DesktopUI /> : null   → render desktop-only UI conditionally
export const isDesktop = typeof window !== 'undefined' && !!window.todoDesktop;
export const bridge = isDesktop ? window.todoDesktop : null;
