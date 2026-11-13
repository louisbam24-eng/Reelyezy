import { useCallback, useEffect, useState } from 'react'

/** A short message that shows for a moment, e.g. "Saved". */
export function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2200)
    return () => clearTimeout(t)
  }, [msg])
  const show = useCallback((m: string) => setMsg(m), [])
  const node = msg ? (
    <div className="toast" role="status">
      {msg}
    </div>
  ) : null
  return [node, show] as const
}
