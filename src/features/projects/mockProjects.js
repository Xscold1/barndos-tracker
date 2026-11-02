import { WORKSTREAMS } from './projectModel.js'

// All clients, employees, dates, and project records in this file are fictional.
const aria = { id: 'demo-aria', display_name: 'Aria Bennett' }
const ellis = { id: 'demo-ellis', display_name: 'Ellis Rowan' }
const morgan = { id: 'demo-morgan', display_name: 'Morgan Vale' }
const sam = { id: 'demo-sam', display_name: 'Sam Brooks' }

function makeProject(number, client, notes, updatedAt, workItems) {
  const id = `demo-${number}`
  return {
    id,
    project_no: `BD-${number}`,
    client_name: client,
    notes,
    updated_at: updatedAt,
    work_items: WORKSTREAMS.map(({ type }) => ({
      id: `${id}-${type}`,
      workstream_type: type,
      status: 'Waiting',
      assignee: null,
      due_date: null,
      priority_level: 'Medium',
      queue_position: null,
      revision: null,
      required: type === 'quotation' ? null : true,
      bp_reference_revision: null,
      bp_reviewed_revision: null,
      bp_review_state: 'Not Required',
      notes: '',
      ...workItems[type],
    })),
  }
}

export const mockProjects = [
  makeProject('1001', 'Alder Creek Residence', 'Two-bedroom barndominium with a covered porch.', '2026-11-02T15:30:00Z', {
    quotation: { status: 'Done', assignee: sam, revision: 'Q-1' },
    cp: { status: 'Done', assignee: aria, revision: 'CP-2' },
    bp: { status: 'For Client Review', assignee: ellis, due_date: '2026-10-30', revision: 'B', priority_level: 'High', notes: 'Client is reviewing the issued blueprint.' },
    kitchen: { status: 'In Progress', assignee: morgan, due_date: '2026-11-05', queue_position: 1, revision: 'K-3', bp_reference_revision: 'A', bp_reviewed_revision: 'A', bp_review_state: 'Needs Review', notes: 'Check the pantry dimensions against BP B.' },
    takeoffs: { status: 'For Review', assignee: sam, due_date: '2026-11-06', queue_position: 1, revision: 'T-2', bp_reference_revision: 'A', bp_reviewed_revision: 'B', bp_review_state: 'Changes Required', notes: 'Material quantities need a separate update.' },
  }),
  makeProject('1002', 'Cedar Grove Workshop', 'Workshop and living space; concept changes requested.', '2026-11-02T14:15:00Z', {
    quotation: { status: 'Done', assignee: sam, revision: 'Q-1' },
    cp: { status: 'Revision Requested', assignee: aria, due_date: '2026-11-04', priority_level: 'High', revision: 'CP-1', notes: 'Adjust the workshop entry and storage area.' },
  }),
  makeProject('1003', 'Meadow Lane Barn', 'Open-plan barn with no separate kitchen deliverable.', '2026-11-01T20:00:00Z', {
    quotation: { status: 'Done', assignee: sam, revision: 'Q-1' },
    cp: { status: 'In Progress', assignee: aria, due_date: '2026-11-06', revision: 'CP-1' },
    kitchen: { status: 'Not Needed', required: false },
  }),
  makeProject('1004', 'Silver Ridge Home', 'Final deliverables prepared for this fictional example.', '2026-10-30T18:45:00Z', {
    quotation: { status: 'Done', assignee: sam, revision: 'Q-2' },
    cp: { status: 'Done', assignee: aria, revision: 'CP-3' },
    bp: { status: 'Done', assignee: ellis, revision: 'C' },
    kitchen: { status: 'Done', assignee: morgan, revision: 'K-2', bp_reference_revision: 'B', bp_reviewed_revision: 'C', bp_review_state: 'No Changes Needed' },
    takeoffs: { status: 'Done', assignee: sam, revision: 'T-4', bp_reference_revision: 'C', bp_reviewed_revision: 'C', bp_review_state: 'No Changes Needed' },
  }),
  makeProject('1005', 'Oak Hollow Studio', 'Compact studio awaiting concept approval.', '2026-10-30T15:10:00Z', {
    quotation: { status: 'Done', assignee: sam, revision: 'Q-1' },
    cp: { status: 'For Client Review', assignee: aria, due_date: '2026-10-29', revision: 'CP-1' },
    bp: { assignee: ellis, notes: 'Assignment planned; deadline not set yet.' },
    kitchen: { status: 'Not Needed', required: false },
  }),
  makeProject('1006', 'Willow Bend Retreat', 'New inquiry; drafting work has not been assigned.', '2026-10-29T17:20:00Z', {
    quotation: { status: 'In Progress', assignee: sam, due_date: '2026-11-03', priority_level: 'Low', revision: 'Q-1' },
  }),
]
