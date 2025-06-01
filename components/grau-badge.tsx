import { cn } from "@/lib/utils"

interface GrauBadgeProps {
  grau: string
}

export function GrauBadge({ grau }: GrauBadgeProps) {
  const getGrauStyles = (grau: string) => {
    switch (grau) {
      case "Urgente":
        return "bg-red-100 text-red-800 border-red-200"
      case "Médio":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "Baixo":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        getGrauStyles(grau)
      )}
    >
      {grau}
    </span>
  )
} 