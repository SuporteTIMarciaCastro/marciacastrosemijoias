"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Moon, Sun } from "lucide-react"
import { useAuth } from "@/context/auth-context"
import { useTheme } from "next-themes"
import { Switch } from "@/components/ui/switch"
import { PermissionKey } from "@/types/permissions"

interface HeaderProps {
  title: string
}

interface MenuItem {
  title: string
  path: string
  permission: PermissionKey | null
}

export default function Header({ title }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { logout, user } = useAuth()
  const router = useRouter()
  const { setTheme, theme } = useTheme()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const menuItems: MenuItem[] = [
    { title: "Menu Principal", path: "/dashboard", permission: null },
    { title: "Lista de Desejos", path: "/lista-desejos", permission: "listaDesejos" },
    { title: "Lista de Garantia", path: "/lista-garantia", permission: "listaGarantia" },
    { title: "Lista de Materiais", path: "/lista-solicitacoes", permission: "listaMateriais" },
    { title: "Lista de Pagamentos", path: "/pagamentos", permission: "pagamentos" },
    { title: "Estatísticas de Atendimento", path: "/estatisticas-atendimento", permission: "estatisticasAtendimento" },
  ]

  const filteredMenuItems = menuItems.filter(item => {
    if (!item.permission) return true
    return user?.permissions?.[item.permission]?.visualizarPage
  })

  return (
    <header className="sticky top-0 z-10 border-b border-primary/15 bg-background/85 text-foreground shadow-soft backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[240px] sm:w-[300px]">
              <div className="flex flex-col gap-6 py-4">
                <div className="flex justify-center px-2">
                  <Image src="/logo-preto.png" alt="Marcia Castro Semijoias" width={180} height={76} priority className="h-auto w-[160px] object-contain dark:invert" />
                </div>
                <nav className="flex flex-col gap-2">
                  {filteredMenuItems.map((item, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="justify-start"
                      onClick={() => {
                        router.push(item.path)
                        setIsMenuOpen(false)
                      }}
                    >
                      {item.title}
                    </Button>
                  ))}
                  <Button
                    variant="ghost"
                    className="justify-start text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={handleLogout}
                  >
                    Sair
                  </Button>
                </nav>
              </div>
            </SheetContent>
          </Sheet>

          <div className="hidden md:flex items-center">
            <Image src="/logo-preto.png" alt="Marcia Castro Semijoias" width={130} height={55} priority className="h-9 w-auto object-contain dark:invert" />
          </div>

          <div className="hidden md:block h-6 w-px bg-border" />

          <h1 className="font-serif text-lg font-semibold tracking-tight text-primary md:text-xl">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-2">
            {filteredMenuItems.map((item, index) => (
              <Button key={index} variant="ghost" onClick={() => router.push(item.path)}>
                {item.title}
              </Button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              aria-label="Alternar modo escuro/claro"
            />
            {theme === "dark" ? <Moon className="w-5 h-5 text-yellow-400" /> : <Sun className="w-5 h-5 text-orange-400" />}
          </div>
          <Button
            variant="outline"
            className="hidden md:inline-flex text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={handleLogout}
          >
            Sair
          </Button>
        </div>
      </div>
    </header>
  )
}
