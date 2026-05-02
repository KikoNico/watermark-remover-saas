import VideoUploader from '@/components/VideoUploader'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Subir Vídeo - EliminaMarcas',
}

export default function UploadPage() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al inicio
        </Link>

        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">Sube Tu Vídeo</h1>
          <p className="mt-2 text-gray-400">
            Selecciona un vídeo para eliminar su marca de agua. Formatos: MP4, MOV, MKV, WebM, AVI &mdash; hasta 5 GB.
          </p>
        </div>

        <VideoUploader />
      </div>
    </div>
  )
}
