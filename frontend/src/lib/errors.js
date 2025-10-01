export function extractErrorMessage(err, fallback='Something went wrong') {
  if (!err) return fallback
  const data = err?.response?.data
  if (typeof data === 'string') return data
  if (data?.detail) return data.detail
  if (typeof data === 'object') {
    try {
      return Object.entries(data).map(([k,v]) => `${k}: ${Array.isArray(v)? v.join(', '): v}`).join('\n') || fallback
    } catch {
      return fallback
    }
  }
  return err?.message || fallback
}


