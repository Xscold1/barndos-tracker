import { useEffect, useRef, useState } from 'react'
import { activityService } from './activityService'

const initial = { events: [], loading: true, cursor: null, error: null, loadingMore: false, moreError: null }

export function useActivity(projectId, revision = 0) {
  const [refresh, setRefresh] = useState(0)
  const key = `${projectId}:${revision}:${refresh}`
  const [state, setState] = useState({ ...initial, key })
  const actions = useRef(null)
  const latest = useRef(state)

  useEffect(() => { latest.current = state }, [state])
  useEffect(() => {
    let active = true, loadingMore = false
    const controller = new AbortController()
    activityService.listActivity(projectId, { signal: controller.signal }).then(
      (page) => { if (active) setState({ ...initial, ...page, key, loading: false }) },
      (error) => { if (active) setState({ ...initial, key, loading: false, error: error.message }) },
    )
    actions.current = async () => {
      const current = latest.current
      if (loadingMore || current.key !== key || current.loading || !current.cursor) return
      loadingMore = true
      setState((value) => ({ ...value, loadingMore: true, moreError: null }))
      try {
        const page = await activityService.listActivity(projectId, { cursor: current.cursor, signal: controller.signal })
        if (active) setState((value) => {
          const ids = new Set(value.events.map(({ id }) => id))
          return { ...value, events: [...value.events, ...page.events.filter(({ id }) => !ids.has(id))], cursor: page.cursor, loadingMore: false }
        })
      } catch (error) { if (active) setState((value) => ({ ...value, loadingMore: false, moreError: error.message })) }
      finally { loadingMore = false }
    }
    return () => { active = false; actions.current = null; controller.abort() }
  }, [projectId, key])

  return { ...(state.key === key ? state : initial), reload: () => setRefresh((value) => value + 1), loadMore: () => actions.current?.() }
}
