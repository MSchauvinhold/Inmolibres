import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-2.5 py-0.5 text-[11.5px] font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "bg-destructive text-white focus-visible:ring-destructive/20 [a&]:hover:bg-destructive/90",
        outline:
          "border-border-strong text-text-secondary [a&]:hover:bg-surface-raised",
        ghost:
          "[a&]:hover:bg-surface-raised [a&]:hover:text-text-primary",
        link:
          "text-primary underline-offset-4 [a&]:hover:underline",
        /* Variantes semánticas — tierra moderna */
        terra:
          "bg-terracota-100 text-terracota-700 [a&]:hover:bg-terracota-100/80",
        success:
          "bg-success-100 text-success-500",
        warning:
          "bg-warning-100 text-warning-500",
        danger:
          "bg-danger-100 text-danger-500",
        info:
          "bg-info-100 text-info-500",
        dark:
          "bg-antracita-700 text-crema-50",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
