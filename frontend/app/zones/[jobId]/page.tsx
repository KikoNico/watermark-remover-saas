'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { AlertCircle } from 'lucide-react'
import ZoneSelector from '@/components/ZoneSelector'
import { getJobFrame, startJob, Zone } from '@/lib/api'

interface Props {
  params: Promise<{ jobId: string }>
}

export default function ZonesPage({ params }: Props) {
  const { jobId } = use(params)
  const router = useRouter()

  const [frameData, setFrameData] = useState<{
    url: string
    videoWidth: number
    videoHeight: number
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getJobFrame(jobId)
      .then((data) => setFrameData(data))
      .catch((err: Error) => setError(err.message))
  }, [jobId])

  async function handleConfirm(zones: Zone[]) {
    setLoading(true)
    try {
      await startJob(jobId, zones)
      router.push(`/status/${jobId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al iniciar el procesado')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Marca las zonas a desenfocar</h1>
          <p className="mt-2 text-sm text-gray-400">
            Arrastra sobre el frame para seleccionar dónde aparece la marca de agua.
            Puedes marcar varias zonas.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-950 border border-red-800 p-3 text-sm text-red-300">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!frameData && !error && (
          <div className="text-center text-gray-400 py-16">Cargando frame del vídeo...</div>
        )}

        {frameData && (
          <ZoneSelector
            frameUrl={frameData.url}
            videoWidth={frameData.videoWidth}
            videoHeight={frameData.videoHeight}
            onConfirm={handleConfirm}
            loading={loading}
          />
        )}
      </div>
    </div>
  )
}
