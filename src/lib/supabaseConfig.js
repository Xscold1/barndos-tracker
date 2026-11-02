// Shared by Vite and the browser. Errors never include configuration values.
export function readSupabaseConfig(urlValue = '', keyValue = '') {
  const url = urlValue.trim()
  const key = keyValue.trim()
  if (!url && !key) return { configured: false, error: null }
  if (!url || !key) return { configured: false, error: 'Set both the Supabase URL and publishable key.' }

  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error()
    if (parsed.pathname !== '/' && parsed.pathname !== '') throw new Error()
  } catch {
    return { configured: false, error: 'Use the Supabase project base URL.' }
  }

  let publicKey = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key)
  if (!publicKey) {
    try {
      const parts = key.split('.')
      if (parts.length === 3) {
        const payload = parts[1].replaceAll('-', '+').replaceAll('_', '/')
        const decoded = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')))
        publicKey = decoded.role === 'anon'
      }
    } catch { /* Invalid and privileged keys are both rejected below. */ }
  }
  if (!publicKey) return { configured: false, error: 'Use a publishable or legacy anon key. Secret and service-role keys cannot be used in the frontend.' }
  return { configured: true, url, key, error: null }
}
