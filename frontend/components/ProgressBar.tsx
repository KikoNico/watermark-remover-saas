'use client'

interface Props {
  progress: number
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'
}

const STATUS_LABELS: Record<string, string> = {
  queued: 'En cola',
  processing: 'Procesando',
  completed: 'Completado',
  failed: 'Error',
  cancelled: 'Cancelado',
}

export default function ProgressBar({ progress, status }: Props) {
  const colorClass =
    status === 'completed'
      ? 'bg-green-500'
      : status === 'failed'
      ? 'bg-red-500'
      : status === 'cancelled'
      ? 'bg-gray-500'
      : status === 'processing'
      ? 'bg-blue-500'
      : 'bg-gray-600'

  const trackClass =
    status === 'completed'
      ? 'bg-green-950'
      : status === 'failed'
      ? 'bg-red-950'
      : 'bg-gray-800'

  return (
    <div className="w-full space-y-1">
      <div className={`h-2 w-full overflow-hidden rounded-full ${trackClass}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${colorClass} ${
            status === 'processing' && progress < 100 ? 'animate-pulse' : ''
          }`}
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>{STATUS_LABELS[status] ?? status}</span>
        <span>{progress}%</span>
      </div>
    </div>
  )
}
