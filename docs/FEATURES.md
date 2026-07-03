# Core Features List

> **Before implementing any feature**, review [`docs/PROGRESS.md`](PROGRESS.md) to check dependency status and implementation order. Never start a feature whose dependencies are not yet `✅ Completed`.

> **UI Reference**: All UI screenshots are in the `docs/` folder. Study the relevant image(s) listed under each feature before writing any code. Match layout, labels, colors, and interaction patterns exactly as shown.

---

## Core Features

### 1. Todo CRUD Operations
**PRP:** [01-todo-crud-operations.md](../PRPs/01-todo-crud-operations.md)  
**UI References:** `docs/main_ui.png`, `docs/main_ui_pending.png`

**UI Specification (from screenshots):**
- **Header**: App title "Todo App" top-left, welcome message (username) below it. Top-right nav bar: `⋮ Data` (gray), `Calendar` (purple), `📋 Templates` (purple), bell icon (orange), `Logout` (dark gray).
- **Add form**: Full-width text input placeholder "Add a new todo…"; second row has Priority dropdown (default "Medium"), datetime-local picker, and a blue `Add` button.
- **"Show Advanced Options"** toggle link in blue below the form row (chevron right when collapsed).
- **Todo card**: checkbox on left; title bold; priority badge (yellow pill for Medium); subtask count (`0`); relative due time in red ("Due in 4 minutes"); `►` expand, `Edit` (blue link), `Del` (red link) on right.
- **Section headers**: "Pending (N)" in blue bold; "⚠️ Overdue (N)" in red bold; overdue cards have light red background.
- **Bottom stats bar**: `Overdue` (red), `Pending` (blue), `Completed` (green) counts.
- **Empty state**: centered gray text "No todos yet. Add one above!"

**Code Instructions:**
1. Implement `app/page.tsx` as a `'use client'` component.
2. Form state: `title`, `priority` (default `'medium'`), `dueDate`, `showAdvanced` (boolean).
3. `POST /api/todos` to create; `GET /api/todos` to list; `PUT /api/todos/[id]` to update; `DELETE /api/todos/[id]` to delete.
4. Split list into overdue, pending, completed arrays. Render each section with its header.
5. Use `getSingaporeNow()` from `lib/timezone.ts` for all date comparisons — never `new Date()`.
6. Validate: title required (non-empty/non-whitespace); due date must be at least 1 minute in the future.

---

### 2. Priority System
**PRP:** [02-priority-system.md](../PRPs/02-priority-system.md)  
**UI References:** `docs/main_ui.png`, `docs/main_ui_pending.png`, `docs/repeat_todo.png`

**UI Specification (from screenshots):**
- Priority badge is a rounded pill next to the todo title.
- **Color coding**: High → red pill; Medium → yellow/amber pill; Low → blue pill.
- Priority dropdown in add form defaults to "Medium".
- Filter bar below search: `All Priorities` dropdown (All / High / Medium / Low).
- Todos sorted High → Medium → Low; within same priority, by due date ascending.

**Code Instructions:**
1. Add `priority` column (`'high' | 'medium' | 'low'`) to todos table in `lib/db.ts`.
2. Badge Tailwind classes: `bg-red-100 text-red-700` (high), `bg-yellow-100 text-yellow-700` (medium), `bg-blue-100 text-blue-700` (low).
3. Sort client-side: priority order `high > medium > low`, then `due_date ASC`.
4. Priority `<select>` filter applied client-side on the in-memory list.

---

### 3. Recurring Todos
**PRP:** [03-recurring-todos.md](../PRPs/03-recurring-todos.md)  
**UI References:** `docs/main_ui_advanced_options.png`, `docs/repeat_todo.png`, `docs/repeat_todo_added.png`

**UI Specification (from screenshots):**
- Advanced options row: `☐ Repeat` checkbox; when checked, pattern dropdown appears (Daily / Weekly / Monthly / Yearly).
- Reminder dropdown options: None / 15 min before / 30 min before / 1 hour before / 2 hours before / 1 day before / 2 days before / 1 week before.
- Todo card chips after creation: blue `📋 weekly` recurrence chip + green `🔔 1w` reminder chip (see `repeat_todo_added.png`).
- Due date shown as "Jul 11, 2:48 PM". Overdue cards show light red background with "N day(s) overdue".

**Code Instructions:**
1. Add `recurrence_pattern` (`daily|weekly|monthly|yearly|null`) and `reminder_offset_minutes` (integer|null) to todos table.
2. Render recurrence chip only when `recurrence_pattern` is set; reminder chip only when `reminder_offset_minutes` is set.
3. On completion of recurring todo: calculate next due date (Daily +1d, Weekly +7d, Monthly +1mo, Yearly +1yr in SGT), create new todo row inheriting title, priority, tags, reminder, and recurrence pattern.
4. All date math uses Singapore timezone via `lib/timezone.ts`.

