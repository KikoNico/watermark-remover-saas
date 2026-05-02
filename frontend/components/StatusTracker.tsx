'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, AlertCircle, CheckCircle, Clock, Loader2, XCircle } from 'lucide-react'
import { getJobStatus, cancelJob, StatusResponse } from '@/lib/api'
import { formatTimeAgo, formatDuration } from '@/lib/utils'
import ProgressBar from './ProgressBar'

interface Props {
  jobId: string
  onComplete?: () => void
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const STATUS_LABELS: Record<string, string> = {
  queued: 'En cola',
  processing: 'Procesando',
  completed: 'Completado',
  failed: 'Error',
  cancelled: 'Cancelado',
}

export default function StatusTracker({ jobId, onComplete }: Props) {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  async function poll() {
    try {
      const data = await getJobStatus(jobId)
      setStatus(data)
      setError(null)
      if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
        stopPolling()
        if (data.status === 'completed') onComplete?.()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al obtener el estado')
    }
  }

  useEffect(() => {
    poll()
    intervalRef.current = setInterval(poll, 2000)
    return () => stopPolling()
  }, [jobId])

  function getElapsedSeconds(): number {
    if (!status?.created_at) return 0
    return (Date.now() - new Date(status.created_at).getTime()) / 1000
  }

  if (error && !status) {
    return (
      <div className="flex items-start gap-3 rounded-xl bg-red-950 border border-red-800 p-4 text-red-300">
        <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-semibold">Error al conectar con el servidor</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (!status) {
    return (
      <div className="flex items-center gap-3 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Conectando con el servidor...</span>
      </div>
    )
  }

  const isProcessing = status.status === 'processing' || status.status === 'queued'
  const isCancellable = isProcessing && !cancelling
  const statusLabel = STATUS_LABELS[status.status] ?? status.status

  async function handleCancel() {
    setCancelling(true)
    try {
      await cancelJob(jobId)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cancelar')
      setCancelling(false)
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto space-y-6 rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Estado del trabajo</h2>
        <span className="text-xs text-gray-500 font-mono">{jobId.slice(0, 8)}...</span>
      </div>

      <ProgressBar
        progress={status.progress}
        status={status.status as 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'}
      />

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-1">
          <p className="text-gray-500">Estado</p>
          <div className="flex items-center gap-1.5">
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin text-blue-400" />}
            {status.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-400" />}
            {status.status === 'failed' && <AlertCircle className="h-4 w-4 text-red-400" />}
            {status.status === 'cancelled' && <XCircle className="h-4 w-4 text-gray-400" />}
            {status.status === 'queued' && <Clock className="h-4 w-4 text-yellow-400" />}
            <span className="font-medium text-white">{statusLabel}</span>
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-gray-500">Tiempo transcurrido</p>
          <p className="font-medium text-white">{formatDuration(getElapsedSeconds())}</p>
        </div>

        {status.created_at && (
          <div className="space-y-1">
            <p className="text-gray-500">Enviado</p>
            <p className="font-medium text-white">{formatTimeAgo(status.created_at)}</p>
          </div>
        )}

        {status.started_at && (
          <div className="space-y-1">
            <p className="text-gray-500">Iniciado</p>
            <p className="font-medium text-white">{formatTimeAgo(status.started_at)}</p>
          </div>
        )}
      </div>

      {status.status === 'failed' && status.error && (
        <div className="rounded-lg bg-red-950 border border-red-800 p-3 text-sm text-red-300">
          <p className="font-semibold mb-1">El procesamiento ha fallado</p>
          <p>{status.error}</p>
        </div>
      )}

      {status.status === 'completed' && (
        <a
          href={`${API_URL}/api/download/${jobId}`}
          download
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-base font-semibold text-white shadow-lg hover:bg-green-500 transition-colors"
        >
          <Download className="h-5 w-5" />
          Descargar Vídeo Limpio
        </a>
      )}

      {status.status === 'cancelled' && (
        <div className="rounded-lg bg-gray-800 border border-gray-700 p-3 text-sm text-gray-400 text-center">
          El procesamiento fue cancelado.
        </div>
      )}

      {isCancellable && (
        <button
          onClick={handleCancel}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-800 py-2.5 text-sm font-medium text-red-400 hover:bg-red-950 hover:text-red-300 transition-colors"
        >
          <XCircle className="h-4 w-4" />
          Cancelar procesamiento
        </button>
      )}

      {cancelling && status.status !== 'cancelled' && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cancelando...
        </div>
      )}

      {isProcessing && !cancelling && (
        <p className="text-center text-sm text-gray-500">
          Esta página se actualiza automáticamente cada 2 segundos. Mantenla abierta mientras se procesa tu vídeo.
        </p>
      )}
    </div>
  )
}
