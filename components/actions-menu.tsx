import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Pencil, Trash2, CheckCircle, Printer } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

type PageType = "listaDesejos" | "listaGarantia" | "listaMateriais" | "pagamentos"

interface ActionsMenuProps {
  onView?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onFinalize?: () => void
  onMarkAvisado?: () => void
  onPrint?: () => void
  viewPath?: string
  editPath?: string
  itemId?: string
  pageType: PageType
  isFinalized?: boolean
  avisado?: boolean
}

export function ActionsMenu({ 
  onView, 
  onEdit, 
  onDelete, 
  onFinalize,
  onMarkAvisado,
  onPrint,
  viewPath, 
  editPath, 
  itemId, 
  pageType,
  isFinalized = false,
  avisado = false,
}: ActionsMenuProps) {
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

  // Verifica as permissões específicas da página
  const canView = user?.permissions?.[pageType]?.visualizar
  const canEdit = (
    ((pageType === "listaMateriais" || pageType === "listaGarantia") && (user?.permissions?.[pageType]?.editar_basico || user?.permissions?.[pageType]?.editar))
    || ((pageType !== "listaMateriais" && pageType !== "listaGarantia") && user?.permissions?.[pageType]?.editar)
  ) && !isFinalized
  const canDelete = user?.permissions?.[pageType]?.remover
  const canFinalize = (user?.permissions?.[pageType] as any)?.finalizar
  
  // Verifica se o usuário tem nome "loja" para mostrar a ação de finalizar
  const isLojaUser = user?.name?.toLowerCase() === "loja"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {canView && viewPath && itemId ? (
          <DropdownMenuItem asChild>
            <a
              href={`${viewPath}/${itemId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <Eye className="mr-2 h-4 w-4" />
              Visualizar
            </a>
          </DropdownMenuItem>
        ) : canView && (
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

        {pageType === "listaDesejos" && !avisado && (
          <DropdownMenuItem
            className="text-blue-600"
            onClick={onMarkAvisado}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Marcar como avisado
          </DropdownMenuItem>
        )}

        {isLojaUser && canFinalize && !isFinalized && (
          <DropdownMenuItem
            className="text-green-600"
            onClick={onFinalize}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Finalizar
          </DropdownMenuItem>
        )}

        {onPrint && (
          <DropdownMenuItem onClick={onPrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 