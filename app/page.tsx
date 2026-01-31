import Link from 'next/link'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-deep-charcoal text-warm-cream py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-warm-cream mb-6">
            Find Your Brotherhood
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-warm-cream/90 max-w-3xl mx-auto leading-relaxed">
            We are dedicated to ending the unnecessary suffering in men to end the suffering caused by men.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button variant="primary" size="large">
                Join a Chapter
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button variant="secondary" size="large">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-16 text-earth-brown">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card hover className="text-center">
            <div className="w-16 h-16 bg-burnt-orange rounded-full mx-auto mb-6 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">1</span>
            </div>
            <h3 className="text-xl font-semibold mb-4">Find a Chapter</h3>
            <p className="text-stone-gray">
              Search for chapters near you or request a new chapter in your area.
            </p>
          </Card>

          <Card hover className="text-center">
            <div className="w-16 h-16 bg-burnt-orange rounded-full mx-auto mb-6 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">2</span>
            </div>
            <h3 className="text-xl font-semibold mb-4">Join the Brotherhood</h3>
            <p className="text-stone-gray">
              Connect with 5-12 men committed to personal growth and authentic community.
            </p>
          </Card>

          <Card hover className="text-center">
            <div className="w-16 h-16 bg-burnt-orange rounded-full mx-auto mb-6 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">3</span>
            </div>
            <h3 className="text-xl font-semibold mb-4">Meet Regularly</h3>
            <p className="text-stone-gray">
              Gather 1-2 times monthly for structured meetings, deep work, and real connection.
            </p>
          </Card>
        </div>
      </section>

      {/* Status Examples */}
      <section className="py-20 px-6 bg-bg-subtle">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-earth-brown">
            Design System Preview
          </h2>
          <Card>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-3">Status Badges</h3>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="success">Open</Badge>
                  <Badge variant="warning">Forming</Badge>
                  <Badge variant="error">Deficit</Badge>
                  <Badge variant="info">Fully Funded</Badge>
                  <Badge variant="neutral">Closed</Badge>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">Buttons</h3>
                <div className="flex flex-wrap gap-3">
                  <Button variant="primary">Primary Action</Button>
                  <Button variant="secondary">Secondary Action</Button>
                  <Button variant="tertiary">Tertiary Action</Button>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold mb-3">Typography</h3>
                <h1>Heading 1 - Merriweather Bold</h1>
                <h2>Heading 2 - Merriweather Bold</h2>
                <h3>Heading 3 - Merriweather Semibold</h3>
                <p className="mt-4">Body text uses Source Sans Pro for excellent readability and warmth. This is how regular paragraph text will appear throughout the application.</p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-deep-charcoal text-warm-cream py-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-warm-cream/80">
            © 2026 Project UNcivilized. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
