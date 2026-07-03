'use client';

// Main Todo Page — Feature 01 (Todo CRUD) + Feature 02 (Priority System)
// UI Reference: docs/main_ui.png, docs/main_ui_pending.png

import { useEffect, useState, useCallback } from 'react';
import { getSingaporeNow, formatSingaporeDate } from '@/lib/timezone';

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

interface Subtask {
  id: number;
  todo_id: number;
  title: string;
  completed: number;
  position: number;
}

// Reminder offset → short label (Feature 03)
function getReminderLabel(minutes: number): string {
  if (minutes === 15) return '15m';
  if (minutes === 30) return '30m';
  if (minutes === 60) return '1h';
  if (minutes === 120) return '2h';
  if (minutes === 1440) return '1d';
  if (minutes === 2880) return '2d';
  if (minutes === 10080) return '1w';
  return `${minutes}m`;
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
  const [recurrenceEnabled, setRecurrenceEnabled] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly');
  const [reminderOffsetMinutes, setReminderOffsetMinutes] = useState<number | null>(null);
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
  // ── Subtask state (Feature 05) ─────────────────────────────────────
  const [expandedTodoId, setExpandedTodoId] = useState<number | null>(null);
  const [subtasksMap, setSubtasksMap] = useState<Record<number, Subtask[]>>({});
  const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<number, string>>({});
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

  // ── Notification permission (Feature 04) ─────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  // ── Notification polling every 60 seconds (Feature 04) ───────────────────────
  useEffect(() => {
    async function checkNotifications() {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      const res = await fetch('/api/notifications/check');
      if (!res.ok) return;

      const data = await res.json();
      const items: Array<{ id: number; title: string; due_date: string | null }> =
        data.notifications ?? [];

      for (const todo of items) {
        new Notification('Todo Reminder', {
          body: todo.due_date
            ? `"${todo.title}" is due soon`
            : `Reminder: "${todo.title}"`,
          icon: '/favicon.ico',
        });
      }
    }

    checkNotifications();
    const interval = setInterval(checkNotifications, 60_000);
    return () => clearInterval(interval);
  }, []);

  // ── Subtask handlers (Feature 05) ─────────────────────────────────────
  async function loadSubtasks(todoId: number) {
    const res = await fetch(`/api/todos/${todoId}/subtasks`);
    if (res.ok) {
      const data = await res.json();
      setSubtasksMap((prev) => ({ ...prev, [todoId]: data.subtasks ?? [] }));
    }
  }

  async function handleExpandToggle(todoId: number) {
    if (expandedTodoId === todoId) {
      setExpandedTodoId(null);
    } else {
      setExpandedTodoId(todoId);
      await loadSubtasks(todoId);
    }
  }

  async function handleAddSubtask(todoId: number) {
    const text = (newSubtaskTitles[todoId] ?? '').trim();
    if (!text) return;
    await fetch(`/api/todos/${todoId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: text }),
    });
    setNewSubtaskTitles((prev) => ({ ...prev, [todoId]: '' }));
    await loadSubtasks(todoId);
    loadTodos(); // refresh subtask_count
  }

  async function handleToggleSubtask(subtask: Subtask, todoId: number) {
    await fetch(`/api/subtasks/${subtask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: subtask.completed ? 0 : 1 }),
    });
    await loadSubtasks(todoId);
  }

  async function handleDeleteSubtask(subtaskId: number, todoId: number) {
    await fetch(`/api/subtasks/${subtaskId}`, { method: 'DELETE' });
    await loadSubtasks(todoId);
    loadTodos(); // refresh subtask_count
  }

  // ── Bell click — request permission (Feature 04) ──────────────────────────────
  function handleBellClick() {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      Notification.requestPermission();
    }
  }

  // ── Add todo ──────────────────────────────────────────────────────────────────
  async function handleAdd() {
    setFormError('');
    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }
    const body: Record<string, unknown> = { title, priority };
    if (dueDate) body.dueDate = dueDate;
    if (recurrenceEnabled) body.recurrencePattern = recurrencePattern;
    if (reminderOffsetMinutes !== null) body.reminderOffsetMinutes = reminderOffsetMinutes;

    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      setTitle('');
      setPriority('medium');
      setDueDate('');
      setRecurrenceEnabled(false);
      setRecurrencePattern('weekly');
      setReminderOffsetMinutes(null);
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
    const isExpanded = expandedTodoId === todo.id;
    const subtasks = subtasksMap[todo.id] ?? [];
    const completedCount = subtasks.filter((s) => s.completed).length;
    const progress = subtasks.length > 0 ? (completedCount / subtasks.length) * 100 : 0;

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
      <div key={todo.id} className={`rounded-lg border mb-2 ${cardBg}`}>
        {/* ── Main row ── */}
        <div className="flex items-start gap-3 p-3">
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
            {/* Recurrence chip (Feature 03) */}
            {todo.recurrence_pattern && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                📋 {todo.recurrence_pattern}
              </span>
            )}
            {/* Reminder chip (Feature 03) */}
            {todo.reminder_offset_minutes != null && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                🔔 {getReminderLabel(todo.reminder_offset_minutes)}
              </span>
            )}
            {/* Due time */}
            {dueInfo && (
              <span className={`text-xs ${dueInfo.overdue ? 'text-red-500' : 'text-blue-500'}`}>
                {dueInfo.overdue ? dueInfo.text : (todo.due_date ? formatSingaporeDate(todo.due_date) : '')}
              </span>
            )}
          </div>
        </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0 text-sm">
            <button
              onClick={() => handleExpandToggle(todo.id)}
              className="text-gray-400 hover:text-gray-600"
              title={isExpanded ? 'Collapse subtasks' : 'Expand subtasks'}
            >
              {isExpanded ? '▼' : '►'}
            </button>
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

        {/* ── Expanded subtask area (Feature 05) ── */}
        {isExpanded && (
          <div className="px-4 pb-4 border-t border-gray-100">
            {/* Progress bar */}
            {subtasks.length > 0 && (
              <div className="mt-3 mb-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{completedCount}/{subtasks.length}</span>
                </div>
                <div className="w-full bg-gray-100 rounded h-1">
                  <div
                    className="bg-blue-500 h-1 rounded transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Subtask list */}
            <ul className="mt-2 space-y-1">
              {subtasks.map((subtask) => (
                <li key={subtask.id} className="flex items-center gap-2 group">
                  <input
                    type="checkbox"
                    checked={!!subtask.completed}
                    onChange={() => handleToggleSubtask(subtask, todo.id)}
                    className="w-4 h-4 cursor-pointer shrink-0"
                  />
                  <span
                    className={`flex-1 text-sm ${
                      subtask.completed ? 'line-through text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    {subtask.title}
                  </span>
                  <button
                    onClick={() => handleDeleteSubtask(subtask.id, todo.id)}
                    className="text-red-400 hover:text-red-600 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>

            {/* Add subtask */}
            <div className="flex gap-2 mt-3">
              <input
                type="text"
                placeholder="Add a subtask…"
                value={newSubtaskTitles[todo.id] ?? ''}
                onChange={(e) =>
                  setNewSubtaskTitles((prev) => ({ ...prev, [todo.id]: e.target.value }))
                }
                onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask(todo.id)}
                className="flex-1 border rounded px-3 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                onClick={() => handleAddSubtask(todo.id)}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
              >
                Add
              </button>
            </div>
          </div>
        )}
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
          <button
            onClick={handleBellClick}
            className="px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600"
            title="Notification settings"
          >
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

        {/* ── Advanced options (Features 03, 04, 07) ── */}
        {showAdvanced && (
          <div className="border rounded-lg p-4 mb-4 bg-white">
            {/* Row 1: Repeat + Reminder */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={recurrenceEnabled}
                  onChange={(e) => setRecurrenceEnabled(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
                Repeat
              </label>
              {recurrenceEnabled && (
                <select
                  value={recurrencePattern}
                  onChange={(e) =>
                    setRecurrencePattern(
                      e.target.value as 'daily' | 'weekly' | 'monthly' | 'yearly'
                    )
                  }
                  className="border rounded-lg px-3 py-1 text-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              )}
              <span className="text-sm font-medium">Reminder:</span>
              <select
                value={reminderOffsetMinutes ?? ''}
                onChange={(e) =>
                  setReminderOffsetMinutes(
                    e.target.value !== '' ? Number(e.target.value) : null
                  )
                }
                className="border rounded-lg px-3 py-1 text-sm"
              >
                <option value="">None</option>
                <option value="15">15 min before</option>
                <option value="30">30 min before</option>
                <option value="60">1 hour before</option>
                <option value="120">2 hours before</option>
                <option value="1440">1 day before</option>
                <option value="2880">2 days before</option>
                <option value="10080">1 week before</option>
              </select>
            </div>
            {/* Row 2: Use Template (Feature 07 placeholder) */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Use Template:</span>
              <select className="border rounded-lg px-3 py-1 text-sm min-w-[180px]">
                <option value="">Select a template...</option>
              </select>
            </div>
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
