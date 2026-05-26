import { cn } from "@/lib/utils"

interface ShimmerCardProps {
  lines?: number
  hasHeader?: boolean
  hasImage?: boolean
  className?: string
}

function ShimmerLine({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-lg shimmer", className)}
      style={{ height: 14, ...style }}
      {...props}
    />
  )
}

export function ShimmerCard({
  lines = 3,
  hasHeader = true,
  hasImage = false,
  className,
}: ShimmerCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5 flex flex-col gap-4",
        className
      )}
      style={{
        background: "var(--surface, #fff)",
        borderColor: "var(--border, #E8DFD0)",
        boxShadow: "var(--shadow-sm-il)",
      }}
    >
      {hasImage && (
        <div
          className="rounded-xl shimmer w-full"
          style={{ height: 160 }}
        />
      )}

      {hasHeader && (
        <div className="flex items-center gap-3">
          <div
            className="rounded-xl shimmer shrink-0"
            style={{ width: 40, height: 40 }}
          />
          <div className="flex-1 flex flex-col gap-2">
            <ShimmerLine className="w-2/3" />
            <ShimmerLine className="w-1/3" style={{ height: 10 }} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <ShimmerLine
            key={i}
            className={i === lines - 1 ? "w-2/3" : "w-full"}
          />
        ))}
      </div>
    </div>
  )
}

export function ShimmerTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-0">
      {/* Header */}
      <div
        className="grid gap-4 px-4 py-3 border-b"
        style={{
          gridTemplateColumns: "2fr 1fr 1fr 1fr",
          borderColor: "var(--border, #E8DFD0)",
        }}
      >
        {[60, 40, 40, 30].map((w, i) => (
          <ShimmerLine key={i} style={{ width: `${w}%`, height: 10 }} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid gap-4 px-4 py-3.5 border-b"
          style={{
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            borderColor: "var(--border, #E8DFD0)",
          }}
        >
          {[80, 50, 60, 40].map((w, j) => (
            <ShimmerLine key={j} style={{ width: `${w}%` }} />
          ))}
        </div>
      ))}
    </div>
  )
}
