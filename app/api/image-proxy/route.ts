import { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const imageUrl = searchParams.get('url')

  if (!imageUrl) {
    return new Response('URL da imagem não fornecida', { status: 400 })
  }

  try {
    const response = await fetch(imageUrl)

    if (!response.ok) {
      console.error(`Erro ao buscar imagem do Google Drive: ${response.status} ${response.statusText}`)
      throw new Error(`Erro ao buscar imagem: ${response.statusText}`)
    }

    const contentType = response.headers.get('Content-Type')
    console.log('Content-Type recebido do Google Drive:', contentType)

    const imageBlob = await response.blob()
    console.log('Tamanho do Blob da imagem (bytes):', imageBlob.size)

    if (imageBlob.size === 0) {
      console.warn('Blob de imagem vazio recebido do Google Drive.')
      return new Response('Imagem vazia', { status: 500 })
    }

    return new Response(imageBlob, {
      headers: {
        'Content-Type': contentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable', // Cache agressivo para imagens
      },
    })
  } catch (error) {
    console.error('Erro ao fazer proxy da imagem:', error)
    return new Response('Erro ao fazer proxy da imagem', { status: 500 })
  }
} 