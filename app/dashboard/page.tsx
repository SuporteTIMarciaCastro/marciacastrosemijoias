"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  if (!user) {
    return null
  }

  const menuItems = [
    { title: "Lista de Desejos", path: "/lista-desejos" },
    { title: "Lista de Garantia", path: "/lista-garantia" },
    { title: "Lista de Solicitações de Materiais", path: "/lista-solicitacoes" },
  ]

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Image src="/logo.png" alt="Marcia Castro Semijoias" width={150} height={150} priority />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-2xl">Menu Principal</CardTitle>
            <CardDescription className="text-center">Escolha uma opção:</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {menuItems.map((item, index) => (
              <Button key={index} className="w-full" onClick={() => router.push(item.path)}>
                {item.title}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