---

## Advanced Features

### 4. Reminders & Notifications
**PRP:** [04-reminders-notifications.md](../PRPs/04-reminders-notifications.md)  
**UI References:** `docs/notification_ui.png`, `docs/main_ui_advanced_options.png`, `docs/repeat_todo.png`

**UI Specification (from screenshots):**
- Browser shows permission prompt "wants to Show notifications" with Allow / Block on first use.
- Bell icon in header is orange; triggers permission request or opens notification settings.
- Reminder dropdown in advanced options: None, 15 min before, 30 min before, 1 hour before, 2 hours before, 1 day before, 2 days before, 1 week before.

**Code Instructions:**
1. On app load, call `Notification.requestPermission()` if not yet granted.
2. Poll `GET /api/notifications/check` every 60 seconds.
3. API checks todos where `due_date - reminder_offset_minutes <= now` and `last_notification_sent` is null or stale.
4. On match, update `last_notification_sent` in DB; client fires `new Notification(title, { body })`.
5. All time comparisons use Singapore timezone via `lib/timezone.ts`.

---

### 5. Subtasks & Progress Tracking
**PRP:** [05-subtasks-progress.md](../PRPs/05-subtasks-progress.md)  
**UI References:** `docs/main_ui_pending.png`, `docs/repeat_todo_added.png`

**UI Specification (from screenshots):**
- Todo card shows subtask count badge (e.g. `0`) next to the priority badge.
- Clicking `►` expands the card inline to show the subtask checklist.
- Each subtask has a checkbox and title; completed subtasks show strikethrough text.
- A visual progress bar fills proportionally as subtasks are completed.

**Code Instructions:**
1. Create `subtasks` table: `id`, `todo_id` (FK CASCADE DELETE), `title`, `completed` (0/1), `position` (integer).
2. Routes: `GET /api/todos/[id]/subtasks`, `POST /api/todos/[id]/subtasks`, `PUT /api/subtasks/[id]`, `DELETE /api/subtasks/[id]`.
3. Progress = completed / total × 100%; render bar: `<div className="bg-blue-500 h-1 rounded" style={{width: `${progress}%`}} />`.
4. Position field controls order; update positions on reorder.

---

### 6. Tag System
**PRP:** [06-tag-system.md](../PRPs/06-tag-system.md)  
**UI References:** `docs/main_ui_pending.png`, `docs/repeat_todo_added.png`, `docs/template_ui.png`

**UI Specification (from screenshots):**
- Tags appear as small rounded pills on todo cards and in the Templates modal (e.g., gray "work" pill).
- Each tag has a user-chosen color.
- Advanced filter section shows tag chips for filtering.

**Code Instructions:**
1. Create `tags` table (`id`, `user_id`, `name`, `color`) and `todo_tags` join table (`todo_id`, `tag_id`) in `lib/db.ts`.
2. Routes: `GET/POST /api/tags`, `DELETE /api/tags/[id]`, `POST /api/todos/[id]/tags`, `DELETE /api/todos/[id]/tags/[tagId]`.
3. Render tag pills on cards using stored `color` as Tailwind class or inline style.
4. Tag filter: clicking a tag chip filters the in-memory list to todos with that tag (client-side, no extra API call).

---

### 7. Template System
**PRP:** [07-template-system.md](../PRPs/07-template-system.md)  
**UI References:** `docs/template_ui.png`, `docs/notification_ui.png`, `docs/main_ui_advanced_options.png`

**UI Specification (from screenshots):**
- **"My Templates" modal** opened via the purple `📋 Templates` header button.
- Each template card: bold name, gray description, `Title:` + `Priority:` badge, category tag pill (gray), `Use Template` (blue) + `Delete` (red) buttons.
- `Close` button at bottom of modal.
- Advanced options: `Use Template:` label with "Select a template…" dropdown.
- **"Save as Template"** green button in advanced options when a title is entered.

**Code Instructions:**
1. Create `templates` table: `id`, `user_id`, `name`, `description`, `priority`, `due_date_offset_days`, `subtasks` (JSON text), `category`.
2. Routes: `GET /api/templates`, `POST /api/templates`, `DELETE /api/templates/[id]`, `POST /api/templates/[id]/use`.
3. "Save as Template" POSTs current form state; "Use Template" populates the add form; due date = today + offset in SGT.
4. Serialize subtasks: `JSON.stringify([{ title, position }])` before storing.

