// TodoItem — one row in the todo list.
// Props come from TodoList, which gets them from useTodos in App.
// This component holds NO state — it's purely presentational.
// The completed CSS class applies strikethrough styling via App.css.
export default function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <li className={`todo-item ${todo.completed ? 'completed' : ''}`}>
      {/* Checkbox toggles the completed flag in useTodos state */}
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={() => onToggle(todo.id)}
      />
      <span className="todo-title">{todo.title}</span>
      {/* Delete button removes this todo from the array entirely */}
      <button className="delete-btn" onClick={() => onDelete(todo.id)}>✕</button>
    </li>
  );
}
