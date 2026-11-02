# Barndos Project Tracker — MVP Requirements & Acceptance Criteria

**Version:** 1.0 · **Updated:** 2026-11-02 · **Status:** Implementation specification for prototype

Related docs: [Project Context](./PROJECT_CONTEXT.md) · [Development Tickets](./DEVELOPMENT_TICKETS.md)

## 1. Product objective

Deliver a functional, responsive **internal project tracker** for Barndos drafting operations. Replace spreadsheet-only project status management with a shared app showing **who is doing what, by when, for which client, and at which revision**. Demonstrate a working local prototype first; pursue production hosting only after client feedback and approval.

### Non-goals for the first demo

No AI-generated drawings, document uploads/previews, external client portal, advanced approvals, automated scheduling, Slack delivery, in-app notifications, email parsing, or bulk spreadsheet import. Design data to accommodate selected future features without implementing them now.

## 2. People and access

- Users authenticate through Supabase Auth.
- Roles: Admin/PM, CP Drafter, BP Drafter, Kitchen Drafter, Quotation/Takeoffs Specialist.
- Roles customize the **default dashboard only**. All authenticated employees can view/create/update/archive projects, change any workstream, assign/reassign employees, set priorities/deadlines, and leave worknotes.
- Users may have multiple roles; store a preferred dashboard role or default view.
- All actions are attributable to the editor. Set up security policies for *authenticated users*; never allow anonymous write access or expose privileged API keys.
- Architect permission checks in a single place so the company can request restrictions later.

**Acceptance criteria**

- [ ] Unauthenticated users cannot access project records.
- [ ] A non-admin can assign someone to BP and update Kitchen/Takeoffs, regardless of job title.
- [ ] Each role opens a relevant default dashboard while all tabs remain accessible.
- [ ] Audit history identifies editor, change, and time.

## 3. Project and work-item model

A project is the container for a client/job; distinct work items represent **Quotation, Concept Plan (CP), Blueprint (BP), Kitchen Plan (KP), and Takeoffs (TO)**. Each work item can carry different status, assigned person, due date, priority, queue position, own revision and notes. Create initial workstream records as applicable; mark genuinely irrelevant ones `Not Needed`.

**Core project fields**

- Internal UUID; unique project number (do not use client name as a unique identifier).
- Client/project display name, optional remarks/basic metadata.
- Archived timestamp/actor; created/updated timestamps; current edit version.
- Derived overall progress (`all_required_done`), **not** a manually set permanent `Completed` flag.

**Core work-item fields**

- Project ID; workstream type; primary assignee (nullable); `required` flag.
- Status, `due_date` (nullable), priority level, optional numbered queue position.
- Own revision; BP basis/review fields for KP/TO; timestamps/edit version.

**Acceptance criteria**

- [ ] A single project displays all applicable independent workstreams.
- [ ] Client may receive BP for review even if Kitchen/Takeoffs are unfinished.
- [ ] Only all *required* workstreams being `Done` counts as fully finished; `Not Needed` does not block progress.
- [ ] Reopening BP removes the derived fully-finished indicator if applicable.
- [ ] Duplicate project numbers are rejected; duplicate client names are allowed.

## 4. Workflow and status rules

1. Client requests quote; team follows up by email/call and prepares CP.
2. CP is drafted → internal review if applicable → `For Client Review` → `Revision Requested` if needed → repeat → `Done` when approved.
3. Following CP approval, BP, KP and TO can proceed **at the same time**. Each has a separate assignee, deadline, priority, status and revision.
4. BP may be issued to the client while KP/TO are unfinished. BP review may lead to another BP revision cycle.
5. Workstreams can be reopened; do not erase previous versions, worknotes or histories.

**Allowed status vocabulary (MVP):** `Waiting`, `In Progress`, `For Review`, `For Client Review`, `Revision Requested`, `Done`, `Not Needed`.

`For Client Review` is **pending client action, not active drafter OLA**. It remains unfinished but is excluded from the drafter's **due-today/overdue** indicators. Internal `For Review` remains a team responsibility. A separate client-follow-up feature may be added later.

**Acceptance criteria**

- [ ] CP can loop through revisions before approval.
- [ ] BP can reopen for revision without resetting KP or TO status.
- [ ] `For Client Review` does not become a drafter overdue alert solely because its historical drafting deadline passed.
- [ ] Changes of status capture actor and timestamp; reopening should capture a reason/worknote.

## 5. Tennessee deadline rules — must be correct

**Canonical company timezone: `America/Chicago`** (Tennessee Central, automatically CDT/CST as seasons change). The client describes the company schedule as CDT; never fix the offset to UTC−5 because winter uses CST.

