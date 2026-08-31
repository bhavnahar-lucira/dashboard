import * as React from "react"
import { cva } from "class-variance-authority";
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-[13px] font-semibold tracking-[0.01em] transition-all duration-150 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-brand/25 aria-invalid:ring-destructive/20 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-brand-solid text-on-brand hover:bg-brand-solid-hover active:brightness-95",
        destructive:
          "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500/25",
        outline:
          "border border-hairline bg-panel text-ink hover:border-brand/40 hover:bg-brand-tint hover:text-ink",
        secondary:
          "bg-brand-tint text-brand hover:bg-brand-tint-strong",
        ghost:
          "text-ink-soft hover:bg-brand-tint hover:text-ink",
        link: "text-brand underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3.5",
        xs: "h-6 gap-1 rounded-lg px-2 text-[11px] has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 text-[12.5px] has-[>svg]:px-2.5",
        lg: "h-11 rounded-xl px-6 text-sm has-[>svg]:px-5",
        icon: "size-9",
        "icon-xs": "size-6 rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props} />
  );
}

export { Button, buttonVariants }
