"use client"

import { motion } from "framer-motion"
import { Star, Quote } from "lucide-react"
import { cn } from "@/lib/utils"

const REVIEWS = [
  {
    name: "Dr. Amara Okafor",
    role: "Medical Director",
    quote: "Medira put our OPD, wards and pharmacy on one screen. Nothing slips through the cracks between departments anymore.",
    avatar: "from-teal-400 to-cyan-500",
  },
  {
    name: "David Mensah",
    role: "Hospital Administrator",
    quote: "Billing finally ties back to the actual visit. Invoices, insurance claims and the ledger all reconcile — month-end is painless now.",
    avatar: "from-cyan-400 to-sky-500",
  },
  {
    name: "Sarah Bello",
    role: "Head Nurse",
    quote: "The nurse worklist and shared patient chart changed our shifts. We see every admitted patient and record care in one place.",
    avatar: "from-emerald-400 to-teal-500",
  },
]

export function Testimonials() {
  return (
    <section id="testimonials" className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-600">
            Testimonials
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-teal-950 sm:text-4xl">
            Trusted by Care Teams
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            How clinics and hospitals run their day on Medira.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3">
          {REVIEWS.map((r, i) => (
            <motion.figure
              key={r.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative flex flex-col rounded-2xl border border-slate-100 bg-slate-50/60 p-8 shadow-sm"
            >
              <Quote className="h-8 w-8 text-teal-200" />
              <div className="mt-4 flex gap-0.5 text-amber-400">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-current" />
                ))}
              </div>
              <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">
                “{r.quote}”
              </blockquote>
              <figcaption className="mt-6 flex items-center gap-3">
                <span className={cn("flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white", r.avatar)}>
                  {r.name.charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-teal-950">{r.name}</p>
                  <p className="text-xs text-slate-500">{r.role}</p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}
