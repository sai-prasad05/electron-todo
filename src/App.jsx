import { useEffect, useState } from 'react';
import TodoInput from './components/TodoInput';
import TodoList from './components/TodoList';
import UpdateBanner from './components/UpdateBanner';
import { useTodos } from './hooks/useTodos';
import { bridge, isDesktop } from './desktopBridge';
import './App.css';

export default function App() {
  const { todos, addTodo, toggleTodo, deleteTodo, inputRef } = useTodos();
  const [version, setVersion] = useState('web');
  const [updateReady, setUpdateReady] = useState(false);

  // Get app version from Electron main process (or show 'web' in browser)
  useEffect(() => {
    if (!isDesktop) return;
    bridge.getAppVersion().then(setVersion);
  }, []);

  // Listen for native menu "New Todo" (Cmd+N) and tray "Add Todo"
  // Both just focus the input — the user types the todo themselves
  useEffect(() => {
    if (!isDesktop) return;
    const unsubMenu = bridge.onMenuNewTodo(() => inputRef.current?.focus());
    const unsubTray = bridge.onTrayAddTodo(() => inputRef.current?.focus());
    return () => { unsubMenu(); unsubTray(); };
  }, [inputRef]);

  // Listen for deep link: todo://add?title=Buy+Milk
  // Main process receives the OS deep link event and sends it here
  useEffect(() => {
    if (!isDesktop) return;
    const unsub = bridge.onDeepLink(url => {
      try {
        const parsed = new URL(url);
        const title = parsed.searchParams.get('title');
        if (title && inputRef.current) {
          inputRef.current.focus();
          // Simulate the user typing so the controlled input state updates
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
          ).set;
          nativeInputValueSetter.call(inputRef.current, title);
          inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
        }
      } catch (e) { console.error('Invalid deep link URL:', e); }
    });
    return unsub;
  }, [inputRef]);

  // Show UpdateBanner when electron-updater finishes downloading a new version
  useEffect(() => {
    if (!isDesktop) return;
    bridge.onUpdateDownloaded(() => setUpdateReady(true));
  }, []);

  function handleAdd(title) {
    const todo = addTodo(title);
    // Tell main process to fire an OS notification
    bridge?.notifyAdded(todo.title);
  }

  return (
    <div className="app">
      {updateReady && (
        <UpdateBanner onInstall={() => bridge.installUpdate()} />
      )}
      <header className="app-header">
        <h1>Electron Todo</h1>
      </header>
      <main>
        <TodoInput onAdd={handleAdd} inputRef={inputRef} />
        <TodoList todos={todos} onToggle={toggleTodo} onDelete={deleteTodo} />
      </main>
      <footer className="app-footer">
        v{version}
      </footer>
    </div>
  );
}
