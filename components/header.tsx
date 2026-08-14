"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  Menu,
  Moon,
  Sun,
  LogOut,
  LayoutGrid,
  Heart,
  ShieldCheck,
  PackageOpen,
  Boxes,
  Wallet,
  Users,
  BarChart3,
  Store,
} from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useTheme } from "next-themes"
import { PermissionKey } from "@/types/permissions"
import { cn } from "@/lib/utils"

interface HeaderProps {
  title: string
}

interface MenuItem {
  title: string
  path: string
  permission: PermissionKey | null
  icon: typeof LayoutGrid
}

export default function Header({ title }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { logout, user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const { setTheme, theme } = useTheme()

  // Reserva a faixa da sidebar no corpo do documento. Feito aqui para que
  // nenhuma página precise ser alterada — quem não renderiza o Header (login)
  // não recebe o deslocamento.
  useEffect(() => {
    document.body.dataset.sidebar = "on"
    return () => {
      delete document.body.dataset.sidebar
    }
  }, [])

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const menuItems: MenuItem[] = [
    { title: "Menu Principal", path: "/dashboard", permission: null, icon: LayoutGrid },
    { title: "Lista de Desejos", path: "/lista-desejos", permission: "listaDesejos", icon: Heart },
    { title: "Lista de Garantia", path: "/lista-garantia", permission: "listaGarantia", icon: ShieldCheck },
    { title: "Lista de Materiais", path: "/lista-solicitacoes", permission: "listaMateriais", icon: Boxes },
    { title: "Lista de Pagamentos", path: "/pagamentos", permission: "pagamentos", icon: Wallet },
    { title: "Gerenciador de Revendas", path: "/gerenciador-revendas", permission: "gerenciadorRevendas", icon: Store },
    { title: "Estatísticas de Atendimento", path: "/estatisticas-atendimento", permission: "estatisticasAtendimento", icon: BarChart3 },
    { title: "Lista de Usuários", path: "/usuarios", permission: "listaUsuarios", icon: Users },
  ]

  const filteredMenuItems = menuItems.filter((item) => {
    if (!item.permission) return true
    return user?.permissions?.[item.permission]?.visualizarPage
  })

  const isAtivo = (path: string) => pathname === path || pathname?.startsWith(`${path}/`)

  const navegar = (path: string) => {
    router.push(path)
    setIsMenuOpen(false)
  }

  // Item de navegação, reutilizado na sidebar fixa e no menu mobile.
  const ItemNav = ({ item }: { item: MenuItem }) => {
    const ativo = isAtivo(item.path)
    const Icone = item.icon
    return (
      <button
        type="button"
        onClick={() => navegar(item.path)}
        className={cn(
          "group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors",
          ativo
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
        )}
      >
        {/* Marcador vermelho apenas no item ativo */}
        <span
          className={cn(
            "h-5 w-[3px] shrink-0 rounded-full transition-colors",
            ativo ? "bg-sidebar-primary" : "bg-transparent"
          )}
          aria-hidden="true"
        />
        <Icone
          className={cn(
            "h-[18px] w-[18px] shrink-0 transition-colors",
            ativo ? "text-sidebar-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
          )}
        />
        <span className="truncate">{item.title}</span>
      </button>
    )
  }

  const BotaoTema = () => (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
      title={theme === "dark" ? "Modo claro" : "Modo escuro"}
    >
      {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  )

  const conteudoNav = (
    <>
      {/* Logo centralizada, com respiro e um fio separando da navegação —
          antes ficava espremida no canto e a assinatura saía ilegível. */}
      <div className="flex flex-col items-center gap-5 px-5 pb-5 pt-7">
        <Image
          src="/logo-branca.png"
          alt="Marcia Castro Semijoias"
          width={280}
          height={119}
          priority
          className="h-auto w-[9.5rem] object-contain"
        />
        <div className="h-px w-full bg-sidebar-border" />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4">
        {filteredMenuItems.map((item) => (
          <ItemNav key={item.path} item={item} />
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-4">
        {user && (
          <div className="mb-2 px-3">
            <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
              {user.name || "Usuário"}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">{user.email}</p>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-primary"
        >
          <span className="h-5 w-[3px] shrink-0" aria-hidden="true" />
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          Sair
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Sidebar fixa — desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex print:hidden">
        {conteudoNav}
      </aside>

      {/* Barra superior */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 print:hidden">
        <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="flex w-[276px] flex-col border-sidebar-border bg-sidebar p-0"
              >
                {conteudoNav}
              </SheetContent>
            </Sheet>

            <h1 className="truncate text-lg font-semibold tracking-[-0.02em] md:text-xl">
              {title}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <BotaoTema />
          </div>
        </div>
      </header>
    </>
  )
}
