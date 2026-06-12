import { useState, useEffect, useRef } from 'react';
import { bridge, isDesktop } from '../desktopBridge';

// ─── Fallback for browser / dev without Electron ────────────────────────────
// When running in a browser (isDesktop = false), we fall back to localStorage
// so the same React code still works outside Electron.
function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem('todos');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// useTodos — the single source of truth for all todo state.
// Returns: todos array + 3 mutation functions + inputRef.
//
// Persistence strategy:
//   In Electron  → todos read/written to ~/.config/electron-todo/todos.json
//                  via IPC: bridge.getTodos() / bridge.saveTodos()
//   In browser   → todos read/written to localStorage (fallback)
//
// inputRef is attached to <TodoInput> so external triggers (menu, tray,
// deep link) can call inputRef.current.focus() to jump the cursor there.
export function useTodos() {
  // loaded ref: tracks whether initial data fetch is done.
  // Initialized to !isDesktop — browser path is synchronously ready from the start;
  // Electron path starts as false and gets set to true after the IPC call resolves.
  // A ref (not state) so changes here do NOT trigger a re-render.
  const loaded = useRef(!isDesktop);

  // Two-path initialization:
  //
  //   Browser  → lazy useState initializer reads localStorage synchronously.
  //              Avoids calling setTodos inside a useEffect body, which the
  //              react-hooks linter flags as "cascading renders".
  //
  //   Electron → start with []; the useEffect below fills it via async IPC call.
  //              useState initializers must be synchronous, so we can't await here.
  const [todos, setTodos] = useState(() =>
    isDesktop ? [] : loadFromLocalStorage()
  );

  const inputRef = useRef(null);

  // Electron only: load todos from disk via IPC on mount.
  // setTodos is called inside .then() — an async callback — which is the
  // allowed pattern. The linter only flags synchronous setState in effect bodies.
  useEffect(() => {
    if (!isDesktop) return; // browser already loaded via the lazy initializer above
    bridge.getTodos().then(data => {
      setTodos(Array.isArray(data) ? data : []);
      loaded.current = true; // mark load complete AFTER state is set
    });
  }, []); // empty deps = run once on mount

  // Persist every time the todos array changes.
  // In Electron: bridge.saveTodos(todos) → ipcRenderer.invoke('todos:save', todos)
  //   → main process fs.writeFile(todosPath, JSON.stringify(todos))
  // In browser: write to localStorage
  //
  // Guard: skip the very first render (todos = [], loaded = false) so we don't
  // overwrite a real todos.json with an empty array before the load completes.
  // After load, we DO save empty arrays — the user may have deleted all todos.
  useEffect(() => {
    if (!loaded.current) return; // data not yet loaded — don't overwrite disk
    if (isDesktop) {
      bridge.saveTodos(todos);
    } else {
      localStorage.setItem('todos', JSON.stringify(todos));
    }
  }, [todos]);

  // addTodo — builds a new todo object and prepends it (newest first)
  // Returns the created todo so App.jsx can pass its title to the OS notification IPC call
  function addTodo(title) {
    const todo = {
      id: crypto.randomUUID(),          // browser-native UUID — no library needed
      title,
      completed: false,
      createdAt: new Date().toISOString(),
    };
    setTodos(prev => [todo, ...prev]);
    return todo;
  }

  // toggleTodo — flips completed flag on the matching todo, leaves all others unchanged
  function toggleTodo(id) {
    setTodos(prev =>
      prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );
  }

  // deleteTodo — removes the todo with this id entirely
  function deleteTodo(id) {
    setTodos(prev => prev.filter(t => t.id !== id));
  }

  return { todos, addTodo, toggleTodo, deleteTodo, inputRef };
}
