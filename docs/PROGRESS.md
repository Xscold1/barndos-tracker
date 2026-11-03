## Requested UI revisions — 2026-11-03

Implemented; awaiting user verification. Only these revisions were made; T15 and T16 have not started.

- Admin/PM navigation shows Dashboard and Projects only, on desktop/mobile. Direct /my-work visits redirect to Dashboard. Admin dashboards use All Team and omit My Work, including accounts with multiple roles. Stale project-return state does not show Back to My Work for admins. Shared editing permissions remain unchanged.
- Added an accessible theme toggle beside the user's name, with saved browser preference and dark design tokens across the app. Initial theme follows system preference when no choice is saved; explicit choices persist on reload.
- Activity and worknotes entries scroll after 32rem, with keyboard focus and long-content wrapping. Heading and actions stay outside the scroll area.

Files: App.jsx, AppShell.jsx, DashboardPage.jsx, ProjectDetailPage.jsx, dashboardPreference.js, dashboardView.js, ActivityTimeline.jsx, index.css, main.jsx, auth.test.js, dashboard-view.test.js; added ThemeToggle.jsx.

Verification: lint/build passed (existing bundle-size warning). All 70 tests excluding the pre-existing csv-migration.test.js passed. Full npm test still fails because that file imports missing scripts/migrate-project-list.mjs; unrelated CSV work was left unchanged. Browser verification remains pending: admin/drafter navigation, direct My Work URLs, theme toggle/reload, and long activity scrolling with keyboard/mouse. No database or deployment changes.

# Development progress

## Requested CSV migration (F05)

Added `scripts/migrate-project-list.mjs`, example configuration, three regression tests and `docs/CSV_MIGRATION.md`. The generator preserves legacy metadata and uses existing application RPC signatures in one transaction. It blocks missing/duplicate identifiers, ambiguous statuses and unresolved employee UUIDs.

Verification: 72 tests, lint and build passed (existing bundle-size warning remains). Validation of the actual 41-record CSV correctly blocked SQL generation; private review report: `node_modules/project-list-import.sql.review.json`. No database writes occurred. The documented supabase migrations are absent, so schema/RPC validation and SQL rehearsal remain pending. Identifier/status decisions and verified employee mappings are required. User verification remains pending. Existing DashboardPage.jsx trailing whitespace was reported by diff-check; that user edit was left intact. T15 was not started.

## Current ticket: T14a — Dedicated My Work page

**Status:** Implemented; local checks passed. Planned and built on explicit request. Awaiting live development-Supabase/user verification before marking complete. T15 remains out of scope.

### Implemented

- Recorded T14a's plan/acceptance criteria in DEVELOPMENT_TICKETS.md. Replaced `/my-work` placeholder with a protected combined own-assignment view across all five streams, including Quotation.
- Read-only, session-derived `list_my_work` RPC with full own-work overview, same-item search/workstream/status/priority/CT deadline filters and bounded 10/20/50-row UI pagination. No caller employee/date override, role restrictions or new write paths.
- Default unfinished work on active projects, explicit all/Done/Not Needed choices, assigned undated work, client-review pending/OLA distinction, priority/queue display and server-calculated deadline states. Existing completion/revision/editing policies remain intact.
- Reusable desktop table/mobile record list and filters; URL state/reset/clamping; project links and validated Back to My Work destinations. Existing project editing/worknotes remain available.
- Debounced/cancellable reads and late-response protection; visible-minute/focus/visibility server refresh; loading/empty/initial error/retry plus last-verified counts/date and warning after background failure.

### Verification

- All fourteen migrations and fictional seeds applied to fresh isolated native PostgreSQL 18.6 with Auth stubs. All twelve rollback SQL suites passed, including prior schema/auth/CRUD/date/scheduling/activity/workflow/revision/search/dashboard checks.
- New SQL suite: 13 fictional projects, 24 pending own assignments, all five streams, multiple own rows per project, independent teammate assignments, complete pagination/page sizes, literal search, combined filters, statuses, undated/client-review/archive/unassigned/empty cases, caller-ID rejection, access denial and unchanged business/audit snapshots.
- Nine deterministic company-clock cases passed for Philippine midnight, Tennessee midnight in CDT/CST and both DST transitions. Clock override exists only inside the test rollback transaction.
- 69 Node tests, lint and build passed. Existing nonblocking main-bundle warning: 629.00 kB.
- My Work browser suite passed full counts/paging/filter combinations, Quotation and cross-role work, priority/queue, CT refresh/timezones, empty/error/missing-migration/retry, stale responses, project/back/refresh restoration, clamping, different employees and signed-out denial. 375/768/1440px checks passed; desktop/mobile screenshots inspected. Existing T14 Dashboard browser regression also passed. No runtime exceptions in the passing runs.
- Browser fixtures used the actual auth provider/UI/service factories with fictional transports and blocked external requests. Live Supabase Auth/PostgREST/user acceptance remain pending.

### Files changed for T14a

- Added: `supabase/migrations/20261102001400_my_work.sql`, `supabase/tests/validate_my_work.sql`.
- Added: `src/features/my-work/{myWorkQuery,createMyWorkService,myWorkService,useMyWorkData}.js` and `src/tests/my-work.test.js`.
- Added: `src/pages/MyWorkPage.jsx`, `src/components/my-work/MyWorkFilters.jsx`, `MyWorkList.jsx`.
- Updated: `src/App.jsx`, `src/app/navigation.js`, `src/pages/ProjectDetailPage.jsx`, DEVELOPMENT_TICKETS.md, root/database READMEs and this progress log. Prior T13/T14 work and user edits were preserved.

### Remaining issues / scope

- Apply migration 014 after 001–013 in development and follow the README T14a manual checks with real employee accounts. No configured remote or production database was accessed.
- Existing `.gitignore` still excludes the entire `supabase/` directory; migrations/tests/database README exist locally but are omitted from normal commits. Ignore settings and environment files were preserved.
- Current own-assignment pages exclude archived projects; use Projects to inspect archives or find unassigned/team work. Concurrent edits can move offset-page rows; reload obtains current totals/order.
- No new dependencies, notifications, deployment or production changes. T15 has not started. Temporary browser/native fixtures remain ignored under `node_modules/.cache/`.

## Previous ticket: T14 — Four-card expandable Dashboard UI

**Status:** Implemented; local checks passed. Awaiting live development-Supabase/user verification before marking complete.

### Implemented

- Four BP/CP/KP/Takeoffs summary buttons with full pending/due-today/overdue totals from T13; one expanded list, switch/collapse behavior and native keyboard/expanded-state semantics.
- Five-row server pagination, project/client detail links, Tennessee deadline/server OLA badges, assignee names and statuses. Desktop table, readable stacked records on smaller screens, and four/two/one summary columns.
- PM/no-role defaults to collapsed All Team; each drafter's preferred card opens in My Work. Everyone can select any scope/workstream. Pending/due-today/overdue/Needs assignment filters retain authoritative card totals, with useful unassigned/empty guidance.
- URL scope/card/filter and independent page per card; filter/scope reset, retained collapse, refresh/browser-Back restoration and server-clamped URL correction.
- Cancellable reads with late-response protection; initial loading/error/retry without invented zeros; whole-response server refresh every visible minute/on focus/visibility, preserving last verified counts/date with warning/retry after background failure.
- Reused existing cards/buttons/status/deadline formatting. No backend/schema, dependencies, environment or production changes in T14. The separate My Work placeholder was subsequently implemented in T14a above; Dashboard's My Work toggle remains available.

