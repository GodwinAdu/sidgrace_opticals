import { Navbar } from "./_components/navbar"
import { Hero } from "./_components/hero"
import { Services } from "./_components/services"
import { WhyUs } from "./_components/why-us"
import { Technology } from "./_components/technology"
import { Testimonials } from "./_components/testimonials"
import { CtaFooter } from "./_components/cta-footer"

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Services />
      <WhyUs />
      <Technology />
      <Testimonials />
      <CtaFooter />
    </main>
  )
}
