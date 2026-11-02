const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const ACTIVITY_PAGE_SIZE = 20

function activityError(error, writing = false) {
  const message = {
    '42501': 'Your employee access could not be confirmed. Sign in again.',
    PGRST202: 'Activity needs a database update. Contact the workspace owner.',
    PGRST301: 'Your session has expired. Sign in again.',
    P0002: 'Project not found. Reload the project.',
    '22023': 'Check the note or reload the activity list.',
  }[error?.code]
  return new Error(message ?? (writing
    ? 'The note could not be confirmed. Reload activity before retrying to avoid posting it twice.'
    : 'Activity could not be loaded. Check your connection and try again.'))
}

export function createActivityService(client) {
  return {
    async listActivity(projectId, { cursor = null, signal } = {}) {
      if (!uuid.test(projectId)) throw new Error('Reload the project before loading activity.')
      try {
        if (!client) throw new Error('Not configured')
        let query = client.rpc('list_project_activity', {
          p_project_id: projectId, p_before_at: cursor?.occurred_at ?? null,
          p_before_id: cursor?.id ?? null, p_limit: ACTIVITY_PAGE_SIZE + 1,
        })
        if (signal) query = query.abortSignal(signal)
        const { data, error } = await query
        if (error) throw error
        if (!Array.isArray(data)) throw new Error('Invalid activity response')
        const events = data.slice(0, ACTIVITY_PAGE_SIZE)
        const last = events.at(-1)
        return { events, cursor: data.length > ACTIVITY_PAGE_SIZE ? { occurred_at: last.occurred_at, id: last.id } : null }
      } catch (error) { throw activityError(error) }
    },
    async addProjectNote(projectId, text) {
      if (!uuid.test(projectId)) throw new Error('Reload the project before adding a note.')
      const note = text.trim()
      if (!note || note.length > 2000) throw new Error('Enter a worknote of 1–2,000 characters.')
      try {
        if (!client) throw new Error('Not configured')
        const { data, error } = await client.rpc('add_project_note', { p_project_id: projectId, p_worknote: note }).single()
        if (error) throw error
        if (!data?.id) throw new Error('Missing note response')
        return data
      } catch (error) { throw activityError(error, true) }
    },
  }
}
