const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const REVIEW_DECISIONS = ['No Changes Needed', 'Changes Required', 'Not Required']

function version(value) { if (!Number.isSafeInteger(value) || value < 1) throw new Error('Reload the project before changing revisions.') }
function note(value) { const text = (value ?? '').trim(); if (!text || text.length > 2000) throw new Error('Enter a note of 1–2,000 characters.'); return text }
function revisionError(error, writing = false) {
  const message = {
    '23505': 'That revision label has already been issued for this workstream. Choose a new label; issued history cannot be replaced.',
    '40001': 'The workstream or review changed. Cancel and reload the project before retrying.',
    '42501': 'Active employee access could not be confirmed. Sign in again.',
    '22023': 'Check the revision label, issued BP basis, review outcome and note. BP requires both dependent workstreams to be initialized.',
    '23503': 'That BP revision or workstream is unavailable. Reload the project.',
    P0002: 'Revision, review or project not found. Reload the project.',
    PGRST202: 'Revision operations need a database update. Contact the workspace owner.',
  }[error?.code]
  return new Error(message ?? (writing ? 'The revision save could not be confirmed. Reload history before retrying to avoid duplicate records.' : 'Revision history could not be loaded. Check your connection and try again.'))
}

export function createRevisionService(client) {
  async function mutate(name, args) {
    try {
      if (!client) throw new Error('Not configured')
      const { data, error } = await client.rpc(name, args).single()
      if (error) throw error
      if (!data?.id) throw new Error('Missing revision response')
      return data
    } catch (error) { throw revisionError(error, true) }
  }
  return {
    async listProjectRevisions(projectId, { signal } = {}) {
      try {
        if (!client || !uuid.test(projectId)) throw new Error('Invalid project')
        let query = client.rpc('list_project_revisions', { p_project_id: projectId })
        if (signal) query = query.abortSignal(signal)
        const { data, error } = await query
        if (error) throw error
        if (!Array.isArray(data?.events) || !Array.isArray(data?.impacts)) throw new Error('Invalid revision response')
        return data
      } catch (error) { throw revisionError(error) }
    },
    issueRevision(item, values) {
      version(item.row_version)
      const label = (values.revision_label ?? '').trim()
      if (!label || label.length > 40) throw new Error('Enter an issued revision label of 1–40 characters.')
      if (values.confirm_issued !== true) throw new Error('Confirm this deliverable has been issued before recording it.')
      return mutate('issue_work_item_revision', {
        p_work_item_id: item.id, p_expected_row_version: item.row_version, p_revision_label: label,
        p_based_on_bp_revision_id: values.based_on_bp_revision_id || null, p_notes: note(values.notes),
      })
    },
    reviewImpact(item, impact, values) {
      version(item.row_version); version(impact.row_version)
      if (!REVIEW_DECISIONS.includes(values.decision)) throw new Error('Choose a BP impact review outcome.')
      return mutate('review_bp_impact', {
        p_impact_id: impact.id, p_expected_impact_version: impact.row_version,
        p_expected_work_item_version: item.row_version, p_decision: values.decision, p_notes: note(values.notes),
      })
    },
  }
}
