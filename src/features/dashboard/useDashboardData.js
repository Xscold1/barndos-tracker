import { useEffect, useRef, useState } from 'react'
import { dashboardService } from './dashboardService'

export function useDashboardData({ scope, workstream, filter, page }) {
  const [attempt, setAttempt] = useState(0)
  const queryKey = JSON.stringify({ scope, workstream, filter, page })
  const key = `${queryKey}:${attempt}`
  const [result, setResult] = useState({ key, data: null, loading: true, error: null })
  const refresh = useRef(null)

  useEffect(() => {
    let active = true, inFlight = false
    const controller = new AbortController()
    async function read(background = false) {
      if (inFlight) return
      inFlight = true
      try {
        const data = await dashboardService.getDashboard({ ...JSON.parse(queryKey), signal: controller.signal })
        if (active) setResult({ key, data, loading: false, error: null, refreshError: null })
      } catch (error) {
        if (active) setResult((current) => background && current.key === key && current.data
          ? { ...current, refreshError: error.message }
          : { key, data: null, loading: false, error: error.message })
      } finally { inFlight = false }
    }
    read()
    refresh.current = () => read(true)
    function refreshWhenVisible() {
      if (document.visibilityState !== 'hidden') read(true)
    }
    const timer = setInterval(refreshWhenVisible, 60_000)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      active = false
      controller.abort()
      refresh.current = null
      clearInterval(timer)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [queryKey, key])

  // Never show another scope/card/page's late response while the new one loads.
  return { ...(result.key === key ? result : { data: null, loading: true, error: null }),
    reload: () => setAttempt((value) => value + 1), refresh: () => refresh.current?.() }
}
