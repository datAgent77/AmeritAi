"use client"

import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { HeroBackgroundModern } from "@/components/landing/hero-background-modern"

const LiquidEther = dynamic(() => import("@/components/ui/liquid-ether"), {
  ssr: false,
  loading: () => null
})

const DARK_COLORS = ["#22d3ee", "#60a5fa", "#34d399"]
const LIGHT_COLORS = ["#0ea5e9", "#3b82f6", "#14b8a6"]
type AnimationTier = "off" | "low" | "high"

function getConnectionInfo() {
  const connection = (navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
  }).connection

  return {
    saveData: connection?.saveData === true,
    effectiveType: connection?.effectiveType ?? ""
  }
}

function getDesktopAnimationTier(): AnimationTier {
  const hardwareConcurrency = navigator.hardwareConcurrency ?? 4
  const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  const { saveData, effectiveType } = getConnectionInfo()

  if (saveData || /(2g|3g)/i.test(effectiveType)) return "off"

  // Unknown memory is treated as medium/high to avoid over-fallbacking modern browsers.
  const lowMemory = typeof deviceMemory === "number" && deviceMemory <= 4
  const veryLowMemory = typeof deviceMemory === "number" && deviceMemory <= 2
  const lowCpu = hardwareConcurrency <= 4
  const veryLowCpu = hardwareConcurrency <= 2

  if (veryLowCpu || veryLowMemory) return "off"
  if (lowCpu || lowMemory) return "low"

  return "high"
}

function addMediaListener(query: MediaQueryList, listener: () => void) {
  if ("addEventListener" in query) {
    query.addEventListener("change", listener)
    return () => query.removeEventListener("change", listener)
  }

  query.addListener(listener)
  return () => query.removeListener(listener)
}

export function HeroBackgroundLiquidEther() {
  const { resolvedTheme } = useTheme()
  const [isClientReady, setIsClientReady] = useState(false)
  const [animationTier, setAnimationTier] = useState<AnimationTier>("off")
  const [isAnimationActivated, setIsAnimationActivated] = useState(false)

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const mobileWidthQuery = window.matchMedia("(max-width: 1024px)")
    const coarsePointerQuery = window.matchMedia("(pointer: coarse)")

    const updateMode = () => {
      const shouldFallback =
        reducedMotionQuery.matches || mobileWidthQuery.matches || coarsePointerQuery.matches

      setAnimationTier(shouldFallback ? "off" : getDesktopAnimationTier())
      setIsClientReady(true)
    }

    updateMode()

    const cleanupReduced = addMediaListener(reducedMotionQuery, updateMode)
    const cleanupWidth = addMediaListener(mobileWidthQuery, updateMode)
    const cleanupPointer = addMediaListener(coarsePointerQuery, updateMode)

    return () => {
      cleanupReduced()
      cleanupWidth()
      cleanupPointer()
    }
  }, [])

  useEffect(() => {
    if (!isClientReady || animationTier === "off") {
      setIsAnimationActivated(false)
      return
    }

    // Delay effect start slightly so hero text/CTA paint first.
    const timer = window.setTimeout(() => {
      setIsAnimationActivated(true)
    }, 250)

    return () => window.clearTimeout(timer)
  }, [animationTier, isClientReady])

  if (!isClientReady || animationTier === "off" || !isAnimationActivated) {
    return <HeroBackgroundModern />
  }

  const isDark = (resolvedTheme ?? "dark") === "dark"
  const isLowTier = animationTier === "low"

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none bg-background transition-colors duration-500">
      <div className="absolute inset-0">
        <LiquidEther
          className="w-full h-full"
          colors={isDark ? DARK_COLORS : LIGHT_COLORS}
          resolution={isLowTier ? 0.3 : 0.4}
          iterationsPoisson={isLowTier ? 18 : 32}
          mouseForce={isLowTier ? 14 : 18}
          cursorSize={isLowTier ? 80 : 92}
          autoDemo={true}
          autoSpeed={isLowTier ? 0.34 : 0.42}
          autoIntensity={isLowTier ? 1.35 : 1.8}
          autoResumeDelay={isLowTier ? 1500 : 1200}
          autoRampDuration={0.8}
          style={{ opacity: isDark ? (isLowTier ? 0.62 : 0.72) : isLowTier ? 0.3 : 0.38 }}
        />
      </div>

      <div
        className="absolute inset-0 opacity-5 dark:opacity-10"
        style={{
          backgroundImage: "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "34px 34px",
          color: "var(--foreground)"
        }}
      />

      <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-transparent to-background/55" />

      <div
        className="absolute -top-36 -left-32 h-[520px] w-[520px] rounded-full blur-[72px] opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(56, 189, 248, 0.22) 0%, rgba(56, 189, 248, 0) 72%)"
        }}
      />

      <div
        className="absolute -bottom-28 right-[-6rem] h-[460px] w-[460px] rounded-full blur-[72px] opacity-20"
        style={{
          background:
            "radial-gradient(circle, rgba(52, 211, 153, 0.18) 0%, rgba(52, 211, 153, 0) 72%)"
        }}
      />

      <div className="absolute bottom-0 left-0 right-0 h-56 bg-gradient-to-t from-background to-transparent" />
    </div>
  )
}
