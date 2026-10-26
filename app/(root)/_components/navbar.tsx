"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Menu, X, Stethoscope, LogIn } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

const NAV_LINKS = [
  { label: "Features", href: "#services" },
  { label: "Why Medira", href: "#why-us" },
  { label: "Platform", href: "#technology" },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-teal-100/70 bg-white/80 backdrop-blur-xl shadow-sm"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg shadow-teal-500/30"
            )}
          >
            <Stethoscope className="h-5 w-5 text-white" />
          </span>
          <span
            className={cn(
              "text-lg font-bold tracking-tight transition-colors",
              scrolled ? "text-teal-950" : "text-white"
            )}
          >
            Med<span className="text-teal-400">ira</span>
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-teal-500",
                scrolled ? "text-teal-900/80" : "text-white/90"
              )}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ size: "lg" }),
              "gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-500/30 hover:from-teal-600 hover:to-cyan-700"
            )}
          >
            <LogIn className="h-4 w-4" />
            Sign In
          </Link>
        </div>

        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg md:hidden",
            scrolled ? "text-teal-950" : "text-white"
          )}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="border-t border-teal-100 bg-white/95 px-5 py-4 backdrop-blur-xl md:hidden"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-teal-900 hover:bg-teal-50"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/sign-in"
              onClick={() => setOpen(false)}
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-2 gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white"
              )}
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Link>
          </div>
        </motion.div>
      )}
    </motion.header>
  )
}
