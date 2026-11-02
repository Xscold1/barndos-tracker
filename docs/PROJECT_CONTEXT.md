# Barndos Project Tracker — Project Context & AI Handoff

**Version:** 1.0 · **Updated:** 2026-11-02 · **Status:** Requirements agreed for MVP; implementation not yet assumed.

> **Read this first in every new AI coding session.** This is the product brief and source of truth for the current discussions. See [MVP_REQUIREMENTS.md](./MVP_REQUIREMENTS.md) for acceptance criteria and [DEVELOPMENT_TICKETS.md](./DEVELOPMENT_TICKETS.md) for the implementation sequence. Do not claim a feature is already implemented unless it exists in the repository.

## 1. Goal and constraints

Build a small **internal web-based project tracker** for Barndos, a barndominium drafting company. Today, work is tracked in a spreadsheet-like system. The client needs a shared source of truth for project status, drafting assignments, revisions, priorities, and Tennessee-based deadlines.

**Delivery plan:** working local prototype → client walkthrough and feedback → fix/approve → production hosting. The priority is to finish a correct and usable MVP quickly, **not** to build automation or a large enterprise platform.

**Developer profile:** Full-stack developer, familiar with React, Tailwind CSS, Node.js and PHP, but rusty after approximately 3–4 months away from coding. Uses VS Code and has ChatGPT Plus/Codex and Canva Pro. Favor incremental implementation, readable code, simple architecture and clear tests. Do not introduce an unnecessary backend framework or subscription.

## 2. Chosen technology

- **Frontend:** React + Vite, JavaScript/JSX initially; React Router.
- **UI:** Tailwind CSS + shadcn/ui; responsive, compact internal-business-app design.
- **Backend:** Supabase (Auth, PostgreSQL, auto-generated data API, SQL functions/RPC, Row Level Security). **No dedicated Express/PHP backend for MVP.**
- **Quality:** ESLint, Git, SQL migrations, basic component and workflow tests.
- **Deployment:** Develop locally first; choose commercial-use-compatible frontend hosting and an appropriately backed-up production database after client approval.
- **Later:** Slack notifications via scheduled jobs/Edge Functions; AI-assisted workflows only after the core app works. ChatGPT Plus does not itself fund production AI API calls.

## 3. Users, roles, editing policy

Five role labels:

1. Admin / Project Manager (PM)
2. Concept Plan (CP) Drafter
3. Blueprint (BP) Drafter
4. Kitchen Plan (KP) Drafter
5. Quotation & Takeoffs Specialist

**Roles affect which dashboard/view opens by default, NOT project permissions.** For the MVP, all authenticated employees may view, create and edit projects; update any workstream; add worknotes; set deadlines/priority; assign or reassign any drafter, including themselves. A CP drafter may work on BP, Kitchen, Takeoffs, etc. Allow multiple role labels per user if needed. Design the authorization code so stricter permissions can be added later without reworking the data model. Authentication/RLS are still mandatory. Keep audit history of every important change.

This shared-editing decision does **not** mean exposing Supabase service-role keys or unrestricted anonymous access.

## 4. Workstreams and actual workflow

A **project** is the parent record for one client job. A **work item** represents one track within that project. Initially there are five workstream types: **Quotation, Concept Plan, Blueprint, Kitchen Plan, Takeoffs**.

1. A client inquires and requests a quotation. Staff coordinate over call/email, quote, and develop a Concept Plan.
2. CP is drafted and sent to the client. If the client requests changes, CP goes through a revision cycle; if approved, mark the CP work item `Done`.
3. After CP approval, **Blueprint, Kitchen, and Takeoffs may proceed simultaneously**, independently, with different assignees, deadlines, statuses and revisions.
4. BP can be sent to the client while Kitchen and Takeoffs are still underway. The client may request BP revisions. BP goes back into its own revision cycle, **without resetting KP or Takeoffs**.
5. A project is **fully finished only when all required workstreams are finished**. Do not maintain a manually edited, permanent `project_completed` flag. Derive an `all_required_done` indicator from current work items, so reopening BP automatically removes the finished indicator.
6. Some workstreams may be `Not Needed` and are excluded from the all-required-finished calculation. Define whether Quotation counts as required with the client before enforcing it as a completion gate.

**Workstream statuses:** `Waiting`, `In Progress`, `For Review` (internal), `For Client Review`, `Revision Requested`, `Done`, `Not Needed`. The exact permitted transitions should be enforced consistently but allow real-world reopening and exceptions with a logged reason. A drafter finishing a deliverable is different from client acceptance.

