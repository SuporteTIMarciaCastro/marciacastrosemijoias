/**
 * Teto de tamanho dos envios de arquivo.
 *
 * A Vercel recusa requisicoes acima de ~4,5 MB ANTES de elas chegarem no nosso
 * codigo, devolvendo FUNCTION_PAYLOAD_TOO_LARGE. Como a recusa acontece fora
 * da aplicacao, nao adianta tratar dentro de /api/upload: o jeito e nao deixar
 * a requisicao sair grande demais.
 *
 * Medido em producao (01/10/2026), enviando para /api/upload:
 *   0,5 MB -> 200    4,0 MB -> 200
 *   1,5 MB -> 200    4,5 MB -> 413 FUNCTION_PAYLOAD_TOO_LARGE
 *   3,0 MB -> 200    5,0 MB -> 413 FUNCTION_PAYLOAD_TOO_LARGE
 *
 * Por isso o limite aqui e 4 MB, nao 4,5: o arquivo viaja dentro de um
 * multipart que carrega tambem nome, tipo e cabecalhos, e esse acrescimo conta
 * para o calculo da plataforma.
 *
 * O sintoma dessa falha era enganoso: a tela mostrava "Nao foi possivel
 * adicionar a garantia", porque o 413 caia no catch generico do formulario.
 */

export const LIMITE_ENVIO_MB = 4
export const LIMITE_ENVIO_BYTES = LIMITE_ENVIO_MB * 1024 * 1024

/** Erro com mensagem pronta para a tela, dizendo qual arquivo e por quanto passou. */
export class ErroArquivoGrande extends Error {
  readonly nomeArquivo: string
  readonly tamanhoBytes: number

  constructor(nomeArquivo: string, tamanhoBytes: number) {
    const mb = (tamanhoBytes / 1024 / 1024).toFixed(1).replace(".", ",")
    super(
      `"${nomeArquivo}" tem ${mb} MB e o limite por arquivo e de ${LIMITE_ENVIO_MB} MB. ` +
        `Reduza a imagem ou envie outra.`
    )
    this.name = "ErroArquivoGrande"
    this.nomeArquivo = nomeArquivo
    this.tamanhoBytes = tamanhoBytes
  }
}

/** Interrompe o envio quando o arquivo passa do teto da plataforma. */
export function validarTamanhoParaEnvio(file: File): void {
  if (file.size > LIMITE_ENVIO_BYTES) {
    throw new ErroArquivoGrande(file.name, file.size)
  }
}

/**
 * Reconhece o erro sem depender de `instanceof`, que falha quando a classe
 * atravessa fronteiras de bundle.
 */
export function ehErroArquivoGrande(erro: unknown): erro is ErroArquivoGrande {
  return erro instanceof Error && erro.name === "ErroArquivoGrande"
}

/**
 * Mensagem para o catch dos formularios: devolve a explicacao do arquivo
 * grande quando for o caso, e `padrao` em qualquer outra falha.
 */
export function mensagemDeErroDeEnvio(erro: unknown, padrao: string): string {
  return ehErroArquivoGrande(erro) ? erro.message : padrao
}
