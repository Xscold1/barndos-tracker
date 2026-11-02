import { useEffect, useRef, useState } from 'react'
import { myWorkService } from './myWorkService'

export function useMyWorkData(query) {
  const [attempt, setAttempt] = useState(0)
  const queryKey = JSON.stringify(query)
  const key = `${queryKey}:${attempt}`
  const [result, setResult] = useState({ key, data: null, loading: true, error: null })
  const refresh = useRef(null)

  useEffect(() => {
    let active = true, inFlight = false, hasRead = false
    const controller = new AbortController()
    async function read(background = false) {
      if (inFlight || (background && !hasRead)) return
      inFlight = true
      try {
        const data = await myWorkService.listMyWork({ ...JSON.parse(queryKey), signal: controller.signal })
        if (active) setResult({ key, data, loading: false, error: null, refreshError: null })
      } catch (error) {
        if (active) setResult((current) => background && current.key === key && current.data
          ? { ...current, refreshError: error.message }
          : { key, data: null, loading: false, error: error.message })
      } finally { inFlight = false; hasRead = true }
    }
    const initial = setTimeout(() => read(), 250)
    refresh.current = () => read(true)
    function refreshWhenVisible() { if (document.visibilityState !== 'hidden') read(true) }
    const timer = setInterval(refreshWhenVisible, 60_000)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      active = false
      controller.abort()
      refresh.current = null
      clearTimeout(initial)
      clearInterval(timer)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [queryKey, key])

  return { ...(result.key === key ? result : { data: null, loading: true, error: null }),
    reload: () => setAttempt((value) => value + 1), refresh: () => refresh.current?.() }
}
