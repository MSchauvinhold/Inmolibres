import { cn } from "@/lib/utils"

interface LogoMarkProps {
  size?: number
  className?: string
}

function LogoMark({ size = 28, className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
    >
      {/* Arco/portal — forma principal en terracota */}
      <path
        d="M6 36 L6 18 A14 14 0 0 1 34 18 L34 36 Z"
        fill="#C1694F"
      />
      {/* Umbral interior — ventana blanca */}
      <rect x="16" y="22" width="11" height="14" fill="var(--crema-50, #FBF8F2)" />
      {/* Cuadrado acento — clave/pin */}
      <rect x="27" y="6" width="6" height="6" fill="#221E19" />
    </svg>
  )
}

interface LogoProps {
  size?: number
  variant?: "lockup" | "mark" | "compact"
  onDark?: boolean
  showSubtitle?: boolean
  className?: string
}

export function Logo({
  size = 28,
  variant = "lockup",
  onDark = false,
  showSubtitle = false,
  className,
}: LogoProps) {
  const ink = onDark ? "var(--crema-50, #FBF8F2)" : "var(--antracita-900, #14110E)"

  if (variant === "mark") {
    return <LogoMark size={size} className={className} />
  }

  if (variant === "compact") {
    return (
      <span className={cn("inline-flex items-center gap-2", className)}>
        <LogoMark size={size * 0.95} />
        <span className="flex flex-col leading-none">
          <span
            className="font-semibold tracking-tight"
            style={{
              fontFamily: "var(--font-fraunces-display), Georgia, serif",
              fontSize: size * 0.54,
              color: ink,
              letterSpacing: "-0.025em",
            }}
          >
            Inmo
            <span style={{ color: "var(--libres-color, #C1694F)" }}>Libres</span>
          </span>
          {showSubtitle && (
            <span
              className="uppercase tracking-widest"
              style={{
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: size * 0.33,
                color: "var(--antracita-300, #6F665C)",
                marginTop: 3,
                letterSpacing: "0.12em",
              }}
            >
              Tierra Moderna
            </span>
          )}
        </span>
      </span>
    )
  }

  // lockup — default
  return (
    <span className={cn("inline-flex items-center", className)} style={{ gap: size * 0.36 }}>
      <LogoMark size={size * 1.15} />
      <span
        className="font-semibold"
        style={{
          fontFamily: "var(--font-fraunces-display), Georgia, serif",
          fontSize: size,
          color: ink,
          letterSpacing: "-0.025em",
          lineHeight: 1,
        }}
      >
        Inmo
        <span style={{ color: "var(--libres-color, #C1694F)" }}>Libres</span>
      </span>
    </span>
  )
}
