import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

// --- HELPERS BÁSICOS ---
function formatCurrency(value) {
    // Retorna string vazia se inválido
    if (!value || isNaN(value)) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// --- CONSTANTES DE LAYOUT ---
const MARGIN = 50;
const PAGE_WIDTH = 612;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2); // 512
const PAGE_END = PAGE_WIDTH - MARGIN; // 562

// ==================================================================
// FUNÇÃO DE HEADER CORRIGIDA (Layout como image_237196.png)
// ==================================================================
function drawHeader(doc) {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        // Ajuste o caminho se necessário, baseado na sua estrutura de pastas
        const logoPath = path.join(__dirname, '..', 'images', 'logo.jpeg');
        console.log('Tentando carregar logo de:', logoPath);

        // 1. Bloco da Esquerda (Logo pequeno)
        doc.image(logoPath, MARGIN, MARGIN - 5, { width: 180 }); // Tamanho razoável

    } catch (imageError) {
         console.error("Erro ao carregar o logo:", imageError.message);
         // Fallback texto se logo falhar
         doc.font('Helvetica-Bold').fontSize(11).text('Beehouse', MARGIN, MARGIN + 10);
    }

    // 2. Bloco da Direita (Título, Nome da Empresa, Endereço)
    const rightAlignX = PAGE_WIDTH - MARGIN - 250; // Posição X do bloco
    const blockWidth = 250; // Largura do bloco
    const initialY = MARGIN - 5; // Posição Y inicial (um pouco acima da margem)

    doc.font('Helvetica-Bold').fontSize(11).text('Autorização de Venda', rightAlignX, initialY, { width: blockWidth, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(11).text('Beehouse Investimentos Imobiliários', rightAlignX, initialY + 12, { width: blockWidth, align: 'right' });
    doc.font('Helvetica').fontSize(9).text('R. Jacob Eisenhut, 223 - SL 801 - Atiradores - Joinville/SC', rightAlignX, initialY + 24, { width: blockWidth, align: 'right' });
    doc.text('www.beehouse.sc | Fone: (47) 99287-9066', rightAlignX, initialY + 36, { width: blockWidth, align: 'right' }); // Corrigido URL

    // Posição Y fixa após o header (mantendo espaço extra)
    doc.y = MARGIN + 65;
}


// ==================================================================
// FUNÇÃO DE GERAÇÃO DE PDF (COM BLOCO CÔNJUGE CORRIGIDO)
// ==================================================================
async function generatePdfPromise(data) {

    return new Promise((resolve, reject) => {

        const doc = new PDFDocument({ margin: MARGIN, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('error', (err) => reject(err));
        doc.on('end', () => resolve(Buffer.concat(buffers)));

        try {
            drawHeader(doc);

            let y = doc.y;
            const textPad = 5;
            const textYPad = 7;
            const labelBoxWidth = 22;
            const fieldBoxX = MARGIN + labelBoxWidth;
            const endX = MARGIN + CONTENT_WIDTH;
            let labelWidth = 0;
            const rowHeight = 20;

            // --- LÓGICA CONDICIONAL PARA CONTRATANTES ---
            const authType = data.authType;
            const numSocios = parseInt(data.numSocios, 10) || 1;

            for (let i = 0; i < numSocios; i++) {
                const prefix = numSocios > 1 ? `socio${i+1}` : 'contratante';
                const titulo = numSocios > 1 ? `SÓCIO ${i+1}` : 'CONTRATANTE';

                 if (i > 0) y += 20;

                const yC = y;
                const hC = rowHeight * 5;

                doc.rect(MARGIN, yC, CONTENT_WIDTH, hC).stroke();
                doc.rect(MARGIN, yC, labelBoxWidth, hC).stroke();
                doc.save().translate(MARGIN + labelBoxWidth/2, yC + hC/2).rotate(-90).font('Helvetica-Bold').fontSize(10).text(titulo, -hC / 2, -4, { width: hC, align: 'center' }).restore(); // Centralizado

                const xC_1 = fieldBoxX;
                const xC_2 = fieldBoxX + (CONTENT_WIDTH - labelBoxWidth) / 2;
                let yRow = yC;

                // Linha 1: nome / profissão
                doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX, yRow + rowHeight).stroke();
                doc.moveTo(xC_2, yRow).lineTo(xC_2, yRow + rowHeight).stroke();
                doc.font('Helvetica-Bold').fontSize(9).text('Nome:', xC_1 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('Nome:');
                doc.font('Helvetica').fontSize(9).text(data[`${prefix}Nome`] || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);
                doc.font('Helvetica-Bold').fontSize(9).text('Profissão:', xC_2 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('Profissão:');
                doc.font('Helvetica').fontSize(9).text(data[`${prefix}Profissao`] || '', xC_2 + textPad + labelWidth + textPad, yRow + textYPad);
                yRow += rowHeight;

                // Linha 2: CPF / RG
                doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX, yRow + rowHeight).stroke();
                doc.moveTo(xC_2, yRow).lineTo(xC_2, yRow + rowHeight).stroke();
                doc.font('Helvetica-Bold').fontSize(9).text('CPF:', xC_1 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('CPF:');
                doc.font('Helvetica').fontSize(9).text(data[`${prefix}Cpf`] || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);
                doc.font('Helvetica-Bold').fontSize(9).text('RG:', xC_2 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('RG:');
                doc.font('Helvetica').fontSize(9).text(data[`${prefix}Rg`] || '', xC_2 + textPad + labelWidth + textPad, yRow + textYPad);
                yRow += rowHeight;

                // Linha 3: Estado Civil / Regime
                doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX - 20, yRow + rowHeight).stroke();
                doc.moveTo(xC_2, yRow).lineTo(xC_2, yRow + rowHeight).stroke();
                doc.font('Helvetica-Bold').fontSize(9).text('Estado Civil:', xC_1 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('Estado Civil:');
                doc.font('Helvetica').fontSize(9).text(data[`${prefix}EstadoCivil`] || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);
                if (data[`${prefix}RegimeCasamento`]) {
                    doc.font('Helvetica-Bold').fontSize(9).text('Regime de Casamento:', xC_2 + textPad, yRow + textYPad);
                    labelWidth = doc.widthOfString('Regime de Casamento:');
                    doc.font('Helvetica').fontSize(9).text(data[`${prefix}RegimeCasamento`], xC_2 + textPad + labelWidth + textPad, yRow + textYPad);
                }
                else {
                    doc.font('Helvetica-Bold').fontSize(9).text('Regime de Casamento:', xC_2 + textPad, yRow + textYPad);
                    labelWidth = doc.widthOfString('Regime de Casamento:');
                }
                yRow += rowHeight;

                // Linha 4: Endereço Residencial
                doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX, yRow + rowHeight).stroke();
                doc.font('Helvetica-Bold').fontSize(9).text('Endereço Residencial:', xC_1 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('Endereço Residencial:');
                doc.font('Helvetica').fontSize(9).text(data[`${prefix}Endereco`] || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);
                yRow += rowHeight;

                // Linha 5: Email
                doc.font('Helvetica-Bold').fontSize(9).text('Email:', xC_1 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('Email:');
                doc.font('Helvetica').fontSize(9).text(data[`${prefix}Email`] || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);

                y = yRow + rowHeight;
            } // Fim loop contratante/sócio

             // --- Bloco CÔNJUGE (se authType for 'casado') ---
             if (authType === 'casado') {
                 y += 15;
                 const yConj = y;
                 // ==================================================
                 // CORREÇÃO: Altura para 3 linhas (Nome/CPF/RG, Profissão, Email)
                 const hConj = rowHeight * 3; // Aumentado para 3 linhas
                 // ==================================================

                 doc.rect(MARGIN, yConj, CONTENT_WIDTH, hConj).stroke();
                 doc.rect(MARGIN, yConj, labelBoxWidth, hConj).stroke();
                 // Ajustado posicionamento Y do texto vertical para nova altura
                 doc.save().translate(MARGIN + labelBoxWidth/2, yConj + hConj/2).rotate(-90).font('Helvetica-Bold').fontSize(10).text('CÔNJUGE', -hConj / 2, -4, { width: hConj, align: 'center' }).restore();

                 const xConj_1 = fieldBoxX;
                 const xConj_2 = fieldBoxX + (CONTENT_WIDTH - labelBoxWidth) / 3;
                 const xConj_3 = fieldBoxX + 2*(CONTENT_WIDTH - labelBoxWidth) / 3;
                 let yRowConj = yConj;

                 // Linha 1 Cônjuge: Nome / CPF / RG
                 doc.moveTo(fieldBoxX, yRowConj + rowHeight).lineTo(endX, yRowConj + rowHeight).stroke(); // H
                 doc.moveTo(xConj_2, yRowConj).lineTo(xConj_2, yRowConj + rowHeight).stroke(); // V
                 doc.moveTo(xConj_3, yRowConj).lineTo(xConj_3, yRowConj + rowHeight).stroke(); // V
                 doc.font('Helvetica-Bold').fontSize(9).text('Nome:', xConj_1 + textPad, yRowConj + textYPad);
                 labelWidth = doc.widthOfString('Nome:');
                 doc.font('Helvetica').fontSize(9).text(data.conjugeNome || '', xConj_1 + textPad + labelWidth + textPad, yRowConj + textYPad);
                 doc.font('Helvetica-Bold').fontSize(9).text('CPF:', xConj_2 + textPad, yRowConj + textYPad);
                 labelWidth = doc.widthOfString('CPF:');
                 doc.font('Helvetica').fontSize(9).text(data.conjugeCpf || '', xConj_2 + textPad + labelWidth + textPad, yRowConj + textYPad);
                 doc.font('Helvetica-Bold').fontSize(9).text('RG:', xConj_3 + textPad, yRowConj + textYPad);
                 labelWidth = doc.widthOfString('RG:');
                 doc.font('Helvetica').fontSize(9).text(data.conjugeRg || '', xConj_3 + textPad + labelWidth + textPad, yRowConj + textYPad);
                 yRowConj += rowHeight;

                 // Linha 2 Cônjuge: Profissão (Span all)
                 doc.moveTo(fieldBoxX, yRowConj + rowHeight).lineTo(endX, yRowConj + rowHeight).stroke(); // H
                 doc.font('Helvetica-Bold').fontSize(9).text('Profissão:', xConj_1 + textPad, yRowConj + textYPad);
                 labelWidth = doc.widthOfString('Profissão:');
                 doc.font('Helvetica').fontSize(9).text(data.conjugeProfissao || '', xConj_1 + textPad + labelWidth + textPad, yRowConj + textYPad);
                 yRowConj += rowHeight;

                 // ==================================================
                 // CORREÇÃO: Adicionada Linha 3 para Email do Cônjuge
                 // ==================================================
                 // Sem linha H (é a última linha do bloco)
                 doc.font('Helvetica-Bold').fontSize(9).text('Email:', xConj_1 + textPad, yRowConj + textYPad);
                 labelWidth = doc.widthOfString('Email:');
                 doc.font('Helvetica').fontSize(9).text(data.conjugeEmail || '', xConj_1 + textPad + labelWidth + textPad, yRowConj + textYPad);
                 // yRowConj += rowHeight; // Não precisa incrementar Y aqui

                 y = yConj + hConj; // Usa a altura total da caixa (agora 3 linhas)
             }


            y += 15;

            // ==================================================================
            // 2. Bloco IMÓVEL (COM CHECKBOX CORRIGIDO)
            // ==================================================================
            const yI = y;
            const rHI = 20;
            const hI = rHI * 6;

            doc.rect(MARGIN, yI, CONTENT_WIDTH, hI).stroke();
            doc.rect(MARGIN, yI, labelBoxWidth, hI).stroke();
            doc.save().translate(MARGIN + labelBoxWidth/2, yI + hI/2).rotate(-90).font('Helvetica-Bold').fontSize(10).text('IMÓVEL', -hI / 2, -4, { width: hI, align: 'center' }).restore(); // Centralizado

            const xI_1 = fieldBoxX;
            const xI_2 = fieldBoxX + 318;
            let yIRow = yI;

            // --- Linha 1 (Imóvel, Valor) ---
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.moveTo(xI_2, yIRow).lineTo(xI_2, yIRow + rHI).stroke(); // V
            doc.font('Helvetica-Bold').fontSize(9).text('Imóvel:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Imóvel:');
            doc.font('Helvetica').fontSize(9).text(data.imovelDescricao || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);
            doc.font('Helvetica-Bold').fontSize(9).text('Valor:', xI_2 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Valor:');
            doc.font('Helvetica').fontSize(9).text(formatCurrency(data.imovelValor) || '', xI_2 + textPad + labelWidth + textPad, yIRow + textYPad);
            yIRow += rHI;

            // --- Linha 2 (Endereço) ---
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.font('Helvetica-Bold').fontSize(9).text('Endereço:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Endereço:');
            doc.font('Helvetica').fontSize(9).text(data.imovelEndereco || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);
            yIRow += rHI;

            // --- Linha 3 (Inscrição Imobiliária) ---
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.font('Helvetica-Bold').fontSize(9).text('Inscrição Imobiliária/Registro de Imóveis/Matrícula:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Inscrição Imobiliária/Registro de Imóveis/Matrícula:');
            doc.font('Helvetica').fontSize(9).text(data.imovelMatricula || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);
            yIRow += rHI;

            // --- Linha 4 (Administradora) ---
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.font('Helvetica-Bold').fontSize(9).text('Administradora de Condomínio:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Administradora de Condomínio:');
            doc.font('Helvetica').fontSize(9).text(data.imovelAdminCondominio || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);
            yIRow += rHI;

            // --- Linha 5 (Condomínio, Chamada, Parcelas) ---
            const xI_L5_2 = fieldBoxX + 160;
            const xI_L5_3 = fieldBoxX + 360;
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.moveTo(xI_L5_2, yIRow).lineTo(xI_L5_2, yIRow + rHI).stroke(); // V
            doc.moveTo(xI_L5_3, yIRow).lineTo(xI_L5_3, yIRow + rHI).stroke(); // V
            doc.font('Helvetica-Bold').fontSize(9).text('Valor do Condomínio:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Valor do Condomínio:');
            doc.font('Helvetica').fontSize(9).text(formatCurrency(data.imovelValorCondominio) || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);
            doc.font('Helvetica-Bold').fontSize(9).text('Chamada de Capital:', xI_L5_2 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Chamada de Capital:');
            doc.font('Helvetica').fontSize(9).text(formatCurrency(data.imovelChamadaCapital) || '', xI_L5_2 + textPad + labelWidth + textPad, yIRow + textYPad);
            doc.font('Helvetica-Bold').fontSize(9).text('Nº de parcelas:', xI_L5_3 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Nº de parcelas:');
            doc.font('Helvetica').fontSize(9).text(data.imovelNumParcelas || '', xI_L5_3 + textPad + labelWidth + textPad, yIRow + textYPad);
            yIRow += rHI;

            // --- Linha 6 (Exclusividade, Prazo - COM CHECKBOX CORRIGIDO) ---
            const xI_L6_2 = fieldBoxX + 220;
            doc.moveTo(xI_L6_2, yIRow).lineTo(xI_L6_2, yIRow + rHI).stroke(); // V
            doc.font('Helvetica-Bold').fontSize(9).text('Exclusividade(*):', xI_1 + textPad, yIRow + textYPad);

            // Lógica do Checkbox
            const prazoNum = parseInt(data.contratoPrazo, 10);
            const temExclusividade = !isNaN(prazoNum) && prazoNum > 0;
            const xSim = xI_1 + 90;
            const xNao = xI_1 + 130;
            const yCheck = yIRow + textYPad - 2; // Ajuste Y
            const checkSize = 8;

            doc.rect(xSim, yCheck, checkSize, checkSize).stroke(); // Caixa SIM
            doc.font('Helvetica').fontSize(9).text('SIM', xSim + checkSize + 2, yIRow + textYPad);
            doc.rect(xNao, yCheck, checkSize, checkSize).stroke(); // Caixa NÃO
            doc.font('Helvetica').fontSize(9).text('NÃO', xNao + checkSize + 2, yIRow + textYPad);

            // Desenha o "X" centralizado
            doc.font('Helvetica-Bold').fontSize(10);
            const xMarkXOffset = checkSize / 2;
            const xMarkYOffset = checkSize / 2 - 0.5;
            if (temExclusividade) {
                doc.path(`M ${xSim} ${yCheck} L ${xSim + checkSize} ${yCheck + checkSize} M ${xSim + checkSize} ${yCheck} L ${xSim} ${yCheck + checkSize}`).lineWidth(1.5).stroke();
            } else {
                doc.path(`M ${xNao} ${yCheck} L ${xNao + checkSize} ${yCheck + checkSize} M ${xNao + checkSize} ${yCheck} L ${xNao} ${yCheck + checkSize}`).lineWidth(1.5).stroke();
            }
            doc.fontSize(9);

            doc.font('Helvetica-Bold').text('Prazo de exclusividade:', xI_L6_2 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Prazo de exclusividade:');
            doc.font('Helvetica').text((temExclusividade ? data.contratoPrazo : '0') + ' dias', xI_L6_2 + textPad + labelWidth + textPad, yIRow + textYPad);

            y = yIRow + rHI + 10;

            // --- 3. Seção CLÁUSULAS ---
            doc.y = y;
            doc.x = MARGIN;
            doc.font('Helvetica').fontSize(9);
            // ... (Cláusulas e texto de fechamento permanecem iguais) ...
             const textoPreambulo = 'O Contratante autoriza a Beehouse Investimentos Imobiliários inscrita no CNPJ sob nº 14.477.349/0001-23, situada nesta cidade, na Rua Jacob Eisenhut, 223 - SL 801 Bairro Atiradores, Cep: 89.203-070 - Joinville-SC, a promover a venda do imóvel com a descrição acima, mediante as seguintes condições:';
            doc.text(textoPreambulo, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(1);
            doc.font('Helvetica-Bold').text('1º', MARGIN, doc.y, { continued: true });
            doc.font('Helvetica').text(` A venda é concebida a contar desta data pelo prazo e forma acima definidos. Após esse período o contrato se encerra.`, {indent: 10, align: 'justify'});
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').text('2º', MARGIN, doc.y, { continued: true });
            doc.font('Helvetica').text(` O Contratante pagará a Contratada, uma vez concluído o negócio a comissão de ${data.contratoComissaoPct || '6'}% (seis por cento) sobre o valor da venda, no ato do recebimento do sinal. Esta comissão é devida também mesmo fora do prazo desta autorização desde que a venda do imóvel seja efetuado por cliente apresentado pela Contratada ou nos caso em que, comprovadamente, a negociação tiver sido por esta iniciada, observando também o artigo 727 do Código Civil Brasileiro`, {indent: 10, align: 'justify'});
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').text('3º', MARGIN, doc.y, { continued: true });
            doc.font('Helvetica').text(' A Contratada compromete-se a fazer publicidade do imóvel, podendo colocar placas, anunciar em jornais e meios de divulgação do imóvel ao público.', {indent: 10, align: 'justify'});
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').text('4º', MARGIN, doc.y, { continued: true });
            doc.font('Helvetica').text(' O Contratante declara que o imóvel encontra-se livre e desembaraçado, inexistindo quaisquer impedimento judicial e/ou extra judicial que impeça a transferencia de posse, comprometendo-se a fornecer cópia do Registro de Imóveis, CPF, RG e carne de IPTU.', {indent: 10, align: 'justify'});
            doc.moveDown(0.5);
            doc.font('Helvetica-Bold').text('5º', MARGIN, doc.y, { continued: true });
            doc.font('Helvetica').text(' Em caso de qualquer controversia decorrente deste contrato, as partes elegem o Foro da Comarca de Joinville/SC para dirimir quaisquer dúvidas deste contrato, renunciando qualquer outro, por mais privilégio que seja.', {indent: 10, align: 'justify'});
            doc.moveDown(1);
            const textoFechamento = 'Assim por estarem juntos e contratados, obrigam-se a si e seus herdeiros a cumprir e fazer cumprir o disposto neste contrato, assinando-os em duas vias de igual teor e forma, na presença de testemunhas, a tudo presentes.';
            doc.text(textoFechamento, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(2);


            // --- 4. Assinaturas (CONDICIONAL) ---
            const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
            doc.font('Helvetica-Bold').fontSize(9).text('Local e data:', MARGIN, doc.y);
            doc.font('Helvetica').fontSize(9).text(`Joinville, ${dataHoje}`, MARGIN + 60, doc.y);

            let sigY = doc.y + 40;

            const sigWidth = 160;
            const sigSpacing = (CONTENT_WIDTH - (3 * sigWidth)) / 2; // Espaço para 3 colunas
            const sigTextYOffset = 5;
            const sigSubTextYOffset = 15;
            let currentSigX = MARGIN;

            // Função helper para desenhar uma assinatura
            const drawSignature = (label, subLabel = '', x, yPos) => {
                 doc.moveTo(x, yPos).lineTo(x + sigWidth, yPos).stroke();
                 doc.font('Helvetica-Bold').fontSize(8).text((label || '').toUpperCase(), x, yPos + sigTextYOffset, { width: sigWidth, align: 'center' });
                 if (subLabel) {
                     doc.font('Helvetica').fontSize(8).text(subLabel, x, yPos + sigSubTextYOffset, { width: sigWidth, align: 'center' });
                 }
            };

            // Beehouse (Sempre presente, na primeira posição)
            drawSignature('Beehouse Investimentos Imobiliários', 'CNPJ 14.477.349/0001-23', currentSigX, sigY);

            if (authType === 'casado') {
                currentSigX = MARGIN + sigWidth + sigSpacing;
                drawSignature(data.contratanteNome || 'CONTRATANTE', data.contratanteCpf || 'CPF/CNPJ', currentSigX, sigY);
                currentSigX = MARGIN + 2 * (sigWidth + sigSpacing);
                drawSignature(data.conjugeNome || 'CÔNJUGE', data.conjugeCpf || 'CPF/CNPJ', currentSigX, sigY);

            } else if (authType === 'socios') {
                 currentSigX = MARGIN + sigWidth + sigSpacing; // Coluna 2
                 drawSignature(data.socio1Nome || 'SÓCIO 1', data.socio1Cpf || 'CPF/CNPJ', currentSigX, sigY);

                 if (numSocios >= 2) {
                    currentSigX = MARGIN + 2 * (sigWidth + sigSpacing); // Coluna 3
                    drawSignature(data.socio2Nome || 'SÓCIO 2', data.socio2Cpf || 'CPF/CNPJ', currentSigX, sigY);
                 }

                 let socioIndex = 2;
                 while (socioIndex < numSocios) {
                      sigY += 40; // Pula linha
                      for (let col = 0; col < 3 && socioIndex < numSocios; col++) {
                          currentSigX = MARGIN + col * (sigWidth + sigSpacing);
                          const prefix = `socio${socioIndex + 1}`;
                          drawSignature(data[`${prefix}Nome`] || `SÓCIO ${socioIndex + 1}`, data[`${prefix}Cpf`] || 'CPF/CNPJ', currentSigX, sigY);
                          socioIndex++;
                      }
                 }

            } else { // Solteiro / Viúvo
                 currentSigX = MARGIN + sigWidth + sigSpacing; // Coluna 2
                 drawSignature(data.contratanteNome || 'CONTRATANTE', data.contratanteCpf || 'CPF/CNPJ', currentSigX, sigY);
            }

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
        console.log('Iniciando geração do PDF com dados:', data);

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