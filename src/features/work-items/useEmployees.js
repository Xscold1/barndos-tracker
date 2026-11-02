import { useEffect, useState } from 'react'
import { workItemService } from './workItemService.js'

export function useEmployees({ includeInactive = false } = {}) {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState({ key: 0, data: [], loading: true, error: null })
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    workItemService.listEmployees({ signal: controller.signal, includeInactive }).then(
      (data) => { if (active) setResult({ key: attempt, data, loading: false, error: null }) },
      (error) => { if (active) setResult({ key: attempt, data: [], loading: false, error: error.message }) },
    )
    return () => { active = false; controller.abort() }
  }, [attempt, includeInactive])
  return { ...(result.key === attempt ? result : { data: [], loading: true, error: null }), reload: () => setAttempt((value) => value + 1) }
}
