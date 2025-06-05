# Google Drive Uploader Component

Um componente reutilizável para Next.js que permite fazer upload de arquivos diretamente para o Google Drive.

## Instalação

1. Copie a pasta `google-drive-uploader-component` para o seu projeto Next.js
2. Instale as dependências necessárias:

```bash
npm install googleapis lucide-react
```

3. Configure as variáveis de ambiente no arquivo `.env.local` do seu projeto:

```env
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
GOOGLE_REFRESH_TOKEN=seu_refresh_token
GOOGLE_DRIVE_FOLDER_ID=id_da_pasta_no_drive
```

## Como usar

1. Importe o componente no seu arquivo:

```tsx
import { GoogleDriveUploader } from "@/google-drive-uploader-component/components/GoogleDriveUploader"
```

2. Use o componente em qualquer lugar da sua aplicação:

```tsx
// Uso básico
<GoogleDriveUploader />

// Uso com todas as opções
<GoogleDriveUploader
  onUploadComplete={(result) => {
    console.log("Upload concluído:", result)
  }}
  onUploadError={(error) => {
    console.error("Erro no upload:", error)
  }}
  className="min-w-[500px]"
  accept="image/*,.pdf"
  multiple={true}
  buttonText="Escolher arquivos"
  dragText="Arraste seus arquivos aqui"
  dropText="Solte os arquivos aqui"
  maxFiles={5}
/>
```

## Props

| Prop | Tipo | Descrição | Padrão |
|------|------|-----------|--------|
| onUploadComplete | `(result: UploadResult) => void` | Callback chamado quando um upload é concluído com sucesso | `undefined` |
| onUploadError | `(error: string) => void` | Callback chamado quando ocorre um erro no upload | `undefined` |
| className | `string` | Classes CSS adicionais para o container | `""` |
| accept | `string` | Tipos de arquivo aceitos | `"image/*,.pdf,.doc,.docx,.txt"` |
| multiple | `boolean` | Permite selecionar múltiplos arquivos | `true` |
| buttonText | `string` | Texto do botão de seleção | `"Selecionar Arquivos"` |
| dragText | `string` | Texto exibido durante o drag | `"Arraste arquivos aqui"` |
| dropText | `string` | Texto exibido quando soltar os arquivos | `"Solte os arquivos aqui"` |
| maxFiles | `number` | Número máximo de arquivos permitidos | `undefined` |

## Interface UploadResult

```typescript
interface UploadResult {
  success: boolean
  fileName?: string
  fileId?: string
  message?: string
  error?: string
  fileUrl?: string
}
```

## Configuração do Google Drive

1. Acesse o [Google Cloud Console](https://console.cloud.google.com)
2. Crie um novo projeto ou selecione um existente
3. Ative a API do Google Drive
4. Crie credenciais OAuth 2.0
5. Configure as credenciais com as URLs de redirecionamento apropriadas
6. Obtenha o Client ID e Client Secret
7. Use o [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/) para gerar um Refresh Token
8. Configure as variáveis de ambiente no seu projeto

## Estrutura de Arquivos

```
google-drive-uploader-component/
├── app/
│   └── api/
│       └── upload/
│           └── route.ts
├── components/
│   └── GoogleDriveUploader.tsx
└── README.md
``` 