### Verification

- `npm.cmd test`: all 61 tests passed, including four new view-state tests for role defaults, URL validation, independent pages, collapse, scope/filter reset and page correction.
- `npm.cmd run lint` and `npm.cmd run build` passed. Existing nonblocking main-bundle warning: 614.54 kB.
- Browser fixtures passed PM/all four drafter defaults, four full totals, one-card expansion/switch/collapse, five-row independent paging, scope/filter combinations, unassigned/empty records, client-review exclusion, CT date/focus/minute refresh and failed-refresh recovery.
- Browser fixtures passed initial error/retry, aborted/late response protection, project links/browser Back/reload, out-of-range clamping and native Enter/Space. 375/768/1440px layouts passed with no page overflow; desktop/mobile screenshots inspected. No runtime exceptions in the passing run.
- Browser runs used the real auth provider/service factories/UI with fictional transport doubles and blocked external requests. Live Supabase Auth/PostgREST and user acceptance remain pending.

### Files changed for T14

- Added: `src/components/dashboard/DashboardSummaryCard.jsx`, `DashboardWorkList.jsx`.
- Added: `src/features/dashboard/dashboardView.js`, `useDashboardData.js`, `src/tests/dashboard-view.test.js`.
- Updated: `src/pages/DashboardPage.jsx`, root README and this progress log. T13 service/migration files were preserved. Browser fixtures/screenshots remain ignored under `node_modules/.cache/`.

### Remaining issues / scope

- Development Supabase must include migration 013. Follow the README T14 manual checks with real development employee accounts before acceptance.
- Existing `.gitignore` still ignores `supabase/`, including T13/prior migrations and SQL tests. These locally present files will be omitted from a normal Git commit; ignore settings were preserved.
- Offset pages may move when teammates edit data; Reload refreshes ordering/totals. Background warnings identify the last verified response rather than guessing company time.
- T15 has not started. No deployment or remote/production data changes.

## Previous ticket: T13 — Dashboard summary endpoint/service

**Status:** Implemented; local checks passed. Awaiting live development-Supabase/user verification before marking complete.

### Implemented

- Read-only, employee-only `dashboard_summary` RPC returns all four BP/CP/Kitchen/Takeoffs totals and an optional five-row list from one SQL snapshot. Full totals remain independent of pagination/list filter; no PostgREST row-cap aggregation loss.
- All Team and session-derived My Work respect each work item's own assignee. Pending includes client-review/unassigned/undated items; Done, Not Needed, Quotation and archived projects are excluded. Existing Tennessee company-date/OLA helpers exclude client review from drafting due-today/overdue.
- Assigned names, project/client, CT date, relevant status, priority/queue and server deadline states; nearest-date ordering, deterministic ties, empty/clamped pages, and pending/due-today/overdue/needs-assignment list filters.
- Reusable JavaScript service with explicit argument allowlist, cancellation, response validation and safe errors. No caller-supplied employee/date, browser-clock arithmetic, write grants or role restrictions. Dashboard UI remains the T14 placeholder.

### Verification

- All thirteen migrations and fictional seeds applied to a fresh isolated native PostgreSQL 18.6 database with Auth stubs. All eleven rollback SQL suites passed, including existing schema/auth/CRUD/date/scheduling/activity/workflow/revision/search checks.
- New dashboard suite: 14 rollback fixtures, exact full counts, three pages without duplicates/loss, same-project independent assignees, internal/client review exclusions, names, unassigned/undated work, archive/closed filters, empty/clamped pages, access denial and unchanged business/audit snapshots.
- Nine deterministic dashboard clock cases passed for Philippine midnight, Tennessee midnight in CDT/CST and both DST transitions. A transaction-only test clock replacement and all fixtures roll back; production accepts no clock override.
- `npm.cmd test`: 57 passed. Lint/build passed. Existing nonblocking main bundle warning: 600.28 kB. This ticket changes the data layer only; live Auth/PostgREST and UI acceptance remain pending.

### Files changed for T13

- Added: `supabase/migrations/20261102001300_dashboard_summary.sql`, `supabase/tests/validate_dashboard.sql`.
- Added: `src/features/dashboard/createDashboardService.js`, `dashboardService.js`, `src/tests/dashboard.test.js`.
- Updated: root/database READMEs and this log, including API contract and authenticated development-browser test steps.

### Remaining issues / scope

- Apply pending migrations through 013 in development and verify real session/RPC responses using the README steps. No configured remote or production database was accessed.
- Dashboard cards, expansion, role defaults and pagination controls were subsequently requested in T14 and are recorded above. Concurrent edits may move rows between offset-page reads.
- Existing `.gitignore` ignores the whole `supabase` directory, including prior/new migrations, SQL tests and the database README. These files exist locally but will be omitted from a normal Git commit; ignore settings were preserved.
- No dependencies or environment values changed. Temporary native test files remain ignored under `node_modules/.cache/`.

## Previous ticket: T12 — Expanded Projects filters and pagination

**Status:** Implemented; local checks passed. Explicitly requested after checking T11. Awaiting live development-Supabase/user verification before marking complete.

### Implemented

- Full-dataset server search with authoritative totals, stable updated-time/ID ordering, bounded pages and 10/20/50-page UI. Removed runtime full-list batching/local filtering.
- Combined literal client/number search, workstream/status/employee/priority, inclusive Tennessee dates, unassigned, Needs BP Review, workflow and archive/all views. Work-item conditions match one child; returned projects retain all five workstreams.
- Reusable advanced controls with inactive employee options, URL filters/page/size and detail/back preservation, reset-on-filter-change, out-of-range page/URL correction, 250 ms debounce and cancelled/stale-query protection. Existing CT company-date refresh remains intact.
- Validation, loading/empty/error/retry and responsive paging. Search adds no write grants or role restrictions. Assignment editors retain active-only employees.

### Verification

- All twelve migrations/seeds applied to a new isolated native PostgreSQL 18.6 database with Auth stubs. Ten rollback SQL suites passed, including earlier schema/auth/CRUD/date/scheduling/activity/workflow/revision checks.
- New SQL suite used 25 rollback-only projects to prove full counts, complete page traversal, later-record search, full nested children, same-child intersections, CT ranges, review/unassigned/archive filters, literal wildcard search, clamped pages and access denial.
- 51 Node tests, lint/build and whitespace/diff checks scoped to T12 files passed. Existing nonblocking main-bundle warning remains (600.28 kB). Unrelated user edits, including `.gitignore`, were preserved.
- Browser fixtures passed full totals/pages/page size, search beyond page one, filter combinations, inactive employee options, empty/date/error states, archive/all views, stale-result protection, URL detail/back, out-of-range URL correction, retry and 375px layout. No runtime exceptions in the passing run. Fixtures do not verify live Auth/PostgREST.

### Files changed for T12

- Added: `supabase/migrations/20261102001200_project_search.sql`, `supabase/tests/validate_project_search.sql`, `src/tests/project-search.test.js`.
- Added: `src/features/projects/projectQuery.js`, `src/components/projects/ProjectFilters.jsx`.
- Updated: `src/features/projects/createProjectService.js`, `useProjectData.js`, `src/pages/ProjectsPage.jsx`, `src/tests/projects.test.js`.
- Updated: `src/features/work-items/createWorkItemService.js`, `useEmployees.js` for read-only inactive-employee filtering; active-only assignment defaults remain.
- Updated: root/database READMEs and this log. Temporary browser/native fixtures remain ignored under `node_modules/.cache/`.

