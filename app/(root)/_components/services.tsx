"use client"

import { motion } from "framer-motion"
import {
  Stethoscope,
  BedDouble,
  Pill,
  ReceiptText,
  ClipboardList,
  BarChart3,
  ArrowUpRight,
} from "lucide-react"

const SERVICES = [
  {
    icon: Stethoscope,
    title: "OPD & Consultations",
    desc: "Check-in, vitals, consultation notes, diagnosis and orders — one shared record per visit for doctors and nurses.",
  },
  {
    icon: BedDouble,
    title: "Inpatient & Wards",
    desc: "Admissions, ward and bed management, transfers, discharge, and a nurse worklist for every admitted patient.",
  },
  {
    icon: Pill,
    title: "Pharmacy",
    desc: "Prescriptions flow from the doctor to the pharmacy queue; dispensing updates stock and bills the visit automatically.",
  },
  {
    icon: ReceiptText,
    title: "Billing & Invoicing",
    desc: "Invoice-driven billing with payments, insurance claims, and automatic charges for consultation, procedures and beds.",
  },
  {
    icon: ClipboardList,
    title: "Records & Clinical",
    desc: "Patient history, lab and imaging results, treatment plans and clinical notes kept together and easy to find.",
  },
  {
    icon: BarChart3,
    title: "Accounting & Reports",
    desc: "Cash-basis ledger, income statement, balance sheet and operational reports to run the business side with confidence.",
  },
]

export function Services() {
  return (
    <section id="services" className="relative bg-white py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-1.5 text-sm font-medium text-teal-600">
            What Dapfam Does
          </span>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-teal-950 sm:text-4xl">
            Run the Whole Hospital in One Place
          </h2>
          <p className="mt-4 text-lg text-slate-500">
            Every department connected — from the front desk to the ward to the finance office — in a single system.
          </p>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-7 shadow-sm transition-all hover:-translate-y-1.5 hover:border-teal-200 hover:shadow-xl hover:shadow-teal-500/10"
            >
              <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
              <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/25">
                <s.icon className="h-6 w-6" />
              </span>
              <h3 className="relative mt-6 flex items-center gap-1.5 text-xl font-semibold text-teal-950">
                {s.title}
                <ArrowUpRight className="h-4 w-4 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </h3>
              <p className="relative mt-3 text-sm leading-relaxed text-slate-500">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
