# Barndos Project Tracker

Internal drafting project tracker built with React, Vite, JavaScript, React Router, Tailwind CSS, and shadcn/ui.

## Local development

Use Node.js 22.12+ or a supported newer LTS release (T01 was checked with Node 24).

```sh
npm ci
npm run dev
```

Open the Local URL printed by Vite. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.

## Current prototype (T01–T14a)

`/login` provides Supabase email/password sign-in. Dashboard, My Work, Projects, project details, and unknown-route recovery require a session plus an active employee profile. The Dashboard shows four expandable workstream summaries backed by the T13 service. My Work lists the employee's assignments across all five workstreams, including Quotation, with filters, priorities and Tennessee deadlines. Projects supports creation, metadata edits, archive/restore, independent workstream editing and assignments. Roles select the initial dashboard view and do not restrict editing.

Desktop navigation is a sidebar. Below 768px, use the menu button to expand navigation above the page. Escape closes expanded navigation and returns focus to the menu button.

The top bar labels deadlines as **Tennessee time (CT)** and shows the employee name and Sign out. Date-only deadlines keep their calendar date, and updated timestamps display in `America/Chicago`. Projects and workstreams show due-today/overdue indicators using the database's Tennessee company date.

### T04 authentication setup

1. Use a development Supabase project with all migrations applied. Create email/password users through Supabase Auth tooling, then provision their `profiles` and dashboard roles as the database owner. Seed Auth placeholders are not sign-in accounts.
2. Copy `.env.example` to `.env.local` if you do not already have one. Supply your project's `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (a publishable or legacy anon key). Never use secret/service-role keys or put them in any `VITE_` variable.
3. Restart Vite. Without configuration, the app shows a disabled sign-in form and never opens protected pages. Invalid/private-key configuration stops Vite before serving/building the app.

