# Actual project seed

`supabase/seed.sql` replaces fictional projects with all 41 rows from Project_List.csv and 205 independent work items. Apply after migrations to a fresh local/development Supabase database. It contains actual client data and is not a production migration or an idempotent import. Do not reset an existing database to load it without reviewing data loss.

Only the seven requested actual users are included, with confirmed email/password accounts, email identities, profiles and eight role assignments. The five mock users and their roles have been removed from the seed:

| Email | Roles (first is default) |
| --- | --- |
| patricia@barndosdirect.com | kitchen_drafter |
| camille@barndosdirect.com | bp_drafter |
| emerson@barndosdirect.com | kitchen_drafter, cp_drafter |
| bud@barndosdirect.com | admin_pm |
| shudneysantos@barndosdirect.com | bp_drafter |
| agnes@barndosdirect.com | cp_drafter |
| angelo@barndosdirect.com | admin_pm |

Temporary password for all seven: `Barndos123!`. Change before real use. Camille's address uses `.com`, matching the CSV. Old assignments from `agnesnabung11@gmail.com` and `shudneysantos24@gmail.com` map to Agnes and Shudney's new accounts. Roles are dashboard preferences; historical assignments can belong to people outside their listed roles.

Mapping decisions for review:

- `On Going` becomes `In Progress`; `For Revision` becomes `Revision Requested`.
- Nick Amaya's `Initial FP` becomes CP `In Progress`.
- Theresa Moseley Garage's ambiguous CP `Take offs` becomes CP `Waiting`; no completion or Takeoffs progress is inferred.
- Blank statuses become `Waiting`. Kitchen `Not Needed` has required=false. Quotation retains unconfirmed required=null. Takeoffs starts required=true/Waiting because there is no independent source column; review scope before relying on overall completion.
- No Kitchen/Takeoffs assignment or deadline is inferred. All source due dates are blank. Generic project Assignee is preserved in notes, not treated as a workstream assignment.
- Duplicate numbers become `260605-HOUSE`, `260605-GARAGE`, `261005-HOUSE`, `261005-SHOP`. Jonathan Finn uses `CSV-JONATHAN-FINN` pending an actual number.
- CP/BP revision labels are imported as current values. No historical issue events, BP dependencies or review decisions are fabricated.
- Every original CSV field is retained as JSON in project notes, including remarks, payment/handoff/approval, Completed and editor/time. Overall completion remains derived. Import actor is Angelo; historical source edits are not impersonated.

Regenerate from the export (the seven actual users and their roles are defined in the generator):

```powershell
node scripts/generate-project-seed.mjs C:/Users/Xscold/Downloads/Project_List.csv
```

The generator fails on unknown statuses/employees, unresolved duplicate numbers and nonempty deadlines rather than discarding them. Account authentication still needs verification against a running Supabase Auth service after applying the seed.