- `due_date` is a PostgreSQL `DATE` representing the calendar date in Tennessee.
- Determine the current Tennessee calendar date using `(now() AT TIME ZONE 'America/Chicago')::date` on the DB/server.
- A due date is overdue **only when Tennessee's current calendar date is later** than the due date.
- Example: Philippines October 29, Tennessee still October 28 → a Tennessee October 28 work item is **not overdue**.
- `created_at`, `updated_at`, and event times are `TIMESTAMPTZ`.
- **If `assignee_id` is null then `due_date` must be null.** An assigned item can be waiting for a deadline.
- Do not use the browser's local timezone for due-today, overdue, or date comparisons; avoid parsing date-only values into different local dates.
- All due labels identify **Tennessee time (CT)**. Timed cutoffs are **not** in scope; date-only work is due through that Tennessee calendar day.

**Acceptance criteria**

- [ ] Overdue remains false at Philippine midnight when the Tennessee due date is still today.
- [ ] Overdue becomes true after the company date changes to the next day.
- [ ] DST changes (CDT ↔ CST) do not shift or mislabel date-only deadlines.
- [ ] Attempting to clear assignee and retain a due date is blocked or clears the due date atomically with a clear confirmation.
- [ ] Dashboard counts, filters, badges and server validation all use the same company date.

## 6. Assignments, deadline updates and priority

All employees may assign/reassign work, including across departments. When someone is unexpectedly absent, a colleague can take over, coordinate with the PM, and adjust the deadline after checking schedule conflicts. **Changing a worknote does not require changing the assignee.**

Priority is split into:

- **Priority level:** High / Medium / Low. Reuse is allowed.
- **Queue position:** optional positive integer used to sequence an assignee's work due on one Tennessee day.

**Hard conflict** = two distinct active work items with the same non-null `(assignee_id, due_date, queue_position)`. Reject the second save with a useful `409 Conflict`-equivalent result identifying the conflicting project/client, workstream, assignee, due date and position. Use a database-level constraint/atomic operation; two simultaneous requests must not both succeed.

**Workload warning** = assignee already has other unfinished *active drafting* work due on the same Tennessee date, even with different queue positions. Show names and count, allow the action after explicit acknowledgement; log the editor and any worknote. A high-priority label alone is not a collision.

`For Client Review`, `Done`, and `Not Needed` do not reserve active drafting queue positions. Reopening such work must revalidate conflicts. A null queue position is not a hard collision.

**Acceptance criteria**

- [ ] Unassigned task cannot retain a due date.
- [ ] Any authenticated employee can reassign work, adjust deadline, and add worknotes.
- [ ] Duplicate queue slot blocks with clear conflict details.
- [ ] Same-day workload warns but can be confirmed if no hard collision.
- [ ] Simultaneous collision attempts cannot double-book the same slot.
- [ ] Old/new values and responsible editor are logged.

## 7. Revisions: independent versions with BP dependency

**Own revisions do not automatically synchronize.** For example BP `B`, Kitchen `K-3`, Takeoffs `T-2` can all be current simultaneously.

Kitchen and Takeoffs additionally track:

- `bp_reference_revision`: the BP revision used as the basis for the **current deliverable**;
- `bp_reviewed_revision`: the most recent BP revision inspected;
- `bp_review_state`: `Not Required`, `Needs Review`, `No Changes Needed`, `Changes Required` or equivalent.

When an updated BP revision is **published**, create an append-only BP revision event and an impact/review record for KP and/or TO. When there is uncertainty, show `Needs Review`. **Do not** change their own revision number or reset their drafting status automatically.

Possible outcome per affected workstream:

- `No Changes Needed`: record it was checked against the new BP; retain own revision.
- `Changes Required`: add worknote, perform changes and issue an independent new KP/TO revision when ready.

Store impact events and reviewers/notes so future alert delivery can be added. **No notification needs to be sent during MVP.**

**Acceptance criteria**

- [ ] BP A→B does not change Kitchen K-3 or Takeoffs T-2 automatically.
- [ ] Kitchen and TO can independently reference/review different BP revisions.
- [ ] A BP change can flag either or both workstreams for review.
- [ ] Reviewer can record no change or required changes without destroying earlier history.
- [ ] Worknotes are attributable to their author; an edit does not force reassignment.

## 8. Dashboard — clickable summary cards

Exactly four default dashboard summary cards: **BP, CP, KP, TO**. A Quotation section can be added for the quotation role if useful but must not delay the MVP.

Each card displays: `unfinished count`, `due today count`, `overdue count`. Only **one card's mini-list** is expanded at a time below the cards. Clicking the selected card again collapses it. The expanded list shows **project/client, Tennessee due date, assigned to, status**, 5 rows/page with independent pagination when switching cards; sort nearest deadline first, unassigned/no-date later. Clicking a row/project opens its detail page.

- Admin: defaults to all-team overview, initially collapsed.
- Drafter: defaults to their relevant card and `My Work` view; users can switch to `All Team` and any workstream.
- Counts represent all matching work items, not just the page fetched.
- `Waiting for Client` can be a separate indicator, not a drafter overdue.

**Acceptance criteria**

- [ ] Only one mini-list opens; card selection and closing work.
- [ ] Counts remain accurate across pagination and team/my-work filters.
- [ ] Due-today and overdue labels follow Tennessee company date.
- [ ] Unassigned items are visible through a needs-assignment filter instead of disappearing.
- [ ] At least one useful empty state and mobile layout are implemented.

