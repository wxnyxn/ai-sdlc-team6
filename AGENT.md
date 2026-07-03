# AGENT.md — AI Agent Instructions for Todo App

This file guides AI agents working on this codebase. Follow each section in order when implementing features or fixing bugs.

> **Before implementing any feature**, review [`docs/PROGRESS.md`](docs/PROGRESS.md) to:
> - Confirm the feature's dependencies are already completed (check the `Depends on` field).
> - Avoid implementing features out of order, which can cause missing DB schema, missing API endpoints, or broken UI flows.
> - Update the feature status in `docs/PROGRESS.md` to `🔄 In Progress` before starting, and `✅ Completed` when done.

---

## 1. Reference Project Patterns

Before writing any code, read `.github/copilot-instructions.md` for the authoritative patterns used in this project. Key rules to internalize:

- **Authentication**: WebAuthn/Passkeys only — no passwords. Use `@simplewebauthn/server` and `@simplewebauthn/browser`. Always use `?? 0` for the `counter` field on authenticators.
- **Database**: `lib/db.ts` is the single source of truth. Use `better-sqlite3` (synchronous — no async/await for queries). Add interfaces, prepared statements, and exported DB objects here.
- **Timezone**: Never use `new Date()` directly. Always import and use `getSingaporeNow()` / `formatSingaporeDate()` from `lib/timezone.ts`.
- **API routes**: Check session first via `getSession()`. Return 401 if unauthenticated. Await `params` before destructuring (`const { id } = await params`).
- **Client components**: `app/page.tsx` is the monolithic UI (~2200 lines). Add new UI features here unless creating a new route. Never import `lib/db.ts` in client components.
- **Null safety**: Use `?? 0` or `?? null` for all nullable database fields passed to library functions.

---

## 2. Check User-Facing Behavior

Before implementing, read the relevant section of `USER_GUIDE.md` to understand the expected user experience. Match the described behavior exactly:

- Confirm field names, labels, and UI placement match the guide.
- Respect sorting rules (e.g., high priority first, then by due date).
- All date/time values must display in **Singapore timezone**.
- Recurring todo completion must create the next instance with the same priority, tags, reminder offset, and recurrence pattern.
- Notifications must respect `last_notification_sent` to prevent duplicates.

---

## 3. Implement Following Technical Requirements

When building a feature:

1. **Database first**: Add or update the schema and CRUD methods in `lib/db.ts`. Handle migrations with try-catch `ALTER TABLE` blocks inside `db.exec()`.
2. **API route**: Create or update the route under `app/api/`. Follow the standard pattern (auth check → param extraction → DB call → response).
3. **UI**: Update `app/page.tsx` for main todo features, or `app/calendar/page.tsx` for calendar features. Use React hooks for state; call API routes via `fetch`.
4. **Types**: Export shared types from `lib/db.ts` and import them in both API routes and client components.
5. **No direct DB access from client**: All data mutations go through API routes.

---

## 4. Validate Against Acceptance Criteria

After implementation, verify the following before considering the task done:

- [ ] Feature behaves exactly as described in `USER_GUIDE.md`.
- [ ] All dates/times use Singapore timezone via `lib/timezone.ts`.
- [ ] API routes return proper HTTP status codes (200, 201, 400, 401, 404, 500).
- [ ] Null/undefined database fields are handled with `??` null-coalescing.
- [ ] `params` is awaited in all dynamic API route handlers.
- [ ] No direct imports of `lib/db.ts` in client-side files.
- [ ] `npm run build` passes with no TypeScript or lint errors (`npm run lint`).
- [ ] Recurring todo completion creates the next instance correctly.
- [ ] No new passwords or plaintext credential storage introduced.

---

## 5. Write Tests

All new features require Playwright E2E tests. Follow these conventions from `playwright.config.ts` and `tests/helpers.ts`:

### Setup
- Use virtual WebAuthn authenticators (Chromium CDP flags, configured in `playwright.config.ts`).
- Set `timezoneId: 'Asia/Singapore'` in browser context config.
- Use the `tests/helpers.ts` helper class for reusable actions: `createTodo()`, `addSubtask()`, `createTag()`.

### Test File Naming
Name test files to match the feature area, following the existing numbering convention:
```
tests/01-authentication.spec.ts
tests/02-todo-crud.spec.ts
tests/03-<feature-name>.spec.ts
```

### Test Structure
Each test file must cover:
1. **Happy path**: The primary user flow described in `USER_GUIDE.md`.
2. **Edge cases**: Empty inputs, boundary dates, duplicate names, etc.
3. **Error states**: Invalid data, unauthorized access, missing fields.

### Running Tests
```bash
npx playwright test                              # All tests
npx playwright test tests/02-todo-crud.spec.ts  # Single file
npx playwright test --ui                         # Interactive mode
npx playwright show-report                       # View HTML report
```

### Acceptance for Tests
- Tests must pass against a clean database state.
- Tests must not use `new Date()` — use fixed Singapore-timezone timestamps or relative offsets.
- Each test must be independent (no shared mutable state between tests).
