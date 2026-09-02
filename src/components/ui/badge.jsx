import * as React from "react"
import { cva } from "class-variance-authority";
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-lg border border-transparent px-2.5 py-1 text-[11.5px] font-bold tracking-[0.02em] w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:ring-[3px] focus-visible:ring-brand/25 aria-invalid:ring-destructive/20 aria-invalid:border-destructive transition-colors overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-brand-solid text-on-brand [a&]:hover:bg-brand-solid-hover",
        secondary:
          "bg-brand-tint text-brand [a&]:hover:bg-brand-tint-strong",
        destructive:
          "bg-bad-bg text-bad-fg border-transparent",
        outline:
          "border-hairline bg-panel text-ink-soft [a&]:hover:border-brand/40 [a&]:hover:text-ink",
        success:
          "bg-ok-bg text-ok-fg border-transparent",
        warning:
          "bg-warn-bg text-warn-fg border-transparent",
        ghost: "text-ink-soft [a&]:hover:bg-brand-tint [a&]:hover:text-ink",
        link: "text-brand underline-offset-4 [a&]:hover:underline",
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
}) {
  const Comp = asChild ? Slot.Root : "span"

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props} />
  );
}

export { Badge, badgeVariants }
