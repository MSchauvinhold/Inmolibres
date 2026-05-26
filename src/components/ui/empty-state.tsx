import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  size?: "sm" | "md" | "lg"
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  size = "md",
  className,
}: EmptyStateProps) {
  const sizes = {
    sm: { icon: 20, iconWrap: "w-10 h-10", title: "text-sm", desc: "text-xs", py: "py-8" },
    md: { icon: 24, iconWrap: "w-14 h-14", title: "text-base", desc: "text-sm", py: "py-12" },
    lg: { icon: 28, iconWrap: "w-16 h-16", title: "text-lg", desc: "text-sm", py: "py-16" },
  }

  const s = sizes[size]

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center gap-4",
        s.py,
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "rounded-2xl flex items-center justify-center",
            s.iconWrap
          )}
          style={{ background: "var(--terracota-100, #F4D8C9)" }}
        >
          <Icon
            style={{ width: s.icon, height: s.icon, color: "var(--terracota-600, #A85737)" }}
            strokeWidth={1.5}
          />
        </div>
      )}

      <div className="space-y-1.5 max-w-xs">
        <p
          className={cn("font-semibold", s.title)}
          style={{
            fontFamily: "var(--font-fraunces-display), Georgia, serif",
            color: "var(--antracita-700, #221E19)",
          }}
        >
          {title}
        </p>
        {description && (
          <p className={cn(s.desc, "leading-relaxed")} style={{ color: "var(--antracita-500, #3A332C)" }}>
            {description}
          </p>
        )}
      </div>

      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
