"use client"

import Link from "next/link"
import { motion, type Variants } from "framer-motion"
import {
  ArrowRight,
  LogIn,
  ShieldCheck,
  Stethoscope,
  BedDouble,
  Pill,
  ReceiptText,
  Activity,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
}

const MODULES = [
  { icon: Stethoscope, label: "OPD & Consultations" },
  { icon: BedDouble, label: "Inpatient & Wards" },
  { icon: Pill, label: "Pharmacy" },
  { icon: ReceiptText, label: "Billing & Invoicing" },
]

const STATS = [
  { label: "Outpatients today", value: "128", sub: "OPD" },
  { label: "Beds occupied", value: "42/60", sub: "Inpatient" },
  { label: "Invoices settled", value: "96%", sub: "Billing" },
]

export function MediraHero() {
  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-br from-teal-950 via-teal-900 to-cyan-900">
      {/* decorative background */}
      <div className="absolute inset-0 bg-dot-grid opacity-[0.15]" />
      <div className="pointer-events-none absolute -left-32 top-10 h-96 w-96 rounded-full bg-cyan-400/20 blur-3xl animate-float-slow" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-[28rem] w-[28rem] rounded-full bg-teal-400/20 blur-3xl animate-float-slow" style={{ animationDelay: "2s" }} />

      {/* Top bar: brand + Sign In (no marketing nav) */}
      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/30">
            <Stethoscope className="h-5 w-5 text-white" />
          </span>
          <span className="text-lg font-bold tracking-tight text-white">
            Med<span className="text-teal-400">ira</span>
          </span>
        </div>
        <Link
          href="/sign-in"
          className={cn(
            buttonVariants({ size: "lg" }),
            "gap-2 bg-white text-teal-900 shadow-lg hover:bg-teal-50"
          )}
        >
          <LogIn className="h-4 w-4" />
          Sign In
        </Link>
      </header>

      {/* Hero */}
      <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 items-center gap-12 px-5 pb-16 sm:px-8 lg:grid-cols-2">
        {/* Left: copy */}
        <motion.div variants={container} initial="hidden" animate="show">
          <motion.div variants={item} className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm text-teal-100 backdrop-blur-md">
            <ShieldCheck className="h-4 w-4 text-teal-300" />
            Hospital management, simplified
          </motion.div>

          <motion.h1 variants={item} className="max-w-xl text-4xl font-bold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl">
            Run your whole hospital with{" "}
            <span className="relative bg-gradient-to-r from-teal-300 to-cyan-200 bg-clip-text text-transparent">
              Medira
            </span>
          </motion.h1>

          <motion.p variants={item} className="mt-6 max-w-lg text-lg leading-relaxed text-teal-100/85">
            OPD, inpatient wards, pharmacy, nursing, billing and accounting — one connected
            platform for clinics and hospitals of every kind.
          </motion.p>

          <motion.div variants={item} className="mt-9">
            <Link
              href="/sign-in"
              className={cn(
                buttonVariants({ size: "lg" }),
                "group h-12 bg-white px-7 text-base text-teal-900 hover:bg-teal-50"
              )}
            >
              <LogIn className="h-5 w-5" />
              Sign In to Continue
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>

          {/* Module chips */}
          <motion.div variants={item} className="mt-10 flex flex-wrap gap-2.5">
            {MODULES.map((m) => (
              <span
                key={m.label}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-sm text-teal-100/90 backdrop-blur-md"
              >
                <m.icon className="h-4 w-4 text-teal-300" />
                {m.label}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Right: product-style card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.3 }}
          className="relative hidden lg:block"
        >
          <div className="relative rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-xl">
            <div className="rounded-2xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
                    <Activity className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-teal-950">Today at a glance</p>
                    <p className="text-xs text-teal-500">Live hospital overview</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-600">Online</span>
              </div>

              <div className="my-5 h-px bg-teal-100" />

              <div className="space-y-3">
                {STATS.map((s) => (
                  <div key={s.label} className="flex items-center justify-between rounded-xl bg-teal-50/60 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-teal-950">{s.label}</p>
                      <p className="text-xs text-teal-500">{s.sub}</p>
                    </div>
                    <span className="text-base font-bold text-cyan-600">{s.value}</span>
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
    </main>
  )
}
