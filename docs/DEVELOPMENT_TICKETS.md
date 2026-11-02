# Barndos Project Tracker — Developer Guide, Tickets & Codex Prompts

**Version:** 1.0 · **Updated:** 2026-11-02 · **Priority:** fastest correct client-ready prototype

Related: [PROJECT_CONTEXT.md](./PROJECT_CONTEXT.md) · [MVP_REQUIREMENTS.md](./MVP_REQUIREMENTS.md)

> **Working style:** Implement one ticket at a time in VS Code with Codex. Run/build/test the feature, review the diff, then commit to Git. Do not ask the coding agent to implement the entire application in a single prompt.

## 1. Build strategy

**Use:** React + Vite (JavaScript/JSX), React Router, Tailwind CSS + shadcn/ui, Supabase (Auth + PostgreSQL + RPC + RLS), ESLint. No separate Node/Express/PHP API for the MVP. Treat SQL migrations as source control artifacts; do not depend on manually clicked database configuration.

**Scope discipline:** Make the **Projects page + its real data flow** work first. Add complex scheduling/revision rules next; then build the expandable dashboard from the same records. Build notifications/AI **after** prototype acceptance, not alongside CRUD.

**Codex workflow:**

1. Give Codex the exact ticket text below and ask it to read all three docs.
2. Ask it to describe its approach and affected files briefly.
3. Let it implement that **single ticket**.
4. Run the app, lint, database migrations and the relevant tests; manually exercise UI.
5. Review the changed files and any schema changes; commit if correct.
6. Note any unresolved business decision in `docs/` rather than inventing a rule.

**Reusable instruction to prepend to every Codex prompt:**

> Read `docs/PROJECT_CONTEXT.md`, `docs/MVP_REQUIREMENTS.md`, and `docs/DEVELOPMENT_TICKETS.md`. Inspect the current code and migrations before changing anything. Implement **only ticket Txx**. Keep JavaScript/React code readable and reusable; protect Tennessee company date semantics, shared editing, independent revisions, worknotes, and RLS. Do not add AI, Slack, Next.js, Express, or unnecessary packages. At the end show files changed, commands/tests run, what is still missing, and manual QA steps.

## 2. Suggested repository structure

```text
barndos-tracker/
├── AGENTS.md
├── docs/
│   ├── PROJECT_CONTEXT.md
│   ├── MVP_REQUIREMENTS.md
│   └── DEVELOPMENT_TICKETS.md
├── src/
│   ├── app/                 # router, shell, shared providers
│   ├── components/
│   │   ├── ui/              # shadcn components
│   │   ├── dashboard/
│   │   ├── projects/
│   │   └── work-items/
│   ├── pages/               # Login, Dashboard, Projects, ProjectDetail, MyWork
│   ├── features/            # project, schedule, revisions, audit service logic
│   ├── lib/                 # supabase client, date helpers, errors
│   ├── hooks/
│   └── tests/
├── supabase/
│   └── migrations/
├── .env.example
└── package.json
```