### Remaining issues / scope

- Apply pending migrations through 012 in development and follow README T11/T12 checks. Live RPC response shapes, permissions and persistence remain to be verified; no environment-configured remote writes occurred.
- Offset pages reflect current data; concurrent edits can change ordering between reads. Reload refreshes totals and ordering.
- Environment files, user edits and dependencies were preserved; production data was untouched. T13 was subsequently requested and is recorded above.

## Previous ticket: T11 — Independent revisions and BP impact review

**Status:** Implemented; local checks passed. User requested a status check and continuation to T12. Live development-Supabase verification is still pending before marking complete.

### Implemented and verified

- Explicit issued-revision actions/history for BP/Kitchen/Takeoffs; own labels and issued BP basis remain independent. BP issues create both dependent review records/flags without resetting their drafting/status/assignment/revision/basis.
- Version-checked decisions with reviewer/time/notes, current-vs-historical BP protection, scoped basis, immutable issued history, server actor attribution, direct-summary protection and transactional audit. No notifications sent.
- All eleven migrations/seeds applied to a fresh native PostgreSQL 18.6 DB with Auth stubs. Nine rollback suites passed, including independent A→B/K-3/T-2, T-3 basis, current/historical review, duplicate/stale/access/forgery checks and injected-failure rollback.
- New-connection committed revision/review persistence and existing two-session scheduling concurrency regression passed in disposable databases only.
- 48 Node tests, lint and build passed. Browser fixtures passed issue/review outcomes, failures/retries, stale review, history/current flags, refresh persistence and 375px/Escape. No runtime exceptions in the passing run. Existing bundle warning: 596.23 kB.
- New files: migration `20261102001100_revision_operations.sql`; SQL `validate_revisions.sql`, `revision_persistence_write.sql`, `revision_persistence_read.sql`; `src/features/revisions/{createRevisionService,revisionService,useRevisionData}.js`; `src/components/work-items/{RevisionDialog,RevisionWorkflow}.jsx`; `src/tests/revisions.test.js`.
- Updated: `WorkstreamPanel.jsx`, `ProjectDetailPage.jsx`, `activityModel.js`, root/database READMEs and this progress log. Environment files/user edits preserved; no packages added or production/remote database changes. Temporary test fixtures remain ignored in `node_modules/.cache/`.
- Before live acceptance: apply migration 011 after 001–010 and follow README T11 steps. Actual issuing/sign-off criteria remain a PM operational decision; the explicit confirmation records an issued deliverable. T12 is now authorized; T13+ remain untouched.

## Previous ticket: T10 — CP/BP client review and project-finished derivation

**Status:** Implemented; local checks passed. Awaiting development-Supabase/user verification before marking complete.

### Implemented

- CP/BP review shortcuts open the ordinary editor with the chosen next status: send for client review, request revision, resume drafting, mark done and reopen for revision. Status choices remain flexible; changes are version checked and saved explicitly.
- CP/BP returning from client review to active drafting requires a reason. Existing Done/Not Needed reopening reasons remain. Shared JavaScript/SQL rules, the common scheduler and a direct-table transition guard prevent bypassing the audited reason requirement; roles still do not restrict editing.
- Review/revision cycles record old/new status, actor, time and reason using the existing timeline. Returning to drafting restores CT deadline classification and rechecks queue collisions/workload warnings. Kitchen/Takeoffs rows, revisions, BP basis/review and issued/impact history remain independent.
- List/detail now derive all-required-done and required/done/open/client-waiting/scope counts from the fetched work-item snapshot. No completion field is stored or submitted. Reopening required BP removes the completed indicator on the refreshed read.
- All five workstreams, known scope and at least one required workstream are needed before claiming all required work done. Not Needed and explicit optional scope do not block required completion. Unknown Quotation scope shows Scope to confirm once known required work is done; empty required scope shows No required work. No open Quotation/sign-off policy was silently decided.
- Awaiting-client indicators remain separate from drafting overdue. Workflow filters combine awaiting-client, required-open, all-required-done and unconfirmed-scope views with search/status/archive selection and preserve URL filters through detail/back navigation.
- Existing user edits, environment files and dependencies were preserved. No remote schema/data or production changes. T11 has not started.

### Verification

- All ten migrations and fictional seeds applied successfully to a fresh isolated native PostgreSQL 18.6 database with Auth stubs.
- Eight rollback SQL suites passed: 68 schema checks, auth, projects, workstreams, 26 deterministic CT date checks, scheduling, activity and new workflow checks.
- Workflow SQL passed three CP review cycles, BP client review/reopening, independent full KP/TO row snapshots and revision/impact counts, reason/actor/old/new audit, direct/legacy reason enforcement with no partial writes, required-completion/reopening behavior, resumed drafting overdue, occupied-slot conflicts, confirmable workload and stale saves.
- Existing committed note/history persistence and a fresh read by another employee passed under migration 010. The two-session RPC/index collision and workload-acknowledgement persistence regression passed; only disposable local fictional records were committed.
- Browser transport fixtures passed CP/BP shortcuts/cycles, required note validation, client-review overdue exclusions, unchanged KP/TO rows/revisions, derived complete/reopen/unconfirmed-scope states, refresh persistence without a stored workflow flag, audit reasons, combined workflow/search/status filters, URL/back preservation and 375px/Escape behavior. Mobile summary inspected; no runtime exceptions in the passing run. These fixtures do not verify live Supabase Auth/PostgREST.
- `npm.cmd test`: 43 tests passed. `npm.cmd run lint`, `npm.cmd run build`, `git diff --check` and new-source whitespace checks passed. Existing nonblocking main-bundle warning remains (585.68 kB).

### Files changed for T10

- Added: `supabase/migrations/20261102001000_review_workflow.sql`, `supabase/tests/validate_workflow.sql`, `src/tests/workflow.test.js`.
- Added: `src/features/work-items/workflowModel.js`, `src/components/work-items/ClientReviewActions.jsx`, `src/components/projects/ProjectWorkflowSummary.jsx`.
- Updated models/services: `src/features/projects/projectModel.js`, `createProjectService.js`, `src/features/work-items/createWorkItemService.js`.
- Updated UI: `src/components/projects/WorkstreamPanel.jsx`, `ProjectsTable.jsx`, `src/components/work-items/WorkstreamEditDialog.jsx`, `src/pages/ProjectDetailPage.jsx`, `ProjectsPage.jsx`.
- Updated regression fixture: `supabase/tests/validate_work_items.sql` now provides the T10-required return-to-drafting reason before its collision assertion.
- Updated docs: `README.md`, `supabase/README.md`, `docs/PROGRESS.md`. Browser fixtures/screenshots and native test databases remain ignored under `node_modules/.cache/`.

### Remaining issues / scope

