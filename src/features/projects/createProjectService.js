import { WORKSTREAMS } from './projectModel.js'
import { isCalendarDate } from '../deadlines/deadlineModel.js'
import { projectSearchArgs } from './projectQuery.js'
import { deriveProjectWorkflow } from './projectModel.js'

const selection = `*, work_items(*,
  assignee:profiles!work_items_assignee_id_fkey(id,display_name),
  bp_reference:revision_history!work_items_bp_reference_event(revision_label),
  bp_reviewed:revision_history!work_items_bp_reviewed_event(revision_label)
)`
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function normalizeProject(project) {
  const workItems = (project.work_items ?? []).map((item) => ({
    ...item,
    bp_reference_revision: item.bp_reference?.revision_label ?? null,
    bp_reviewed_revision: item.bp_reviewed?.revision_label ?? null,
  }))
  return {
    ...project,
    work_items: workItems,
    workflow: deriveProjectWorkflow(workItems),
  }
}

export function projectError(error, writing = false) {
  const messages = {
    '23505': 'That project number is already in use. Choose a different number.',
    '40001': 'This project changed since you opened it. Cancel and reload the project before saving again.',
    '42501': 'Your employee access could not be confirmed. Sign in again or contact your project manager.',
    PGRST301: 'Your session has expired. Sign in again.',
    P0002: 'Project not found. Return to Projects and reload the list.',
    PGRST202: 'The project service needs a database update. Contact the workspace owner.',
    '22023': 'Check the project fields and workstream selection, then try again.',
    '23514': 'Check the project number and client name. Neither can be blank.',
    '23502': 'Project number and client name are required.',
  }
  const result = new Error(messages[error?.code] ?? (writing
    ? 'The save could not be confirmed. Check your connection and the project list before retrying.'
    : 'Projects could not be loaded. Check your connection and try again.'))
  result.code = error?.code ?? 'NETWORK'
  return result
}

export function projectFields(values) {
  const result = {
    project_no: (values.project_no ?? '').trim(),
    client_name: (values.client_name ?? '').trim(),
    notes: values.notes ?? '',
  }
  if (!result.project_no || result.project_no.length > 40) throw new Error('Enter a project number of 1–40 characters.')
  if (!result.client_name || result.client_name.length > 120) throw new Error('Enter a client name of 1–120 characters.')
  if (result.notes.length > 2000) throw new Error('Keep remarks to 2,000 characters or fewer.')
  return result
}

export function createProjectService(client) {
  function requireClient() {
    if (!client) throw new Error('The project service is not configured. Contact the workspace owner.')
    return client
  }
  async function mutate(name, args) {
    try {
      const { data, error } = await requireClient().rpc(name, args).single()
      if (error) throw error
      if (!data?.id) throw new Error('Missing project response')
      return data
    } catch (error) { throw projectError(error, true) }
  }
  function versionArgs(id, version) {
    if (!uuidPattern.test(id) || !Number.isSafeInteger(version) || version < 1) throw new Error('Reload the project before making changes.')
    return { p_project_id: id, p_expected_row_version: version }
  }
  return {
    async getCompanyToday({ signal } = {}) {
      try {
        let query = requireClient().rpc('company_today')
        if (signal) query = query.abortSignal(signal)
        const { data, error } = await query
        if (error) throw error
        if (!isCalendarDate(data)) throw new Error('Invalid company date response')
        return data
      } catch {
        throw new Error('The Tennessee company date could not be loaded. Check your connection and database updates, then retry.')
      }
    },
    async searchProjects({ signal, ...query } = {}) {
      const args = projectSearchArgs(query)
      try {
        let request = requireClient().rpc('search_projects', args)
        if (signal) request = request.abortSignal(signal)
        const { data, error } = await request
        if (error) throw error
        if (!Array.isArray(data?.projects) || !Number.isSafeInteger(data.total) || !Number.isInteger(data.page) || !Number.isInteger(data.page_count)) throw new Error('Invalid project search response')
        return { ...data, projects: data.projects.map(normalizeProject) }
      } catch (error) { throw projectError(error) }
    },
    async getProject(id, { signal } = {}) {
      if (!uuidPattern.test(id)) return null
      try {
        let query = requireClient().from('projects').select(selection).eq('id', id)
        if (signal) query = query.abortSignal(signal)
        const { data, error } = await query.maybeSingle()
        if (error) throw error
        return data ? normalizeProject(data) : null
      } catch (error) { throw projectError(error) }
    },
    createProject(values) {
      const fields = projectFields(values)
      const notNeeded = values.not_needed_workstreams ?? []
      if (!Array.isArray(notNeeded) || notNeeded.some((type) => !WORKSTREAMS.some((stream) => stream.type === type))) throw new Error('Choose valid workstreams.')
      return mutate('create_project', { p_project_no: fields.project_no, p_client_name: fields.client_name, p_notes: fields.notes, p_not_needed_workstreams: notNeeded })
    },
    updateProject(id, version, values) {
      const fields = projectFields(values)
      return mutate('update_project', { ...versionArgs(id, version), p_project_no: fields.project_no, p_client_name: fields.client_name, p_notes: fields.notes })
    },
    setArchived(id, version, archived) {
      if (typeof archived !== 'boolean') throw new Error('Choose whether to archive or restore the project.')
      return mutate('set_project_archived', { ...versionArgs(id, version), p_archived: archived })
    },
  }
}

