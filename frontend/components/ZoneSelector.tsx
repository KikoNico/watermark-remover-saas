'use client'

import { useRef, useState, MouseEvent } from 'react'
import { Zone } from '@/lib/api'

interface DisplayZone {
  id: number
  x: number
  y: number
  w: number
  h: number
  blur: number
}

interface DrawingState {
  startX: number
  startY: number
  curX: number
  curY: number
}

interface Props {
  frames: string[]
  videoWidth: number
  videoHeight: number
  onConfirm: (zones: Zone[]) => void
  loading?: boolean
}

const DEFAULT_BLUR = 20

export default function ZoneSelector({ frames, videoWidth, videoHeight, onConfirm, loading }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [imgWidth, setImgWidth] = useState(0)
  const [frameIndex, setFrameIndex] = useState(0)
  const [zones, setZones] = useState<DisplayZone[]>([])
  const [drawing, setDrawing] = useState<DrawingState | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null)
  const nextId = useRef(0)

  const currentFrame = frames[frameIndex] ?? frames[0]

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
    setActiveId(null)
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
      const id = nextId.current++
      setZones((prev) => [...prev, { id, x: minX, y: minY, w, h, blur: DEFAULT_BLUR }])
      setActiveId(id)
    }
    setDrawing(null)
  }

  function removeZone(id: number) {
    setZones((prev) => prev.filter((z) => z.id !== id))
    setActiveId(null)
  }

  function updateBlur(id: number, blur: number) {
    setZones((prev) => prev.map((z) => (z.id === id ? { ...z, blur } : z)))
  }

  function handleConfirm() {
    const img = imgRef.current
    if (!img) return
    const rect = img.getBoundingClientRect()
    const scaleX = videoWidth / rect.width
    const scaleY = videoHeight / rect.height
    onConfirm(
      zones.map((z) => ({
        x: Math.round(z.x * scaleX),
        y: Math.round(z.y * scaleY),
        w: Math.round(z.w * scaleX),
        h: Math.round(z.h * scaleY),
        blur: z.blur,
      }))
    )
  }

  const activeZone = zones.find((z) => z.id === activeId) ?? null

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
      {/* Main frame + zone drawing */}
      <div
        className="relative w-full cursor-crosshair select-none"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={finishDrawing}
        onMouseLeave={finishDrawing}
      >
        <img
          ref={imgRef}
          src={currentFrame}
          alt="Frame del vídeo"
          className="w-full rounded-lg block"
          draggable={false}
          onLoad={() => setImgWidth(imgRef.current?.getBoundingClientRect().width ?? 0)}
        />

        {zones.map((z) => (
          <div
            key={z.id}
            className={`absolute overflow-hidden cursor-pointer border-2 transition-colors ${
              z.id === activeId ? 'border-yellow-400' : 'border-blue-400'
            }`}
            style={{ left: z.x, top: z.y, width: z.w, height: z.h }}
            onMouseDown={(e) => {
              e.stopPropagation()
              setActiveId(z.id)
            }}
          >
            {imgWidth > 0 && (
              <img
                src={currentFrame}
                alt=""
                draggable={false}
                style={{
                  position: 'absolute',
                  left: -z.x,
                  top: -z.y,
                  width: imgWidth,
                  filter: `blur(${z.blur * 0.4}px)`,
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
        ))}

        {drawRect && (
          <div
            className="absolute border-2 border-dashed border-yellow-400 bg-yellow-400/10 pointer-events-none"
            style={{ left: drawRect.x, top: drawRect.y, width: drawRect.w, height: drawRect.h }}
          />
        )}
      </div>

      {/* Frame thumbnail strip */}
      {frames.length > 1 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500">
            Frame {frameIndex + 1} de {frames.length} — haz clic para navegar por el vídeo
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {frames.map((f, i) => (
              <button
                key={i}
                onClick={() => setFrameIndex(i)}
                className={`flex-shrink-0 rounded overflow-hidden border-2 transition-colors ${
                  i === frameIndex ? 'border-blue-400' : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <img
                  src={f}
                  alt={`Frame ${i + 1}`}
                  className="h-14 w-auto block"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls for selected zone */}
      {activeZone ? (
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">Intensidad del desenfoque</span>
            <button
              onClick={() => removeZone(activeZone.id)}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Eliminar zona
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Suave</span>
            <input
              type="range"
              min={2}
              max={50}
              value={activeZone.blur}
              onChange={(e) => updateBlur(activeZone.id, Number(e.target.value))}
              className="flex-1 accent-blue-500"
            />
            <span className="text-xs text-gray-500">Fuerte</span>
            <span className="text-xs text-gray-400 w-6 text-right">{activeZone.blur}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-400">
          {zones.length === 0
            ? 'Arrastra para marcar zonas. Navega por los frames para ver dónde aparece la marca.'
            : `${zones.length} zona${zones.length > 1 ? 's' : ''} marcada${zones.length > 1 ? 's' : ''} — haz clic en una para ajustar el desenfoque`}
        </p>
      )}

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