- Apply migration 010 after 001–009 to development Supabase and run the root README's T10 checks. Live RPC responses, permissions and persistence remain to be verified; no environment-configured remote writes were made.
- Quotation's company-wide required policy and the precise Done/sign-off meaning for Kitchen/Takeoffs remain PM decisions. The UI follows explicitly saved scope/status and preserves unconfirmed states.
- Completion is read-derived from the current fetched records; teammates' edits appear on reload, consistent with the existing non-realtime data flow.
- Formal revision issuing/BP impact review remains T11. Expanded server-side project filters/pagination and dashboard work remain T12–T14. T11 has not started; earlier statuses below remain historical records.

## Previous ticket: T09 — Worknotes and activity timeline

**Status:** Implemented; local checks passed. Awaiting development-Supabase/user verification before marking complete.

### Implemented

- Compact Project Detail timeline with project/workstream scope, authenticated editor, Tennessee timestamps, readable old/new business values and independent worknotes. Employee IDs resolve to current names; DATE deadlines retain their calendar values. Working revision edits remain distinct from issued revisions.
- Newest-first server pagination (20 displayed per page) using the precise timestamp and UUID cursor, with load-older, refresh, loading/empty/error/retry states. Older-page failures preserve loaded entries; cancelled/stale requests cannot populate another project.
- Project-wide worknotes plus existing workstream notes, sharing the note dialog. A saved note refreshes activity without reloading business records. Both note RPCs are append-only, server-authored and preserve full parent/child rows, including assignees, schedules, revisions and row versions.
- Fallback server audit for direct authenticated project/workstream inserts and business updates, including assignment, deadline, queue, priority, status, own revision, remarks and archive fields. Existing trusted definer RPCs retain one richer audit event without duplication. Stable direct-write record/workstream identities preserve historical scope.
- Recognized business fields and escaped multiline text render without raw JSON or acknowledgement hashes. No historical events are invented/backfilled. Names resolve from current profiles; stored UUIDs remain authoritative.
- No new dependencies, environment changes, remote schema/data changes or production access. Revision issuing/BP impact review remains T11; T10 has not started.

### Verification

- All nine migrations and fictional seeds applied to a fresh isolated native PostgreSQL 18.6 database with Auth stubs.
- Seven rollback SQL suites passed: 68 schema checks, auth, projects, workstreams, 26 deterministic CT date checks, scheduling and new activity validation.
- Activity SQL passed direct create/update/archive audit, old/new values/names, stable identity, metadata-only exclusion, no duplicate RPC events, colleague-authored independent notes, full-row preservation, input validation, append-only/forged-audit protections, access denial and lossless keyset reads across equal timestamps.
- Fictional project/workstream notes and history committed only in disposable local test databases. Another employee in a new connection verified four events and preserved assignee/deadline/queue/revision/version. T08's concurrent RPC/index reservation and acknowledgement persistence regression also passed under T09.
- Headless Chrome transport fixtures passed scoped author/CT display, old/new values, 20→30 event paging without duplicates, older-page retry retaining entries, initial retry/empty states, failed note retention, independent project/workstream notes, literal HTML displayed as text, refresh persistence, revision edit/archive/restore history, stale-request isolation and 375px/Escape behavior. Mobile timeline inspected; no runtime exceptions in the passing run. Live Supabase Auth/PostgREST is not verified by fixtures.
- Final `npm.cmd test`: 35 tests passed. `npm.cmd run lint`, `npm.cmd run build`, `git diff --check` and whitespace checks on new source/SQL passed; the existing nonblocking main-bundle warning remains (580.42 kB).

### Files changed for T09

- Added migration: `supabase/migrations/20261102000900_activity_timeline.sql`.
- Added SQL checks: `supabase/tests/validate_activity.sql`, `activity_persistence_write.sql`, `activity_persistence_read.sql`.
- Added activity service/model/hook: `src/features/activity/createActivityService.js`, `activityService.js`, `activityModel.js`, `useActivity.js`.
- Added timeline/tests: `src/components/projects/ActivityTimeline.jsx`, `src/tests/activity.test.js`.
- Updated: `src/pages/ProjectDetailPage.jsx`, `src/components/work-items/WorknoteDialog.jsx`, `README.md`, `supabase/README.md`, `docs/PROGRESS.md`.
- Temporary browser fixtures/screenshots and native databases remain ignored under `node_modules/.cache/`. Existing user edits and environment files were preserved.

### Remaining issues / scope

- Apply migration 009 after 001–008 to development Supabase and perform the root README's T09 checks. Live Auth/PostgREST RPC results, permissions and persistence still need verification; no environment-configured remote writes were performed.
- Trusted owner/definer maintenance must explicitly log its own changes; fallback audit targets direct authenticated employee writes. Future trusted mutation RPCs must retain that explicit logging contract. Existing history is displayed as stored; pre-T09 unaudited changes are not reconstructed.
- Timeline uses manual refresh rather than realtime subscriptions. Actor IDs are stable; displayed names reflect current profiles.
- Full review/completion workflow (T10) and issued revisions/BP impact review (T11) remain separate tickets. T10 has not started; earlier statuses below are historical records.

## Previous ticket: T08 — Atomic hard conflicts and workload warnings

**Status:** Implemented; local checks passed. Awaiting development-Supabase/user verification before marking complete.

### Implemented

- Optional positive queue-position editor in every workstream, enabled for an assigned employee with a Tennessee DATE deadline. Priority labels remain independent and duplicates are allowed.
- Atomic `schedule_work_item` RPC with active membership, version checks, transaction scheduling lock, parent-before-child locks and the existing partial unique index. Exact slot conflicts identify the project/client, workstream, employee, date and slot and cannot be acknowledged away.
- Separate same-day workload warning showing other active assignments and count, including archived active reservations. No partial business/audit writes occur on a warning. Explicit checkbox confirmation and a current server snapshot token are required to save.
- Changed workloads require review again; changing the proposed status/employee/date/queue clears form acknowledgement. Null queues still warn for same-day workload. Unchanged-schedule metadata edits and independent notes do not repeat scheduling confirmation.
- Client review/Done/Not Needed do not reserve slots or count as drafting workload. Reopening revalidates conflicts/warnings. Own revisions and BP dependencies remain independent.
- Scheduling old/new values, acknowledgement snapshot, authenticated actor and optional change note are logged transactionally. A mandatory note remains a PM decision; the implemented confirmation requires a checkbox and keeps the note optional.
- Existing mutation signatures forward to the shared scheduler. Older signatures cannot acknowledge new workload warnings, so affected callers must use the new RPC. No packages added, environment values changed or remote/production data accessed.

### Verification

- All eight migrations and fictional seed applied to a fresh isolated native PostgreSQL 18.6 database with Auth stubs.
- Six rollback SQL suites passed: 68 schema checks, auth, projects, workstreams, 26 deterministic Tennessee-date checks and the new scheduling suite. The T07 legacy deadline fixture now uses an otherwise free date to isolate date behavior from T08 warnings.
- Scheduling SQL passed exact-conflict details/precedence, warning rollback, explicit/current acknowledgement, changed snapshots, null queues, different dates/employees, duplicate High labels, excluded states/reopening, independent revisions, audit, stale/invalid saves and access denial.
- Opt-in two-session concurrency script passed both RPC and direct-table collision races with one winner per slot. It also checked confirmable different-slot workload and committed persistence/acknowledgement audit through a new connection. Only uniquely named fictional records in disposable local databases were committed.
- Headless Chrome fixture checks passed hard-conflict messages, unchanged saved data on warnings, disabled/unacknowledged confirmation, changed-workload re-review, draft acknowledgement reset, saved position persistence after refresh, metadata edits without repeat warnings, null queue warning/cancel, client-review exclusion/reopening and mobile/Escape. The 375px warning layout was visually inspected; no runtime exceptions in the passing run. Browser fixtures do not verify live Supabase Auth/PostgREST.
- `npm.cmd test`: 29 tests passed. `npm.cmd run lint`, `npm.cmd run build`, `node --check` on the concurrency script and `git diff --check` passed; the existing nonblocking chunk warning remains (572.45 kB main bundle). Repeating the concurrency script passed without resetting or overwriting its previous fixtures.

