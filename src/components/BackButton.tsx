import { ArrowLeft } from 'lucide-react'

export default function BackButton({ onClick, label = 'กลับหน้าหลัก' }: { onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-sm text-teal-800 mb-4">
      <ArrowLeft size={16} />
      {label}
    </button>
  )
}
