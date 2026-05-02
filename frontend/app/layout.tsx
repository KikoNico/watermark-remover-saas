import type { Metadata } from 'next'
import '../styles/globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Eliminador de Marcas de Agua - Elimina Marcas de Agua de Vídeos',
  description:
    'Eliminación de marcas de agua con IA. Sube tu vídeo y obtén una versión limpia en minutos. Procesamiento 100% local — tus archivos nunca salen de tu máquina.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-gray-950 text-white flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