Use environment variables such as `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or equivalent public anon key supported by the SDK). **Never** use a service-role secret in `VITE_...` variables or any bundled frontend source.

## 3. UI design direction

- **Look:** clean, professional internal tool; neutral backgrounds, clear typography, subtle borders, restrained status colors.
- **Navigation:** side menu (`Dashboard`, `Projects`, `My Work`, optional `Activity/Settings`) and compact top bar with authenticated employee and `Tennessee time (CT)` label.
- **Projects table:** sticky headers on desktop where practical, compact spacing, quick search, advanced filter drawer, archived toggle, clear empty and loading states. Do not recreate the entire original wide spreadsheet on one screen.
- **Project detail:** heading with client/project number and archive control; five collapsible or tabbed workstream sections. Each shows status, assignee, deadline, priority/queue, own revision and BP basis/review where relevant, worknote input and history.
- **Dashboard:** four cards BP/CP/KP/TO with pending, due-today and overdue counts; only one 5-row paginated list expands at a time. Admin sees all; drafter starts with their relevant card and `My Work` filter. Use `All Team / My Work` toggle.
- **Form UX:** searchable assignee dropdown, date picker explicitly labeled Tennessee, select fields for controlled statuses; save/cancel; clear conflict errors identifying the other project; warnings distinct from blocks.
- **Responsive:** cards wrap 2×2 on narrower widths and single column on phones; project table scrolls horizontally or uses a simplified narrow-screen row layout.
- **Audit usability:** a small chronological activity timeline rather than a separate giant report.

## 4. Data design guide (implement through migrations)

### Tables

| Table | Minimum columns / responsibility |
|---|---|
| `profiles` | `id` (Auth UUID), `display_name`, `is_active`, timestamps |
| `user_roles` | `user_id`, `role`, optional `is_default` or profile default view |
| `projects` | `id`, unique `project_no`, `client_name`, `notes`, `archived_at`, `created_at`, `updated_at`, `row_version` |
| `work_items` | `id`, `project_id`, `workstream_type`, `assignee_id`, `required`, `status`, `due_date DATE`, `priority_level`, `queue_position`, `revision`, `bp_reference_revision`, `bp_reviewed_revision`, `bp_review_state`, timestamps/version |
| `revision_history` | immutable event: `id`, `work_item_id`, `revision_label`, `based_on_bp_revision`, `issued_at`, `issued_by`, `notes` |
| `revision_impacts` | `id`, issued BP revision/event ID, target KP/TO work-item ID, review state, impact decision, note, reviewer, timestamps |
| `activity_logs` | `id`, `project_id`, nullable `work_item_id`, `actor_id`, operation, changes (JSONB), optional worknote, timestamp |

### Important constraints

- `projects.project_no` unique; client name intentionally **not unique**.
- Optional unique `(project_id, workstream_type)` if there is exactly one **current** work item per type. Revisions live in revision history, not new duplicate current work items.
- Workstream type and status have controlled values (check constraints or validated enums).
- **No assignee ⇒ no due date:** `CHECK (assignee_id IS NOT NULL OR due_date IS NULL)`.
- Positive `queue_position` if present. For the MVP, a single primary assignee per work item.
- For *active drafting* states, protect non-null `(assignee_id, due_date, queue_position)` with a **partial unique index**. Do not include `For Client Review`, `Done`, `Not Needed` in reserved slots. Verify exact predicate agrees with workflow.
- `revision_history` and `revision_impacts` should reference stable revision-event IDs where possible, rather than relying on mutable revision label strings alone.
- Audit timestamps use `TIMESTAMPTZ`, while drafting `due_date` is a Tennessee calendar `DATE`.
- Do not assume `all_required_done` is persisted; compute from the required work items.
- RLS policies use `auth.uid()` / authenticated identity; server-controlled actor fields should not be blindly trusted from client input.

### Source-of-truth date rule

```sql
-- Company TODAY is Tennessee Central calendar date, not browser-local date:
SELECT (now() AT TIME ZONE 'America/Chicago')::date AS company_today;

-- Drafting overdue (illustrative; adapt statuses/joins to final schema):
SELECT id, project_id, workstream_type, due_date
FROM work_items
WHERE assignee_id IS NOT NULL
  AND due_date < (now() AT TIME ZONE 'America/Chicago')::date
  AND status IN ('Waiting', 'In Progress', 'For Review', 'Revision Requested');
