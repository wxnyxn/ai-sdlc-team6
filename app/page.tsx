'use client';

// Main Todo Page — Feature 01 (Todo CRUD) + Feature 02 (Priority System)
// UI Reference: docs/main_ui.png, docs/main_ui_pending.png

import { useEffect, useState, useCallback } from 'react';
import { getSingaporeNow } from '@/lib/timezone';

interface Todo {
  id: number;
  title: string;
  completed: number;
  priority: 'high' | 'medium' | 'low';
  due_date: string | null;
  recurrence_pattern: string | null;
  reminder_offset_minutes: number | null;
  created_at: string;
  subtask_count?: number;
}

// Priority badge Tailwind classes (Feature 02)
const PRIORITY_BADGE: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-blue-100 text-blue-700',
};

function getRelativeDue(dueDate: string): { text: string; overdue: boolean } {
  const now = getSingaporeNow();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 0) {
    const absMins = Math.abs(diffMins);
    if (absMins < 60) return { text: `${absMins} minute(s) overdue`, overdue: true };
    if (absMins < 1440) return { text: `${Math.floor(absMins / 60)} hour(s) overdue`, overdue: true };
    return { text: `${Math.floor(absMins / 1440)} day(s) overdue`, overdue: true };
  }
  if (diffMins < 60) return { text: `Due in ${diffMins} minutes`, overdue: false };
  if (diffMins < 1440) return { text: `Due in ${Math.floor(diffMins / 60)} hours`, overdue: false };
  return { text: `Due in ${Math.floor(diffMins / 1440)} days`, overdue: false };
}

