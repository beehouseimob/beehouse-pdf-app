import PDFDocument from 'pdfkit';
import path from 'path'; 
import { fileURLToPath } from 'url'; 

// --- HELPERS BÁSICOS ---
function formatCurrency(value) {
    // Retorna string vazia se inválido, para não imprimir 'N/A' nas caixas
    if (!value || isNaN(value)) return ''; 
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// --- CONSTANTES DE LAYOUT ---
const MARGIN = 50;
const PAGE_WIDTH = 612;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2); // 512
const PAGE_END = PAGE_WIDTH - MARGIN; // 562

// ==================================================================
// FUNÇÃO DE HEADER CORRIGIDA (Carrega logo e bate com image_a53028.png)
// ==================================================================
function drawHeader(doc) {
    try {
        // --- Constrói o caminho correto para o logo ---
        const __filename = fileURLToPath(import.meta.url); // Caminho do arquivo atual (api/generate-pdf.js)
        const __dirname = path.dirname(__filename);      // Diretório do arquivo atual (api)
        // Sobe umível ('..') e entra em 'images'
        const logoPath = path.join(__dirname, '..', 'images', 'logo.jpeg'); 
        console.log('Tentando carregar logo de:', logoPath); 

        // Desenha o logo
        doc.image(logoPath, MARGIN, MARGIN - 5, { width: 200 });
    } catch (imageError) {
         console.error("Erro ao carregar o logo:", imageError.message);
         // Fallback se o logo falhar
        }
        
        // Título do Documento (Centralizado, como em image_a53028.png)
        
        // Bloco de Endereço (Alinhado à Direita, como em image_a53028.png)
    const rightAlignX = PAGE_WIDTH - MARGIN - 250; 
    doc.font('Helvetica-Bold').fontSize(11).text('Autorização de venda', rightAlignX, MARGIN, { width: 250, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(11).text('Beehouse Investimentos Imobiliários', rightAlignX, MARGIN + 12, { width: 250, align: 'right' });
    doc.font('Helvetica').fontSize(9).text('R. Jacob Eisenhut, 223 - SL 801 - Atiradores - Joinville/SC', rightAlignX, MARGIN + 24, { width: 250, align: 'right' });
    doc.text('www.beehouse.sc | Fone: (47) 99287-9066', rightAlignX, MARGIN + 36, { width: 250, align: 'right' });
    
    doc.y = MARGIN + 50; // Posição Y fixa após o header
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
            // INÍCIO DA LÓGICA DE DESENHO (CONTRATANTE ATUALIZADO)
            // ==================================================================

            drawHeader(doc); // Chama a função de cabeçalho corrigida
            
            let y = doc.y; // Posição Y atual
            
            // --- Constantes de Desenho ---
            const textPad = 5; 
            const textYPad = 7; 
            const labelBoxWidth = 22; 
            const fieldBoxX = MARGIN + labelBoxWidth; 
            const endX = MARGIN + CONTENT_WIDTH; 
            let labelWidth = 0; 
            const rowHeight = 20; // Altura de linha 

            // ==================================================================
            // 1. Bloco CONTRATANTE (NOVO LAYOUT - image_222ae4.png)
            // ==================================================================
            const yC = y;
            const hC = rowHeight * 5; // Altura Total (5 linhas)
            
            // Desenha caixas externas
            doc.rect(MARGIN, yC, CONTENT_WIDTH, hC).stroke(); // Caixa externa
            doc.rect(MARGIN, yC, labelBoxWidth, hC).stroke(); // Caixa do label vertical

            // Desenha Texto Vertical
            doc.save().translate(MARGIN + labelBoxWidth/2, yC + hC/2).rotate(-90).font('Helvetica-Bold').fontSize(10).text('CONTRATANTE', -hC/2 + 5, 0, { width: hC, align: 'center' }).restore();

            // --- Define as Colunas Internas ---
            const xC_1 = fieldBoxX;
            const xC_2 = fieldBoxX + (CONTENT_WIDTH - labelBoxWidth) / 2; // Posição 50%
            let yRow = yC;

            // --- Linha 1: nome / profissão ---
            doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX, yRow + rowHeight).stroke(); // Linha H
            doc.moveTo(xC_2, yRow).lineTo(xC_2, yRow + rowHeight).stroke(); // Linha V
            doc.font('Helvetica-Bold').fontSize(9).text('nome:', xC_1 + textPad, yRow + textYPad);
            labelWidth = doc.widthOfString('nome:');
            doc.font('Helvetica').fontSize(9).text(data.contratanteNome || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);

            doc.font('Helvetica-Bold').fontSize(9).text('profissão:', xC_2 + textPad, yRow + textYPad);
            labelWidth = doc.widthOfString('profissão:');
            doc.font('Helvetica').fontSize(9).text(data.contratanteProfissao || '', xC_2 + textPad + labelWidth + textPad, yRow + textYPad);
            yRow += rowHeight;

            // --- Linha 2: CPF / RG ---
            doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX, yRow + rowHeight).stroke(); // H
            doc.moveTo(xC_2, yRow).lineTo(xC_2, yRow + rowHeight).stroke(); // V
            doc.font('Helvetica-Bold').fontSize(9).text('CPF:', xC_1 + textPad, yRow + textYPad);
            labelWidth = doc.widthOfString('CPF:');
            doc.font('Helvetica').fontSize(9).text(data.contratanteCpf || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);

            doc.font('Helvetica-Bold').fontSize(9).text('RG:', xC_2 + textPad, yRow + textYPad);
            labelWidth = doc.widthOfString('RG:');
            doc.font('Helvetica').fontSize(9).text(data.contratanteRg || '', xC_2 + textPad + labelWidth + textPad, yRow + textYPad);
            yRow += rowHeight;

            // --- Linha 3: Estado Civil / Regime ---
            doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX, yRow + rowHeight).stroke(); // H
            doc.moveTo(xC_2, yRow).lineTo(xC_2, yRow + rowHeight).stroke(); // V
            doc.font('Helvetica-Bold').fontSize(9).text('Estado Civil:', xC_1 + textPad, yRow + textYPad);
            labelWidth = doc.widthOfString('Estado Civil:');
            doc.font('Helvetica').fontSize(9).text(data.contratanteEstadoCivil || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);

            doc.font('Helvetica-Bold').fontSize(9).text('Regime de Casamento:', xC_2 + textPad, yRow + textYPad);
            labelWidth = doc.widthOfString('Regime de Casamento:');
            doc.font('Helvetica').fontSize(9).text(data.contratanteRegimeCasamento || '', xC_2 + textPad + labelWidth + textPad, yRow + textYPad);
            yRow += rowHeight;

            // --- Linha 4: Endereço Residencial ---
            doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX, yRow + rowHeight).stroke(); // H
            doc.font('Helvetica-Bold').fontSize(9).text('Endereço Residencial:', xC_1 + textPad, yRow + textYPad);
            labelWidth = doc.widthOfString('Endereço Residencial:');
            doc.font('Helvetica').fontSize(9).text(data.contratanteEndereco || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);
            yRow += rowHeight;

            // --- Linha 5: Email ---
            // Sem linha H (é a última)
            doc.font('Helvetica-Bold').fontSize(9).text('Email:', xC_1 + textPad, yRow + textYPad);
            labelWidth = doc.widthOfString('Email:');
            doc.font('Helvetica').fontSize(9).text(data.contratanteEmail || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);
            
            y = yRow + rowHeight + 15; // Move Y para baixo do bloco
            
            // ==================================================================
            // 2. Bloco IMÓVEL (LAYOUT MANTIDO, ESPAÇO AJUSTADO)
            // ==================================================================
            const yI = y;
            const rHI = 20; // Altura da Linha
            const hI = rHI * 6; // Altura Total (6 linhas)

            // Desenha caixas externas
            doc.rect(MARGIN, yI, CONTENT_WIDTH, hI).stroke(); // Caixa externa
            doc.rect(MARGIN, yI, labelBoxWidth, hI).stroke(); // Caixa do label vertical

            // Desenha Texto Vertical IMÓVEL
            doc.save().translate(MARGIN + labelBoxWidth/2, yI + hI/2).rotate(-90).font('Helvetica-Bold').fontSize(10).text('IMÓVEL', -hI/2 + 5, 0, { width: hI, align: 'center' }).restore();

            // --- Define Colunas Internas ---
            const xI_1 = fieldBoxX;
            const xI_2 = fieldBoxX + 318; // Col 2 (para Valor)

            // --- Linha 1 (Imóvel, Valor) ---
            let yIRow = yI;
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.moveTo(xI_2, yIRow).lineTo(xI_2, yIRow + rHI).stroke(); // V
            doc.font('Helvetica-Bold').fontSize(9).text('Imóvel:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Imóvel:');
            doc.font('Helvetica').fontSize(9).text(data.imovelDescricao || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);
            
            doc.font('Helvetica-Bold').fontSize(9).text('Valor:', xI_2 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Valor:');
            doc.font('Helvetica').fontSize(9).text(formatCurrency(data.imovelValor) || '', xI_2 + textPad + labelWidth + textPad, yIRow + textYPad);

            // --- Linha 2 (Endereço) ---
            yIRow += rHI;
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.font('Helvetica-Bold').fontSize(9).text('Endereço:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Endereço:');
            doc.font('Helvetica').fontSize(9).text(data.imovelEndereco || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);

            // --- Linha 3 (Inscrição Imobiliária) ---
            yIRow += rHI;
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.font('Helvetica-Bold').fontSize(9).text('Inscrição Imobiliária/Registro de Imóveis/Matrícula:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Inscrição Imobiliária/Registro de Imóveis/Matrícula:');
            doc.font('Helvetica').fontSize(9).text(data.imovelMatricula || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);

            // --- Linha 4 (Administradora) ---
            yIRow += rHI;
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.font('Helvetica-Bold').fontSize(9).text('Administradora de Condomínio:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Administradora de Condomínio:');
            doc.font('Helvetica').fontSize(9).text(data.imovelAdminCondominio || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);

            // --- Linha 5 (Condomínio, Chamada, Parcelas - ESPAÇAMENTO AJUSTADO) ---
            yIRow += rHI;
            // AJUSTADO: Dando mais espaço para Chamada Capital
            const xI_L5_2 = fieldBoxX + 160; // Col 2 (Menor)
            const xI_L5_3 = fieldBoxX + 360; // Col 3 (Mais espaço p/ Chamada)
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.moveTo(xI_L5_2, yIRow).lineTo(xI_L5_2, yIRow + rHI).stroke(); // V
            doc.moveTo(xI_L5_3, yIRow).lineTo(xI_L5_3, yIRow + rHI).stroke(); // V
            
            doc.font('Helvetica-Bold').fontSize(9).text('Condomínio-Valor R$:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Condomínio-Valor R$:');
            doc.font('Helvetica').fontSize(9).text(formatCurrency(data.imovelValorCondominio) || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);
            
            doc.font('Helvetica-Bold').fontSize(9).text('Chamada de Capital R$:', xI_L5_2 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Chamada de Capital R$:');
            doc.font('Helvetica').fontSize(9).text(data.imovelChamadaCapital || '', xI_L5_2 + textPad + labelWidth + textPad, yIRow + textYPad);
            
            doc.font('Helvetica-Bold').fontSize(9).text('Nº de parcelas:', xI_L5_3 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Nº de parcelas:');
            doc.font('Helvetica').fontSize(9).text(data.imovelNumParcelas || '', xI_L5_3 + textPad + labelWidth + textPad, yIRow + textYPad);

            // --- Linha 6 (Exclusividade, Prazo) ---
            yIRow += rHI;
            const xI_L6_2 = fieldBoxX + 220; // Ajustado X para Checkbox e Prazo
            doc.moveTo(xI_L6_2, yIRow).lineTo(xI_L6_2, yIRow + rHI).stroke(); // V
            doc.font('Helvetica-Bold').fontSize(9).text('Exclusividade(*):', xI_1 + textPad, yIRow + textYPad);
            
            // Checkboxes (desenhando caixas vazias)
            doc.rect(xI_1 + 90, yIRow + textYPad - 2, 8, 8).stroke();
            doc.font('Helvetica').fontSize(9).text('SIM', xI_1 + 100, yIRow + textYPad);
            doc.rect(xI_1 + 130, yIRow + textYPad - 2, 8, 8).stroke();
            doc.font('Helvetica').fontSize(9).text('NÃO', xI_1 + 140, yIRow + textYPad);
            
            doc.font('Helvetica-Bold').fontSize(9).text('Prazo de exclusividade:', xI_L6_2 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Prazo de exclusividade:');
            doc.font('Helvetica').fontSize(9).text((data.contratoPrazo || '') + ' dias', xI_L6_2 + textPad + labelWidth + textPad, yIRow + textYPad);

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
            doc.font('Helvetica').text(` A venda é concebida a contar desta data pelo prazo e forma acima definidos. Após esse período o contrato se encerra.`, MARGIN + 15, doc.y);
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

            // --- 4. Assinaturas ---
            const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
            doc.font('Helvetica-Bold').fontSize(9).text('Local e data:', MARGIN, doc.y);
            doc.font('Helvetica').fontSize(9).text(`Joinville, ${dataHoje}`, MARGIN + 60, doc.y);
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