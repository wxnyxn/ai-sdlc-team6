'use client';

// app/calendar/page.tsx
// Feature 10 — Calendar View
// UI References: docs/calendar.png, docs/holiday_ui.png, docs/add_holiday.png

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getSingaporeNow, toSingaporeDateString } from '@/lib/timezone';

interface Holiday {
  id: number;
  name: string;
  date: string; // YYYY-MM-DD
  description: string | null;
  recurring: number;
}

interface TodoDot {
  id: number;
  title: string;
  priority: 'high' | 'medium' | 'low';
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-red-400',
  medium: 'bg-yellow-400',
  low: 'bg-blue-400',
};

export default function CalendarPage() {
  const today = getSingaporeNow();
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [todoDots, setTodoDots] = useState<Record<string, TodoDot[]>>({});

  // Add holiday modal state
  const [showAddHoliday, setShowAddHoliday] = useState(false);
  const [hName, setHName] = useState('');
  const [hDate, setHDate] = useState('');
  const [hDescription, setHDescription] = useState('');
  const [hRecurring, setHRecurring] = useState(false);
  const [hError, setHError] = useState('');

  const yearMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const loadHolidays = useCallback(async () => {
    const res = await fetch(`/api/holidays?month=${yearMonth}`);
    if (res.ok) {
      const data = await res.json();
      setHolidays(data.holidays ?? []);
    }
  }, [yearMonth]);

  const loadTodos = useCallback(async () => {
    const res = await fetch('/api/todos');
    if (!res.ok) return;
    const data = await res.json();
    const dotsMap: Record<string, TodoDot[]> = {};
    for (const todo of data.todos ?? []) {
      if (!todo.due_date || todo.completed) continue;
      const dateStr = todo.due_date.slice(0, 10);
      if (!dotsMap[dateStr]) dotsMap[dateStr] = [];
      dotsMap[dateStr].push({ id: todo.id, title: todo.title, priority: todo.priority });
    }
    setTodoDots(dotsMap);
  }, []);

  useEffect(() => {
    loadHolidays();
    loadTodos();
  }, [loadHolidays, loadTodos]);

  function prevMonth() {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  }

  function nextMonth() {
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  }

  async function handleAddHoliday() {
    setHError('');
    if (!hName.trim()) { setHError('Name is required'); return; }
    if (!hDate) { setHError('Date is required'); return; }

    const res = await fetch('/api/holidays', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: hName,
        date: hDate,
        description: hDescription || null,
        recurring: hRecurring,
      }),
    });

    if (res.ok) {
      setHName(''); setHDate(''); setHDescription(''); setHRecurring(false);
      setShowAddHoliday(false);
      loadHolidays();
    } else {
      const data = await res.json();
      setHError(data.error ?? 'Failed to add holiday');
    }
  }

  async function handleDeleteHoliday(id: number) {
    await fetch(`/api/holidays/${id}`, { method: 'DELETE' });
    loadHolidays();
  }

  // Build calendar grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = toSingaporeDateString(today);

  const monthLabel = currentDate.toLocaleString('en-SG', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Singapore',
  });

  // Total cells: 6 rows × 7 cols = 42
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length < 42) cells.push(null);

  function cellDateStr(day: number | null): string | null {
    if (!day) return null;
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return (
    <main className="min-h-screen bg-white px-6 py-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="text-blue-500 hover:underline text-sm">
          ← Back to Todos
        </Link>
        <h1 className="text-2xl font-bold text-center flex-1">Holiday Calendar</h1>
        <button
          onClick={() => setShowAddHoliday(true)}
          className="text-sm px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          + Add Holiday
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="px-4 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-sm font-medium hover:bg-blue-200"
        >
          ← Prev
        </button>
        <h2 className="text-xl font-bold">{monthLabel}</h2>
        <button
          onClick={nextMonth}
          className="px-4 py-1.5 rounded-lg bg-blue-100 text-blue-700 text-sm font-medium hover:bg-blue-200"
        >
          Next →
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, idx) => {
          const dateStr = cellDateStr(day);
          const isToday = dateStr === todayStr;
          const dayHolidays = dateStr ? holidays.filter((h) => h.date === dateStr) : [];
          const dayTodos = (dateStr && todoDots[dateStr]) ?? [];

          return (
            <div
              key={idx}
              className={`min-h-[72px] rounded-lg border p-1.5 flex flex-col ${
                !day ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'
              } ${isToday ? 'border-blue-500 ring-2 ring-blue-400' : ''}`}
            >
              {day && (
                <>
                  <span
                    className={`text-xs font-semibold mb-1 ${
                      isToday
                        ? 'text-blue-600'
                        : 'text-gray-700'
                    }`}
                  >
                    {day}
                  </span>

                  {/* Holiday chips */}
                  <div className="flex flex-col gap-0.5">
                    {dayHolidays.map((h) => (
                      <div
                        key={h.id}
                        className="flex items-center justify-between group"
                      >
                        <span
                          className="text-xs px-1.5 py-0.5 rounded bg-pink-100 text-pink-700 font-medium truncate max-w-full"
                          title={h.description ?? h.name}
                        >
                          {h.name}
                        </span>
                        <button
                          onClick={() => handleDeleteHoliday(h.id)}
                          className="text-pink-400 hover:text-pink-600 text-xs ml-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                          title="Remove holiday"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Todo priority dots */}
                  {dayTodos.length > 0 && (
                    <div className="flex gap-1 mt-auto flex-wrap">
                      {dayTodos.slice(0, 3).map((t) => (
                        <span
                          key={t.id}
                          className={`w-2 h-2 rounded-full ${PRIORITY_DOT[t.priority]}`}
                          title={t.title}
                        />
                      ))}
                      {dayTodos.length > 3 && (
                        <span className="text-xs text-gray-400">+{dayTodos.length - 3}</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> High priority</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Medium priority</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Low priority</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-pink-100 inline-block" /> Holiday</span>
      </div>

      {/* Add Holiday Modal */}
      {showAddHoliday && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-bold mb-4">Add Holiday</h2>

            {hError && <p className="text-red-500 text-sm mb-3">{hError}</p>}

            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={hName}
              onChange={(e) => setHName(e.target.value)}
              placeholder="e.g. National Day"
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:ring-2 focus:ring-blue-300"
            />

            <label className="block text-sm font-medium mb-1">Date</label>
            <input
              type="date"
              value={hDate}
              onChange={(e) => setHDate(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:ring-2 focus:ring-blue-300"
            />

            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <textarea
              value={hDescription}
              onChange={(e) => setHDescription(e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-3 outline-none focus:ring-2 focus:ring-blue-300 resize-none"
            />

            <label className="flex items-center gap-2 text-sm mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={hRecurring}
                onChange={(e) => setHRecurring(e.target.checked)}
                className="w-4 h-4"
              />
              Recurring holiday (repeats every year)
            </label>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setShowAddHoliday(false); setHError(''); }}
                className="px-4 py-2 rounded-lg bg-gray-200 text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleAddHoliday}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white text-sm hover:bg-blue-600"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
