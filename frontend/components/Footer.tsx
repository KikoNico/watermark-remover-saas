export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-gray-950 py-8 mt-auto">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:justify-between">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} EliminaMarcas. Todos los derechos reservados.
          </p>
          <p className="text-sm text-gray-600">
            Impulsado por Florence-2 &amp; LaMA &mdash; procesamiento 100% local
          </p>
        </div>
      </div>
    </footer>
  )
}
