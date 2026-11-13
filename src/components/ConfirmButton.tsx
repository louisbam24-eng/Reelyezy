import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

/** A button that asks "Sure?" on the first click and acts on the second. */
export default function ConfirmButton({ className, onConfirm, children, ask = 'Sure? Click again' }: { className?: string; onConfirm: () => void; children: ReactNode; ask?: string }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button
      className={className}
      onClick={() => {
        if (armed) {
          setArmed(false)
          onConfirm()
        } else setArmed(true)
      }}
    >
      {armed ? ask : children}
    </button>
  )
}
