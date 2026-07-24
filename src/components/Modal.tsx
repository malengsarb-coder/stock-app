import type { ReactNode } from 'react'

export default function Modal({
  open,
  onClose,
  children,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-2xl p-6 w-full ${wide ? 'max-w-xl' : 'max-w-sm'} max-h-[85vh] overflow-y-auto shadow-lg`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}
