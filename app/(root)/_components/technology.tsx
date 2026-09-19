"use client"

import { motion } from "framer-motion"
import { ScanLine, Cpu, Microscope, MonitorSmartphone } from "lucide-react"

const TECH = [
  { icon: ScanLine, title: "3D Digital Imaging", desc: "Low-radiation cone-beam CT scans for precise diagnostics and planning." },
  { icon: Microscope, title: "Intraoral Scanners", desc: "Goodbye to messy molds — fast, comfortable digital impressions." },
  { icon: Cpu, title: "Same-Day CAD/CAM Crowns", desc: "Milled and fitted crowns in a single visit, no temporaries needed." },
  { icon: MonitorSmartphone, title: "Smart Patient Portal", desc: "Book, view records, and manage treatment plans from any device." },
]

export function Technology() {
  return (
    <section id="technology" className="relative overflow-hidden bg-teal-950 py-24">
      <div className="absolute inset-0 bg-dot-grid opacity-10" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-teal-200 backdrop-blur">
            Technology
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Advanced Dentistry, Powered by Innovation
          </h2>
          <p className="mt-4 text-lg text-teal-100/75">
            We invest in the tools that make your visit faster, safer, and more comfortable.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TECH.map((t, i) => (
            <motion.div
              key={t.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm transition-colors hover:border-teal-400/40 hover:bg-white/10"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-400 to-cyan-500 text-white">
                <t.icon className="h-6 w-6" />
              </span>
              <h3 className="mt-5 text-lg font-semibold text-white">{t.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-teal-100/70">{t.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
