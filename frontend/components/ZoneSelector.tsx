'use client'

import { useRef, useState, MouseEvent } from 'react'
import { Zone } from '@/lib/api'

interface DrawingState {
  startX: number
  startY: number
  curX: number
  curY: number
}

interface DisplayZone extends Zone {
  id: number
}

interface Props {
  frameUrl: string
  videoWidth: number
  videoHeight: number
  onConfirm: (zones: Zone[]) => void
  loading?: boolean
}

export default function ZoneSelector({ frameUrl, videoWidth, videoHeight, onConfirm, loading }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [zones, setZones] = useState<DisplayZone[]>([])
  const [drawing, setDrawing] = useState<DrawingState | null>(null)
  const nextId = useRef(0)

  function getRelativeCoords(e: MouseEvent): { x: number; y: number } {
    const img = imgRef.current
    if (!img) return { x: 0, y: 0 }
    const rect = img.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    }
  }

  function onMouseDown(e: MouseEvent) {
    e.preventDefault()
    const { x, y } = getRelativeCoords(e)
    setDrawing({ startX: x, startY: y, curX: x, curY: y })
  }

  function onMouseMove(e: MouseEvent) {
    if (!drawing) return
    const { x, y } = getRelativeCoords(e)
    setDrawing((prev) => (prev ? { ...prev, curX: x, curY: y } : null))
  }

  function finishDrawing(e: MouseEvent) {
    if (!drawing) return
    const { x, y } = getRelativeCoords(e)
    const minX = Math.min(drawing.startX, x)
    const minY = Math.min(drawing.startY, y)
    const w = Math.abs(x - drawing.startX)
    const h = Math.abs(y - drawing.startY)
    if (w > 10 && h > 10) {
      setZones((prev) => [...prev, { id: nextId.current++, x: minX, y: minY, w, h }])
    }
    setDrawing(null)
  }

  function removeZone(id: number) {
    setZones((prev) => prev.filter((z) => z.id !== id))
  }

  function handleConfirm() {
    const img = imgRef.current
    if (!img) return
    const rect = img.getBoundingClientRect()
    const scaleX = videoWidth / rect.width
    const scaleY = videoHeight / rect.height
    const videoZones: Zone[] = zones.map((z) => ({
      x: Math.round(z.x * scaleX),
      y: Math.round(z.y * scaleY),
      w: Math.round(z.w * scaleX),
      h: Math.round(z.h * scaleY),
    }))
    onConfirm(videoZones)
  }

  const drawRect = drawing
    ? {
        x: Math.min(drawing.startX, drawing.curX),
        y: Math.min(drawing.startY, drawing.curY),
        w: Math.abs(drawing.curX - drawing.startX),
        h: Math.abs(drawing.curY - drawing.startY),
      }
    : null

  return (
    <div className="space-y-4">
      <div
        className="relative w-full cursor-crosshair select-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={finishDrawing}
        onMouseLeave={finishDrawing}
      >
        <img
          ref={imgRef}
          src={frameUrl}
          alt="Frame del vídeo"
          className="w-full rounded-lg block"
          draggable={false}
        />

        {zones.map((z) => (
          <div
            key={z.id}
            className="absolute border-2 border-blue-400 bg-blue-400/20"
            style={{ left: z.x, top: z.y, width: z.w, height: z.h }}
          >
            <button
              className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-400 rounded-full w-6 h-6 text-white text-sm flex items-center justify-center leading-none"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                removeZone(z.id)
              }}
            >
              ×
            </button>
          </div>
        ))}

        {drawRect && (
          <div
            className="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/10 pointer-events-none"
            style={{ left: drawRect.x, top: drawRect.y, width: drawRect.w, height: drawRect.h }}
          />
        )}
      </div>

      <p className="text-sm text-gray-400">
        {zones.length === 0
          ? 'Arrastra sobre la imagen para marcar las zonas donde aparece la marca de agua'
          : `${zones.length} zona${zones.length > 1 ? 's' : ''} marcada${zones.length > 1 ? 's' : ''} — puedes añadir más`}
      </p>

      <button
        onClick={handleConfirm}
        disabled={zones.length === 0 || loading}
        className="w-full rounded-xl bg-blue-600 py-3 text-base font-semibold text-white shadow-lg
          hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
      >
        {loading ? 'Iniciando procesado...' : 'Procesar vídeo'}
      </button>
    </div>
  )
}
