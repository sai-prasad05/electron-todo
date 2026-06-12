import { useState } from 'react';

// TodoInput — the text bar at the top of the app.
// It is a "controlled component": React owns the input value via useState.
// When the user submits (Enter or click Add), it calls onAdd(title) which
// is passed down from App.jsx, then clears itself.
// inputRef is passed from useTodos so the native menu / tray / deep link
// can call inputRef.current.focus() to jump the cursor here from outside React.
export default function TodoInput({ onAdd, inputRef }) {
  const [text, setText] = useState('');

  function handleSubmit(e) {
    e.preventDefault();           // stop the form from refreshing the page
    const trimmed = text.trim();
    if (!trimmed) return;         // ignore empty submissions
    onAdd(trimmed);               // create the todo in useTodos
    setText('');                  // clear the input ready for the next todo
  }

  return (
    <form className="todo-input" onSubmit={handleSubmit}>
      <input
        ref={inputRef}            // lets parent focus this from menu/tray/deeplink
        type="text"
        placeholder="What needs to be done?"
        value={text}
        onChange={e => setText(e.target.value)}
      />
      <button type="submit">Add</button>
    </form>
  );
}
