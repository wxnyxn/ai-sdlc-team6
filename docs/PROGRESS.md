# Feature Implementation Progress

## Dependency Graph

```
Todo CRUD (01) → Priority (02), Recurring (03), Subtasks (05), Tags (06)
Tags (06) → Search/Filtering (08)
Subtasks (05) → Templates (07)
Todos (01) → Export/Import (09), Calendar (10)
Authentication (11) → All features (require session for production, but can be added last)
```

## Implementation Order

Features are ordered so that all dependencies are implemented before the features that rely on them.

| Order | ID | Feature | Depends On | Status |
|-------|----|---------|------------|--------|
| 1 | 01 | Todo CRUD Operations | — | ✅ Completed |
| 2 | 02 | Priority System | 01 | ✅ Completed |
| 3 | 03 | Recurring Todos | 01 | ✅ Completed |
| 4 | 04 | Reminders & Notifications | 01 | ✅ Completed |
| 5 | 05 | Subtasks & Progress Tracking | 01 | ✅ Completed |
| 6 | 06 | Tag System | 01 | ✅ Completed |
| 7 | 07 | Template System | 05 | ✅ Completed |
| 8 | 08 | Search & Filtering | 06 | ✅ Completed |
| 9 | 09 | Export & Import | 01 | ✅ Completed |
| 10 | 10 | Calendar View | 01 | ✅ Completed |
| 11 | 11 | WebAuthn/Passkeys Authentication | — (enables all) | ✅ Completed |

---

## Feature Details

### ⬜ 01 — Todo CRUD Operations
**PRP:** [01-todo-crud-operations.md](../PRPs/01-todo-crud-operations.md)  
**Depends on:** None  
**Blocks:** 02, 03, 04, 05, 06, 09, 10

- [ ] Create todo (title, due date, priority)
- [ ] Read / list all todos
- [ ] Update todo (inline edit)
- [ ] Delete todo
- [ ] Singapore timezone handling
- [ ] Validation rules and error handling
- [ ] Optimistic UI updates

---

### ⬜ 02 — Priority System
**PRP:** [02-priority-system.md](../PRPs/02-priority-system.md)  
**Depends on:** 01  
**Blocks:** —

- [ ] Three-level priority (High / Medium / Low)
- [ ] Color-coded badges per priority
- [ ] Automatic sort by priority then due date
- [ ] Priority filter dropdown

---

### ⬜ 03 — Recurring Todos
**PRP:** [03-recurring-todos.md](../PRPs/03-recurring-todos.md)  
**Depends on:** 01  
**Blocks:** —

- [ ] Daily, weekly, monthly, yearly recurrence patterns
- [ ] Automatic next instance creation on completion
- [ ] Due date calculation logic
- [ ] Metadata inheritance (priority, tags, reminder offset)

---

### ⬜ 04 — Reminders & Notifications
**PRP:** [04-reminders-notifications.md](../PRPs/04-reminders-notifications.md)  
**Depends on:** 01  
**Blocks:** —

- [ ] Browser notification system
- [ ] Configurable timing (15m / 30m / 1h / 2h / 1d / 2d / 1w before)
- [ ] Polling mechanism via `/api/notifications/check`
- [ ] Duplicate prevention via `last_notification_sent`
- [ ] Singapore timezone calculations

---

### ⬜ 05 — Subtasks & Progress Tracking
**PRP:** [05-subtasks-progress.md](../PRPs/05-subtasks-progress.md)  
**Depends on:** 01  
**Blocks:** 07

- [ ] Checklist functionality (add / toggle / delete subtasks)
- [ ] Visual progress bar
- [ ] Position management (ordering)
- [ ] Cascade delete with parent todo

---

### ✅ 06 — Tag System
**PRP:** [06-tag-system.md](../PRPs/06-tag-system.md)  
**Depends on:** 01  
**Blocks:** 08

- [ ] Color-coded tag labels
- [ ] Many-to-many relationship (todos ↔ tags)
- [ ] Tag CRUD (create, rename, delete)
- [ ] Filter todos by tag

---

### ✅ 07 — Template System
**PRP:** [07-template-system.md](../PRPs/07-template-system.md)  
**Depends on:** 05  
**Blocks:** —

- [ ] Save todo as reusable template
- [ ] Subtasks JSON serialization in `templates` table
- [ ] Due date offset calculation on template use
- [ ] Template categories

---

### ✅ 08 — Search & Filtering
**PRP:** [08-search-filtering.md](../PRPs/08-search-filtering.md)  
**Depends on:** 06  
**Blocks:** —

- [ ] Real-time text search
- [ ] Advanced search across title and tags
- [ ] Multi-criteria filtering (priority + tag + status)
- [ ] Client-side performance (no extra API calls)

---

### ✅ 09 — Export & Import
**PRP:** [09-export-import.md](../PRPs/09-export-import.md)  
**Depends on:** 01  
**Blocks:** —

- [ ] JSON export via `GET /api/todos/export`
- [ ] JSON import via `POST /api/todos/import`
- [ ] ID remapping on import
- [ ] Relationship preservation (subtasks, tags)
- [ ] Data validation on import

---

### ✅ 10 — Calendar View
**PRP:** [10-calendar-view.md](../PRPs/10-calendar-view.md)  
**Depends on:** 01  
**Blocks:** —

- [ ] Monthly calendar grid display
- [ ] Singapore public holidays (seeded via `scripts/seed-holidays.ts`)
- [ ] Todo dots/chips visualized by due date
- [ ] Month navigation (previous / next)

---

### ⬜ 11 — WebAuthn/Passkeys Authentication
**PRP:** [11-authentication-webauthn.md](../PRPs/11-authentication-webauthn.md)  
**Depends on:** None (can be added last; all other features require session in production)  
**Blocks:** All features (session required for API routes)

- [ ] Passwordless registration flow (`/api/auth/register-options` → `/api/auth/register-verify`)
- [ ] Passwordless login flow (`/api/auth/login-options` → `/api/auth/login-verify`)
- [ ] JWT session management (7-day expiry, HTTP-only cookie)
- [ ] Route protection middleware (`middleware.ts`) for `/` and `/calendar`

---

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ⬜ | Not Started |
| 🔄 | In Progress |
| ✅ | Completed |
| 🚫 | Blocked (dependency not met) |

## How to Update

When starting a feature, update both the summary table and the feature section header:

- Summary table: change `⬜ Not Started` → `🔄 In Progress`
- Feature header: change `### ⬜` → `### 🔄`
- Check off sub-items as they are completed
- On completion, change to `✅ Completed` / `### ✅`
