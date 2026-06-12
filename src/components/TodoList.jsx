import { useState } from 'react';
import TodoItem from './TodoItem';

// The three filter options shown as tabs above the list
const FILTERS = ['All', 'Active', 'Completed'];

// TodoList — renders the filtered list and the filter tab bar.
// It receives the full todos array from App and filters it locally
// so the underlying data is never mutated just to change the view.
export default function TodoList({ todos, onToggle, onDelete }) {
  // filter state lives here — it only affects what's shown, not what's stored
  const [filter, setFilter] = useState('All');

  // Derive the visible subset — no need to store this in state
  const visible = todos.filter(t => {
    if (filter === 'Active')    return !t.completed;  // only incomplete
    if (filter === 'Completed') return  t.completed;  // only done
    return true;                                       // All — show everything
  });

  // Count items that still need doing — shown in the footer
  const remaining = todos.filter(t => !t.completed).length;

  return (
    <div className="todo-list-wrapper">
      {/* Filter tab buttons */}
      <div className="filters">
        {FILTERS.map(f => (
          <button
            key={f}
            className={filter === f ? 'active' : ''}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Empty state when nothing matches the current filter */}
      {visible.length === 0 ? (
        <p className="empty">No todos here ✓</p>
      ) : (
        <ul className="todo-list">
          {visible.map(todo => (
            <TodoItem
              key={todo.id}   // React needs a stable key to diff the list efficiently
              todo={todo}
              onToggle={onToggle}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}

      <p className="count">{remaining} item{remaining !== 1 ? 's' : ''} left</p>
    </div>
  );
}
