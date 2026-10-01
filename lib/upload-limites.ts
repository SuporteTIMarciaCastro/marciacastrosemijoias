/**
 * Limite de tamanho dos envios e pastas de destino no Drive.
 *
 * HISTORICO: a plataforma recusa requisicoes acima de ~4,5 MB ANTES de elas
 * chegarem na aplicacao (FUNCTION_PAYLOAD_TOO_LARGE). Medido em producao em
 * 01/10/2026 contra /api/upload: 4 MB passava, 4,5 MB nao. Como o 413 caia no
 * catch generico dos formularios, o sintoma era enganoso — a tela dizia "Nao
 * foi possivel adicionar a garantia", apontando para o lugar errado.
 *
 * Por isso o arquivo deixou de passar pelo nosso servidor: o navegador envia
 * direto para o Google (ver /api/upload/sessao e lib/google-drive.ts), e o
 * teto da plataforma some do caminho. O limite abaixo e regra NOSSA, de
 * produto, nao imposicao de infraestrutura.
 */

export const LIMITE_ENVIO_MB = 10
export const LIMITE_ENVIO_BYTES = LIMITE_ENVIO_MB * 1024 * 1024

/**
 * Teto do envio tradicional, que ainda atravessa o servidor. So e usado como
 * reserva, quando o envio direto falha; acima disto a reserva nem e tentada,
 * porque a plataforma recusaria.
 */
export const LIMITE_RESERVA_BYTES = 4 * 1024 * 1024

// ---------------------------------------------------------------------------
// Pastas do Drive
// ---------------------------------------------------------------------------
// A sessao de envio usa a credencial da empresa. Sem uma lista fechada, quem
// chamasse a rota poderia gravar em qualquer pasta do Drive.

/** Garantia e Gerenciador de Revendas (romaneios, fotos de entrega). */
export const PASTA_DRIVE_GARANTIA = "1-NZHEq0_4bKpL99KN2K-u5eQTxJ7BXfn"
/** Comprovantes de pagamento. */
export const PASTA_DRIVE_PAGAMENTOS = "1i55quYEmytJU_AhBs3b2AnZVAo3YAnlT"
/** Fotos do "Formulario para Cliente" da lista de desejos — envio SEM login. */
export const PASTA_DRIVE_FORMULARIO_PUBLICO = "1dQYLq0i_h59A5ZOMI0a2JrdJ0Bu8IvBP"
/** Documentos pessoais de revendedoras e representantes. Pasta restrita. */
export const PASTA_DRIVE_DOCUMENTOS = "1J8u8a8hpi4Kd-tNF2ipMgz_oBXpf49qU"

export const PASTAS_PERMITIDAS: string[] = [
  PASTA_DRIVE_GARANTIA,
  PASTA_DRIVE_PAGAMENTOS,
  PASTA_DRIVE_FORMULARIO_PUBLICO,
  PASTA_DRIVE_DOCUMENTOS,
]

// ---------------------------------------------------------------------------
// Erro de arquivo grande
// ---------------------------------------------------------------------------

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

/** Interrompe o envio quando o arquivo passa do limite. */
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