### Files changed for T08

- Added: `supabase/migrations/20261102000800_scheduling.sql`.
- Added: `supabase/tests/validate_scheduling.sql`, `supabase/tests/validate_scheduling_concurrency.mjs`, `src/tests/scheduling.test.js`.
- Added: `src/components/work-items/WorkloadWarning.jsx`.
- Updated: `src/features/work-items/createWorkItemService.js`, `src/components/work-items/WorkstreamEditDialog.jsx`, `src/tests/work-items.test.js`, `supabase/tests/validate_deadlines.sql`.
- Updated: `README.md`, `supabase/README.md`, `docs/PROGRESS.md`. Local browser fixtures/screenshots and native databases remain ignored under `node_modules/.cache/`.

### Remaining issues / scope

- Apply migration 008 after 001–007 in development Supabase and follow the root README's T08 checks. Live Auth/PostgREST responses, warning details and persistence still need verification; no environment-configured remote writes were performed.
- Warning acknowledgement currently uses a checkbox and optional note. Confirm with the PM before making coordination notes mandatory.
- The scheduling RPC serializes short workstream writes for this small-team prototype. Hard uniqueness remains enforced for every writer; T04 direct-table grants remain and the acknowledgement protocol applies to application RPCs.
- General audit/timeline (T09), review/completion workflow (T10) and issued revisions/BP impact review (T11) remain separate tickets. T09 has not started. Earlier statuses below remain historical records.

## Previous ticket: T07 — Tennessee company-date utilities and deadline behavior

**Status:** Implemented; local checks passed. Awaiting development-Supabase/user verification before marking complete.

### Implemented

- Canonical authenticated `company_today()` RPC from database `now()` using `America/Chicago`, plus deterministic private SQL date/classification helpers. No client-clock argument or browser-local overdue calculation.
- Calendar-only deadline editing and storage as PostgreSQL DATE. Unassigned work cannot have a deadline; assigned work may be undated. Removing queued deadlines and unassigning scheduled work require explicit confirmation.
- Service-derived due-today/overdue/upcoming indicators on independent workstreams and the Projects list's next active drafting deadline. For Client Review shows Awaiting client and is excluded from drafting due/overdue; Done/Not Needed are inactive.
- Company-date reference, minute/focus/visibility refresh and warning/retry on background clock failure. Refresh changes derived flags only and preserves open forms and business row versions. Initial clock failure shows an error without a guessed date.
- Deadline-aware mutation RPC retains versions, employee access, audit, independent revisions and hard queue protection. T06's original signature remains compatible through a wrapper. Changed-date collision details identify the proposed date's conflicting project.
- User environment values and existing edits were preserved. No dependencies added, remote schema/data changed or production accessed. Queue editing/workload warnings remain T08.

### Verification

- `npm.cmd test`: 24 tests passed, including strict calendar/leap-date validation, classification independent of process timezone, client-review exclusions, derived-only refresh, no-clock-argument RPC contract and deadline/queue-clearing validation.
- All seven migrations and fictional seeds applied successfully to a new isolated native PostgreSQL 18.6 database with Auth stubs. Regression suites passed: 68 schema checks, auth, projects and workstreams.
- `validate_deadlines.sql`: 26 deterministic date/classification assertions passed, covering Philippine midnight, both CDT/CST periods, both DST transitions and SQL session timezone independence. RPC checks passed for date saves/audit, legacy preservation, stale/collision protection, confirmed clearing and employee-only clock access.
- Fictional date persistence committed only to the disposable database. A new connection verified the exact DATE, audit and due/overdue classification under Manila, Chicago and UTC sessions.
- Headless Chrome transport-fixture checks passed desktop/mobile date editing, refresh persistence, browser timezone independence (Manila/Chicago/Honolulu), date refresh preserving an unsaved form/version, queue-clear/unassign confirmation, client-review exclusion, clock failure/retry and changed-date conflict messages. Mobile date field inspected at 375px; Escape closes the dialog. No runtime exceptions in the passing run. These fixtures do not verify live Supabase Auth/PostgREST.
- Final `npm.cmd test` (24 tests), `npm.cmd run lint`, `npm.cmd run build` and `git diff --check` passed. The existing nonblocking chunk-size warning remains (568.81 kB main bundle).

### Files changed for T07

- Added migration: `supabase/migrations/20261102000700_tennessee_deadlines.sql`.
- Added SQL checks: `supabase/tests/validate_deadlines.sql`, `deadline_persistence_write.sql`, `deadline_persistence_read.sql`.
- Added date model/test: `src/features/deadlines/deadlineModel.js`, `src/tests/deadlines.test.js`.
- Added reusable components: `src/components/work-items/DeadlineBadge.jsx`, `src/components/projects/CompanyDateStatus.jsx`.
- Updated services/models/hooks: `src/features/projects/createProjectService.js`, `projectModel.js`, `useProjectData.js`, `src/features/work-items/createWorkItemService.js`.
- Updated UI/tests: `src/components/work-items/WorkstreamEditDialog.jsx`, `src/components/projects/WorkstreamPanel.jsx`, `ProjectsTable.jsx`, `src/pages/ProjectsPage.jsx`, `ProjectDetailPage.jsx`, `src/tests/work-items.test.js`.
- Updated docs: `README.md`, `supabase/README.md`, `docs/PROGRESS.md`. Temporary browser fixtures/native database stay ignored under `node_modules/.cache/`.

### Remaining issues / scope

- Apply migration 007 after 001–006 to your development Supabase stack and run the root README's manual T07 checks. Live Auth/PostgREST RPC shapes and persistence still need user verification; no environment-configured remote writes were made.
- A visible page refreshes the company date within 60 seconds of company midnight, or on focus/visibility. Failed refreshes explicitly retain the last verified day until retry succeeds.
- Queue-position editing/same-day workload warnings (T08), general audit/timeline (T09), full review/completion workflow (T10), and issued revisions/BP impact review (T11) remain separate tickets.
- The existing nonblocking build-size warning remains. T08 has not started; earlier ticket statuses are preserved below as historical records.

## Previous ticket: T06 — Workstream editing and flexible assignments

**Status:** Implemented; local checks passed. Awaiting development-Supabase/user verification before marking complete.

### Implemented

- Edit actions on all five independent workstream panels for status, nullable assignee, required/Not Needed scope, priority, own revision label and basic remarks. No department/role restrictions added.
- Searchable active-employee selector across all departments, current selection preservation, self-assignment, loading/error/retry handling and inactive-assignee safeguards.
- Version-checked transactional workstream RPC with authoritative queue constraint handling, conflict details, explicit confirmation before unassignment clears schedule, reopening reasons, server actors and old/new audit data.
- Separate append-only worknote action with no assignment/version payload and no work-item/project metadata mutation. Parent timestamp/version advances only for actual field changes.
- Own revisions and BP basis/review fields remain independent; working labels do not issue revisions or create impacts. Deadline/queue controls remain read-only in T06.
- User environment files were preserved and no values printed. No remote database or production changes; no new dependencies.

