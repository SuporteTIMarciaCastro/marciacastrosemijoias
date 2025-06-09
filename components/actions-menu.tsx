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

type PageType = "listaDesejos" | "listaGarantia" | "listaMateriais" | "pagamentos"

interface ActionsMenuProps {
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  viewPath?: string
  editPath?: string
  itemId?: string
  pageType: PageType
}

export function ActionsMenu({ onView, onEdit, onDelete, viewPath, editPath, itemId, pageType }: ActionsMenuProps) {
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

  // Verifica as permissões específicas da páginaa
  const canView = user?.permissions?.[pageType]?.visualizar
  const canEdit = user?.permissions?.[pageType]?.editar
  const canDelete = user?.permissions?.[pageType]?.remover

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canView && (
          <DropdownMenuItem onClick={handleView}>
            <Eye className="mr-2 h-4 w-4" />
            Visualizar
          </DropdownMenuItem>
        )}

        {canEdit && (
          <DropdownMenuItem onClick={handleEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar
          </DropdownMenuItem>
        )}

        {canDelete && (
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