import { cn } from "@/lib/utils"

interface PrecioMonedaProps {
  valor: number
  moneda?: "ARS" | "USD"
  size?: "xs" | "sm" | "md" | "lg" | "xl"
  showSymbol?: boolean
  showMoneda?: boolean
  className?: string
  color?: string
}

const SIZE_MAP = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-3xl",
}

function formatARS(valor: number): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor)
}

function formatUSD(valor: number): string {
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(valor)
}

export function PrecioMoneda({
  valor,
  moneda = "ARS",
  size = "md",
  showSymbol = true,
  showMoneda = false,
  className,
  color,
}: PrecioMonedaProps) {
  const formatted = moneda === "USD" ? formatUSD(valor) : formatARS(valor)
  const symbol = moneda === "ARS" ? "$" : "U$S"

  return (
    <span
      className={cn(
        "font-price tabular-nums tracking-tight",
        SIZE_MAP[size],
        className
      )}
      style={{ color: color ?? "inherit" }}
    >
      {showSymbol && (
        <span className="font-normal mr-0.5" style={{ fontSize: "0.75em", opacity: 0.7 }}>
          {symbol}
        </span>
      )}
      {formatted}
      {showMoneda && (
        <span
          className="ml-1 text-[0.65em] font-medium uppercase tracking-widest opacity-60"
          style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
        >
          {moneda}
        </span>
      )}
    </span>
  )
}