### Verification

- `npm.cmd test`: 18 auth/project/workstream tests passed, including field allowlisting, scope/reopen/clear-schedule validation, independent-note payloads, conflict messages and complete active-directory reads.
- All six migrations and fictional seeds applied successfully to a new isolated PostgreSQL 18.6 database with Auth stubs.
- Regression SQL passed: 68 schema checks, auth and project suites. New `validate_work_items.sql` passed CP-only cross-workstream edits, independent assignments/revisions, stale/invalid saves, queue-conflict details, inactive/member restrictions, confirmed schedule clearing and worknotes that preserve the entire item/parent rows.
- Disposable persistence write committed a fictional BP edit and note. A new connection verified their fields and note persisted, with the work item still at version 2 after the note.
- Headless Chrome passed all five editors for CP-only staff, employee search/current-selection preservation/self assignment, refresh persistence, independent notes, required scope/unassign/reopen confirmations, stale/conflict messages, employee/write retry paths and mobile/Escape behavior through actual service factories with transport doubles. No runtime exceptions in the passing run. Live Auth/PostgREST is not verified by these fixtures.
- Final `npm.cmd test` (18 tests), `npm.cmd run lint`, `npm.cmd run build` and `git diff --check` passed. The existing nonblocking chunk-size warning remains.

### Files changed for T06

- Added migration: `supabase/migrations/20261102000600_work_item_operations.sql`.
- Added SQL checks: `supabase/tests/validate_work_items.sql`, `work_item_persistence_write.sql`, `work_item_persistence_read.sql`.
- Added service/hook: `src/features/work-items/createWorkItemService.js`, `workItemService.js`, `useEmployees.js`.
- Added components: `src/components/work-items/WorkItemDialog.jsx`, `AssigneeSelect.jsx`, `WorkstreamEditDialog.jsx`, `WorknoteDialog.jsx`.
- Added Node tests: `src/tests/work-items.test.js`.
- Updated: `src/components/projects/WorkstreamPanel.jsx`, `src/pages/ProjectDetailPage.jsx`, `README.md`, `supabase/README.md`, `docs/PROGRESS.md`.
- Temporary browser fixtures and native databases are ignored under `node_modules/.cache/`.

### Remaining issues / scope

- Apply migration 006 to your development Supabase database and run the documented manual checks. No migrations or user-data writes were performed against the environment-configured remote project.
- Deadlines/overdue behavior (T07), full scheduling/workload warnings (T08), general audit coverage/timeline (T09), client-review completion workflows (T10) and revision publishing/review (T11) remain separate tickets.
- T06 adds basic reopening validation and preserves hard queue protection; it does not implement the complete later workflow/scheduling features. Standalone notes are persisted now; their timeline display remains T09.
- Existing build-size warning and earlier dependency advisories remain. T07 has not started; previous ticket statuses are preserved below.

## Previous ticket: T05 — Real Projects CRUD and archive

**Status:** Implemented; local checks passed. Awaiting live development-Supabase and user verification before marking complete.

### Implemented

- Replaced the runtime mock service with Supabase reads, named-FK assignee/revision embeds, and RPC writes. No mock or browser-storage fallback is included in the app.
- A project-create transaction initializes all five workstreams, optional Not Needed selections and a project-created activity event, with null assignees/deadlines. Quotation's required scope stays undecided.
- Metadata editing and archive/restore functions lock/check parent versions and log project old/new changes. Duplicate numbers, stale forms, permission failures and unconfirmed network writes have actionable errors.
- Real create/edit forms, archive confirmations, active/archived/all list views, archived indicators, success feedback, retained failed form values and reload/retry controls.
- Archive preserves workstreams, revisions, impacts, notes, history and existing schedule reservations. The confirmation states this explicitly.
- List reads traverse keyset batches until empty before local search/status filtering; no hidden first-page cap. Workstream editing and expanded server-side search/pagination remain T06/T12.

### Verification

- `npm.cmd test`: 12 auth/project tests passed, including duplicate mapping, one-call atomic create contract, expected edit versions, archived queries, full batched reads, revision-label mapping and no mock fallback.
- All five migrations and fictional seeds applied successfully to a new isolated PostgreSQL 18.6 database with Auth stubs.
- `validate_schema.sql`: 68 checks passed. Existing `validate_auth.sql` and new `validate_projects.sql` passed, including simulated child-insert failure rollback, duplicate creates/edits, stale updates, initial scopes, archive/history preservation and RPC authorization.
- Committed the fictional persistence fixture in the disposable test database; a separate `psql` connection verified creation, edited metadata, archive, five work items and activity rows persisted.
- Headless Chrome passed create/duplicate/edit/refresh/stale recovery/archive cancellation/archive/restore/filter views/read-write failure recovery/mobile form checks through the real service factory with an isolated transport double. No runtime exceptions in the passing runs. This does not verify live Supabase Auth/PostgREST.
- Final `npm.cmd test` (12 tests), `npm.cmd run lint`, `npm.cmd run build`, and `git diff --check` passed. Build retains the nonblocking chunk-size warning. No new dependencies or credentials.
- Confirmed runtime source has no import of `mockProjects.js` or reference to the removed preview-only form.

### Files changed for T05

- Added database migration: `supabase/migrations/20261102000500_project_operations.sql`.
- Added SQL checks: `supabase/tests/validate_projects.sql`, `project_persistence_write.sql`, `project_persistence_read.sql`.
- Added service/tests: `src/features/projects/createProjectService.js`, `src/tests/projects.test.js`.
- Added components: `src/components/projects/ProjectFormDialog.jsx`, `ArchiveProjectDialog.jsx`, `ProjectFeedback.jsx`; removed the preview-only `CreateProjectDialog.jsx`.
- Updated: `src/features/projects/projectService.js`, `useProjectData.js`, `src/pages/ProjectsPage.jsx`, `ProjectDetailPage.jsx`, `DashboardPage.jsx`, `src/components/projects/ProjectsTable.jsx`, `WorkstreamPanel.jsx`, `src/app/AppShell.jsx`, `README.md`, `supabase/README.md`, `docs/PROGRESS.md`.
- Previous `mockProjects.js` is retained as an unused historical fixture. Temporary browser fixtures and native databases are ignored under `node_modules/.cache/`.

### Remaining issues / scope

- Supply development Supabase configuration/accounts and apply migration 005. Live Auth/PostgREST embeds, RPC responses and refresh behavior remain to be checked with that stack; only native SQL and transport fixtures were available here. Production was untouched.
- T06 workstream editing, T08 scheduling coordination, T09 general auditing/timeline and T12 server-side filtering/pagination remain separate tickets. Only project actions made through T05 RPCs receive these new automatic audit entries; direct table writes are still covered by the later general-audit work.
- Archiving does not release existing queue positions; this is deliberate preservation behavior documented in the UI and schema README.
- The prior build-size warning and npm advisories remain; dependencies were not changed.
- T06 has not started. Earlier ticket statuses remain as recorded below.

## Previous ticket: T04 — Authentication, employee profiles and baseline RLS

