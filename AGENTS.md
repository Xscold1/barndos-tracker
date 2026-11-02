
# Barndos Project Tracker - Codex Instructions

## Documentation
Before starting any development task, read:
- docs/PROJECT_CONTEXT.md
- docs/MVP_REQUIREMENTS.md
- docs/DEVELOPMENT_TICKETS.md

## Tech Stack
- React + Vite
- JavaScript / JSX
- Tailwind CSS + shadcn/ui
- React Router
- Supabase (PostgreSQL + Auth)

## Important Rules
- Roles determine dashboard preferences, not CRUD restrictions.
- All authenticated users can edit and assign projects.
- CP, BP, Kitchen, and Takeoffs are independent workstreams.
- Each workstream has independent revisions.
- Kitchen and Takeoffs track their BP reference revision.
- All deadlines follow Tennessee time (America/Chicago).
- Unassigned work items must not have deadlines.
- Prevent priority conflicts.
- Record important changes and worknotes.
- Notifications and AI features are future enhancements.

## Development Guidelines
- Follow the MVP requirements.
- Work on one development ticket at a time.
- Do not introduce unnecessary dependencies.
- Use reusable React components.
- Keep code simple and maintainable.
- Never expose Supabase secret keys.
- Run lint and build checks after changes.
- Explain changes and testing steps.


## Development Safety

- Inspect existing code before making modifications.
- Do not rewrite working features unnecessarily.
- Follow the acceptance criteria of the current ticket.
- Do not implement future tickets without approval.
- Never invent Supabase credentials or environment values.
- Use Row Level Security for database access.
- Never expose service-role or secret keys in frontend code.
- Do not perform destructive database operations
  without explicit approval.
- Do not deploy to production without approval.
- Never claim a test passed unless it was executed.
- Report blockers instead of pretending work is complete.
- Prefer the simplest implementation that meets the MVP.


## After Completing a Ticket
1. Summarize completed work.
2. List modified files.
3. Explain how to test.
4. Identify remaining issues.
5. Stop before starting another ticket.


## Additional Business Rules

### Timezone and Deadlines
- Use America/Chicago for all deadline calculations.
- Automatically handle CDT/CST daylight saving changes.
- Never use the user's browser timezone to determine overdue status.
- A project becomes overdue only after its deadline date
  has passed in Tennessee.
- Work awaiting client review should not be counted as
  overdue drafting work.

### Workstream Management
- CP, BP, Kitchen, and Takeoffs operate independently.
- BP, Kitchen, and Takeoffs can progress simultaneously.
- A project is fully completed only when all required
  workstreams are done.
- Workstreams marked Not Needed do not block completion.
- Unassigned work items cannot have deadlines.

### Revision Management
- Every workstream maintains its own revision.
- Kitchen and Takeoffs track their BP reference revision.
- When BP is revised, flag Kitchen and Takeoffs for review.
- Do not automatically increment their revisions.
- Do not automatically reset their drafting statuses.
- Preserve revision history and worknotes.

### Priority Management
- Allow multiple projects to have High priority.
- Prevent the same employee from having two active work
  items with the same deadline and queue position.
- Display the conflicting project when a conflict occurs.
- Warn about multiple same-day deadlines without
  automatically blocking them.
- Enforce hard conflicts at the database level.


## Progress Tracking

- Maintain docs/PROGRESS.md.
- Record the current ticket and implementation status.
- Record completed tests and remaining issues.
- Only mark tickets complete after user verification.
- Do not automatically proceed to the next ticket.
