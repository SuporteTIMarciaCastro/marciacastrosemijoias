import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/context/auth-context"
import { Toaster as SonnerToaster } from "sonner"
import { Toaster } from "@/components/ui/toaster"
import Script from "next/script"

// Fonte única do sistema. A hierarquia vem de tamanho, peso e tracking —
// não de troca de família.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Marcia Castro Semijoias",
  description: "Sistema de gerenciamento para Marcia Castro Semijoias",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.ico" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light">
          <AuthProvider>
            {children}
            {/* Dois sistemas de aviso convivem no projeto: Pagamentos usa o
                sonner, e o restante usa o useToast do shadcn. Só o sonner
                estava montado, então TODA mensagem do shadcn — inclusive erro
                de validação — era disparada e nunca aparecia na tela. */}
            <Toaster />
            <SonnerToaster />
          </AuthProvider>
        </ThemeProvider>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-CWYLWTWDR4"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-CWYLWTWDR4', {
              page_path: window.location.pathname,
            });
          `}
        </Script>
      </body>
    </html>
  )
}
