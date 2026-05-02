import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white hover:text-blue-400 transition-colors">
            <Zap className="h-6 w-6 text-blue-500" />
            <span className="text-lg font-bold tracking-tight">EliminaMarcas</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/upload"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-blue-500 transition-colors"
            >
              Subir Vídeo
            </Link>
          </nav>
        </div>
      </div>
    </header>
  )
}
