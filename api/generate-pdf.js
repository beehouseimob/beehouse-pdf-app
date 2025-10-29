import PDFDocument from 'pdfkit';

// --- HELPERS BÁSICOS ---
function formatCurrency(value) {
    if (!value || isNaN(value)) return 'N/A';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// --- CONSTANTES DE LAYOUT ---
const MARGIN = 50;
const PAGE_WIDTH = 612;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2); // 512
const PAGE_END = PAGE_WIDTH - MARGIN; // 562

// ==================================================================
// NOVA FUNÇÃO DE HEADER (Baseada em image_a53028.png)
// ==================================================================
function drawHeader(doc) {
    // NOTA: O logo 'beehouse' não foi adicionado pois não tenho o arquivo de imagem.
    // Se você tiver o logo, pode adicioná-lo aqui com:
    // doc.image('caminho/para/logo.png', MARGIN, MARGIN, { width: 50 });
    
    // Título da Empresa (ao lado de onde o logo estaria)
    doc.font('Helvetica-Bold').fontSize(12).text('Beehouse Investimentos Imobiliários', MARGIN + 60, MARGIN + 10);
    
    // Título do Documento (Centralizado)
    doc.font('Helvetica-Bold').fontSize(14).text('AUTORIZAÇÃO DE VENDA', 0, MARGIN + 30, { align: 'center' });

    // Bloco de Endereço (Alinhado à Direita)
    const rightAlignX = PAGE_WIDTH - MARGIN - 250; // Posição X para o bloco da direita
    doc.font('Helvetica').fontSize(9).text('R. Jacob Eisenhut, 223 - SL 801 - Atiradores - Joinville/SC', rightAlignX, MARGIN, { width: 250, align: 'right' });
    doc.text('www.beehouse.sc | Fone: (47) 99287-9066', rightAlignX, MARGIN + 12, { width: 250, align: 'right' });
    
    doc.moveDown(5); // Move o cursor para baixo do header
}


