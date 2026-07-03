'use client';

// Main Todo Page
// UI Reference: docs/main_ui.png, docs/main_ui_pending.png, docs/main_ui_advanced_options.png, docs/main_ui_export.png
// See docs/FEATURES.md for full UI specification and code instructions per feature.
// See docs/PROGRESS.md before adding any new feature — check dependencies first.

import { useEffect, useState } from 'react';

export default function HomePage() {
  const [todos, setTodos] = useState<[]>([]);

  useEffect(() => {
    // TODO: Implement feature 01 (Todo CRUD) — see docs/FEATURES.md § "Todo CRUD Operations"
    // fetch('/api/todos').then(r => r.json()).then(setTodos);
  }, []);

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Todo App</h1>
      <p className="text-gray-500 mt-1">
        {/* TODO: Show welcome message with username after auth (Feature 11) */}
        Welcome
      </p>

      {/* TODO: Add form — Feature 01 */}
      {/* TODO: Advanced options (Repeat, Reminder, Template) — Features 03, 04, 07 */}
      {/* TODO: Search + filter bar — Feature 08 */}
      {/* TODO: Overdue / Pending / Completed sections — Feature 01 */}
      {/* TODO: Stats bar — Feature 01 */}
    </main>
  );
}
