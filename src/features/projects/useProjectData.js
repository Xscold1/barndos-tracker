import { useEffect, useRef, useState } from 'react'
import { projectService } from './projectService'
import { applyCompanyDate } from '../deadlines/deadlineModel.js'

export function useProjectData(projectId = null, { archive = 'active', query = null } = {}) {
  const [refreshVersion, setRefreshVersion] = useState(0)
  const queryKey = JSON.stringify(query ?? { archive })
  const key = `${projectId ?? 'list'}:${queryKey}:${refreshVersion}`
  const [result, setResult] = useState({ key, loading: true, data: null, error: null })
  const refreshDate = useRef(null)

  useEffect(() => {
    let active = true
    let clockInFlight = false
    const controller = new AbortController()
    const readTimer = setTimeout(() => {
      const request = projectId === null
        ? projectService.searchProjects({ ...JSON.parse(queryKey), signal: controller.signal })
        : projectService.getProject(projectId, { signal: controller.signal })
      Promise.all([request, projectService.getCompanyToday({ signal: controller.signal })]).then(
      ([payload, companyToday]) => { if (active) setResult({ key, ...(projectId === null ? { pagination: payload } : {}), data: applyCompanyDate(projectId === null ? payload.projects : payload, companyToday), companyToday, clockError: null, loading: false, error: null }) },
      (error) => { if (active) setResult({ key, data: null, loading: false, error: error.message }) },
    ).catch((error) => { if (active) setResult({ key, data: null, loading: false, error: error.message }) })
    }, projectId === null ? 250 : 0)

    async function refreshCompanyDate() {
      if (clockInFlight) return
      clockInFlight = true
      try {
        const companyToday = await projectService.getCompanyToday({ signal: controller.signal })
        if (active) setResult((current) => current.key !== key || current.loading || !current.companyToday ? current : {
          ...current, companyToday, clockError: null,
          // Only derived fields change: do not replace row versions, reload
          // business records or unmount an employee's open edit form.
          data: companyToday === current.companyToday ? current.data : applyCompanyDate(current.data, companyToday),
        })
      } catch (error) {
        if (active) setResult((current) => current.key === key && current.companyToday ? { ...current, clockError: error.message } : current)
      } finally { clockInFlight = false }
    }
    refreshDate.current = refreshCompanyDate
    function refreshWhenVisible() {
      if (document.visibilityState !== 'hidden') refreshCompanyDate()
    }
    const timer = setInterval(refreshWhenVisible, 60_000)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      active = false
      refreshDate.current = null
      controller.abort()
      clearInterval(timer)
      clearTimeout(readTimer)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [projectId, queryKey, key])

  // An ID change must never briefly display the previous project's data.
  return { ...(result.key === key ? result : { loading: true, data: null, error: null }), reload: () => setRefreshVersion((value) => value + 1), refreshCompanyDate: () => refreshDate.current?.() }
}
