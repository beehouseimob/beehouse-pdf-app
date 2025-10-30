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
const MARGIN_LEFT = 30; // Margem esquerda
const MARGIN = 50;      // Margem Topo, Direita e Rodapé
const PAGE_WIDTH = 612; // Largura A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN; // (612 - 40 - 50 = 522)
const PAGE_END = PAGE_WIDTH - MARGIN; // 612 - 50 = 562

// ==================================================================
// FUNÇÃO DE HEADER
// ==================================================================
function drawHeader(doc) {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const logoPath = path.join(__dirname, '..', 'images', 'logo.jpeg');
        console.log('Tentando carregar logo de:', logoPath);

        // 1. Bloco da Esquerda (Logo)
        doc.image(logoPath, MARGIN_LEFT, MARGIN - 5, { width: 180 });

    } catch (imageError) {
         console.error("Erro ao carregar o logo:", imageError.message);
         doc.font('Helvetica-Bold').fontSize(10).text('Beehouse', MARGIN_LEFT, MARGIN + 10);
    }

    // 2. Bloco da Direita (Título, Nome da Empresa, Endereço)
    const rightAlignX = PAGE_WIDTH - MARGIN - 250; 
    const blockWidth = 250; 
    const initialY = MARGIN - 5; 

    doc.font('Helvetica-Bold').fontSize(10).text('Autorização de Venda', rightAlignX, initialY, { width: blockWidth, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(10).text('Beehouse Investimentos Imobiliários', rightAlignX, initialY + 12, { width: blockWidth, align: 'right' });
    doc.font('Helvetica').fontSize(8).text('R. Jacob Eisenhut, 223 - SL 801 - Atiradores - Joinville/SC', rightAlignX, initialY + 24, { width: blockWidth, align: 'right' });
    doc.text('www.beehouse.imb.br | Fone: (47) 99287-9066', rightAlignX, initialY + 36, { width: blockWidth, align: 'right' }); 

    doc.y = MARGIN + 65;
}


// ==================================================================
// FUNÇÃO DE GERAÇÃO DE PDF
// ==================================================================
async function generatePdfPromise(data) {

    return new Promise((resolve, reject) => {

        // Define as margens T/R/B/L (Topo, Direita, Fundo, Esquerda)
        const doc = new PDFDocument({ 
            margins: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN_LEFT }, 
            size: 'A4' 
        });
        
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
            const fieldBoxX = MARGIN_LEFT + labelBoxWidth; // Ponto X inicial dos campos
            const endX = MARGIN_LEFT + CONTENT_WIDTH;     // Ponto X final (borda direita)
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

                doc.rect(MARGIN_LEFT, yC, CONTENT_WIDTH, hC).stroke();
                doc.rect(MARGIN_LEFT, yC, labelBoxWidth, hC).stroke();
                doc.save().translate(MARGIN_LEFT + labelBoxWidth/2, yC + hC/2).rotate(-90).font('Helvetica-Bold').fontSize(10).text(titulo, -hC / 2, -4, { width: hC, align: 'center' }).restore();

                const xC_1 = fieldBoxX;
                const xC_2 = fieldBoxX + (CONTENT_WIDTH - labelBoxWidth) / 2;
                let yRow = yC;

                // Linha 1: nome / profissão
                doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX, yRow + rowHeight).stroke();
                doc.moveTo(xC_2, yRow).lineTo(xC_2, yRow + rowHeight).stroke();
                doc.font('Helvetica-Bold').fontSize(8).text('Nome:', xC_1 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('Nome:');
                doc.font('Helvetica').fontSize(8).text(data[`${prefix}Nome`] || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);
                doc.font('Helvetica-Bold').fontSize(8).text('Profissão:', xC_2 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('Profissão:');
                doc.font('Helvetica').fontSize(8).text(data[`${prefix}Profissao`] || '', xC_2 + textPad + labelWidth + textPad, yRow + textYPad);
                yRow += rowHeight;

                // Linha 2: CPF / RG
                doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX, yRow + rowHeight).stroke();
                doc.moveTo(xC_2, yRow).lineTo(xC_2, yRow + rowHeight).stroke();
                doc.font('Helvetica-Bold').fontSize(8).text('CPF:', xC_1 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('CPF:');
                doc.font('Helvetica').fontSize(8).text(data[`${prefix}Cpf`] || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);
                doc.font('Helvetica-Bold').fontSize(8).text('RG:', xC_2 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('RG:');
                doc.font('Helvetica').fontSize(8).text(data[`${prefix}Rg`] || '', xC_2 + textPad + labelWidth + textPad, yRow + textYPad);
                yRow += rowHeight;

                // Linha 3: Estado Civil / Regime
                doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX, yRow + rowHeight).stroke();
                doc.moveTo(xC_2, yRow).lineTo(xC_2, yRow + rowHeight).stroke();
                doc.font('Helvetica-Bold').fontSize(8).text('Estado Civil:', xC_1 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('Estado Civil:');
                doc.font('Helvetica').fontSize(8).text(data[`${prefix}EstadoCivil`] || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);
                if (data[`${prefix}RegimeCasamento`]) {
                    doc.font('Helvetica-Bold').fontSize(8).text('Regime de Casamento:', xC_2 + textPad, yRow + textYPad);
                    labelWidth = doc.widthOfString('Regime de Casamento:');
                    doc.font('Helvetica').fontSize(8).text(data[`${prefix}RegimeCasamento`], xC_2 + textPad + labelWidth + textPad, yRow + textYPad);
                }
                else {
                    doc.font('Helvetica-Bold').fontSize(8).text('Regime de Casamento:', xC_2 + textPad, yRow + textYPad);
                    labelWidth = doc.widthOfString('Regime de Casamento:');
                }
                yRow += rowHeight;

                // Linha 4: Endereço Residencial
                doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX, yRow + rowHeight).stroke();
                doc.font('Helvetica-Bold').fontSize(8).text('Endereço Residencial:', xC_1 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('Endereço Residencial:');
                doc.font('Helvetica').fontSize(8).text(data[`${prefix}Endereco`] || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);
                yRow += rowHeight;

                // Linha 5: Email
                doc.font('Helvetica-Bold').fontSize(8).text('Email:', xC_1 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('Email:');
                doc.font('Helvetica').fontSize(8).text(data[`${prefix}Email`] || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);

                y = yRow + rowHeight;
            } // Fim loop contratante/sócio

             // --- Bloco CÔNJUGE (se authType for 'casado') ---
             if (authType === 'casado') {
                 y += 15;
                 const yConj = y;
                 const hConj = rowHeight * 3; // Altura para 3 linhas

                 doc.rect(MARGIN_LEFT, yConj, CONTENT_WIDTH, hConj).stroke();
                 doc.rect(MARGIN_LEFT, yConj, labelBoxWidth, hConj).stroke();
                 doc.save().translate(MARGIN_LEFT + labelBoxWidth/2, yConj + hConj/2).rotate(-90).font('Helvetica-Bold').fontSize(10).text('CÔNJUGE', -hConj / 2, -4, { width: hConj, align: 'center' }).restore();

                 const xConj_1 = fieldBoxX;
                 const xConj_2 = fieldBoxX + (CONTENT_WIDTH - labelBoxWidth) / 3;
                 const xConj_3 = fieldBoxX + 2*(CONTENT_WIDTH - labelBoxWidth) / 3;
                 let yRowConj = yConj;

                 // Linha 1 Cônjuge: Nome / CPF / RG
                 doc.moveTo(fieldBoxX, yRowConj + rowHeight).lineTo(endX, yRowConj + rowHeight).stroke(); // H
                 doc.moveTo(xConj_2, yRowConj).lineTo(xConj_2, yRowConj + rowHeight).stroke(); // V
                 doc.moveTo(xConj_3, yRowConj).lineTo(xConj_3, yRowConj + rowHeight).stroke(); // V
                 doc.font('Helvetica-Bold').fontSize(8).text('Nome:', xConj_1 + textPad, yRowConj + textYPad);
                 labelWidth = doc.widthOfString('Nome:');
                 doc.font('Helvetica').fontSize(8).text(data.conjugeNome || '', xConj_1 + textPad + labelWidth + textPad, yRowConj + textYPad);
                 doc.font('Helvetica-Bold').fontSize(8).text('CPF:', xConj_2 + textPad, yRowConj + textYPad);
                 labelWidth = doc.widthOfString('CPF:');
                 doc.font('Helvetica').fontSize(8).text(data.conjugeCpf || '', xConj_2 + textPad + labelWidth + textPad, yRowConj + textYPad);
                 doc.font('Helvetica-Bold').fontSize(8).text('RG:', xConj_3 + textPad, yRowConj + textYPad);
                 labelWidth = doc.widthOfString('RG:');
                 doc.font('Helvetica').fontSize(8).text(data.conjugeRg || '', xConj_3 + textPad + labelWidth + textPad, yRowConj + textYPad);
                 yRowConj += rowHeight;

                 // Linha 2 Cônjuge: Profissão
                 doc.moveTo(fieldBoxX, yRowConj + rowHeight).lineTo(endX, yRowConj + rowHeight).stroke(); // H
                 doc.font('Helvetica-Bold').fontSize(8).text('Profissão:', xConj_1 + textPad, yRowConj + textYPad);
                 labelWidth = doc.widthOfString('Profissão:');
                 // ** CORREÇÃO AQUI **
                 doc.font('Helvetica').fontSize(8).text(data.conjugeProfissao || '', xConj_1 + textPad + labelWidth + textPad, yRowConj + textYPad);
                 yRowConj += rowHeight;
                 
                 // Linha 3 Cônjuge: Email
                 doc.font('Helvetica-Bold').fontSize(8).text('Email:', xConj_1 + textPad, yRowConj + textYPad);
                 labelWidth = doc.widthOfString('Email:');
                 // ** CORREÇÃO AQUI **
                 doc.font('Helvetica').fontSize(8).text(data.conjugeEmail || '', xConj_1 + textPad + labelWidth + textPad, yRowConj + textYPad);

                 y = yConj + hConj; // Usa a altura total
             }


            y += 15;

            // ==================================================================
            // 2. Bloco IMÓVEL
            // ==================================================================
            const yI = y;
            const rHI = 20;
            const hI = rHI * 6;

            doc.rect(MARGIN_LEFT, yI, CONTENT_WIDTH, hI).stroke();
            doc.rect(MARGIN_LEFT, yI, labelBoxWidth, hI).stroke();
            doc.save().translate(MARGIN_LEFT + labelBoxWidth/2, yI + hI/2).rotate(-90).font('Helvetica-Bold').fontSize(10).text('IMÓVEL', -hI / 2, -4, { width: hI, align: 'center' }).restore();

            const xI_1 = fieldBoxX;
            const xI_2 = fieldBoxX + 318;
            let yIRow = yI;

            // --- Linha 1 (Imóvel, Valor) ---
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.moveTo(xI_2, yIRow).lineTo(xI_2, yIRow + rHI).stroke(); // V
            doc.font('Helvetica-Bold').fontSize(8).text('Imóvel:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Imóvel:');
            doc.font('Helvetica').fontSize(8).text(data.imovelDescricao || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);
            doc.font('Helvetica-Bold').fontSize(8).text('Valor:', xI_2 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Valor:');
            doc.font('Helvetica').fontSize(8).text(formatCurrency(data.imovelValor) || '', xI_2 + textPad + labelWidth + textPad, yIRow + textYPad);
            yIRow += rHI;

            // --- Linha 2 (Endereço) ---
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.font('Helvetica-Bold').fontSize(8).text('Endereço:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Endereço:');
            doc.font('Helvetica').fontSize(8).text(data.imovelEndereco || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);
            yIRow += rHI;

            // --- Linha 3 (Inscrição Imobiliária) ---
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.font('Helvetica-Bold').fontSize(8).text('Inscrição Imobiliária/Registro de Imóveis/Matrícula:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Inscrição Imobiliária/Registro de Imóveis/Matrícula:');
            doc.font('Helvetica').fontSize(8).text(data.imovelMatricula || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);
            yIRow += rHI;

            // --- Linha 4 (Administradora) ---
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.font('Helvetica-Bold').fontSize(8).text('Administradora de Condomínio:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Administradora de Condomínio:');
            doc.font('Helvetica').fontSize(8).text(data.imovelAdminCondominio || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);
            yIRow += rHI;

            // --- Linha 5 (Condomínio, Chamada, Parcelas) ---
            const xI_L5_2 = fieldBoxX + 160;
            const xI_L5_3 = fieldBoxX + 360;
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.moveTo(xI_L5_2, yIRow).lineTo(xI_L5_2, yIRow + rHI).stroke(); // V
            doc.moveTo(xI_L5_3, yIRow).lineTo(xI_L5_3, yIRow + rHI).stroke(); // V
            doc.font('Helvetica-Bold').fontSize(8).text('Valor do Condomínio:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Valor do Condomínio:');
            doc.font('Helvetica').fontSize(8).text(formatCurrency(data.imovelValorCondominio) || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);
            doc.font('Helvetica-Bold').fontSize(8).text('Chamada de Capital:', xI_L5_2 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Chamada de Capital:');
            doc.font('Helvetica').fontSize(8).text(formatCurrency(data.imovelChamadaCapital) || '', xI_L5_2 + textPad + labelWidth + textPad, yIRow + textYPad);
            doc.font('Helvetica-Bold').fontSize(8).text('Nº de parcelas:', xI_L5_3 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Nº de parcelas:');
            doc.font('Helvetica').fontSize(8).text(data.imovelNumParcelas || '', xI_L5_3 + textPad + labelWidth + textPad, yIRow + textYPad);
            yIRow += rHI;

            // --- Linha 6 (Exclusividade, Prazo) ---
            const xI_L6_2 = fieldBoxX + 220;
            doc.moveTo(xI_L6_2, yIRow).lineTo(xI_L6_2, yIRow + rHI).stroke(); // V
            doc.font('Helvetica-Bold').fontSize(8).text('Exclusividade(*):', xI_1 + textPad, yIRow + textYPad);

            const prazoNum = parseInt(data.contratoPrazo, 10);
            const temExclusividade = !isNaN(prazoNum) && prazoNum > 0;
            const xSim = xI_1 + 90;
            const xNao = xI_1 + 130;
            const yCheck = yIRow + textYPad - 2;
            const checkSize = 8;
            doc.rect(xSim, yCheck, checkSize, checkSize).stroke();
            doc.font('Helvetica').fontSize(8).text('SIM', xSim + checkSize + 2, yIRow + textYPad);
            doc.rect(xNao, yCheck, checkSize, checkSize).stroke();
            doc.font('Helvetica').fontSize(8).text('NÃO', xNao + checkSize + 2, yIRow + textYPad);

            doc.font('Helvetica-Bold').fontSize(10);
            if (temExclusividade) {
                doc.path(`M ${xSim} ${yCheck} L ${xSim + checkSize} ${yCheck + checkSize} M ${xSim + checkSize} ${yCheck} L ${xSim} ${yCheck + checkSize}`).lineWidth(1.5).stroke();
            } else {
                doc.path(`M ${xNao} ${yCheck} L ${xNao + checkSize} ${yCheck + checkSize} M ${xNao + checkSize} ${yCheck} L ${xNao} ${yCheck + checkSize}`).lineWidth(1.5).stroke();
            }
            doc.fontSize(8);

            doc.font('Helvetica-Bold').text('Prazo de exclusividade:', xI_L6_2 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Prazo de exclusividade:');
            doc.font('Helvetica').text((temExclusividade ? data.contratoPrazo : '0') + ' dias', xI_L6_2 + textPad + labelWidth + textPad, yIRow + textYPad);

            y = yIRow + rHI + 10;

            // --- 3. Seção CLÁUSULAS ---
            doc.y = y;
            doc.x = MARGIN_LEFT;
            doc.font('Helvetica').fontSize(8);
            
            // Texto do Preâmbulo com Negrito
            doc.text('O Contratante autoriza a Beehouse Investimentos Imobiliários, inscrita no CNPJ sob nº ', {
                continued: true,
                align: 'justify', 
                width: CONTENT_WIDTH
            });
            doc.font('Helvetica-Bold');
            doc.text('14.477.349/0001-23', {
                continued: true
            });
            doc.font('Helvetica');
            doc.text(', com inscrição no CRECI/SC sob o nº ', {
                continued: true
            });
            doc.font('Helvetica-Bold');
            doc.text('7.965-J', {
                continued: true
            });
            doc.font('Helvetica');
            doc.text(', situada nesta cidade, na Rua Jacob Eisenhut, 223 - SL 801 Bairro Atiradores, Cep: 89.203-070 - Joinville-SC, a promover a venda do imóvel com a descrição acima, mediante as seguintes condições:', {
                // As opções de 'align' e 'width' do primeiro .text() se aplicam ao bloco todo.
            });
            
            doc.moveDown(1);
            
            // Cláusulas
            const clausulaIndent = 10;
            const clausulaWidth = CONTENT_WIDTH - clausulaIndent;
            
            doc.font('Helvetica-Bold').text('1º', MARGIN_LEFT, doc.y, { continued: true, lineBreak: false});
            doc.font('Helvetica').text(`   A venda é concebida a contar desta data pelo prazo e forma acima definidos. Após esse período o contrato se encerra.`, MARGIN_LEFT + clausulaIndent + 20, doc.y, { align: 'justify', width: clausulaWidth - 20});
            doc.moveDown(0.5);

            doc.font('Helvetica-Bold').text('2º', MARGIN_LEFT, doc.y, { continued: true, lineBreak: false });
            doc.font('Helvetica').text(`   O Contratante pagará a Contratada, uma vez concluído o negócio a comissão de ${data.contratoComissaoPct || '6'}% (seis por cento) sobre o valor da venda, no ato do recebimento do sinal. Esta comissão é devida também mesmo fora do prazo desta autorização desde que a venda do imóvel seja efetuado por cliente apresentado pela Contratada ou nos caso em que, comprovadamente, a negociação tiver sido por esta iniciada, observando também o artigo 727 do Código Civil Brasileiro`, MARGIN_LEFT + clausulaIndent + 20, doc.y, { align: 'justify', width: clausulaWidth - 20 });
            doc.moveDown(0.5);
            
            doc.font('Helvetica-Bold').text('3º', MARGIN_LEFT, doc.y, { continued: true, lineBreak: false });
            doc.font('Helvetica').text('   A Contratada compromete-se a fazer publicidade do imóvel, podendo colocar placas, anunciar em jornais e meios de divulgação do imóvel ao público.', MARGIN_LEFT + clausulaIndent + 20, doc.y, { align: 'justify', width: clausulaWidth - 20 });
            doc.moveDown(0.5);
            
            doc.font('Helvetica-Bold').text('4º', MARGIN_LEFT, doc.y, { continued: true, lineBreak: false });
            doc.font('Helvetica').text('   O Contratante declara que o imóvel encontra-se livre e desembaraçado, inexistindo quaisquer impedimento judicial e/ou extra judicial que impeça a transferencia de posse, comprometendo-se a fornecer cópia do Registro de Imóveis, CPF, RG e carne de IPTU.', MARGIN_LEFT + clausulaIndent + 20, doc.y, { align: 'justify', width: clausulaWidth - 20 });
            doc.moveDown(0.5);
            
            doc.font('Helvetica-Bold').text('5º', MARGIN_LEFT, doc.y, { continued: true, lineBreak: false });
            doc.font('Helvetica').text('   Em caso de qualquer controversia decorrente deste contrato, as partes elegem o Foro da Comarca de Joinville/SC para dirimir quaisquer dúvidas deste contrato, renunciando qualquer outro, por mais privilégio que seja.', MARGIN_LEFT + clausulaIndent + 20, doc.y, { align: 'justify', width: clausulaWidth - 20 });
            doc.moveDown(1);

            const textoFechamento = 'Assim por estarem juntos e contratados, obrigam-se a si e seus herdeiros a cumprir e fazer cumprir o disposto neste contrato, assinando-os em duas vias de igual teor e forma, na presença de testemunhas, a tudo presentes.';
            doc.text(textoFechamento, MARGIN_LEFT, doc.y, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(2);

            // --- 4. Assinaturas (COM TÍTULOS) ---
            const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
            doc.font('Helvetica-Bold').fontSize(8).text('Local e data:', MARGIN_LEFT, doc.y, { continued: true});
            doc.font('Helvetica').fontSize(8).text(` Joinville, ${dataHoje}`, MARGIN_LEFT + 10, doc.y);

            let sigY = doc.y + 50; // Espaço para assinaturas

            const sigWidth = 240; // Largura de cada bloco de assinatura
            const sigSpacing = CONTENT_WIDTH - (2 * sigWidth); // Espaço entre os 2 blocos
            let currentSigX = MARGIN_LEFT;

            // Função helper para desenhar uma assinatura
            const drawSignature = (title, label, subLabel = '', x, yPos) => {
                // 1. Título (Ex: "Contratante")
                doc.font('Helvetica-Bold').fontSize(8).text(title || '', x, yPos - 10, { width: sigWidth, align: 'center' });
                
                // 2. Linha
                doc.moveTo(x, yPos).lineTo(x + sigWidth, yPos).stroke();
                
                // 3. Nome (Label)
                doc.font('Helvetica-Bold').fontSize(8).text(label || '', x, yPos + 5, { width: sigWidth, align: 'center' });
                
                // 4. Sub-label (CPF/CNPJ)
                if (subLabel) {
                    doc.font('Helvetica').fontSize(8).text(subLabel, x, yPos + 15, { width: sigWidth, align: 'center' });
                }
            };

            // Beehouse (Sempre presente, Coluna 1, Linha 1)
            drawSignature(
                'CONTRATADA', 
                'Beehouse Investimentos Imobiliários', 
                'CNPJ 14.477.349/0001-23', 
                currentSigX, 
                sigY
            );

            if (authType === 'casado') {
                // Contratante (Coluna 2, Linha 1)
                currentSigX = MARGIN_LEFT + sigWidth + sigSpacing;
                drawSignature(
                    'CONTRATANTE', 
                    data.contratanteNome || 'NOME CONTRATANTE', 
                    data.contratanteCpf || 'CPF/CNPJ', 
                    currentSigX, 
                    sigY
                );
                
                // Cônjuge (Coluna 1, Linha 2)
                sigY += 60; // Próxima linha
                currentSigX = MARGIN_LEFT;
                drawSignature(
                    'CÔNJUGE', 
                    data.conjugeNome || 'NOME CÔNJUGE', 
                    data.conjugeCpf || 'CPF/CNPJ', 
                    currentSigX, 
                    sigY
                );

            } else if (authType === 'socios') {
                // Sócio 1 (Coluna 2, Linha 1)
                currentSigX = MARGIN_LEFT + sigWidth + sigSpacing;
                drawSignature(
                    'SÓCIO 1', 
                    data.socio1Nome || 'NOME SÓCIO 1', 
                    data.socio1Cpf || 'CPF/CNPJ', 
                    currentSigX, 
                    sigY
                );
                
                let socioIndex = 1; // Começa do Sócio 2 (índice 1)
                while (socioIndex < numSocios) {
                    sigY += 60; // Próxima linha
                    for (let col = 0; col < 2 && socioIndex < numSocios; col++) { // Loop de 2 colunas
                        currentSigX = MARGIN_LEFT + col * (sigWidth + sigSpacing); // Col 1 (0) ou Col 2 (1)
                        const prefix = `socio${socioIndex + 1}`;
                        
                        drawSignature(
                            `SÓCIO ${socioIndex + 1}`, 
                            data[`${prefix}Nome`] || `NOME SÓCIO ${socioIndex + 1}`, 
                            data[`${prefix}Cpf`] || 'CPF/CNPJ', 
                            currentSigX, 
                            sigY
                        );
                        socioIndex++;
                    }
                }

            } else { // Solteiro / Viúvo
                // Contratante (Coluna 2, Linha 1)
                currentSigX = MARGIN_LEFT + sigWidth + sigSpacing;
                drawSignature(
                    'CONTRATANTE', 
                    data.contratanteNome || 'NOME CONTRATANTE', 
                    data.contratanteCpf || 'CPF/CNPJ', 
                    currentSigX, 
                    sigY
                );
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
// HANDLER (USANDO ASYNC/AWAIT COM A PROMISE)
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