**Status:** Implemented; local checks passed. Awaiting live development-Supabase and user verification before marking complete.

### Implemented

- Supabase client with persistent/refreshing email/password sessions, a public-key-only environment example, ignored local environment files, and Vite validation that rejects private/invalid keys without echoing values.
- Login/logout, active-profile/role loading, workspace route protection, deep-link returns, profile failure/denial recovery, employee name, and dashboard defaults selected by role preference.
- Centralized `private.is_employee()` membership helper and migration-controlled RLS: shared project/work-item reads/create/update/archive across departments; no role-based CRUD restrictions.
- Profiles/roles remain owner-provisioned and read-only to employees. Anonymous, unprovisioned, and disabled accounts are denied; history/impact writes stay closed until controlled workflows are implemented.
- Independent worknote inserts permitted with server-controlled authors; forged audit operations and permanent deletion are denied.
- Blank `.env.example`, onboarding instructions, dependency-free Node auth tests, and rollback-only SQL access checks. No real credentials supplied or invented; no production connection or data changes.
- Projects UI still uses T02 fictional data behind the employee gate; real project CRUD remains T05.

### Verification

- `npm.cmd test`: six Node tests passed for configuration/key rejection, dashboard defaults, safe return paths, session state and stale-response/sign-out handling.
- All four migrations and fictional seeds applied to a new isolated native PostgreSQL 18.6 database with minimal Auth stubs.
- Updated `validate_schema.sql`: 68 schema checks passed after T04. `validate_auth.sql` passed using real PostgreSQL roles/RLS, proving a CP-only employee can edit/assign BP and edit Kitchen/Takeoffs, create/archive projects, and add worknotes, while preventing anonymous/inactive/non-employee access, membership escalation, hard deletes, and forged audit writes. Test writes roll back.
- Headless Chrome: actual unconfigured app denied protected routes. An isolated auth client double verified login failure/success, deep links, refresh restoration, CP/Admin defaults, profile denial/retry, sign-out failure/retry, auth-event clearing, and mobile layout without overflow. No runtime exceptions in the passing run. This does not verify real Supabase Auth or token refresh.
- Final `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`, and `git diff --check`: passed. Build reports a nonblocking chunk-size warning after including the Supabase SDK.
- Confirmed `.env.local` and `.env.production` are ignored while `.env.example` is visible to Git. SQL checks restored the original 3 projects, 15 work items, 6 role labels, and active profile after rollback.

### Files changed for T04

- Added configuration: `.env.example`, `src/lib/supabaseConfig.js`, `src/lib/supabaseClient.js`.
- Added auth: `src/features/auth/AuthProvider.jsx`, `RequireEmployee.jsx`, `authContext.js`, `useAuth.js`, `authState.js`, `dashboardPreference.js`.
- Added pages/tests: `src/pages/LoginPage.jsx`, `src/pages/DashboardPage.jsx`, `src/tests/auth.test.js`.
- Added database changes: `supabase/migrations/20261102000400_employee_access.sql`, `supabase/tests/validate_auth.sql`.
- Updated: `src/App.jsx`, `src/app/AppShell.jsx`, `src/app/navigation.js`, `vite.config.js`, `package.json`, `.gitignore`, `supabase/config.toml`, `supabase/tests/validate_schema.sql`, `README.md`, `supabase/README.md`, `docs/PROGRESS.md`.
- No dependencies added. Temporary browser fixtures/cluster files are ignored under `node_modules/.cache/`; no mock-auth bypass is included in the app.

### Remaining issues / setup

- Supply development URL/public key in `.env.local`, apply migrations, and provision actual email/password Auth users plus active profiles/roles. Passwordless T03 seed placeholders are not sign-in accounts.
- Real Supabase Auth/PostgREST, browser token refresh, and multi-tab synchronization require the live checklist in `supabase/README.md`; CLI/container tooling and project credentials are unavailable here.
- The frontend build has a nonblocking chunk-size warning. Earlier npm advisories remain unassessed; dependencies were not changed.
- Account management remains owner-controlled. Dashboard cards, real Projects CRUD, scheduling/audit/revision workflows remain their planned tickets. T05 has not started.
- Earlier ticket statuses remain as recorded below; no ticket is marked complete without user verification.

## Previous ticket: T03 — Supabase migrations and seed dataset

**Status:** Implemented; checks passed. Awaiting user verification before marking complete.

### Implemented

- Three ordered, transactional SQL migrations for profiles, multiple dashboard roles, projects, work items, issued revision history, revision impacts, and activity logs.
- Foreign keys, unique project numbers/current workstreams, controlled statuses/priorities, Tennessee DATE deadlines, assignee/date invariants, and active queue-position uniqueness.
- Timestamp/version triggers, identity-based editor/event-author attribution, append-only issued/activity records, and same-project BP event references using stable IDs.
- RLS and revoked app grants in each table's creation migration. Shared employee policies and authentication remain T04; no role-based CRUD restrictions introduced.
- Fictional local seeds, minimal local Supabase config, schema/setup README, rollback-only SQL validations, and isolated-native-PostgreSQL Auth stubs for testing.
- No frontend/data-service wiring, Supabase secrets, remote project connection, or production changes. No T04 work started.

### Verification

- Fresh native PostgreSQL 18.6 database: all three migrations applied in order, then all seed rows loaded successfully.
- `supabase/tests/validate_schema.sql`: **67 checks passed**, with rollback, including invalid/FK values, active queue collisions and reopening, allowed noncollisions, independent revisions, BP event references, immutable history, worknotes without reassignment, version metadata, actor attribution, CT date semantics, and app-role RLS denial.
- A fresh second database verified the final migration order and security defaults after adjustments.
- Tests used minimal Auth/role stubs. Supabase CLI/container tooling was not available on PATH; the real Auth/PostgREST/container stack remains unverified.
- `npm.cmd run lint`, `npm.cmd run build`, and `git diff --check`: passed.
- Post-validation query confirmed seed counts (3 projects, 15 work items, 3 activity rows), the original project metadata, and removal of the temporary anonymous SELECT grant after rollback.

### Files changed for T03

- Added: `supabase/config.toml`, `supabase/seed.sql`, `supabase/README.md`.
- Added migrations: `20261102000100_core_schema.sql`, `20261102000200_revision_and_activity.sql`, `20261102000300_metadata_and_security.sql` under `supabase/migrations/`.
- Added SQL checks: `supabase/tests/validate_schema.sql`, `supabase/tests/native_supabase_stubs.sql`.
- Updated: `.gitignore`, `README.md`, `docs/PROGRESS.md`.
- Native test-cluster files are ignored under `node_modules/.cache/`; no existing database was used.

### Remaining issues / scope boundaries

- Repeat the documented checks in a real local Supabase stack before T04 integration. Seed Auth placeholders have no passwords/provider identities and cannot serve as login demo accounts.
- Employee access policies, transactional CRUD, workload warnings, automatic audit logging, revision issuing/review actions, and frontend concurrency handling remain their planned tickets. Metadata/constraints are foundations for these workflows.
- Parent archive does not by itself release work-item queue reservations. Archive/scheduling workflows must handle that explicitly.
- Quotation scope remains nullable pending PM confirmation; no permanent or prematurely enforced project-completion rule was added.
- T01's reported six moderate npm advisories remain unassessed; no dependencies were changed in T03.
- T03 awaits user verification. Earlier ticket statuses below remain as recorded.