```

**Why `America/Chicago`?** It follows Tennessee's Central Time calendar through CDT and CST automatically. Never compute overdue by comparing an ISO date string to the user's Philippine-local midnight.

### Example scheduling RPC contract

```text
schedule_work_item(
  work_item_id,
  expected_row_version,
  new_assignee_id,
  new_due_date,
  new_queue_position,
  new_priority_level,
  optional_worknote,
  workload_warning_acknowledged
)
```

Implementation should: authorize the actor; validate status and assignee/date rule; check workload warnings; attempt the update atomically; return clear success/conflict/stale-version result; write audit entries. Use a database constraint as the definitive protection against simultaneous queue collisions. Supabase RPC error mapping can translate the SQL conflict to a user-friendly application result.

### Concurrency

Use `row_version` increments or equivalent conditional updates for stale form submissions. Never treat “latest editor wins” as a reason to silently overwrite another person's newer deadline or status. A worknote-only operation should be append-only and should not require changing the assignment.

## 5. Tickets — implement in order

### T01 — Bootstrap frontend and app shell

**Build:** Vite React app, ESLint, Tailwind/shadcn, React Router; sidebar/header/navigation; placeholder pages; `AGENTS.md` referencing these three docs.

**Accept when:** app runs locally, routing works, responsive shell renders, `npm run build` and lint pass.

**Codex prompt:**

> Implement T01 only. Set up or inspect React + Vite JavaScript, React Router, Tailwind and shadcn/ui. Make a simple clean app shell with Dashboard, Projects, My Work and Login route placeholders, responsive sidebar, top bar and Tennessee-time label. Do not connect Supabase yet. Run build/lint and explain how to test.

### T02 — Projects page UI with fictional seed data

**Build:** compact projects table, create-project modal UI, client/project-number search, status chips and project detail skeleton with five workstream sections. Use mock data in one file; keep data access interface replaceable.

**Accept when:** search/filter works in demo, project detail opens, loading/empty states present; no fake persistence claims.

**Codex prompt:**

> Implement T02 only. Create a Projects list and Project Detail UI with fictional mock records, search and status filters, and five independent workstream panels. Use reusable components; do not implement backend writes yet. Include a simple responsive design and build test.

### T03 — Supabase migrations and seed dataset

**Build:** core tables, FKs, status/workstream constraints, unique project number, assignee/date constraint, partial unique queue index, timestamps/row versions, role schema, audited changes design, revision/impact tables. Use migration files and fictional seed data only.

**Accept when:** a clean local/dev Supabase database can apply migrations in order; constraints reject invalid test rows; no exposed secrets.

**Codex prompt:**

> Implement T03 only. Produce versioned Supabase SQL migrations for profiles, user_roles, projects, work_items, revision_history, revision_impacts and activity_logs. Add necessary foreign keys, constraints, Tennessee DATE semantics, active queue-position uniqueness, version fields and fictional seeds. Include a short schema README and SQL validation checks. Do not alter production data.

### T04 — Authentication, employee profiles and baseline RLS

**Build:** Supabase client/env wiring, login/logout, route protection, profile loading and roles used only to select dashboard default; RLS for authenticated staff's shared project CRUD.

**Accept when:** anon cannot read/write project data, authenticated CP staff can edit BP, secret keys not bundled, login persists refresh.

**Codex prompt:**

> Implement T04 only. Add Supabase email/password auth, protected routes, profile/role lookup, and RLS migrations granting authenticated employees shared CRUD of project data. Roles select dashboards, not write permissions. Never expose service-role keys. Test anonymous denial and cross-workstream edits by a non-admin.

### T05 — Real Projects CRUD and archive

**Build:** replace mock data with Supabase queries, create project and initial work items reliably, edit metadata, list/detail, soft-archive and unarchive, toast/error states.

**Accept when:** data persists after refresh, archive hides from active view but keeps history, duplicate project number handled.

**Codex prompt:**

> Implement T05 only. Connect the existing Projects UI to Supabase for create/list/read/update/archive. Initialize applicable Quotation/CP/BP/Kitchen/Takeoffs work items in one atomic server-side operation. Validate unique project numbers, show useful loading/errors, and preserve archived records. Add tests for persistence and duplicate numbers.

### T06 — Workstream editing and flexible assignments

**Build:** editable status, assignee (nullable), required/Not Needed, priority level, own revision and basic notes for each workstream. All employees edit all types.

**Accept when:** BP/CP/KP/TO can have distinct assignees and progress; a worknote can be created without reassignment.

**Codex prompt:**

> Implement T06 only. Add separate editable panels for all five workstreams, searchable assignee selector, workstream status, required/Not Needed, priority and revision. Allow any authenticated employee to update any department; do not restrict by role. Keep worknotes separate from reassignment. Validate and persist changes.

### T07 — Tennessee company-date utilities and deadline behavior

**Build:** canonical `America/Chicago` date calculation at database/service layer; display date-only deadlines as Tennessee dates; no-assignee/no-deadline; client review excluded from drafter overdue.

**Accept when:** PH midnight vs TN current date and DST tests pass, UI and DB show same due/overdue state.

**Codex prompt:**

> Implement T07 only. Add Tennessee `America/Chicago` company-date logic for due today/overdue; store deadlines as PostgreSQL DATE, show CT labels, and enforce no assignee → no deadline. Exclude For Client Review from drafter overdue. Write deterministic tests for Philippine midnight and both CDT/CST periods; never rely on browser-local dates for status.

### T08 — Atomic hard conflicts and workload warnings

**Build:** schedule RPC/transaction; duplicate active queue collision rejected with conflicting project details; same-day workload warning requiring user acknowledgement; manual assignment/deadline adjustment.

**Accept when:** exact collision blocked, same-day different slot warned and allowed, two concurrent requests cannot double-book.

**Codex prompt:**

> Implement T08 only. Provide atomic Supabase/PostgreSQL scheduling validation with a hard unique queue conflict and a separate warning for multiple assignments on the same Tennessee date. Error must identify conflicting project/client, workstream and slot. Use database constraint as last line of defense; test concurrency and confirmable warnings.

### T09 — Worknotes and activity timeline

**Build:** append-only worknotes, action history (status, assignee, deadline, priority, archive, revisions), display timeline, avoid requiring reassignment just to leave a note.

**Accept when:** editor/time/old/new changes recorded; worknote-only save leaves assignee intact.

**Codex prompt:**

> Implement T09 only. Add project/work-item activity history and independent worknotes. Log which authenticated user changed what and when, including assignment, deadline, priority, status, and archive. Provide a compact timeline in Project Detail and test worknotes that do not modify assignees.

### T10 — CP/BP client review and project-finished derivation

**Build:** CP revision loop, BP client review/reopen, no automatic reset of KP/TO, derive `all_required_done`, status filters for awaiting client response.

**Accept when:** BP can be in client review while KP/TO remain unfinished; derived finished indicator recalculates if BP reopens.

**Codex prompt:**

> Implement T10 only. Support CP and BP For Client Review → Revision Requested → new review cycles, with audited transitions. Do not reset independent Kitchen/Takeoffs when BP reopens. Derive project fully-finished state from required work items; show waiting-for-client separately from overdue drafting. Add workflow tests.

### T11 — Independent revisions and BP impact review

**Build:** immutable issued-revision history; own revision and `bp_reference_revision` / `bp_reviewed_revision` / review state for KP/TO; publish BP revision creates review/impact events; reviewer outcomes.

**Accept when:** BP A→B leaves Kitchen K-3 and TO T-2 unchanged; KP may record no change, TO changes required; history preserved.

**Codex prompt:**

> Implement T11 only. Add BP/Kitchen/Takeoffs independent own revisions and BP basis/review tracking. When BP revision is formally issued, append a revision event and create KP/TO review-impact records; do not auto-increment their revisions or change their drafting statuses. Let reviewer record No Changes Needed or Changes Required, BP revision checked, reviewer and notes. Persist data for future notifications but send none.

### T12 — Expanded Projects filters and pagination

**Build:** server-side search/pagination (not only filtering the first loaded page), workstream, status, assignee, priority, due-date range, unassigned, needs BP review, archived.

**Accept when:** combined filters and counts are correct, archived excluded by default, links navigate to detail.

**Codex prompt:**

> Implement T12 only. Add robust Projects search, server-side pagination and combined filters by client/number, workstream, status, assignee, priority, Tennessee date range, unassigned, BP Needs Review and archived state. Ensure totals reflect full matches, not only the current page. Test filter combinations and empty states.

### T13 — Dashboard summary endpoint/service

**Build:** aggregate counts per CP/BP/KP/TO for unfinished, due today, overdue using Tennessee date and OLA rules; paginated list query by workstream/team/my-work.

**Accept when:** count independent of page size; awaiting client excluded from overdue; different assignees filter correctly.

**Codex prompt:**

> Implement T13 only. Build Supabase queries or RPC for four workstream cards: pending, due-today, overdue counts plus paginated 5-row lists. All date math in America/Chicago, no browser-local overdue. Support all-team/my-work, assigned names, relevant status, and accurate full totals. Write query tests.

### T14 — Four-card expandable Dashboard UI

**Build:** clickable cards, one expanded mini-list at a time, pagination, four required fields, role-based default view, All Team/My Work; project detail links.

**Accept when:** selecting BP shows only BP mini-list; selecting KP replaces it; clicking active card collapses; mobile works.

**Codex prompt:**

> Implement T14 only. Connect four summary cards (BP, CP, KP, Takeoffs) to the dashboard data service. Show counts and expand only one five-row paginated mini-table at a time with client/project, Tennessee due date, assignee and status. Support All Team/My Work, role-specific default selection, loading/empty states, responsive layout and project links.

### T15 — Concurrency and error-hardening

**Build:** optimistic version checking on important edits, consistent validation/error messages, confirmation dialogs, empty/loading/error states; audit correctness.

**Accept when:** stale form cannot overwrite newer data, users can recover by reload, clear form feedback for conflict and network errors.

**Codex prompt:**

> Implement T15 only. Review edits for stale-version overwrites; add row_version checks or equivalent. Show a clear conflict/refresh prompt when a record changed. Harden validation, loading, error and archive confirmation states. Test two editing sessions and concurrent queue updates.

### T16 — Client demo readiness and deployment checklist

**Build:** reliable fictional demo seed, test scripts, accessibility/responsiveness pass, production environment checklist/documentation. Do not buy or deploy production services without approval.

**Accept when:** full demo workflow in MVP_REQUIREMENTS.md succeeds with persistent sample data, lint/build/tests green, client can provide feedback.

**Codex prompt:**

> Implement T16 only. Prepare a repeatable fictional demo dataset, written demo script and focused tests for login, CRUD, workflow, CT deadlines, priority conflicts, revision impacts, dashboard and audit history. Run lint/build/test and document failures. Create a post-approval production checklist (RLS, hosting, backups, access, real-data migration) without deploying yet.

## 6. Optional future tickets — **DO NOT IMPLEMENT YET**

### F01 — In-app/Slack notification delivery

**Trigger:** BP revision impact marked `Needs Review` or `Changes Required` for Kitchen/Takeoffs. Notify the *current* assignee of each affected workstream; include client/project, issued BP revision, impact/worknote, author and direct link. Do not notify unrelated workstreams. If unassigned, surface a visible unassigned review item instead. Design idempotent event keys, retries, timestamps and delivery status; avoid duplicate messages after edits or retries. Additional triggers: worknotes, reassignment, deadline changes and Tennessee-time daily reminders.

**Data readiness in MVP:** `revision_impacts` + `activity_logs` records exist and can later be consumed by an outbox/event worker. MVP does not actually send notifications.

### F02 — AI-assisted project summary

From authorized project/activity data, generate concise project summaries or revision highlights with human confirmation. Protect private client data; evaluate API costs separately (ChatGPT Plus does not include production AI API calls).

### F03 — AI-assisted quotation/email intake

Analyze incoming client messages, suggest project fields and revision notes for **human review**. Never silently modify schedules or issue drawings based on AI inference.

### F04 — Advanced scheduling analytics

Estimated work-hours, drafter capacity, leaves, priority suggestions, resource balancing and stronger overload checks. Not required for the MVP hard conflict rule.

### F05 — Existing spreadsheet migration / file attachments

Import historic spreadsheet rows and eventually attach drawing links/files. Plan data mapping and storage limits separately.

## 7. Testing checklist before showing the client

- [ ] Login protects data; non-admin has cross-department editing access.
- [ ] Create/edit/archive project and persist after refresh.
- [ ] CP review/revision loop works and BP/TO/KP can run concurrently.
- [ ] BP can be sent for client review while KP/TO remain unfinished.
- [ ] Company date is correct even after PH midnight; DST handled.
- [ ] For Client Review does not count as overdue drafter work.
- [ ] Unassigned items have null due dates; reassignment can update schedule.
- [ ] Exact queue collision rejected and identifies conflicting project.
- [ ] Workload warning is displayed but can be acknowledged.
- [ ] BP Revision B leaves KP/TO own revisions untouched; impact review recorded.
- [ ] Worknotes and actor history work without reassignment.
- [ ] Dashboard card selection, counts, five-row pagination and filters work.
- [ ] Archived projects can be found via archive filter.
- [ ] Two browser sessions cannot silently overwrite newer edits.
- [ ] `npm run build`, ESLint and applicable database/test checks pass.

## 8. Suggested Git checkpoints

```text
chore: scaffold react app shell
feat: add mock projects screens
feat: create supabase schema and auth
feat: implement project and workstream crud
feat: apply tennessee deadline and scheduling rules
feat: add worknotes, revisions and BP impact review
feat: implement projects filters and dashboard
fix: harden concurrency and demo flows
```

## 9. If you hand off work to another AI

Paste the three docs into the repo's `docs/` folder and open the folder in VS Code. Ask the AI to **inspect actual code and list completed ticket IDs before writing code**. This project brief documents plans, not proof that a ticket has been implemented. Keep the unresolved PM confirmations visible rather than pretending they are settled.
