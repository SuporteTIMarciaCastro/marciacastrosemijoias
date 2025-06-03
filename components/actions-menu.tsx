import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

interface ActionsMenuProps {
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  viewPath?: string
  editPath?: string
  itemId?: string
}

export function ActionsMenu({ onView, onEdit, onDelete, viewPath, editPath, itemId }: ActionsMenuProps) {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log("Dados do usuário:", user)
  }, [user])

  const handleView = () => {
    if (onView) {
      onView()
    } else if (viewPath && itemId) {
      router.push(`${viewPath}/${itemId}`)
    }
  }

  const handleEdit = () => {
    if (onEdit) {
      onEdit()
    } else if (editPath && itemId) {
      router.push(`${editPath}/${itemId}`)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Visualizar - disponível para todos os usuários */}
        <DropdownMenuItem onClick={handleView}>
          <Eye className="mr-2 h-4 w-4" />
          Visualizar
        </DropdownMenuItem>

        {/* Editar - apenas para admin e gerente */}
        {(user?.perfil === "admin" || user?.perfil === "gerente") && (
          <DropdownMenuItem onClick={handleEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
        )}

        {/* Remover - apenas para admin */}
        {user?.perfil === "admin" && (
          <DropdownMenuItem
            className="text-red-600"
            onClick={onDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remover
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 