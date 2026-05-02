import { ArrowLeft, Upload } from 'lucide-react'
import Link from 'next/link'
import StatusTracker from '@/components/StatusTracker'

export const metadata = {
  title: 'Estado del Procesamiento - EliminaMarcas',
}

interface Props {
  params: Promise<{ jobId: string }>
}

export default async function StatusPage({ params }: Props) {
  const { jobId } = await params

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Subir otro
          </Link>
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            Nuevo vídeo
          </Link>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Estado del Procesamiento</h1>
          <p className="mt-2 text-sm text-gray-500">
            Tu vídeo está siendo procesado. Esta página se actualiza automáticamente.
          </p>
        </div>

        <StatusTracker jobId={jobId} />
      </div>
    </div>
  )
}
