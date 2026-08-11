import { cn } from "@/lib/utils"
import { getWarrantyStatusLabel } from "@/lib/warranty-status"

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Recebido loja":
        return "bg-blue-100 text-blue-800"
      case "Recebido comercial":
        return "bg-indigo-100 text-indigo-800"
      case "Recebido fábrica":
        return "bg-violet-100 text-violet-800"
      case "Recebido no escritório":
        return "bg-purple-100 text-purple-800"
      case "Devolvido comercial":
        return "bg-orange-50 text-pink-800"
      case "Devolvido loja":
        return "bg-orange-100 text-orange-800"
      case "Devolvido cliente":
        return "bg-green-100 text-green-800"
      case "Extraviada-crédito cliente":
        return "bg-green-100 text-green-800"
      case "Negado":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        getStatusColor(status)
      )}
    >
      {getWarrantyStatusLabel(status)}
    </span>
  )
} 