import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Campo sobre fundo de card, com anel de foco na cor da marca.
          "flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-base text-foreground ring-offset-background transition-[border-color,box-shadow] duration-150",
          "file:mr-3 file:rounded file:border-0 file:bg-secondary file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground/70",
          "hover:border-foreground/25",
          "focus-visible:outline-none focus-visible:border-ring focus-visible:shadow-focus",
          "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60",
          "md:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
