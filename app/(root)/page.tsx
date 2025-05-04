"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { motion } from "framer-motion"
import { ArrowRight, Eye, ChevronDown } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

export default function AdvancedHero() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled)
      }
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [scrolled])

  return (
    <div className="relative h-screen w-full overflow-hidden bg-blue-950">
      {/* Background image with parallax effect */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero-eye-examination.jpg"
          alt="Advanced eye examination"
          fill
          priority
          className="object-cover object-center transform scale-[1.02] transition-transform duration-[25000ms] ease-in-out animate-subtle-zoom"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-950/80 to-blue-900/50 backdrop-blur-[2px]" />
      </div>

      {/* Animated particles */}
      <div className="absolute inset-0 z-10 opacity-30">
        <div className="particles-container">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                width: `${Math.random() * 5 + 2}px`,
                height: `${Math.random() * 5 + 2}px`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${Math.random() * 10 + 10}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-20 flex h-full flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mb-2 flex items-center justify-center"
        >
          <div className="mr-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 backdrop-blur-md">
            <Eye className="h-6 w-6 text-blue-200" />
          </div>
          <span className="text-lg font-medium uppercase tracking-widest text-blue-200">Sid Grace Opticals</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mb-6 max-w-4xl bg-gradient-to-r from-white to-blue-200 bg-clip-text text-5xl font-bold leading-tight tracking-tight text-transparent sm:text-6xl md:text-7xl"
        >
          Advanced Vision Care for a{" "}
          <span className="relative text-white/70">
            Clearer Tomorrow
            <svg
              className="absolute -bottom-2 left-0 h-3 w-full text-blue-400 opacity-70"
              viewBox="0 0 100 12"
              preserveAspectRatio="none"
            >
              <path
                d="M0,0 Q50,12 100,0"
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mb-10 max-w-2xl text-lg text-blue-100/90 md:text-xl"
        >
          Experience state-of-the-art eye care with our team of specialists using cutting-edge technology for
          comprehensive diagnostics and personalized treatment plans.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0"
        >
          <Link
            href='/sign-in'
            className={cn(buttonVariants({size:"lg"}),"group relative overflow-hidden bg-white px-8 text-blue-900 hover:bg-blue-50 hover:text-blue-950")}
          >
            <span className="relative z-10">Sign In</span>
            <span className="absolute bottom-0 left-0 h-1 w-full origin-left scale-x-0 transform bg-blue-600 transition-transform duration-300 ease-out group-hover:scale-x-100"></span>
          </Link>
        
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
          className="absolute bottom-8 left-0 right-0 flex justify-center"
        >
          <button
            onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}
            className="flex flex-col items-center text-blue-200 transition-colors duration-300 hover:text-white"
          >
            <span className="mb-2 text-sm">Discover More</span>
            <ChevronDown className="h-5 w-5 animate-bounce" />
          </button>
        </motion.div>
      </div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        className="absolute bottom-0 left-0 right-0 z-20 hidden bg-gradient-to-r from-blue-950/80 to-blue-900/80 backdrop-blur-md md:block"
      >
        <div className="container mx-auto grid grid-cols-4 divide-x divide-blue-700/30">
          {[
            { value: "15+", label: "Years Experience" },
            { value: "20k+", label: "Patients Treated" },
            { value: "12", label: "Specialist Doctors" },
            { value: "98%", label: "Patient Satisfaction" },
          ].map((stat, index) => (
            <div key={index} className="py-6 text-center">
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-blue-200">{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <div
        className={`absolute left-8 top-1/2 z-20 hidden -translate-y-1/2 transform md:block ${
          scrolled ? "opacity-0" : "opacity-100"
        } transition-opacity duration-300`}
      >
        <div className="flex flex-col items-center">
          <div className="h-24 w-px bg-gradient-to-b from-transparent via-blue-400 to-transparent"></div>
          <div className="mt-4 rotate-90 transform text-xs uppercase tracking-widest text-blue-200">Scroll</div>
        </div>
      </div>
    </div>
  )
}