## 9. Projects page — primary work area

**List:** compact searchable table of project number, client, CP/BP/KP/TO statuses, nearest relevant deadline, updated time. Filters: client/number search; workstream; assignee; status; priority; due-date range; needs BP revision review; unassigned; archived. Use sensible pagination on full list.

**Project detail:** header for client/project; separate editable panels for Quotation, CP, BP, KP, TO; status, assignee, revision, BP basis/review as appropriate, priority, queue position, deadline, remarks, worknotes, activity history, archive.

**Project CRUD:** create, read, update, soft archive; archived items hidden by default but searchable via filter. Confirm destructive-looking actions. Avoid permanent delete in MVP.

**Acceptance criteria**

- [ ] Creating a project creates corresponding initial work items transactionally or via a reliable service function.
- [ ] Search and filters return expected results and combine correctly.
- [ ] Opening a row shows the correct project/workstreams.
- [ ] Edited fields persist after refresh, with validation and useful error states.
- [ ] Archiving removes items from active lists without deleting history.

## 10. Audit logs and worknotes

Capture for important mutations: project/work item, editor, operation, changed fields with old/new values, timestamp, optional worknote. Worknotes can be created independently of field changes. Project detail shows chronological history. Be careful not to record secrets or full auth tokens in logs.

**Acceptance criteria**

- [ ] Edits made by different employees are distinguishable.
- [ ] Assign/reassign, priority/deadline, status, revision, review outcome, and archive actions create audit entries.
- [ ] A small worknote can be posted without reassigning the work item.
- [ ] Stale-version edits do not silently replace a newer update.

## 11. Data protection and operational quality

- RLS: only authenticated team members can read/write project data for MVP; policies are migration-controlled.
- Protect service-role credentials; frontend uses only the permitted public/publishable key and user session.
- Validate foreign keys, project number uniqueness, enum-like allowed values and date/assignee invariants on the database side.
- Use migration scripts committed to Git; keep separate development/demo data and future production data.
- Add at least basic error reporting, loading/empty states, responsive UI and accessible form labels.
- Prior to production use, agree on backups, hosting plan, access revocation, and a spreadsheet migration approach.

## 12. Minimal end-to-end demo script

1. Sign in as a BP drafter; see BP-oriented dashboard while retaining access to all projects.
2. Create a sample client project and its workstreams; assign a CP drafter.
3. Put CP into `For Client Review`, request a revision, then approve it.
4. Assign BP, KP and TO to three different employees with different deadlines and progress statuses.
5. Change BP to `For Client Review`, showing no drafter-overdue alert while waiting for client.
6. Issue BP Revision B; show KP and TO's **own revision values unchanged** and a `Needs Review` impact marker.
7. Post a worknote and mark Kitchen `No Changes Needed`, Takeoffs `Changes Required`.
8. Demonstrate same-day workload **warning** and duplicate queue-position **hard rejection**.
9. Open the expandable dashboard cards and navigate paginated mini-lists.
10. Show audit history, archive a sample project, and verify archived filtering.

## 13. Critical test matrix

| ID | Test | Expected |
|---|---|---|
| TZ-01 | PH crosses midnight but Tennessee has not | Not overdue |
| TZ-02 | Tennessee advances past due date | Overdue for active drafter work |
| TZ-03 | CDT/CST transition | Date-only deadline unchanged |
| WF-01 | BP delivered while KP/TO open | Project remains not fully finished |
| WF-02 | BP is for client review | Excluded from drafter OLA overdue |
| WF-03 | BP reopened after previously finished | Derived completion becomes false |
| AS-01 | Clear assignee on scheduled task | Deadline cleared or invalid action blocked |
| PR-01 | Same person/date/queue position twice | Hard rejection and conflicting project shown |
| PR-02 | Same person/date, different positions | Warning; user can confirm |
| PR-03 | Concurrent same-slot writes | At most one successful save |
| RV-01 | BP A→B published | KP/TO independent own revisions unchanged |
| RV-02 | Impact verification | Reviewed revision and result recorded |
| AU-01 | Worknote with no reassignment | Note saved; assignee unchanged |
| AU-02 | Two users update stale record | Stale update detected, not silently overwritten |
| UI-01 | Select different dashboard card | One mini-list at a time |
| UI-02 | Change page | Counts unaffected; rows change |
| SEC-01 | Anonymous app/database access | Project data denied |

## 14. Business confirmations still open

These do **not** prevent building the core data model; use safe defaults and ask the PM before final policy enforcement:

- Whether Quotation participates in the final all-required-finished calculation.
- Formal definition of `Done` for KP/TO and of a BP revision being **published/issued**.
- Whether an acknowledged workload warning needs a mandatory worknote.
- Whether precise time-of-day deadlines are needed in addition to Tennessee date-only deadlines.
- Eventual permissions for account management and administrative configuration.

**Definition of MVP done:** The acceptance criteria above pass with sample data, the client can follow the real workflow end to end, and all data persists across page refreshes. Notification delivery and AI automation are explicitly outside this definition.
