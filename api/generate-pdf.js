// /api/generate-pdf.js
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
const MARGIN = 50;      // Margem Topo, Direita e Rodapé
const PAGE_WIDTH = 612; // Largura A4
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN; // (612 - 30 - 50 = 532)
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
        doc.image(logoPath, MARGIN_LEFT, MARGIN - 20, { width: 180 });

    } catch (imageError) {
         console.error("Erro ao carregar o logo:", imageError.message);
         doc.font('Helvetica-Bold').fontSize(10).text('Beehouse', MARGIN_LEFT, MARGIN + 10);
    }

    // 2. Bloco da Direita (Título, Nome da Empresa, Endereço)
    const rightAlignX = PAGE_WIDTH - MARGIN - 250; 
    const blockWidth = 250; 
    const initialY = MARGIN - 20; 

    doc.font('Helvetica-Bold').fontSize(10).text('Autorização de Venda', rightAlignX, initialY, { width: blockWidth, align: 'right' });
    doc.font('Helvetica-Bold').fontSize(10).text('Beehouse Investimentos Imobiliários', rightAlignX, initialY + 12, { width: blockWidth, align: 'right' });
    doc.font('Helvetica').fontSize(8).text('R. Jacob Eisenhut, 223 - SL 801 - Atiradores - Joinville/SC', rightAlignX, initialY + 24, { width: blockWidth, align: 'right' });
    doc.text('www.beehouse.imb.br | Fone: (47) 99287-9066', rightAlignX, initialY + 36, { width: blockWidth, align: 'right' }); 

    doc.y = initialY + 60; 
}