// ==================================================================
// FUNÇÃO DE GERAÇÃO DE PDF (COM PROMISE - JÁ FUNCIONANDO)
// ==================================================================
async function generatePdfPromise(data) {
    
    return new Promise((resolve, reject) => {
        
        const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('error', (err) => {
            console.error('Erro no stream do PDFKit:', err);
            reject(err);
        });
        doc.on('end', () => {
            const pdfData = Buffer.concat(buffers);
            console.log('Stream do PDF finalizado. PDF pronto.');
            resolve(pdfData); 
        });

        try {
            // ==================================================================
            // INÍCIO DA LÓGICA DE DESENHO (REFEITA PARA image_a53028.png)
            // ==================================================================

            drawHeader(doc);
            
            let y = doc.y; // Posição Y atual
            
            // --- Constantes de Desenho ---
            const textPad = 5; // Padding do texto dentro das caixas
            const textYPad = 7; // Padding vertical do texto (empírico)
            const labelBoxWidth = 22; // Largura da caixa de label vertical
            const fieldBoxX = MARGIN + labelBoxWidth; // Início da área de campos
            const endX = MARGIN + CONTENT_WIDTH; // Fim da página (562)

            // --- 1. Bloco CONTRATANTE ---
            const yC = y;
            const rHC = 20; // Altura da Linha (Row Height)
            const hC = rHC * 8; // Altura Total (8 linhas)
            
            // Desenha caixas externas
            doc.rect(MARGIN, yC, CONTENT_WIDTH, hC).stroke(); // Caixa externa
            doc.rect(MARGIN, yC, labelBoxWidth, hC).stroke(); // Caixa do label vertical

            // Desenha Texto Vertical
            doc.save().translate(MARGIN + labelBoxWidth/2, yC + hC/2).rotate(-90).font('Helvetica-Bold').text('CONTRATANTE', -hC/2, 0, { width: hC, align: 'center' }).restore();

            // --- Define as Colunas Internas ---
            const xC_1 = fieldBoxX;
            const xC_2 = fieldBoxX + 178; // Coluna 2
            const xC_3 = fieldBoxX + 318; // Coluna 3

            // --- Linha 1 (Nome, CNH, Profissão) ---
            let yRow = yC;
            doc.moveTo(fieldBoxX, yRow + rHC).lineTo(endX, yRow + rHC).stroke(); // Linha H
            doc.moveTo(xC_2, yRow).lineTo(xC_2, yRow + rHC).stroke(); // Linha V
            doc.moveTo(xC_3, yRow).lineTo(xC_3, yRow + rHC).stroke(); // Linha V
            doc.font('Helvetica-Bold').text('Nome:', xC_1 + textPad, yRow + textYPad);
            doc.font('Helvetica').text(data.contratanteNome || '', xC_1 + 40, yRow + textYPad);
            doc.font('Helvetica-Bold').text('RG nº:', xC_2 + textPad, yRow + textYPad);
            doc.font('Helvetica').text(data.contratanteRg || '', xC_2 + 50, yRow + textYPad); // Usando RG no campo CNH
            doc.font('Helvetica-Bold').text('Profissão:', xC_3 + textPad, yRow + textYPad);
            doc.font('Helvetica').text(data.contratanteProfissao || '', xC_3 + 55, yRow + textYPad);
            
            // --- Linha 2 (Estado Civil, Regime) ---
            yRow += rHC;
            doc.moveTo(fieldBoxX, yRow + rHC).lineTo(endX, yRow + rHC).stroke(); // H
            doc.moveTo(xC_2, yRow).lineTo(xC_2, yRow + rHC).stroke(); // V
            doc.font('Helvetica-Bold').text('Estado Civil:', xC_1 + textPad, yRow + textYPad);
            doc.font('Helvetica').text(data.contratanteEstadoCivil || '', xC_1 + 70, yRow + textYPad);
            doc.font('Helvetica-Bold').text('Regime de Casamento:', xC_2 + textPad, yRow + textYPad);
            doc.font('Helvetica').text(data.contratanteRegimeCasamento || '', xC_2 + 125, yRow + textYPad);

            // --- Linha 3 (End. Comercial, Celular) ---
            yRow += rHC;
            doc.moveTo(fieldBoxX, yRow + rHC).lineTo(endX, yRow + rHC).stroke(); // H
            doc.moveTo(xC_2, yRow).lineTo(xC_2, yRow + rHC).stroke(); // V
            doc.font('Helvetica-Bold').text('Endereço Comercial:', xC_1 + textPad, yRow + textYPad);
            // doc.font('Helvetica').text(data.contratanteEndComercial || '', xC_1 + 110, yRow + textYPad); // (Sem dados para este campo)
            doc.font('Helvetica-Bold').text('Celular:', xC_2 + textPad, yRow + textYPad);
            doc.font('Helvetica').text(data.contratanteTelefone || '', xC_2 + 50, yRow + textYPad); // Usando Telefone no campo Celular

            // --- Linha 4 (E-mail) ---
            yRow += rHC;
            doc.moveTo(fieldBoxX, yRow + rHC).lineTo(endX, yRow + rHC).stroke(); // H
            doc.font('Helvetica-Bold').text('E-mail:', xC_1 + textPad, yRow + textYPad);
            doc.font('Helvetica').text(data.contratanteEmail || '', xC_1 + 45, yRow + textYPad);

            // --- Linha 5 (Cônjuge, CNH, Profissão) ---
            yRow += rHC;
            doc.moveTo(fieldBoxX, yRow + rHC).lineTo(endX, yRow + rHC).stroke(); // H
            doc.moveTo(xC_2, yRow).lineTo(xC_2, yRow + rHC).stroke(); // V
            doc.moveTo(xC_3, yRow).lineTo(xC_3, yRow + rHC).stroke(); // V
            doc.font('Helvetica-Bold').text('Cônjuge:', xC_1 + textPad, yRow + textYPad);
            // doc.font('Helvetica').text(data.conjugeNome || '', xC_1 + 55, yRow + textYPad); // (Sem dados)
            doc.font('Helvetica-Bold').text('CNH nº:', xC_2 + textPad, yRow + textYPad);
            // doc.font('Helvetica').text(data.conjugeCnh || '', xC_2 + 50, yRow + textYPad); // (Sem dados)
            doc.font('Helvetica-Bold').text('Profissão:', xC_3 + textPad, yRow + textYPad);
            // doc.font('Helvetica').text(data.conjugeProfissao || '', xC_3 + 55, yRow + textYPad); // (Sem dados)

            // --- Linha 6 (CPF) ---
            yRow += rHC;
            doc.moveTo(fieldBoxX, yRow + rHC).lineTo(endX, yRow + rHC).stroke(); // H
            doc.font('Helvetica-Bold').text('CPF:', xC_1 + textPad, yRow + textYPad);
            doc.font('Helvetica').text(data.contratanteCpf || '', xC_1 + 35, yRow + textYPad);

            // --- Linha 7 (End. Residencial) ---
            yRow += rHC;
            doc.moveTo(fieldBoxX, yRow + rHC).lineTo(endX, yRow + rHC).stroke(); // H
            doc.font('Helvetica-Bold').text('Endereço Residencial:', xC_1 + textPad, yRow + textYPad);
            doc.font('Helvetica').text(data.contratanteEndereco || '', xC_1 + 120, yRow + textYPad);

            // --- Linha 8 (E-mail) ---
            yRow += rHC;
            // Sem linha H (é a última)
            doc.font('Helvetica-Bold').text('E-mail:', xC_1 + textPad, yRow + textYPad);
            doc.font('Helvetica').text(data.contratanteEmail || '', xC_1 + 45, yRow + textYPad);
            
            y = yRow + rHC + 15; // Move Y para baixo do bloco
            
            // --- 2. Bloco IMÓVEL ---
            const yI = y;
            const rHI = 20; // Altura da Linha
            const hI = rHI * 6; // Altura Total (6 linhas)

            // Desenha caixas externas
            doc.rect(MARGIN, yI, CONTENT_WIDTH, hI).stroke(); // Caixa externa
            doc.rect(MARGIN, yI, labelBoxWidth, hI).stroke(); // Caixa do label vertical

            // Desenha Texto Vertical
            doc.save().translate(MARGIN + labelBoxWidth/2, yI + hI/2).rotate(-90).font('Helvetica-Bold').text('IMÓVEL', -hI/2, 0, { width: hI, align: 'center' }).restore();

            // --- Define Colunas Internas ---
            const xI_1 = fieldBoxX;
            const xI_2 = fieldBoxX + 318; // Col 2 (para Valor)

            // --- Linha 1 (Imóvel, Valor) ---
            let yIRow = yI;
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.moveTo(xI_2, yIRow).lineTo(xI_2, yIRow + rHI).stroke(); // V
            doc.font('Helvetica-Bold').text('Imóvel:', xI_1 + textPad, yIRow + textYPad);
            doc.font('Helvetica').text(data.imovelDescricao || '', xI_1 + 45, yIRow + textYPad);
            doc.font('Helvetica-Bold').text('Valor:', xI_2 + textPad, yIRow + textYPad);
            doc.font('Helvetica').text(formatCurrency(data.imovelValor) || '', xI_2 + 40, yIRow + textYPad);

            // --- Linha 2 (Endereço) ---
            yIRow += rHI;
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.font('Helvetica-Bold').text('Endereço:', xI_1 + textPad, yIRow + textYPad);
            doc.font('Helvetica').text(data.imovelEndereco || '', xI_1 + 60, yIRow + textYPad);

            // --- Linha 3 (Inscrição Imobiliária) ---
            yIRow += rHI;
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.font('Helvetica-Bold').text('Inscrição Imobiliária/Registro de Imóveis/Matrícula:', xI_1 + textPad, yIRow + textYPad);
            doc.font('Helvetica').text(data.imovelMatricula || '', xI_1 + 270, yIRow + textYPad);

            // --- Linha 4 (Administradora) ---
            yIRow += rHI;
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.font('Helvetica-Bold').text('Administradora de Condomínio:', xI_1 + textPad, yIRow + textYPad);
            doc.font('Helvetica').text(data.imovelAdminCondominio || '', xI_1 + 170, yIRow + textYPad);

            // --- Linha 5 (Condomínio, Chamada, Parcelas) ---
            yIRow += rHI;
            const xI_L5_2 = fieldBoxX + 178; // 250
            const xI_L5_3 = fieldBoxX + 318; // 390
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.moveTo(xI_L5_2, yIRow).lineTo(xI_L5_2, yIRow + rHI).stroke(); // V
            doc.moveTo(xI_L5_3, yIRow).lineTo(xI_L5_3, yIRow + rHI).stroke(); // V
            doc.font('Helvetica-Bold').text('Condomínio-Valor R$:', xI_1 + textPad, yIRow + textYPad);
            doc.font('Helvetica').text(formatCurrency(data.imovelValorCondominio) || '', xI_1 + 120, yIRow + textYPad);
            doc.font('Helvetica-Bold').text('Chamada de Capital R$:', xI_L5_2 + textPad, yIRow + textYPad);
            doc.font('Helvetica').text(data.imovelChamadaCapital || '', xI_L5_2 + 120, yIRow + textYPad);
            doc.font('Helvetica-Bold').text('Nº de parcelas:', xI_L5_3 + textPad, yIRow + textYPad);
            doc.font('Helvetica').text(data.imovelNumParcelas || '', xI_L5_3 + 80, yIRow + textYPad);

            // --- Linha 6 (Exclusividade, Prazo) ---
            yIRow += rHI;
            const xI_L6_2 = fieldBoxX + 178; // 250
            doc.moveTo(xI_L6_2, yIRow).lineTo(xI_L6_2, yIRow + rHI).stroke(); // V
            doc.font('Helvetica-Bold').text('Exclusividade(*):', xI_1 + textPad, yIRow + textYPad);
            
            // Checkboxes (desenhando caixas vazias)
            doc.rect(xI_1 + 90, yIRow + textYPad - 2, 8, 8).stroke();
            doc.font('Helvetica').text('SIM', xI_1 + 100, yIRow + textYPad);
            doc.rect(xI_1 + 130, yIRow + textYPad - 2, 8, 8).stroke();
            doc.font('Helvetica').text('NÃO', xI_1 + 140, yIRow + textYPad);
            
            doc.font('Helvetica-Bold').text('Prazo de exclusividade:', xI_L6_2 + textPad, yIRow + textYPad);
            doc.font('Helvetica').text((data.contratoPrazo || '') + ' dias', xI_L6_2 + 120, yIRow + textYPad);

            y = yIRow + rHI + 10; // Move Y para baixo do bloco
            
            // --- 3. Seção CLÁUSULAS ---
            doc.y = y; // Seta a posição Y para o fluxo de texto
            doc.x = MARGIN; 
            doc.font('Helvetica').fontSize(9); // Fonte menor para cláusulas
            
            const textoPreambulo = 'O Contratante autoriza a Beehouse Investimentos Imobiliários inscrita no CNPJ sob nº 14.477.349/0001-23, situada nesta cidade, na Rua Jacob Eisenhut, 223 - SL 801 Bairro Atiradores, Cep: 89.203-070 - Joinville-SC, a promover a venda do imóvel com a descrição acima, mediante as seguintes condições:';
            doc.text(textoPreambulo, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(1);
            
            // Cláusula 1
            doc.font('Helvetica-Bold').text('1º', MARGIN, doc.y, { continued: true, indent: 0 });
            doc.font('Helvetica').text(` A venda é concebida a contar desta data pelo prazo e forma acima definidos. Após esse período o contrato se encerra.`);
            doc.moveDown(0.5);

            // Cláusula 2
            doc.font('Helvetica-Bold').text('2º', MARGIN, doc.y, { continued: true, indent: 0 });
            doc.font('Helvetica').text(` O Contratante pagará a Contratada, uma vez concluído o negócio a comissão de ${data.contratoComissaoPct || '6'}% (seis por cento) sobre o valor da venda, no ato do recebimento do sinal. Esta comissão é devida também mesmo fora do prazo desta autorização desde que a venda do imóvel seja efetuado por cliente apresentado pela Contratada ou nos caso em que, comprovadamente, a negociação tiver sido por esta iniciada, observando também o artigo 727 do Código Civil Brasileiro`);
            doc.moveDown(0.5);
            
            // Cláusula 3
            doc.font('Helvetica-Bold').text('3º', MARGIN, doc.y, { continued: true, indent: 0 });
            doc.font('Helvetica').text(' A Contratada compromete-se a fazer publicidade do imóvel, podendo colocar placas, anunciar em jornais e meios de divulgação do imóvel ao público.');
            doc.moveDown(0.5);
            
            // Cláusula 4
            doc.font('Helvetica-Bold').text('4º', MARGIN, doc.y, { continued: true, indent: 0 });
            doc.font('Helvetica').text(' O Contratante declara que o imóvel encontra-se livre e desembaraçado, inexistindo quaisquer impedimento judicial e/ou extra judicial que impeça a transferencia de posse, comprometendo-se a fornecer cópia do Registro de Imóveis, CPF, RG e carne de IPTU.');
            doc.moveDown(0.5);
            
            // Cláusula 5
            doc.font('Helvetica-Bold').text('5º', MARGIN, doc.y, { continued: true, indent: 0 });
            doc.font('Helvetica').text(' Em caso de qualquer controversia decorrente deste contrato, as partes elegem o Foro da Comarca de Joinville/SC para dirimir quaisquer dúvidas deste contrato, renunciando qualquer outro, por mais privilégio que seja.');
            doc.moveDown(1);

            const textoFechamento = 'Assim por estarem juntos e contratados, obrigam-se a si e seus herdeiros a cumprir e fazer cumprir o disposto neste contrato, assinando-os em duas vias de igual teor e forma, na presença de testemunhas, a tudo presentes.';
            doc.text(textoFechamento, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(2);

            // --- 6. Assinaturas ---
            const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
            doc.font('Helvetica-Bold').text('Local e data:', MARGIN, doc.y);
            doc.font('Helvetica').text(`Joinville, ${dataHoje}`, MARGIN + 60, doc.y);
            doc.moveDown(3);

            const sigY = doc.y;
            const sigLeftX = MARGIN + 40;
            const sigRightX = MARGIN + 300;
            const sigWidth = 220;

            // Assinatura Esquerda (Beehouse)
            doc.moveTo(sigLeftX, sigY).lineTo(sigLeftX + sigWidth, sigY).stroke();
            doc.font('Helvetica-Bold').fontSize(8).text('Beehouse Investimentos Imobiliários', sigLeftX, sigY + 5, { width: sigWidth, align: 'center' });
            doc.fontSize(8).text('CNPJ 14.477.349/0001-23', sigLeftX, sigY + 15, { width: sigWidth, align: 'center' });

            // Assinatura Direita (Contratante)
            doc.moveTo(sigRightX, sigY).lineTo(sigRightX + sigWidth, sigY).stroke();
            doc.font('Helvetica-Bold').fontSize(8).text('CONTRATANTE', sigRightX, sigY + 5, { width: sigWidth, align: 'center' });
            
            // --- FIM DA LÓGICA DE DESENHO ---

            doc.end();

        } catch (error) {
            console.error('Erro síncrono ao desenhar PDF:', error);
            reject(error);
        }
    });
}


// ==================================================================
// HANDLER (USANDO ASYNC/AWAIT COM A PROMISE - JÁ FUNCIONANDO)
// ==================================================================
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).send('Metodo nao permitido');
    }

    try {
        const data = req.body;
        console.log('Iniciando geração do PDF...');

        const pdfBuffer = await generatePdfPromise(data);

        console.log('PDF pronto. Enviando resposta...');
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Autorizacao_Venda_${data.contratanteNome || 'Contratante'}.pdf"`);
        
        res.end(pdfBuffer);

    } catch (error) {
        console.error('Erro no handler ao gerar PDF:', error);
        res.status(500).send('Erro ao gerar PDF: ' + error.message);
    }
}