"use client"

import Link from "next/link"
import { motion, type Variants } from "framer-motion"
import { ArrowRight, ShieldCheck, Star, CalendarCheck, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

export function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-cyan-900">
      {/* decorative background */}
      <div className="absolute inset-0 bg-dot-grid opacity-[0.15]" />
      <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-[28rem] w-[28rem] rounded-full bg-teal-400/20 blur-3xl animate-float-slow" style={{ animationDelay: "2s" }} />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-5 pt-32 pb-20 sm:px-8 lg:grid-cols-2 lg:pt-24">
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm text-teal-100 backdrop-blur-md">
            <ShieldCheck className="h-4 w-4 text-teal-300" />
            Trusted by care teams everywhere
          </motion.div>

          <motion.h1 variants={item} className="max-w-xl text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
            One Platform to Run Your{" "}
            <span className="relative bg-gradient-to-r from-teal-300 to-cyan-200 bg-clip-text text-transparent">
              Whole Hospital
            </span>
          </motion.h1>

          <motion.p variants={item} className="mt-6 max-w-lg text-lg leading-relaxed text-teal-100/85">
            Medira brings OPD, inpatient wards, pharmacy, nursing, billing and accounting into one
            system — for clinics and hospitals of every kind, from a single practice to a full facility.
          </motion.p>

          <motion.div variants={item} className="mt-9 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/sign-in"
              className={cn(
                buttonVariants({ size: "lg" }),
                "group h-12 bg-white px-7 text-base text-teal-900 hover:bg-teal-50"
              )}
            >
              <CalendarCheck className="h-5 w-5" />
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#services"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "h-12 border-white/30 bg-transparent px-7 text-base text-white hover:bg-white/10 hover:text-white"
              )}
            >
              Explore Features
            </a>
          </motion.div>

          <motion.div variants={item} className="mt-10 flex items-center gap-5">
            <div className="flex -space-x-3">
              {["from-teal-400 to-cyan-500", "from-cyan-400 to-sky-500", "from-emerald-400 to-teal-500", "from-sky-400 to-cyan-600"].map((g, i) => (
                <span key={i} className={cn("h-10 w-10 rounded-full border-2 border-teal-900 bg-gradient-to-br", g)} />
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1 text-teal-200">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-current" />
                ))}
                <span className="ml-1 text-sm font-semibold text-white">4.9/5</span>
              </div>
              <p className="text-sm text-teal-100/70">from care teams who switched to Medira</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Visual card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }}
          className="relative hidden lg:block"
        >
          <div className="relative rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl">
            <div className="rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-teal-500">Today at a glance</p>
                  <p className="text-lg font-bold text-teal-950">Ward &amp; clinic overview</p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                  <CalendarCheck className="h-5 w-5" />
                </span>
              </div>
              <div className="my-5 h-px bg-teal-100" />
              <div className="space-y-3">
                {[
                  { name: "Outpatients seen", time: "OPD", price: "128" },
                  { name: "Beds occupied", time: "Inpatient", price: "42/60" },
                  { name: "Invoices settled", time: "Billing", price: "96%" },
                ].map((s) => (
                  <div key={s.name} className="flex items-center justify-between rounded-xl bg-teal-50/60 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-teal-950">{s.name}</p>
                      <p className="text-xs text-teal-500">{s.time}</p>
                    </div>
                    <span className="text-sm font-bold text-cyan-600">{s.price}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute -bottom-5 -left-5 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs text-teal-500">Secure</p>
                <p className="text-sm font-bold text-teal-950">Role-based access</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <a
        href="#services"
        className="absolute bottom-8 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center text-teal-200/80 transition-colors hover:text-white"
      >
        <span className="mb-1 text-xs uppercase tracking-widest">Scroll</span>
        <ChevronDown className="h-5 w-5 animate-bounce" />
      </a>
    </section>
  )
}