**Client-review OLA:** `For Client Review` remains unfinished, but it must NOT be counted as an overdue *drafter* assignment. A client follow-up date can be tracked separately later. OLA here means an internal work obligation/deadline, not a guarantee of customer response time.

## 5. Tennessee company-time invariant — critical

The company's deadline calendar follows **Tennessee Central Time** using the IANA timezone **`America/Chicago`** (CDT in summer, CST in winter). People may be working in the Philippines or elsewhere; local browser time must NOT determine due/overdue status. Do **not** use a hard-coded UTC−5 offset or a fixed 13-hour difference.

- Store date-only drafting deadlines as PostgreSQL **`DATE`**, representing the **Tennessee calendar date**.
- Compute today's company date on the database/server as `(now() AT TIME ZONE 'America/Chicago')::date`.
- `due_today`: active, drafter-owned work with `due_date = company_today`.
- `overdue`: active, drafter-owned work with `due_date < company_today`.
- Example: Tennessee still October 28, Philippines already October 29 → an October 28 deadline is **not yet overdue**. It becomes overdue only when Tennessee enters October 29.
- Keep event times (`created_at`, `updated_at`, status changes) as `TIMESTAMPTZ`.
- Labels should explicitly say deadlines are **Tennessee time (CT)**.
- **No assignee means no deadline**: an unassigned work item must have a null `due_date`. An assigned item may temporarily have no deadline while planning. Reassignment due to leave is manual and may require rescheduling.
- If timed deadlines are requested later, add an explicit time and convert to an actual timestamp using the IANA timezone.

## 6. Scheduling, priority and team coordination

Two separate concepts:

- `priority_level`: High / Medium / Low, a descriptive urgency label; duplicates are allowed.
- `queue_position`: optional numbered ordering position for a particular assignee on a specific Tennessee due date.

**Hard conflict:** same active assignee + same `due_date` + same non-null `queue_position` for two different active work items. Reject the update atomically and show the conflicting **client, workstream, deadline, assignee, and position**. Prevent race conditions using PostgreSQL constraints and/or transactional RPC; front-end-only validation is insufficient.

**Workload warning:** same person has other active assignments due the same day, even if their positions differ. Warn and show the work; allow the change with acknowledgement/coordination with the PM. This is not automatically a hard conflict.

Staff may manually reassign tasks when someone is absent, coordinate changed deadlines with PMs, and leave a **worknote without changing the assigned person**. Log editor, old/new values, time, and note. Where concurrent editing might overwrite a teammate's work, apply version checking or another safe concurrency strategy.

## 7. Independent revisions and BP dependencies

BP, Kitchen, and Takeoffs have **their own revision labels**, e.g. BP `B`, Kitchen `K-3`, Takeoffs `T-2`. **Never automatically increment Kitchen or Takeoffs own revisions just because BP changes.**

For Kitchen and Takeoffs also track:

- `bp_reference_revision`: BP revision on which the current KP/Takeoffs deliverable was based.
- `bp_reviewed_revision`: latest BP revision the responsible person checked.
- `bp_review_state`: `Not Required`, `Needs Review`, `No Changes Needed`, `Changes Required` (or equivalent controlled statuses).

When BP revision `A → B` is **published/issued** (not merely saved as an unissued working draft):

1. Record an immutable BP revision event and worknote.
2. Create per-workstream impact/review records for KP and Takeoffs as needed; surface `Needs Review` until checked. Where impact is unknown, require review before declaring no impact.
3. **Do not overwrite** KP/Takeoffs own revision, BP basis, or drafting status.
4. Reviewer decides `No Changes Needed` (record reviewed BP `B`; own revision stays the same) or `Changes Required` (do work; update own revision and basis when issued).
5. Maintain revision and impact history, who evaluated it, and worknotes.

**Example:** BP revision B is published. Kitchen is at K-3 based on BP A and flagged for review. After checking, Kitchen may remain K-3 and record BP B as reviewed if no change is required. Takeoffs might issue T-3 based on BP B because materials changed.

## 8. Future notification behavior — design for it, do not build delivery yet

When a published BP revision affects KP and/or Takeoffs, the **currently assigned** drafter(s) should eventually receive an in-app and/or Slack notification. Include project/client, BP revision, impacted workstream, impact notes, actor, and a link to the relevant work item.

If both are impacted, each assignee should get the relevant alert; if a workstream has no assignee, flag it as **unassigned/needs review** rather than silently dropping it. Also consider future alerts for worknotes, assignments, deadline changes, due-today and overdue work.

