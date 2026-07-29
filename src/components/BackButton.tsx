import { ArrowLeft } from 'lucide-react'

export default function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-sm text-teal-800 mb-4">
      <ArrowLeft size={16} />
      กลับหน้าหลัก
    </button>
  )
}
