import { useEffect, useState } from 'react'
import { revisionService } from './revisionService'

export function useRevisionData(projectId) {
  const [refresh, setRefresh] = useState(0)
  const key = `${projectId}:${refresh}`
  const [state, setState] = useState({ key, loading: true, data: null, error: null })
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    revisionService.listProjectRevisions(projectId, { signal: controller.signal }).then(
      (data) => { if (active) setState({ key, loading: false, data, error: null }) },
      (error) => { if (active) setState({ key, loading: false, data: null, error: error.message }) },
    )
    return () => { active = false; controller.abort() }
  }, [projectId, key])
  return { ...(state.key === key ? state : { loading: true, data: null, error: null }), reload: () => setRefresh((value) => value + 1) }
}