export default function HomePage() {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formError, setFormError] = useState('');

  // ── List state ───────────────────────────────────────────────────────────────
  const [todos, setTodos] = useState<Todo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');

  // ── Edit state ───────────────────────────────────────────────────────────────
  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editDueDate, setEditDueDate] = useState('');

  // ── Load todos ────────────────────────────────────────────────────────────────
  const loadTodos = useCallback(async () => {
    const res = await fetch('/api/todos');
    if (res.ok) {
      const data = await res.json();
      setTodos(data.todos ?? []);
    }
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  // ── Add todo ──────────────────────────────────────────────────────────────────
  async function handleAdd() {
    setFormError('');
    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }
    const body: Record<string, unknown> = { title, priority };
    if (dueDate) body.dueDate = dueDate;

    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setTitle('');
      setPriority('medium');
      setDueDate('');
      loadTodos();
    } else {
      const data = await res.json();
      setFormError(data.error ?? 'Failed to add todo.');
    }
  }

  // ── Toggle complete ───────────────────────────────────────────────────────────
  async function handleToggle(todo: Todo) {
    await fetch(`/api/todos/${todo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: todo.completed ? 0 : 1 }),
    });
    loadTodos();
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  async function handleDelete(id: number) {
    await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    loadTodos();
  }

  // ── Edit ──────────────────────────────────────────────────────────────────────
  function startEdit(todo: Todo) {
    setEditId(todo.id);
    setEditTitle(todo.title);
    setEditPriority(todo.priority);
    // datetime-local expects "YYYY-MM-DDTHH:mm"
    setEditDueDate(todo.due_date ? todo.due_date.slice(0, 16) : '');
  }

  async function handleSaveEdit(todo: Todo) {
    if (!editTitle.trim()) return;
    await fetch(`/api/todos/${todo.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        priority: editPriority,
        dueDate: editDueDate || null,
        completed: todo.completed,
      }),
    });
    setEditId(null);
    loadTodos();
  }

  // ── Filtering & sectioning ────────────────────────────────────────────────────
  const now = getSingaporeNow();

  const filtered = todos.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    return matchesSearch && matchesPriority;
  });

  const overdue = filtered.filter(
    (t) => !t.completed && t.due_date && new Date(t.due_date) < now
  );
  const pending = filtered.filter(
    (t) => !t.completed && !(t.due_date && new Date(t.due_date) < now)
  );
  const completed = filtered.filter((t) => !!t.completed);

  // ── Todo card renderer ────────────────────────────────────────────────────────
  function renderTodo(todo: Todo, cardBg = 'bg-white') {
    const isEditing = editId === todo.id;
    const dueInfo = todo.due_date ? getRelativeDue(todo.due_date) : null;

    if (isEditing) {
      return (
        <div key={todo.id} className={`p-3 rounded-lg border mb-2 ${cardBg}`}>
          <input
            className="w-full border rounded px-2 py-1 mb-2 text-sm"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit(todo)}
            autoFocus
          />
          <div className="flex gap-2 mb-2">
            <select
              className="border rounded px-2 py-1 text-sm"
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as 'high' | 'medium' | 'low')}
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <input
              type="datetime-local"
              className="border rounded px-2 py-1 text-sm flex-1"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => handleSaveEdit(todo)}
              className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
            >
              Save
            </button>
            <button
              onClick={() => setEditId(null)}
              className="px-3 py-1 bg-gray-200 text-sm rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={todo.id}
        className={`flex items-start gap-3 p-3 rounded-lg border mb-2 ${cardBg}`}
      >
        {/* Checkbox */}
        <input
          type="checkbox"
          checked={!!todo.completed}
          onChange={() => handleToggle(todo)}
          className="mt-1 w-4 h-4 cursor-pointer shrink-0"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className={`font-semibold ${todo.completed ? 'line-through text-gray-400' : ''}`}>
            {todo.title}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {/* Priority badge */}
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${PRIORITY_BADGE[todo.priority]}`}
            >
              {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
            </span>
            {/* Subtask count */}
            <span className="text-xs text-gray-500">{todo.subtask_count ?? 0}</span>
            {/* Due time */}
            {dueInfo && (
              <span className={`text-xs ${dueInfo.overdue ? 'text-red-500' : 'text-red-500'}`}>
                {dueInfo.text}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0 text-sm">
          <button className="text-gray-400 hover:text-gray-600">►</button>
          <button
            onClick={() => startEdit(todo)}
            className="text-blue-500 hover:underline"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(todo.id)}
            className="text-red-500 hover:underline"
          >
            Del
          </button>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-white">
      {/* ── Header ── */}
      <header className="px-6 pt-6 pb-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Todo App</h1>
          <p className="text-gray-500 text-sm mt-1">
            {/* Placeholder — username shown after Feature 11 (Auth) */}
            Welcome
          </p>
        </div>
        <nav className="flex items-center gap-2 flex-wrap justify-end">
          <button className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200">
            ⋮ Data
          </button>
          <button className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700">
            Calendar
          </button>
          <button className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700">
            📋 Templates
          </button>
          <button className="px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600">
            🔔
          </button>
          <button className="px-4 py-2 rounded-lg bg-gray-700 text-white text-sm font-medium hover:bg-gray-800">
            Logout
          </button>
        </nav>
      </header>

      <div className="px-6 pb-28">
        {/* ── Error ── */}
        {formError && (
          <p className="text-red-500 text-sm mb-2">{formError}</p>
        )}

        {/* ── Add form ── */}
        <div className="mb-2">
          <input
            type="text"
            placeholder="Add a new todo…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            className="w-full border rounded-lg px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-300 mb-2"
          />
          <div className="flex gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'high' | 'medium' | 'low')}
              className="border rounded-lg px-3 py-2 text-sm min-w-[120px]"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm flex-1"
            />
            <button
              onClick={handleAdd}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600"
            >
              Add
            </button>
          </div>
        </div>

        {/* ── Show Advanced Options toggle ── */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-blue-500 text-sm flex items-center gap-1 mb-4 hover:underline"
        >
          <span>{showAdvanced ? '▼' : '►'}</span>
          <span>{showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options'}</span>
        </button>

        {/* Advanced options placeholder — Features 03, 04, 07 */}
        {showAdvanced && (
          <div className="border rounded-lg p-4 mb-4 bg-gray-50 text-sm text-gray-400 italic">
            Advanced options (recurrence, reminders, templates) — available in later features
          </div>
        )}

        {/* ── Search ── */}
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search todos and subtasks…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {/* ── Filter bar ── */}
        <div className="flex gap-2 mb-6">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm min-w-[140px]"
          >
            <option value="all">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <button className="px-4 py-2 rounded-lg bg-gray-200 text-sm font-medium hover:bg-gray-300">
            ► Advanced
          </button>
        </div>

        {/* ── Empty state ── */}
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-12">No todos yet. Add one above!</p>
        )}

        {/* ── Overdue section ── */}
        {overdue.length > 0 && (
          <section className="mb-6">
            <h2 className="text-red-600 font-bold text-lg mb-3">
              ⚠️ Overdue ({overdue.length})
            </h2>
            {overdue.map((t) => renderTodo(t, 'bg-red-50'))}
          </section>
        )}

        {/* ── Pending section ── */}
        {pending.length > 0 && (
          <section className="mb-6">
            <h2 className="text-blue-600 font-bold text-lg mb-3">
              Pending ({pending.length})
            </h2>
            {pending.map((t) => renderTodo(t, 'bg-white'))}
          </section>
        )}

        {/* ── Completed section ── */}
        {completed.length > 0 && (
          <section className="mb-6">
            <h2 className="text-green-600 font-bold text-lg mb-3">
              Completed ({completed.length})
            </h2>
            {completed.map((t) => renderTodo(t, 'bg-gray-50'))}
          </section>
        )}
      </div>

      {/* ── Stats bar ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t py-3 flex justify-around shadow-sm">
        <div className="text-center">
          <p className="text-2xl font-bold text-red-500">{overdue.length}</p>
          <p className="text-xs text-gray-500">Overdue</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-blue-500">{pending.length}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-500">{completed.length}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
      </div>
    </main>
  );
}
