"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, Stethoscope, Phone, Mail, MapPin, Clock, CalendarCheck } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const FOOTER_LINKS = {
  Services: ["General Dentistry", "Cosmetic Dentistry", "Orthodontics", "Dental Implants"],
  Clinic: ["About Us", "Our Team", "Technology", "Careers"],
  Support: ["Contact", "Book Appointment", "Insurance", "FAQ"],
}

export function CtaFooter() {
  return (
    <footer id="contact" className="bg-teal-950">
      {/* CTA */}
      <div className="mx-auto max-w-7xl px-5 pt-24 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-500 to-cyan-600 px-8 py-14 text-center shadow-2xl sm:px-14"
        >
          <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-teal-900/25 blur-3xl" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ready to Transform Your Smile?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-teal-50/90">
              Book your appointment today and take the first step toward a healthier, brighter smile.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link
                href="/sign-in"
                className={cn(buttonVariants({ size: "lg" }), "group h-12 bg-white px-7 text-base text-teal-700 hover:bg-teal-50")}
              >
                <CalendarCheck className="h-5 w-5" />
                Book Appointment
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="tel:+10000000000"
                className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 border-white/40 bg-transparent px-7 text-base text-white hover:bg-white/10 hover:text-white")}
              >
                <Phone className="h-5 w-5" />
                Call Us Now
              </a>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600">
                <Stethoscope className="h-5 w-5 text-white" />
              </span>
              <span className="text-lg font-bold text-white">
                Sid<span className="text-teal-400">Grace</span> Dental
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-teal-100/60">
              Modern, compassionate dental care for the whole family. Your comfort and healthy smile are our priority.
            </p>
            <div className="mt-6 space-y-2.5 text-sm text-teal-100/70">
              <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-teal-400" /> 123 Smile Avenue, Suite 200</p>
              <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-teal-400" /> care@sidgracedental.com</p>
              <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-teal-400" /> Mon–Sat: 8:00 AM – 7:00 PM</p>
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([heading, links]) => (
            <div key={heading}>
              <h4 className="text-sm font-semibold text-white">{heading}</h4>
              <ul className="mt-4 space-y-3">
                {links.map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-teal-100/60 transition-colors hover:text-teal-300">
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm text-teal-100/50 sm:flex-row">
          <p>© {new Date().getFullYear()} SidGrace Dental. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="transition-colors hover:text-teal-300">Privacy Policy</a>
            <a href="#" className="transition-colors hover:text-teal-300">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