**MVP requirement:** persist revision-impact events and worknotes with enough structured data to support later notifications. Actual message delivery, retries, digests and AI suggestions are **out of scope** until the client approves the working tracker.

## 9. Dashboard and Projects UI

**Dashboard:** four compact, clickable cards (BP, CP, KP, Takeoffs). Each card shows pending count, due-today count, overdue count. **Only one card expands at a time** to a 5-row paginated list showing client/project, Tennessee deadline, assignee and status. Clicking the active card closes it. Provide `All Team` and `My Work` filters. Admin defaults to all-team overview; a drafter defaults to their own workstream and assignments. Quotation summary may be included for the estimator/quotation role; do not let it delay the first four cards. Counts must be derived from all matching database rows, not just one fetched page.

**Projects page:** searchable, filterable central listing with a compact table. Fields/filters include project number, client name, workstream, status, assignee, priority, Tennessee due-date range, `Needs Review`, `Unassigned`, and archived. Clicking a record opens a project detail view with independent workstream sections and controls for editing, assignments, priority/deadlines, revisions, worknotes and activity history.

Use a neutral, professional, responsive layout with Tailwind/shadcn UI. Prefer legibility and speed over elaborate visual design.

## 10. Proposed data model (not a claim of existing tables)

- `profiles` — employee display name and Auth user ID.
- `user_roles` — user, role, optionally preferred default dashboard.
- `projects` — unique project number, client name, main project data, notes, archived state, version/timestamps.
- `work_items` — project, type, assignee, required flag, status, `due_date`, priority level, queue position, own revision, BP reference/review data, version/timestamps.
- `revision_history` — append-only issued revisions and contextual notes.
- `revision_impacts` — issued BP revision → KP/Takeoffs review targets, impact state, reviewer, timestamps/notes; notification-ready.
- `activity_logs` — changes, actors, old/new values, worknotes and time.

Use SQL migrations, foreign keys, check constraints, unique project numbers, secure RLS for authenticated employees, and database-atomic scheduling validation. Sensitive service-role credentials must never be placed in React client code.

## 11. MVP vs later

**MVP:** login, shared project CRUD/archive, workstream editing and assignments, TN deadline logic, priority conflict/warnings, independent revisions and BP impact-review data, worknotes/audit, clickable-card dashboard, filters/pagination, tests, client demo.

**After MVP:** Slack/in-app notifications and reminders; AI summaries; email/quotation intake; more advanced capacity prediction; bulk CSV import; file attachments; optional permission restrictions, richer reporting. Existing spreadsheet migration may be required for actual production onboarding.

## 12. Open decisions to validate with Barndos PM (do not silently assume)

- Is Quotation a required completed workstream, or can it be considered closed once CP starts?
- Does `Done` for each workstream require client approval or final internal sign-off, especially for Kitchen and Takeoffs?
- What action counts as **issuing/publishing** a BP revision, versus saving draft work?
- How should a workload warning be acknowledged (confirmation, worknote, or both)?
- Are all client deadlines Tennessee date-only end-of-day, or are some precise timed appointments?
- What restrictions, if any, should be introduced later for user/account management?

## 13. Instructions for AI assistants

1. Read this file, `MVP_REQUIREMENTS.md`, and `DEVELOPMENT_TICKETS.md` before proposing changes.
2. Inspect the existing repository first. Never assume a component/table is already there.
3. Implement **one ticket at a time**. Keep changes small; explain files affected and how to test them.
4. Prefer existing React/Vite and Supabase over adding Next.js, Express, PHP, or a separate AI service.
5. Preserve Tennessee company-date handling, separate workstreams/revisions, no-assignee/no-deadline, and shared editing policy.
6. Keep Slack/AI notification **delivery** out of the MVP; only persist structured revision impacts and worknotes.
7. Provide runnable code, database migrations and appropriate tests, not only pseudocode.

**Starter prompt for a new AI conversation:**

> You are my senior full-stack pair programmer. I am building the Barndos Project Tracker MVP. Read the three docs in `docs/`, inspect the repository, summarize what is implemented and what remains, and propose the next smallest ticket. I know React, Tailwind, Node and PHP but have been out of practice; prioritize a fast working prototype. Do not change code until you identify the next ticket. Follow Tennessee `America/Chicago` dates, independent workstreams and revisions, no-assignee/no-deadline, shared editing, worknotes, and future notification-ready impact records.
