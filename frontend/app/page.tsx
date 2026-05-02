import Link from 'next/link'
import { ArrowRight, Cpu, ShieldCheck, Film, Upload, Zap, Download } from 'lucide-react'

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center px-4 py-24 text-center sm:py-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_rgba(37,99,235,0.12)_0%,_transparent_70%)]" />
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-800 bg-blue-950/50 px-4 py-1.5 text-sm text-blue-400 mb-6">
          <Zap className="h-3.5 w-3.5" />
          Impulsado por Florence-2 &amp; LaMA IA
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl max-w-4xl">
          Elimina Marcas de Agua de tus{' '}
          <span className="text-blue-400">Vídeos</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-gray-400 sm:text-xl">
          Sube cualquier vídeo y nuestra IA detecta y elimina automáticamente marcas de agua, logos y textos superpuestos.
          El procesamiento ocurre en tu propia GPU &mdash; tus archivos nunca salen de tu máquina.
        </p>
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:gap-4">
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-blue-500 transition-colors"
          >
            Subir Vídeo
            <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#como-funciona"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-700 px-8 py-4 text-base font-semibold text-gray-300 hover:border-gray-500 hover:text-white transition-colors"
          >
            Cómo funciona
          </a>
        </div>
      </section>

      {/* Características */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-2xl font-bold text-white sm:text-3xl mb-12">
            ¿Por qué EliminaMarcas?
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                icon: <Cpu className="h-6 w-6 text-blue-400" />,
                title: 'Detección con IA',
                description:
                  'El modelo de visión Florence-2 identifica y rastrea marcas de agua en cada fotograma, incluso cuando se mueven.',
              },
              {
                icon: <Film className="h-6 w-6 text-purple-400" />,
                title: 'Cualquier Formato',
                description:
                  'MP4, MOV, MKV, WebM, AVI — todos los formatos principales. Resolución, FPS y calidad original preservados.',
              },
              {
                icon: <ShieldCheck className="h-6 w-6 text-green-400" />,
                title: 'Privacidad Total',
                description:
                  'Tu GPU, tus archivos. El procesamiento ocurre completamente en tu máquina. Ningún vídeo se sube a la nube.',
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-6 hover:border-gray-700 transition-colors"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gray-800">
                  {f.icon}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="px-4 py-16 sm:py-20 bg-gray-900/40">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-2xl font-bold text-white sm:text-3xl mb-12">
            Cómo Funciona
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                step: '1',
                icon: <Upload className="h-6 w-6" />,
                title: 'Sube',
                description: 'Selecciona o arrastra tu vídeo. Soportado hasta 5 GB.',
              },
              {
                step: '2',
                icon: <Cpu className="h-6 w-6" />,
                title: 'La IA Procesa',
                description: 'Nuestra IA detecta y elimina la marca de agua fotograma a fotograma en tu GPU.',
              },
              {
                step: '3',
                icon: <Download className="h-6 w-6" />,
                title: 'Descarga',
                description: 'Obtén tu vídeo limpio. Misma calidad, sin marca de agua.',
              },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center text-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-900/50">
                  {s.icon}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-1">
                    Paso {s.step}
                  </p>
                  <h3 className="text-lg font-semibold text-white mb-1">{s.title}</h3>
                  <p className="text-sm text-gray-400">{s.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section className="px-4 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-2xl font-bold text-white sm:text-3xl mb-12">
            Preguntas Frecuentes
          </h2>
          <div className="space-y-4">
            {[
              {
                q: '¿Mi vídeo se sube a algún servidor externo?',
                a: 'No. El vídeo se sube a tu propio backend, que corre en tu máquina local. Todo el procesamiento con IA ocurre en tu GPU. Tu vídeo nunca llega a ningún servicio en la nube externo.',
              },
              {
                q: '¿Qué tipos de marcas de agua puede eliminar?',
                a: 'Marcas de agua estáticas (logos, texto en una esquina fija), superposiciones semitransparentes y marcas de agua dinámicas que se mueven por la pantalla. Florence-2 las detecta fotograma a fotograma y LaMA las rellena de forma natural.',
              },
              {
                q: '¿Cuánto tiempo tarda el procesamiento?',
                a: 'Depende de la duración del vídeo y de la GPU. Un vídeo de 5 minutos suele tardar entre 5 y 15 minutos en una GPU NVIDIA. Sin GPU, el procesamiento por CPU es mucho más lento.',
              },
              {
                q: '¿Qué formatos de vídeo están soportados?',
                a: 'MP4, MOV, MKV, WebM y AVI. El archivo de salida siempre es H.264 MP4 para máxima compatibilidad.',
              },
              {
                q: '¿Necesito una GPU potente?',
                a: 'Se recomienda una GPU NVIDIA compatible con CUDA (8 GB+ VRAM) para una velocidad razonable. Las GPU AMD y el modo solo CPU también están soportados, pero serán significativamente más lentos.',
              },
            ].map((item) => (
              <details
                key={item.q}
                className="group rounded-xl border border-gray-800 bg-gray-900 p-5 open:border-gray-700"
              >
                <summary className="cursor-pointer list-none font-semibold text-white flex justify-between items-center gap-2">
                  {item.q}
                  <span className="text-gray-500 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <p className="mt-3 text-sm text-gray-400 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-4 py-16 sm:py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-2xl font-bold text-white sm:text-3xl mb-4">
            ¿Listo para eliminar esa marca de agua?
          </h2>
          <p className="text-gray-400 mb-8">
            Sube tu vídeo y obtén un resultado limpio en minutos.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:bg-blue-500 transition-colors"
          >
            Empezar Gratis
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
