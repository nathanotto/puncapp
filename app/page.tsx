export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-warm-cream">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-earth-brown mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
          PUNCapp
        </h1>
        <p className="text-2xl text-stone-gray mb-8">Task-Oriented Design Rebuild</p>
        <div className="text-stone-gray">
          <p className="mb-2">Application cleared and ready for rebuild.</p>
          <p className="text-sm">Database and infrastructure intact.</p>
        </div>
      </div>
    </div>
  )
}
