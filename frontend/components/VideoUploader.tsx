'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { UploadCloud, FileVideo, AlertCircle, CheckCircle } from 'lucide-react'
import { uploadVideo } from '@/lib/api'
import { formatFileSize, SUPPORTED_FORMATS, MAX_FILE_SIZE, getFileExtension } from '@/lib/utils'

interface Props {
  onUpload?: (jobId: string) => void
}

export default function VideoUploader({ onUpload }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  function validate(f: File): string | null {
    const ext = getFileExtension(f.name)
    if (!SUPPORTED_FORMATS.includes(ext)) {
      return `Formato ".${ext}" no soportado. Formatos válidos: ${SUPPORTED_FORMATS.join(', ')}`
    }
    if (f.size > MAX_FILE_SIZE) {
      return `Archivo demasiado grande (${formatFileSize(f.size)}). El máximo es 5 GB.`
    }
    if (f.size === 0) {
      return 'El archivo está vacío.'
    }
    return null
  }

  function handleFileSelect(f: File) {
    const err = validate(f)
    if (err) {
      setError(err)
      setFile(null)
    } else {
      setError(null)
      setFile(f)
    }
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(true)
  }

  function onDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFileSelect(dropped)
  }

  function onInputChange(e: ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) handleFileSelect(selected)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const result = await uploadVideo(file, setUploadProgress)
      if (onUpload) {
        onUpload(result.job_id)
      } else {
        router.push(`/zones/${result.job_id}`)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al subir el vídeo. Inténtalo de nuevo.')
      setUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      <div
        className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-10 transition-colors cursor-pointer
          ${isDragging ? 'border-blue-400 bg-blue-950/30' : 'border-gray-700 bg-gray-900 hover:border-gray-500 hover:bg-gray-800/50'}
          ${uploading ? 'pointer-events-none opacity-60' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={SUPPORTED_FORMATS.map((f) => `.${f}`).join(',')}
          className="hidden"
          onChange={onInputChange}
          disabled={uploading}
        />

        {file ? (
          <>
            <FileVideo className="h-12 w-12 text-blue-400" />
            <div className="text-center">
              <p className="font-semibold text-white">{file.name}</p>
              <p className="text-sm text-gray-400">{formatFileSize(file.size)}</p>
            </div>
            <CheckCircle className="h-5 w-5 text-green-400" />
          </>
        ) : (
          <>
            <UploadCloud className="h-12 w-12 text-gray-500" />
            <div className="text-center">
              <p className="text-base font-medium text-gray-300">
                Arrastra y suelta tu vídeo aquí
              </p>
              <p className="mt-1 text-sm text-gray-500">
                o haz clic para explorar &mdash; {SUPPORTED_FORMATS.join(', ')} hasta 5 GB
              </p>
            </div>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-950 border border-red-800 p-3 text-sm text-red-300">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {uploading && (
        <div className="space-y-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-right text-xs text-gray-400">Subiendo... {uploadProgress}%</p>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || uploading}
        className="w-full rounded-xl bg-blue-600 py-3 text-base font-semibold text-white shadow-lg
          hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
      >
        {uploading ? 'Subiendo...' : 'Eliminar Marca de Agua'}
      </button>
    </div>
  )
}
