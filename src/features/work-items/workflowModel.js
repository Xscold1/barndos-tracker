import { ACTIVE_DRAFTING_STATUSES } from '../deadlines/deadlineModel.js'

export function transitionNeedsReason(type, from, to) {
  return (['Done', 'Not Needed'].includes(from) && !['Done', 'Not Needed'].includes(to))
    || (['cp', 'bp'].includes(type) && from === 'For Client Review' && ACTIVE_DRAFTING_STATUSES.includes(to))
}

// Shortcuts open the version-checked editor; they never save immediately.
export function clientReviewActions(type, status) {
  if (!['cp', 'bp'].includes(type)) return []
  if (status === 'For Client Review') return [{ label: 'Request revision', status: 'Revision Requested' }, { label: 'Mark done', status: 'Done' }]
  if (status === 'Done') return [{ label: 'Reopen for revision', status: 'Revision Requested' }]
  if (status === 'Not Needed') return [{ label: 'Reopen work', status: 'Waiting' }]
  return [
    ...(status === 'Revision Requested' ? [{ label: 'Resume drafting', status: 'In Progress' }] : []),
    { label: 'Send for client review', status: 'For Client Review' },
  ]
}
