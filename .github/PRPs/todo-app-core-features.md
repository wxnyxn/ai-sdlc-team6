# Product Requirements — Todo App Core Features

> Reference: See `docs/FEATURES.md` for the full feature list and UI specifications.  
> See `docs/PROGRESS.md` for implementation order and dependency tracking.

---

## Product Overview

A **Next.js 16** full-stack todo application with passwordless WebAuthn authentication, SQLite persistence, and Singapore timezone support. Users can manage tasks with priorities, recurring patterns, reminders, subtasks, tags, templates, and a calendar view.

---

## User Stories

### Authentication
- As a user, I can register with a username and my device biometrics (no password).
- As a user, I can log in with my passkey so I don't need to remember a password.
- As a user, I am automatically redirected to login if my session expires.

### Todo Management
- As a user, I can create a todo with a title, priority, and optional due date.
- As a user, I can edit or delete any of my todos.
- As a user, I can mark a todo as complete with a checkbox.
- As a user, todos are sorted by priority (High → Medium → Low) then by due date.
- As a user, I can see overdue, pending, and completed todos in separate sections.

### Priority
- As a user, I can set a todo's priority to High, Medium, or Low.
- As a user, I can filter the todo list by priority.
- As a user, each priority level is visually distinct (red / yellow / blue badges).

### Recurring Todos
- As a user, I can set a todo to repeat Daily, Weekly, Monthly, or Yearly.
- As a user, when I complete a recurring todo, the next instance is created automatically.
- As a user, the next instance inherits the same priority, tags, reminder, and recurrence pattern.

### Reminders & Notifications
- As a user, I can set a reminder offset (15m / 30m / 1h / 2h / 1d / 2d / 1w before due).
- As a user, I receive a browser notification when a reminder fires.
- As a user, I am asked for notification permission on first use.

### Subtasks
- As a user, I can add subtasks to any todo as a checklist.
- As a user, I can see a progress bar showing subtask completion percentage.
- As a user, deleting a todo automatically deletes its subtasks.

### Tags
- As a user, I can create color-coded tags and attach them to todos.
- As a user, I can filter todos by tag.
- As a user, I can manage tags (create, rename, delete).

### Templates
- As a user, I can save a todo as a template for reuse.
- As a user, I can apply a template to pre-fill the add form.
- As a user, templates can store subtasks and a due-date offset.

### Search & Filtering
- As a user, I can search todos by title and subtask content in real time.
- As a user, I can combine search, priority filter, and tag filter simultaneously.

### Export & Import
- As a user, I can export all my todos as JSON or CSV.
- As a user, I can import a previously exported JSON file to restore todos.

### Calendar View
- As a user, I can view a monthly calendar at `/calendar`.
- As a user, Singapore public holidays are shown on the calendar.
- As a user, I can add custom holidays with an optional recurrence flag.

---

## Non-Functional Requirements

| Requirement | Detail |
|-------------|--------|
| Timezone | All dates/times in `Asia/Singapore` — use `lib/timezone.ts`, never `new Date()` |
| Security | WebAuthn only; JWT HTTP-only cookies; no plaintext passwords |
| Database | SQLite via `better-sqlite3`; synchronous queries; no ORM |
| Performance | All filtering client-side; no unnecessary API calls on keystrokes |
| Auth guard | `middleware.ts` protects `/` and `/calendar`; redirect to `/login` |

---

## Acceptance Criteria (Global)

- [ ] All API routes return correct HTTP status codes (200/201/400/401/404/500).
- [ ] `npm run build` and `npm run lint` pass with zero errors.
- [ ] All dates use `getSingaporeNow()` / `formatSingaporeDate()` from `lib/timezone.ts`.
- [ ] No `lib/db.ts` imports in any client component.
- [ ] `params` is always awaited in dynamic API route handlers.
- [ ] Nullable DB fields use `?? 0` or `?? null` null-coalescing.
- [ ] Playwright E2E tests pass for each implemented feature.