## Previous ticket: T02 — Projects page UI with fictional seed data

**Status:** Implemented; checks passed. Awaiting user verification before marking complete.

### Implemented

- Compact Projects table with six fictional projects, status chips, next active Tennessee deadline, and company-time updated timestamps.
- Case-insensitive client/project-number search combined with an any-workstream status filter; filters remain in the URL and survive returning from detail.
- Read-only Project Detail with five independent workstream panels and illustrative BP reference/review fields for Kitchen and Takeoffs.
- New-project modal with required-field validation and an explicit preview-only summary. No records, browser storage, or backend data are written.
- Replaceable asynchronous read service, a single fictional seed-data file, loading/error/empty states, and missing-project recovery.
- Responsive filters, horizontally scrollable table, single-column mobile panels, and Projects navigation active on detail routes.
- Existing Dashboard, My Work, and Login placeholders remain. No T03+ functionality implemented.

### Verification

- Final `npm.cmd run lint` and `npm.cmd run build`: passed after the modal focus fix.
- `git diff --check`: passed.
- Direct Node smoke checks: combined/case-insensitive filters, no matches, missing IDs, five workstreams per project, unassigned/no-deadline invariant, independent revisions, seed-copy isolation, and date-only display under Manila/Chicago/Los Angeles timezones passed.
- Headless Chrome: desktop search/status filtering, empty state, modal initial focus/preview/Escape, unchanged six-record list after preview, detail links/five panels, active Projects navigation, mobile menu and absence of page-wide overflow at 375px, and unknown project recovery passed. No runtime exceptions observed in the passing run.
- Browser testing caught and verified a fix for the modal's initial keyboard focus.
- Manual walkthrough and user verification remain; follow the README checklist.

### Files changed for T02

- Updated: `src/App.jsx`, `src/app/AppShell.jsx`, `src/app/navigation.js`, `README.md`, `docs/PROGRESS.md`.
- Added pages: `src/pages/ProjectsPage.jsx`, `src/pages/ProjectDetailPage.jsx`.
- Added reusable components: `src/components/projects/ProjectsTable.jsx`, `StatusChip.jsx`, `WorkstreamPanel.jsx`, `ProjectState.jsx`, `CreateProjectDialog.jsx`.
- Added data/model boundary: `src/features/projects/mockProjects.js`, `projectService.js`, `projectModel.js`, `useProjectData.js`.
- No dependency or database changes for T02. Temporary browser QA files are ignored under `node_modules/.cache/`.

### Remaining issues

- Real project creation/persistence, editing, auth, audit, scheduling, and revision workflows remain later-ticket work.
- Quotation's required scope remains unconfirmed; the demo displays **To confirm** without inventing a project-completion policy.
- T01's earlier npm report of six moderate advisories remains unassessed; no package upgrades were made in T02.
- T02 remains awaiting user verification. T01's historical status below is unchanged.

## Previous ticket: T01 — Bootstrap frontend and app shell

**Status:** Implemented; automated checks passed. Awaiting user verification before marking complete.

### Implemented

- React Router routes for `/dashboard`, `/projects`, `/my-work`, and `/login`.
- Root redirect to Dashboard and an unknown-route placeholder.
- Responsive sidebar, mobile navigation toggle, active navigation, and top bar.
- Tennessee time (CT) deadline label with `America/Chicago` timezone information.
- Tailwind CSS Vite integration, shadcn/ui configuration, reusable Button/Card components, and import aliases.
- Accessible navigation labels, keyboard focus styles, and skip-to-content link.
- Page placeholders only; Supabase and authentication are not connected.

### Verification

- `npm.cmd run lint`: passed.
- `npm.cmd run build`: passed (Vite production build).
- `git diff --check`: passed.
- `npm.cmd run dev -- --host 127.0.0.1`: started successfully.
- HTTP checks: `/`, `/dashboard`, `/projects`, `/my-work`, `/login`, and `/unknown-route` returned 200 with the application HTML. These checks verify Vite's fallback, not client-side rendering or navigation behavior.
- Interactive browser navigation, direct-route refresh, keyboard behavior, and mobile layout have not been browser-tested. Follow the README checklist for user verification.

### Files changed for T01

- Updated: `src/App.jsx`, `src/index.css`, `vite.config.js`, `index.html`, `package.json`, `package-lock.json`, `README.md`.
- Added: `src/app/AppShell.jsx`, `src/app/navigation.js`, `src/pages/PlaceholderPage.jsx`, `src/components/ui/button.jsx`, `src/components/ui/card.jsx`, `src/lib/utils.js`, `components.json`, `jsconfig.json`, `docs/PROGRESS.md`.
- Removed: unused starter `src/App.css`.
- Existing instructions and planning documents were preserved.

### Remaining issues

- npm reported six moderate dependency advisories during installation. Their details have not been assessed; no forced dependency upgrades were applied.
- This section records the T01 handoff. See the current T02 status above for subsequent work.

## Actual CSV seed update � 2026-11-03

Implemented; awaiting user verification. Replaced fictional project data in supabase/seed.sql with 41 CSV projects and 205 work items, retaining the five existing placeholder profiles and six role entries. Added seven confirmed email/password accounts with profiles, identities and requested roles. Temporary password: Barndos123!. Added scripts/generate-project-seed.mjs and docs/CSV_SEED.md documenting email aliases, duplicate/missing project numbers, ambiguous statuses and unconfirmed Takeoffs scope.

Verification: npm.cmd run lint and npm.cmd run build passed (existing chunk-size warning). Seed counts, retained six roles and byte-identical regeneration passed. npm.cmd test: 69 passed, 1 failed because the pre-existing untracked src/tests/csv-migration.test.js imports missing scripts/migrate-project-list.mjs. Full git diff --check also reports pre-existing trailing whitespace at src/pages/DashboardPage.jsx:40; scoped seed diff check passed. No database changes were applied; SQL execution and Supabase password login remain unverified. No PostgreSQL client was found on PATH. Existing unrelated working-tree edits were preserved.

## CSV seed foreign key fix � 2026-11-03

Restored five original Auth users and profiles before the six retained role entries. The generator now defines these records explicitly instead of extracting a potentially incomplete section from its own output. Added src/tests/seed.test.js to verify all 12 users precede their profiles and all 14 role assignments reference earlier profiles. Focused regression test, lint and build passed (existing build chunk-size warning). Regenerated seed; remote database execution remains for user verification. No remote database operations performed.

## Actual accounts only � 2026-11-03

Removed all five mock Auth users, profiles and their six role entries from the seed and generator per user clarification. Seed now includes only the seven requested actual accounts and eight requested role assignments; Emerson has Kitchen and CP roles. All 41 projects and 205 work items remain. Updated CSV_SEED documentation and regression assertions. Focused seed test, lint and build passed (existing chunk-size warning). No hosted database operations were performed; removing mock users already seeded remotely would require separate cleanup.

## Login environment configuration fix - 2026-11-03

Fixed Vite loading only VITE_ variables while the Supabase client and environment files use NEXT_PUBLIC_SUPABASE_ names. vite.config.js now loads that prefix and explicitly exposes only the two validated public Supabase values. No credential values changed. Lint, production build and all six auth tests passed; verified both configured values reach the production bundle without printing them. Existing chunk-size warning remains. Actual password login awaits user verification after restarting Vite.