---

## Productivity Features

### 8. Search & Filtering
**PRP:** [08-search-filtering.md](../PRPs/08-search-filtering.md)  
**UI References:** `docs/main_ui.png`, `docs/main_ui_pending.png`

**UI Specification (from screenshots):**
- Full-width search input below add form; placeholder "Search todos and subtasks…"; magnifier icon on left.
- Below search: `All Priorities` dropdown left; `► Advanced` toggle button right (expands to show tag filters).
- Filtering is real-time — no submit button.

**Code Instructions:**
1. Maintain `searchQuery` and `filterPriority` state in `app/page.tsx`.
2. Filter in-memory list on every keystroke: match `searchQuery` against todo title and subtask titles.
3. Priority filter: `'all'` shows everything; otherwise exact match.
4. `► Advanced` expands a tag filter row; selecting a tag additionally filters todos containing that tag.
5. All filtering client-side — no extra API calls.

---

### 9. Export & Import
**PRP:** [09-export-import.md](../PRPs/09-export-import.md)  
**UI References:** `docs/main_ui_export.png`

**UI Specification (from screenshots):**
- **`⋮ Data` button** (top-right, gray) opens a dropdown with three options: `Export JSON`, `Export CSV`, `Import JSON`.
- Clicking outside or selecting an option closes the dropdown.

**Code Instructions:**
1. Dropdown toggles on `⋮ Data` click; closes on outside click via `useEffect` + document listener.
2. `Export JSON`: `GET /api/todos/export`; trigger browser download of JSON response.
3. `Export CSV`: convert todo list client-side to CSV string; trigger `.csv` download.
4. `Import JSON`: hidden `<input type="file" accept=".json">`; POST file content to `POST /api/todos/import`.
5. Import route remaps IDs and preserves subtask/tag relationships; validates structure before inserting.

---

### 10. Calendar View
**PRP:** [10-calendar-view.md](../PRPs/10-calendar-view.md)  
**UI References:** `docs/calendar.png`, `docs/holiday_ui.png`, `docs/add_holiday.png`

**UI Specification (from screenshots):**
- Separate page at `/calendar`. Top-left: `← Back to Todos` link. Centered title: "Holiday Calendar". `← Prev` / `Next →` blue nav buttons.
- Month/year heading bold (e.g. "July 2026"). 7-column grid Sun→Sat with rounded card cells.
- Today's cell highlighted with blue border/background (see `docs/calendar.png`).
- Holidays shown as pink/salmon chips inside day cells with holiday name (see `docs/holiday_ui.png`).
- **Add Holiday modal** (see `docs/add_holiday.png`): Name field, Date picker ("dd-Mon-yyyy" format), optional Description textarea, "Recurring holiday" checkbox, `Add` (blue) + `Cancel` (gray) buttons.

**Code Instructions:**
1. Implement `app/calendar/page.tsx` as a `'use client'` component.
2. State: `currentMonth` (Date in SGT), `holidays` (from `GET /api/holidays`).
3. Build grid: compute first-day offset; fill 6 rows × 7 columns with day numbers.
4. Highlight today: compare cell date to `getSingaporeNow()` date.
5. Render holiday chips: find matches in `holidays` array per day; render `<span>` pill with salmon background.
6. "Add Holiday" opens modal; `POST /api/holidays` with `{ name, date, description, recurring }`.
7. `holidays` table: `id`, `name`, `date` (YYYY-MM-DD), `description`, `recurring` (0/1).

---

## Infrastructure

### 11. WebAuthn/Passkeys Authentication
**PRP:** [11-authentication-webauthn.md](../PRPs/11-authentication-webauthn.md)  
**UI References:** `docs/main_ui.png` (header shows logged-in state: welcome message + Logout button)

**UI Specification (from screenshots):**
- Logged-in header: "Welcome, {username}" below app title; `Logout` button top-right (dark gray).
- Login/register page: username input field + passkey button (biometric prompt).

**Code Instructions:**
1. Registration: `POST /api/auth/register-options` → browser `startRegistration()` → `POST /api/auth/register-verify`.
2. Login: `POST /api/auth/login-options` → browser `startAuthentication()` → `POST /api/auth/login-verify`.
3. On verify success: create JWT (7-day expiry) in `lib/auth.ts`; set as HTTP-only cookie.
4. `middleware.ts` protects `/` and `/calendar`; redirects unauthenticated users to `/login`.
5. Always use `?? 0` for `authenticator.counter` to handle undefined values.
6. Use `isoBase64URL` from `@simplewebauthn/server/helpers` for credential_id encoding/decoding.