See [supabase/README.md](supabase/README.md#t04-employee-access-and-onboarding) for profile/role provisioning, SQL access tests, and the live-login checklist. There is no public signup flow or mock-auth bypass in the app. The SDK persists/refreshes sessions; sign-out applies to this browser. Roles choose a dashboard view and do not restrict project edits or tabs.

### T05 Projects

- Search by client name or project number; combine with a workstream-status filter. A status matches **any** of the five workstreams, including Quotation. Filters are kept in the URL and preserved when returning from a detail page.
- Open a project-number/client link to see separate Quotation, CP, BP, Kitchen, and Takeoffs panels. Each shows its own status, assignee, deadline, priority, queue position, and revision. BP reference/review labels are joined from stable revision-event IDs.
- The next active deadline includes assigned active drafting work only. It excludes work awaiting client review, Done, and Not Needed, and shows a Tennessee due-today/overdue indicator.
- **New project** saves through a single transaction that creates the project, all five initial work items and a project-created activity row. Work begins unassigned, without deadlines. Optionally mark irrelevant workstreams **Not Needed**.
- **Edit project** saves its number, client name and remarks. Duplicate numbers are rejected case-insensitively. Version checks prevent overwriting a teammate's newer project edit.
- **Archive project** requires confirmation and hides the record from the default active list. Use **Show → Archived projects** or **All projects** to find it and **Restore project** to return it. Workstreams, history, assignments, deadlines and reserved queue positions remain intact.
- Loading, empty, error, retry and missing-project states are included. Success messages appear after server confirmation; failed saves retain form values. Network failures ask you to check the list before retrying because a server commit may have succeeded before the response was lost.

The production services use Supabase exclusively and never fall back to local mocks. The old `mockProjects.js` is an unused historical fixture. Database examples come from `supabase/seed.sql` only when deliberately seeded. T12 searches and paginates on the server; T09 supplies activity history and T11 adds explicit revision issuing/impact review.

### T06 workstreams and worknotes

Apply `20261102000600_work_item_operations.sql` to your development Supabase database. Each Quotation/CP/BP/Kitchen/Takeoffs panel now has **Edit** and **Add worknote** actions for every employee.

- Edit status, assignee, required scope, priority, own revision label and workstream remarks. Employee search spans all departments and offers **Assign to me** and **Unassigned**. Searching does not change the current selection. Inactive employees cannot receive new assignments; an existing inactive assignee may remain during unrelated edits.
- **Not Needed** sets scope to Not required. Quotation can remain To confirm. Reopening Done/Not Needed work requires a reason; T10 also requires a reason when CP/BP returns from client review to drafting. Basic edits use the work item's version so a stale form cannot overwrite a newer update.
- T07 adds deadline editing; T08 adds optional queue positions and confirmable same-day workload warnings. Reassignment retains the current queue position unless edited and revalidates hard slot conflicts. Unassigning scheduled work requires confirmation to clear both atomically.
- Each workstream's own revision is independent. Editing the label does not publish a revision event, change BP reference/review fields or increment another workstream. Use T11's explicit Issue revision and BP review actions for those records.
- **Add worknote** posts an append-only note without assignment fields or version requirements. It leaves the work item and project metadata unchanged. T09 displays saved notes in the project activity timeline.

Manual T06 checks: sign in as a CP employee and edit BP, Kitchen and Takeoffs with different assignees/statuses. Search for an employee, try self-assignment, then save and refresh. Post a Kitchen worknote as another employee and verify its assignee remains unchanged. Test Not Needed/reopening, required clear-schedule confirmation, two-tab stale saves, directory failures and a 375px viewport. Notes and mutations are persisted through Supabase RPCs; your existing environment files are not modified by this ticket.

### T07 Tennessee deadlines

Apply `20261102000700_tennessee_deadlines.sql` after migrations 001–006 in your development database. The authenticated `company_today()` RPC calculates `(now() AT TIME ZONE 'America/Chicago')::date`. The service compares calendar strings against that returned date; it never uses the browser clock or timezone to determine deadline status. CDT/CST changes follow the IANA timezone rules.

- **Edit workstream → Deadline (Tennessee CT)** saves a PostgreSQL `DATE`, with no midnight/timestamp conversion. An assignee is required to enable the input; assigned work may have no deadline. Removing a queued deadline requires confirmation to clear the queue. Unassignment requires confirmation to clear an existing deadline/queue together.
- Assigned `Waiting`, `In Progress`, `For Review` and `Revision Requested` work is **Due today (CT)** on its deadline and **Overdue (CT)** only after that Tennessee day ends. `For Client Review` shows **Awaiting client**, even with a past deadline; Done and Not Needed have no drafting indicator.
- The Projects list shows the nearest active drafting deadline; details show each workstream independently. The displayed **Company date** is the reference for these indicators.
- While visible, the page refreshes that database date every 60 seconds and on window focus/tab visibility. Refreshing the date changes only derived indicators and preserves open edit forms. If refresh fails, a warning shows the last verified date and a retry button. If the initial date cannot be loaded, the page shows an error and retry instead of guessing a date.
- Date edits retain version checks, old/new audit data and hard queue-conflict protection. T08's editor now uses `schedule_work_item`; older RPC signatures forward through the same scheduling checks.

Manual T07 checks (fictional development records):

1. Assign a workstream, set its deadline to the displayed company date, save and refresh. Confirm **Due today (CT)** and the exact calendar date persist. Set yesterday/tomorrow to verify Overdue/Upcoming.
2. Change browser timezone to Asia/Manila, including after Philippine midnight while Tennessee is still on the prior day. The saved date and indicators must stay unchanged. Repeat in America/Chicago; deterministic SQL tests cover spring/fall DST boundaries without changing a real clock.
3. Put a past-due workstream into For Client Review. It must show Awaiting client and disappear from the list's next active drafting deadline if no other eligible work remains.
4. Remove a queued deadline and confirm the queue clears while its assignee remains. Unassign scheduled work and verify confirmation clears both date and queue. Reopen the editor: its date input must be disabled until assigned.
5. Leave an unsaved form open over a company-date refresh; it must retain entered values. Test a failed initial clock request and failed background refresh/retry. Check date inputs at 375px width.

### T08 scheduling conflicts and workload warnings

Apply `20261102000800_scheduling.sql` after migrations 001–007 in your development database. **Edit workstream** now includes an optional positive **Queue position**, enabled after choosing an employee and Tennessee deadline. Leaving it blank reserves no numbered slot. High/Medium/Low priority labels can be shared.

- The same active employee/date/position cannot be reserved by two work items. A failed save identifies the conflicting project number, client, workstream, employee, date and slot; acknowledgement cannot bypass this block.
- If a changed schedule has other active drafting work due for the employee on that Tennessee date, the first save shows the count and work list without writing anything. Review the list, check the acknowledgement, then choose **Confirm and save**. A change note is optional; whether notes should become mandatory remains a PM decision.
- Confirmation is bound to the proposed schedule and server workload snapshot. A changed workload requires another review; changing status, assignee, deadline or queue in the form clears acknowledgement. Cancel leaves the saved schedule unchanged.
- `For Client Review`, `Done` and `Not Needed` reserve no active slots and do not appear in workload warnings. Reopening revalidates conflicts/warnings. Archived projects retain active reservations and appear as archived in workload lists, matching the existing archive-preservation rule.
- Metadata-only edits on an unchanged active schedule do not repeat the warning. Independent worknotes still leave scheduling and versions untouched. Schedule changes and acknowledged workload are recorded with the authenticated editor and optional note.

Manual T08 checks (fictional development records):

1. Schedule BP for employee A on a chosen CT date at queue 1. Try scheduling another project's Kitchen work for A on that date at queue 1: confirm a detailed hard conflict and unchanged data.
2. Change Kitchen to queue 2, save, review the workload warning and verify nothing changed yet. Acknowledge, confirm and refresh: both positions must persist. Repeat with a blank queue; same-day work still warns.
3. Before confirming, change the proposed date/assignee/queue and verify acknowledgement resets. Have another tab change the listed workload before confirming; the server should require another review.
4. Move the first item to For Client Review, Done or Not Needed: its slot becomes available. Reopen it after another item takes that slot and confirm a hard conflict.
5. Verify duplicate High labels are allowed, a different employee/date has no unrelated warning, stale forms are rejected, Cancel preserves data and the warning fits a 375px viewport.

See [supabase/README.md](supabase/README.md#t08-atomic-scheduling-and-workload-confirmation) for SQL validation and the opt-in local concurrency test. Live Auth/PostgREST verification remains pending; checks used native PostgreSQL and isolated browser transport fixtures.

### T09 activity timeline and independent worknotes

Apply `20261102000900_activity_timeline.sql` after migrations 001–008 in development. Project Detail now includes **Activity & worknotes**, showing the authenticated editor, project/workstream, Tennessee event time, changed fields with old/new values, and any worknote. Assignment IDs resolve to employee names; deadline dates stay calendar dates. Revision-label edits remain distinct from issued revisions.

- **Add project note** posts project-wide coordination notes; each workstream's **Add worknote** retains its own scope. Neither operation changes assignments, status, deadlines, revisions, metadata or row versions. Notes are append-only, support plain multiline text and cannot be edited/deleted in the app.
- History loads the newest 20 events. **Load older activity** follows a server timestamp/ID cursor, preserving precision and handling equal timestamps without skipping entries. **Refresh activity** reloads the newest page, including teammates' changes; no realtime subscription is added.
- Loading, empty, error and retry states are included. A failed older-page request retains loaded entries. Notes retain entered text on a failed post; if a response is lost, inspect refreshed history before retrying to avoid duplicates.
- Existing RPC audit records are preserved without duplicates. Direct employee inserts/updates to project/workstream business fields now receive server audit records too. Internal timestamps/version-only touches are not separate events. Employee updates cannot move or relabel an audited workstream's identity.
- Actor IDs remain the authoritative audit identities; displayed employee names come from current profiles. Older records are shown as stored. No past changes are invented or backfilled, and revision issuing/BP impact actions remain T11.

Manual T09 checks (fictional development records):

1. Edit a project's metadata and a workstream's assignee, status, deadline, queue, priority or own revision. Verify one activity event per save, with your name, correct CT time and old/new values.
2. As another employee, add a workstream note and a project note. Refresh and confirm both scopes/authors; verify assignment, schedule, revision and row versions did not change. Existing archived projects retain history and accept coordination notes.
3. Archive then restore a project and verify both events. Change browser timezone to Manila; event times remain CT and deadlines retain their calendar date.
4. Add enough fictional notes for **Load older activity**, then exercise older-page and initial-load failures/retry. Check that no entries repeat or disappear. Test blank/long notes, a failed post retaining text, literal HTML displayed as text, and the 375px layout.

See [supabase/README.md](supabase/README.md#t09-activity-history-and-audit-coverage) for SQL audit/security checks and opt-in committed persistence tests. Live Supabase Auth/PostgREST verification remains pending.

### T10 client review and derived completion

Apply `20261102001000_review_workflow.sql` after migrations 001–009 in development.

- CP/BP panels provide **Send for client review**, **Request revision**, **Resume drafting**, **Mark done** and **Reopen for revision** as appropriate. Each opens the existing editor with a selected status; nothing changes until Save. The ordinary status selector remains available for documented exceptions.
- Returning CP/BP from For Client Review to Waiting/In Progress/For Review/Revision Requested requires a reason, as does reopening Done/Not Needed work. The common scheduling RPC validates this and records old/new status, editor, time and reason. Direct employee status writes that require a reason must use the RPC/editor; older mutation endpoints cannot bypass it.
- Client review stays unfinished and excluded from drafter due/overdue. Returning to drafting restores the existing deadline's normal CT indicator and rechecks queue conflicts/workload warnings. CP/BP cycles never reset Kitchen/Takeoffs status, assignee, deadline, revision or BP basis/review fields. Working status changes do not issue revisions or create BP impacts.
- The list and detail page derive **All required work done** from the complete work-item records on every read. There is no stored project-completed flag. All five workstreams must be initialized, scope must be confirmed, at least one workstream must be required, and every required workstream must be Done. Not Needed and explicitly optional work do not block required completion.
- Unconfirmed Quotation scope prevents a full completion claim; the UI shows **Scope to confirm** when the known required work is done. A project with no required work shows **No required work**. These cautious display states do not decide the PM's open Quotation or final sign-off policies.
- Reopening required BP immediately removes the finished indicator after the saved records reload. **Awaiting client** is shown separately, including optional work waiting on a client. The Projects workflow filter combines awaiting-client, required-open, all-required-done and scope-unconfirmed views with search/status/archive selection and preserves the URL on Back to Projects.

Manual T10 checks (fictional development records):

1. Use CP's review actions through client review → revision requested → drafting/review → client review → Done. Repeat a cycle and check the activity timeline's author, old/new status and reason.
2. Send BP for client review while Kitchen and Takeoffs are unfinished. A past BP drafting date must show Awaiting client, while their independent drafting indicators remain correct. Request a BP revision, verify a blank reason is rejected, then save a reason and confirm only BP changes.
3. Mark the required workstreams Done and explicitly confirm Quotation's scope. Verify All required work done on detail/list and after refresh. Leave Quotation undecided to check Scope to confirm instead.
4. Reopen required BP with a reason. Its finished indicator must disappear while Kitchen/Takeoffs rows and own revisions stay intact. Try a newly occupied old queue slot and verify conflict/warning protection still applies.
5. Combine the workflow filter with search/status, test an empty result, open a matching project and return with filters preserved. Check badges/actions/forms at 375px width.

The formal meaning of Done for Kitchen/Takeoffs and the company-wide Quotation policy still need PM confirmation. T10 follows explicit saved scope/status choices; it adds no automatic approvals, CP-to-BP prerequisite lock, or revision-publishing actions.

### T11 issued revisions and BP impact review

Apply `20261102001100_revision_operations.sql` after 001–010 in development. BP/Kitchen/Takeoffs panels now provide **Issue revision**, immutable issued history, and BP impact review history.

- Saving a working revision label remains separate from issuing. **Issue revision** requires an explicit issued-deliverable confirmation, its own label and an issue note. Labels are unique within each workstream; history cannot be overwritten. This records an already-issued deliverable and sends no drawings or notifications.
- Issuing BP creates Needs Review records for both Kitchen and Takeoffs, including unassigned/Not Needed work. Their own revisions, drafting statuses, assignments, schedules and existing BP basis remain unchanged. Review Not Required can explicitly dismiss an irrelevant impact.
- **Review BP …** records No Changes Needed / Changes Required / Not Required, notes, authenticated reviewer and CT timestamp. Reviewing the current BP updates the checked-BP label and current review state; reviewing an older impact preserves a newer BP's pending flag. Decisions and changes are audited.
- No Changes Needed leaves the deliverable's original BP basis intact. After Changes Required, issue the updated Kitchen/Takeoffs revision separately and choose its actual issued BP basis. Issuing does not automatically change drafting status or rewrite a review decision.
- Issued events and all impact decisions remain visible after refresh. Stale versions, duplicate labels and foreign/non-BP basis selections are rejected. A failed read offers Retry revision history; other project editors remain usable.

Manual T11 checks: issue BP A, Kitchen K-3/Takeoffs T-2 based on A, then BP B. Verify K-3/T-2 and drafting stay unchanged while both need review. Review Kitchen No Changes Needed and Takeoffs Changes Required; verify the reviewer, BP B and notes. Issue Takeoffs T-3 based on B and refresh. Issue BP C, then review an older B impact: C must remain pending. Test duplicate labels, stale reviews, errors/retry and mobile dialogs/history. Formal issuing criteria remain a PM operational decision; the explicit action records the employee's confirmation.

### T12 full-data Projects filters and pagination

Apply `20261102001200_project_search.sql` after 001–011 in development. Projects now calls a single server search RPC per query and displays the full matching count plus a bounded page. Default page size is 20, with 10/20/50 options, Previous/Next controls and stable updated-time/ID ordering. Out-of-range pages clamp to the last available page and update the URL.

Search matches literal case-insensitive client/project-number text across the full dataset, including records beyond the current page. Advanced filters add workstream, assigned employee (including inactive employees), priority, inclusive Tennessee DATE range, Unassigned, and Needs BP Review for Kitchen/Takeoffs. Workstream filters combine on the **same work item**; project workflow applies to the whole project. Every returned project retains all five workstreams for correct summaries.

Active projects remain the default; Show includes archived/all views without deleting history. Filter changes reset pagination, short typing pauses avoid unnecessary requests, and old responses cannot replace a newer query. URLs retain filters/page/size through refresh and detail/back navigation. Clear filters preserves the selected archive view and resets other controls to defaults. Blank/reversed/invalid ranges and conflicting employee/unassigned URL values have validation errors.

Manual T12 checks (fictional development records):

1. With more than 20 projects, change pages and page size. Search for a project outside the first page and confirm the full count and matching row.
2. Combine a workstream, status, employee, priority and CT date range. Confirm all conditions match one work item; a CP assignee plus another workstream's status must not falsely match.
3. Combine Kitchen/Takeoffs with Needs BP Review and Unassigned. Try inactive-employee selection, inclusive date endpoints, an empty combination, archived/all views, and reversed dates.
4. Open a filtered row, refresh it, and return to Projects. Filters and pagination must remain. Try an out-of-range page URL, a failed read/retry, rapid search changes and a 375px viewport.

The SQL test uses 25 additional rollback-only projects to verify counts, all pages, same-work-item matching, full nested records and access denial. Live Supabase verification still needs the development stack; no remote migrations were applied here.

## Checks and manual verification

```sh
npm run lint
npm run build
npm test
npm run preview
```

1. Start the dev server and open `/projects` while signed out; confirm it redirects to `/login` and displays no project records.
2. With development Supabase configured, sign in as an active employee. Check the preferred dashboard, employee name, and accessible Dashboard/Projects/My Work navigation. A direct project link should return to that project after login.
3. Open each URL directly and refresh it. Try browser Back/Forward and an unknown URL.
4. Resize to 375px wide. Check that navigation starts collapsed, the menu opens/closes, choosing a link closes it, and the page has no horizontal overflow.
5. Use Tab to reach the skip link, navigation, menu button, and page action. Use Enter to activate them; use Escape inside expanded mobile navigation.
6. Refresh a protected page to check session restoration, then sign out and verify Back cannot reveal project content. Test wrong credentials and an unprovisioned/disabled account.

For T05 (development database only):

Apply migration `20261102000500_project_operations.sql` and sign in as a provisioned employee first.

1. Create a fictional project with a new number; mark Kitchen Not Needed if desired. Open it and verify all five panels, initial statuses and no assignees/deadlines. Refresh the list/detail and confirm persistence.
2. Attempt the same project number with different casing. Confirm a duplicate error, retained form values and no extra project/workstreams. Duplicate client names with different numbers remain allowed.
3. Edit the number, client name and remarks. Refresh and confirm the changes remain. Open two tabs and save both from the same version; the second save must ask you to reload rather than overwrite the first.
4. Cancel an archive confirmation, then confirm archive. Verify the active list hides the project, the archive view finds it, its five panels/history remain, and Restore returns it to active projects after refresh.
5. Search/filter, open a row and use **Back to Projects**; filters should remain. Test an unmatched search, `/projects/missing`, and a failed read/save with recovery using Reload/Try again.
6. At 375px width, check navigation, filters, table scrolling, forms and detail panels. Tab through a modal; Escape closes it while idle. Archive initially focuses Cancel.

`npm test` runs dependency-free auth, project, workstream, deadline, scheduling, activity, workflow, revision, search and dashboard-service tests. SQL checks cover atomic rollback, duplicates, archive preservation, Tennessee dates, scheduling warnings, audited review cycles, independent workstreams/notes, dashboard queries and persistence across new connections. The opt-in local concurrency script checks competing RPC/table writes. Browser fixtures exercise UI flows through actual service factories with transport doubles. Live Auth/PostgREST verification still requires your development Supabase stack/accounts; see the database README.

`npm run preview` serves the production build locally. Future production hosting must rewrite browser routes to `index.html`; hosting is outside the current tickets.

## UI foundation

Tailwind uses `@tailwindcss/vite` and theme variables in `src/index.css`. Locally owned shadcn-style Button and Card primitives live in `src/components/ui`. The `cn` helper merges conditional Tailwind classes. `components.json` configures JavaScript, CSS variables, and the `@/` aliases for future shadcn components.

Setup references: [Tailwind with Vite](https://tailwindcss.com/docs/installation/using-vite), [shadcn JavaScript](https://ui.shadcn.com/docs/javascript), [React Router](https://reactrouter.com/start/declarative/installation).

## T03 database foundation

Versioned migrations, fictional SQL seeds, and rollback-only schema checks now live in `supabase/`. See [supabase/README.md](supabase/README.md) for the seven-table schema, local setup, constraints, security defaults, and validation commands.

The fourteen migrations and seeds have been exercised on an isolated native PostgreSQL cluster with Auth stubs. Shared access, CRUD, CT dates, scheduling, activity, workflows, issued revisions/reviews, server search, dashboard and personal-assignment queries were checked locally. Real Supabase Auth/PostgREST remain to be verified with your development stack; transport fixtures were used for UI checks. No production data was changed.

Read `AGENTS.md` and the three planning documents in `docs/` before implementing the next ticket. Ticket status and checks are recorded in [docs/PROGRESS.md](docs/PROGRESS.md).

## T13 dashboard data service

Apply `supabase/migrations/20261102001300_dashboard_summary.sql` after migrations 001–012 in your development database. The read-only `dashboard_summary` RPC and `src/features/dashboard/dashboardService.js` provide all four BP/CP/Kitchen/Takeoffs card totals plus an optional five-row workstream list. T14 connects these results to the Dashboard UI described below.

Pending includes unfinished work, including unassigned items and For Client Review. Due-today/overdue counts use the database's Tennessee date and existing drafting rules; For Client Review contributes to neither. Done, Not Needed, Quotation and archived projects are excluded. All Team covers every assignee and unassigned work. My Work uses the session's employee ID at the database, independently for each workstream. Lists include project/client, assigned name, CT deadline, status and server-calculated deadline state. They sort oldest deadline first, then queue/project/ID; undated work is last.

To inspect the data service directly, sign in to the local Vite app with a development employee, then run this in browser DevTools:

```js
const { dashboardService } = await import('/src/features/dashboard/dashboardService.js')
const team = await dashboardService.getDashboard({ scope: 'team', workstream: 'bp' })
console.log(team.company_today, team.cards, team.list)
await dashboardService.getDashboard({ scope: 'mine', workstream: 'kitchen' })
await dashboardService.getDashboard({ scope: 'team', workstream: 'cp', filter: 'unassigned' })
```

With more than five unfinished records in one workstream, request `page: 2`: list rows should change while all card counts and `list.total` stay the same. Try `filter: 'due_today'` and `'overdue'`; a client-review item must remain pending without entering either drafting list. Verify different assignees on the same project appear only in their own My Work results. Omitting `workstream` returns all four counts and `list: null`; an empty list has total 0, page 1 and page_count 1. Invalid filters fail, and failed reads never turn into invented zero counts.

Run `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build` and the rollback-only `supabase/tests/validate_dashboard.sql` on a disposable seeded local database (see the database README). All thirteen migrations/seeds, eleven SQL suites and 57 Node tests passed locally. Live Supabase Auth/PostgREST and user acceptance remain pending; the existing 600.28 kB bundle warning remains.

## T14 expandable Dashboard

Open `/dashboard` after signing in. Four cards show BP, CP, KP and Takeoffs pending/due-today/overdue totals. Selecting a card opens its five-row list; selecting another replaces it; selecting the open card collapses it. The list shows project/client links, Tennessee deadlines and server-provided indicators, assigned names and workstream status. Desktop uses a compact table; narrower screens use stacked records. Cards wrap from four columns to two, then one on phones.

Admin/PM (or an employee with no role) starts in All Team with every list collapsed. A drafter starts in My Work with their preferred role's card expanded. Every employee can switch to All Team and any workstream. The list's Show filter offers All pending, Due today (CT), Overdue (CT) and Needs assignment; it never changes the card totals. Unassigned work is visible in All Team, with a helpful empty state in My Work.

Scope, selected/collapsed card, list filter and each card's page are retained in the URL. A scope/filter change resets all pages. Switching cards preserves independent pages; refresh and browser Back from a project restore the view. The server clamps pages after data changes, and the URL follows the returned page. Counts never come from the five visible rows.

The page refreshes the entire server snapshot every 60 seconds while visible and on window focus/tab visibility. All company-date/deadline classification remains server-controlled. A failed background refresh keeps the last verified response and shows a warning/retry; a failed initial read shows an error instead of invented zero counts. Changing scope/card/page cancels the previous request and ignores late results. Explicit Reload dashboard requests a fresh read.

Manual T14 checks with fictional development records and migration 013 applied:

1. Run `npm.cmd run dev`, sign in, and open `/dashboard` without query parameters. Verify PM/no-role defaults and each drafter's preferred card/My Work default. Explicit URL choices override defaults.
2. Open BP, switch to KP, then select KP again. Only one list should appear, and the second KP selection should collapse it. Use Tab, Enter and Space to operate cards and scope controls.
3. With more than five unfinished records in a workstream, use Next/Previous page. Verify five rows at most and unchanged full totals. Change another card's page, switch back, refresh, open a project link and use browser Back: both cards should retain their own pages.
4. Switch All Team/My Work and try every Show filter. Confirm independent assignees on the same project, visible unassigned/no-deadline records in All Team, and the explanatory empty My Work/Needs assignment state. Scope/filter changes should return to page one.
5. Put a fictional past-due work item in For Client Review. It stays pending/Awaiting client while drafting due-today/overdue counts exclude it. Confirm the company-date label and indicators stay the same in Asia/Manila and America/Chicago browser timezones. Focus the window or wait for the visible-page refresh to reload server counts.
6. Simulate a failed dashboard request, then restore the connection and retry. Confirm foreground errors hide unverified totals, background errors keep the last verified counts/date with a warning, and quick card/scope changes never display a late response from another view.
7. Check 375px, tablet and desktop widths: one/two/four summary columns, readable records, visible pagination and no page-level horizontal overflow. An empty dataset should show four genuine zero totals and useful list guidance.

T14 verification passed: 61 Node tests, lint/build, and isolated browser fixtures covering defaults, card state, full totals, five-row paging, filters, errors/retries, CT refresh, late responses, detail/Back/reload, page clamping, keyboard and 375/768/1440px layouts. Desktop/mobile screenshots were inspected. These transport fixtures do not establish a real Supabase session or verify PostgREST; repeat the manual checks with development accounts. The existing nonblocking bundle-size warning remains (614.54 kB main bundle). No new migration, dependency or environment setting is needed for T14.

## T14a dedicated My Work

Apply `supabase/migrations/20261102001400_my_work.sql` after migrations 001–013 in development, then open **My Work** in the sidebar or `/my-work`. This replaces the separate placeholder with one combined list of your assignments across Quotation, CP, BP, Kitchen and Takeoffs. The read-only RPC derives the employee from the authenticated session; roles and URL employee/scope values cannot change whose assignments are returned. Shared editing through Projects remains available to every employee.

The default shows unfinished assignments on non-archived projects. Search by client/project number and combine workstream, exact/all/unfinished status, priority and Tennessee deadline filters. Due today/Overdue/Upcoming include active drafting only; For Client Review stays pending/Awaiting client. No deadline includes assigned undated records. Done and Not Needed can be found with explicit status choices. Unassigned work belongs in Projects or the Dashboard's All Team view.

The overview covers all your unfinished assignments before list filters. The list's full matching total and 10/20/50-row pages come from the server. Items sort by due date ascending, queue position, project number and unique item ID; undated work is last. Search/filter/page/size are in the URL. Project links carry a validated internal **Back to My Work** destination, preserving the view through detail editing, browser Back and refresh.

Reads debounce 250 ms and cancel/ignore superseded requests. While visible, the page refreshes the full server snapshot every minute and on focus/tab visibility. Foreground failures show an error/retry; background failures retain the last verified counts/date with a warning/retry. Counts and deadline states never use browser-local dates or just one fetched page.

Manual T14a checks:

1. Run `npm.cmd run dev`, sign in as an active development employee and open `/my-work`. Verify your name and only your assigned items. Assign Quotation/CP/BP/Kitchen/Takeoffs to the same employee on fictional projects: all five types should appear regardless of role. Sign in as another employee to verify their different assignments.
2. Use more than ten assignments, change page and page size, and search for a record beyond page one. Full matching totals and overview must remain accurate. Combine stream/status/priority/deadline filters, clear them, and confirm filter changes reset pagination. Test an empty search and assigned work without deadlines.
3. Compare a past-due drafting item with For Client Review: only drafting is overdue. Check Due today, Upcoming, No deadline, Done and Not Needed views. Archived and unassigned items should be absent. Changing browser timezone between Asia/Manila and America/Chicago must not change classification.
4. Open a project, edit through the existing version-checked controls, then use Back to My Work. Confirm filters/page restore and the updated assignment is fetched. Repeat with browser Back and refresh.
5. Check failed reads/retry, missing migration feedback, failed background refresh/retry and quick searches/card navigation. Test 375px, tablet and desktop layouts; table columns become readable stacked records on narrower screens.

Verification: all fourteen migrations/seeds and twelve rollback SQL suites passed on isolated PostgreSQL 18.6 with Auth stubs. `npm.cmd test` passed 69 tests; lint/build passed. My Work and existing Dashboard browser suites passed, with desktop/mobile visual inspection and no runtime exceptions. Live Supabase Auth/PostgREST and user acceptance remain pending. The existing bundle warning remains (629.00 kB main bundle).

The existing `.gitignore` ignores `supabase/`, including migrations and SQL tests; those locally present files are omitted from normal commits. No ignore settings, credentials, production data or packages were changed for T14a.
