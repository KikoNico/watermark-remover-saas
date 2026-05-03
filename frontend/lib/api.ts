const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface UploadResponse {
  job_id: string
  status: string
  message: string
}

export interface StatusResponse {
  job_id: string
  status: string
  progress: number
  created_at: string
  started_at: string | null
  completed_at: string | null
  error: string | null
}

export interface FrameResponse {
  frame_base64: string
  video_width: number
  video_height: number
}

export interface Zone {
  x: number
  y: number
  w: number
  h: number
}

export async function getJobFrame(
  jobId: string
): Promise<{ url: string; videoWidth: number; videoHeight: number }> {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}/frame`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  const data: FrameResponse = await res.json()
  return {
    url: `data:image/jpeg;base64,${data.frame_base64}`,
    videoWidth: data.video_width,
    videoHeight: data.video_height,
  }
}

export async function startJob(jobId: string, zones: Zone[]): Promise<void> {
  const res = await fetch(`${API_URL}/api/jobs/${jobId}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ zones }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
}

export async function cancelJob(jobId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/cancel/${jobId}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
}

export async function getJobStatus(jobId: string): Promise<StatusResponse> {
  const res = await fetch(`${API_URL}/api/status/${jobId}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function uploadVideo(
  file: File,
  onProgress: (pct: number) => void
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          reject(new Error('Invalid response from server'))
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText)
          reject(new Error(err.detail || `Upload failed (${xhr.status})`))
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`))
        }
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

    xhr.open('POST', `${API_URL}/api/upload`)
    xhr.send(formData)
  })
}
