"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { useAuth } from "@/context/auth-context"

interface HeaderProps {
  title: string
}

export default function Header({ title }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const menuItems = [
    { title: "Menu Principal", path: "/dashboard" },
    { title: "Lista de Desejos", path: "/lista-desejos" },
    { title: "Lista de Garantia", path: "/lista-garantia" },
    { title: "Lista de Solicitações", path: "/lista-solicitacoes" },
  ]

  return (
    <header className="sticky top-0 z-10 border-b bg-white shadow-sm">
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
                <div className="flex justify-center">
                  <Image src="/logo.png" alt="Marcia Castro Semijoias" width={100} height={100} priority />
                </div>
                <nav className="flex flex-col gap-2">
                  {menuItems.map((item, index) => (
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

          <div className="hidden md:flex items-center gap-2">
            <Image src="/logo.png" alt="Marcia Castro Semijoias" width={40} height={40} priority />
            <span className="text-lg font-semibold">Marcia Castro</span>
          </div>

          <h1 className="text-lg font-semibold md:text-xl">{title}</h1>
        </div>

        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-2">
            {menuItems.map((item, index) => (
              <Button key={index} variant="ghost" onClick={() => router.push(item.path)}>
                {item.title}
              </Button>
            ))}
          </nav>
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
