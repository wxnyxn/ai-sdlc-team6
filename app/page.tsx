'use client';

// Main Todo Page — Features 01-11
// UI Reference: docs/main_ui.png, docs/main_ui_pending.png, docs/main_ui_advanced_options.png,
//               docs/main_ui_export.png, docs/template_ui.png, docs/notification_ui.png

import { useEffect, useState, useCallback, useRef, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

// Feature 06 — Tag
interface Tag {
  id: number;
  name: string;
  color: string;
}

// Feature 07 — Template
interface Template {
  id: number;
  name: string;
  description: string | null;
  priority: 'high' | 'medium' | 'low';
  due_date_offset_days: number;
  subtasks: string;
  category: string | null;
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
  const router = useRouter();

  // ── Session state (Feature 11) ────────────────────────────────────────────────
  const [username, setUsername] = useState<string | null>(null);

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
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);

  // ── Edit state ───────────────────────────────────────────────────────────────
  const [editId, setEditId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editDueDate, setEditDueDate] = useState('');

  // ── Subtask state (Feature 05) ─────────────────────────────────────
  const [expandedTodoId, setExpandedTodoId] = useState<number | null>(null);
  const [subtasksMap, setSubtasksMap] = useState<Record<number, Subtask[]>>({});
  const [newSubtaskTitles, setNewSubtaskTitles] = useState<Record<number, string>>({});

  // ── Tag state (Feature 06) ─────────────────────────────────────────
  const [tags, setTags] = useState<Tag[]>([]);
  const [todoTagsMap, setTodoTagsMap] = useState<Record<number, Tag[]>>({});
  const [filterTagId, setFilterTagId] = useState<number | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6b7280');
  const [showTagManager, setShowTagManager] = useState(false);

  // ── Template state (Feature 07) ────────────────────────────────────
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  // Save-as-template modal state (replaces window.prompt)
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateSaveName, setTemplateSaveName] = useState('');
  const [templateSaveDescription, setTemplateSaveDescription] = useState('');
  const [templateSaveCategory, setTemplateSaveCategory] = useState('');

  // ── Data menu state (Feature 09) ───────────────────────────────────
  const [showDataMenu, setShowDataMenu] = useState(false);
  const dataMenuRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  // ── Debounce ref for search (Feature 08) ──────────────────────────
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ── Load todos ────────────────────────────────────────────────────────────────
  const loadTodos = useCallback(async () => {
    const res = await fetch('/api/todos');
    if (res.ok) {
      const data = await res.json();
      setTodos(data.todos ?? []);
    }
  }, []);

  // ── Load tags (Feature 06) ────────────────────────────────────────────────
  const loadTags = useCallback(async () => {
    const res = await fetch('/api/tags');
    if (res.ok) {
      const data = await res.json();
      setTags(data.tags ?? []);
    }
  }, []);

  // ── Load templates (Feature 07) ───────────────────────────────────────────
  const loadTemplates = useCallback(async () => {
    const res = await fetch('/api/templates');
    if (res.ok) {
      const data = await res.json();
      setTemplates(data.templates ?? []);
    }
  }, []);

  useEffect(() => {
    loadTodos();
    loadTags();
    loadTemplates();
  }, [loadTodos, loadTags, loadTemplates]);

  // ── Close data menu on outside click (Feature 09) ─────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dataMenuRef.current && !dataMenuRef.current.contains(e.target as Node)) {
        setShowDataMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Load session username (Feature 11) ──────────────────────────────────────
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.user?.username) setUsername(data.user.username);
      })
      .catch(() => null);
  }, []);

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
      await Promise.all([loadSubtasks(todoId), loadTodoTags(todoId)]);
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

  // ── Tag handlers (Feature 06) ─────────────────────────────────────────────
  async function loadTodoTags(todoId: number) {
    const res = await fetch(`/api/todos/${todoId}/tags`);
    if (res.ok) {
      const data = await res.json();
      setTodoTagsMap((prev) => ({ ...prev, [todoId]: data.tags ?? [] }));
    }
  }

  async function handleCreateTag() {
    if (!newTagName.trim()) return;
    await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
    });
    setNewTagName('');
    setNewTagColor('#6b7280');
    loadTags();
  }

  async function handleDeleteTag(tagId: number) {
    await fetch(`/api/tags/${tagId}`, { method: 'DELETE' });
    loadTags();
    setTodoTagsMap({}); // clear cache — tags may have been removed from todos
  }

  async function handleAddTagToTodo(todoId: number, tagId: number) {
    await fetch(`/api/todos/${todoId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId }),
    });
    loadTodoTags(todoId);
  }

  async function handleRemoveTagFromTodo(todoId: number, tagId: number) {
    await fetch(`/api/todos/${todoId}/tags/${tagId}`, { method: 'DELETE' });
    loadTodoTags(todoId);
  }

  // ── Template handlers (Feature 07) ───────────────────────────────────────
  async function handleSaveAsTemplate() {
    if (!title.trim()) return;
    setTemplateSaveName(title.trim());
    setTemplateSaveDescription('');
    setTemplateSaveCategory('');
    setShowSaveTemplateModal(true);
  }

  async function handleConfirmSaveTemplate() {
    if (!templateSaveName.trim()) return;
    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: templateSaveName.trim(),
        description: templateSaveDescription.trim() || null,
        priority,
        category: templateSaveCategory.trim() || null,
      }),
    });
    setShowSaveTemplateModal(false);
    loadTemplates();
  }

  async function handleUseTemplate(templateId: string) {
    if (!templateId) return;
    const template = templates.find((t) => String(t.id) === templateId);
    if (!template) return;
    setTitle(template.name);
    setPriority(template.priority);
    setSelectedTemplateId('');
  }

  async function handleDeleteTemplate(templateId: number) {
    await fetch(`/api/templates/${templateId}`, { method: 'DELETE' });
    loadTemplates();
  }

  async function handleApplyTemplate(templateId: number) {
    const res = await fetch(`/api/templates/${templateId}/use`, { method: 'POST' });
    if (res.ok) loadTodos();
  }

  // ── Export / Import handlers (Feature 09) ────────────────────────────────
  async function handleExportJSON() {
    setShowDataMenu(false);
    const res = await fetch('/api/todos/export');
    if (!res.ok) return;
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'todos-export.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportCSV() {
    setShowDataMenu(false);
    const header = ['ID', 'Title', 'Priority', 'Due Date', 'Completed', 'Recurrence', 'Reminder (min)'];
    const rows = todos.map((t) => [
      t.id, `"${t.title.replace(/"/g, '""')}"`, t.priority,
      t.due_date ?? '', t.completed ? 'Yes' : 'No',
      t.recurrence_pattern ?? '', t.reminder_offset_minutes ?? '',
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'todos-export.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportClick() {
    setShowDataMenu(false);
    importInputRef.current?.click();
  }

  async function handleImportFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch('/api/todos/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Imported ${data.imported} todo(s) successfully.`);
        loadTodos();
      } else {
        const data = await res.json();
        alert(`Import failed: ${data.error}`);
      }
    } catch {
      alert('Invalid JSON file.');
    }
    e.target.value = '';
  }

  // ── Logout (Feature 11) ────────────────────────────────────────────────────
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  // ── Add todo ──────────────────────────────────────────────────────────────────
  async function handleAdd() {
    setFormError('');
    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }
    if (recurrenceEnabled && !dueDate) {
      setFormError('A due date is required when recurrence is enabled.');
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
    if (!window.confirm('Delete this todo and all its subtasks?')) return;
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
    const q = searchQuery.toLowerCase();
    const todoTags = todoTagsMap[t.id] ?? [];
    const matchesSearch =
      !q ||
      t.title.toLowerCase().includes(q) ||
      todoTags.some((tag) => tag.name.toLowerCase().includes(q));
    const matchesPriority = filterPriority === 'all' || t.priority === filterPriority;
    // Feature 06 — tag filter (client-side against cached todoTagsMap)
    const matchesTag = filterTagId === null ||
      todoTags.some((tag) => tag.id === filterTagId);
    return matchesSearch && matchesPriority && matchesTag;
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
            {/* Tag chips (Feature 06) — shown when expanded or cached */}
            {(todoTagsMap[todo.id] ?? []).map((tag) => (
              <span
                key={tag.id}
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: tag.color + '22', color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
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
                  <span>{completedCount}/{subtasks.length} ({Math.round(progress)}%)</span>
                </div>
                <div className="w-full bg-gray-100 rounded h-1">
                  <div
                    className={`${progress === 100 ? 'bg-green-500' : 'bg-blue-500'} h-1 rounded transition-all`}
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

            {/* Tag management (Feature 06) */}
            <div className="mt-3 border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">Tags</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {(todoTagsMap[todo.id] ?? []).map((tag) => (
                  <span
                    key={tag.id}
                    className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ backgroundColor: tag.color + '22', color: tag.color }}
                  >
                    {tag.name}
                    <button
                      onClick={() => handleRemoveTagFromTodo(todo.id, tag.id)}
                      className="text-xs opacity-60 hover:opacity-100 ml-1"
                    >×</button>
                  </span>
                ))}
              </div>
              <select
                className="border rounded px-2 py-1 text-xs"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) handleAddTagToTodo(todo.id, Number(e.target.value));
                  e.target.value = '';
                }}
              >
                <option value="">+ Add tag…</option>
                {tags
                  .filter((tag) => !(todoTagsMap[todo.id] ?? []).some((t) => t.id === tag.id))
                  .map((tag) => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))
                }
              </select>
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
            {username ? `Welcome, ${username}` : 'Welcome'}
          </p>
        </div>
        <nav className="flex items-center gap-2 flex-wrap justify-end">
          {/* Feature 09 — Data dropdown */}
          <div className="relative" ref={dataMenuRef}>
            <button
              onClick={() => setShowDataMenu((v) => !v)}
              className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200"
            >
              ⋮ Data
            </button>
            {showDataMenu && (
              <div className="absolute right-0 mt-1 w-40 bg-white border rounded-lg shadow-lg z-50 overflow-hidden">
                <button onClick={handleExportJSON} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export JSON</button>
                <button onClick={handleExportCSV} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Export CSV</button>
                <button onClick={handleImportClick} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">Import JSON</button>
              </div>
            )}
            <input ref={importInputRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
          </div>

          {/* Feature 10 — Calendar link */}
          <Link href="/calendar" className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700">
            Calendar
          </Link>

          {/* Feature 07 — Templates modal */}
          <button
            onClick={() => { setShowTemplateModal(true); loadTemplates(); }}
            className="px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-medium hover:bg-purple-700"
          >
            📋 Templates
          </button>
          <button
            onClick={handleBellClick}
            className="px-3 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600"
            title="Notification settings"
          >
            🔔
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-lg bg-gray-700 text-white text-sm font-medium hover:bg-gray-800"
          >
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
                disabled={!dueDate}
                title={!dueDate ? 'Set a due date to enable reminders' : undefined}
                className="border rounded-lg px-3 py-1 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
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
            {/* Row 2: Use Template + Save as Template (Feature 07) */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium">Use Template:</span>
              <select
                value={selectedTemplateId}
                onChange={(e) => { setSelectedTemplateId(e.target.value); handleUseTemplate(e.target.value); }}
                className="border rounded-lg px-3 py-1 text-sm min-w-[180px]"
              >
                <option value="">Select a template…</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
              {title.trim() && (
                <button
                  onClick={handleSaveAsTemplate}
                  className="px-3 py-1 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600"
                >
                  Save as Template
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Search ── */}
        <div className="relative mb-3">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search todos by title or tag…"
            defaultValue={searchQuery}
            onChange={(e) => {
              const val = e.target.value;
              if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
              searchDebounceRef.current = setTimeout(() => setSearchQuery(val), 300);
            }}
            className="w-full border rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        {/* ── Filter bar ── */}
        <div className="flex gap-2 mb-2 flex-wrap items-center">
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
          <button
            onClick={() => setShowAdvancedFilter((v) => !v)}
            className="px-4 py-2 rounded-lg bg-gray-200 text-sm font-medium hover:bg-gray-300"
          >
            {showAdvancedFilter ? '▼' : '►'} Advanced
          </button>
          {/* Feature 06 — Tag filter manager button */}
          <button
            onClick={() => { setShowTagManager(true); loadTags(); }}
            className="px-4 py-2 rounded-lg bg-gray-100 text-sm font-medium hover:bg-gray-200"
          >
            🏷 Tags
          </button>
          {/* Clear filters button — visible only when any filter is active */}
          {(filterPriority !== 'all' || filterTagId !== null || searchQuery) && (
            <button
              onClick={() => {
                setFilterPriority('all');
                setFilterTagId(null);
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-lg bg-red-100 text-red-600 text-sm font-medium hover:bg-red-200"
            >
              ✕ Clear Filters
            </button>
          )}
        </div>

        {/* ── Advanced filter: tag chips (Feature 06 + 08) ── */}
        {showAdvancedFilter && tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 p-3 border rounded-lg bg-gray-50">
            <span className="text-xs text-gray-500 self-center">Filter by tag:</span>
            <button
              onClick={() => setFilterTagId(null)}
              className={`text-xs px-2 py-1 rounded-full border ${filterTagId === null ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-600'}`}
            >
              All
            </button>
            {tags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => setFilterTagId(filterTagId === tag.id ? null : tag.id)}
                className="text-xs px-2 py-1 rounded-full border"
                style={{
                  backgroundColor: filterTagId === tag.id ? tag.color : tag.color + '22',
                  color: filterTagId === tag.id ? '#fff' : tag.color,
                  borderColor: tag.color,
                }}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}

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

      {/* ── Templates Modal (Feature 07) ── */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
            <h2 className="text-lg font-bold mb-4">My Templates</h2>
            <div className="flex-1 overflow-y-auto space-y-3 mb-4">
              {templates.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-6">No templates yet. Create a todo and click &quot;Save as Template&quot;.</p>
              )}
              {templates.map((t) => (
                <div key={t.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{t.name}</p>
                      {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">Priority:</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          t.priority === 'high' ? 'bg-red-100 text-red-700' :
                          t.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>{t.priority.charAt(0).toUpperCase() + t.priority.slice(1)}</span>
                        {t.category && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{t.category}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => { handleApplyTemplate(t.id); setShowTemplateModal(false); }}
                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600"
                    >
                      Use Template
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(t.id)}
                      className="px-3 py-1 bg-red-100 text-red-600 text-xs rounded-lg hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowTemplateModal(false)}
              className="w-full py-2 bg-gray-200 rounded-lg text-sm hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Tag Manager Modal (Feature 06) ── */}
      {showTagManager && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold mb-4">Manage Tags</h2>

            {/* Create tag */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Tag name…"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-300"
              />
              <input
                type="color"
                value={newTagColor}
                onChange={(e) => setNewTagColor(e.target.value)}
                className="w-10 h-10 rounded border cursor-pointer p-0.5"
                title="Tag color"
              />
              <button
                onClick={handleCreateTag}
                className="px-3 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600"
              >
                Add
              </button>
            </div>

            {/* Existing tags */}
            <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
              {tags.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">No tags yet.</p>
              )}
              {tags.map((tag) => (
                <div key={tag.id} className="flex items-center justify-between">
                  <span
                    className="text-sm px-3 py-1 rounded-full"
                    style={{ backgroundColor: tag.color + '22', color: tag.color }}
                  >
                    {tag.name}
                  </span>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowTagManager(false)}
              className="w-full py-2 bg-gray-200 rounded-lg text-sm hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* ── Save as Template Modal (Feature 07) ── */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold mb-4">Save as Template</h2>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Name *</label>
            <input
              type="text"
              value={templateSaveName}
              onChange={(e) => setTemplateSaveName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirmSaveTemplate()}
              autoFocus
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:ring-2 focus:ring-blue-300"
            />
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <input
              type="text"
              value={templateSaveDescription}
              onChange={(e) => setTemplateSaveDescription(e.target.value)}
              placeholder="Short description…"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:ring-2 focus:ring-blue-300"
            />
            <label className="block text-sm font-medium text-gray-700 mb-1">Category (optional)</label>
            <input
              type="text"
              value={templateSaveCategory}
              onChange={(e) => setTemplateSaveCategory(e.target.value)}
              placeholder="e.g. Work, Personal…"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4 outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div className="flex gap-2">
              <button
                onClick={handleConfirmSaveTemplate}
                disabled={!templateSaveName.trim()}
                className="flex-1 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Save Template
              </button>
              <button
                onClick={() => setShowSaveTemplateModal(false)}
                className="flex-1 py-2 bg-gray-200 text-sm rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
