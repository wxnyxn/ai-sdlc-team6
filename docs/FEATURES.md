# Core Features List

> **Before implementing any feature**, review [`docs/PROGRESS.md`](PROGRESS.md) to check dependency status and implementation order. Never start a feature whose dependencies are not yet `✅ Completed`.

## Core Features

1. **[01-todo-crud-operations.md](../PRPs/01-todo-crud-operations.md)** - Todo CRUD Operations

   - Create, read, update, delete todos
   - Singapore timezone handling
   - Validation rules and error handling
   - Optimistic UI updates

2. **[02-priority-system.md](../PRPs/02-priority-system.md)** - Priority System

   - Three-level priority (High/Medium/Low)
   - Color-coded badges
   - Automatic sorting
   - Priority filtering

3. **[03-recurring-todos.md](../PRPs/03-recurring-todos.md)** - Recurring Todos

   - Daily, weekly, monthly, yearly patterns
   - Automatic next instance creation
   - Due date calculation logic
   - Metadata inheritance

---

## Advanced Features

1. **[04-reminders-notifications.md](../PRPs/04-reminders-notifications.md)** - Reminders & Notifications

   - Browser notification system
   - Configurable timing (15m to 1 week before)
   - Polling mechanism and duplicate prevention
   - Singapore timezone calculations

2. **[05-subtasks-progress.md](../PRPs/05-subtasks-progress.md)** - Subtasks & Progress Tracking

   - Checklist functionality
   - Visual progress bars
   - Position management
   - Cascade delete behavior

3. **[06-tag-system.md](../PRPs/06-tag-system.md)** - Tag System

   - Color-coded labels
   - Many-to-many relationships
   - Tag management (CRUD)
   - Filtering by tag

4. **[07-template-system.md](../PRPs/07-template-system.md)** - Template System

   - Save and reuse todo patterns
   - Subtasks JSON serialization
   - Due date offset calculation
   - Template categories

---

## Productivity Features

1. **[08-search-filtering.md](../PRPs/08-search-filtering.md)** - Search & Filtering

   - Real-time text search
   - Advanced search (title + tags)
   - Multi-criteria filtering
   - Client-side performance

2. **[09-export-import.md](../PRPs/09-export-import.md)** - Export & Import

   - JSON-based backup/restore
   - ID remapping on import
   - Relationship preservation
   - Data validation

3. **[10-calendar-view.md](../PRPs/10-calendar-view.md)** - Calendar View

   - Monthly calendar display
   - Singapore public holidays
   - Todo visualization by due date
   - Month navigation

---

## Infrastructure

1. **[11-authentication-webauthn.md](../PRPs/11-authentication-webauthn.md)** - WebAuthn/Passkeys Authentication

   - Passwordless authentication flow
   - Registration and login with biometrics
   - Session management with JWT
   - Route protection middleware
