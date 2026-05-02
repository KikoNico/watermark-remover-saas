import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  const { jobId } = params

  try {
    const backendRes = await fetch(`${API_URL}/api/download/${jobId}`)

    if (!backendRes.ok) {
      const body = await backendRes.json().catch(() => ({ detail: 'Download failed' }))
      return NextResponse.json(
        { error: body.detail || 'Download failed' },
        { status: backendRes.status }
      )
    }

    const contentType = backendRes.headers.get('content-type') || 'video/mp4'
    const contentDisposition =
      backendRes.headers.get('content-disposition') ||
      `attachment; filename="video_no_watermark.mp4"`

    return new NextResponse(backendRes.body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
      },
    })
  } catch (err: unknown) {
    console.error('Download proxy error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
