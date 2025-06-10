import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { 
      email, 
      nome, 
      status, 
      loja, 
      garantiaId,
      dataCompra,
      dataValidade,
      descricaoPecas,
      observacao,
      notaCompra,
      imagemPecas
    } = await request.json();

    // Gerar a URL de visualização da garantia
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const garantiaUrl = `${baseUrl}/garantias/${garantiaId}`;

    // Configurar o transporter do nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    // Configurar o email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: `Solicitação de Garantia - ${loja}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background-color: #f8f9fa;
              padding: 20px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .content {
              background-color: #ffffff;
              padding: 20px;
              border-radius: 5px;
              border: 1px solid #e9ecef;
            }
            .info-section {
              margin-bottom: 20px;
              padding: 15px;
              background-color: #f8f9fa;
              border-radius: 5px;
            }
            .info-title {
              font-weight: bold;
              color: #495057;
              margin-bottom: 5px;
            }
            .info-value {
              color: #212529;
            }
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #4CAF50;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e9ecef;
              color: #6c757d;
            }
            .status-badge {
              display: inline-block;
              padding: 5px 10px;
              background-color: #e9ecef;
              border-radius: 15px;
              font-weight: bold;
              color: #495057;
            }
            .document-link {
              display: inline-block;
              padding: 8px 16px;
              background-color: #e9ecef;
              color: #495057;
              text-decoration: none;
              border-radius: 5px;
              margin: 5px 0;
            }
            .image-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 10px;
              margin-top: 10px;
            }
            .image-link {
              display: block;
              text-decoration: none;
              color: #495057;
            }
            .image-preview {
              width: 100%;
              height: 150px;
              object-fit: cover;
              border-radius: 5px;
              margin-bottom: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>Olá ${nome},</h2>
            <p>Informamos que sua solicitação de garantia foi registrada em nosso sistema.</p>
          </div>

          <div class="content">
            <div class="info-section">
              <div class="info-title">Status da Garantia</div>
              <div class="status-badge">${status}</div>
            </div>

            <div class="info-section">
              <div class="info-title">Informações da Garantia</div>
              <p><strong>Loja:</strong> ${loja}</p>
              <p><strong>Data da Compra:</strong> ${dataCompra}</p>
              <p><strong>Data da Solicitação:</strong> ${dataValidade}</p>
            </div>

            <div class="info-section">
              <div class="info-title">Descrição das Peças</div>
              <p>${descricaoPecas || 'Não informado'}</p>
            </div>

            ${notaCompra ? `
            <div class="info-section">
              <div class="info-title">Nota de Compra</div>
              <a href="${notaCompra}" class="document-link" target="_blank">Visualizar Nota de Compra</a>
            </div>
            ` : ''}

            ${imagemPecas ? `
            <div class="info-section">
              <div class="info-title">Imagens das Peças</div>
              <div class="image-grid">
                ${imagemPecas.split(',').map((url: string) => `
                  <a href="${url}" class="image-link" target="_blank">
                    <img src="${url}" alt="Imagem da peça" class="image-preview">
                  </a>
                `).join('')}
              </div>
            </div>
            ` : ''}

            ${observacao ? `
            <div class="info-section">
              <div class="info-title">Observações</div>
              <p>${observacao}</p>
            </div>
            ` : ''}

            <div style="text-align: center;">
              <p>Para acompanhar o status da sua garantia, clique no botão abaixo:</p>
              <a href="${garantiaUrl}" class="button">Acompanhar Garantia</a>
              <p style="margin-top: 10px; font-size: 12px; color: #6c757d;">
                Ou copie e cole o seguinte link no seu navegador:<br>
                ${garantiaUrl}
              </p>
            </div>
          </div>

          <div class="footer">
            <p>Atenciosamente,</p>
            <p><strong>Equipe Marcia Castro</strong></p>
            <p style="font-size: 12px; color: #6c757d;">
              Este é um email automático, por favor não responda.
            </p>
          </div>
        </body>
        </html>
      `,
    };

    // Enviar o email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: 'Email enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return NextResponse.json(
      { success: false, message: 'Erro ao enviar email' },
      { status: 500 }
    );
  }
} 