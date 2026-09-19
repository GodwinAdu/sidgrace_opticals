"use client"

import { motion } from "framer-motion"
import {
  HeartHandshake,
  Clock,
  Award,
  Wallet,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react"

const REASONS = [
  { icon: Award, title: "Board-Certified Specialists", desc: "A multidisciplinary team with decades of combined clinical experience." },
  { icon: HeartHandshake, title: "Patient-First Comfort", desc: "Sedation options, calm rooms, and honest guidance at every step." },
  { icon: Clock, title: "Flexible Scheduling", desc: "Evening and weekend slots with same-day emergency appointments." },
  { icon: Wallet, title: "Transparent Pricing", desc: "Clear estimates, flexible payment plans, and insurance support." },
]

const STATS = [
  { value: "15+", label: "Years of Excellence" },
  { value: "20k+", label: "Patients Treated" },
  { value: "12", label: "Specialist Dentists" },
  { value: "98%", label: "Patient Satisfaction" },
]

export function WhyUs() {
  return (
    <section id="why-us" className="relative overflow-hidden bg-slate-50 py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-600">
              Why Choose Us
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight text-teal-950 sm:text-4xl">
              Care You Can Trust, Comfort You Can Feel
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              We combine clinical precision with genuine compassion. Every treatment plan is built
              around your goals, budget, and long-term health.
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {REASONS.map((r, i) => (
                <motion.div
                  key={r.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="flex gap-4"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-teal-600 shadow-sm ring-1 ring-slate-100">
                    <r.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-teal-950">{r.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{r.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* stat card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-600 to-cyan-700 p-10 shadow-2xl shadow-teal-600/25">
              <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
              <div className="relative grid grid-cols-2 gap-8">
                {STATS.map((s) => (
                  <div key={s.label}>
                    <p className="text-4xl font-bold text-white">{s.value}</p>
                    <p className="mt-1 text-sm text-teal-100/80">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="relative mt-8 space-y-3 border-t border-white/15 pt-6">
                {["Latest sterilization standards", "Same-day crowns available", "Family & pediatric friendly"].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-sm text-teal-50">
                    <CheckCircle2 className="h-4 w-4 text-teal-200" />
                    {t}
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -bottom-5 -right-5 flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-xl">
              <ShieldCheck className="h-8 w-8 text-teal-500" />
              <div>
                <p className="text-sm font-bold text-teal-950">Fully Accredited</p>
                <p className="text-xs text-slate-500">Certified dental practice</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
