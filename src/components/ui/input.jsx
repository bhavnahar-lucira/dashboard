import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-xl border border-hairline bg-panel px-3.5 py-1 text-[13.5px] font-medium text-ink transition-all duration-150 outline-none selection:bg-brand-solid selection:text-on-brand file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-[13px] file:font-semibold file:text-brand placeholder:font-normal placeholder:text-ink-muted disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-field disabled:opacity-60",
        "hover:border-ink-muted/40 focus-visible:border-brand/50 focus-visible:ring-[3px] focus-visible:ring-brand/20",
        "aria-invalid:border-rose-400 aria-invalid:ring-rose-500/15",
        className
      )}
      {...props} />
  );
}

export { Input }