// ==================================================================
// FUNÇÃO DE GERAÇÃO DE PDF
// ==================================================================
async function generatePdfPromise(data) {

    return new Promise((resolve, reject) => {

        const doc = new PDFDocument({ 
            margins: { top: MARGIN - 20, right: MARGIN, bottom: MARGIN - 35, left: MARGIN_LEFT }, 
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
            const endX = MARGIN_LEFT + CONTENT_WIDTH;     // Ponto X final (borda direita)
            let labelWidth = 0;
            const rowHeight = 20;

            // --- LÓGICA CONDICIONAL PARA CONTRATANTES ---
            const authType = data.authType;

            // ==================================================
            // <<< INÍCIO DO NOVO FLUXO PJ >>>
            // ==================================================
            if (authType === 'pj') {
                
                // --- 1. Bloco EMPRESA (CONTRATANTE) ---
                const yC = y;
                const hC = rowHeight * 4; // 4 linhas
                doc.rect(MARGIN_LEFT, yC, CONTENT_WIDTH, hC).stroke();
                doc.rect(MARGIN_LEFT, yC, labelBoxWidth, hC).stroke();
                doc.save().translate(MARGIN_LEFT + labelBoxWidth/2, yC + hC/2).rotate(-90).font('Helvetica-Bold').fontSize(9).text('CONTRATANTE', -hC / 2, -4, { width: hC, align: 'center' }).restore();

                const xC_1 = fieldBoxX;
                const xC_2 = fieldBoxX + (CONTENT_WIDTH - labelBoxWidth) / 2 - 10;
                let yRow = yC;

                // Linha 1: Razão Social
                doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX, yRow + rowHeight).stroke();
                doc.font('Helvetica-Bold').fontSize(8).text('Razão Social:', xC_1 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('Razão Social:');
                doc.font('Helvetica').fontSize(8).text(data.empresaRazaoSocial || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);
                yRow += rowHeight;

                // Linha 2: CNPJ / Email
                doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX, yRow + rowHeight).stroke();
                doc.moveTo(xC_2, yRow).lineTo(xC_2, yRow + rowHeight).stroke();
                doc.font('Helvetica-Bold').fontSize(8).text('CNPJ:', xC_1 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('CNPJ:');
                doc.font('Helvetica').fontSize(8).text(data.empresaCnpj || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);
                doc.font('Helvetica-Bold').fontSize(8).text('Email:', xC_2 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('Email:');
                doc.font('Helvetica').fontSize(8).text(data.empresaEmail || '', xC_2 + textPad + labelWidth + textPad, yRow + textYPad);
                yRow += rowHeight;

                // Linha 3: Telefone / IE
                doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX, yRow + rowHeight).stroke();
                doc.moveTo(xC_2, yRow).lineTo(xC_2, yRow + rowHeight).stroke();
                doc.font('Helvetica-Bold').fontSize(8).text('Telefone:', xC_1 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('Telefone:');
                doc.font('Helvetica').fontSize(8).text(data.empresaTelefone || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);
                doc.font('Helvetica-Bold').fontSize(8).text('Inscrição Est./Mun.:', xC_2 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('Inscrição Est./Mun.:');
                doc.font('Helvetica').fontSize(8).text(data.empresaIe || '', xC_2 + textPad + labelWidth + textPad, yRow + textYPad);
                yRow += rowHeight;

                // Linha 4: Endereço Sede
                doc.font('Helvetica-Bold').fontSize(8).text('Endereço da Sede:', xC_1 + textPad, yRow + textYPad);
                labelWidth = doc.widthOfString('Endereço da Sede:');
                doc.font('Helvetica').fontSize(8).text(data.empresaEndereco || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad);
                
                y = yRow + rowHeight + 15; // Próximo Y

                // --- 2. Bloco REPRESENTANTE LEGAL (ALTERADO) ---
                const yR = y;
                const hR = rowHeight * 3; // 3 linhas (Nome, CPF, Cargo)
                doc.rect(MARGIN_LEFT, yR, CONTENT_WIDTH, hR).stroke();
                doc.rect(MARGIN_LEFT, yR, labelBoxWidth, hR).stroke();
                doc.save().translate(MARGIN_LEFT + labelBoxWidth/2, yR + hR/2).rotate(-90).font('Helvetica-Bold').fontSize(9).text('REP. LEGAL', -hR / 2, -4, { width: hR, align: 'center' }).restore();
                
                let yRowR = yR;
                const xR_1 = fieldBoxX; // Single column X start

                // NEW Linha 1: Nome
                doc.moveTo(fieldBoxX, yRowR + rowHeight).lineTo(endX, yRowR + rowHeight).stroke(); // Horizontal line
                doc.font('Helvetica-Bold').fontSize(8).text('Nome:', xR_1 + textPad, yRowR + textYPad);
                labelWidth = doc.widthOfString('Nome:');
                doc.font('Helvetica').fontSize(8).text(data.repNome || '', xR_1 + textPad + labelWidth + textPad, yRowR + textYPad);
                yRowR += rowHeight;

                // NEW Linha 2: CPF
                doc.moveTo(fieldBoxX, yRowR + rowHeight).lineTo(endX, yRowR + rowHeight).stroke(); // Horizontal line
                doc.font('Helvetica-Bold').fontSize(8).text('CPF:', xR_1 + textPad, yRowR + textYPad);
                labelWidth = doc.widthOfString('CPF:');
                doc.font('Helvetica').fontSize(8).text(data.repCpf || '', xR_1 + textPad + labelWidth + textPad, yRowR + textYPad);
                yRowR += rowHeight;

                // NEW Linha 3: Cargo
                doc.font('Helvetica-Bold').fontSize(8).text('Cargo:', xR_1 + textPad, yRowR + textYPad);
                labelWidth = doc.widthOfString('Cargo:');
                doc.font('Helvetica').fontSize(8).text(data.repCargo || '', xR_1 + textPad + labelWidth + textPad, yRowR + textYPad);
                yRowR += rowHeight;
                
                y = yRowR; // Define o y final
            
            // ==================================================
            // <<< FIM DO NOVO FLUXO PJ >>>
            // ==================================================

            } else {
                
            // ==================================================
            // <<< INÍCIO DO FLUXO ANTIGO (PF / SÓCIOS) >>>
            // ==================================================
                const numSocios = parseInt(data.numSocios, 10) || 1;

                for (let i = 0; i < numSocios; i++) {
                    const prefix = numSocios > 1 ? `socio${i+1}` : 'contratante';
                    const titulo = numSocios > 1 ? `CONTRATANTE ${i+1}` : 'CONTRATANTE';

                     if (i > 0) y += 20;

                    const yC = y;
                    const hC = rowHeight * 5; // 5 Linhas: Nome/Prof, CPF, EC/Regime, End, Email

                    doc.rect(MARGIN_LEFT, yC, CONTENT_WIDTH, hC).stroke();
                    doc.rect(MARGIN_LEFT, yC, labelBoxWidth, hC).stroke();
                    doc.save().translate(MARGIN_LEFT + labelBoxWidth/2, yC + hC/2).rotate(-90).font('Helvetica-Bold').fontSize(9).text(titulo, -hC / 2, -4, { width: hC, align: 'center' }).restore();

                    const xC_1 = fieldBoxX;
                    const xC_2 = fieldBoxX + (CONTENT_WIDTH - labelBoxWidth) / 2 - 10; 
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

                    // Linha 2: CPF (ALTERADO - Full width)
                    doc.moveTo(fieldBoxX, yRow + rowHeight).lineTo(endX, yRow + rowHeight).stroke();
                    doc.font('Helvetica-Bold').fontSize(8).text('CPF:', xC_1 + textPad, yRow + textYPad);
                    labelWidth = doc.widthOfString('CPF:');
                    doc.font('Helvetica').fontSize(8).text(data[`${prefix}Cpf`] || '', xC_1 + textPad + labelWidth + textPad, yRow + textYPad); 
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
                     doc.save().translate(MARGIN_LEFT + labelBoxWidth/2, yConj + hConj/2).rotate(-90).font('Helvetica-Bold').fontSize(9).text('CÔNJUGE', -hConj / 2, -4, { width: hConj, align: 'center' }).restore();

                     const xConj_1 = fieldBoxX;
                     const xConj_2 = fieldBoxX + (CONTENT_WIDTH - labelBoxWidth) / 2; // 50% split
                     let yRowConj = yConj;

                     // Linha 1 Cônjuge: Nome / CPF (ALTERADO)
                     doc.moveTo(fieldBoxX, yRowConj + rowHeight).lineTo(endX, yRowConj + rowHeight).stroke(); // H
                     doc.moveTo(xConj_2, yRowConj).lineTo(xConj_2, yRowConj + rowHeight).stroke(); // V
                     doc.font('Helvetica-Bold').fontSize(8).text('Nome:', xConj_1 + textPad, yRowConj + textYPad);
                     labelWidth = doc.widthOfString('Nome:');
                     doc.font('Helvetica').fontSize(8).text(data.conjugeNome || '', xConj_1 + textPad + labelWidth + textPad, yRowConj + textYPad);
                     doc.font('Helvetica-Bold').fontSize(8).text('CPF:', xConj_2 + textPad, yRowConj + textYPad);
                     labelWidth = doc.widthOfString('CPF:');
                     doc.font('Helvetica').fontSize(8).text(data.conjugeCpf || '', xConj_2 + textPad + labelWidth + textPad, yRowConj + textYPad);
                     yRowConj += rowHeight;

                     // Linha 2 Cônjuge: Profissão
                     doc.moveTo(fieldBoxX, yRowConj + rowHeight).lineTo(endX, yRowConj + rowHeight).stroke(); // H
                        
                        // <<< CORREÇÃO DO BUG AQUI (ERA xC_1) >>>
                     doc.font('Helvetica-Bold').fontSize(8).text('Profissão:', xConj_1 + textPad, yRowConj + textYPad);
                     labelWidth = doc.widthOfString('Profissão:');
                     doc.font('Helvetica').fontSize(8).text(data.conjugeProfissao || '', xConj_1 + textPad + labelWidth + textPad, yRowConj + textYPad);
                     yRowConj += rowHeight;
                     
                     // Linha 3 Cônjuge: Email
                        // <<< CORREÇÃO DO BUG AQUI (ERA xC_1) >>>
                     doc.font('Helvetica-Bold').fontSize(8).text('Email:', xConj_1 + textPad, yRowConj + textYPad);
                     labelWidth = doc.widthOfString('Email:');
                     doc.font('Helvetica').fontSize(8).text(data.conjugeEmail || '', xConj_1 + textPad + labelWidth + textPad, yRowConj + textYPad);

                     y = yConj + hConj; // Usa a altura total
                 }
            // ==================================================
            // <<< FIM DO FLUXO ANTIGO (PF / SÓCIOS) >>>
            // ==================================================
            }


            y += 15;

            // ==================================================================
            // 2. Bloco IMÓVEL (Comum a todos os fluxos)
            // ==================================================================
            const yI = y;
            const rHI = 20;
            const hI = rHI * 6;

            doc.rect(MARGIN_LEFT, yI, CONTENT_WIDTH, hI).stroke();
            doc.rect(MARGIN_LEFT, yI, labelBoxWidth, hI).stroke();
            doc.save().translate(MARGIN_LEFT + labelBoxWidth/2, yI + hI/2).rotate(-90).font('Helvetica-Bold').fontSize(9).text('IMÓVEL', -hI / 2, -4, { width: hI, align: 'center' }).restore();

            const xI_1 = fieldBoxX;
            const xI_2 = fieldBoxX + 318;
            let yIRow = yI;

            // --- Linha 1 (Imóvel, Valor) ---
            doc.moveTo(fieldBoxX, yIRow + rHI).lineTo(endX, yIRow + rHI).stroke(); // H
            doc.moveTo(xI_2, yIRow).lineTo(xI_2, yIRow + rHI).stroke(); // V
            doc.font('Helvetica-Bold').fontSize(8).text('Imóvel:', xI_1 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Imóvel:');
            doc.font('Helvetica').fontSize(8).text(data.imovelDescricao || '', xI_1 + textPad + labelWidth + textPad, yIRow + textYPad);
            doc.font('Helvetica-Bold').fontSize(8).text('Valor por unidade:', xI_2 + textPad, yIRow + textYPad);
            labelWidth = doc.widthOfString('Valor por unidade:');
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
            doc.font('Helvetica').fontSize(8).text(data.imovelChamadaCapital || '', xI_L5_2 + textPad + labelWidth + textPad, yIRow + textYPad);
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

            // --- 3. Seção CLÁUSULAS (Comum a todos) ---
            doc.y = y;
            doc.x = MARGIN_LEFT;
            doc.font('Helvetica').fontSize(8);
            
            // Texto do Preâmbulo
            const preambuloTexto1 = (authType === 'pj')
                ? 'A Contratante autoriza a Beehouse Investimentos Imobiliários, inscrita no '
                : 'O(s) Contratante(s) autoriza(m) a Beehouse Investimentos Imobiliários, inscrita no ';
                
            doc.text(preambuloTexto1, {
                continued: true,
                align: 'justify', 
                width: CONTENT_WIDTH
            });
            doc.font('Helvetica-Bold');
            doc.text('CNPJ sob nº 14.477.349/0001-23', {
                continued: true
            });
            doc.font('Helvetica');
            doc.text(', com inscrição no ', {
                continued: true
            });
            doc.font('Helvetica-Bold');
            doc.text('CRECI/SC sob o nº 7.965-J', {
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
            const clausulaNumWidth = 20; // Largura para o '1º'
            const clausulaTextWidth = clausulaWidth - clausulaNumWidth;
            const clausulaNumX = MARGIN_LEFT;
            const clausulaTextX = MARGIN_LEFT + clausulaNumWidth;

            const comissaoTexto = (authType === 'pj')
                ? 'A Contratante pagará a Contratada, uma vez concluído o negócio a comissão de'
                : 'O(s) Contratante(s) pagará(ão) a Contratada, uma vez concluído o negócio a comissão de';
            
            // <<< MUDANÇA: Removido RG do texto da PF >>>
            const declaracaoTexto = (authType === 'pj')
                ? 'A Contratante declara que o imóvel encontra-se livre e desembaraçado, inexistindo quaisquer impedimento judicial e/ou extra judicial que impeça a transferencia de posse, comprometendo-se a fornecer cópia do Registro de Imóveis, Contrato Social e carne de IPTU.'
                : 'O(s) Contratante(s) declara(m) que o imóvel encontra-se livre e desembaraçado, inexistindo quaisquer impedimento judicial e/ou extra judicial que impeça a transferencia de posse, comprometendo-se a fornecer cópia do Registro de Imóveis, CPF e carne de IPTU.';
            
            doc.font('Helvetica-Bold').text('1º', clausulaNumX, doc.y, { width: clausulaNumWidth });
            doc.font('Helvetica').text(`A venda é concebida a contar desta data pelo prazo e forma acima definidos. Após esse período o contrato se encerra.`, clausulaTextX, doc.y - doc.heightOfString('1º'), { align: 'justify', width: clausulaTextWidth});
            doc.moveDown(0.5);

            doc.font('Helvetica-Bold').text('2º', clausulaNumX, doc.y, { width: clausulaNumWidth });
            doc.font('Helvetica').text(`${comissaoTexto} ${data.contratoComissaoPct || '6'}% (seis por cento) sobre o valor da venda, no ato do recebimento do sinal. Esta comissão é devida também mesmo fora do prazo desta autorização desde que a venda do imóvel seja efetuado por cliente apresentado pela Contratada ou nos caso em que, comprovadamente, a negociação tiver sido por esta iniciada, observando também o artigo 727 do Código Civil Brasileiro`, clausulaTextX, doc.y - doc.heightOfString('2º'), { align: 'justify', width: clausulaTextWidth });
            doc.moveDown(0.5);
            
            doc.font('Helvetica-Bold').text('3º', clausulaNumX, doc.y, { width: clausulaNumWidth });
            doc.font('Helvetica').text('A Contratada compromete-se a fazer publicidade do imóvel, podendo colocar placas, anunciar em jornais e meios de divulgação do imóvel ao público.', clausulaTextX, doc.y - doc.heightOfString('3º'), { align: 'justify', width: clausulaTextWidth });
            doc.moveDown(0.5);
            
            doc.font('Helvetica-Bold').text('4º', clausulaNumX, doc.y, { width: clausulaNumWidth });
            doc.font('Helvetica').text(declaracaoTexto, clausulaTextX, doc.y - doc.heightOfString('4º'), { align: 'justify', width: clausulaTextWidth });
            doc.moveDown(0.5);
            
            doc.font('Helvetica-Bold').text('5º', clausulaNumX, doc.y, { width: clausulaNumWidth });
            doc.font('Helvetica').text('Em caso de qualquer controversia decorrente deste contrato, as partes elegem o Foro da Comarca de Joinville/SC para dirimir quaisquer dúvidas deste contrato, renunciando qualquer outro, por mais privilégio que seja.', clausulaTextX, doc.y - doc.heightOfString('5º'), { align: 'justify', width: clausulaTextWidth });
            doc.moveDown(1);

            const textoFechamento = 'Assim por estarem juntos e contratados, obrigam-se a si e seus herdeiros a cumprir e fazer cumprir o disposto neste contrato, assinando-os em duas vias de igual teor e forma a tudo presentes.';
            doc.text(textoFechamento, MARGIN_LEFT, doc.y, { align: 'justify', width: CONTENT_WIDTH });
            doc.moveDown(2);

            // --- 4. Assinaturas (COM TÍTULOS) ---
            const dataHoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
            doc.font('Helvetica-Bold').fontSize(8).text('Local e data:', MARGIN_LEFT, doc.y, { continued: true});
            doc.font('Helvetica').fontSize(8).text(` Joinville, ${dataHoje}`, MARGIN_LEFT + 10, doc.y);

            const sigWidth = 240; // Largura de cada bloco de assinatura
            const sigSpacing = CONTENT_WIDTH - (2 * sigWidth); 
            const sigBlockHeight = 55; // Altura de CADA bloco de assinatura
            const sigYMargin = 25; // Espaço vertical entre assinaturas
            // Ajuste no pageBottom para usar a margem correta
            const pageBottom = doc.page.height - doc.page.margins.bottom; 
            
            const col1_X = MARGIN_LEFT;
            const col2_X = MARGIN_LEFT + sigWidth + sigSpacing;

            // Função helper para desenhar
            const drawSignature = (title, label, subLabel = '', x, yPos) => {
                doc.moveTo(x, yPos).lineTo(x + sigWidth, yPos).stroke();
                doc.font('Helvetica-Bold').fontSize(8).text(title || '', x, yPos + 5, { width: sigWidth, align: 'center' });
                doc.font('Helvetica-Bold').fontSize(8).text(label || '', x, yPos + 15, { width: sigWidth, align: 'center' });
                if (subLabel) {
                    doc.font('Helvetica').fontSize(8).text(subLabel, x, yPos + 25, { width: sigWidth, align: 'center' });
                }
            };

            // *** HELPER DE CHECAGEM DE PÁGINA (CORRIGIDO) ***
            const checkAndSetY = (proposedY) => {
                // Se o Y proposto + a altura do bloco for maior que o fim da página
                if (proposedY + sigBlockHeight > pageBottom) {
                    doc.addPage();
                    // 1. Redesenha o cabeçalho na nova página
                    drawHeader(doc); 
                    // 2. Retorna a posição Y *depois* do cabeçalho + uma margem
                    return doc.y + 60; 
                }
                // Retorna o Y proposto, pois cabe
                return proposedY; 
            };

            // --- LÓGICA DE DESENHO REFEITA ---
            // Posição Y inicial (60 pontos abaixo do último texto)
            let initialY = doc.y + 60; 

            // Checa a Posição Y inicial para a primeira linha de assinaturas
            let currentY = checkAndSetY(initialY);

            // Beehouse (Sempre presente, Coluna 1, Linha 1)
            drawSignature(
                'CONTRATADA', 
                'Beehouse Investimentos Imobiliários', 
                'CNPJ 14.477.349/0001-23', 
                col1_X, 
                currentY
            );

            // ==========================================
            // <<< LÓGICA DE ASSINATURA ATUALIZADA >>>
            // ==========================================
            if (authType === 'pj') {
                // *** CORREÇÃO AQUI: Um bloco só ***
                const repNome = data.repNome || 'Nome Rep. Legal';
                const repCpf = data.repCpf || 'CPF Rep. Legal';
                
                drawSignature(
                    'CONTRATANTE', 
                    data.empresaRazaoSocial || 'RAZÃO SOCIAL', 
                    `p.p. ${repNome} - CPF: ${repCpf}`, // p.p. = "por procuração" / "em nome de"
                    col2_X, 
                    currentY
          	     );
            
            } else if (authType === 'casado') {
                // Contratante (Coluna 2, Linha 1)
                drawSignature(
                    'CONTRATANTE', 
                    data.contratanteNome || 'NOME CONTRATANTE', 
                    `CPF: ${data.contratanteCpf}` || 'CPF', 
                    col2_X, 
                    currentY
                );
                
                let nextY = currentY + sigBlockHeight + sigYMargin;
                currentY = checkAndSetY(nextY);

                // Cônjuge (Coluna 2, Linha 2)
          	     drawSignature(
            	     	 'CÔNJUGE', 
                    data.conjugeNome || 'NOME CÔNJUGE', 
                    `CPF: ${data.conjugeCpf}` || 'CPF', 
                    col2_X, 
          	     	 currentY
          	     );

            } else if (authType === 'socios') {
                const numSocios = parseInt(data.numSocios, 10) || 1;
                // Sócio 1 (Coluna 2, Linha 1)
                drawSignature(
                    'CONTRATANTE',
                    data.socio1Nome || 'CONTRATANTE', 
          	     	 `CPF: ${data.socio1Cpf}` || 'CPF', 
          	 	     col2_X,
                    currentY
          	     );
                
          	     let socioIndex = 1; 
                
          	 	   while (socioIndex < numSocios) {
            	     	 let nextY = currentY + sigBlockHeight + sigYMargin;
            	     	 // Checa se a *próxima* linha cabe
            	     	 currentY = checkAndSetY(nextY);
                    
          	 	     	 const prefix = `socio${socioIndex + 1}`;
                    
          	 	     	 drawSignature(
            	 	     	 `CONTRATANTE ${socioIndex + 1}`, 
              	     	 data[`${prefix}Nome`] || `NOME SÓCIO ${socioIndex + 1}`, 
          	 	     	 `CPF: ${data[`${prefix}Cpf`]}` || 'CPF', 
              	     	 col2_X, 
          	 	     	 currentY
                    );
          	 	     socioIndex++;
          	 	   }

          	 } else { // Solteiro / Viúvo (authType === 'solteiro')
          	 	 // Contratante (Coluna 2, Linha 1)
          	 	 drawSignature(
            	 	 	 'CONTRATANTE', 
            	 	 	 data.contratanteNome || 'NOME CONTRATANTE', 
          	 	 	 `CPF: ${data.contratanteCpf}` || 'CPF', 
            	 	 	 col2_X, 
            	 	 	 currentY
          	 	 );
        	   }
            // ==========================================
            // <<< FIM DA LÓGICA DE ASSINATURA >>>
            // ==========================================

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
        
        // Define o nome do arquivo com base no tipo
        let fileName = 'Autorizacao_Venda_Contratante.pdf';
        if (data.authType === 'pj') {
            fileName = `Autorizacao_Venda_${data.empresaRazaoSocial || 'PJ'}.pdf`;
        } else {
            fileName = `Autorizacao_Venda_${data.contratanteNome || data.socio1Nome || 'Contratante'}.pdf`;
        }

        const pdfBuffer = await generatePdfPromise(data);

        console.log('PDF pronto. Enviando resposta...');

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

        res.end(pdfBuffer);

    } catch (error) {
        console.error('Erro no handler ao gerar PDF:', error);
        res.status(500).send('Erro ao gerar PDF: ' + error.message);
    }
}